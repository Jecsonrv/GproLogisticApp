"""
Regresiones de la contención de bloqueos que provocaba

    psycopg2.errors.QueryCanceled: canceling statement due to statement timeout
    CONTEXT: while updating tuple (...) in relation "orders_invoice"

al crear/editar facturas de forma concurrente.
"""

from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import OperationalError
from django.test import SimpleTestCase, TestCase

from apps.catalogs.models import ShipmentType
from apps.clients.models import Client
from apps.core.exceptions import custom_exception_handler
from apps.core.models import DocumentSequence
from apps.core.sequences import next_number
from apps.core.storage import stage_upload
from apps.orders.models import Invoice, InvoicePayment, ServiceOrder


class NextNumberTests(TestCase):
    """El correlativo se reserva sobre la fila contador, no sobre la tabla."""

    def test_reserva_correlativos_consecutivos(self):
        self.assertEqual(next_number('demo:2026'), 1)
        self.assertEqual(next_number('demo:2026'), 2)
        self.assertEqual(next_number('demo:2026'), 3)
        self.assertEqual(DocumentSequence.objects.get(key='demo:2026').last_number, 3)

    def test_series_independientes(self):
        self.assertEqual(next_number('a:2026'), 1)
        self.assertEqual(next_number('b:2026'), 1)

    def test_respeta_numeros_preexistentes(self):
        """Un número cargado manualmente no debe reutilizarse."""
        self.assertEqual(next_number('demo:2026', lambda: 40), 41)
        # Ya registrado en el contador: no vuelve atrás aunque el máximo baje.
        self.assertEqual(next_number('demo:2026', lambda: 0), 42)


class InvoiceNumberingTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(name='Cliente Seq', payment_condition='contado')
        self.shipment = ShipmentType.objects.create(name='Maritimo Seq')

    def _order(self):
        return ServiceOrder.objects.create(client=self.client_obj, shipment_type=self.shipment)

    def test_correlativos_de_factura_no_se_repiten(self):
        numbers = [
            Invoice.objects.create(service_order=self._order(), total_amount=Decimal('10.00')).invoice_number
            for _ in range(5)
        ]
        self.assertEqual(len(set(numbers)), 5)
        self.assertTrue(all(n.startswith('PRE-') for n in numbers))

    def test_correlativos_de_os_no_se_repiten(self):
        numbers = [self._order().order_number for _ in range(5)]
        self.assertEqual(len(set(numbers)), 5)


class StageUploadTests(TestCase):
    """La subida ocurre fuera de la transacción y no se repite al guardar."""

    def setUp(self):
        client_obj = Client.objects.create(name='Cliente Upload', payment_condition='contado')
        shipment = ShipmentType.objects.create(name='Aereo Upload')
        order = ServiceOrder.objects.create(client=client_obj, shipment_type=shipment)
        self.invoice = Invoice.objects.create(service_order=order, total_amount=Decimal('100.00'))

    def test_sin_archivo_devuelve_none(self):
        self.assertIsNone(stage_upload(InvoicePayment, 'receipt_file', None))

    def test_sube_una_sola_vez_y_queda_enlazado(self):
        storage = InvoicePayment._meta.get_field('receipt_file').storage
        writes = []
        original_save = storage._save

        def counting_save(name, content):
            writes.append(name)
            return original_save(name, content)

        storage._save = counting_save
        try:
            staged = stage_upload(
                InvoicePayment, 'receipt_file',
                SimpleUploadedFile('rec.pdf', b'%PDF-1.4 ok', content_type='application/pdf'),
            )
            self.assertEqual(len(writes), 1, 'stage_upload debe escribir una vez')

            payment = InvoicePayment.objects.create(
                invoice=self.invoice, amount=Decimal('10.00'),
                payment_date='2026-01-01', payment_method='transferencia',
                receipt_file=staged,
            )
            # Asignar el nombre no debe volver a subir el archivo.
            self.assertEqual(len(writes), 1, 'el save no debe re-subir el archivo')
        finally:
            storage._save = original_save

        payment.refresh_from_db()
        self.assertEqual(payment.receipt_file.name, staged)
        self.assertEqual(payment.receipt_file.read(), b'%PDF-1.4 ok')


class LockContentionResponseTests(SimpleTestCase):
    """La contención de bloqueos responde 409, no un 500 opaco."""

    class _View:
        pass

    def _handle(self, pgcode):
        cause = type('Cause', (Exception,), {})()
        cause.pgcode = pgcode
        exc = OperationalError('canceling statement')
        exc.__cause__ = cause
        return custom_exception_handler(exc, {'view': self._View()})

    def test_statement_timeout_devuelve_409(self):
        response = self._handle('57014')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'resource_locked')

    def test_lock_timeout_devuelve_409(self):
        self.assertEqual(self._handle('55P03').status_code, 409)

    def test_deadlock_devuelve_409(self):
        self.assertEqual(self._handle('40P01').status_code, 409)

    def test_otros_errores_siguen_siendo_500(self):
        response = self._handle('08006')
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data['code'], 'internal_server_error')
