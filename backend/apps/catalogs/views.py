from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    ProviderCategory, Provider, CustomsAgent, Bank, ShipmentType, Customs, SubClient,
    Service, ClientServicePrice
)
from .serializers import (
    ProviderCategorySerializer, ProviderSerializer, CustomsAgentSerializer, BankSerializer,
    ShipmentTypeSerializer, CustomsSerializer, SubClientSerializer,
    ServiceSerializer, ClientServicePriceSerializer
)
from .permissions import IsAdminOrReadOnly
from apps.users.permissions import IsAdminUser, IsOperativo

class ProviderCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProviderCategory.objects.all()
    serializer_class = ProviderCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class ProviderViewSet(viewsets.ModelViewSet):
    queryset = Provider.objects.select_related('category').all()
    serializer_class = ProviderSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'nit', 'email']
    filterset_fields = ['is_active', 'category']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos en listados
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def account_statement(self, request, pk=None):
        from apps.transfers.models import Transfer
        from django.db.models import Sum
        from datetime import datetime

        provider = self.get_object()
        
        # Filtros
        year = request.query_params.get('year', datetime.now().year)
        
        # Transfers pendientes de pago (deuda total)
        unpaid_transfers = Transfer.objects.filter(
            provider=provider,
            status__in=['pendiente', 'aprobado', 'provisionada', 'parcial']
        ).order_by('transaction_date')
        
        total_debt = unpaid_transfers.aggregate(Sum('balance'))['balance__sum'] or 0
        
        # Historial del año seleccionado (pagados y pendientes)
        history = Transfer.objects.filter(
            provider=provider,
            transaction_date__year=year
        ).select_related('service_order').order_by('-transaction_date')
        
        # Aging Analysis
        aging = {
            'current': 0.0,  # 0-30 días
            '1-30': 0.0,     # 31-60 días (1-30 vencido)
            '31-60': 0.0,    # 61-90 días
            '61-90': 0.0,    # 91-120 días
            '90+': 0.0       # > 120 días
        }
        
        today = datetime.now().date()
        
        for transfer in unpaid_transfers:
            # Antigüedad desde la fecha de factura/transacción
            age_days = (today - transfer.transaction_date).days
            amount = float(transfer.balance)
            
            if age_days <= 30:
                aging['current'] += amount
            elif age_days <= 60:
                aging['1-30'] += amount
            elif age_days <= 90:
                aging['31-60'] += amount
            elif age_days <= 120:
                aging['61-90'] += amount
            else:
                aging['90+'] += amount
                
        transfers_data = [{
            'id': t.id,
            'transaction_date': t.transaction_date,
            'service_order': t.service_order.order_number if t.service_order else 'Gastos Admin',
            'service_order_id': t.service_order.id if t.service_order else None,
            'type': t.get_transfer_type_display(),
            'amount': float(t.amount),
            'balance': float(t.balance),
            'paid_amount': float(t.paid_amount),
            'status': t.status,
            'status_display': t.get_status_display(),
            'description': t.description,
            'invoice_number': t.invoice_number or 'S/N',
            'invoice_file': t.invoice_file.url if t.invoice_file else None
        } for t in history]
        
        return Response({
            'provider': {
                'id': provider.id,
                'name': provider.name,
                'nit': provider.nit
            },
            'total_debt': float(total_debt),
            'aging': aging,
            'transfers': transfers_data,
            'year': year
        })

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def export_statement_excel(self, request, pk=None):
        """Exportar estado de cuenta del proveedor a Excel"""
        from apps.transfers.models import Transfer
        from django.http import HttpResponse
        from datetime import datetime
        import openpyxl
        from openpyxl.utils import get_column_letter
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        provider = self.get_object()
        year = request.query_params.get('year', datetime.now().year)

        # Filtros opcionales
        # (Aquí podríamos agregar filtros si fueran necesarios, por ahora exportamos todo lo del año)
        
        # Historial del año seleccionado
        transfers = Transfer.objects.filter(
            provider=provider,
            transaction_date__year=year
        ).select_related('service_order').order_by('transaction_date')

        # Crear workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Estado de Cuenta Proveedor"

        # Estilos profesionales - Diseño GPRO
        header_fill = PatternFill(start_color="0F2E4D", end_color="0F2E4D", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=10)
        title_font = Font(size=16, bold=True, color="0F2E4D")
        subtitle_font = Font(size=12, bold=True, color="1A4C7A")
        label_font = Font(bold=True, color="404040", size=10)
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        currency_format = '"$"#,##0.00'

        # === ENCABEZADO ===
        ws['A1'] = "ESTADO DE CUENTA - PROVEEDOR"
        ws['A1'].font = title_font
        ws.merge_cells('A1:J1')

        ws['A2'] = "GPRO LOGISTIC - Agencia Aduanal"
        ws['A2'].font = Font(size=11, color="666666")
        ws.merge_cells('A2:J2')

        ws['A3'] = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = Font(size=9, italic=True, color="999999")

        # === INFORMACIÓN DEL PROVEEDOR ===
        ws['A5'] = "INFORMACIÓN DEL PROVEEDOR"
        ws['A5'].font = subtitle_font
        ws.merge_cells('A5:J5')

        # Datos del proveedor
        provider_data = [
            ('Proveedor:', provider.name),
            ('NIT:', provider.nit or 'No registrado'),
            ('Email:', provider.email or 'No registrado'),
            ('Teléfono:', provider.phone or 'No registrado'),
        ]

        row = 6
        for label, value in provider_data:
            ws.cell(row=row, column=1, value=label).font = label_font
            ws.cell(row=row, column=2, value=value)
            ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=4)
            row += 1

        # === TABLA DE MOVIMIENTOS ===
        start_row = 12
        ws.cell(row=start_row, column=1, value=f"MOVIMIENTOS DEL AÑO {year}").font = subtitle_font
        ws.merge_cells(f'A{start_row}:J{start_row}')

        # Headers de la tabla
        headers = ['Fecha', 'Factura Prov.', 'Orden de Servicio', 'Tipo', 'Descripción',
                   'Estado', 'Total', 'Pagado', 'Saldo', 'Comprobante']
        header_row = start_row + 1

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=header_row, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        # Datos
        data_row = header_row + 1
        totals = {'total': 0, 'paid': 0, 'balance': 0}

        for transfer in transfers:
            ws.cell(row=data_row, column=1, value=transfer.transaction_date.strftime('%d/%m/%Y')).border = thin_border
            ws.cell(row=data_row, column=2, value=transfer.invoice_number or 'S/N').border = thin_border
            ws.cell(row=data_row, column=3, value=transfer.service_order.order_number if transfer.service_order else 'Gastos Admin').border = thin_border
            ws.cell(row=data_row, column=4, value=transfer.get_transfer_type_display()).border = thin_border
            ws.cell(row=data_row, column=5, value=transfer.description or '').border = thin_border
            ws.cell(row=data_row, column=6, value=transfer.get_status_display()).border = thin_border

            # Montos
            total_cell = ws.cell(row=data_row, column=7, value=float(transfer.amount))
            total_cell.number_format = currency_format
            total_cell.border = thin_border
            total_cell.alignment = Alignment(horizontal='right')

            paid_cell = ws.cell(row=data_row, column=8, value=float(transfer.paid_amount))
            paid_cell.number_format = currency_format
            paid_cell.border = thin_border
            paid_cell.alignment = Alignment(horizontal='right')

            balance_cell = ws.cell(row=data_row, column=9, value=float(transfer.balance))
            balance_cell.number_format = currency_format
            balance_cell.border = thin_border
            balance_cell.alignment = Alignment(horizontal='right')

            ws.cell(row=data_row, column=10, value="Sí" if transfer.invoice_file else "No").border = thin_border
            ws.cell(row=data_row, column=10).alignment = Alignment(horizontal='center')

            totals['total'] += float(transfer.amount)
            totals['paid'] += float(transfer.paid_amount)
            totals['balance'] += float(transfer.balance)

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

        ws.cell(row=data_row, column=10).border = thin_border

        # Ajustar anchos
        column_widths = [12, 15, 18, 15, 30, 12, 15, 15, 15, 10]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col_num)].width = width

        # Generar respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'estado_cuenta_proveedor_{provider.name.replace(" ", "_")}_{year}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        wb.save(response)
        return response

