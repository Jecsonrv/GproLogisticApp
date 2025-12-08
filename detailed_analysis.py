import openpyxl
import pandas as pd
from collections import defaultdict
import re

file_path = r'C:\Users\jecso\Desktop\Gpro Logistic App\Instrucciones\Copia de OS - GPRO LOGISTIC PRUEBAS (1).xlsx'

# Load all sheets into pandas
excel_file = pd.ExcelFile(file_path)

print("="*100)
print("DETAILED ANALYSIS - RELATIONSHIPS AND DATA MODEL")
print("="*100)

# Analyze key sheets in detail
key_sheets = {
    'BASE OS': 'Main service orders (Orden de Servicio)',
    'BASE TRANSFERENCIAS': 'Financial transactions/transfers',
    'CXC': 'Accounts Receivable (Cuentas por Cobrar)',
    'HISTORICO COBROS': 'Billing history',
    'TARIFARIO': 'Pricing/Rate card',
    'LISTAS': 'Master data lists'
}

for sheet_name, description in key_sheets.items():
    print(f"\n{'='*100}")
    print(f"SHEET: {sheet_name} - {description}")
    print('='*100)

    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name)

        print(f"\nRows: {len(df)}")
        print(f"Columns: {len(df.columns)}")

        print("\nColumn Details:")
        for i, col in enumerate(df.columns, 1):
            non_null = df[col].notna().sum()
            null_count = df[col].isna().sum()

            # Determine data type
            sample_values = df[col].dropna().head(3).tolist()
            dtype = df[col].dtype

            print(f"\n  {i}. {col}")
            print(f"     Type: {dtype}")
            print(f"     Non-null: {non_null} | Null: {null_count}")

            if len(sample_values) > 0:
                print(f"     Samples: {sample_values[:3]}")

            # Check for unique values (potential keys)
            unique_count = df[col].nunique()
            if non_null > 0:
                uniqueness_ratio = unique_count / non_null
                if uniqueness_ratio > 0.9 and non_null > 5:
                    print(f"     *** POTENTIAL PRIMARY KEY (Uniqueness: {uniqueness_ratio:.2%}) ***")
                elif uniqueness_ratio < 0.1 and unique_count < 50:
                    print(f"     *** POTENTIAL FOREIGN KEY or CATEGORY ({unique_count} unique values) ***")
                    if unique_count <= 10:
                        print(f"     Unique values: {df[col].dropna().unique().tolist()}")

    except Exception as e:
        print(f"Error reading sheet: {e}")

# Analyze relationships
print("\n" + "="*100)
print("RELATIONSHIP ANALYSIS")
print("="*100)

try:
    base_os = pd.read_excel(file_path, sheet_name='BASE OS')
    base_trans = pd.read_excel(file_path, sheet_name='BASE TRANSFERENCIAS')
    cxc = pd.read_excel(file_path, sheet_name='CXC')
    historico = pd.read_excel(file_path, sheet_name='HISTÓRICO COBROS')
    tarifario = pd.read_excel(file_path, sheet_name='TARIFARIO')
    listas = pd.read_excel(file_path, sheet_name='LISTAS')

    print("\n1. PRIMARY KEYS:")
    print("   - BASE OS: 'OS' (Service Order Number) - Example: 001-2024, 002-2024")
    print(f"     Total OS records: {base_os['OS'].notna().sum()}")
    print(f"     Unique OS: {base_os['OS'].nunique()}")

    print("\n2. RELATIONSHIPS:")

    # OS appears in multiple sheets
    if 'OS' in base_trans.columns:
        trans_os = base_trans['OS'].dropna().unique()
        os_list = base_os['OS'].dropna().unique()
        print(f"\n   BASE OS -> BASE TRANSFERENCIAS")
        print(f"   - OS in BASE OS: {len(os_list)}")
        print(f"   - OS in BASE TRANSFERENCIAS: {len(trans_os)}")
        matching = set(trans_os) & set(os_list)
        print(f"   - Matching OS: {len(matching)}")

    if 'OS' in cxc.columns:
        cxc_os = cxc['OS'].dropna().unique()
        print(f"\n   BASE OS -> CXC")
        print(f"   - OS in CXC: {len(cxc_os)}")
        matching = set(cxc_os) & set(os_list)
        print(f"   - Matching OS: {len(matching)}")

    # Client relationships
    if 'CLIENTE' in base_os.columns and 'CLIENTE' in tarifario.columns:
        clients_os = base_os['CLIENTE'].dropna().unique()
        clients_tariff = tarifario['CLIENTE'].dropna().unique()
        print(f"\n   CLIENTS:")
        print(f"   - Unique clients in BASE OS: {len(clients_os)}")
        print(f"   - Unique clients in TARIFARIO: {len(clients_tariff)}")
        print(f"   - Sample clients: {list(clients_os[:5])}")

    # Aforadores (Customs officers)
    if 'Aforadores' in listas.columns:
        aforadores = listas['Aforadores'].dropna().unique()
        print(f"\n   AFORADORES (Customs Officers):")
        print(f"   - List: {aforadores.tolist()}")

    # Banks
    if 'Bancos' in listas.columns:
        bancos = listas['Bancos'].dropna().unique()
        print(f"\n   BANCOS (Banks):")
        print(f"   - List: {bancos.tolist()}")

except Exception as e:
    print(f"Error in relationship analysis: {e}")

print("\n" + "="*100)
print("DATA STATISTICS")
print("="*100)

try:
    print(f"\nTotal Service Orders: {len(base_os[base_os['OS'].notna()])}")
    print(f"Total Transfers: {len(base_trans[base_trans['OS'].notna()])}")
    print(f"Total CXC Records: {len(cxc[cxc['OS'].notna()])}")

    if 'FACTURADO' in base_os.columns:
        facturado_counts = base_os['FACTURADO'].value_counts()
        print(f"\nBilling Status:")
        for status, count in facturado_counts.items():
            print(f"  {status}: {count}")

    if 'Estado' in cxc.columns:
        estado_counts = cxc['Estado'].value_counts()
        print(f"\nCXC Status:")
        for status, count in estado_counts.items():
            print(f"  {status}: {count}")

    if 'Total de Facturación' in cxc.columns:
        total_facturacion = cxc['Total de Facturación'].sum()
        print(f"\nTotal Billing Amount: ${total_facturacion:,.2f}")

    if 'CxC' in cxc.columns:
        total_cxc = cxc['CxC'].sum()
        print(f"Total Accounts Receivable: ${total_cxc:,.2f}")

except Exception as e:
    print(f"Error in statistics: {e}")

print("\n" + "="*100)
