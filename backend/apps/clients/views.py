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
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime

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

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo2])
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
            'reference': payment.reference or '',
            'notes': payment.notes or ''
        } for payment in recent_payments]

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

            # Facturas por estado
            'invoices_by_status': invoices_by_status,
            'overdue_count': overdue_invoices,
            'upcoming_due_count': upcoming_due,

            # Listas detalladas
            'invoices': invoices_data,
            'recent_payments': payments_data,

            'year': year
        }

        return Response(data)
    
    @action(detail=True, methods=['get'], permission_classes=[IsOperativo2])
    def export_statement_excel(self, request, pk=None):
        """Exportar estado de cuenta a Excel"""
        client = self.get_object()
        
        # Obtener datos del estado de cuenta
        pending_orders = ServiceOrder.objects.filter(client=client, status='abierta')
        
        credit_used = Transfer.objects.filter(
            service_order__in=pending_orders,
            transfer_type='terceros',
            status='provisionada'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        available_credit = client.credit_limit - credit_used
        
        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Estado de Cuenta"
        
        # Estilos
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        
        # Encabezado del documento
        ws['A1'] = "ESTADO DE CUENTA - GPRO LOGISTIC"
        ws['A1'].font = Font(size=16, bold=True)
        ws.merge_cells('A1:F1')
        
        ws['A3'] = "Cliente:"
        ws['B3'] = client.name
        ws['A4'] = "NIT:"
        ws['B4'] = client.nit
        ws['A5'] = "Condición de Pago:"
        ws['B5'] = client.get_payment_condition_display()
        
        ws['D3'] = "Límite de Crédito:"
        ws['E3'] = float(client.credit_limit)
        ws['D4'] = "Crédito Usado:"
        ws['E4'] = float(credit_used)
        ws['D5'] = "Crédito Disponible:"
        ws['E5'] = float(available_credit)
        
        # Tabla de órdenes pendientes
        ws['A7'] = "ÓRDENES PENDIENTES"
        ws['A7'].font = Font(bold=True, size=12)
        
        headers = ['No. Orden', 'Fecha', 'ETA', 'DUCA', 'PO', 'Monto']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=8, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        # Datos de órdenes
        row = 9
        for order in pending_orders:
            order_total = order.transfers.filter(
                transfer_type='terceros',
                status='provisionada'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            if order_total > 0:
                ws.cell(row=row, column=1, value=order.order_number)
                ws.cell(row=row, column=2, value=order.created_at.strftime('%Y-%m-%d'))
                ws.cell(row=row, column=3, value=order.eta.strftime('%Y-%m-%d') if order.eta else '')
                ws.cell(row=row, column=4, value=order.duca)
                ws.cell(row=row, column=5, value=order.purchase_order)
                ws.cell(row=row, column=6, value=float(order_total))
                row += 1
        
        # Ajustar anchos de columna
        for col in range(1, 7):
            ws.column_dimensions[get_column_letter(col)].width = 18
        
        # Generar respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=estado_cuenta_{client.nit}_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        wb.save(response)
        return response