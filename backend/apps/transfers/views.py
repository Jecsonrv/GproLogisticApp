from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum
from django.db import transaction
from django.http import HttpResponse, FileResponse
from django_filters import rest_framework as filters
from .models import Transfer, TransferPayment, BatchPayment, ProviderCreditNote, CreditNoteApplication
from .serializers import (
    TransferSerializer, TransferListSerializer, BatchPaymentSerializer, BatchPaymentDetailSerializer,
    ProviderCreditNoteListSerializer, ProviderCreditNoteDetailSerializer,
    ProviderCreditNoteCreateSerializer, ApplyCreditNoteSerializer, CreditNoteApplicationSerializer
)
from apps.users.permissions import IsAnyOperativo, IsOperativo2OrAdmin, TransferApprovalPermission, IsOperativo
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
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
        'bank',
        'created_by'
    ).all()
    serializer_class = TransferSerializer
    permission_classes = [IsAnyOperativo]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filterset_class = TransferFilter
    search_fields = ['description', 'invoice_number', 'service_order__order_number']
    ordering_fields = ['transaction_date', 'amount', 'created_at']
    ordering = ['-transaction_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TransferListSerializer
        return TransferSerializer
    
    def _validate_transfer_edit(self, transfer, request):
        """
        Validar si un gasto puede ser editado.

        RESTRICCIONES:
        1. Si está facturado con DTE emitido, solo campos limitados
        2. Si está pagado, no se puede editar el monto
        3. Solo admin/operativo2 puede aprobar
        """
        errors = []
        new_status = request.data.get('status')
        new_amount = request.data.get('amount')

        # 0. Validar orden cerrada
        if transfer.service_order and transfer.service_order.status == 'cerrada':
            return {
                'error': 'La orden de servicio está cerrada.',
                'detail': 'No se pueden modificar gastos de una orden cerrada.',
                'code': 'ORDER_CLOSED'
            }

        # 1. Validar factura con DTE emitido
        if transfer.invoice and transfer.invoice.is_dte_issued:
            # Solo permitir editar campos no financieros
            financial_fields = {'amount', 'customer_markup_percentage', 'iva_type', 'customer_iva_type'}
            requested_fields = set(request.data.keys())
            blocked_fields = requested_fields & financial_fields

            if blocked_fields:
                return {
                    'error': 'Este gasto está vinculado a una factura con DTE emitido.',
                    'detail': f'No se pueden modificar los campos financieros: {", ".join(blocked_fields)}',
                    'code': 'DTE_ISSUED'
                }

        # 2. Validar cambio de monto si tiene pagos
        if new_amount is not None:
            from decimal import Decimal
            new_amount_decimal = Decimal(str(new_amount))
            if transfer.paid_amount > 0 and new_amount_decimal < transfer.paid_amount:
                return {
                    'error': 'No se puede reducir el monto por debajo de lo ya pagado.',
                    'detail': f'Monto pagado: ${transfer.paid_amount}',
                    'code': 'AMOUNT_BELOW_PAID'
                }

        # 3. Validar permiso de aprobación
        if new_status == 'aprobado':
            if request.user.role not in ['admin', 'operativo2']:
                return {
                    'error': 'No tiene permisos para aprobar gastos.',
                    'detail': 'Contacte a un supervisor.',
                    'code': 'APPROVAL_FORBIDDEN'
                }

        # 4. Validar cambio de estado desde pagado
        if transfer.status == 'pagado' and new_status and new_status != 'pagado':
            if request.user.role != 'admin':
                return {
                    'error': 'No se puede cambiar el estado de un gasto pagado.',
                    'detail': 'Solo un administrador puede realizar esta acción.',
                    'code': 'PAID_STATUS_LOCKED'
                }

        return None  # Sin errores

    def update(self, request, *args, **kwargs):
        """
        Override update con validaciones de integridad.
        """
        transfer = self.get_object()

        validation_error = self._validate_transfer_edit(transfer, request)
        if validation_error:
            return Response(validation_error, status=status.HTTP_400_BAD_REQUEST)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update con validaciones de integridad.
        """
        transfer = self.get_object()

        validation_error = self._validate_transfer_edit(transfer, request)
        if validation_error:
            return Response(validation_error, status=status.HTTP_400_BAD_REQUEST)

        return super().partial_update(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Asignar usuario que crea la transferencia"""
        serializer.context['request'] = self.request
        transfer = serializer.save(created_by=self.request.user)
        transfer._current_user = self.request.user
        return transfer
    
    def perform_update(self, serializer):
        """Set current user for signal on update"""
        serializer.context['request'] = self.request
        transfer = serializer.save()
        transfer._current_user = self.request.user
        return transfer
    
    def destroy(self, request, *args, **kwargs):
        """
        Eliminar un gasto con validaciones de integridad.

        RESTRICCIONES:
        1. No se puede eliminar si está facturado al cliente (tiene invoice asociada)
        2. No se puede eliminar si tiene pagos registrados
        3. No se puede eliminar si el estado es 'pagado'
        4. Solo admin puede eliminar gastos aprobados
        """
        transfer = self.get_object()

        # 1. Validar si está facturado al cliente
        if transfer.invoice:
            invoice_number = transfer.invoice.invoice_number or f"#{transfer.invoice.id}"
            return Response(
                {
                    'error': f'No se puede eliminar este gasto porque ya fue facturado al cliente.',
                    'detail': f'Factura asociada: {invoice_number}',
                    'code': 'INVOICED'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validar si tiene pagos registrados
        payments_count = transfer.payments.filter(is_deleted=False).count()
        if payments_count > 0:
            return Response(
                {
                    'error': f'No se puede eliminar este gasto porque tiene {payments_count} pago(s) registrado(s).',
                    'detail': 'Primero debe eliminar o reversar los pagos asociados.',
                    'code': 'HAS_PAYMENTS'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Validar si está pagado
        if transfer.status == 'pagado':
            return Response(
                {
                    'error': 'No se puede eliminar un gasto que ya está marcado como pagado.',
                    'detail': 'Cambie el estado antes de eliminar o contacte a un administrador.',
                    'code': 'ALREADY_PAID'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Solo admin puede eliminar gastos aprobados
        if transfer.status == 'aprobado':
            if request.user.role != 'admin':
                return Response(
                    {
                        'error': 'Solo un administrador puede eliminar gastos aprobados.',
                        'detail': 'Contacte a un administrador para realizar esta acción.',
                        'code': 'APPROVED_REQUIRES_ADMIN'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        # Proceder con la eliminación
        transfer._current_user = request.user
        transfer.delete()

        return Response(
            {'message': 'Gasto eliminado correctamente.'},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAnyOperativo])
    def export_excel(self, request):
        """Exportar transfers a Excel con formato profesional"""
        queryset = self.filter_queryset(self.get_queryset())

        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Transferencias"

        # Estilos profesionales - Diseño GPRO
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=10)
        title_font = Font(size=16, bold=True, color="1F4E79")
        subtitle_font = Font(size=12, bold=True, color="2F5496")
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        currency_format = '#,##0.00'

        # === ENCABEZADO ===
        ws['A1'] = "TRANSFERENCIAS Y GASTOS"
        ws['A1'].font = title_font
        ws.merge_cells('A1:J1')

        ws['A2'] = "GPRO LOGISTIC - Agencia Aduanal"
        ws['A2'].font = Font(size=11, color="666666")
        ws.merge_cells('A2:J2')

        ws['A3'] = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = Font(size=9, italic=True, color="999999")

        # === TABLA DE DATOS ===
        start_row = 5
        ws.cell(row=start_row, column=1, value="DETALLE DE PAGOS").font = subtitle_font
        ws.merge_cells(f'A{start_row}:J{start_row}')

        # Headers de tabla
        headers = ['Fecha', 'Tipo', 'Estado', 'Monto', 'Descripción', 'OS',
                   'Proveedor', 'Método Pago', 'Factura', 'Fecha Pago']
        header_row = start_row + 1

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=header_row, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        # Datos
        data_row = header_row + 1
        total_amount = 0

        for transfer in queryset:
            ws.cell(row=data_row, column=1, value=transfer.transaction_date.strftime('%d/%m/%Y')).border = thin_border
            ws.cell(row=data_row, column=2, value=transfer.get_transfer_type_display()).border = thin_border
            ws.cell(row=data_row, column=3, value=transfer.get_status_display()).border = thin_border

            # Columna de monto con formato
            amount_cell = ws.cell(row=data_row, column=4, value=float(transfer.amount))
            amount_cell.number_format = currency_format
            amount_cell.border = thin_border
            amount_cell.alignment = Alignment(horizontal='right')

            ws.cell(row=data_row, column=5, value=transfer.description or '').border = thin_border
            ws.cell(row=data_row, column=6, value=transfer.service_order.order_number if transfer.service_order else '').border = thin_border
            ws.cell(row=data_row, column=7, value=transfer.provider.name if transfer.provider else transfer.beneficiary_name or '').border = thin_border
            ws.cell(row=data_row, column=8, value=transfer.get_payment_method_display() if transfer.payment_method else '').border = thin_border
            ws.cell(row=data_row, column=9, value=transfer.invoice_number or '').border = thin_border
            ws.cell(row=data_row, column=10, value=transfer.payment_date.strftime('%d/%m/%Y') if transfer.payment_date else '').border = thin_border

            total_amount += float(transfer.amount)
            data_row += 1

        # Fila de totales
        ws.cell(row=data_row, column=1, value="TOTALES").font = Font(bold=True)
        ws.cell(row=data_row, column=1).border = thin_border
        for col in range(2, 4):
            ws.cell(row=data_row, column=col).border = thin_border

        total_cell = ws.cell(row=data_row, column=4, value=total_amount)
        total_cell.number_format = currency_format
        total_cell.font = Font(bold=True)
        total_cell.border = thin_border
        total_cell.alignment = Alignment(horizontal='right')

        for col in range(5, 11):
            ws.cell(row=data_row, column=col).border = thin_border

        # Ajustar anchos de columna
        column_widths = [12, 14, 12, 14, 30, 15, 25, 16, 15, 12]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = width

        # Respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=GPRO_Pagos_Proveedores_{datetime.now().strftime("%Y%m%d")}.xlsx'

        wb.save(response)
        return response

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
    def download_invoice(self, request, pk=None):
        """Descargar el comprobante adjunto de una transferencia"""
        transfer = self.get_object()
        
        if not transfer.invoice_file:
            return Response(
                {'error': 'Esta transferencia no tiene comprobante adjunto'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            file_path = transfer.invoice_file.path
            
            if not os.path.exists(file_path):
                return Response(
                    {'error': 'El archivo no se encuentra en el servidor'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Detectar tipo de contenido basado en la extensión
            filename = os.path.basename(file_path)
            ext = filename.lower().split('.')[-1]
            
            content_types = {
                'pdf': 'application/pdf',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png'
            }
            content_type = content_types.get(ext, 'application/octet-stream')
            
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type
            )
            
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error al descargar el archivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsOperativo])
    def register_payment(self, request, pk=None):
        """Registrar un pago parcial o total a una transferencia (gasto a proveedor)"""
        from .models import TransferPayment
        from decimal import Decimal
        
        transfer = self.get_object()
        
        # Validar que la transferencia no esté completamente pagada
        if transfer.status == 'pagado' and transfer.balance <= 0:
            return Response(
                {'error': 'Esta transferencia ya está completamente pagada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar datos requeridos
        amount = request.data.get('amount')
        if not amount:
            return Response(
                {'error': 'El monto es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response(
                    {'error': 'El monto debe ser mayor a cero'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que el monto no exceda el saldo pendiente
            if amount > transfer.balance:
                return Response(
                    {'error': f'El monto excede el saldo pendiente de ${transfer.balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Monto inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que la orden de servicio no esté cerrada
        if transfer.service_order and transfer.service_order.status == 'cerrada':
            return Response(
                {'error': 'No se pueden registrar pagos en una orden de servicio cerrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que la orden de servicio no esté cerrada
        if transfer.service_order and transfer.service_order.status == 'cerrada':
            return Response(
                {'error': 'No se pueden registrar pagos en una orden de servicio cerrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Actualizar método de pago y banco en el transfer si es el primer pago
        if transfer.paid_amount == 0:
            payment_method = request.data.get('payment_method', 'transferencia')
            transfer.payment_method = payment_method
            
            # Solo actualizar banco si el método requiere banco
            if payment_method in ['transferencia', 'cheque', 'tarjeta']:
                bank_id = request.data.get('bank')
                if bank_id:
                    transfer.bank_id = bank_id
            
            transfer.save(update_fields=['payment_method', 'bank'])
        
        # Crear el pago
        payment = TransferPayment(
            transfer=transfer,
            amount=amount,
            payment_date=request.data.get('payment_date'),
            payment_method=request.data.get('payment_method', 'transferencia'),
            reference_number=request.data.get('reference', ''),
            notes=request.data.get('notes', ''),
            created_by=request.user
        )
        
        # Manejar archivo de comprobante si existe
        if 'proof_file' in request.FILES:
            payment.proof_file = request.FILES['proof_file']
        
        payment.save()
        
        # Refrescar el transfer para obtener los valores actualizados
        transfer.refresh_from_db()
        
        return Response({
            'message': 'Pago registrado exitosamente',
            'payment': {
                'id': payment.id,
                'amount': str(payment.amount),
                'payment_date': payment.payment_date,
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number
            },
            'transfer': {
                'id': transfer.id,
                'paid_amount': str(transfer.paid_amount),
                'balance': str(transfer.balance),
                'status': transfer.status,
                'status_display': transfer.get_status_display()
            }
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsOperativo])
    def register_credit_note(self, request, pk=None):
        """Registrar una nota de crédito del proveedor"""
        from .models import TransferPayment
        from decimal import Decimal
        
        transfer = self.get_object()
        
        # Validar que la transferencia no esté completamente pagada
        if transfer.status == 'pagado' and transfer.balance <= 0:
            return Response(
                {'error': 'Esta transferencia ya está completamente pagada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que la orden de servicio no esté cerrada
        if transfer.service_order and transfer.service_order.status == 'cerrada':
            return Response(
                {'error': 'No se pueden registrar notas de crédito en una orden de servicio cerrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar datos requeridos
        amount = request.data.get('amount')
        note_number = request.data.get('note_number')
        reason = request.data.get('reason', '')
        
        if not amount or not note_number:
            return Response(
                {'error': 'El monto y número de nota de crédito son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response(
                    {'error': 'El monto debe ser mayor a cero'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que el monto no exceda el saldo pendiente
            if amount > transfer.balance:
                return Response(
                    {'error': f'El monto excede el saldo pendiente de ${transfer.balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Monto inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear el pago como nota de crédito
        payment = TransferPayment(
            transfer=transfer,
            amount=amount,
            payment_date=request.data.get('issue_date'),
            payment_method='nota_credito',
            reference_number=note_number,
            notes=f"Nota de Crédito: {reason}" if reason else "Nota de Crédito",
            created_by=request.user
        )
        
        # Manejar archivo PDF de la nota de crédito si existe
        if 'pdf_file' in request.FILES:
            payment.proof_file = request.FILES['pdf_file']
        
        payment.save()
        
        # Refrescar el transfer
        transfer.refresh_from_db()
        
        return Response({
            'message': 'Nota de crédito registrada exitosamente',
            'credit_note': {
                'id': payment.id,
                'amount': str(payment.amount),
                'note_number': payment.reference_number,
                'issue_date': payment.payment_date,
                'reason': reason
            },
            'transfer': {
                'id': transfer.id,
                'paid_amount': str(transfer.paid_amount),
                'balance': str(transfer.balance),
                'status': transfer.status,
                'status_display': transfer.get_status_display()
            }
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def detail_with_payments(self, request, pk=None):
        """Obtener detalle completo de una transferencia incluyendo historial de pagos"""
        from .models import TransferPayment
        from decimal import Decimal
        
        transfer = self.get_object()
        
        # Serializar transferencia
        transfer_data = TransferSerializer(transfer, context={'request': request}).data
        
        # Obtener historial de pagos
        payments = TransferPayment.objects.filter(
            transfer=transfer,
            is_deleted=False
        ).order_by('-payment_date')
        
        payments_data = [{
            'id': p.id,
            'amount': str(p.amount),
            'payment_date': p.payment_date,
            'payment_method': p.payment_method,
            'payment_method_display': p.get_payment_method_display(),
            'reference_number': p.reference_number,
            'notes': p.notes,
            'proof_file': p.proof_file.url if p.proof_file else None,
            'created_by': p.created_by.username if p.created_by else None,
            'created_at': p.created_at
        } for p in payments]
        
        # Identificar notas de crédito (pagos con método nota_credito)
        credit_notes = [p for p in payments_data if p['payment_method'] == 'nota_credito']
        
        # Enriquecer notas de crédito con el archivo PDF original si no lo tienen en el pago
        for cn in credit_notes:
            if not cn['proof_file']:
                try:
                    # Buscar la NC original usando el número de referencia (que es el número de nota)
                    provider_nc = ProviderCreditNote.objects.filter(
                        provider=transfer.provider,
                        note_number=cn['reference_number'],
                        is_deleted=False
                    ).first()
                    
                    if provider_nc and provider_nc.pdf_file:
                        cn['proof_file'] = provider_nc.pdf_file.url
                except:
                    pass

        regular_payments = [p for p in payments_data if p['payment_method'] != 'nota_credito']
        
        transfer_data['payments'] = regular_payments
        transfer_data['credit_notes'] = credit_notes
        transfer_data['total_payments_count'] = len(regular_payments)
        transfer_data['total_credit_notes_count'] = len(credit_notes)
        transfer_data['credited_amount'] = str(sum(Decimal(cn['amount']) for cn in credit_notes))

        return Response(transfer_data)


class BatchPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar pagos agrupados a proveedores.

    Endpoints principales:
    - POST /batch-payments/create_batch_payment/ - Crear pago múltiple con distribución FIFO
    - GET /batch-payments/ - Listar todos los pagos agrupados
    - GET /batch-payments/{id}/ - Detalle de un pago agrupado
    - DELETE /batch-payments/{id}/ - Eliminar pago agrupado (revierte pagos individuales)
    """
    queryset = BatchPayment.objects.select_related(
        'provider', 'bank', 'created_by'
    ).all()
    serializer_class = BatchPaymentSerializer
    permission_classes = [IsOperativo]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BatchPaymentDetailSerializer
        return BatchPaymentSerializer

    @action(detail=False, methods=['post'], permission_classes=[IsOperativo])
    def create_batch_payment(self, request):
        """
        Crea un pago agrupado que distribuye el monto entre múltiples facturas usando FIFO.

        Body esperado:
        {
            "transfer_ids": [1, 2, 3],  // IDs de los Transfers a pagar
            "total_amount": "5000.00",
            "payment_method": "transferencia",
            "payment_date": "2025-12-21",
            "bank": 1,  // opcional
            "reference_number": "TRANS-12345",
            "notes": "Pago quincenal proveedores",
            "proof_file": <archivo>  // opcional
        }
        """
        from django.db import transaction
        from decimal import Decimal
        import json

        # Validar datos requeridos
        transfer_ids_str = request.data.get('transfer_ids', '[]')
        try:
            transfer_ids = json.loads(transfer_ids_str) if isinstance(transfer_ids_str, str) else transfer_ids_str
        except:
            transfer_ids = []

        total_amount_str = request.data.get('total_amount')
        payment_method = request.data.get('payment_method')
        payment_date = request.data.get('payment_date')


        if not transfer_ids or len(transfer_ids) == 0:
            return Response(
                {'error': 'Debe seleccionar al menos una factura'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not total_amount_str or not payment_method or not payment_date:
            return Response(
                {'error': 'Monto, método de pago y fecha son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            total_amount = Decimal(str(total_amount_str))
            if total_amount <= 0:
                return Response(
                    {'error': 'El monto debe ser mayor a cero'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Monto inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener Transfers y validar
        transfers = Transfer.objects.filter(
            id__in=transfer_ids,
            is_deleted=False
        ).select_related('provider', 'service_order').order_by('transaction_date', 'id')  # FIFO

        if transfers.count() != len(transfer_ids):
            return Response(
                {'error': 'Algunas facturas no existen o fueron eliminadas'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que todas sean del mismo proveedor
        providers_set = set(transfers.values_list('provider', flat=True))

        # Validar consistencia estricta: No permitir mezcla de proveedores ni nulls
        if len(providers_set) > 1:
            return Response(
                {'error': 'No se pueden mezclar facturas de diferentes proveedores (o sin proveedor) en un mismo pago'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el único proveedor
        provider_id = list(providers_set)[0]

        if provider_id is None:
            return Response(
                {'error': 'No se pueden realizar pagos agrupados a facturas sin proveedor asignado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que las facturas no estén ya pagadas
        already_paid = transfers.filter(status='pagado')
        if already_paid.exists():
            return Response(
                {'error': f'Algunas facturas ya están pagadas. Facturas: {", ".join([str(t.id) for t in already_paid])}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que haya saldo suficiente
        total_balance = sum(t.balance for t in transfers)
        if total_amount > total_balance:
            return Response(
                {'error': f'El monto a pagar (${total_amount}) excede el saldo total pendiente (${total_balance})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear el pago agrupado con transacción atómica
        try:
            with transaction.atomic():
                # Crear BatchPayment
                batch_payment = BatchPayment(
                    provider_id=provider_id,
                    total_amount=total_amount,
                    payment_method=payment_method,
                    payment_date=payment_date,
                    bank_id=request.data.get('bank'),
                    reference_number=request.data.get('reference_number', ''),
                    notes=request.data.get('notes', ''),
                    created_by=request.user
                )

                # Manejar archivo de comprobante
                if 'proof_file' in request.FILES:
                    batch_payment.proof_file = request.FILES['proof_file']

                batch_payment.save()

                # Distribuir el monto usando FIFO
                remaining_amount = total_amount
                payments_created = []
                service_orders_affected = set()

                for transfer in transfers:
                    if remaining_amount <= 0:
                        break

                    # Determinar cuánto pagar a esta factura
                    amount_to_pay = min(remaining_amount, transfer.balance)

                    if amount_to_pay > 0:
                        # Crear TransferPayment
                        transfer_payment = TransferPayment(
                            transfer=transfer,
                            batch_payment=batch_payment,
                            amount=amount_to_pay,
                            payment_date=payment_date,
                            payment_method=payment_method,
                            reference_number=request.data.get('reference_number', ''),
                            notes=f"Pago agrupado {batch_payment.batch_number}",
                            created_by=request.user
                        )

                        # Si hay comprobante, asignarlo también al pago individual
                        if batch_payment.proof_file:
                            transfer_payment.proof_file = batch_payment.proof_file

                        transfer_payment.save()
                        payments_created.append(transfer_payment)

                        # Registrar OS afectada
                        if transfer.service_order:
                            service_orders_affected.add(transfer.service_order)

                        # Decrementar monto restante
                        remaining_amount -= amount_to_pay

                # Sincronizar comprobante con OrderDocuments de todas las OS afectadas
                if batch_payment.proof_file and service_orders_affected:
                    from apps.orders.models import OrderDocument

                    for service_order in service_orders_affected:
                        # Crear un OrderDocument por cada OS con el comprobante del lote
                        OrderDocument.objects.create(
                            order=service_order,
                            document_type='factura_costo',
                            file=batch_payment.proof_file,
                            description=f"Comprobante Pago Lote {batch_payment.batch_number} - {batch_payment.provider.name}",
                            uploaded_by=request.user
                        )

                # Serializar respuesta
                serializer = BatchPaymentDetailSerializer(batch_payment)

                return Response({
                    'message': f'Pago agrupado creado exitosamente. {len(payments_created)} facturas pagadas.',
                    'batch_payment': serializer.data,
                    'payments_created': len(payments_created),
                    'service_orders_affected': len(service_orders_affected),
                    'remaining_amount': str(remaining_amount)
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Error al crear el pago agrupado: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Elimina un pago agrupado y revierte todos los pagos individuales asociados.
        Usa soft delete para mantener historial.
        """
        batch_payment = self.get_object()

        try:
            with transaction.atomic():
                # Los TransferPayment se eliminarán en cascada por el on_delete=CASCADE
                # Esto disparará el signal post_delete que recalculará los paid_amount de los Transfers
                batch_payment.delete()  # Soft delete

                return Response(
                    {'message': 'Pago agrupado eliminado correctamente. Los pagos individuales fueron revertidos.'},
                    status=status.HTTP_204_NO_CONTENT
                )
        except Exception as e:
            return Response(
                {'error': f'Error al eliminar el pago agrupado: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProviderCreditNoteFilter(filters.FilterSet):
    """Filtros para notas de crédito de proveedores"""
    issue_date_from = filters.DateFilter(field_name='issue_date', lookup_expr='gte')
    issue_date_to = filters.DateFilter(field_name='issue_date', lookup_expr='lte')
    min_amount = filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='amount', lookup_expr='lte')
    has_available = filters.BooleanFilter(method='filter_has_available')

    class Meta:
        model = ProviderCreditNote
        fields = ['provider', 'status', 'reason']

    def filter_has_available(self, queryset, name, value):
        if value:
            return queryset.filter(available_amount__gt=0)
        return queryset


class ProviderCreditNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Notas de Crédito de Proveedores.

    Sistema ERP profesional para manejar notas de crédito que anulan
    parcial o totalmente facturas de proveedores.

    ENDPOINTS:
    - GET    /provider-credit-notes/              - Listar NC
    - POST   /provider-credit-notes/              - Crear NC
    - GET    /provider-credit-notes/{id}/         - Detalle de NC
    - PUT    /provider-credit-notes/{id}/         - Actualizar NC
    - DELETE /provider-credit-notes/{id}/         - Eliminar NC (solo si no tiene aplicaciones)
    - POST   /provider-credit-notes/{id}/apply/   - Aplicar NC a facturas
    - POST   /provider-credit-notes/{id}/void/    - Anular NC
    - GET    /provider-credit-notes/summary/      - Resumen estadístico
    - GET    /provider-credit-notes/by-provider/  - NC agrupadas por proveedor
    """
    queryset = ProviderCreditNote.objects.select_related(
        'provider', 'created_by', 'voided_by'
    ).all()
    permission_classes = [IsOperativo]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filterset_class = ProviderCreditNoteFilter
    search_fields = ['note_number', 'provider__name', 'reason_detail']
    ordering_fields = ['issue_date', 'amount', 'available_amount', 'created_at']
    ordering = ['-issue_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProviderCreditNoteListSerializer
        elif self.action == 'create':
            return ProviderCreditNoteCreateSerializer
        elif self.action == 'apply':
            return ApplyCreditNoteSerializer
        return ProviderCreditNoteDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar una NC solo si no tiene aplicaciones.
        """
        credit_note = self.get_object()

        # Validar que no tenga aplicaciones
        if credit_note.applications.filter(is_deleted=False).exists():
            return Response(
                {
                    'error': 'No se puede eliminar esta nota de crédito porque ya tiene aplicaciones.',
                    'detail': 'Primero debe anular la NC para revertir las aplicaciones.',
                    'code': 'HAS_APPLICATIONS'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que no esté anulada
        if credit_note.status == 'anulada':
            return Response(
                {
                    'error': 'No se puede eliminar una nota de crédito anulada.',
                    'detail': 'Las NC anuladas se mantienen para auditoría.',
                    'code': 'ALREADY_VOIDED'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        credit_note.delete()
        return Response(
            {'message': 'Nota de crédito eliminada correctamente.'},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=True, methods=['post'], permission_classes=[IsOperativo])
    def apply(self, request, pk=None):
        """
        Aplicar una Nota de Crédito a una o más facturas del proveedor.

        Body esperado:
        {
            "applications": [
                {"transfer_id": 1, "amount": 500.00, "notes": "Aplicación parcial"},
                {"transfer_id": 2, "amount": 300.00, "notes": ""}
            ]
        }

        VALIDACIONES:
        - La NC debe tener saldo disponible
        - Los Transfers deben ser del mismo proveedor
        - El monto total no puede exceder el saldo disponible de la NC
        - Cada monto no puede exceder el saldo del Transfer
        """
        from decimal import Decimal

        credit_note = self.get_object()

        # Validar estado de la NC
        if not credit_note.can_apply():
            return Response(
                {
                    'error': 'Esta nota de crédito no puede aplicarse.',
                    'detail': f'Estado: {credit_note.get_status_display()}. Saldo disponible: ${credit_note.available_amount}',
                    'code': 'CANNOT_APPLY'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar datos de entrada
        serializer = ApplyCreditNoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        applications_data = serializer.validated_data['applications']

        # Calcular monto total a aplicar
        total_to_apply = Decimal('0.00')
        for app_data in applications_data:
            total_to_apply += Decimal(str(app_data['amount']))

        if total_to_apply > credit_note.available_amount:
            return Response(
                {
                    'error': 'El monto total excede el saldo disponible de la NC.',
                    'detail': f'Intentando aplicar ${total_to_apply}, pero solo hay ${credit_note.available_amount} disponibles.',
                    'code': 'EXCEEDS_AVAILABLE'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar cada Transfer y recopilar errores
        transfers_to_apply = []
        errors = []

        for i, app_data in enumerate(applications_data):
            transfer_id = app_data['transfer_id']
            amount = Decimal(str(app_data['amount']))

            try:
                transfer = Transfer.objects.get(id=transfer_id, is_deleted=False)
            except Transfer.DoesNotExist:
                errors.append(f"Factura #{transfer_id} no encontrada")
                continue

            # Validar mismo proveedor
            if transfer.provider_id != credit_note.provider_id:
                errors.append(f"Factura #{transfer_id} no pertenece al proveedor {credit_note.provider.name}")
                continue

            # Validar saldo disponible en el Transfer
            if amount > transfer.balance:
                errors.append(f"Factura #{transfer_id}: monto ${amount} excede saldo pendiente ${transfer.balance}")
                continue

            transfers_to_apply.append({
                'transfer': transfer,
                'amount': amount,
                'notes': app_data.get('notes', '')
            })

        if errors:
            return Response(
                {
                    'error': 'Errores en las aplicaciones.',
                    'detail': errors,
                    'code': 'VALIDATION_ERRORS'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aplicar todas las NC en una transacción
        try:
            with transaction.atomic():
                applications_created = []

                for app_data in transfers_to_apply:
                    application = CreditNoteApplication(
                        credit_note=credit_note,
                        transfer=app_data['transfer'],
                        amount=app_data['amount'],
                        applied_by=request.user,
                        notes=app_data['notes']
                    )
                    application.save()
                    applications_created.append({
                        'id': application.id,
                        'transfer_id': app_data['transfer'].id,
                        'transfer_invoice': app_data['transfer'].invoice_number,
                        'amount': str(app_data['amount'])
                    })

                # Refrescar la NC para obtener valores actualizados
                credit_note.refresh_from_db()

                return Response({
                    'message': f'Nota de crédito aplicada exitosamente a {len(applications_created)} factura(s).',
                    'credit_note': {
                        'id': credit_note.id,
                        'note_number': credit_note.note_number,
                        'status': credit_note.status,
                        'status_display': credit_note.get_status_display(),
                        'applied_amount': str(credit_note.applied_amount),
                        'available_amount': str(credit_note.available_amount)
                    },
                    'applications': applications_created
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    'error': 'Error al aplicar la nota de crédito.',
                    'detail': str(e),
                    'code': 'APPLICATION_ERROR'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsOperativo2OrAdmin])
    def void(self, request, pk=None):
        """
        Anular una Nota de Crédito y revertir todas sus aplicaciones.

        Body esperado:
        {
            "reason": "Motivo de la anulación"
        }

        EFECTOS:
        - Revierte todos los TransferPayments creados por la NC
        - Restaura los saldos de los Transfers afectados
        - Marca la NC como anulada con registro de auditoría

        RESTRICCIONES:
        - Solo usuarios con rol operativo2 o admin pueden anular
        - No se puede anular una NC ya anulada
        """
        credit_note = self.get_object()

        # Validar que no esté ya anulada
        if credit_note.status == 'anulada':
            return Response(
                {
                    'error': 'Esta nota de crédito ya está anulada.',
                    'detail': f'Anulada el {credit_note.voided_at} por {credit_note.voided_by.username if credit_note.voided_by else "N/A"}',
                    'code': 'ALREADY_VOIDED'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener motivo
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {
                    'error': 'Debe proporcionar un motivo de anulación.',
                    'code': 'REASON_REQUIRED'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Obtener Transfers afectados antes de anular
                affected_transfers = list(credit_note.get_affected_transfers().values_list('id', flat=True))

                # Anular la NC
                credit_note.void(user=request.user, reason=reason)

                return Response({
                    'message': 'Nota de crédito anulada correctamente. Las aplicaciones han sido revertidas.',
                    'credit_note': {
                        'id': credit_note.id,
                        'note_number': credit_note.note_number,
                        'status': credit_note.status,
                        'status_display': credit_note.get_status_display(),
                        'voided_at': credit_note.voided_at,
                        'void_reason': credit_note.void_reason
                    },
                    'affected_transfers': affected_transfers
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    'error': 'Error al anular la nota de crédito.',
                    'detail': str(e),
                    'code': 'VOID_ERROR'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def summary(self, request):
        """
        Resumen estadístico de notas de crédito.

        Retorna:
        - Total de NC registradas
        - Monto total en NC
        - Monto total aplicado
        - Saldo disponible total
        - Desglose por estado
        - Desglose por proveedor (top 10)
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Totales generales
        totals = queryset.aggregate(
            total_amount=Sum('amount'),
            total_applied=Sum('applied_amount'),
            total_available=Sum('available_amount')
        )

        # Por estado
        by_status = {}
        for status_choice in ProviderCreditNote.STATUS_CHOICES:
            status_code = status_choice[0]
            status_data = queryset.filter(status=status_code)
            by_status[status_code] = {
                'label': status_choice[1],
                'count': status_data.count(),
                'amount': status_data.aggregate(total=Sum('amount'))['total'] or 0
            }

        # Por proveedor (top 10)
        from django.db.models import Count
        by_provider = queryset.values(
            'provider', 'provider__name'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            total_available=Sum('available_amount')
        ).order_by('-total_amount')[:10]

        return Response({
            'total_count': queryset.count(),
            'total_amount': totals['total_amount'] or 0,
            'total_applied': totals['total_applied'] or 0,
            'total_available': totals['total_available'] or 0,
            'by_status': by_status,
            'by_provider': list(by_provider)
        })

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def by_provider(self, request):
        """
        Lista NC agrupadas por proveedor.

        Query params opcionales:
        - provider_id: Filtrar por proveedor específico
        - only_available: Solo NC con saldo disponible
        """
        provider_id = request.query_params.get('provider_id')
        only_available = request.query_params.get('only_available', 'false').lower() == 'true'

        queryset = self.filter_queryset(self.get_queryset())

        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)

        if only_available:
            queryset = queryset.filter(available_amount__gt=0, status__in=['pendiente', 'parcial'])

        # Agrupar por proveedor
        from django.db.models import Count
        providers_data = queryset.values(
            'provider', 'provider__name'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            total_available=Sum('available_amount')
        ).order_by('provider__name')

        # Obtener NC detalladas por proveedor
        result = []
        for provider_data in providers_data:
            provider_notes = queryset.filter(provider_id=provider_data['provider'])
            notes_list = ProviderCreditNoteListSerializer(provider_notes, many=True).data

            result.append({
                'provider_id': provider_data['provider'],
                'provider_name': provider_data['provider__name'],
                'count': provider_data['count'],
                'total_amount': provider_data['total_amount'],
                'total_available': provider_data['total_available'],
                'credit_notes': notes_list
            })

        return Response(result)

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def pending_for_provider(self, request):
        """
        Obtener facturas pendientes de un proveedor para aplicar NC.

        Query params requeridos:
        - provider_id: ID del proveedor

        Retorna facturas (Transfers) del proveedor con saldo pendiente.
        """
        provider_id = request.query_params.get('provider_id')

        if not provider_id:
            return Response(
                {'error': 'Se requiere el parámetro provider_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transfers = Transfer.objects.filter(
            provider_id=provider_id,
            balance__gt=0,
            is_deleted=False
        ).exclude(
            status='pagado'
        ).select_related('service_order').order_by('-transaction_date')

        data = [{
            'id': t.id,
            'description': t.description,
            'invoice_number': t.invoice_number,
            'amount': str(t.amount),
            'balance': str(t.balance),
            'paid_amount': str(t.paid_amount),
            'service_order_number': t.service_order.order_number if t.service_order else None,
            'transaction_date': t.transaction_date,
            'status': t.status,
            'status_display': t.get_status_display()
        } for t in transfers]

        return Response({
            'provider_id': provider_id,
            'pending_transfers': data,
            'total_count': len(data),
            'total_balance': sum(t.balance for t in transfers)
        })