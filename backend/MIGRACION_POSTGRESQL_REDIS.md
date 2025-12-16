# MIGRACIÓN A POSTGRESQL + REDIS

## Resumen de Cambios

Esta migración prepara GPRO Logistic para producción con:

1. **PostgreSQL** - Base de datos robusta con transacciones ACID
2. **Redis** - Cache distribuido, sesiones rápidas y locks
3. **Locks Distribuidos** - Prevención de condiciones de carrera en operaciones financieras

---

## 🚀 Inicio Rápido

### 1. Iniciar servicios con Docker

```bash
cd backend

# Iniciar PostgreSQL y Redis
docker-compose up -d

# Verificar que están corriendo
docker-compose ps
```

### 2. Configurar variables de entorno

Crear archivo `.env` en `/backend/`:

```env
# Copiar de .env.example
ENVIRONMENT=development
DATABASE_ENGINE=postgresql
REDIS_ENABLED=True

# Base de datos
DB_NAME=gpro_logistic
DB_USER=postgres
DB_PASSWORD=gpro_secure_2024
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379
```

### 3. Migrar la base de datos

```bash
# Crear las tablas en PostgreSQL
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
```

### 4. Verificar infraestructura

```bash
python manage.py check_infra
```

Resultado esperado:

```
==================================================
 GPRO Logistic - Infrastructure Health Check
==================================================

📦 DATABASE
------------------------------
   Engine: PostgreSQL
   Database: gpro_logistic
   Host: localhost
   Status: ✓ Connected (5.2ms)

💾 CACHE (Redis)
------------------------------
   Backend: Redis
   URL: redis://localhost:6379
   Default Cache: ✓ Connected (1.1ms)
   Locks Cache: ✓ Connected

 ✓ All systems operational
```

---

## 📋 Arquitectura de Infraestructura

```
┌─────────────────────────────────────────────────────────────┐
│                    GPRO Logistic App                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Frontend   │  │   Django    │  │  Background Tasks   │  │
│  │   (React)   │──│    API      │──│    (Celery*)        │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
├──────────────────────────┼───────────────────────────────────┤
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                   INFRAESTRUCTURA                      │  │
│  ├─────────────────────────┬─────────────────────────────┤  │
│  │                         │                             │  │
│  │   ┌─────────────────┐   │   ┌─────────────────────┐   │  │
│  │   │   PostgreSQL    │   │   │       Redis         │   │  │
│  │   │   ───────────   │   │   │   ───────────────   │   │  │
│  │   │                 │   │   │                     │   │  │
│  │   │  • Órdenes      │   │   │  db0: Cache general │   │  │
│  │   │  • Facturas     │   │   │  db1: Locks         │   │  │
│  │   │  • Clientes     │   │   │  db2: Sesiones      │   │  │
│  │   │  • Usuarios     │   │   │                     │   │  │
│  │   └─────────────────┘   │   └─────────────────────┘   │  │
│  │                         │                             │  │
│  └─────────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Locks Distribuidos

### ¿Por qué son necesarios?

En un ERP con múltiples usuarios, dos operativos podrían intentar:

-   Facturar la **misma orden** al mismo tiempo
-   Registrar pagos simultáneos en la **misma factura**
-   Aplicar notas de crédito concurrentemente

Sin locks, esto causa:

-   Doble facturación
-   Saldos incorrectos
-   Datos corruptos

### Operaciones Protegidas

| Operación      | Lock Key                           | Timeout |
| -------------- | ---------------------------------- | ------- |
| Crear factura  | `invoice_os_{service_order_id}`    | 30s     |
| Registrar pago | `invoice_payment_{invoice_id}`     | 30s     |
| Aplicar NC     | `invoice_credit_note_{invoice_id}` | 30s     |

### Uso en el Código

```python
from apps.core.cache import distributed_lock, LockAcquisitionError

# Opción 1: Context Manager
with distributed_lock(f'facturar_os_{order_id}', timeout=30):
    # Solo un proceso puede ejecutar esto
    crear_factura(order_id)

# Opción 2: Decorador
@distributed_lock('operacion_critica')
def mi_operacion():
    pass

# Manejo de errores
try:
    with distributed_lock('mi_lock'):
        proceso_critico()
except LockAcquisitionError:
    return Response(
        {'error': 'Otro usuario está procesando esta operación'},
        status=409  # Conflict
    )
```

---

## 💾 Sistema de Cache

### Caches Disponibles

| Cache      | Base Redis | Propósito           | Timeout Default |
| ---------- | ---------- | ------------------- | --------------- |
| `default`  | db0        | Métricas, consultas | 5 minutos       |
| `locks`    | db1        | Locks distribuidos  | Sin timeout     |
| `sessions` | db2        | Sesiones de usuario | 24 horas        |

### Uso del Cache Manager

```python
from apps.core.cache import CacheManager

