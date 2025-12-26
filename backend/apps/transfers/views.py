from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum
from django.http import HttpResponse, FileResponse
from django_filters import rest_framework as filters
from .models import Transfer, TransferPayment, BatchPayment
from .serializers import TransferSerializer, TransferListSerializer, BatchPaymentSerializer, BatchPaymentDetailSerializer
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
    
    def update(self, request, *args, **kwargs):
        """
        Override update para validar permisos de aprobación.
        Operativo básico NO puede cambiar estado a 'aprobado'.
        """
        new_status = request.data.get('status')
        
        # Validar permiso de aprobación
        if new_status == 'aprobado':
            if request.user.role not in ['admin', 'operativo2']:
                return Response(
                    {'error': 'No tiene permisos para aprobar pagos. Contacte a un supervisor.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update para validar permisos de aprobación.
        Operativo básico NO puede cambiar estado a 'aprobado'.
        """
        new_status = request.data.get('status')
        
        # Validar permiso de aprobación
        if new_status == 'aprobado':
            if request.user.role not in ['admin', 'operativo2']:
                return Response(
                    {'error': 'No tiene permisos para aprobar pagos. Contacte a un supervisor.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
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
    
    def perform_destroy(self, instance):
        """Set current user before deletion for signal"""
        instance._current_user = self.request.user
        instance.delete()
    
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

        # Debug logging
        print(f"DEBUG: Received transfer_ids: {transfer_ids}")
        print(f"DEBUG: Received data keys: {request.data.keys()}")
        print(f"DEBUG: Total amount: {total_amount_str}, Method: {payment_method}, Date: {payment_date}")

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

        # Debug logging
        print(f"DEBUG: Providers set: {providers_set}")
        print(f"DEBUG: Transfers count: {transfers.count()}")
        print(f"DEBUG: Transfer details: {[(t.id, t.provider_id) for t in transfers]}")

        # Filtrar None si existe y convertir a lista
        providers_not_none = [p for p in providers_set if p is not None]

        if len(providers_not_none) == 0:
            return Response(
                {'error': 'Las facturas seleccionadas no tienen proveedor asignado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(providers_not_none) > 1:
            return Response(
                {'error': f'Todas las facturas deben ser del mismo proveedor. Proveedores encontrados: {providers_not_none}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        provider_id = providers_not_none[0]

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