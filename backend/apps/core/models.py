from django.db import models
from django.utils import timezone

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class AllObjectsManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, verbose_name="Eliminado")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Eliminación")

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()

class DocumentSequence(models.Model):
    """
    Contador de una sola fila por serie de documento (OS, pre-facturas, lotes).

    Permite reservar correlativos bloqueando esta fila en lugar de bloquear
    todas las filas del documento correspondiente. Ver apps/core/sequences.py.
    """
    key = models.CharField(max_length=100, unique=True, verbose_name="Serie")
    last_number = models.PositiveIntegerField(default=0, verbose_name="Último número asignado")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado el")

    class Meta:
        verbose_name = "Correlativo de Documento"
        verbose_name_plural = "Correlativos de Documentos"

    def __str__(self):
        return f"{self.key} -> {self.last_number}"

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado el")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado el")

    class Meta:
        abstract = True
