from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.conf import settings
from apps.orders.models import ServiceOrder, Invoice
from apps.transfers.models import Transfer
from apps.clients.models import Client
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from apps.users.permissions import IsOperativo

# Import caching utilities (only active when Redis is configured)
try:
    from apps.core.cache import CacheManager
    CACHE_ENABLED = True
except ImportError:
    CACHE_ENABLED = False
    CacheManager = None


class DashboardView(APIView):
    permission_classes = [IsOperativo]

    def get(self, request):
        # Obtener parámetros de fecha
        try:
            year = int(request.query_params.get('year', datetime.now().year))
            month = int(request.query_params.get('month', datetime.now().month))
            reference_date = datetime(year, month, 1)
        except (ValueError, TypeError):
            # Fallback a fecha actual si hay error
            reference_date = datetime.now()
            year = reference_date.year
            month = reference_date.month

        # Check if caching is available and use it
        if CACHE_ENABLED and CacheManager:
            cache_manager = CacheManager()
            # Cache key único por periodo
            cache_key = f'dashboard_metrics_{year}_{month}'
            
            # Try to get from cache first
            cached_data = cache_manager.get(cache_key)
            if cached_data:
                return Response(cached_data)
            
            # Generate data and cache it
            data = self._generate_dashboard_data(reference_date)
            cache_manager.set(cache_key, data, timeout=60)  # Cache for 1 minute
            return Response(data)
        else:
            return Response(self._generate_dashboard_data(reference_date))
    
    def _generate_dashboard_data(self, reference_date):
        """Generate all dashboard metrics relative to reference_date"""
        current_month = reference_date.month
        current_year = reference_date.year
        real_today = datetime.now()

        monthly_breakdown = []
        is_annual_view = (self.request.query_params.get('month') == '0') if hasattr(self, 'request') else False
        
        # Override if passed from get() method context logic
        if current_month == 1 and hasattr(self, 'request') and self.request.query_params.get('month') == '0':
             # This is a bit hacky because reference_date was forced to month=1 in get()
             # We rely on the flag passed or logic below.
             # Better: check if current_month passed to this func logic.
             # Actually, let's trust the logic we build here.
             pass

        if is_annual_view:
            # === ANNUAL VIEW LOGIC ===
            
            # Current Year Totals
            total_os_month = ServiceOrder.objects.filter(created_at__year=current_year).count()
            billed_amount = Transfer.objects.filter(
                transfer_type__in=['cargos', 'terceros'],
                transaction_date__year=current_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            operating_costs = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios'],
                transaction_date__year=current_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            admin_costs = Transfer.objects.filter(
                transfer_type='admin',
                transaction_date__year=current_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            # Previous Year Totals (for Trend)
            prev_year = current_year - 1
            total_os_prev_month = ServiceOrder.objects.filter(created_at__year=prev_year).count()
            billed_amount_prev = Transfer.objects.filter(
                transfer_type__in=['cargos', 'terceros'],
                transaction_date__year=prev_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            operating_costs_prev = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios'],
                transaction_date__year=prev_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            # Generate 12-month breakdown for Charts
            for m in range(1, 13):
                m_billed = Transfer.objects.filter(
                    transfer_type__in=['cargos', 'terceros'],
                    transaction_date__year=current_year,
                    transaction_date__month=m
                ).aggregate(Sum('amount'))['amount__sum'] or 0
                
                m_costs = Transfer.objects.filter(
                    transfer_type__in=['costos', 'propios', 'admin'], # Include admin in chart costs
                    transaction_date__year=current_year,
                    transaction_date__month=m
                ).aggregate(Sum('amount'))['amount__sum'] or 0
                
                m_os = ServiceOrder.objects.filter(
                    created_at__year=current_year,
                    created_at__month=m
                ).count()

                month_name = datetime(current_year, m, 1).strftime('%b').capitalize() # Ene, Feb...
                # Note: Locale depends on system, we might want fixed names but this works for now.
                
                if m_billed > 0 or m_costs > 0 or m_os > 0:
                     monthly_breakdown.append({
                        'name': month_name,
                        'month': m,
                        'ingresos': float(m_billed),
                        'gastos': float(m_costs),
                        'total_os': m_os
                    })
            
            # Status counts (Annual)
            os_abiertas_month = ServiceOrder.objects.filter(created_at__year=current_year, status='abierta').count()
            os_cerradas_month = ServiceOrder.objects.filter(created_at__year=current_year, status='cerrada').count()
            
            # Top Clients (Annual)
            top_clients_qs = ServiceOrder.objects.filter(created_at__year=current_year)

        else:
            # === MONTHLY VIEW LOGIC (Existing) ===
            
            # Mes anterior relativo a la fecha seleccionada
            previous_month_date = reference_date - relativedelta(months=1)
            prev_month = previous_month_date.month
            prev_year = previous_month_date.year

            total_os_month = ServiceOrder.objects.filter(
                created_at__year=current_year, 
                created_at__month=current_month
            ).count()
            
            total_os_prev_month = ServiceOrder.objects.filter(
                created_at__year=prev_year, 
                created_at__month=prev_month
            ).count()

            billed_amount = Transfer.objects.filter(
                transfer_type__in=['cargos', 'terceros'],
                transaction_date__year=current_year,
                transaction_date__month=current_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            billed_amount_prev = Transfer.objects.filter(
                transfer_type__in=['cargos', 'terceros'],
                transaction_date__year=prev_year,
                transaction_date__month=prev_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            operating_costs = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios'],
                transaction_date__year=current_year,
                transaction_date__month=current_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            operating_costs_prev = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios'],
                transaction_date__year=prev_year,
                transaction_date__month=prev_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            admin_costs = Transfer.objects.filter(
                transfer_type='admin',
                transaction_date__year=current_year,
                transaction_date__month=current_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            os_abiertas_month = ServiceOrder.objects.filter(
                created_at__year=current_year,
                created_at__month=current_month,
                status='abierta'
            ).count()
            
            os_cerradas_month = ServiceOrder.objects.filter(
                created_at__year=current_year,
                created_at__month=current_month,
                status='cerrada'
            ).count()

            top_clients_qs = ServiceOrder.objects.filter(
                created_at__year=current_year,
                created_at__month=current_month
            )

        # Common logic (Trends, Top Clients aggregation, etc.)
        
        # Top 5 clientes (Queryset defined above)
        top_clients = top_clients_qs.values(
            'client__id',
            'client__name'
        ).annotate(
            total_orders=Count('id'),
            total_amount=Sum('transfers__amount', filter=Q(transfers__transfer_type__in=['cargos', 'terceros']))
        ).order_by('-total_amount')[:5]

        # Calcular tendencias (% cambio)
        os_trend = 0
        if total_os_prev_month > 0:
            os_trend = ((total_os_month - total_os_prev_month) / total_os_prev_month) * 100
        
        billing_trend = 0
        if billed_amount_prev > 0:
            billing_trend = ((float(billed_amount) - float(billed_amount_prev)) / float(billed_amount_prev)) * 100
        
        costs_trend = 0
        if operating_costs_prev > 0:
            costs_trend = ((float(operating_costs) - float(operating_costs_prev)) / float(operating_costs_prev)) * 100

        # ... (Rest of status counts / alerts is mostly strictly "Current State" so we keep it same for now, 
        # except maybe we want to know how many orders created in 2024 are currently pending? 
        # But the original logic was generic "Status counts" not filtered by date.
        # Original: ServiceOrder.objects.values('status').annotate... -> This counts ALL orders in DB.
        # This is correct for "Operational Status" (How many pending total?).
        
        # Reuse existing status count logic (Global state)
        status_counts = ServiceOrder.objects.values('status').annotate(count=Count('id'))
        status_map = {item['status']: item['count'] for item in status_counts}
        
        os_pendiente = status_map.get('pendiente', 0)
        os_en_transito = status_map.get('en_transito', 0)
        os_en_puerto = status_map.get('en_puerto', 0)
        os_en_almacen = status_map.get('en_almacen', 0)
        os_finalizada = status_map.get('finalizada', 0)
        os_cerradas = status_map.get('cerrada', 0)
        
        os_abiertas = os_pendiente + os_en_transito + os_en_puerto + os_en_almacen + os_finalizada

        # Transferencias pendientes (Global)
        pending_transfers_qs = Transfer.objects.filter(status__in=['pendiente', 'provisionada'])
        pending_transfers = pending_transfers_qs.count()
        pending_transfers_amount = pending_transfers_qs.aggregate(Sum('amount'))['amount__sum'] or 0

        # Facturas (CXC Global)
        pending_invoices = Invoice.objects.filter(
            Q(status='pending') | Q(status='partial')
        ).count()

        # Facturas vencidas
        overdue_invoices = Invoice.objects.filter(
            due_date__lt=real_today.date(),
            balance__gt=0
        ).exclude(status='paid')

        # Facturas próximas a vencer (próximos 7 días)
        upcoming_due = Invoice.objects.filter(
            due_date__gte=real_today.date(),
            due_date__lte=(real_today + timedelta(days=7)).date(),
            balance__gt=0
        ).exclude(status='paid')

        # Generar alertas
        alerts = []

        # Alertas de facturas vencidas
        for invoice in overdue_invoices[:5]:  # Máximo 5 alertas
            days_overdue = (real_today.date() - invoice.due_date).days
            alerts.append({
                'id': f'invoice_overdue_{invoice.id}',
                'type': 'invoice_overdue',
                'severity': 'high' if days_overdue > 15 else 'medium',
                'message': f'Factura {invoice.invoice_number} vencida hace {days_overdue} días',
                'client': invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'amount': float(invoice.balance),
                'days_overdue': days_overdue
            })

        # Alertas de facturas próximas a vencer
        for invoice in upcoming_due[:3]:  # Máximo 3 alertas
            days_until_due = (invoice.due_date - real_today.date()).days
            alerts.append({
                'id': f'invoice_due_soon_{invoice.id}',
                'type': 'invoice_due_soon',
                'severity': 'medium',
                'message': f'Factura {invoice.invoice_number} vence en {days_until_due} días',
                'client': invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'amount': float(invoice.balance),
                'days_until_due': days_until_due
            })

        # Alertas de clientes próximos a exceder límite de crédito (optimizado - sin N+1)
        # Usar una sola query con subquery para calcular crédito usado por cliente
        from django.db.models import OuterRef, Subquery, DecimalField
        from django.db.models.functions import Coalesce

        credit_subquery = Invoice.objects.filter(
            service_order__client=OuterRef('pk'),
            balance__gt=0
        ).exclude(status='paid').values('service_order__client').annotate(
            total=Sum('balance')
        ).values('total')

        clients_with_credit = Client.objects.filter(
            payment_condition='credito',
            is_active=True,
            credit_limit__gt=0
        ).annotate(
            credit_used=Coalesce(Subquery(credit_subquery), 0, output_field=DecimalField())
        )

        for client in clients_with_credit:
            if client.credit_limit > 0:
                credit_percentage = (float(client.credit_used) / float(client.credit_limit)) * 100

                if credit_percentage >= 80:  # Alerta si está al 80% o más
                    alerts.append({
                        'id': f'credit_limit_{client.id}',
                        'type': 'credit_limit_warning',
                        'severity': 'high' if credit_percentage >= 95 else 'medium',
                        'message': f'Cliente {client.name} al {credit_percentage:.0f}% de su límite de crédito',
                        'client': client.name,
                        'client_id': client.id,
                        'credit_used': float(client.credit_used),
                        'credit_limit': float(client.credit_limit),
                        'credit_percentage': round(credit_percentage, 1)
                    })

        # Órdenes recientes (últimas 10) - optimizado con annotate para evitar N+1
        recent_orders = ServiceOrder.objects.select_related('client').annotate(
            calculated_total=Coalesce(
                Sum('transfers__amount', filter=Q(transfers__transfer_type__in=['cargos', 'terceros'])),
                0,
                output_field=DecimalField()
            )
        ).order_by('-created_at')[:10]

        recent_orders_data = [
            {
                'id': order.id,
                'order_number': order.order_number,
                'client_name': order.client.name if order.client else 'N/A',
                'created_at': order.created_at.isoformat(),
                'status': order.status,
                'total_amount': float(order.calculated_total),
                'eta': order.eta.isoformat() if order.eta else None,
            }
            for order in recent_orders
        ]

        data = {
            'current_month': {
                'total_os_month': total_os_month,
                'billed_amount': float(billed_amount),
                'operating_costs': float(operating_costs),
                'admin_costs': float(admin_costs),
                'os_abiertas_month': os_abiertas_month,
                'os_cerradas_month': os_cerradas_month,
            },
            'previous_month': {
                'total_os': total_os_prev_month,
                'billed_amount': float(billed_amount_prev),
                'operating_costs': float(operating_costs_prev),
            },
            'trends': {
                'os_trend': round(os_trend, 2),
                'billing_trend': round(billing_trend, 2),
                'costs_trend': round(costs_trend, 2),
            },
            'overall': {
                'os_abiertas': os_abiertas,
                'os_pendiente': os_pendiente,
                'os_en_transito': os_en_transito,
                'os_en_puerto': os_en_puerto,
                'os_en_almacen': os_en_almacen,
                'os_finalizada': os_finalizada,
                'os_cerradas': os_cerradas,
                'pending_transfers': pending_transfers,
                'pending_transfers_amount': float(pending_transfers_amount),
                'total_clients': Client.objects.filter(is_active=True).count(),
                'pending_invoices': pending_invoices,
            },
            'top_clients': [
                {
                    'id': client['client__id'],
                    'name': client['client__name'],
                    'total_orders': client['total_orders'],
                    'total_amount': float(client['total_amount'] or 0)
                }
                for client in top_clients
            ],
            'monthly_breakdown': monthly_breakdown,
            'alerts': alerts,
            'recent_orders': recent_orders_data
        }
        return data