from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.http import HttpResponse
from decimal import Decimal
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from .models import Invoice, InvoicePayment, ServiceOrder
from .serializers import InvoiceSerializer, InvoiceListSerializer, InvoicePaymentSerializer
from apps.users.permissions import IsOperativo, IsOperativo2


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices (CXC)"""
    permission_classes = [IsOperativo]
    serializer_class = InvoiceSerializer
    filterset_fields = ['status']
    search_fields = ['invoice_number', 'service_order__client__name', 'ccf']
    ordering_fields = ['issue_date', 'due_date', 'total_amount', 'balance']
    ordering = ['-issue_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        """Create invoice from service order"""
        # Get the service order
        service_order_id = self.request.data.get('service_order')
        total_amount = Decimal(str(self.request.data.get('total_amount', 0)))
        invoice_number = self.request.data.get('invoice_number', '')

        # Get dates
        from datetime import datetime
        issue_date = self.request.data.get('issue_date')
        if isinstance(issue_date, str):
            issue_date = datetime.strptime(issue_date, '%Y-%m-%d').date()

        due_date = self.request.data.get('due_date')
        if due_date and isinstance(due_date, str):
            due_date = datetime.strptime(due_date, '%Y-%m-%d').date()

        if not service_order_id:
            raise ValueError("Se requiere una orden de servicio")

        try:
            service_order = ServiceOrder.objects.get(id=service_order_id)
        except ServiceOrder.DoesNotExist:
            raise ValueError("Orden de servicio no encontrada")

        # Get file if provided
        pdf_file = self.request.FILES.get('pdf_file')
        dte_file = self.request.FILES.get('dte_file')

        # Create invoice with values
        invoice_data = {
            'created_by': self.request.user,
            'invoice_number': invoice_number,
            'issue_date': issue_date,
            'due_date': due_date,
            'total_amount': total_amount,
            'balance': total_amount,
            'paid_amount': Decimal('0.00')
        }

        # Add files if provided
        if pdf_file:
            invoice_data['pdf_file'] = pdf_file
        if dte_file:
            invoice_data['dte_file'] = dte_file

        invoice = serializer.save(**invoice_data)

        # Mark service order as invoiced
        service_order.facturado = True
        service_order.save()

        return invoice

    def get_queryset(self):
        queryset = Invoice.objects.all().select_related(
            'service_order', 'service_order__client', 'service_order__sub_client', 'created_by'
        ).prefetch_related('payments')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter == 'pendiente':
            queryset = queryset.filter(balance__gt=0)
        elif status_filter == 'pagada':
            queryset = queryset.filter(balance=0)
        elif status_filter == 'vencida':
            from django.utils import timezone
            queryset = queryset.filter(
                due_date__lt=timezone.now().date(),
                balance__gt=0
            )

        # Filter by client (through service_order)
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(service_order__client_id=client_id)

        # Filter by month
        mes = self.request.query_params.get('mes')
        if mes:
            queryset = queryset.filter(mes=mes)

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Delete invoice and unmark service order as invoiced"""
        invoice = self.get_object()

        # Check if invoice has payments
        if invoice.paid_amount > 0:
            return Response(
                {'error': 'No se puede eliminar una factura con pagos registrados. Elimine los pagos primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service_order = invoice.service_order
            
            # Delete invoice
            invoice.delete()

            # Unmark service order as invoiced if it has no other invoices
            if service_order and not service_order.invoices.exists():
                service_order.facturado = False
                service_order.save()

            return Response(
                {'message': 'Factura eliminada correctamente'},
                status=status.HTTP_204_NO_CONTENT
            )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoicing summary statistics with enhanced KPIs"""
        queryset = self.get_queryset()
        from django.utils import timezone
        today = timezone.now().date()

        # Basic totals
        total_invoiced = queryset.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')

        total_pending = queryset.filter(balance__gt=0).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')

        total_collected = queryset.aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0')

        # Overdue invoices
        overdue_queryset = queryset.filter(
            due_date__lt=today,
            balance__gt=0
        )
        total_overdue = overdue_queryset.aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        overdue_count = overdue_queryset.count()

        # Status counts
        pending_count = queryset.filter(status='pending', balance__gt=0).count()
        paid_count = queryset.filter(status='paid').count()
        partial_count = queryset.filter(status='partial').count()
        cancelled_count = queryset.filter(status='cancelled').count()

        # Additional KPIs
        # Invoices due this week
        from datetime import timedelta
        week_end = today + timedelta(days=7)
        due_this_week = queryset.filter(
            due_date__gte=today,
            due_date__lte=week_end,
            balance__gt=0
        ).count()

        # Average collection time (for paid invoices)
        paid_invoices = queryset.filter(status='paid', due_date__isnull=False)

        return Response({
            'total_invoiced': str(total_invoiced),
            'total_pending': str(total_pending),
            'total_collected': str(total_collected),
            'total_overdue': str(total_overdue),
            'pending_count': pending_count,
            'paid_count': paid_count,
            'partial_count': partial_count,
            'overdue_count': overdue_count,
            'cancelled_count': cancelled_count,
            'due_this_week': due_this_week,
            'total_invoices': queryset.count(),
        })

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def export_excel(self, request):
        """Export invoices to Excel with professional formatting"""
        queryset = self.get_queryset()

        # Apply filters from request
        client_id = request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(service_order__client_id=client_id)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = request.query_params.get('dateFrom')
        if date_from:
            queryset = queryset.filter(issue_date__gte=date_from)

        date_to = request.query_params.get('dateTo')
        if date_to:
            queryset = queryset.filter(issue_date__lte=date_to)

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Cuentas por Cobrar"

        # Styles
        header_font = Font(bold=True, color="FFFFFF", size=11)
        header_fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        currency_format = '#,##0.00'

        # Headers
        headers = [
            'No. Factura', 'Cliente', 'Orden de Servicio', 'CCF',
            'Fecha Emisión', 'Fecha Vencimiento', 'Total', 'Pagado',
            'Saldo', 'Estado', 'Días Vencida'
        ]

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border

        # Data rows
        status_display = {
            'pending': 'Pendiente',
            'partial': 'Pago Parcial',
            'paid': 'Pagada',
            'overdue': 'Vencida',
            'cancelled': 'Anulada',
        }

        from django.utils import timezone
        today = timezone.now().date()

        for row_num, invoice in enumerate(queryset, 2):
            # Calculate days overdue
            days_overdue = 0
            if invoice.due_date and invoice.balance > 0 and today > invoice.due_date:
                days_overdue = (today - invoice.due_date).days

            data = [
                invoice.invoice_number,
                invoice.service_order.client.name if invoice.service_order else '',
                invoice.service_order.order_number if invoice.service_order else '',
                invoice.ccf or '',
                invoice.issue_date.strftime('%d/%m/%Y') if invoice.issue_date else '',
                invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '',
                float(invoice.total_amount),
                float(invoice.paid_amount),
                float(invoice.balance),
                status_display.get(invoice.status, invoice.status),
                days_overdue if days_overdue > 0 else '',
            ]

            for col_num, value in enumerate(data, 1):
                cell = ws.cell(row=row_num, column=col_num, value=value)
                cell.border = thin_border

                # Apply currency format to monetary columns
                if col_num in [7, 8, 9]:
                    cell.number_format = currency_format
                    cell.alignment = Alignment(horizontal="right")

        # Auto-adjust column widths
        for col_num, _ in enumerate(headers, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = 15

        # Wider columns for specific fields
        ws.column_dimensions['A'].width = 18  # Invoice number
        ws.column_dimensions['B'].width = 30  # Client name
        ws.column_dimensions['C'].width = 15  # Order number

        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=cuentas_por_cobrar.xlsx'
        wb.save(response)
        return response

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add a payment (abono) to an invoice"""
        invoice = self.get_object()

        if invoice.balance <= 0:
            return Response(
                {'error': 'Esta factura ya está completamente pagada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(request.data.get('amount', 0)))
            if amount <= 0:
                return Response(
                    {'error': 'El monto debe ser mayor a cero'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if amount > invoice.balance:
                return Response(
                    {'error': f'El monto excede el saldo pendiente (${invoice.balance})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment = InvoicePayment.objects.create(
                invoice=invoice,
                amount=amount,
                payment_date=request.data.get('payment_date'),
                payment_method=request.data.get('payment_method', 'transferencia'),
                reference_number=request.data.get('reference', ''),
                notes=request.data.get('notes', ''),
                created_by=request.user
            )

            # Update invoice balance
            invoice.paid_amount += amount
            invoice.balance = invoice.total_amount - invoice.paid_amount

            if invoice.balance <= 0:
                invoice.status = 'pagada'

            invoice.save()

            return Response({
                'message': 'Pago registrado exitosamente',
                'payment_id': payment.id,
                'new_balance': str(invoice.balance)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def generate_from_orders(self, request, pk=None):
        """Generate invoice from selected service orders"""
        try:
            client_id = request.data.get('client')
            order_ids = request.data.get('order_ids', [])

            if not client_id or not order_ids:
                return Response(
                    {'error': 'Debe proporcionar cliente y órdenes'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate orders
            orders = ServiceOrder.objects.filter(
                id__in=order_ids,
                client_id=client_id,
                status='cerrada',
                facturado=False
            )

            if orders.count() != len(order_ids):
                return Response(
                    {'error': 'Algunas órdenes no son válidas para facturar'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate totals
            total = sum(order.total_amount for order in orders)

            # Create invoice
            from django.utils import timezone
            invoice = Invoice.objects.create(
                client_id=client_id,
                sub_client_id=request.data.get('sub_client'),
                invoice_date=request.data.get('invoice_date', timezone.now().date()),
                due_date=request.data.get('due_date'),
                ccf=request.data.get('ccf', ''),
                total_amount=total,
                balance=total,
                created_by=request.user
            )

            # Link orders to invoice
            for order in orders:
                order.facturado = True
                order.save()
            invoice.service_orders.set(orders)

            return Response({
                'message': 'Factura generada exitosamente',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class InvoicePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice payments"""
    permission_classes = [IsOperativo]
    serializer_class = InvoicePaymentSerializer
    filterset_fields = ['invoice', 'payment_method']
    search_fields = ['reference', 'invoice__invoice_number']
    ordering = ['-payment_date']

    def get_queryset(self):
        return InvoicePayment.objects.all().select_related(
            'invoice', 'invoice__client', 'created_by'
        )

    def destroy(self, request, *args, **kwargs):
        """Delete a payment and update invoice balance"""
        payment = self.get_object()
        invoice = payment.invoice

        if invoice.status == 'cancelada':
            return Response(
                {'error': 'No se pueden eliminar pagos de una factura cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Update invoice
            invoice.paid_amount -= payment.amount
            invoice.balance = invoice.total_amount - invoice.paid_amount
            invoice.status = 'pendiente' if invoice.balance > 0 else 'pagada'
            invoice.save()

            # Delete payment
            payment.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
