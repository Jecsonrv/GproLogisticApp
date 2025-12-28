import os
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

def create_admin():
    username = os.getenv('ADMIN_USERNAME')
    email = os.getenv('ADMIN_EMAIL')
    password = os.getenv('ADMIN_PASSWORD')

    if not all([username, email, password]):
        print("⚠️ Variables ADMIN_USERNAME, ADMIN_EMAIL o ADMIN_PASSWORD no configuradas. Saltando creación.")
        return

    if not User.objects.filter(username=username).exists():
        print(f"👤 Creando superusuario: {username}...")
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        # Asignar el rol de admin para tu lógica RBAC
        user.role = 'admin'
        user.save()
        print("✅ Superusuario creado exitosamente.")
    else:
        print(f"ℹ️ El usuario {username} ya existe.")

if __name__ == '__main__':
    create_admin()
