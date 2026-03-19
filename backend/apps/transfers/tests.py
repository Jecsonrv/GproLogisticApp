from decimal import Decimal
import io
import zipfile

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogs.models import Provider, ShipmentType, Service
from apps.clients.models import Client
from apps.orders.models import Invoice, OrderCharge, ServiceOrder
from apps.transfers.models import DirectCostAllocation, ProviderInvoice, Transfer
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
