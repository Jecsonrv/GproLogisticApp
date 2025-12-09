from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum
from django.http import HttpResponse, FileResponse
from django_filters import rest_framework as filters
from .models import Transfer
from .serializers import TransferSerializer, TransferListSerializer
from apps.users.permissions import IsOperativo, IsOperativo2
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, PatternFill
from datetime import datetime
import os

class TransferFilter(filters.FilterSet):
    """Filtros avanzados para transfers"""
    date_from = filters.DateFilter(field_name='transaction_date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='transaction_date', lookup_expr='lte')
    payment_date_from = filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    payment_date_to = filters.DateFilter(field_name='payment_date', lookup_expr='lte')
    client = filters.NumberFilter(field_name='service_order__client__id')
    min_amount = filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    class Meta:
        model = Transfer
        fields = ['transfer_type', 'status', 'service_order', 'provider', 'payment_method']

class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.select_related(
        'service_order', 
        'service_order__client', 
        'provider', 
        'created_by'
    ).all()
    serializer_class = TransferSerializer
    permission_classes = [IsOperativo]
    filterset_class = TransferFilter
    search_fields = ['description', 'invoice_number', 'service_order__order_number']
    ordering_fields = ['transaction_date', 'amount', 'created_at']
    ordering = ['-transaction_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TransferListSerializer
        return TransferSerializer
    
    def perform_create(self, serializer):
        """Asignar usuario que crea la transferencia"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[IsOperativo2])
    def export_excel(self, request):
        """Exportar transfers a Excel"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Transferencias"
        
        # Estilos
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        
        # Encabezado
        ws['A1'] = "REPORTE DE TRANSFERENCIAS Y GASTOS"
        ws['A1'].font = Font(size=14, bold=True)
        ws.merge_cells('A1:J1')
        
        # Headers de tabla
        headers = ['Fecha', 'Tipo', 'Estado', 'Monto', 'Descripción', 'OS', 
                   'Proveedor', 'Método Pago', 'Factura', 'Fecha Pago']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = header_font
        
        # Datos
        row = 4
        for transfer in queryset:
            ws.cell(row=row, column=1, value=transfer.transaction_date.strftime('%Y-%m-%d'))
            ws.cell(row=row, column=2, value=transfer.get_transfer_type_display())
            ws.cell(row=row, column=3, value=transfer.get_status_display())
            ws.cell(row=row, column=4, value=float(transfer.amount))
            ws.cell(row=row, column=5, value=transfer.description)
            ws.cell(row=row, column=6, value=transfer.service_order.order_number if transfer.service_order else '')
            ws.cell(row=row, column=7, value=transfer.provider.name if transfer.provider else '')
            ws.cell(row=row, column=8, value=transfer.get_payment_method_display() if transfer.payment_method else '')
            ws.cell(row=row, column=9, value=transfer.invoice_number)
            ws.cell(row=row, column=10, value=transfer.payment_date.strftime('%Y-%m-%d') if transfer.payment_date else '')
            row += 1
        
        # Totales
        total_amount = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        ws.cell(row=row + 1, column=3, value='TOTAL:').font = Font(bold=True)
        ws.cell(row=row + 1, column=4, value=float(total_amount)).font = Font(bold=True)
        
        # Ajustar anchos
        for col in range(1, 11):
            ws.column_dimensions[get_column_letter(col)].width = 16
        
        # Respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=transferencias_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        wb.save(response)
        return response

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def download_pdf(self, request, pk=None):
        """Descargar el archivo PDF asociado a un traslado"""
        transfer = self.get_object()
        
        if not transfer.pdf_file:
            return Response(
                {'error': 'Este traslado no tiene archivo PDF adjunto'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            file_path = transfer.pdf_file.path
            if not os.path.exists(file_path):
                return Response(
                    {'error': 'El archivo no existe en el servidor'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            with open(file_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='application/pdf')
                filename = os.path.basename(file_path)
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
        except Exception as e:
            return Response(
                {'error': f'Error al acceder al archivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumen de transfers por tipo y estado"""
        queryset = self.filter_queryset(self.get_queryset())
        
        summary = {
            'total_transfers': queryset.count(),
            'total_amount': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'by_type': {},
            'by_status': {}
        }
        
        # Por tipo
        for type_choice in Transfer.TYPE_CHOICES:
            type_code = type_choice[0]
            type_data = queryset.filter(transfer_type=type_code)
            summary['by_type'][type_code] = {
                'label': type_choice[1],
                'count': type_data.count(),
                'amount': type_data.aggregate(Sum('amount'))['amount__sum'] or 0
            }
        
        # Por estado
        for status_choice in Transfer.STATUS_CHOICES:
            status_code = status_choice[0]
            status_data = queryset.filter(status=status_code)
            summary['by_status'][status_code] = {
                'label': status_choice[1],
                'count': status_data.count(),
                'amount': status_data.aggregate(Sum('amount'))['amount__sum'] or 0
            }
        
        return Response(summary)
    
    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def download_pdf(self, request, pk=None):
        """Descargar el PDF adjunto de una transferencia"""
        transfer = self.get_object()
        
        if not transfer.pdf_file:
            return Response(
                {'error': 'Esta transferencia no tiene archivo PDF adjunto'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            file_path = transfer.pdf_file.path
            
            if not os.path.exists(file_path):
                return Response(
                    {'error': 'El archivo PDF no se encuentra en el servidor'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            response = FileResponse(
                open(file_path, 'rb'),
                content_type='application/pdf'
            )
            
            filename = os.path.basename(file_path)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error al descargar el archivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )