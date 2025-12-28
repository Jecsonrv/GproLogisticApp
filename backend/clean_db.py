import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from django.contrib.auth import get_user_model
from apps.core.models import SoftDeleteModel

# Import models
from apps.users.models import AuditLog, Notification
from apps.orders.models import (
    ServiceOrder, OrderDocument, OrderCharge, Invoice, 
    CreditNote, InvoicePayment, OrderHistory, InvoiceEditHistory
)
from apps.transfers.models import Transfer, TransferPayment, BatchPayment
from apps.clients.models import Client
from apps.catalogs.models import (
    SubClient, ShipmentType, Provider, Bank, Service, 
    ClientServicePrice, ProviderCategory, CustomsAgent
)

User = get_user_model()

def hard_delete_all(model):
    """Helper to hard delete all records from a model"""
    model_name = model.__name__
    print(f"Deleting {model_name}...")
    
    if issubclass(model, SoftDeleteModel):
        # For SoftDeleteModel, we need to use all_objects and hard_delete
        # To avoid N+1 queries and slow iteration, we can try to use raw delete 
        # or just iterate if dataset is small.
        # Given we want to clean everything, we can try to use .delete() on the queryset 
        # BUT we must temporarily disable the custom delete() method or use a raw delete.
        # Iterating is safest logic-wise for now.
        count = model.all_objects.count()
        if count > 0:
            print(f"  Found {count} {model_name} records (including soft-deleted).")
            # We iterate and hard_delete
            for obj in model.all_objects.all():
                obj.hard_delete()
    else:
        # Standard delete
        model.objects.all().delete()

def clean_database():
    print("Starting database cleanup...")
    print("Preserving Users...")
    
    with transaction.atomic():
        # 1. Transactional Data (Leaves)
        hard_delete_all(AuditLog)
        hard_delete_all(Notification)
        hard_delete_all(OrderHistory)
        hard_delete_all(InvoiceEditHistory)
        hard_delete_all(OrderDocument)
        
        hard_delete_all(TransferPayment)
        hard_delete_all(BatchPayment)
        hard_delete_all(Transfer)
        
        hard_delete_all(OrderCharge)
        hard_delete_all(InvoicePayment)
        hard_delete_all(CreditNote)
        
        # Invoice is NOT SoftDeleteModel based on previous check, but let's be safe
        hard_delete_all(Invoice)
        
        hard_delete_all(ServiceOrder)
        
        # 2. Master Data / Catalogs
        hard_delete_all(ClientServicePrice)
        hard_delete_all(SubClient)
        hard_delete_all(Client)
        hard_delete_all(Service)
        hard_delete_all(Provider)
        hard_delete_all(ProviderCategory)
        hard_delete_all(Bank)
        hard_delete_all(ShipmentType)
        hard_delete_all(CustomsAgent)
        
    print("Database cleanup completed successfully.")
    print(f"Remaining Users: {User.objects.count()}")

if __name__ == "__main__":
    try:
        clean_database()
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
