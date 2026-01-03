from rest_framework.views import APIView
from rest_framework.response import Response
from apps.orders.models import ServiceOrder, Invoice
from apps.transfers.models import Transfer
from datetime import datetime, timedelta
from django.db.models import Q
from apps.users.permissions import IsOperativo

class AlertsView(APIView):
    """
    Centro de Alertas Operativas, Financieras y de Pagos.
    Genera un resumen en tiempo real de situaciones que requieren atención.
    """
    permission_classes = [IsOperativo]

    def get(self, request):
        today = datetime.now().date()
        alerts = []

        # === 1. ALERTAS OPERATIVAS (LOGÍSTICA) ===
        
        # ETA Próximo (Próximos 2 días)
        eta_soon = ServiceOrder.objects.filter(
            status__in=['en_transito'],
            eta__gte=today,
            eta__lte=today + timedelta(days=2)
        ).select_related('client')

        for os in eta_soon:
            days = (os.eta - today).days
            msg = f"Llega {'hoy' if days == 0 else 'mañana' if days == 1 else 'en 2 días'}"
            alerts.append({
                'id': f'eta_soon_{os.id}',
                'severity': 'medium',
                'type': 'eta_soon',
                'message': f"OS-{os.order_number}: {msg}",
                'client': os.client.name,
                'order': os.order_number,
                'link': f"/service-orders/{os.id}",
                'date': os.eta
            })

        # ETA Vencido (ETA < Hoy y sigue en tránsito)
        eta_missed = ServiceOrder.objects.filter(
            status__in=['en_transito', 'pendiente'],
            eta__lt=today
        ).select_related('client')

        for os in eta_missed:
            days = (today - os.eta).days
            alerts.append({
                'id': f'eta_missed_{os.id}',
                'severity': 'high',
                'type': 'eta_missed',
                'message': f"OS-{os.order_number}: ETA vencido hace {days} días",
                'client': os.client.name,
                'order': os.order_number,
                'link': f"/service-orders/{os.id}",
                'date': os.eta
            })

        # Cierre Pendiente (Finalizada hace > 7 días pero no cerrada)
        closure_pending = ServiceOrder.objects.filter(
            status='finalizada',
            updated_at__lte=datetime.now() - timedelta(days=7)
        ).exclude(status='cerrada').select_related('client')

        for os in closure_pending:
            alerts.append({
                'id': f'closure_{os.id}',
                'severity': 'warning',
                'type': 'closure_pending',
                'message': f"OS-{os.order_number}: Finalizada hace >7 días sin cerrar",
                'client': os.client.name,
                'order': os.order_number,
                'link': f"/service-orders/{os.id}",
                'date': os.updated_at.date()
            })

        # === 2. ALERTAS FINANCIERAS (CXC) ===

        # Facturas Vencidas
        overdue_invoices = Invoice.objects.filter(
            status='overdue'
        ).select_related('service_order__client')

        for inv in overdue_invoices:
            days = inv.days_overdue()
            alerts.append({
                'id': f'cxc_overdue_{inv.id}',
                'severity': 'high',
                'type': 'invoice_overdue',
                'message': f"Factura {inv.invoice_number}: Vencida hace {days} días (${inv.balance})",
                'client': inv.service_order.client.name,
                'link': f"/invoicing",
                'date': inv.due_date
            })

        # === 3. ALERTAS DE PROVEEDORES (CXP) ===
        
        # Pagos Aprobados Antiguos (> 15 días sin pagar)
        stale_payments = Transfer.objects.filter(
            status='aprobado',
            transaction_date__lte=today - timedelta(days=15)
        ).select_related('provider')

        for t in stale_payments:
            alerts.append({
                'id': f'cxp_stale_{t.id}',
                'severity': 'warning',
                'type': 'payment_stale',
                'message': f"Pago a {t.provider.name}: Aprobado hace >15 días (${t.balance})",
                'client': t.provider.name, # Reusing client field for provider name to fit UI
                'link': f"/transfers", 
                'date': t.transaction_date
            })

        return Response(alerts)
