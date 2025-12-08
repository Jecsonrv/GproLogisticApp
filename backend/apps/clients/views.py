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
        """Estado de cuenta detallado de un cliente"""
        client = self.get_object()
        
        # Calculate Credit Used: Sum of 'terceros' transfers for Open Service Orders
        pending_orders = ServiceOrder.objects.filter(client=client, status='abierta')
        
        credit_used = Transfer.objects.filter(
            service_order__in=pending_orders,
            transfer_type='terceros',
            status='provisionada'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        available_credit = client.credit_limit - credit_used
        
        # List of pending invoices (Open Orders with their total cost)
        pending_invoices_data = []
        for order in pending_orders:
            order_total = order.transfers.filter(
                transfer_type='terceros',
                status='provisionada'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            if order_total > 0:
                pending_invoices_data.append({
                    'order_number': order.order_number,
                    'date': order.created_at,
                    'eta': order.eta,
                    'amount': float(order_total),
                    'duca': order.duca,
                    'po': order.purchase_order
                })

        data = {
            'client_id': client.id,
            'client': client.name,
            'nit': client.nit,
            'payment_condition': client.get_payment_condition_display(),
            'credit_days': client.credit_days,
            'credit_limit': float(client.credit_limit),
            'credit_used': float(credit_used),
            'available_credit': float(available_credit),
            'total_pending_orders': pending_orders.count(),
            'pending_invoices': pending_invoices_data
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