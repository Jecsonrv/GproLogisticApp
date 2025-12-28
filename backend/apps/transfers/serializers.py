from rest_framework import serializers
from .models import Transfer, TransferPayment, BatchPayment, ProviderCreditNote, CreditNoteApplication

class TransferSerializer(serializers.ModelSerializer):
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    invoice_file = serializers.FileField(required=False, allow_null=True)

    # Campos display para choices
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Campo relacionado
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)

    class Meta:
        model = Transfer
        fields = [
            'id', 'service_order', 'service_order_number', 'client_name',
            'provider', 'provider_name', 'beneficiary_name',
            'transfer_type', 'transfer_type_display',
            'amount', 'currency', 'exchange_rate',
            'description', 'status', 'status_display',
            'bank', 'bank_name', 'transaction_date', 'payment_date',
            'payment_method', 'invoice_number', 'ccf',
            'invoice_file', 'balance', 'paid_amount',
            'customer_markup_percentage', 'customer_applies_iva', 'customer_iva_type',
            'created_by', 'created_by_username', 'created_by_name',
            'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None
    
    def create(self, validated_data):
        # Asignar el usuario que crea la transferencia
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class TransferListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Info de facturación al cliente
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True, allow_null=True)
    invoice_number_client = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)
    is_billed = serializers.SerializerMethodField()

    # Info de NC de proveedores aplicadas a esta factura
    credit_notes_applied = serializers.SerializerMethodField()

    class Meta:
        model = Transfer
        fields = ['id', 'transfer_type', 'transfer_type_display', 'status', 'status_display',
                  'amount', 'paid_amount', 'balance', 'description', 'service_order', 'service_order_number',
                  'provider', 'provider_name', 'bank', 'bank_name', 'beneficiary_name',
                  'payment_method', 'invoice_number', 'ccf', 'invoice_file',
                  'customer_markup_percentage', 'customer_applies_iva',
                  'invoice_id', 'invoice_number_client', 'is_billed', 'credit_notes_applied',
                  'transaction_date', 'payment_date', 'created_at', 'created_by', 'created_by_username', 'created_by_name']

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_is_billed(self, obj):
        """Indica si este gasto ya fue facturado al cliente"""
        return obj.invoice_id is not None

    def get_credit_notes_applied(self, obj):
        """Retorna las NC de proveedores vinculadas a esta factura"""
        # NC vinculadas directamente como factura original
        credit_notes = ProviderCreditNote.objects.filter(
            original_transfer=obj,
            is_deleted=False
        ).exclude(status='anulada')

        if not credit_notes.exists():
            return None

        return [{
            'id': nc.id,
            'note_number': nc.note_number,
            'amount': str(nc.amount),
            'status': nc.status,
            'status_display': nc.get_status_display(),
            'reason': nc.get_reason_display(),
            'issue_date': nc.issue_date.isoformat() if nc.issue_date else None
        } for nc in credit_notes]


class TransferPaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos individuales (actualizado con batch_payment)"""
    transfer_description = serializers.CharField(source='transfer.description', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    batch_payment_number = serializers.CharField(source='batch_payment.batch_number', read_only=True, allow_null=True)

    class Meta:
        model = TransferPayment
        fields = [
            'id', 'transfer', 'transfer_description', 'amount',
            'payment_date', 'payment_method', 'payment_method_display',
            'reference_number', 'notes', 'proof_file',
            'batch_payment', 'batch_payment_number',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at']


class BatchPaymentSerializer(serializers.ModelSerializer):
    """Serializer básico para listar BatchPayments"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    transfers_count = serializers.SerializerMethodField()
    service_orders = serializers.SerializerMethodField()

    class Meta:
        model = BatchPayment
        fields = [
            'id', 'batch_number', 'provider', 'provider_name',
            'total_amount', 'payment_method', 'payment_method_display',
            'payment_date', 'bank', 'bank_name', 'reference_number',
            'proof_file', 'notes', 'transfers_count', 'service_orders',
            'created_by', 'created_by_username', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['batch_number', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_transfers_count(self, obj):
        return obj.get_transfers_count()

    def get_service_orders(self, obj):
        """Retorna lista de números de OS afectadas"""
        orders = obj.get_service_orders()
        return [os.order_number for os in orders]


class BatchPaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer con detalles completos incluyendo pagos individuales"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    # Pagos individuales incluidos en este lote
    payments = serializers.SerializerMethodField()

    class Meta:
        model = BatchPayment
        fields = [
            'id', 'batch_number', 'provider', 'provider_name',
            'total_amount', 'payment_method', 'payment_method_display',
            'payment_date', 'bank', 'bank_name', 'reference_number',
            'proof_file', 'notes', 'payments',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_payments(self, obj):
        """Retorna lista de pagos individuales con información del Transfer"""
        payments = TransferPayment.objects.filter(
            batch_payment=obj,
            is_deleted=False
        ).select_related('transfer', 'transfer__service_order', 'transfer__provider').order_by('id')

        return [{
            'id': p.id,
            'transfer_id': p.transfer.id,
            'transfer_description': p.transfer.description,
            'transfer_invoice_number': p.transfer.invoice_number,
            'transfer_amount': str(p.transfer.amount),
            'amount_paid': str(p.amount),
            'service_order': p.transfer.service_order.order_number if p.transfer.service_order else None,
            'service_order_id': p.transfer.service_order.id if p.transfer.service_order else None,
        } for p in payments]


# ============================================
# SERIALIZERS PARA NOTAS DE CRÉDITO DE PROVEEDORES
# ============================================

class CreditNoteApplicationSerializer(serializers.ModelSerializer):
    """Serializer para aplicaciones de NC a facturas"""
    transfer_description = serializers.CharField(source='transfer.description', read_only=True)
    transfer_invoice_number = serializers.CharField(source='transfer.invoice_number', read_only=True)
    transfer_amount = serializers.DecimalField(source='transfer.amount', max_digits=15, decimal_places=2, read_only=True)
    transfer_balance = serializers.DecimalField(source='transfer.balance', max_digits=15, decimal_places=2, read_only=True)
    service_order_number = serializers.CharField(source='transfer.service_order.order_number', read_only=True, allow_null=True)
    applied_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CreditNoteApplication
        fields = [
            'id', 'credit_note', 'transfer', 'transfer_description',
            'transfer_invoice_number', 'transfer_amount', 'transfer_balance',
            'service_order_number', 'amount', 'applied_at', 'applied_by',
            'applied_by_name', 'notes'
        ]
        read_only_fields = ['applied_at']

    def get_applied_by_name(self, obj):
        if obj.applied_by:
            full_name = f"{obj.applied_by.first_name} {obj.applied_by.last_name}".strip()
            return full_name if full_name else obj.applied_by.username
        return None


class ProviderCreditNoteListSerializer(serializers.ModelSerializer):
    """Serializer para listado de NC"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    original_transfer_info = serializers.SerializerMethodField()

    class Meta:
        model = ProviderCreditNote
        fields = [
            'id', 'note_number', 'provider', 'provider_name',
            'original_transfer', 'original_transfer_info',
            'amount', 'applied_amount', 'available_amount',
            'issue_date', 'received_date', 'reason', 'reason_display',
            'status', 'status_display', 'pdf_file',
            'applications_count', 'created_by_name', 'created_at'
        ]

    def get_original_transfer_info(self, obj):
        if obj.original_transfer:
            return {
                'id': obj.original_transfer.id,
                'invoice_number': obj.original_transfer.invoice_number,
                'description': obj.original_transfer.description,
                'amount': str(obj.original_transfer.amount)
            }
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_applications_count(self, obj):
        return obj.applications.filter(is_deleted=False).count()


class ProviderCreditNoteDetailSerializer(serializers.ModelSerializer):
    """Serializer con detalles completos de NC"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    voided_by_name = serializers.SerializerMethodField()
    applications = serializers.SerializerMethodField()
    original_transfer_info = serializers.SerializerMethodField()

    # Facturas pendientes del mismo proveedor (para UI de aplicación)
    pending_transfers = serializers.SerializerMethodField()

    class Meta:
        model = ProviderCreditNote
        fields = [
            'id', 'note_number', 'provider', 'provider_name',
            'original_transfer', 'original_transfer_info',
            'amount', 'applied_amount', 'available_amount',
            'issue_date', 'received_date', 'reason', 'reason_display',
            'reason_detail', 'status', 'status_display', 'pdf_file',
            'voided_at', 'voided_by', 'voided_by_name', 'void_reason',
            'applications', 'pending_transfers',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_original_transfer_info(self, obj):
        if obj.original_transfer:
            return {
                'id': obj.original_transfer.id,
                'invoice_number': obj.original_transfer.invoice_number,
                'description': obj.original_transfer.description,
                'amount': str(obj.original_transfer.amount),
                'balance': str(obj.original_transfer.balance)
            }
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_voided_by_name(self, obj):
        if obj.voided_by:
            full_name = f"{obj.voided_by.first_name} {obj.voided_by.last_name}".strip()
            return full_name if full_name else obj.voided_by.username
        return None

    def get_applications(self, obj):
        applications = obj.applications.filter(is_deleted=False).select_related(
            'transfer', 'transfer__service_order', 'applied_by'
        ).order_by('-applied_at')

        return [{
            'id': app.id,
            'transfer_id': app.transfer.id,
            'transfer_description': app.transfer.description,
            'transfer_invoice_number': app.transfer.invoice_number,
            'service_order_number': app.transfer.service_order.order_number if app.transfer.service_order else None,
            'amount': str(app.amount),
            'applied_at': app.applied_at,
            'applied_by_name': self._get_user_name(app.applied_by),
            'notes': app.notes
        } for app in applications]

    def get_pending_transfers(self, obj):
        """Retorna facturas del proveedor con saldo pendiente"""
        if obj.status == 'anulada' or obj.available_amount <= 0:
            return []

        transfers = Transfer.objects.filter(
            provider=obj.provider,
            balance__gt=0,
            is_deleted=False
        ).exclude(
            status='pagado'
        ).select_related('service_order').order_by('-transaction_date')[:20]

        return [{
            'id': t.id,
            'description': t.description,
            'invoice_number': t.invoice_number,
            'amount': str(t.amount),
            'balance': str(t.balance),
            'service_order_number': t.service_order.order_number if t.service_order else None,
            'transaction_date': t.transaction_date
        } for t in transfers]

    def _get_user_name(self, user):
        if user:
            full_name = f"{user.first_name} {user.last_name}".strip()
            return full_name if full_name else user.username
        return None


class ProviderCreditNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear NC"""

    class Meta:
        model = ProviderCreditNote
        fields = [
            'id', 'provider', 'original_transfer', 'note_number', 'amount', 'issue_date',
            'received_date', 'reason', 'reason_detail', 'pdf_file'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        # Validar que no exista otra NC con el mismo número para este proveedor
        provider = attrs.get('provider')
        note_number = attrs.get('note_number')
        original_transfer = attrs.get('original_transfer')

        if ProviderCreditNote.objects.filter(
            provider=provider,
            note_number=note_number,
            is_deleted=False
        ).exists():
            raise serializers.ValidationError({
                'note_number': f'Ya existe una nota de crédito con el número {note_number} para este proveedor'
            })

        # Validar que el transfer pertenece al mismo proveedor
        if original_transfer and original_transfer.provider != provider:
            raise serializers.ValidationError({
                'original_transfer': 'La factura seleccionada no pertenece al proveedor indicado'
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ApplyCreditNoteSerializer(serializers.Serializer):
    """Serializer para aplicar una NC a una o más facturas"""
    applications = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text="Lista de aplicaciones: [{'transfer_id': 1, 'amount': 100.00, 'notes': ''}]"
    )

    def validate_applications(self, value):
        for app in value:
            if 'transfer_id' not in app:
                raise serializers.ValidationError("Cada aplicación debe tener 'transfer_id'")
            if 'amount' not in app:
                raise serializers.ValidationError("Cada aplicación debe tener 'amount'")
            try:
                from decimal import Decimal
                amount = Decimal(str(app['amount']))
                if amount <= 0:
                    raise serializers.ValidationError("El monto debe ser mayor a cero")
            except:
                raise serializers.ValidationError("Monto inválido")
        return value
