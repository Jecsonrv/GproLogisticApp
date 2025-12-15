from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


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


class Notification(models.Model):
    """Notificaciones del sistema para usuarios"""
    NOTIFICATION_TYPE_CHOICES = (
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('error', 'Error'),
        ('success', 'Éxito'),
    )

    CATEGORY_CHOICES = (
        ('invoice', 'Facturación'),
        ('order', 'Órdenes de Servicio'),
        ('transfer', 'Transferencias'),
        ('client', 'Clientes'),
        ('payment', 'Pagos'),
        ('system', 'Sistema'),
    )

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Usuario"
    )
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPE_CHOICES, 
        default='info',
        verbose_name="Tipo"
    )
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='system',
        verbose_name="Categoría"
    )
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensaje")
    is_read = models.BooleanField(default=False, verbose_name="Leída")
    
    # Relación genérica para vincular a cualquier objeto
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        verbose_name="Tipo de Contenido"
    )
    object_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="ID del Objeto")
    related_object = GenericForeignKey('content_type', 'object_id')
    
    # Metadata adicional (para datos extra como montos, días vencidos, etc.)
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Metadata")
    
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Creada")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Leída el")

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        status = "✓" if self.is_read else "○"
        return f"{status} [{self.user.username}] {self.title[:50]}"
    
    def mark_as_read(self):
        """Marcar la notificación como leída"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @classmethod
    def create_notification(cls, user, title, message, notification_type='info', category='system', 
                          related_object=None, metadata=None):
        """Helper para crear notificaciones fácilmente"""
        notification = cls(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            category=category,
            metadata=metadata or {}
        )
        if related_object:
            notification.content_type = ContentType.objects.get_for_model(related_object)
            notification.object_id = related_object.pk
        notification.save()
        return notification
    
    @classmethod
    def notify_all_admins(cls, title, message, notification_type='info', category='system', 
                         related_object=None, metadata=None):
        """Crear notificación para todos los administradores"""
        admins = User.objects.filter(role='admin', is_active=True)
        notifications = []
        for admin in admins:
            notifications.append(
                cls.create_notification(
                    user=admin,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    category=category,
                    related_object=related_object,
                    metadata=metadata
                )
            )
        return notifications