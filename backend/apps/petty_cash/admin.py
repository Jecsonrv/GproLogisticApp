from django.contrib import admin
from .models import PettyCashTransaction, CashCount, CashCountDetail

@admin.register(PettyCashTransaction)
class PettyCashTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_date', 'transaction_type', 'amount', 'concept', 'category_code', 'created_by')
    list_filter = ('transaction_type', 'transaction_date', 'category_code')
    search_fields = ('concept', 'reference_number', 'beneficiary')
    date_hierarchy = 'transaction_date'

class CashCountDetailInline(admin.TabularInline):
    model = CashCountDetail
    extra = 0
    readonly_fields = ('total',)

@admin.register(CashCount)
class CashCountAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'performed_by', 'actual_balance', 'difference')
    inlines = [CashCountDetailInline]
