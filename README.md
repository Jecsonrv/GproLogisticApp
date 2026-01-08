# GPRO Logistic CRM

## Sistema de gestión para agencia de tramitaciones aduanales

Plataforma web para gestionar operaciones aduanales: órdenes de servicio, transferencias, provisiones, facturación, cuentas por cobrar, estados de cuenta y auditoría.

### Stack

-   Django 4.2+
-   React 18+ (Vite)
-   PostgreSQL 15+ (SQLite opcional en desarrollo)
-   Tailwind CSS 3.3+

### Requisitos previos

-   Python 3.10+
-   Node.js 18+
-   PostgreSQL 15+
-   Git

### Puesta en marcha rápida

Backend (Django)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
cp .env.example .env   # Completar credenciales
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Servidor backend: http://localhost:8000

Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env   # Configurar VITE_API_URL
npm run dev
```

Servidor frontend: http://localhost:5173

### Configuración de variables

Backend (`backend/.env`)

```env
DB_NAME=gpro_logistic
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
DB_HOST=localhost
DB_PORT=5432
# DATABASE_URL=sqlite:///db.sqlite3  # alternativa para desarrollo

SECRET_KEY=tu-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000/api
```

### Estructura resumida

```
gpro-logistic-crm/
├── backend/
│   ├── apps/ (users, clients, catalogs, orders, transfers, dashboard, etc.)
│   ├── config/
│   ├── media/
│   └── requirements.txt
├── frontend/
│   ├── src/ (components, pages, services, contexts)
│   └── package.json
├── Instrucciones/
├── ANALISIS_Y_PLAN_DE_MEJORAS.md
├── CAMBIOS_REALIZADOS.md
└── RESUMEN_EJECUTIVO.md
```

### Pruebas

-   Backend: `cd backend && python manage.py test`
-   Frontend: `cd frontend && npm run test`

### Despliegue de referencia

-   Backend en Railway: conectar repo, definir variables de entorno y desplegar.
-   Frontend en Vercel: importar repo, definir `VITE_API_URL` y desplegar.
-   Bases de datos: Railway, Neon o Render.

### Comandos útiles

Backend

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py loaddata fixtures/initial_data.json
python manage.py shell
# Documentación API (local)
http://localhost:8000/api/docs/
```

Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Problemas frecuentes

-   psycopg2 no encontrado: `pip install psycopg2-binary`.
-   PostgreSQL rechaza conexión: iniciar el servicio (por ejemplo, `net start postgresql-x64-15` en Windows).
-   CORS en desarrollo: agregar `http://localhost:5173` en `CORS_ALLOWED_ORIGINS`.

### Documentación adicional

-   [ANALISIS_Y_PLAN_DE_MEJORAS.md](ANALISIS_Y_PLAN_DE_MEJORAS.md)
-   [CAMBIOS_REALIZADOS.md](CAMBIOS_REALIZADOS.md)
-   [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md)

### Licencia y contacto

Propietario: GPRO Logistic © 2025
Contacto: tu-email@example.com

---

## 🌟 ¿Te gusta el proyecto?

Si encuentras útil este sistema, considera:

-   ⭐ Dar una estrella en GitHub
-   🐛 Reportar bugs
-   💡 Sugerir mejoras

---

**Última actualización:** 7 de Diciembre, 2025
**Versión:** 2.0 (Mejorada)
