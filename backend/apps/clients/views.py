from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.http import HttpResponse
from .models import Client
from .serializers import ClientSerializer, ClientListSerializer
from apps.users.permissions import IsOperativo, IsOperativo2, IsAdminUser
from apps.orders.models import ServiceOrder
from apps.transfers.models import Transfer
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime, timedelta

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsOperativo]
    search_fields = ['name', 'nit', 'email']
    filterset_fields = ['payment_condition', 'is_active']

    def get_serializer_class(self):
        if self.action == 'list':
            return ClientListSerializer
        return ClientSerializer

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def account_statement(self, request, pk=None):
        """Estado de cuenta detallado de un cliente con facturas y pagos"""
        from apps.orders.models import Invoice, InvoicePayment
        from apps.orders.serializers import InvoiceListSerializer

        client = self.get_object()

        # Get year filter
        year = request.query_params.get('year', datetime.now().year)

        # Calculate Credit Used: Sum of balances from unpaid invoices
        unpaid_invoices = Invoice.objects.filter(
            service_order__client=client,
            balance__gt=0
        ).exclude(status__in=['paid', 'cancelled'])

        credit_used = unpaid_invoices.aggregate(Sum('balance'))['balance__sum'] or 0
        available_credit = max(0, float(client.credit_limit) - float(credit_used))

        # Get all invoices for the client (optionally filtered by year)
        invoices_qs = Invoice.objects.filter(
            service_order__client=client
        ).select_related('service_order').prefetch_related('payments')

        if year:
            invoices_qs = invoices_qs.filter(issue_date__year=year)

        # Serializar facturas con información completa
        invoices_data = InvoiceListSerializer(invoices_qs, many=True).data

        # Calcular estadísticas de facturas
        total_invoiced = invoices_qs.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_paid = invoices_qs.aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
        total_pending = invoices_qs.filter(
            status__in=['pending', 'partial', 'overdue']
        ).aggregate(Sum('balance'))['balance__sum'] or 0

        # Facturas por estado
        invoices_by_status = {
            'pending': invoices_qs.filter(status='pending').count(),
            'partial': invoices_qs.filter(status='partial').count(),
            'paid': invoices_qs.filter(status='paid').count(),
            'overdue': invoices_qs.filter(status='overdue').count(),
            'cancelled': invoices_qs.filter(status='cancelled').count(),
        }

        # Facturas vencidas y próximas a vencer
        today = datetime.now().date()
        overdue_invoices = invoices_qs.filter(
            due_date__lt=today,
            balance__gt=0
        ).exclude(status='paid').count()

        upcoming_due = invoices_qs.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7),
            balance__gt=0
        ).exclude(status='paid').count()

        # Aging Analysis (Antigüedad de Saldos)
        aging = {
            'current': 0.0,  # Corriente (No vencido)
            '1-30': 0.0,     # 1 a 30 días de vencido
            '31-60': 0.0,    # 31 a 60 días
            '61-90': 0.0,    # 61 a 90 días
            '90+': 0.0       # Más de 90 días
        }

        # Iterar sobre facturas con saldo pendiente para calcular aging
        # Usamos unpaid_invoices que ya filtramos arriba (balance > 0, no pagadas/anuladas)
        for inv in unpaid_invoices:
            bal = float(inv.balance)
            if not inv.due_date:
                aging['current'] += bal
                continue

            days_overdue = (today - inv.due_date).days

            if days_overdue <= 0:
                aging['current'] += bal
            elif days_overdue <= 30:
                aging['1-30'] += bal
            elif days_overdue <= 60:
                aging['31-60'] += bal
            elif days_overdue <= 90:
                aging['61-90'] += bal
            else:
                aging['90+'] += bal

        # Historial de pagos recientes (últimos 10)
        recent_payments = InvoicePayment.objects.filter(
            invoice__service_order__client=client
        ).select_related('invoice').order_by('-payment_date')[:10]

        payments_data = [{
            'id': payment.id,
            'invoice_number': payment.invoice.invoice_number,
            'amount': float(payment.amount),
            'payment_date': payment.payment_date,
            'payment_method': payment.get_payment_method_display(),
            'reference': payment.reference_number or '',
            'notes': payment.notes or ''
        } for payment in recent_payments]

        # Órdenes de Servicio pendientes de facturar
        pending_orders_qs = ServiceOrder.objects.filter(
            client=client,
            facturado=False
        ).exclude(status='cancelada').order_by('created_at')

        pending_orders_data = [{
            'id': order.id,
            'order_number': order.order_number,
            'date': order.created_at.date(),
            'eta': order.eta,
            'duca': order.duca,
            'amount': float(order.get_total_amount())
        } for order in pending_orders_qs]

        data = {
            'client_id': client.id,
            'client': client.name,
            'nit': client.nit,
            'payment_condition': client.get_payment_condition_display(),
            'credit_days': client.credit_days,
            'credit_limit': float(client.credit_limit),
            'credit_used': float(credit_used),
            'available_credit': float(available_credit),
            'credit_percentage': round((float(credit_used) / float(client.credit_limit) * 100), 2) if client.credit_limit > 0 else 0,

            # Estadísticas de facturación
            'total_invoiced': float(total_invoiced),
            'total_paid': float(total_paid),
            'total_pending': float(total_pending),
            'total_pending_orders': pending_orders_qs.count(),

            # Análisis de Antigüedad
            'aging': aging,

            # Facturas por estado
            'invoices_by_status': invoices_by_status,
            'overdue_count': overdue_invoices,
            'upcoming_due_count': upcoming_due,

            # Listas detalladas
            'invoices': invoices_data,
            'pending_invoices': pending_orders_data,
            'recent_payments': payments_data,

            'year': year
        }

        return Response(data)
    
    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def export_statement_excel(self, request, pk=None):
        """Exportar estado de cuenta completo a Excel con facturas y pagos"""
        from apps.orders.models import Invoice, InvoicePayment

        client = self.get_object()
        year = request.query_params.get('year', datetime.now().year)
        
        # Filtros adicionales
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('dateFrom')
        date_to = request.query_params.get('dateTo')
        min_amount = request.query_params.get('minAmount')
        max_amount = request.query_params.get('maxAmount')
        invoice_type = request.query_params.get('invoiceType')
        search_query = request.query_params.get('search')

        # Obtener facturas del cliente
        invoices = Invoice.objects.filter(
            service_order__client=client
        ).select_related('service_order').prefetch_related('payments').order_by('-issue_date')

        if year:
            invoices = invoices.filter(issue_date__year=year)
            
        if status_filter:
            invoices = invoices.filter(status=status_filter)
        
        if date_from:
            invoices = invoices.filter(issue_date__gte=date_from)
            
        if date_to:
            invoices = invoices.filter(issue_date__lte=date_to)

        if min_amount:
            invoices = invoices.filter(total_amount__gte=min_amount)

        if max_amount:
            invoices = invoices.filter(total_amount__lte=max_amount)

        if invoice_type:
            invoices = invoices.filter(invoice_type=invoice_type)

        if search_query:
            invoices = invoices.filter(
                Q(invoice_number__icontains=search_query) |
                Q(service_order__order_number__icontains=search_query)
            )

        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Estado de Cuenta"

        # Estilos
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=10)
        title_font = Font(size=16, bold=True, color="1F4E79")
        subtitle_font = Font(size=12, bold=True, color="2F5496")
        label_font = Font(bold=True, color="404040", size=10)
        currency_format = '#,##0.00'
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # === ENCABEZADO ===
        ws['A1'] = "ESTADO DE CUENTA"
        ws['A1'].font = title_font
        ws.merge_cells('A1:H1')

        ws['A2'] = "GPRO LOGISTIC - Agencia Aduanal"
        ws['A2'].font = Font(size=11, color="666666")
        ws.merge_cells('A2:H2')

        ws['A3'] = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = Font(size=9, italic=True, color="999999")

        # === INFORMACIÓN DEL CLIENTE ===
        ws['A5'] = "INFORMACIÓN DEL CLIENTE"
        ws['A5'].font = subtitle_font
        ws.merge_cells('A5:H5')

        # Datos del cliente
        client_data = [
            ('Cliente:', client.name),
            ('NIT:', client.nit),
            ('Dirección:', client.address or 'No especificada'),
            ('Teléfono:', client.phone or 'No especificado'),
            ('Email:', client.email or 'No especificado'),
            ('Contacto:', client.contact_person or 'No especificado'),
            ('Condición de Pago:', client.get_payment_condition_display()),
        ]

        row = 6
        for label, value in client_data:
            ws.cell(row=row, column=1, value=label).font = label_font
            ws.cell(row=row, column=2, value=value)
            # Unir celdas para el valor para que tenga más espacio
            ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=4)
            row += 1

        # === TABLA DE FACTURAS ===
        start_row = 14
        ws.cell(row=start_row, column=1, value="DETALLE DE FACTURAS").font = subtitle_font
        ws.merge_cells(f'A{start_row}:H{start_row}')

        # Headers de la tabla
        headers = ['No. Factura', 'Orden de Servicio', 'Fecha Emisión', 'Vencimiento',
                   'Total', 'Pagado', 'Saldo', 'Estado']
        header_row = start_row + 1

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=header_row, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        # Status display
        status_display = {
            'pending': 'Pendiente',
            'partial': 'Pago Parcial',
            'paid': 'Pagada',
            'overdue': 'Vencida',
            'cancelled': 'Anulada',
        }

        # Datos de facturas
        data_row = header_row + 1
        totals = {'total': 0, 'paid': 0, 'balance': 0}
        today = datetime.now().date()

        for invoice in invoices:
            days_overdue = ''
            if invoice.due_date and invoice.balance > 0 and today > invoice.due_date:
                days_overdue = f' ({(today - invoice.due_date).days}d)'

            ws.cell(row=data_row, column=1, value=invoice.invoice_number).border = thin_border
            ws.cell(row=data_row, column=2, value=invoice.service_order.order_number if invoice.service_order else '').border = thin_border
            ws.cell(row=data_row, column=3, value=invoice.issue_date.strftime('%d/%m/%Y') if invoice.issue_date else '').border = thin_border
            ws.cell(row=data_row, column=4, value=invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '').border = thin_border

            total_cell = ws.cell(row=data_row, column=5, value=float(invoice.total_amount))
            total_cell.number_format = currency_format
            total_cell.border = thin_border

            paid_cell = ws.cell(row=data_row, column=6, value=float(invoice.paid_amount))
            paid_cell.number_format = currency_format
            paid_cell.border = thin_border

            balance_cell = ws.cell(row=data_row, column=7, value=float(invoice.balance))
            balance_cell.number_format = currency_format
            balance_cell.border = thin_border

            status_text = status_display.get(invoice.status, invoice.status) + days_overdue
            ws.cell(row=data_row, column=8, value=status_text).border = thin_border

            # Sumar totales
            totals['total'] += float(invoice.total_amount)
            totals['paid'] += float(invoice.paid_amount)
            totals['balance'] += float(invoice.balance)

            data_row += 1

        # Fila de totales
        ws.cell(row=data_row, column=1, value="TOTALES").font = Font(bold=True)
        ws.cell(row=data_row, column=1).border = thin_border
        for col in range(2, 5):
            ws.cell(row=data_row, column=col).border = thin_border

        total_total = ws.cell(row=data_row, column=5, value=totals['total'])
        total_total.number_format = currency_format
        total_total.font = Font(bold=True)
        total_total.border = thin_border

        total_paid = ws.cell(row=data_row, column=6, value=totals['paid'])
        total_paid.number_format = currency_format
        total_paid.font = Font(bold=True)
        total_paid.border = thin_border

        total_balance = ws.cell(row=data_row, column=7, value=totals['balance'])
        total_balance.number_format = currency_format
        total_balance.font = Font(bold=True)
        total_balance.border = thin_border

        ws.cell(row=data_row, column=8).border = thin_border

        # Ajustar anchos de columna
        column_widths = [18, 18, 14, 14, 14, 14, 14, 16]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = width

        # Generar respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'estado_cuenta_{client.name.replace(" ", "_")}_{year}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        wb.save(response)
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def export_clients_excel(self, request):
        """Exportar listado de clientes a Excel"""
        # Filtros
        queryset = self.filter_queryset(self.get_queryset())

        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Listado de Clientes"

        # Estilos
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=10)
        title_font = Font(size=16, bold=True, color="1F4E79")
        subtitle_font = Font(size=12, bold=True, color="2F5496")
        currency_format = '#,##0.00'
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # === ENCABEZADO ===
        ws['A1'] = "LISTADO GENERAL DE CLIENTES"
        ws['A1'].font = title_font
        ws.merge_cells('A1:J1')

        ws['A2'] = "GPRO LOGISTIC - Agencia Aduanal"
        ws['A2'].font = Font(size=11, color="666666")
        ws.merge_cells('A2:J2')

        ws['A3'] = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = Font(size=9, italic=True, color="999999")

        # Headers
        headers = [
            'ID', 'Nombre / Razón Social', 'NIT', 'Teléfono', 'Email',
            'Dirección', 'Contacto', 'Condición Pago', 'Límite Crédito', 'Estado'
        ]

        start_row = 5
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        # Datos
        data_row = start_row + 1
        for client in queryset:
            ws.cell(row=data_row, column=1, value=client.id).border = thin_border
            ws.cell(row=data_row, column=2, value=client.name).border = thin_border
            ws.cell(row=data_row, column=3, value=client.nit).border = thin_border
            ws.cell(row=data_row, column=4, value=client.phone).border = thin_border
            ws.cell(row=data_row, column=5, value=client.email).border = thin_border
            ws.cell(row=data_row, column=6, value=client.address).border = thin_border
            ws.cell(row=data_row, column=7, value=client.contact_person).border = thin_border

            payment_cond = client.get_payment_condition_display()
            if client.payment_condition == 'credito' and client.credit_days:
                payment_cond += f" ({client.credit_days} días)"

            ws.cell(row=data_row, column=8, value=payment_cond).border = thin_border

            credit_cell = ws.cell(row=data_row, column=9, value=float(client.credit_limit))
            credit_cell.number_format = currency_format
            credit_cell.border = thin_border

            status = "Activo" if client.is_active else "Inactivo"
            ws.cell(row=data_row, column=10, value=status).border = thin_border

            data_row += 1

        # Ajustar anchos
        column_widths = [8, 35, 15, 15, 25, 40, 25, 20, 15, 10]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = width

        # Generar respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'clientes_gpro_{datetime.now().strftime("%Y%m%d")}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        wb.save(response)
        return response