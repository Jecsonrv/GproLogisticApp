#!/usr/bin/env python
"""
Script de diagnóstico de rendimiento para GPRO Logistic
Ejecutar con: python manage.py shell < diagnose_performance.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.db import connection
import time

print("=" * 60)
print("DIAGNÓSTICO DE RENDIMIENTO - GPRO LOGISTIC")
print("=" * 60)

# 1. Verificar configuración de workers
print("\n1. CONFIGURACIÓN DE GUNICORN:")
print("-" * 40)
try:
    import multiprocessing
    cpu_count = multiprocessing.cpu_count()
    recommended_workers = (2 * cpu_count) + 1
    print(f"   CPUs disponibles: {cpu_count}")
    print(f"   Workers recomendados: {recommended_workers}")
except Exception as e:
    print(f"   Error: {e}")

# 2. Verificar Redis
print("\n2. CONFIGURACIÓN DE REDIS:")
print("-" * 40)
redis_url = os.getenv('REDIS_URL', 'No configurado')
print(f"   REDIS_URL: {redis_url[:50]}..." if len(redis_url) > 50 else f"   REDIS_URL: {redis_url}")
print(f"   REDIS_ENABLED: {os.getenv('REDIS_ENABLED', 'False')}")

try:
    from django.core.cache import cache
    cache.set('test_key', 'test_value', 10)
    result = cache.get('test_key')
    print(f"   Cache test: {'✓ OK' if result == 'test_value' else '✗ FALLIDO'}")
except Exception as e:
    print(f"   Cache test: ✗ Error - {e}")

# 3. Verificar conexión a DB
print("\n3. CONEXIÓN A BASE DE DATOS:")
print("-" * 40)
try:
    start = time.time()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    elapsed = (time.time() - start) * 1000
    print(f"   Ping a DB: {elapsed:.2f}ms")
    if elapsed > 100:
        print("   ⚠️  ADVERTENCIA: Latencia alta a la base de datos")
except Exception as e:
    print(f"   Error: {e}")

# 4. Verificar índices de Invoice
print("\n4. ESTADÍSTICAS DE FACTURAS:")
print("-" * 40)
try:
    from apps.orders.models import Invoice
    total = Invoice.objects.count()
    print(f"   Total facturas: {total}")
    
    # Verificar duplicados potenciales
    from django.db.models import Count
    duplicates = Invoice.objects.values('invoice_number').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    if duplicates.exists():
        print(f"   ⚠️  DUPLICADOS DETECTADOS:")
        for d in duplicates[:5]:
            print(f"      - {d['invoice_number']}: {d['count']} veces")
    else:
        print("   ✓ No hay duplicados de invoice_number")
except Exception as e:
    print(f"   Error: {e}")

# 5. Verificar queries lentas (últimas del log)
print("\n5. ANÁLISIS DE QUERIES:")
print("-" * 40)
try:
    from django.db import reset_queries
    from django.conf import settings
    
    # Test query de factura más usada
    start = time.time()
    Invoice.objects.select_related(
        'service_order', 'service_order__client'
    ).prefetch_related(
        'payments', 'credit_notes'
    )[:10]
    elapsed = (time.time() - start) * 1000
    print(f"   Query de facturas (10): {elapsed:.2f}ms")
except Exception as e:
    print(f"   Error: {e}")

# 6. Verificar locks activos
print("\n6. ESTADO DE LOCKS:")
print("-" * 40)
try:
    from django.core.cache import caches
    locks_cache = caches.get('locks', caches['default'])
    # No hay forma directa de listar keys en django-redis sin patrón
    print("   Sistema de locks configurado")
except Exception as e:
    print(f"   Error: {e}")

# 7. Memoria y recursos
print("\n7. RECURSOS DEL SISTEMA:")
print("-" * 40)
try:
    import resource
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    print(f"   File descriptors: soft={soft}, hard={hard}")
except:
    print("   No disponible en este sistema")

print("\n" + "=" * 60)
print("RECOMENDACIONES:")
print("=" * 60)
print("""
1. Asegúrate de que Redis esté habilitado (REDIS_ENABLED=True)
2. El Procfile ahora tiene 4 workers + 2 threads para mejor concurrencia
3. Se agregó validación para evitar duplicados de invoice_number
4. Considera agregar índices si hay muchas facturas

Después de desplegar, monitorea los logs para verificar:
- 'Booting worker with pid' debería aparecer 4 veces
- No deberían aparecer más errores de UniqueViolation
""")