class CustomsAgentViewSet(viewsets.ModelViewSet):
    queryset = CustomsAgent.objects.all()
    serializer_class = CustomsAgentSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'email']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class BankViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de bancos"""
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos en listados
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class ShipmentTypeViewSet(viewsets.ModelViewSet):
    queryset = ShipmentType.objects.all()
    serializer_class = ShipmentTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class CustomsViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de aduanas"""
    queryset = Customs.objects.all()
    serializer_class = CustomsSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code', 'location']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')


class SubClientViewSet(viewsets.ModelViewSet):
    queryset = SubClient.objects.all()
    serializer_class = SubClientSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name']
    filterset_fields = ['is_active', 'parent_client']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')


class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de servicios"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['is_active', 'applies_iva']
    ordering_fields = ['id', 'name', 'default_price']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Endpoint para obtener solo servicios activos (para dropdowns)"""
        services = self.queryset.filter(is_active=True).order_by('name')
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)


class ClientServicePriceViewSet(viewsets.ModelViewSet):
    """ViewSet para tarifario personalizado de clientes"""
    queryset = ClientServicePrice.objects.select_related('client', 'service').all()
    serializer_class = ClientServicePriceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['client__name', 'service__name', 'service__code']
    filterset_fields = ['client', 'service', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'], url_path='by-client/(?P<client_id>[^/.]+)')
    def by_client(self, request, client_id=None):
        """Obtener todos los precios personalizados de un cliente específico"""
        prices = self.queryset.filter(client_id=client_id, is_active=True)
        serializer = self.get_serializer(prices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Crear múltiples precios personalizados a la vez"""
        items = request.data.get('items', [])
        created = []
        errors = []

        for item in items:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'item': item,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors,
            'total_created': len(created),
            'total_errors': len(errors)
        })