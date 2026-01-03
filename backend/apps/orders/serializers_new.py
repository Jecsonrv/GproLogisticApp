"""
Serializers completos para Órdenes de Servicio, Cobros y Facturación
"""
from rest_framework import serializers
from django.db.models import Sum
from decimal import Decimal
from .models import (
    ServiceOrder, OrderDocument, OrderCharge,
    Invoice, InvoicePayment, OrderHistory
)
from apps.transfers.models import Transfer
from apps.catalogs.models import Service
from apps.clients.models import Client
from apps.users.models import Notification


class OrderDocumentSerializer(serializers.ModelSerializer):
    """Serializer para documentos adjuntos a OS"""
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, allow_null=True)

    class Meta:
        model = OrderDocument
        fields = [
            'id', 'order', 'document_type', 'document_type_display', 'file', 'file_url', 'file_name',
            'file_size', 'description', 'uploaded_by', 'uploaded_by_username', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'file_url', 'file_name', 'file_size', 'document_type_display', 'uploaded_by_username']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return None

    def get_file_size(self, obj):
        if obj.file:
            return obj.file.size
        return 0


class OrderChargeSerializer(serializers.ModelSerializer):
    """Serializer para cobros de una OS"""
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_code = serializers.CharField(source='service.code', read_only=True)
    # Campos calculados para el frontend
    amount = serializers.DecimalField(source='subtotal', max_digits=15, decimal_places=2, read_only=True)
    # Información de facturación
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True, allow_null=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)
    notes = serializers.CharField(source='description', read_only=True)

    class Meta:
        model = OrderCharge
        fields = [
            'id', 'service_order', 'service', 'service_name', 'service_code',
            'description', 'notes', 'quantity', 'unit_price', 'discount',
            'iva_type', 'subtotal', 'amount', 'iva_amount', 'total',
            'invoice_id', 'invoice_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subtotal', 'amount', 'iva_amount', 'total',
            'created_at', 'updated_at', 'service_name', 'service_code',
            'invoice_id', 'invoice_number', 'notes'
        ]


class ServiceOrderListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de OS"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    customs_agent_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    def get_customs_agent_name(self, obj):
        if obj.customs_agent:
            return obj.customs_agent.get_full_name() or obj.customs_agent.username
        return None
    total_amount = serializers.SerializerMethodField()
    total_services = serializers.SerializerMethodField()
    total_third_party = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'order_number', 'client', 'client_name',
            'customs_agent_name', 'duca', 'bl_reference',
            'eta', 'mes', 'status', 'status_display', 'facturado',
            'total_services', 'total_third_party', 'total_amount',
            'created_at'
        ]

    def get_total_services(self, obj):
        return float(obj.get_total_services())

    def get_total_third_party(self, obj):
        return float(obj.get_total_third_party())

    def get_total_amount(self, obj):
        return float(obj.get_total_amount())


class ServiceOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de OS"""
    # Información relacionada
    documents = OrderDocumentSerializer(many=True, read_only=True)
    charges = OrderChargeSerializer(many=True, read_only=True)

    # Nombres de relaciones
    client_name = serializers.CharField(source='client.name', read_only=True)
    sub_client_name = serializers.CharField(source='sub_client.name', read_only=True, allow_null=True)
    shipment_type_name = serializers.CharField(source='shipment_type.name', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    customs_name = serializers.CharField(source='customs.name', read_only=True, allow_null=True)
    customs_agent_name = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    
    # Información del cliente para facturación
    client_payment_condition = serializers.CharField(source='client.payment_condition', read_only=True)
    client_credit_days = serializers.IntegerField(source='client.credit_days', read_only=True)
    client_credit_limit = serializers.DecimalField(source='client.credit_limit', max_digits=15, decimal_places=2, read_only=True)
    # Clasificación fiscal del cliente
    client_taxpayer_type = serializers.CharField(source='client.taxpayer_type', read_only=True)
    client_taxpayer_type_display = serializers.CharField(source='client.get_taxpayer_type_display', read_only=True)
    client_is_gran_contribuyente = serializers.BooleanField(source='client.is_gran_contribuyente', read_only=True)  # Legacy
    client_type = serializers.CharField(source='client.client_type', read_only=True)
    
    def get_customs_agent_name(self, obj):
        if obj.customs_agent:
            return obj.customs_agent.get_full_name() or obj.customs_agent.username
        return None
    closed_by_username = serializers.CharField(source='closed_by.username', read_only=True, allow_null=True)

    # Displays
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Totales calculados
    total_services = serializers.SerializerMethodField()
    total_third_party = serializers.SerializerMethodField()
    total_direct_costs = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    total_transfers = serializers.SerializerMethodField()

    # Desglose fiscal de servicios (para switch Neto/Con IVA)
    services_fiscal_breakdown = serializers.SerializerMethodField()
    # Desglose fiscal de gastos terceros
    third_party_fiscal_breakdown = serializers.SerializerMethodField()
    # Resumen fiscal consolidado
    fiscal_summary = serializers.SerializerMethodField()

    # Métricas de rentabilidad
    profit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()

    # Información de transferencias
    transfers_summary = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'order_number', 'client', 'client_name',
            'client_payment_condition', 'client_credit_days', 'client_credit_limit',
            'client_taxpayer_type', 'client_taxpayer_type_display', 'client_is_gran_contribuyente', 'client_type',
            'sub_client', 'sub_client_name',
            'shipment_type', 'shipment_type_name',
            'provider', 'provider_name',
            'customs_agent', 'customs_agent_name',
            'purchase_order', 'bl_reference', 'eta', 'duca', 'customs', 'customs_name', 'notes',
            'status', 'status_display', 'facturado', 'mes',
            'created_by', 'created_by_username',
            'closed_by', 'closed_by_username', 'closed_at',
            'created_at', 'updated_at',
            'documents', 'charges',
            'total_services', 'total_third_party', 'total_direct_costs', 'total_amount',
            'total_transfers', 'transfers_summary',
            'services_fiscal_breakdown', 'third_party_fiscal_breakdown', 'fiscal_summary',
            'profit', 'profit_margin'
        ]
        read_only_fields = [
            'id', 'order_number', 'mes', 'created_at', 'updated_at',
            'closed_at', 'documents', 'charges',
            'client_name', 'sub_client_name', 'shipment_type_name',
            'client_payment_condition', 'client_credit_days', 'client_credit_limit',
            'client_taxpayer_type', 'client_taxpayer_type_display', 'client_is_gran_contribuyente', 'client_type',
            'provider_name', 'customs_agent_name',
            'created_by_username', 'closed_by_username', 'status_display',
            'total_services', 'total_third_party', 'total_direct_costs', 'total_amount',
            'total_transfers', 'transfers_summary',
            'services_fiscal_breakdown', 'third_party_fiscal_breakdown', 'fiscal_summary',
            'profit', 'profit_margin'
        ]

    def get_total_services(self, obj):
        return float(obj.get_total_services())

    def get_total_third_party(self, obj):
        return float(obj.get_total_third_party())

    def get_total_direct_costs(self, obj):
        """Total de costos directos (no facturables al cliente)"""
        return float(obj.get_total_direct_costs())

    def get_total_amount(self, obj):
        return float(obj.get_total_amount())

    def get_total_transfers(self, obj):
        return obj.transfers.aggregate(Sum('amount'))['amount__sum'] or 0

    def get_profit(self, obj):
        """Ganancia bruta de la OS (Ingresos por Servicios - Costos Directos)"""
        return float(obj.get_profit())

    def get_profit_margin(self, obj):
        """Margen de ganancia como porcentaje"""
        return float(obj.get_profit_margin())

    def get_transfers_summary(self, obj):
        """Resumen de transferencias por tipo (incluye valores actuales y legacy)"""
        return {
            'cargos_cliente': obj.transfers.filter(transfer_type__in=['cargos', 'terceros']).aggregate(Sum('amount'))['amount__sum'] or 0,
            'costos_directos': obj.transfers.filter(transfer_type__in=['costos', 'propios']).aggregate(Sum('amount'))['amount__sum'] or 0,
            'admin': obj.transfers.filter(transfer_type='admin').aggregate(Sum('amount'))['amount__sum'] or 0,
        }

    def get_services_fiscal_breakdown(self, obj):
        """
        Desglose fiscal de servicios (OrderCharge) para cálculos correctos en frontend.

        Retorna subtotal y IVA separados por tipo fiscal:
        - gravado: servicios con IVA 13%
        - no_sujeto: servicios sin IVA (exportación, etc.)
        - exento: servicios exentos de IVA
        """
        charges = obj.charges.filter(is_deleted=False)

        # Totales por tipo fiscal
        gravado_subtotal = Decimal('0.00')
        gravado_iva = Decimal('0.00')
        no_sujeto_subtotal = Decimal('0.00')
        exento_subtotal = Decimal('0.00')

        for charge in charges:
            iva_type = getattr(charge, 'iva_type', 'gravado')
            if iva_type == 'gravado':
                gravado_subtotal += charge.subtotal
                gravado_iva += charge.iva_amount
            elif iva_type == 'no_sujeto':
                no_sujeto_subtotal += charge.subtotal
            else:  # exento
                exento_subtotal += charge.subtotal

        total_subtotal = gravado_subtotal + no_sujeto_subtotal + exento_subtotal
        total_iva = gravado_iva
        total_con_iva = total_subtotal + total_iva

        return {
            'gravado': {
                'subtotal': float(gravado_subtotal),
                'iva': float(gravado_iva),
                'total': float(gravado_subtotal + gravado_iva)
            },
            'no_sujeto': {
                'subtotal': float(no_sujeto_subtotal),
                'iva': 0.0,
                'total': float(no_sujeto_subtotal)
            },
            'exento': {
                'subtotal': float(exento_subtotal),
                'iva': 0.0,
                'total': float(exento_subtotal)
            },
            'totals': {
                'subtotal_neto': float(total_subtotal),
                'iva_total': float(total_iva),
                'total_con_iva': float(total_con_iva)
            }
        }

    def get_third_party_fiscal_breakdown(self, obj):
        """
        Desglose fiscal de gastos a terceros (Transfer) para cálculos correctos.

        Considera el margen de utilidad y el tipo de IVA configurado para cobro al cliente.
        """
        transfers = obj.transfers.filter(
            transfer_type__in=['cargos', 'terceros', 'costos'],
            is_deleted=False
        )

        gravado_subtotal = Decimal('0.00')
        gravado_iva = Decimal('0.00')
        no_sujeto_subtotal = Decimal('0.00')

        for transfer in transfers:
            base_price = transfer.get_customer_base_price()
            iva_type = getattr(transfer, 'customer_iva_type', 'no_sujeto')

            if iva_type == 'gravado':
                gravado_subtotal += base_price
                gravado_iva += transfer.get_customer_iva_amount()
            else:
                no_sujeto_subtotal += base_price

        total_subtotal = gravado_subtotal + no_sujeto_subtotal
        total_iva = gravado_iva
        total_con_iva = total_subtotal + total_iva

        return {
            'gravado': {
                'subtotal': float(gravado_subtotal),
                'iva': float(gravado_iva),
                'total': float(gravado_subtotal + gravado_iva)
            },
            'no_sujeto': {
                'subtotal': float(no_sujeto_subtotal),
                'iva': 0.0,
                'total': float(no_sujeto_subtotal)
            },
            'totals': {
                'subtotal_neto': float(total_subtotal),
                'iva_total': float(total_iva),
                'total_con_iva': float(total_con_iva)
            }
        }

    def get_fiscal_summary(self, obj):
        """
        Resumen fiscal consolidado de la orden (servicios + gastos terceros).

        Proporciona los totales correctos para el switch Neto/Con IVA en el frontend.
        """
        services = self.get_services_fiscal_breakdown(obj)
        third_party = self.get_third_party_fiscal_breakdown(obj)

        # Consolidar totales
        total_subtotal = (
            Decimal(str(services['totals']['subtotal_neto'])) +
            Decimal(str(third_party['totals']['subtotal_neto']))
        )
        total_iva = (
            Decimal(str(services['totals']['iva_total'])) +
            Decimal(str(third_party['totals']['iva_total']))
        )
        total_con_iva = total_subtotal + total_iva

        return {
            'services': services['totals'],
            'third_party': third_party['totals'],
            'consolidated': {
                'subtotal_neto': float(total_subtotal),
                'iva_total': float(total_iva),
                'total_con_iva': float(total_con_iva)
            }
        }


class ServiceOrderCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear OS"""

    class Meta:
        model = ServiceOrder
        fields = [
            'client', 'sub_client', 'shipment_type', 'provider',
            'customs_agent', 'purchase_order', 'bl_reference',
            'eta', 'duca'
        ]

    def validate_client(self, value):
        """
        Validar límite de crédito del cliente.
        En lugar de prohibir la creación, se notifica a los administradores.
        """
        client = value
        if client.payment_condition == 'credito':
            credit_available = client.get_credit_available()
            if credit_available <= 0:
                # El cliente ha excedido su límite, creamos notificación para admins
                credit_used = client.get_credit_used()
                Notification.notify_all_admins(
                    title="Límite de Crédito Excedido",
                    message=f"El cliente {client.name} ha excedido su límite de crédito (${client.credit_limit}). "
                            f"Crédito usado: ${credit_used:.2f}. Se ha permitido la creación de la OS.",
                    notification_type='warning',
                    category='client',
                    related_object=client
                )
        return value

    def validate_duca(self, value):
        """Validar que el DUCA no esté duplicado (solo si no está vacío)"""
        if value and value.strip():
            if ServiceOrder.objects.filter(duca=value).exists():
                raise serializers.ValidationError(
                    f"Ya existe una OS con el DUCA {value}"
                )
        return value

    def create(self, validated_data):
        """Crear OS y asignar usuario creador"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos/abonos de facturas"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)

    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'invoice', 'payment_date', 'amount',
            'payment_method', 'payment_method_display',
            'reference_number', 'bank', 'bank_name', 'notes', 'receipt_file',
            'created_by', 'created_by_username', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'created_by_username', 'created_by_name', 'payment_method_display', 'bank_name'
        ]

    def create(self, validated_data):
        """Crear pago y asignar usuario"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de facturas"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    days_overdue = serializers.SerializerMethodField()
    is_editable = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'service_order_number', 'client_name',
            'invoice_type', 'invoice_type_display',
            'issue_date', 'due_date', 'total_amount',
            'paid_amount', 'balance', 'status', 'status_display',
            'is_dte_issued', 'dte_number', 'is_editable',
            'days_overdue'
        ]

    def get_days_overdue(self, obj):
        return obj.days_overdue()
    
    def get_is_editable(self, obj):
        """Una factura es editable si no tiene DTE emitido"""
        return not obj.is_dte_issued


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de factura"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    service_order_data = ServiceOrderListSerializer(source='service_order', read_only=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    payment_condition_display = serializers.CharField(source='get_payment_condition_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    days_overdue = serializers.SerializerMethodField()
    is_editable = serializers.SerializerMethodField()
    
    # Fiscal fields
    client_is_gran_contribuyente = serializers.BooleanField(source='service_order.client.is_gran_contribuyente', read_only=True)
    
    # Items facturados
    billed_charges = serializers.SerializerMethodField()
    billed_expenses = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'service_order', 'service_order_number', 'service_order_data',
            'client_name', 'client_is_gran_contribuyente',
            'invoice_number', 'invoice_type', 'invoice_type_display',
            'issue_date', 'due_date',
            'subtotal_services', 'iva_services', 'total_services',
            'subtotal_third_party', 'subtotal_neto', 'iva_total', 'retencion',
            'total_amount',
            'paid_amount', 'credited_amount', 'balance',
            'status', 'status_display',
            'payment_condition', 'payment_condition_display',
            'is_dte_issued', 'dte_number', 'is_editable',
            'dte_file', 'pdf_file', 'notes',
            'payments', 'billed_charges', 'billed_expenses',
            'days_overdue',
            'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'balance',
            'service_order_number', 'service_order_data', 'client_name',
            'status_display', 'invoice_type_display', 'payment_condition_display',
            'created_by_username', 'days_overdue', 'payments',
            'billed_charges', 'billed_expenses', 'is_editable',
            'created_at', 'updated_at'
        ]

    def get_days_overdue(self, obj):
        return obj.days_overdue()
    
    def get_is_editable(self, obj):
        """Una factura es editable si no tiene DTE emitido"""
        return not obj.is_dte_issued
    
    def get_billed_charges(self, obj):
        """Obtener los cargos/servicios vinculados a esta factura"""
        charges = obj.charges.all().select_related('service')
        return [{
            'id': c.id,
            'service_id': c.service_id,
            'service_name': c.service.name,
            'description': c.description,
            'quantity': c.quantity,
            'unit_price': str(c.unit_price),
            'discount': str(c.discount),
            'subtotal': str(c.subtotal),
            'iva_amount': str(c.iva_amount),
            'total': str(c.total),
            'iva_type': c.iva_type,
            'applies_iva': c.iva_type == 'gravado'
        } for c in charges]
    
    def get_billed_expenses(self, obj):
        """Obtener los gastos vinculados a esta factura"""
        from decimal import Decimal
        transfers = obj.billed_transfers.all().select_related('provider')
        result = []
        for t in transfers:
            markup = t.customer_markup_percentage or Decimal('0.00')
            cost = t.amount
            base_price = cost * (1 + markup / Decimal('100.00'))
            
            if t.customer_applies_iva:
                iva = base_price * Decimal('0.13')
            else:
                iva = Decimal('0.00')
            
            result.append({
                'id': t.id,
                'description': t.description,
                'provider_name': t.provider.name if t.provider else 'N/A',
                'cost': str(t.amount),
                'markup_percentage': str(markup),
                'applies_iva': t.customer_applies_iva,
                'subtotal': str(base_price),
                'iva_amount': str(iva),
                'total': str(base_price + iva)
            })
        return result


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear facturas"""
    calculate_from_os = serializers.BooleanField(write_only=True, default=True)

    class Meta:
        model = Invoice
        fields = [
            'service_order', 'invoice_type', 'issue_date',
            'payment_condition', 'notes', 'calculate_from_os'
        ]

    def create(self, validated_data):
        """Crear factura y calcular totales automáticamente"""
        calculate_from_os = validated_data.pop('calculate_from_os', True)
        request = self.context.get('request')

        if request and request.user:
            validated_data['created_by'] = request.user

        invoice = super().create(validated_data)

        if calculate_from_os:
            invoice.calculate_totals()

        return invoice


class OrderHistorySerializer(serializers.ModelSerializer):
    """Serializer para el historial de una Orden de Servicio"""
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True, allow_null=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    
    class Meta:
        model = OrderHistory
        fields = [
            'id', 'service_order', 'event_type', 'event_type_display',
            'description', 'user', 'user_name', 'user_username',
            'created_at', 'metadata'
        ]
        read_only_fields = ['id', 'created_at', 'event_type_display', 'user_name', 'user_username']
