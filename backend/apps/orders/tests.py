from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogs.models import ShipmentType
from apps.clients.models import Client
from apps.orders.models import OrderDocument, ServiceOrder
from apps.users.models import User


class OrderDocumentSecurityTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='doc_tester',
			password='test1234',
			role='operativo2'
		)

		client = Client.objects.create(name='Cliente Docs', payment_condition='credito')
		shipment = ShipmentType.objects.create(name='Terrestre')

		self.order_a = ServiceOrder.objects.create(
			client=client,
			shipment_type=shipment,
			created_by=self.user,
		)
		self.order_b = ServiceOrder.objects.create(
			client=client,
			shipment_type=shipment,
			created_by=self.user,
		)

		self.client.force_authenticate(user=self.user)

	def _dummy_pdf(self, name='test.pdf'):
		return SimpleUploadedFile(
			name,
			b'%PDF-1.4\n%Dummy PDF content',
			content_type='application/pdf'
		)

	def test_cannot_upload_document_to_closed_order(self):
		self.order_a.status = 'cerrada'
		self.order_a.save()

		response = self.client.post(
			reverse('orderdocument-list'),
			{
				'order': self.order_a.id,
				'document_type': 'tramite',
				'description': 'Doc cerrado',
				'file': self._dummy_pdf('closed.pdf'),
			},
			format='multipart'
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('order', response.data)

	def test_cannot_reassign_document_to_another_order(self):
		doc = OrderDocument.objects.create(
			order=self.order_a,
			document_type='tramite',
			description='Original',
			file=self._dummy_pdf('original.pdf'),
			uploaded_by=self.user,
		)

		response = self.client.patch(
			reverse('orderdocument-detail', kwargs={'pk': doc.id}),
			{'order': self.order_b.id},
			format='json'
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('order', response.data)
