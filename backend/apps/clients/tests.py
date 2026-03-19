from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogs.models import ShipmentType
from apps.clients.models import Client
from apps.orders.models import Invoice, ServiceOrder
from apps.users.models import User


class ClientFinancialConsistencyTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='client_finance_user',
			password='test1234',
			role='operativo2',
		)
		self.client.force_authenticate(user=self.user)

		self.client_company = Client.objects.create(
			name='Cliente Consistencia',
			payment_condition='credito',
		)
		self.shipment_type = ShipmentType.objects.create(name='Maritimo')

		self.service_order = ServiceOrder.objects.create(
			client=self.client_company,
			shipment_type=self.shipment_type,
			created_by=self.user,
		)

	def _create_invoice(
		self,
		issue_date,
		total_amount,
		paid_amount='0.00',
		credited_amount='0.00',
		status=None,
	):
		invoice = Invoice.objects.create(
			service_order=self.service_order,
			issue_date=issue_date,
			total_amount=Decimal(str(total_amount)),
			paid_amount=Decimal(str(paid_amount)),
			credited_amount=Decimal(str(credited_amount)),
			created_by=self.user,
		)

		if status:
			invoice.status = status
			invoice.save()

		return invoice

	def test_general_summary_excludes_cancelled_and_reports_total_collected(self):
		self._create_invoice(
			issue_date=date(2026, 1, 10),
			total_amount='100.00',
			paid_amount='30.00',
			credited_amount='20.00',
		)
		self._create_invoice(
			issue_date=date(2026, 2, 10),
			total_amount='200.00',
			paid_amount='0.00',
			credited_amount='0.00',
		)
		self._create_invoice(
			issue_date=date(2026, 3, 10),
			total_amount='50.00',
			paid_amount='0.00',
			credited_amount='0.00',
			status='cancelled',
		)

		response = self.client.get(
			reverse('client-general-summary'),
			{'year': 2026},
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		financial = response.data['financial']

		self.assertEqual(financial['total_invoiced'], 300.0)
		self.assertEqual(financial['total_paid'], 30.0)
		self.assertEqual(financial['total_credited'], 20.0)
		self.assertEqual(financial['total_pending'], 250.0)
		self.assertEqual(financial['total_collected'], 50.0)

	def test_account_statement_totals_match_collected_formula(self):
		self._create_invoice(
			issue_date=date(2026, 5, 5),
			total_amount='120.00',
			paid_amount='70.00',
			credited_amount='20.00',
		)
		self._create_invoice(
			issue_date=date(2025, 12, 31),
			total_amount='80.00',
			paid_amount='0.00',
			credited_amount='0.00',
		)
		self._create_invoice(
			issue_date=date(2026, 6, 1),
			total_amount='40.00',
			paid_amount='0.00',
			credited_amount='0.00',
			status='cancelled',
		)

		response = self.client.get(
			reverse('client-account-statement', kwargs={'pk': self.client_company.id}),
			{'year': 2026},
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['total_invoiced'], 200.0)
		self.assertEqual(response.data['total_paid'], 70.0)
		self.assertEqual(response.data['total_collected'], 90.0)
		self.assertEqual(response.data['total_pending'], 110.0)
