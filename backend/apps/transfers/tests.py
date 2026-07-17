from decimal import Decimal
import io
import zipfile

from django.core.management import call_command
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogs.models import Provider, ShipmentType, Service
from apps.clients.models import Client
from apps.orders.models import Invoice, OrderCharge, OrderHistory, ServiceOrder
from apps.transfers.models import DirectCostAllocation, ProviderInvoice, ProviderInvoicePayment, Transfer, TransferPayment
from apps.users.models import User


class DirectCostSecurityRegressionTests(APITestCase):
    def setUp(self):
        self.user_operativo = User.objects.create_user(
            username='operativo_user',
            password='test1234',
            role='operativo'
        )
        self.user_operativo2 = User.objects.create_user(
            username='operativo2_user',
            password='test1234',
            role='operativo2'
        )

        self.client_company = Client.objects.create(
            name='Cliente QA',
            payment_condition='credito'
        )
        self.shipment_type = ShipmentType.objects.create(name='Maritimo')
        self.provider = Provider.objects.create(name='Proveedor QA')
        self.service = Service.objects.create(name='Servicio QA', default_price=Decimal('100.00'))

        self.service_order = ServiceOrder.objects.create(
            client=self.client_company,
            shipment_type=self.shipment_type,
            created_by=self.user_operativo2,
        )

        self.charge = OrderCharge.objects.create(
            service_order=self.service_order,
            service=self.service,
            quantity=1,
            unit_price=Decimal('100.00'),
        )

        self.provider_invoice = ProviderInvoice.objects.create(
            invoice_number='CD-001',
            provider=self.provider,
            service_order=self.service_order,
            total_amount=Decimal('80.00'),
            created_by=self.user_operativo2,
        )

        self.allocation = DirectCostAllocation.objects.create(
            provider_invoice=self.provider_invoice,
            order_charge=self.charge,
            cost_amount=Decimal('80.00'),
            created_by=self.user_operativo2,
        )

        self.invoice = Invoice.objects.create(
            service_order=self.service_order,
            total_amount=Decimal('113.00'),
            created_by=self.user_operativo2,
        )

        self.charge.invoice = self.invoice
        self.charge.billing_status = 'facturado'
        self.charge.save(skip_order_validation=True)

    def test_allocation_cannot_be_deleted_if_service_order_has_invoice_history(self):
        # Simula que el cargo fue removido de pre-factura pero la OS ya tuvo facturación.
        self.charge.invoice = None
        self.charge.billing_status = 'disponible'
        self.charge.save(skip_order_validation=True)

        with self.assertRaises(ValidationError):
            self.allocation.delete()

    def test_provider_invoice_cannot_be_deleted_if_service_order_has_invoice_history(self):
        self.charge.invoice = None
        self.charge.billing_status = 'disponible'
        self.charge.save(skip_order_validation=True)

        with self.assertRaises(ValidationError):
            self.provider_invoice.delete()

    def test_charge_delete_still_blocked_when_direct_cost_has_invoice_history(self):
        # Aunque el cargo ya no esté facturado, si la OS tuvo facturación previa,
        # no debe romperse la trazabilidad de costos directos.
        self.client.force_authenticate(user=self.user_operativo2)
        self.charge.invoice = None
        self.charge.billing_status = 'disponible'
        self.charge.save(skip_order_validation=True)

        response = self.client.delete(
            reverse('charge-detail', kwargs={'pk': self.charge.id})
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'DIRECT_COST_LOCKED')

    def test_charge_delete_auto_unlinks_direct_cost_when_no_invoice_history(self):
        self.client.force_authenticate(user=self.user_operativo2)

        fresh_order = ServiceOrder.objects.create(
            client=self.client_company,
            shipment_type=self.shipment_type,
            created_by=self.user_operativo2,
        )
        fresh_charge = OrderCharge.objects.create(
            service_order=fresh_order,
            service=self.service,
            quantity=1,
            unit_price=Decimal('140.00'),
        )
        fresh_provider_invoice = ProviderInvoice.objects.create(
            invoice_number='CD-003',
            provider=self.provider,
            service_order=fresh_order,
            total_amount=Decimal('95.00'),
            created_by=self.user_operativo2,
        )
        fresh_allocation = DirectCostAllocation.objects.create(
            provider_invoice=fresh_provider_invoice,
            order_charge=fresh_charge,
            cost_amount=Decimal('95.00'),
            created_by=self.user_operativo2,
        )

        response = self.client.delete(
            reverse('charge-detail', kwargs={'pk': fresh_charge.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        fresh_charge.refresh_from_db()
        fresh_allocation.refresh_from_db()
        fresh_provider_invoice.refresh_from_db()
        self.assertTrue(fresh_charge.is_deleted)
        self.assertTrue(fresh_allocation.is_deleted)
        self.assertEqual(fresh_provider_invoice.allocated_amount, Decimal('0.00'))

    def test_remove_item_blocks_direct_cost_charge_even_for_operativo2(self):
        self.client.force_authenticate(user=self.user_operativo2)
        url = reverse('invoice-remove-item', kwargs={'pk': self.invoice.id})

        response = self.client.post(
            url,
            {'item_type': 'charge', 'item_id': self.charge.id},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'DIRECT_COST_LOCKED')

    def test_remove_item_requires_operativo2_or_admin(self):
        self.client.force_authenticate(user=self.user_operativo)
        url = reverse('invoice-remove-item', kwargs={'pk': self.invoice.id})

        response = self.client.post(
            url,
            {'item_type': 'charge', 'item_id': self.charge.id},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invoice_destroy_is_blocked_when_contains_direct_cost_charges(self):
        self.client.force_authenticate(user=self.user_operativo2)

        response = self.client.delete(
            reverse('invoice-detail', kwargs={'pk': self.invoice.id})
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'DIRECT_COST_LOCKED')

    def test_reverse_prefactura_requires_reason(self):
        self.client.force_authenticate(user=self.user_operativo2)

        response = self.client.post(
            reverse('invoice-reverse-prefactura', kwargs={'pk': self.invoice.id}),
            {},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'REVERSAL_REASON_REQUIRED')

    def test_reverse_prefactura_releases_items_and_allows_followup_corrections(self):
        self.client.force_authenticate(user=self.user_operativo2)

        response = self.client.post(
            reverse('invoice-reverse-prefactura', kwargs={'pk': self.invoice.id}),
            {'reason': 'Error en asignación de costo'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Invoice.objects.filter(pk=self.invoice.id).exists())

        self.charge.refresh_from_db()
        self.assertIsNone(self.charge.invoice_id)
        self.assertEqual(self.charge.billing_status, 'disponible')

        self.allocation.refresh_from_db()
        self.assertFalse(self.allocation.is_deleted)

        with self.assertRaises(ValidationError):
            self.provider_invoice.delete()

        self.allocation.delete()
        self.charge.refresh_from_db()
        self.assertFalse(self.charge.is_third_party_service)

        self.provider_invoice.delete()
        self.provider_invoice.refresh_from_db()
        self.assertTrue(self.provider_invoice.is_deleted)

    def test_provider_invoice_requires_removing_allocations_first(self):
        # Escenario sin historial de facturación: igualmente debe exigirse
        # desmontar la asignación antes de eliminar el costo directo.
        fresh_order = ServiceOrder.objects.create(
            client=self.client_company,
            shipment_type=self.shipment_type,
            created_by=self.user_operativo2,
        )
        fresh_charge = OrderCharge.objects.create(
            service_order=fresh_order,
            service=self.service,
            quantity=1,
            unit_price=Decimal('120.00'),
        )
        fresh_provider_invoice = ProviderInvoice.objects.create(
            invoice_number='CD-002',
            provider=self.provider,
            service_order=fresh_order,
            total_amount=Decimal('90.00'),
            created_by=self.user_operativo2,
        )
        fresh_allocation = DirectCostAllocation.objects.create(
            provider_invoice=fresh_provider_invoice,
            order_charge=fresh_charge,
            cost_amount=Decimal('90.00'),
            created_by=self.user_operativo2,
        )

        with self.assertRaises(ValidationError):
            fresh_provider_invoice.delete()

        fresh_allocation.delete()
        fresh_charge.refresh_from_db()
        self.assertFalse(fresh_charge.is_third_party_service)

        fresh_provider_invoice.delete()
        fresh_provider_invoice.refresh_from_db()
        self.assertTrue(fresh_provider_invoice.is_deleted)

    def test_invoice_list_exposes_direct_cost_reversal_metadata(self):
        self.client.force_authenticate(user=self.user_operativo2)

        response = self.client.get(reverse('invoice-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invoice_row = next((i for i in response.data if i['id'] == self.invoice.id), None)
        self.assertIsNotNone(invoice_row)
        self.assertEqual(invoice_row.get('delete_block_code'), 'DIRECT_COST_LOCKED')
        self.assertFalse(invoice_row.get('can_delete'))
        self.assertTrue(invoice_row.get('requires_reverse_prefactura'))
        self.assertGreaterEqual(invoice_row.get('direct_cost_items_count', 0), 1)

    def test_fix_orphan_third_party_charges_command_normalizes_historical_orphans(self):
        # Simula dato historico inconsistente: servicio marcado como tercerizado
        # pero con asignacion soft-deleted.
        self.allocation.is_deleted = True
        self.allocation.save(update_fields=['is_deleted'])
        self.charge.refresh_from_db()
        self.assertTrue(self.charge.is_third_party_service)

        call_command('fix_orphan_third_party_charges', '--apply')

        self.charge.refresh_from_db()
        self.assertFalse(self.charge.is_third_party_service)

    def test_fix_orphan_command_deactivates_allocation_when_provider_invoice_deleted(self):
        # Simula hueco historico: factura de proveedor eliminada con asignacion activa.
        self.provider_invoice.is_deleted = True
        self.provider_invoice.save(update_fields=['is_deleted'])

        self.allocation.refresh_from_db()
        self.assertFalse(self.allocation.is_deleted)

        call_command('fix_orphan_third_party_charges', '--apply')

        self.allocation.refresh_from_db()
        self.charge.refresh_from_db()
        self.assertTrue(self.allocation.is_deleted)
        self.assertFalse(self.charge.is_third_party_service)


class TransferDocumentExportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='export_docs_user',
            password='test1234',
            role='operativo2',
        )
        self.provider = Provider.objects.create(name='Proveedor Export')

        self.transfer = Transfer.objects.create(
            transfer_type='admin',
            provider=self.provider,
            amount=Decimal('25.00'),
            description='Gasto administrativo exportable',
            invoice_file=SimpleUploadedFile(
                'soporte_admin.pdf',
                b'%PDF-1.4 test admin support',
                content_type='application/pdf',
            ),
            created_by=self.user,
        )

        self.client.force_authenticate(user=self.user)

    def test_export_documents_zip_for_selected_transfer(self):
        url = reverse('transfer-export-documents')

        response = self.client.post(
            url,
            {
                'transfer_ids': [self.transfer.id],
                'provider_invoice_ids': [],
                'only_pdf': True,
                'include_payment_proofs': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')

        with zipfile.ZipFile(io.BytesIO(response.content), 'r') as zip_file:
            names = zip_file.namelist()

        self.assertTrue(any(name.endswith('.pdf') for name in names))
        self.assertTrue(any('transfer_' in name for name in names))

    def test_export_documents_requires_ids(self):
        url = reverse('transfer-export-documents')

        response = self.client.post(
            url,
            {
                'transfer_ids': [],
                'provider_invoice_ids': [],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_export_documents_preview_returns_file_count(self):
        url = reverse('transfer-export-documents')

        response = self.client.post(
            url,
            {
                'transfer_ids': [self.transfer.id],
                'provider_invoice_ids': [],
                'only_pdf': True,
                'include_payment_proofs': True,
                'preview_only': True,
                'max_files': 20,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_files'], 1)
        self.assertEqual(response.data['max_files'], 20)
        self.assertFalse(response.data['exceeds_limit'])

    def test_export_documents_enforces_max_files_limit(self):
        url = reverse('transfer-export-documents')

        extra_ids = []
        for idx in range(2, 22):
            transfer = Transfer.objects.create(
                transfer_type='admin',
                provider=self.provider,
                amount=Decimal('10.00'),
                description=f'Gasto extra {idx}',
                invoice_file=SimpleUploadedFile(
                    f'soporte_extra_{idx}.pdf',
                    b'%PDF-1.4 test extra support',
                    content_type='application/pdf',
                ),
                created_by=self.user,
            )
            extra_ids.append(transfer.id)

        response = self.client.post(
            url,
            {
                'transfer_ids': [self.transfer.id, *extra_ids],
                'provider_invoice_ids': [],
                'only_pdf': True,
                'include_payment_proofs': True,
                'max_files': 20,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'MAX_FILES_EXCEEDED')
        self.assertEqual(response.data.get('max_files'), 20)
        self.assertEqual(response.data.get('total_files'), 21)

    def test_export_documents_includes_payment_proof_for_paid_provider_invoice(self):
        url = reverse('transfer-export-documents')

        client_company = Client.objects.create(
            name='Cliente Export Pago',
            payment_condition='credito'
        )
        shipment_type = ShipmentType.objects.create(name='Terrestre')
        service_order = ServiceOrder.objects.create(
            client=client_company,
            shipment_type=shipment_type,
            created_by=self.user,
        )

        provider_invoice = ProviderInvoice.objects.create(
            invoice_number='PI-EXPORT-001',
            provider=self.provider,
            service_order=service_order,
            total_amount=Decimal('120.00'),
            created_by=self.user,
        )

        ProviderInvoicePayment.objects.create(
            provider_invoice=provider_invoice,
            amount=Decimal('120.00'),
            payment_method='transferencia',
            proof_file=SimpleUploadedFile(
                'comprobante_pago.jpg',
                b'fake-jpg-content',
                content_type='image/jpeg',
            ),
            created_by=self.user,
        )

        response = self.client.post(
            url,
            {
                'transfer_ids': [],
                'provider_invoice_ids': [provider_invoice.id],
                'only_pdf': True,
                'include_payment_proofs': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')

        with zipfile.ZipFile(io.BytesIO(response.content), 'r') as zip_file:
            names = zip_file.namelist()

        self.assertTrue(
            any(name.endswith('.jpg') and '/pagos/' in name for name in names)
        )


class TransferDeletionAuditHistoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='audit_delete_user',
            password='test1234',
            role='operativo2',
        )
        self.provider = Provider.objects.create(name='Proveedor Auditoria')

        self.client_company = Client.objects.create(
            name='Cliente Auditoria',
            payment_condition='credito'
        )
        self.shipment_type = ShipmentType.objects.create(name='Aereo')
        self.service_order = ServiceOrder.objects.create(
            client=self.client_company,
            shipment_type=self.shipment_type,
            created_by=self.user,
        )

        self.client.force_authenticate(user=self.user)

    def test_delete_transfer_registers_history_with_actor(self):
        transfer = Transfer.objects.create(
            transfer_type='admin',
            provider=self.provider,
            service_order=self.service_order,
            amount=Decimal('45.00'),
            description='Gasto para auditoria de eliminación',
            created_by=self.user,
        )

        response = self.client.delete(
            reverse('transfer-detail', kwargs={'pk': transfer.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        event = None
        for candidate in OrderHistory.objects.filter(
            service_order=self.service_order,
            event_type='payment_deleted',
        ).order_by('-created_at'):
            metadata = candidate.metadata or {}
            if (
                metadata.get('source') == 'transfer' and
                metadata.get('transfer_id') == transfer.id
            ):
                event = candidate
                break

        self.assertIsNotNone(event)
        self.assertEqual(event.user, self.user)
        self.assertIn('Gasto eliminado', event.description)

    def test_delete_transfer_payment_registers_history_with_actor(self):
        transfer = Transfer.objects.create(
            transfer_type='admin',
            provider=self.provider,
            service_order=self.service_order,
            amount=Decimal('120.00'),
            status='aprobado',
            description='Gasto con pago para auditoria',
            created_by=self.user,
        )

        payment = TransferPayment.objects.create(
            transfer=transfer,
            amount=Decimal('60.00'),
            payment_method='transferencia',
            reference_number='AUD-DEL-001',
            created_by=self.user,
        )

        response = self.client.delete(
            reverse('transfer-payment-detail', kwargs={'pk': payment.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        event = None
        for candidate in OrderHistory.objects.filter(
            service_order=self.service_order,
            event_type='payment_deleted',
        ).order_by('-created_at'):
            metadata = candidate.metadata or {}
            if (
                metadata.get('source') == 'transfer_payment' and
                metadata.get('payment_id') == payment.id
            ):
                event = candidate
                break

        self.assertIsNotNone(event)
        self.assertEqual(event.user, self.user)
        self.assertIn('Pago a proveedor eliminado', event.description)


class ListEndpointQueryCountTests(APITestCase):
    """
    Tests de regresión de rendimiento: los listados no deben tener consultas N+1.

    Patrón: se mide el número de queries con pocos registros y con el doble de
    registros; si el listado está bien optimizado (select_related /
    prefetch_related + anotaciones), el conteo debe ser idéntico en ambos casos.
    """

    @classmethod
    def setUpTestData(cls):
        from datetime import date
        cls.admin = User.objects.create_user(
            username='admin_qc_test',
            password='x',
            role='admin',
        )
        cls.provider_a = Provider.objects.create(name='Proveedor QC A')
        cls.provider_b = Provider.objects.create(name='Proveedor QC B')
        cls.client_obj = Client.objects.create(name='Cliente QC Test')
        cls.shipment_type = ShipmentType.objects.create(name='Marítimo QC')
        cls.service_order = ServiceOrder.objects.create(
            client=cls.client_obj,
            shipment_type=cls.shipment_type,
            created_by=cls.admin,
        )

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def _create_transfer(self, provider, idx):
        from datetime import date
        from apps.transfers.models import ProviderCreditNote
        transfer = Transfer.objects.create(
            transfer_type='admin',
            provider=provider,
            amount=Decimal('100.00'),
            description=f'Gasto {idx}',
            transaction_date=date(2026, 1, 15),
            created_by=self.admin,
        )
        ProviderCreditNote.objects.create(
            provider=provider,
            original_transfer=transfer,
            note_number=f'NC-QC-{idx}',
            amount=Decimal('10.00'),
            issue_date=date(2026, 1, 20),
            received_date=date(2026, 1, 21),
            reason='otro',
            created_by=self.admin,
        )
        return transfer

    def _create_invoice(self, provider, idx):
        from datetime import date
        return ProviderInvoice.objects.create(
            invoice_number=f'FAC-QC-{idx}',
            provider=provider,
            service_order=self.service_order,
            total_amount=Decimal('200.00'),
            issue_date=date(2026, 1, 15),
            created_by=self.admin,
        )

    def _count_queries(self, url):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return len(ctx.captured_queries)

    def _assert_constant_queries(self, url, create_more):
        first_count = self._count_queries(url)
        create_more()
        second_count = self._count_queries(url)
        self.assertEqual(
            first_count,
            second_count,
            f'{url} tiene consultas N+1: {first_count} queries con pocos '
            f'registros vs {second_count} con más registros',
        )

    def test_transfers_list_has_no_n_plus_one(self):
        for i in range(3):
            self._create_transfer(self.provider_a, i)

        self._assert_constant_queries(
            '/api/transfers/transfers/',
            lambda: [self._create_transfer(self.provider_b, 100 + i) for i in range(3)],
        )

    def test_provider_invoices_list_has_no_n_plus_one(self):
        for i in range(3):
            self._create_invoice(self.provider_a, i)

        self._assert_constant_queries(
            '/api/transfers/provider-invoices/',
            lambda: [self._create_invoice(self.provider_b, 100 + i) for i in range(3)],
        )

    def test_credit_notes_list_has_no_n_plus_one(self):
        for i in range(3):
            self._create_transfer(self.provider_a, i)

        self._assert_constant_queries(
            '/api/transfers/provider-credit-notes/',
            lambda: [self._create_transfer(self.provider_b, 100 + i) for i in range(3)],
        )

    def test_providers_list_has_no_n_plus_one(self):
        self._create_transfer(self.provider_a, 1)
        self._create_invoice(self.provider_a, 1)

        def create_more():
            for i in range(3):
                provider = Provider.objects.create(name=f'Proveedor QC extra {i}')
                self._create_transfer(provider, 200 + i)
                self._create_invoice(provider, 200 + i)

        self._assert_constant_queries('/api/catalogs/providers/', create_more)
