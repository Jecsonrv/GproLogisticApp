import os
import django
from django.db.models import Sum
import sys

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.orders.models import Invoice

def verify_periods():
    print("--- VERIFICACIÓN DE PERIODOS ---")
    
    # 1. TOTAL HISTÓRICO (Lo que muestra CXC por defecto si no filtras fecha)
    total_all_time = Invoice.objects.exclude(status='cancelled').aggregate(t=Sum('total_amount'))['t'] or 0
    print(f"1. Total Histórico (CXC Global): ${total_all_time:,.2f}")
    
    # 2. TOTAL 2026 (Lo que mostraría Dashboard si seleccionas 'Año 2026')
    total_2026 = Invoice.objects.filter(issue_date__year=2026).exclude(status='cancelled').aggregate(t=Sum('total_amount'))['t'] or 0
    print(f"2. Total Año 2026: ${total_2026:,.2f}")
    
    # 3. TOTAL ENERO 2026 (Lo que muestra Dashboard actualmente: 'Facturación del Mes')
    total_jan_2026 = Invoice.objects.filter(issue_date__year=2026, issue_date__month=1).exclude(status='cancelled').aggregate(t=Sum('total_amount'))['t'] or 0
    print(f"3. Total Enero 2026 (Dashboard): ${total_jan_2026:,.2f}")
    
    # 4. LA DIFERENCIA
    diff = total_all_time - total_jan_2026
    print(f"\nDiferencia (Histórico - Enero): ${diff:,.2f}")
    
    print("\n--- DESGLOSE DE LA DIFERENCIA (Facturas fuera de Enero 2026) ---")
    others = Invoice.objects.exclude(status='cancelled').exclude(issue_date__year=2026, issue_date__month=1)
    for inv in others:
        print(f"- Factura {inv.invoice_number} ({inv.issue_date}): ${inv.total_amount:,.2f}")

if __name__ == "__main__":
    verify_periods()
