from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Value
from django.conf import settings
from apps.orders.models import ServiceOrder, Invoice, OrderCharge
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

    def _generate_client_breakdown(self, year, month, is_annual_view=False):
        """
        Generate client-level financial breakdown for comparative table.
        Returns list of clients with:
        - total_ingresos: Total PENDING amount (Balance)
        - total_servicios: Pending portion of services
        - total_prestamos: Pending portion of expenses/loans (Gastos a Terceros)
        
        NOTE: 'total_servicios' is calculated as a residual to ensure strict mathematical consistency:
        Saldo Pendiente = Servicios Pendientes + Préstamos Pendientes
        """
        from django.db.models import DecimalField, Case, When, F
        from django.db.models.functions import Coalesce as CoalesceFunc
        
        # Base queryset for Invoices (Financial View)
        if year == 0:
            # All Time View
            base_qs = Invoice.objects.exclude(status='cancelled')
        elif is_annual_view:
            base_qs = Invoice.objects.filter(
                issue_date__year=year
            ).exclude(status='cancelled')
        else:
            base_qs = Invoice.objects.filter(
                issue_date__year=year,
                issue_date__month=month
            ).exclude(status='cancelled')

        # Aggregate by client
        client_data = base_qs.values(
            'service_order__client__id',
            'service_order__client__name'
        ).annotate(
            # Total Ingresos: Sum of BALANCES (Pending Payment)
            total_ingresos=CoalesceFunc(
                Sum('balance'),
                Value(0),
                output_field=DecimalField()
            ),
            # Total Préstamos: Pending portion of invoices attributed to Third Party Expenses
            # Logic: (Total Third Party * Balance) / Total Amount
            total_prestamos=CoalesceFunc(
                Sum(
                    Case(
                        When(
                            total_amount__gt=0,
                            then=F('total_third_party') * F('balance') / F('total_amount')
                        ),
                        default=Value(0),
                        output_field=DecimalField()
                    )
                ),
                Value(0),
                output_field=DecimalField()
            )
        ).order_by('-total_ingresos')

        # Format the data
        breakdown = []
        for item in client_data:
            ingresos = float(item['total_ingresos'])
            prestamos = float(item['total_prestamos'])
            # Force consistency: Servicios = Total - Préstamos
            servicios = ingresos - prestamos

            if ingresos > 0 or servicios > 0 or prestamos > 0:
                breakdown.append({
                    'client_id': item['service_order__client__id'],
                    'client_name': item['service_order__client__name'] or 'N/A',
                    'total_ingresos': ingresos,
                    'total_servicios': servicios,
                    'total_prestamos': prestamos
                })

        return breakdown

    def _generate_cash_flow_data(self, year, month, is_annual_view=False):
        """
        Generate cash flow data: Facturado, Cobrado, Pendiente de Cobro
        """
        from django.db.models import DecimalField
        from django.db.models.functions import Coalesce as CoalesceFunc

        cash_flow = []

        # Handle "All Time" view (year=0) - show last 12 months
        if year == 0:
            current_year = datetime.now().year
            for m in range(1, 13):
                facturado = Invoice.objects.filter(
                    issue_date__year=current_year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

                cobrado = Invoice.objects.filter(
                    issue_date__year=current_year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(
                    total_paid=CoalesceFunc(
                        Sum('total_amount') - Sum('balance'),
                        Value(0),
                        output_field=DecimalField()
                    )
                )['total_paid'] or 0

                pendiente = Invoice.objects.filter(
                    issue_date__year=current_year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(
                    Sum('balance')
                )['balance__sum'] or 0

                month_name = datetime(current_year, m, 1).strftime('%b')
                cash_flow.append({
                    'month': month_name,
                    'facturado': float(facturado),
                    'cobrado': float(cobrado),
                    'pendiente': float(pendiente)
                })
        elif is_annual_view:
            # Generate for each month of the year
            for m in range(1, 13):
                # Facturado: Total de Facturas Emitidas (Invoice)
                facturado = Invoice.objects.filter(
                    issue_date__year=year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

                # Cobrado: Total de pagos recibidos en facturas del mes
                cobrado = Invoice.objects.filter(
                    issue_date__year=year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(
                    total_paid=CoalesceFunc(
                        Sum('total_amount') - Sum('balance'),
                        Value(0),
                        output_field=DecimalField()
                    )
                )['total_paid'] or 0

                # Pendiente: Balance de facturas emitidas en el mes
                pendiente = Invoice.objects.filter(
                    issue_date__year=year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(
                    Sum('balance')
                )['balance__sum'] or 0

                month_name = datetime(year, m, 1).strftime('%b')
                cash_flow.append({
                    'month': month_name,
                    'facturado': float(facturado),
                    'cobrado': float(cobrado),
                    'pendiente': float(pendiente)
                })
        else:
            # Single month view - just return the current month
            facturado = Invoice.objects.filter(
                issue_date__year=year,
                issue_date__month=month
            ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            cobrado = Invoice.objects.filter(
                issue_date__year=year,
                issue_date__month=month
            ).exclude(status='cancelled').aggregate(
                total_paid=CoalesceFunc(
                    Sum('total_amount') - Sum('balance'),
                    Value(0),
                    output_field=DecimalField()
                )
            )['total_paid'] or 0

            pendiente = Invoice.objects.filter(
                issue_date__year=year,
                issue_date__month=month
            ).exclude(status='cancelled').aggregate(
                Sum('balance')
            )['balance__sum'] or 0

            month_name = datetime(year, month, 1).strftime('%B')
            cash_flow.append({
                'month': month_name,
                'facturado': float(facturado),
                'cobrado': float(cobrado),
                'pendiente': float(pendiente)
            })

        return cash_flow

    def _generate_revenue_composition(self, year, month, is_annual_view=False):
        """
        Generate revenue composition: Servicios Propios vs Tercerizados
        Based on Invoices issued in the period.
        
        Logic:
        - Chart Base (Total Services) = Sum(Invoice.total_amount) - Sum(Invoice.total_third_party)
          (Calculated as residual from Totals to ensure exact match with Financial Table)
        - Tercerizados = Charges (is_third_party=True) on Invoices
        - Propios = Total Services - Tercerizados (Residual)
        """
        # Handle "All Time" view (year=0)
        if year == 0:
            invoice_qs = Invoice.objects.exclude(status='cancelled')
        elif is_annual_view:
            invoice_qs = Invoice.objects.filter(
                issue_date__year=year
            ).exclude(status='cancelled')
        else:
            invoice_qs = Invoice.objects.filter(
                issue_date__year=year,
                issue_date__month=month
            ).exclude(status='cancelled')

        # 0. Calculate Totals from Invoices (Source of Truth)
        # We use (Total Revenue - Total Third Party) to determine the Service Revenue portion
        # This matches the logic used in the Financial Analysis Table to handle any DB inconsistencies
        totals = invoice_qs.aggregate(
            total_revenue=Sum('total_amount'),
            total_third_party=Sum('total_third_party')
        )
        
        total_revenue = float(totals['total_revenue'] or 0)
        total_third_party = float(totals['total_third_party'] or 0)
        
        # Chart Base: Total Service Revenue
        total_services = total_revenue - total_third_party

        # 1. Calculate Revenue from Charges (Services) that are Third Party
        charges_tercerizados = OrderCharge.objects.filter(
            invoice__in=invoice_qs,
            is_deleted=False,
            is_third_party_service=True
        ).aggregate(total=Sum('total'))['total'] or 0

        # 2. Aggregate
        servicios_tercerizados = float(charges_tercerizados)
        
        # 3. Calculate Propios as Residual of Services
        servicios_propios = total_services - servicios_tercerizados
        
        # Safety clamp
        if servicios_propios < 0:
            servicios_propios = 0
        
        return {
            'servicios_propios': servicios_propios,
            'servicios_tercerizados': servicios_tercerizados,
            'total': total_services,
            'porcentaje_propios': round((servicios_propios / total_services * 100) if total_services > 0 else 0, 2),
            'porcentaje_tercerizados': round((servicios_tercerizados / total_services * 100) if total_services > 0 else 0, 2)
        }

    def get(self, request):
        # Obtener parámetros de fecha
        try:
            # Check for 'all time' indicator (year=0)
            year_param = request.query_params.get('year')
            if year_param == '0':
                year = 0
            else:
                year = int(year_param or datetime.now().year)
                
            month = int(request.query_params.get('month', datetime.now().month))
            
            if year == 0:
                reference_date = datetime.now() # Fallback for calculations requiring a date object
            elif month == 0:
                # Vista anual (month=0): usar mes 1 como referencia
                reference_date = datetime(year, 1, 1)
            else:
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
            data = self._generate_dashboard_data(reference_date, year)
            cache_manager.set(cache_key, data, timeout=60)  # Cache for 1 minute
            return Response(data)
        else:
            return Response(self._generate_dashboard_data(reference_date, year))
    
    def _generate_dashboard_data(self, reference_date, year_override=None):
        """Generate all dashboard metrics relative to reference_date"""
        current_month = reference_date.month
        current_year = year_override if year_override is not None else reference_date.year
        real_today = datetime.now()

        monthly_breakdown = []
        is_all_time_view = (current_year == 0)
        is_annual_view = (self.request.query_params.get('month') == '0') if hasattr(self, 'request') else False
        
        # Initialize variables to avoid UnboundLocalError
        total_os_prev_month = 0
        billed_amount_prev = 0
        operating_costs_prev = 0
        
        # Override if passed from get() method context logic
        if current_month == 1 and hasattr(self, 'request') and self.request.query_params.get('month') == '0':
             pass

        if is_all_time_view:
            # === ALL TIME VIEW LOGIC ===
            # Operational Counts
            total_os_month = ServiceOrder.objects.count()

            # INGRESOS: Invoice-based (All Time)
            billed_amount = Invoice.objects.exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            operating_costs = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios']
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            admin_costs = Transfer.objects.filter(
                transfer_type='admin'
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            # No trend comparison for All Time (or compare to last year?)
            # For simplicity, set trends to 0 or compare to nothing
            billed_amount_prev = 0
            operating_costs_prev = 0
            
            # Generate breakdown by Year instead of Month? Or just last 12 months?
            # Let's show last 12 months for utility
            for m in range(1, 13):
                # Using current year for graph to show something relevant
                # Or maybe show aggregated by year? 
                # Let's stick to current year's monthly breakdown for the graph even in all time view
                # as showing "All Time by Month" is impossible (too many months).
                m_billed = Invoice.objects.filter(
                    issue_date__year=real_today.year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

                m_costs = Transfer.objects.filter(
                    transfer_type__in=['costos', 'propios', 'admin'],
                    transaction_date__year=real_today.year,
                    transaction_date__month=m
                ).aggregate(Sum('amount'))['amount__sum'] or 0

                m_os = ServiceOrder.objects.filter(
                    created_at__year=real_today.year,
                    created_at__month=m
                ).count()

                month_name = datetime(real_today.year, m, 1).strftime('%b').capitalize()

                if m_billed > 0 or m_costs > 0 or m_os > 0:
                    monthly_breakdown.append({
                        'name': month_name,
                        'month': m,
                        'ingresos': float(m_billed),
                        'gastos': float(m_costs),
                        'total_os': m_os
                    })

            os_abiertas_month = ServiceOrder.objects.exclude(status='cerrada').count()
            os_cerradas_month = ServiceOrder.objects.filter(status='cerrada').count()
            top_clients_qs = ServiceOrder.objects.all()

        elif is_annual_view:
            # === ANNUAL VIEW LOGIC ===
            orders_qs = ServiceOrder.objects.filter(created_at__year=current_year)
            total_os_month = orders_qs.count()

            # FACTURACIÓN EMITIDA (Financial): Sum of Invoice.total_amount
            # Uses issue_date for financial reporting consistency with CXC
            billed_amount = Invoice.objects.filter(
                issue_date__year=current_year
            ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

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
            
            # Facturación del año anterior
            billed_amount_prev = Invoice.objects.filter(
                issue_date__year=prev_year
            ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            operating_costs_prev = Transfer.objects.filter(
                transfer_type__in=['costos', 'propios'],
                transaction_date__year=prev_year
            ).aggregate(Sum('amount'))['amount__sum'] or 0

            # Generate 12-month breakdown for Charts
            for m in range(1, 13):
                # Ingresos: Facturación Emitida (Invoices by issue_date)
                m_billed = Invoice.objects.filter(
                    issue_date__year=current_year,
                    issue_date__month=m
                ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

                m_costs = Transfer.objects.filter(
                    transfer_type__in=['costos', 'propios', 'admin'],
                    transaction_date__year=current_year,
                    transaction_date__month=m
                ).aggregate(Sum('amount'))['amount__sum'] or 0

                m_os = ServiceOrder.objects.filter(
                    created_at__year=current_year,
                    created_at__month=m
                ).count()

                month_name = datetime(current_year, m, 1).strftime('%b').capitalize()

                if m_billed > 0 or m_costs > 0 or m_os > 0:
                    monthly_breakdown.append({
                        'name': month_name,
                        'month': m,
                        'ingresos': float(m_billed),
                        'gastos': float(m_costs),
                        'total_os': m_os
                    })
            
            os_abiertas_month = ServiceOrder.objects.filter(
                created_at__year=current_year
            ).exclude(status='cerrada').count()
            os_cerradas_month = ServiceOrder.objects.filter(created_at__year=current_year, status='cerrada').count()
            top_clients_qs = ServiceOrder.objects.filter(created_at__year=current_year)

        else:
            # === MONTHLY VIEW LOGIC (Existing) ===
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

            # FACTURACIÓN EMITIDA (Financial): Sum of Invoice.total_amount
            # Uses issue_date for financial reporting consistency with CXC
            billed_amount = Invoice.objects.filter(
                issue_date__year=current_year,
                issue_date__month=current_month
            ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            # Prev Month Facturación
            billed_amount_prev = Invoice.objects.filter(
                issue_date__year=prev_year,
                issue_date__month=prev_month
            ).exclude(status='cancelled').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

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
                created_at__month=current_month
            ).exclude(status='cerrada').count()

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
        
        # Top 5 clientes - Calcular desde OrderCharge (servicios) como fuente primaria
        # Si no hay servicios, usar facturas como fallback
        # Esto muestra el valor real de los servicios prestados, facturados o no
        from django.db.models import OuterRef, Subquery, DecimalField as DField
        from django.db.models.functions import Coalesce as CoalesceFunc
        
        top_clients = top_clients_qs.values(
            'client__id',
            'client__name'
        ).annotate(
            total_orders=Count('id'),
            # Calcular total de servicios (charges) como métrica principal
            total_services=CoalesceFunc(
                Sum('charges__total', filter=Q(charges__is_deleted=False)),
                Value(0),
                output_field=DField()
            ),
            # Facturado como métrica secundaria
            total_invoiced=CoalesceFunc(
                Sum('invoices__total_amount', filter=~Q(invoices__status='cancelled')),
                Value(0),
                output_field=DField()
            )
        ).annotate(
            # Usar el mayor entre servicios e facturado para el ranking
            total_amount=CoalesceFunc(
                Sum('charges__total', filter=Q(charges__is_deleted=False)),
                Sum('invoices__total_amount', filter=~Q(invoices__status='cancelled')),
                Value(0),
                output_field=DField()
            )
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
            if days_overdue == 1:
                message = f'Factura {invoice.invoice_number} venció ayer'
            else:
                message = f'Factura {invoice.invoice_number} vencida hace {days_overdue} días'
            alerts.append({
                'id': f'invoice_overdue_{invoice.id}',
                'type': 'invoice_overdue',
                'severity': 'high' if days_overdue > 15 else 'medium',
                'message': message,
                'client': invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'amount': float(invoice.balance),
                'days_overdue': days_overdue
            })

        # Alertas de facturas próximas a vencer
        for invoice in upcoming_due[:3]:  # Máximo 3 alertas
            days_until_due = (invoice.due_date - real_today.date()).days
            if days_until_due == 0:
                message = f'Factura {invoice.invoice_number} vence hoy'
            elif days_until_due == 1:
                message = f'Factura {invoice.invoice_number} vence mañana'
            else:
                message = f'Factura {invoice.invoice_number} vence en {days_until_due} días'
            alerts.append({
                'id': f'invoice_due_soon_{invoice.id}',
                'type': 'invoice_due_soon',
                'severity': 'high' if days_until_due == 0 else 'medium',
                'message': message,
                'client': invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'amount': float(invoice.balance),
                'days_until_due': days_until_due
            })

        # Alertas de clientes próximos a exceder límite de crédito (optimizado - sin N+1)
        # Usar una sola query con subquery para calcular crédito usado por cliente
        # Esto muestra el valor real de los servicios prestados, facturados o no
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
        # Usamos Invoices Total o Charges Total (fallback) para mostrar monto real
        recent_orders = ServiceOrder.objects.select_related('client').annotate(
            calculated_total=Coalesce(
                Sum('invoices__total_amount', filter=~Q(invoices__status='cancelled')),
                Sum('charges__total', filter=Q(charges__is_deleted=False)),
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

        # Generate client financial breakdown for comparative table
        client_breakdown = self._generate_client_breakdown(current_year, current_month, is_annual_view)

        # Generate cash flow data (facturado vs cobrado vs pendiente)
        cash_flow_data = self._generate_cash_flow_data(current_year, current_month, is_annual_view)

        # Generate revenue composition (servicios propios vs tercerizados)
        revenue_composition = self._generate_revenue_composition(current_year, current_month, is_annual_view)

        # Calculate profitability metrics
        # 1. Get the Invoices for the period (same filter as billed_amount)
        if is_all_time_view:
            period_invoices = Invoice.objects.exclude(status='cancelled')
        elif is_annual_view:
            period_invoices = Invoice.objects.filter(issue_date__year=current_year).exclude(status='cancelled')
        else:
            period_invoices = Invoice.objects.filter(issue_date__year=current_year, issue_date__month=current_month).exclude(status='cancelled')

        # 2. Calculate the COST of the billed expenses (Préstamos) included in those invoices
        # These are Transfers (cargos/terceros) linked to the invoices.
        # We sum 'amount' (the cost we paid to provider), NOT the billed amount (revenue).
        billed_expenses_cost = Transfer.objects.filter(
            invoice__in=period_invoices,
            transfer_type__in=['cargos', 'terceros'],
            is_deleted=False
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        total_facturacion = float(billed_amount)
        # Total Costs = Operating (Overhead) + Admin + Direct Cost of Billed Expenses
        total_costos = float(operating_costs) + float(admin_costs) + float(billed_expenses_cost)
        
        margen = total_facturacion - total_costos
        rentabilidad_porcentaje = (margen / total_facturacion * 100) if total_facturacion > 0 else 0

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
            'client_breakdown': client_breakdown,
            'monthly_breakdown': monthly_breakdown,
            'alerts': alerts,
            'recent_orders': recent_orders_data,
            'cash_flow_data': cash_flow_data,
            'revenue_composition': revenue_composition,
            'profitability': {
                'margen': margen,
                'rentabilidad_porcentaje': round(rentabilidad_porcentaje, 2)
            }
        }
        return data