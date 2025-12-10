from django.contrib import admin
from .models import Provider, CustomsAgent, Bank, ShipmentType, SubClient, Service, ClientServicePrice

@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ['name', 'nit', 'phone', 'email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'nit', 'email']

@admin.register(CustomsAgent)
class CustomsAgentAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'email']

@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_phone', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']

@admin.register(ShipmentType)
class ShipmentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']

@admin.register(SubClient)
class SubClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent_client', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'default_price', 'applies_iva', 'is_active']
    list_filter = ['is_active', 'applies_iva']
    search_fields = ['name']
    ordering = ['id']

@admin.register(ClientServicePrice)
class ClientServicePriceAdmin(admin.ModelAdmin):
    list_display = ['client', 'service', 'custom_price', 'is_active', 'effective_date']
    list_filter = ['is_active']
    search_fields = ['client__name', 'service__name']
    ordering = ['client__name', 'service__code']