cache = CacheManager()

# Guardar
cache.set('dashboard_metrics', data, timeout=300)

# Obtener
data = cache.get('dashboard_metrics')

# Invalidar
cache.delete('dashboard_metrics')

# Con patrón
cache.delete_pattern('dashboard_*')
```

### Comandos de Gestión

```bash
# Limpiar todo el cache
python manage.py clearcache --all

# Solo dashboard
python manage.py clearcache --dashboard

# Solo locks (¡cuidado!)
python manage.py clearcache --locks

# Por patrón
python manage.py clearcache --pattern="invoice_*"
```

---

## 🐘 PostgreSQL

### Configuración Optimizada

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'gpro_logistic',
        'CONN_MAX_AGE': 60,  # Conexiones persistentes
        'OPTIONS': {
            'options': '-c statement_timeout=30000',  # 30s max/query
        },
    }
}
```

### Migraciones desde SQLite

```bash
# 1. Exportar datos de SQLite
python manage.py dumpdata --exclude=contenttypes > backup.json

# 2. Cambiar a PostgreSQL en .env
DATABASE_ENGINE=postgresql

# 3. Crear tablas
python manage.py migrate

# 4. Importar datos
python manage.py loaddata backup.json
```

---

## 🐳 Docker Compose

### Servicios

```yaml
services:
    postgres: # Puerto 5432
    redis: # Puerto 6379
    pgadmin: # Puerto 5050 (solo con profile 'tools')
    redis-commander: # Puerto 8082 (solo con profile 'tools')
```

### Comandos Útiles

```bash
# Solo base de datos y cache
docker-compose up -d

# Con herramientas de admin
docker-compose --profile tools up -d

# Ver logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reiniciar todo
docker-compose down && docker-compose up -d

# Eliminar volúmenes (¡borra datos!)
docker-compose down -v
```

### Acceso a PgAdmin

1. Ir a http://localhost:5050
2. Login: admin@gpro.com / admin123
3. Add Server:
    - Name: GPRO Local
    - Host: postgres
    - Port: 5432
    - User: postgres
    - Password: gpro_secure_2024

---

## ⚠️ Troubleshooting

### Error: Connection refused (PostgreSQL)

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Reiniciar
docker-compose restart postgres
```

### Error: Redis connection failed

```bash
# Verificar Redis
docker-compose exec redis redis-cli ping
# Debería responder: PONG
```

### Error: Lock could not be acquired

```bash
# Limpiar locks huérfanos
python manage.py clearcache --locks

# O desde Redis directamente
docker-compose exec redis redis-cli -n 1 FLUSHDB
```

### Error: Cache not working

```python
# Verificar en Python shell
python manage.py shell

from django.core.cache import caches
cache = caches['default']
cache.set('test', 'ok', 10)
print(cache.get('test'))  # Debería imprimir 'ok'
```

---

## 📊 Monitoreo

### Health Check Endpoint

```bash
curl http://localhost:8000/api/health/
```

### Métricas de Redis

```bash
# Info general
docker-compose exec redis redis-cli INFO

# Memoria usada
docker-compose exec redis redis-cli INFO memory

# Keys por base de datos
docker-compose exec redis redis-cli INFO keyspace
```

### Conexiones PostgreSQL

```sql
-- En PgAdmin o psql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'gpro_logistic';
```

---

## 🔄 Rollback a SQLite (Emergencia)

Si necesitas volver a SQLite temporalmente:

```env
# .env
DATABASE_ENGINE=sqlite
REDIS_ENABLED=False
```

El sistema automáticamente usará:

-   SQLite (`db.sqlite3`)
-   Cache en memoria local
-   Sin locks distribuidos (solo DB locks)

---

## 📁 Archivos Modificados/Creados

| Archivo                                        | Cambio                    |
| ---------------------------------------------- | ------------------------- |
| `config/settings.py`                           | PostgreSQL + Redis config |
| `requirements.txt`                             | Nuevas dependencias       |
| `docker-compose.yml`                           | **Nuevo** - Servicios     |
| `.env.example`                                 | **Nuevo** - Variables     |
| `apps/core/cache.py`                           | **Nuevo** - Locks & cache |
| `apps/orders/views_invoices.py`                | Locks en operaciones      |
| `apps/dashboard/views.py`                      | Cache en métricas         |
| `apps/core/management/commands/clearcache.py`  | **Nuevo**                 |
| `apps/core/management/commands/check_infra.py` | **Nuevo**                 |

---

## ✅ Checklist de Despliegue

-   [ ] Docker instalado
-   [ ] `docker-compose up -d` ejecutado
-   [ ] `.env` configurado
-   [ ] `python manage.py migrate` ejecutado
-   [ ] `python manage.py check_infra` pasa
-   [ ] Frontend conecta correctamente
-   [ ] Prueba de facturación funciona
-   [ ] Prueba de pago funciona
