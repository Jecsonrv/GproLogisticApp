import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Fix para Windows - Forzar UTF-8 en todo el sistema
if sys.platform == 'win32':
    import locale
    # Intentar configurar locale UTF-8
    try:
        locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
    except:
        try:
            locale.setlocale(locale.LC_ALL, 'C.UTF-8')
        except:
            pass  # Usar locale por defecto

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.getenv('DEBUG', 'False') == 'True'

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key')

# Fail loudly if secret key is default in production
if not DEBUG and SECRET_KEY == 'django-insecure-default-key':
    raise ValueError("FATAL: You must set a unique SECRET_KEY in production environment!")

# ============================================
# AWS S3 STORAGE CONFIGURATION (Production)
# ============================================
if not DEBUG and os.getenv('AWS_ACCESS_KEY_ID'):
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = 'us-east-1'
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_DEFAULT_ACL = None  # Files are private by default
    
    # Static files (CSS, JS) in S3 (Optional, usually Whitenoise handles this well enough for small apps)
    # STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Media files (Uploads) in S3
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ============================================
# ENVIRONMENT DETECTION
# ============================================
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')  # development, staging, production

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'import_export',

    # Local apps
    'apps.core',
    'apps.users',
    'apps.clients',
    'apps.catalogs',
    'apps.orders',
    'apps.transfers',
    'apps.dashboard',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ============================================
# DATABASE CONFIGURATION
# ============================================
import dj_database_url

# Detectar automáticamente qué base de datos usar
# Railway provee DATABASE_URL por defecto
if 'DATABASE_URL' in os.environ:
    DATABASES = {
        'default': dj_database_url.config(
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True
        )
    }
else:
    # Fallback para desarrollo local (SQLite o Postgres manual)
    DATABASE_ENGINE = os.getenv('DATABASE_ENGINE', 'sqlite')

    if DATABASE_ENGINE == 'postgresql':
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.getenv('DB_NAME', 'gpro_logistic'),
                'USER': os.getenv('DB_USER', 'postgres'),
                'PASSWORD': os.getenv('DB_PASSWORD', 'gpro_secure_2024'),
                'HOST': os.getenv('DB_HOST', 'localhost'),
                'PORT': os.getenv('DB_PORT', '5432'),
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

# ============================================
# REDIS CONFIGURATION (Cache, Sessions, Locks)
# ============================================
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'False') == 'True' or ENVIRONMENT in ['staging', 'production']

if REDIS_ENABLED:
    # Cache con Redis
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/0',
            'TIMEOUT': 300,  # 5 minutos default
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'RETRY_ON_TIMEOUT': True,
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                # Serialización eficiente
                'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            },
            'KEY_PREFIX': 'gpro',
        },
        # Cache separado para locks distribuidos (sin timeout)
        'locks': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/1',
            'TIMEOUT': None,  # Sin timeout para locks
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
            },
            'KEY_PREFIX': 'gpro_lock',
        },
        # Cache para sesiones
        'sessions': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/2',
            'TIMEOUT': 86400,  # 24 horas
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'gpro_session',
        },
    }
    
    # Sesiones en Redis (más rápido y escalable)
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'sessions'
else:
    # Cache en memoria para desarrollo
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'gpro-cache',
        },
        'locks': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'gpro-locks',
        },
    }

# ============================================
# CACHE TIMEOUTS (Configuración centralizada)
# ============================================
CACHE_TIMEOUTS = {
    'dashboard_metrics': 60 * 5,      # 5 minutos - métricas del dashboard
    'client_list': 60 * 10,           # 10 minutos - lista de clientes
    'service_list': 60 * 15,          # 15 minutos - catálogo de servicios
    'user_permissions': 60 * 30,      # 30 minutos - permisos de usuario
    'exchange_rate': 60 * 60,         # 1 hora - tasa de cambio
    'reports': 60 * 60 * 2,           # 2 horas - reportes pesados
}

# ============================================
# LOCK CONFIGURATION (Operaciones críticas)
# ============================================
DISTRIBUTED_LOCK_TIMEOUT = 30  # Segundos máximos que un lock puede existir
LOCK_RETRY_INTERVAL = 0.1     # Segundos entre reintentos para obtener lock

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

LANGUAGE_CODE = 'es-sv'
TIME_ZONE = 'America/El_Salvador'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # Seguridad: No revelar detalles de errores internos
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    # Rate limiting para prevenir ataques de fuerza bruta
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',      # Usuarios anónimos: 100 requests/hora
        'user': '1000/hour',     # Usuarios autenticados: 1000 requests/hora
        'login': '5/minute',     # Login: máximo 5 intentos por minuto
    },
}

# Configuración de JWT Segura
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),  # 60 minutos
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=24),   # 24 horas
    'ROTATE_REFRESH_TOKENS': True,  # Rotar tokens de refresco
    'BLACKLIST_AFTER_ROTATION': False,  # Opcional: activar si se usa blacklist
    'UPDATE_LAST_LOGIN': True,  # Actualizar last_login en cada autenticación

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'GPRO Logistic API',
    'DESCRIPTION': 'API para el sistema de gestión logística y aduanal',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS Configuration - Seguro para producción
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Solo en desarrollo
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000'
).split(',') if not DEBUG else []

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS[:]


# ============================================
# SECURITY SETTINGS FOR PRODUCTION
# ============================================
if not DEBUG:
    # HTTPS Settings
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Content Security
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

    # Cookie Settings
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file'] if not DEBUG else ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
import os as os_module
logs_dir = BASE_DIR / 'logs'
if not os_module.path.exists(logs_dir):
    os_module.makedirs(logs_dir, exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'