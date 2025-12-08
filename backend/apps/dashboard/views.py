from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from apps.orders.models import ServiceOrder
from apps.transfers.models import Transfer
from apps.clients.models import Client
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from apps.users.permissions import IsOperativo

class DashboardView(APIView):
    permission_classes = [IsOperativo]

    def get(self, request):
        today = datetime.now()
        current_month = today.month
        current_year = today.year
        
        # Mes anterior
        previous_month = today - relativedelta(months=1)
        prev_month = previous_month.month
        prev_year = previous_month.year

        # KPIs del mes actual
        total_os_month = ServiceOrder.objects.filter(
            created_at__year=current_year, 
            created_at__month=current_month
        ).count()
        
        total_os_prev_month = ServiceOrder.objects.filter(
            created_at__year=prev_year, 
            created_at__month=prev_month
        ).count()

        # Monto facturado (terceros del mes)
        billed_amount = Transfer.objects.filter(
            transfer_type='terceros',
            transaction_date__year=current_year,
            transaction_date__month=current_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        billed_amount_prev = Transfer.objects.filter(
            transfer_type='terceros',
            transaction_date__year=prev_year,
            transaction_date__month=prev_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # Gastos operativos del mes
        operating_costs = Transfer.objects.filter(
            transfer_type='propios',
            transaction_date__year=current_year,
            transaction_date__month=current_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        operating_costs_prev = Transfer.objects.filter(
            transfer_type='propios',
            transaction_date__year=prev_year,
            transaction_date__month=prev_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Gastos administrativos del mes
        admin_costs = Transfer.objects.filter(
            transfer_type='admin',
            transaction_date__year=current_year,
            transaction_date__month=current_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # OS por estado
        os_abiertas = ServiceOrder.objects.filter(status='abierta').count()
        os_cerradas = ServiceOrder.objects.filter(status='cerrada').count()
        
        # OS del mes por estado
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

        # Top 5 clientes por facturación del mes
        top_clients = ServiceOrder.objects.filter(
            created_at__year=current_year,
            created_at__month=current_month
        ).values(
            'client__id', 
            'client__name'
        ).annotate(
            total_orders=Count('id'),
            total_amount=Sum('transfers__amount', filter=Q(transfers__transfer_type='terceros'))
        ).order_by('-total_amount')[:5]

        # Calcular tendencias (% cambio vs mes anterior)
        os_trend = 0
        if total_os_prev_month > 0:
            os_trend = ((total_os_month - total_os_prev_month) / total_os_prev_month) * 100
        
        billing_trend = 0
        if billed_amount_prev > 0:
            billing_trend = ((float(billed_amount) - float(billed_amount_prev)) / float(billed_amount_prev)) * 100
        
        costs_trend = 0
        if operating_costs_prev > 0:
            costs_trend = ((float(operating_costs) - float(operating_costs_prev)) / float(operating_costs_prev)) * 100

        # Transferencias pendientes de pago
        pending_transfers = Transfer.objects.filter(status='provisionada').count()
        pending_transfers_amount = Transfer.objects.filter(
            status='provisionada'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

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
                'os_cerradas': os_cerradas,
                'pending_transfers': pending_transfers,
                'pending_transfers_amount': float(pending_transfers_amount),
            },
            'top_clients': [
                {
                    'id': client['client__id'],
                    'name': client['client__name'],
                    'total_orders': client['total_orders'],
                    'total_amount': float(client['total_amount'] or 0)
                }
                for client in top_clients
            ]
        }
        return Response(data)