from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.http import HttpResponse
from django.db import transaction
from decimal import Decimal
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from .models import Invoice, InvoicePayment, ServiceOrder, CreditNote
from apps.catalogs.models import Bank
from .serializers import InvoiceListSerializer, InvoicePaymentSerializer, CreditNoteSerializer
from .serializers_new import InvoiceDetailSerializer, InvoiceCreateSerializer
from apps.users.permissions import IsOperativo, IsOperativo2

# Import distributed lock utilities (only active when Redis is configured)
try:
    from apps.core.cache import distributed_lock, LockAcquisitionError
    LOCKS_ENABLED = True
except ImportError:
    LOCKS_ENABLED = False
    distributed_lock = None
    LockAcquisitionError = Exception


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices (CXC)"""
    permission_classes = [IsOperativo]
    serializer_class = InvoiceDetailSerializer
    filterset_fields = ['status']
    search_fields = ['invoice_number', 'service_order__client__name', 'ccf']
    ordering_fields = ['issue_date', 'due_date', 'total_amount', 'balance']
    ordering = ['-issue_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceDetailSerializer

    def create(self, request, *args, **kwargs):
        """Override create to ensure response includes invoice_number and linked items"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Get the created invoice with the auto-generated invoice_number
        # Refresh from DB to get auto-generated fields
        invoice = serializer.instance
        invoice.refresh_from_db()

        # Use detail serializer for response to include all fields
        response_serializer = InvoiceDetailSerializer(invoice)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Create invoice from service order with distributed lock"""
        service_order_id = self.request.data.get('service_order')
        
        if not service_order_id:
            raise ValueError("Se requiere una orden de servicio")

        # Use distributed lock to prevent concurrent invoicing of the same order
        def create_invoice():
            total_amount = Decimal(str(self.request.data.get('total_amount', 0)))
            invoice_number = self.request.data.get('invoice_number', '')

            # If invoice_number is empty or just whitespace, set to empty string
            # so the model's save() method will auto-generate it
            if invoice_number and isinstance(invoice_number, str):
                invoice_number = invoice_number.strip()
                if not invoice_number:
                    invoice_number = ''

            # Get dates
            from datetime import datetime
            issue_date = self.request.data.get('issue_date')
            if isinstance(issue_date, str):
                issue_date = datetime.strptime(issue_date, '%Y-%m-%d').date()

            due_date = self.request.data.get('due_date')
            if due_date and isinstance(due_date, str):
                due_date = datetime.strptime(due_date, '%Y-%m-%d').date()

            try:
                service_order = ServiceOrder.objects.select_for_update().get(id=service_order_id)
            except ServiceOrder.DoesNotExist:
                raise ValueError("Orden de servicio no encontrada")

            # Remove single invoice restriction to allow partial billing
            # if service_order.facturado:
            #    raise ValueError("Esta orden de servicio ya fue facturada")

            # Get file if provided
            pdf_file = self.request.FILES.get('pdf_file')
            dte_file = self.request.FILES.get('dte_file')

            # Create invoice with values
            invoice_data = {
                'created_by': self.request.user,
                'invoice_number': invoice_number if invoice_number else '',
                'issue_date': issue_date,
                'due_date': due_date,
                'total_amount': total_amount,
                'balance': total_amount,
                'paid_amount': Decimal('0.00')
            }

            # Add files if provided
            if pdf_file:
                invoice_data['pdf_file'] = pdf_file
            if dte_file:
                invoice_data['dte_file'] = dte_file

            invoice = serializer.save(**invoice_data)

            # 1. Link selected MANUAL charges to this invoice
            # Use getlist() for FormData arrays, fallback to get() for JSON
            charge_ids_raw = self.request.data.getlist('charge_ids', []) if hasattr(self.request.data, 'getlist') else self.request.data.get('charge_ids', [])

            # Debug logging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Raw charge_ids received: {charge_ids_raw}")

            # Convert to integers, filtering out empty strings and None
            charge_ids = []
            if charge_ids_raw:
                from .models import OrderCharge
                for id_val in charge_ids_raw:
                    # Handle potential list if nested (shouldn't happen but defensive)
                    if isinstance(id_val, list):
                        for sub_val in id_val:
                            if sub_val and str(sub_val).strip():
                                try:
                                    # Handle comma-separated strings
                                    if isinstance(sub_val, str) and ',' in sub_val:
                                        for part in sub_val.split(','):
                                            if part.strip():
                                                charge_ids.append(int(part.strip()))
                                    else:
                                        charge_ids.append(int(sub_val))
                                except (ValueError, TypeError):
                                    logger.warning(f"Invalid charge_id: {sub_val}")
                    # Handle single value
                    elif id_val and str(id_val).strip():
                        try:
                            # Handle comma-separated strings
                            if isinstance(id_val, str) and ',' in id_val:
                                for part in id_val.split(','):
                                    if part.strip():
                                        charge_ids.append(int(part.strip()))
                            else:
                                charge_ids.append(int(id_val))
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid charge_id: {id_val}")

                logger.info(f"Processed charge_ids: {charge_ids}")

                if charge_ids:
                    updated = OrderCharge.objects.filter(
                        id__in=charge_ids,
                        service_order=service_order,
                        invoice__isnull=True
                    ).update(invoice=invoice, billing_status='facturado')
                    logger.info(f"Updated {updated} charges with invoice {invoice.id}")

            # 2. Link selected TRANSFERS (Expenses) directly to invoice (without creating OrderCharges)
            # Los gastos se quedan en su tabla, solo se marcan como facturados
            # Use getlist() for FormData arrays, fallback to get() for JSON
            transfer_ids_raw = self.request.data.getlist('transfer_ids', []) if hasattr(self.request.data, 'getlist') else self.request.data.get('transfer_ids', [])

            logger.info(f"Raw transfer_ids received: {transfer_ids_raw}")

            # Convert to integers, filtering out empty strings and None
            transfer_ids = []
            if transfer_ids_raw:
                from apps.transfers.models import Transfer
                for id_val in transfer_ids_raw:
                    # Handle potential list
                    if isinstance(id_val, list):
                        for sub_val in id_val:
                            if sub_val and str(sub_val).strip():
                                try:
                                    if isinstance(sub_val, str) and ',' in sub_val:
                                        for part in sub_val.split(','):
                                            if part.strip():
                                                transfer_ids.append(int(part.strip()))
                                    else:
                                        transfer_ids.append(int(sub_val))
                                except (ValueError, TypeError):
                                    logger.warning(f"Invalid transfer_id: {sub_val}")
                    # Handle single value
                    elif id_val and str(id_val).strip():
                        try:
                            if isinstance(id_val, str) and ',' in id_val:
                                for part in id_val.split(','):
                                    if part.strip():
                                        transfer_ids.append(int(part.strip()))
                            else:
                                transfer_ids.append(int(id_val))
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid transfer_id: {id_val}")

                logger.info(f"Processed transfer_ids: {transfer_ids}")

                if transfer_ids:
                    # Marcar los transfers como facturados (sin moverlos a OrderCharge)
                    updated = Transfer.objects.filter(
                        id__in=transfer_ids,
                        service_order=service_order,
                        invoice__isnull=True  # Solo los no facturados
                    ).update(invoice=invoice, billing_status='facturado')
                    logger.info(f"Updated {updated} transfers with invoice {invoice.id}")

            # Recalculate totals based on linked charges AND transfers
            invoice.calculate_totals()

            # Mark service order as invoiced (billing started)
            service_order.facturado = True
            service_order.save()

            return invoice

        # Apply distributed lock if Redis is available
        if LOCKS_ENABLED and distributed_lock:
            try:
                with distributed_lock(f'invoice_os_{service_order_id}', timeout=30):
                    with transaction.atomic():
                        return create_invoice()
            except LockAcquisitionError:
                raise ValueError("Otro usuario está procesando esta orden. Intente nuevamente.")
        else:
            # Fallback to database-level lock only
            with transaction.atomic():
                return create_invoice()

    def get_queryset(self):
        from django.db.models import Prefetch
        queryset = Invoice.objects.all().select_related(
            'service_order', 'service_order__client', 'service_order__sub_client', 'created_by'
        ).prefetch_related(
            Prefetch('payments', queryset=InvoicePayment.objects.filter(is_deleted=False).select_related('bank', 'created_by')),
            Prefetch('credit_notes', queryset=CreditNote.objects.filter(is_deleted=False).select_related('created_by'))
        )

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

    def partial_update(self, request, *args, **kwargs):
        """
        Actualización parcial de factura con control de campos según estado DTE.

        Campos SIEMPRE editables (incluso con DTE emitido):
        - invoice_number: Número de factura (corrección de errores)
        - due_date: Fecha de vencimiento
        - notes: Notas internas
        - pdf_file: Archivo PDF

        Campos SOLO editables si NO tiene DTE emitido:
        - invoice_type: Tipo de documento
        - issue_date: Fecha de emisión
        """
        invoice = self.get_object()

        # Campos siempre permitidos
        ALWAYS_EDITABLE = {'invoice_number', 'due_date', 'notes', 'pdf_file'}

        # Campos solo editables sin DTE
        DTE_RESTRICTED = {'invoice_type', 'issue_date'}

        # Si tiene DTE emitido, filtrar los campos restringidos
        if invoice.is_dte_issued:
            restricted_fields = set(request.data.keys()) & DTE_RESTRICTED
            if restricted_fields:
                # Remover campos restringidos silenciosamente
                for field in restricted_fields:
                    if field in request.data:
                        del request.data[field]

        # Proceder con la actualización normal
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete invoice and unmark service order as invoiced"""
        invoice = self.get_object()

        # Check if invoice has payments
        if invoice.paid_amount > 0:
            return Response(
                {'error': 'No se puede eliminar una factura con pagos registrados. Elimine los pagos primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service_order = invoice.service_order
            
            # Delete invoice
            invoice.delete()

            # Unmark service order as invoiced if it has no other invoices
            if service_order and not service_order.invoices.exists():
                service_order.facturado = False
                service_order.save()

            return Response(
                {'message': 'Factura eliminada correctamente'},
                status=status.HTTP_204_NO_CONTENT
            )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def mark_as_dte(self, request, pk=None):
        """
        Marca una pre-factura como DTE emitido.
        Una vez marcada, solo se pueden hacer notas de crédito.
        """
        invoice = self.get_object()
        
        if invoice.is_dte_issued:
            return Response(
                {'error': 'Esta factura ya fue marcada como DTE emitido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dte_number = request.data.get('dte_number', '')
        
        # Registrar en historial
        from .models import InvoiceEditHistory
        InvoiceEditHistory.objects.create(
            invoice=invoice,
            edit_type='dte_marked',
            description=f'Factura marcada como DTE emitido. Número DTE: {dte_number or "N/A"}',
            previous_values={'is_dte_issued': False, 'invoice_number': invoice.invoice_number},
            new_values={'is_dte_issued': True, 'dte_number': dte_number, 'invoice_number': dte_number},
            user=request.user
        )
        
        invoice.is_dte_issued = True
        invoice.dte_number = dte_number
        if dte_number:
            invoice.invoice_number = dte_number
        invoice.save()
        
        return Response({
            'message': 'Factura marcada como DTE emitido correctamente.',
            'invoice_number': invoice.invoice_number,
            'dte_number': dte_number
        })

    @action(detail=True, methods=['patch'])
    def edit_expense(self, request, pk=None):
        """
        Editar un gasto facturado (solo si es pre-factura).

        RESTRICCIONES DE INTEGRIDAD:
        - El Monto Base (amount) NO es editable si tiene pagos o está bloqueado
        - Solo se permite editar: Margen de Utilidad y configuración de IVA
        - Los cambios se sincronizan bidireccionalmente con la OS

        CAMPOS PERMITIDOS:
        - customer_markup_percentage: Margen de utilidad (%)
        - customer_iva_type: Tratamiento fiscal (gravado/exento/no_sujeto)
        - customer_applies_iva: Legacy boolean (se sincroniza automáticamente)
        """
        invoice = self.get_object()

        if invoice.is_dte_issued:
            return Response(
                {'error': 'No se puede editar. Esta factura ya tiene DTE emitido. Use notas de crédito.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transfer_id = request.data.get('transfer_id')
        if not transfer_id:
            return Response(
                {'error': 'Se requiere transfer_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.transfers.models import Transfer
        try:
            transfer = Transfer.objects.select_for_update().get(id=transfer_id, invoice=invoice)
        except Transfer.DoesNotExist:
            return Response(
                {'error': 'Gasto no encontrado en esta factura'},
                status=status.HTTP_404_NOT_FOUND
            )

        # RESTRICCIÓN: El monto base NO es editable
        if 'amount' in request.data:
            if not transfer.is_amount_editable():
                return Response(
                    {'error': 'El monto base no es editable. Viene del pago al proveedor y no puede modificarse.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Guardar valores anteriores para audit trail
        previous_values = {
            'amount': str(transfer.amount),
            'customer_markup_percentage': str(transfer.customer_markup_percentage),
            'customer_iva_type': transfer.customer_iva_type,
            'customer_applies_iva': transfer.customer_applies_iva
        }

        changes_made = []

        with transaction.atomic():
            # Actualizar margen si se proporciona
            if 'customer_markup_percentage' in request.data:
                old_markup = transfer.customer_markup_percentage
                new_markup = Decimal(str(request.data['customer_markup_percentage']))
                if old_markup != new_markup:
                    transfer.customer_markup_percentage = new_markup
                    changes_made.append(f'Margen: {old_markup}% → {new_markup}%')

            # Actualizar tipo de IVA si se proporciona (nuevo campo)
            if 'customer_iva_type' in request.data:
                old_iva_type = transfer.customer_iva_type
                new_iva_type = request.data['customer_iva_type']
                if old_iva_type != new_iva_type:
                    transfer.customer_iva_type = new_iva_type
                    changes_made.append(f'Tipo IVA: {old_iva_type} → {new_iva_type}')

            # Compatibilidad: actualizar legacy applies_iva
            if 'customer_applies_iva' in request.data:
                old_applies = transfer.customer_applies_iva
                new_applies = request.data['customer_applies_iva']
                if old_applies != new_applies:
                    # Sincronizar con customer_iva_type
                    transfer.customer_iva_type = 'gravado' if new_applies else 'exento'
                    changes_made.append(f'Aplica IVA: {old_applies} → {new_applies}')

            transfer.save()

            # Registrar en historial con detalle de cambios
            from .models import InvoiceEditHistory

            if changes_made:
                InvoiceEditHistory.objects.create(
                    invoice=invoice,
                    edit_type='expense_edited',
                    description=f'Gasto editado: {transfer.description[:50]}... | Cambios: {", ".join(changes_made)}',
                    previous_values=previous_values,
                    new_values={
                        'amount': str(transfer.amount),
                        'customer_markup_percentage': str(transfer.customer_markup_percentage),
                        'customer_iva_type': transfer.customer_iva_type,
                        'customer_applies_iva': transfer.customer_applies_iva
                    },
                    user=request.user
                )

            # Recalcular totales de la factura (sincronización automática)
            invoice.calculate_totals()

        return Response({
            'message': 'Gasto actualizado correctamente',
            'transfer_id': transfer.id,
            'changes': changes_made,
            'new_values': {
                'customer_markup_percentage': str(transfer.customer_markup_percentage),
                'customer_iva_type': transfer.customer_iva_type,
                'base_price': str(transfer.get_customer_base_price()),
                'iva_amount': str(transfer.get_customer_iva_amount()),
                'total': str(transfer.get_customer_total())
            }
        })

    @action(detail=True, methods=['patch'])
    def edit_charge(self, request, pk=None):
        """
        Editar un cargo/servicio facturado (solo si es pre-factura).
        Los cambios se reflejan tanto en la factura como en la OS.
        """
        invoice = self.get_object()
        
        if invoice.is_dte_issued:
            return Response(
                {'error': 'No se puede editar. Esta factura ya tiene DTE emitido. Use notas de crédito.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        charge_id = request.data.get('charge_id')
        if not charge_id:
            return Response(
                {'error': 'Se requiere charge_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .models import OrderCharge
        try:
            charge = OrderCharge.objects.get(id=charge_id, invoice=invoice)
        except OrderCharge.DoesNotExist:
            return Response(
                {'error': 'Cargo no encontrado en esta factura'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Guardar valores anteriores para historial
        previous_values = {
            'quantity': charge.quantity,
            'unit_price': str(charge.unit_price),
            'discount': str(charge.discount),
            'iva_type': charge.iva_type
        }
        
        # Actualizar campos si se proporcionan
        if 'quantity' in request.data:
            charge.quantity = int(request.data['quantity'])
        if 'unit_price' in request.data:
            charge.unit_price = Decimal(str(request.data['unit_price']))
        if 'discount' in request.data:
            discount_val = request.data['discount']
            if discount_val == '' or discount_val is None:
                charge.discount = Decimal('0.00')
            else:
                try:
                    charge.discount = Decimal(str(discount_val))
                except (ValueError, TypeError, Exception):
                    charge.discount = Decimal('0.00')
        if 'description' in request.data:
            charge.description = request.data['description']
        if 'iva_type' in request.data:
            charge.iva_type = request.data['iva_type']
        if 'applies_iva' in request.data:
            # Toggle logic for simple boolean from frontend
            charge.iva_type = 'gravado' if request.data['applies_iva'] else 'exento'
        
        # El save() del modelo recalcula subtotal, iva_amount, total
        charge.save()
        
        # Registrar en historial
        from .models import InvoiceEditHistory
        InvoiceEditHistory.objects.create(
            invoice=invoice,
            edit_type='charge_edited',
            description=f'Cargo editado: {charge.service.name}',
            previous_values=previous_values,
            new_values={
                'quantity': charge.quantity,
                'unit_price': str(charge.unit_price),
                'discount': str(charge.discount),
                'iva_type': charge.iva_type
            },
            user=request.user
        )
        
        # Recalcular totales de la factura
        invoice.calculate_totals()
        
        return Response({
            'message': 'Cargo actualizado correctamente',
            'charge_id': charge.id
        })

    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        """
        Quita un item de la factura (servicio o gasto).

        REVERSIBILIDAD:
        - El item vuelve automáticamente a la OS como "Disponible para Facturar"
        - El billing_status se actualiza a 'disponible'
        - Solo funciona si la factura está en estado "Pendiente" (pre-factura)

        RESTRICCIÓN:
        - No se puede remover items de facturas con DTE emitido
        """
        invoice = self.get_object()

        if invoice.is_dte_issued:
            return Response(
                {'error': 'No se puede editar. Esta factura ya tiene DTE emitido. Use notas de crédito.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        item_type = request.data.get('item_type')  # 'charge' o 'expense'
        item_id = request.data.get('item_id')

        if not item_type or not item_id:
            return Response(
                {'error': 'Se requiere item_type (charge/expense) e item_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import InvoiceEditHistory

        with transaction.atomic():
            if item_type == 'charge':
                from .models import OrderCharge
                try:
                    charge = OrderCharge.objects.select_for_update().get(id=item_id, invoice=invoice)

                    # Guardar información para historial
                    description = f'{charge.service.name} - {charge.description}'
                    previous_values = {
                        'charge_id': item_id,
                        'linked_to_invoice': True,
                        'invoice_number': invoice.invoice_number,
                        'billing_status': charge.billing_status,
                        'total': str(charge.total)
                    }

                    # Desvincular de la factura (vuelve a estar disponible)
                    charge.invoice = None
                    charge.billing_status = 'disponible'
                    charge.save(skip_order_validation=True)  # Permitir modificación para desvinculación

                    InvoiceEditHistory.objects.create(
                        invoice=invoice,
                        edit_type='charge_removed',
                        description=f'Servicio removido y retornado a OS: {description}',
                        previous_values=previous_values,
                        new_values={
                            'linked_to_invoice': False,
                            'billing_status': 'disponible',
                            'available_in_os': True
                        },
                        user=request.user
                    )

                except OrderCharge.DoesNotExist:
                    return Response({'error': 'Cargo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            elif item_type == 'expense':
                from apps.transfers.models import Transfer
                try:
                    transfer = Transfer.objects.select_for_update().get(id=item_id, invoice=invoice)

                    description = transfer.description[:100]
                    previous_values = {
                        'transfer_id': item_id,
                        'linked_to_invoice': True,
                        'invoice_number': invoice.invoice_number,
                        'billing_status': transfer.billing_status,
                        'total': str(transfer.get_customer_total())
                    }

                    # Desvincular de la factura (vuelve a estar disponible)
                    transfer.invoice = None
                    transfer.billing_status = 'disponible'
                    transfer.save()

                    InvoiceEditHistory.objects.create(
                        invoice=invoice,
                        edit_type='expense_removed',
                        description=f'Gasto removido y retornado a OS: {description}',
                        previous_values=previous_values,
                        new_values={
                            'linked_to_invoice': False,
                            'billing_status': 'disponible',
                            'available_in_os': True
                        },
                        user=request.user
                    )

                except Transfer.DoesNotExist:
                    return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'item_type debe ser "charge" o "expense"'}, status=status.HTTP_400_BAD_REQUEST)

            # Recalcular totales de la factura
            invoice.calculate_totals()

            # Verificar si la factura quedó vacía
            charges_count = invoice.charges.filter(is_deleted=False).count()
            expenses_count = invoice.billed_transfers.filter(is_deleted=False).count()
            
            # Si la factura quedó sin items, eliminarla automáticamente
            if charges_count == 0 and expenses_count == 0:
                invoice_number = invoice.invoice_number
                invoice.delete()
                return Response({
                    'message': f'Pre-factura {invoice_number} eliminada porque no tenía más items.',
                    'invoice_deleted': True,
                    'item_returned_to_os': True
                })

        return Response({
            'message': f'Item removido de la factura. Ahora está disponible para facturar nuevamente.',
            'item_returned_to_os': True,
            'invoice_deleted': False,
            'invoice_items_remaining': {
                'charges': charges_count,
                'expenses': expenses_count
            }
        })

    @action(detail=True, methods=['post'])
    def add_items(self, request, pk=None):
        """
        Agregar items a una factura existente (solo si es pre-factura).
        Útil para vincular items a facturas existentes que no tienen items vinculados.
        """
        invoice = self.get_object()
        
        if invoice.is_dte_issued:
            return Response(
                {'error': 'No se puede modificar. Esta factura ya tiene DTE emitido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        charge_ids = request.data.get('charge_ids', [])
        transfer_ids = request.data.get('transfer_ids', [])
        
        if not charge_ids and not transfer_ids:
            return Response(
                {'error': 'Debe proporcionar charge_ids o transfer_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service_order = invoice.service_order
        added_charges = 0
        added_expenses = 0
        
        # Vincular cargos
        if charge_ids:
            from .models import OrderCharge
            result = OrderCharge.objects.filter(
                id__in=charge_ids,
                service_order=service_order,
                invoice__isnull=True
            ).update(invoice=invoice)
            added_charges = result
        
        # Vincular gastos
        if transfer_ids:
            from apps.transfers.models import Transfer
            result = Transfer.objects.filter(
                id__in=transfer_ids,
                service_order=service_order,
                invoice__isnull=True
            ).update(invoice=invoice)
            added_expenses = result
        
        # Recalcular totales
        invoice.calculate_totals()
        
        # Registrar en historial
        from .models import InvoiceEditHistory
        InvoiceEditHistory.objects.create(
            invoice=invoice,
            edit_type='charge_added',
            description=f'Items agregados: {added_charges} servicios, {added_expenses} gastos',
            new_values={'charge_ids': charge_ids, 'transfer_ids': transfer_ids},
            user=request.user
        )
        
        return Response({
            'message': f'Items agregados correctamente. {added_charges} servicios, {added_expenses} gastos.',
            'added_charges': added_charges,
            'added_expenses': added_expenses
        })

    @action(detail=True, methods=['get'])
    def available_items(self, request, pk=None):
        """
        Obtener items disponibles para agregar a esta factura.
        Solo muestra items de la misma OS que aún no están facturados.
        """
        invoice = self.get_object()
        service_order = invoice.service_order
        
        items = []
        
        # Cargos no facturados
        from .models import OrderCharge
        charges = OrderCharge.objects.filter(
            service_order=service_order,
            invoice__isnull=True,
            is_deleted=False
        ).select_related('service')
        
        for charge in charges:
            items.append({
                'id': charge.id,
                'type': 'charge',
                'description': f"{charge.service.name} - {charge.description or ''}",
                'amount': float(charge.subtotal),
                'iva': float(charge.iva_amount),
                'total': float(charge.total)
            })
        
        # Gastos no facturados
        from apps.transfers.models import Transfer
        from decimal import Decimal
        
        transfers = Transfer.objects.filter(
            service_order=service_order,
            transfer_type__in=['cargos', 'costos', 'terceros'],
            invoice__isnull=True,
            is_deleted=False
        ).select_related('provider')
        
        for t in transfers:
            markup = t.customer_markup_percentage or Decimal('0.00')
            cost = t.amount
            base_price = cost * (1 + markup / Decimal('100.00'))
            
            if t.customer_applies_iva:
                iva = base_price * Decimal('0.13')
            else:
                iva = Decimal('0.00')
            
            items.append({
                'id': t.id,
                'type': 'expense',
                'description': f"{t.description} ({t.provider.name if t.provider else 'N/A'})",
                'amount': float(base_price),
                'iva': float(iva),
                'total': float(base_price + iva)
            })
        
        return Response(items)

    @action(detail=True, methods=['get'])
    def edit_history(self, request, pk=None):
        """Obtener el historial de ediciones de una factura"""
        invoice = self.get_object()
        
        from .models import InvoiceEditHistory
        history = InvoiceEditHistory.objects.filter(invoice=invoice).select_related('user')
        
        data = []
        for h in history:
            data.append({
                'id': h.id,
                'edit_type': h.edit_type,
                'edit_type_display': h.get_edit_type_display(),
                'description': h.description,
                'previous_values': h.previous_values,
                'new_values': h.new_values,
                'user': h.user.get_full_name() if h.user else 'Sistema',
                'created_at': h.created_at.isoformat()
            })
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoicing summary statistics with enhanced KPIs"""
        queryset = self.get_queryset()
        from django.utils import timezone
        today = timezone.now().date()

        # Basic totals
        total_invoiced = queryset.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')

        total_pending = queryset.filter(balance__gt=0).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')

        total_collected = queryset.aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0')

        # Overdue invoices
        overdue_queryset = queryset.filter(
            due_date__lt=today,
            balance__gt=0
        )
        total_overdue = overdue_queryset.aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        overdue_count = overdue_queryset.count()

        # Status counts
        # pending_count ahora refleja TODAS las facturas con saldo pendiente (incluyendo parciales y vencidas)
        # para ser consistente con total_pending
        pending_count = queryset.filter(balance__gt=0).count()
        
        paid_count = queryset.filter(status='paid').count()
        partial_count = queryset.filter(status='partial').count()
        cancelled_count = queryset.filter(status='cancelled').count()

        # Additional KPIs
        # Invoices due this week
        from datetime import timedelta
        week_end = today + timedelta(days=7)
        due_this_week = queryset.filter(
            due_date__gte=today,
            due_date__lte=week_end,
            balance__gt=0
        ).count()

        # Average collection time (for paid invoices)
        paid_invoices = queryset.filter(status='paid', due_date__isnull=False)

        return Response({
            'total_invoiced': str(total_invoiced),
            'total_pending': str(total_pending),
            'total_collected': str(total_collected),
            'total_overdue': str(total_overdue),
            'pending_count': pending_count,
            'paid_count': paid_count,
            'partial_count': partial_count,
            'overdue_count': overdue_count,
            'cancelled_count': cancelled_count,
            'due_this_week': due_this_week,
            'total_invoices': queryset.count(),
        })

    @action(detail=False, methods=['get'], permission_classes=[IsOperativo])
    def export_excel(self, request):
        """Export invoices to Excel with professional formatting"""
        from django.utils import timezone
        from datetime import datetime

        queryset = self.get_queryset()

        # Apply filters from request
        client_id = request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(service_order__client_id=client_id)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = request.query_params.get('dateFrom')
        if date_from:
            queryset = queryset.filter(issue_date__gte=date_from)

        date_to = request.query_params.get('dateTo')
        if date_to:
            queryset = queryset.filter(issue_date__lte=date_to)

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Cuentas por Cobrar"

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
        ws['A1'] = "CUENTAS POR COBRAR"
        ws['A1'].font = title_font
        ws.merge_cells('A1:K1')

        ws['A2'] = "GPRO LOGISTIC - Agencia Aduanal"
        ws['A2'].font = Font(size=11, color="666666")
        ws.merge_cells('A2:K2')

        ws['A3'] = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = Font(size=9, italic=True, color="999999")

        # === TABLA DE DATOS ===
        start_row = 5
        ws.cell(row=start_row, column=1, value="DETALLE DE FACTURAS").font = subtitle_font
        ws.merge_cells(f'A{start_row}:K{start_row}')

        # Headers de la tabla
        headers = [
            'No. Factura', 'Cliente', 'Orden de Servicio', 'CCF',
            'Fecha Emisión', 'Fecha Vencimiento', 'Total', 'Pagado',
            'Saldo', 'Estado', 'Días Vencida'
        ]
        header_row = start_row + 1

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=header_row, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        # Data rows
        status_display = {
            'pending': 'Pendiente',
            'partial': 'Pago Parcial',
            'paid': 'Pagada',
            'overdue': 'Vencida',
            'cancelled': 'Anulada',
        }

        today = timezone.now().date()
        data_row = header_row + 1
        totals = {'total': 0, 'paid': 0, 'balance': 0}

        for invoice in queryset:
            # Calculate days overdue
            days_overdue = 0
            if invoice.due_date and invoice.balance > 0 and today > invoice.due_date:
                days_overdue = (today - invoice.due_date).days

            ws.cell(row=data_row, column=1, value=invoice.invoice_number).border = thin_border
            ws.cell(row=data_row, column=2, value=invoice.service_order.client.name if invoice.service_order else '').border = thin_border
            ws.cell(row=data_row, column=3, value=invoice.service_order.order_number if invoice.service_order else '').border = thin_border
            ws.cell(row=data_row, column=4, value=invoice.ccf or '').border = thin_border
            ws.cell(row=data_row, column=5, value=invoice.issue_date.strftime('%d/%m/%Y') if invoice.issue_date else '').border = thin_border
            ws.cell(row=data_row, column=6, value=invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '').border = thin_border

            # Monetary columns with format
            total_cell = ws.cell(row=data_row, column=7, value=float(invoice.total_amount))
            total_cell.number_format = currency_format
            total_cell.border = thin_border
            total_cell.alignment = Alignment(horizontal='right')

            paid_cell = ws.cell(row=data_row, column=8, value=float(invoice.paid_amount))
            paid_cell.number_format = currency_format
            paid_cell.border = thin_border
            paid_cell.alignment = Alignment(horizontal='right')

            balance_cell = ws.cell(row=data_row, column=9, value=float(invoice.balance))
            balance_cell.number_format = currency_format
            balance_cell.border = thin_border
            balance_cell.alignment = Alignment(horizontal='right')

            ws.cell(row=data_row, column=10, value=status_display.get(invoice.status, invoice.status)).border = thin_border
            ws.cell(row=data_row, column=11, value=days_overdue if days_overdue > 0 else '').border = thin_border

            # Sumar totales
            totals['total'] += float(invoice.total_amount)
            totals['paid'] += float(invoice.paid_amount)
            totals['balance'] += float(invoice.balance)

            data_row += 1

        # Fila de totales
        ws.cell(row=data_row, column=1, value="TOTALES").font = Font(bold=True)
        ws.cell(row=data_row, column=1).border = thin_border
        for col in range(2, 7):
            ws.cell(row=data_row, column=col).border = thin_border

        total_total = ws.cell(row=data_row, column=7, value=totals['total'])
        total_total.number_format = currency_format
        total_total.font = Font(bold=True)
        total_total.border = thin_border
        total_total.alignment = Alignment(horizontal='right')

        total_paid = ws.cell(row=data_row, column=8, value=totals['paid'])
        total_paid.number_format = currency_format
        total_paid.font = Font(bold=True)
        total_paid.border = thin_border
        total_paid.alignment = Alignment(horizontal='right')

        total_balance = ws.cell(row=data_row, column=9, value=totals['balance'])
        total_balance.number_format = currency_format
        total_balance.font = Font(bold=True)
        total_balance.border = thin_border
        total_balance.alignment = Alignment(horizontal='right')

        for col in range(10, 12):
            ws.cell(row=data_row, column=col).border = thin_border

        # Ajustar anchos de columna
        column_widths = [18, 30, 18, 15, 14, 14, 14, 14, 14, 15, 12]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = width

        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=GPRO_CXC_Facturas.xlsx'
        wb.save(response)
        return response

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add a payment (abono) to an invoice with distributed lock"""
        invoice = self.get_object()

        if invoice.balance <= 0:
            return Response(
                {'error': 'Esta factura ya está completamente pagada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        def process_payment():
            # Re-fetch invoice inside lock to ensure fresh data
            inv = Invoice.objects.select_for_update().get(pk=pk)
            
            # Re-validate balance inside lock
            if inv.balance <= 0:
                raise ValueError('Esta factura ya está completamente pagada')
            
            amount = Decimal(str(request.data.get('amount', 0)))
            if amount <= 0:
                raise ValueError('El monto debe ser mayor a cero')

            if amount > inv.balance:
                raise ValueError(f'El monto excede el saldo pendiente (${inv.balance})')

            # Get bank if provided
            bank_id = request.data.get('bank')
            bank = None
            if bank_id:
                try:
                    bank = Bank.objects.get(pk=bank_id)
                except Bank.DoesNotExist:
                    pass

            payment = InvoicePayment.objects.create(
                invoice=inv,
                amount=amount,
                payment_date=request.data.get('payment_date'),
                payment_method=request.data.get('payment_method', 'transferencia'),
                reference_number=request.data.get('reference', ''),
                bank=bank,
                notes=request.data.get('notes', ''),
                receipt_file=request.FILES.get('receipt_file'),
                created_by=request.user
            )

            # El modelo InvoicePayment.save() ya actualiza paid_amount de la factura
            # Refrescar la instancia para obtener el balance actualizado
            inv.refresh_from_db()

            return payment, inv.balance

        try:
            # Apply distributed lock if Redis is available
            if LOCKS_ENABLED and distributed_lock:
                try:
                    with distributed_lock(f'invoice_payment_{pk}', timeout=30):
                        with transaction.atomic():
                            payment, new_balance = process_payment()
                except LockAcquisitionError:
                    return Response(
                        {'error': 'Otro usuario está procesando esta factura. Intente nuevamente.'},
                        status=status.HTTP_409_CONFLICT
                    )
            else:
                with transaction.atomic():
                    payment, new_balance = process_payment()

            return Response({
                'message': 'Pago registrado exitosamente',
                'payment_id': payment.id,
                'new_balance': str(new_balance)
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def add_credit_note(self, request, pk=None):
        """Register a credit note for an invoice with distributed lock"""
        invoice = self.get_object()
        
        if invoice.status == 'cancelled':
             return Response({'error': 'No se pueden aplicar NC a facturas anuladas'}, status=status.HTTP_400_BAD_REQUEST)
        
        def process_credit_note():
            # Re-fetch invoice inside lock
            inv = Invoice.objects.select_for_update().get(pk=pk)
            
            if inv.status == 'cancelled':
                raise ValueError('No se pueden aplicar NC a facturas anuladas')
             
            amount = Decimal(str(request.data.get('amount', 0)))
            if amount <= 0:
                 raise ValueError('El monto debe ser mayor a cero')
                 
            # Validate against pending balance
            if amount > inv.balance:
                raise ValueError(f'El monto de la NC no puede superar el saldo pendiente de la factura (${inv.balance})')

            credit_note = CreditNote.objects.create(
                invoice=inv,
                note_number=request.data.get('note_number'),
                amount=amount,
                reason=request.data.get('reason', ''),
                issue_date=request.data.get('issue_date'),
                pdf_file=request.FILES.get('pdf_file'),
                created_by=request.user
            )
            
            return credit_note

        try:
            # Apply distributed lock if Redis is available
            if LOCKS_ENABLED and distributed_lock:
                try:
                    with distributed_lock(f'invoice_credit_note_{pk}', timeout=30):
                        with transaction.atomic():
                            credit_note = process_credit_note()
                except LockAcquisitionError:
                    return Response(
                        {'error': 'Otro usuario está procesando esta factura. Intente nuevamente.'},
                        status=status.HTTP_409_CONFLICT
                    )
            else:
                with transaction.atomic():
                    credit_note = process_credit_note()
            
            return Response({
                'message': 'Nota de Crédito registrada exitosamente',
                'credit_note_id': credit_note.id
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InvoicePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice payments"""
    permission_classes = [IsOperativo]
    serializer_class = InvoicePaymentSerializer
    filterset_fields = ['invoice', 'payment_method']
    search_fields = ['reference', 'invoice__invoice_number']
    ordering = ['-payment_date']

    def get_queryset(self):
        return InvoicePayment.objects.all().select_related(
            'invoice', 'invoice__service_order', 'invoice__service_order__client', 'created_by', 'bank'
        )

    def destroy(self, request, *args, **kwargs):
        """Delete a payment and update invoice balance with atomic transaction"""
        payment = self.get_object()

        # CORREGIDO: Usar 'cancelled' que es el estado valido, no 'cancelada'
        if payment.invoice.status == 'cancelled':
            return Response(
                {'error': 'No se pueden eliminar pagos de una factura cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # CORREGIDO: Usar transaccion atomica con select_for_update para prevenir race conditions
            with transaction.atomic():
                # Re-fetch invoice with lock
                invoice = Invoice.objects.select_for_update().get(pk=payment.invoice_id)

                # Recalcular paid_amount desde los pagos activos (excluyendo el que se elimina)
                from django.db.models import Sum
                remaining_payments = invoice.payments.filter(is_deleted=False).exclude(pk=payment.pk)
                new_paid_amount = remaining_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                invoice.paid_amount = new_paid_amount
                # El balance se calcula considerando retencion y NC
                invoice.balance = (invoice.total_amount - invoice.retencion) - invoice.paid_amount - invoice.credited_amount

                # Actualizar estado
                if invoice.balance <= 0:
                    invoice.status = 'paid'
                elif invoice.paid_amount > 0:
                    invoice.status = 'partial'
                else:
                    invoice.status = 'pending'

                invoice.save()

                # Delete payment (soft delete)
                payment.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response(
                {'error': f'Error al eliminar el pago: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CreditNoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing credit notes"""
    queryset = CreditNote.objects.all()
    serializer_class = CreditNoteSerializer
    permission_classes = [IsOperativo]
    filterset_fields = ['invoice']
    
    def perform_destroy(self, instance):
        instance.delete() # Trigger soft delete and recalculation
