from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = (
        ('operativo', 'Operativo'),
        ('operativo2', 'Operativo 2'),
        ('admin', 'Administrador'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operativo')

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"


class AuditLog(models.Model):
    """Registro de auditoría de acciones del sistema"""
    ACTION_CHOICES = (
        ('CREATE', 'Crear'),
        ('UPDATE', 'Actualizar'),
        ('DELETE', 'Eliminar'),
        ('VIEW', 'Ver'),
        ('EXPORT', 'Exportar'),
        ('LOGIN', 'Iniciar Sesión'),
        ('LOGOUT', 'Cerrar Sesión'),
        ('CLOSE_OS', 'Cerrar OS'),
        ('INVOICE', 'Facturar'),
        ('PAYMENT', 'Registrar Pago'),
    )

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Usuario")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="Acción")
    model_name = models.CharField(max_length=100, verbose_name="Modelo/Tabla")
    object_id = models.IntegerField(null=True, blank=True, verbose_name="ID del Objeto")
    object_repr = models.CharField(max_length=255, blank=True, verbose_name="Representación del Objeto")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP")
    user_agent = models.TextField(blank=True, verbose_name="User Agent (Navegador)")
    details = models.JSONField(default=dict, blank=True, verbose_name="Detalles Adicionales")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Fecha y Hora")

    class Meta:
        verbose_name = "Registro de Auditoría"
        verbose_name_plural = "Registros de Auditoría"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        user_name = self.user.username if self.user else 'Sistema'
        return f"{user_name} - {self.get_action_display()} - {self.model_name} - {self.timestamp}"


# Utilidad para registrar auditoría
def create_audit_log(user, action, model_name, object_id=None, object_repr='', ip_address=None, details=None):
    """Función helper para crear registros de auditoría fácilmente"""
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=object_id,
        object_repr=object_repr,
        ip_address=ip_address,
        details=details or {}
    )