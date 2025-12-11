from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal
from .models import Invoice, InvoicePayment, ServiceOrder
from .serializers import InvoiceSerializer, InvoiceListSerializer, InvoicePaymentSerializer
from apps.users.permissions import IsOperativo, IsOperativo2


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices (CXC)"""
    permission_classes = [IsOperativo]
    serializer_class = InvoiceSerializer
    filterset_fields = ['status']
    search_fields = ['invoice_number', 'client__name', 'ccf']
    ordering_fields = ['invoice_date', 'due_date', 'total_amount', 'balance']
    ordering = ['-invoice_date']

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

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoicing summary statistics"""
        queryset = self.get_queryset()

        total_invoiced = queryset.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')

        total_pending = queryset.filter(balance__gt=0).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')

        total_collected = queryset.aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0')

        from django.utils import timezone
        overdue = queryset.filter(
            due_date__lt=timezone.now().date(),
            balance__gt=0
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0')

        return Response({
            'total_invoiced': str(total_invoiced),
            'total_pending': str(total_pending),
            'total_collected': str(total_collected),
            'total_overdue': str(overdue),
            'pending_count': queryset.filter(balance__gt=0).count(),
            'paid_count': queryset.filter(balance=0).count(),
        })

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
                reference=request.data.get('reference', ''),
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
