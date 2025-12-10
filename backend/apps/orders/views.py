from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from .models import ServiceOrder, OrderDocument, OrderCharge
from .serializers import ServiceOrderSerializer, OrderDocumentSerializer
from .serializers_new import ServiceOrderDetailSerializer
from apps.users.permissions import IsOperativo, IsOperativo2
import openpyxl
from openpyxl.utils import get_column_letter
import zipfile
import io
import os

class ServiceOrderViewSet(viewsets.ModelViewSet):
    queryset = ServiceOrder.objects.all()
    serializer_class = ServiceOrderSerializer
    permission_classes = [IsOperativo]
    filterset_fields = ['status', 'client', 'provider']
    search_fields = ['order_number', 'duca', 'purchase_order']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceOrderDetailSerializer
        return ServiceOrderSerializer

    @action(detail=True, methods=['get'])
    def charges(self, request, pk=None):
        """Get all charges for a specific order"""
        order = self.get_object()
        charges = order.charges.all().select_related('service')

        charges_data = []
        for charge in charges:
            charges_data.append({
                'id': charge.id,
                'service': charge.service.id,
                'service_code': charge.service.code,
                'service_name': charge.service.name,
                'quantity': str(charge.quantity),
                'unit_price': str(charge.unit_price),
                'discount': str(charge.discount),
                'applies_iva': charge.service.applies_iva,
                'subtotal': str(charge.subtotal),
                'iva_amount': str(charge.iva_amount),
                'total': str(charge.total),
                'notes': charge.description,
            })

        return Response(charges_data)

    @action(detail=True, methods=['post'])
    def add_charge(self, request, pk=None):
        """Add a charge to a specific order"""
        order = self.get_object()

        if order.status != 'abierta':
            return Response(
                {'error': 'No se pueden agregar cargos a una orden cerrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.catalogs.models import Service
            service = Service.objects.get(id=request.data.get('service'))

            # The frontend sends 'notes' but model has 'description'.
            # 'discount' and 'created_by' are not in the OrderCharge model, so we ignore them for now.
            charge = OrderCharge.objects.create(
                service_order=order,
                service=service,
                quantity=request.data.get('quantity', 1),
                unit_price=request.data.get('unit_price', service.default_price),
                description=request.data.get('notes', '')
            )

            return Response({
                'id': charge.id,
                'message': 'Cargo agregado exitosamente'
            }, status=status.HTTP_201_CREATED)

        except Service.DoesNotExist:
            return Response(
                {'error': 'Servicio no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        # Create a workbook and add a worksheet.
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Ordenes de Servicio"

        # Define headers
        headers = ['Número Orden', 'Cliente', 'Subcliente', 'Tipo Embarque', 'Proveedor', 'PO', 'ETA', 'DUCA', 'Estado', 'Fecha Creación']
        for col_num, header in enumerate(headers, 1):
            col_letter = get_column_letter(col_num)
            ws[f'{col_letter}1'] = header
            ws[f'{col_letter}1'].font = openpyxl.styles.Font(bold=True)

        # Add data
        queryset = self.filter_queryset(self.get_queryset())
        for row_num, order in enumerate(queryset, 2):
            ws[f'A{row_num}'] = order.order_number
            ws[f'B{row_num}'] = order.client.name if order.client else ''
            ws[f'C{row_num}'] = order.sub_client.name if order.sub_client else ''
            ws[f'D{row_num}'] = order.shipment_type.name if order.shipment_type else ''
            ws[f'E{row_num}'] = order.provider.name if order.provider else ''
            ws[f'F{row_num}'] = order.purchase_order
            ws[f'G{row_num}'] = order.eta
            ws[f'H{row_num}'] = order.duca
            ws[f'I{row_num}'] = order.get_status_display()
            ws[f'J{row_num}'] = order.created_at.strftime('%Y-%m-%d')

        # Set response headers
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename=ordenes_servicio.xlsx'
        
        wb.save(response)
        return response

    @action(detail=False, methods=['post'], permission_classes=[IsOperativo2])
    def download_zip(self, request):
        order_ids = request.data.get('order_ids', [])
        if not order_ids:
            return Response({'error': 'No order IDs provided'}, status=400)

        orders = ServiceOrder.objects.filter(id__in=order_ids)
        
        # Create a zip file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for order in orders:
                documents = order.documents.all()
                for doc in documents:
                    if doc.file:
                        try:
                            file_path = doc.file.path
                            if os.path.exists(file_path):
                                # Structure: OrderNumber/Filename
                                archive_name = f"{order.order_number}/{os.path.basename(file_path)}"
                                zip_file.write(file_path, archive_name)
                        except Exception as e:
                            print(f"Error adding file {doc.file} to zip: {e}")

        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename=documentos_ordenes.zip'
        return response

class OrderDocumentViewSet(viewsets.ModelViewSet):
    queryset = OrderDocument.objects.all()
    serializer_class = OrderDocumentSerializer
    permission_classes = [IsOperativo]


class OrderChargeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing order charges"""
    queryset = OrderCharge.objects.all()
    permission_classes = [IsOperativo]

    def get_queryset(self):
        return self.queryset.select_related('order', 'service', 'created_by')

    def destroy(self, request, *args, **kwargs):
        """Delete a charge only if the order is still open"""
        charge = self.get_object()

        if charge.order.status != 'abierta':
            return Response(
                {'error': 'No se pueden eliminar cargos de una orden cerrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        charge.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)