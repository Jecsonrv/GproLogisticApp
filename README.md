# GPRO LOGISTIC CRM
## Sistema de Gestión para Agencia de Tramitaciones Aduanales

[![Django](https://img.shields.io/badge/Django-4.2+-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3+-38B2AC.svg)](https://tailwindcss.com/)

---

## 📋 Descripción

Sistema web profesional para gestión de operaciones aduanales que incluye:
- Órdenes de Servicio (OS)
- Transferencias y Provisiones
- Facturación y Cuentas por Cobrar (CXC)
- Tarifario personalizado por cliente
- Estados de cuenta
- Sistema de roles y permisos
- Auditoría completa

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (o SQLite para desarrollo)
- Git

### Instalación

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/gpro-logistic-crm.git
cd gpro-logistic-crm
```

#### 2. Backend (Django)

```bash
cd backend

# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Ejecutar servidor
python manage.py runserver
```

Backend corriendo en: http://localhost:8000

#### 3. Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env

# Ejecutar servidor de desarrollo
npm run dev
```

Frontend corriendo en: http://localhost:5173

---

## 🗂️ Estructura del Proyecto

```
gpro-logistic-crm/
│
├── backend/
│   ├── apps/
│   │   ├── users/          # Usuarios y autenticación
│   │   ├── clients/        # Gestión de clientes
│   │   ├── catalogs/       # Catálogos (Proveedores, Servicios, etc.)
│   │   ├── orders/         # Órdenes de Servicio
│   │   ├── transfers/      # Transferencias y gastos
│   │   └── dashboard/      # Dashboard y KPIs
│   ├── config/             # Configuración Django
│   ├── media/              # Archivos subidos
│   ├── staticfiles/        # Archivos estáticos
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── services/       # Servicios API
│   │   └── contexts/       # Contextos React
│   ├── public/
│   └── package.json
│
├── Instrucciones/          # Documentación original
│   ├── PROPUESTA Y COTIZACIÓN.pdf
│   ├── plan-gproLogisticSystem.prompt.md
│   └── Excel de ejemplo
│
├── ANALISIS_Y_PLAN_DE_MEJORAS.md
├── CAMBIOS_REALIZADOS.md
├── RESUMEN_EJECUTIVO.md
└── README.md (este archivo)
```

---

## ⚙️ Configuración

### Variables de Entorno (Backend)

Crear archivo `backend/.env`:

```env
# Base de Datos (PostgreSQL)
DB_NAME=gpro_logistic
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
DB_HOST=localhost
DB_PORT=5432

# Para SQLite (desarrollo):
# DATABASE_URL=sqlite:///db.sqlite3

# Django
SECRET_KEY=tu-secret-key-muy-segura-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Opcional: Almacenamiento en la nube
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

### Variables de Entorno (Frontend)

Crear archivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 📊 Modelos de Datos

### Principales Entidades

#### Órdenes de Servicio (ServiceOrder)
- Número consecutivo automático (XXX-YYYY)
- Cliente, Subcliente
- Aforador, Tipo de Embarque
- DUCA, BL/Referencia, PO, ETA
- Estado: Abierta/Cerrada
- Facturado: Sí/No

#### Servicios (Service)
- Código único
- Nombre y descripción
- Precio por defecto
- Aplica IVA: Sí/No

#### Tarifario (ClientServicePrice)
- Cliente + Servicio
- Precio personalizado
- Fecha de vigencia

#### Cobros (OrderCharge)
- Orden de Servicio
- Servicio cobrado
- Cantidad, precio unitario
- Subtotal, IVA, Total (calculados automáticamente)

#### Facturas (Invoice)
- Número automático (XXXXX-YYYY)
- Tipo: DTE, FEX, CCF
- Fecha emisión, vencimiento
- Total servicios + gastos terceros
- Estado: Pendiente, Pagada, Parcial, Vencida

#### Pagos (InvoicePayment)
- Abonos a facturas
- Método de pago, banco
- Actualiza saldo automáticamente

#### Transferencias (Transfer)
- Tipos: Terceros, Propios, Administrativos
- Estado: Provisionada, Pagada
- Banco, beneficiario, CCF
- Asociada a OS o cliente directo

#### Auditoría (AuditLog)
- Usuario, acción, modelo
- IP, navegador
- Fecha y hora

---

## 👥 Roles y Permisos

### Operativo
- Crear Órdenes de Servicio
- Registrar transferencias
- Ver clientes

### Operativo 2
- Todo lo anterior +
- Descargar estados de cuenta
- Exportar a Excel

### Administrador
- Acceso total
- Gestión de usuarios
- Gestión de catálogos
- Configuración del sistema

---

## 🧪 Pruebas

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm run test
```

---

## 🚢 Deployment

### Opción 1: Railway (Backend)

1. Crear cuenta en [Railway.app](https://railway.app)
2. Conectar repositorio de GitHub
3. Configurar variables de entorno
4. Deploy automático

### Opción 2: Vercel (Frontend)

1. Crear cuenta en [Vercel.com](https://vercel.com)
2. Importar repositorio
3. Configurar `VITE_API_URL`
4. Deploy

### PostgreSQL

- Railway (incluido con backend)
- Neon.tech (free tier)
- Render.com

---

## 📚 Documentación Completa

- [Análisis y Plan de Mejoras](ANALISIS_Y_PLAN_DE_MEJORAS.md)
- [Cambios Realizados](CAMBIOS_REALIZADOS.md)
- [Resumen Ejecutivo](RESUMEN_EJECUTIVO.md)

---

## 🛠️ Comandos Útiles

### Backend

```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Cargar datos de prueba
python manage.py loaddata fixtures/initial_data.json

# Acceder a shell
python manage.py shell

# Ver documentación API
http://localhost:8000/api/docs/
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

---

## 🐛 Troubleshooting

### Error: "No module named 'psycopg2'"
```bash
pip install psycopg2-binary
```

### Error: PostgreSQL connection refused
Verificar que PostgreSQL esté corriendo:
```bash
# Windows
net start postgresql-x64-15

# Linux/Mac
sudo systemctl start postgresql
```

### Error: CORS en desarrollo
Agregar `http://localhost:5173` a `CORS_ALLOWED_ORIGINS` en `.env`

---

## 📞 Soporte

- **Documentación:** Ver carpeta `Instrucciones/`
- **Issues:** GitHub Issues
- **Email:** [tu-email@example.com]

---

## 🎯 Roadmap

### v1.0 (Actual)
- ✅ Modelo de datos completo
- ✅ Configuración base
- ✅ Auditoría

### v1.1 (En desarrollo)
- ⏳ API completa
- ⏳ Frontend mejorado
- ⏳ Calculadora de cobros

### v1.2 (Futuro)
- ⏳ Reportes avanzados
- ⏳ Notificaciones automáticas
- ⏳ App móvil

---

## 📄 Licencia

Propietario - GPRO Logistic © 2025

---

## 👏 Créditos

- **Desarrollador:** [Tu Nombre]
- **Cliente:** GPRO Logistic, El Salvador
- **Asistente AI:** Claude (Anthropic)
- **Stack:** Django + React + PostgreSQL + Tailwind CSS

---

## 🌟 ¿Te gusta el proyecto?

Si encuentras útil este sistema, considera:
- ⭐ Dar una estrella en GitHub
- 🐛 Reportar bugs
- 💡 Sugerir mejoras

---

**Última actualización:** 7 de Diciembre, 2025
**Versión:** 2.0 (Mejorada)
