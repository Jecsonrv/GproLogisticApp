"""
Signals para auto-registro de eventos en OrderHistory
Captura automáticamente todos los cambios relevantes
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import ServiceOrder, OrderCharge, OrderDocument, OrderHistory
from ..transfers.models import Transfer

User = get_user_model()


@receiver(post_save, sender=ServiceOrder)
def log_service_order_events(sender, instance, created, **kwargs):
    """
    Log creación, actualización y cambios de estado de OS
    """
    # No crear historial si estamos en el proceso de creación inicial
    if created:
        OrderHistory.objects.create(
            service_order=instance,
            user=getattr(instance, '_current_user', None),
            event_type='created',
            description=f'Orden de servicio {instance.order_number} creada',
            metadata={
                'order_number': instance.order_number,
                'duca': instance.duca,
                'client': instance.client.business_name if instance.client else None
            }
        )
    else:
        # Verificar si hubo cambio de estado
        if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
            if instance.status == 'cerrada':
                event_type = 'closed'
                description = f'Orden de servicio {instance.order_number} cerrada'
            elif instance._previous_status == 'cerrada' and instance.status == 'abierta':
                event_type = 'reopened'
                description = f'Orden de servicio {instance.order_number} reabierta'
            else:
                event_type = 'status_changed'
                description = f'Estado cambiado de {instance._previous_status} a {instance.status}'
            
            OrderHistory.objects.create(
                service_order=instance,
                user=getattr(instance, '_current_user', None),
                event_type=event_type,
                description=description,
                metadata={
                    'previous_status': instance._previous_status,
                    'new_status': instance.status
                }
            )
        else:
            # Actualización general
            OrderHistory.objects.create(
                service_order=instance,
                user=getattr(instance, '_current_user', None),
                event_type='updated',
                description=f'Orden de servicio {instance.order_number} actualizada',
                metadata={}
            )


@receiver(pre_save, sender=ServiceOrder)
def capture_previous_status(sender, instance, **kwargs):
    """
    Capturar el estado anterior antes de guardar para detectar cambios
    """
    if instance.pk:
        try:
            previous = ServiceOrder.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except ServiceOrder.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender=OrderCharge)
def log_charge_events(sender, instance, created, **kwargs):
    """
    Log cuando se agregan o actualizan cargos
    """
    if created:
        OrderHistory.objects.create(
            service_order=instance.service_order,
            user=getattr(instance, '_current_user', None),
            event_type='charge_added',
            description=f'Cargo agregado: {instance.service.name if instance.service else "N/A"}',
            metadata={
                'service': instance.service.name if instance.service else None,
                'quantity': float(instance.quantity),
                'unit_price': float(instance.unit_price),
                'total': float(instance.total)
            }
        )


@receiver(post_delete, sender=OrderCharge)
def log_charge_deletion(sender, instance, **kwargs):
    """
    Log cuando se eliminan cargos
    """
    OrderHistory.objects.create(
        service_order=instance.service_order,
        user=getattr(instance, '_current_user', None),
        event_type='charge_deleted',
        description=f'Cargo eliminado: {instance.service.name if instance.service else "N/A"}',
        metadata={
            'service': instance.service.name if instance.service else None,
            'quantity': float(instance.quantity),
            'unit_price': float(instance.unit_price),
            'total': float(instance.total)
        }
    )


@receiver(post_save, sender=Transfer)
def log_payment_events(sender, instance, created, **kwargs):
    """
    Log eventos de pagos a proveedores
    """
    if not instance.service_order:
        return
    
    if created:
        OrderHistory.objects.create(
            service_order=instance.service_order,
            user=getattr(instance, '_current_user', None),
            event_type='payment_added',
            description=f'Pago a proveedor registrado: {instance.provider.name if instance.provider else "N/A"}',
            metadata={
                'provider': instance.provider.name if instance.provider else None,
                'amount': float(instance.amount),
                'transfer_type': instance.transfer_type,
                'status': instance.status
            }
        )
    else:
        # Verificar cambios de estado
        if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
            if instance.status == 'aprobado':
                event_type = 'payment_approved'
                description = f'Pago aprobado: {instance.provider.name if instance.provider else "N/A"}'
            elif instance.status == 'pagado':
                event_type = 'payment_paid'
                description = f'Pago ejecutado: {instance.provider.name if instance.provider else "N/A"}'
            else:
                event_type = 'payment_updated'
                description = f'Pago actualizado: {instance.provider.name if instance.provider else "N/A"}'
            
            OrderHistory.objects.create(
                service_order=instance.service_order,
                user=getattr(instance, '_current_user', None),
                event_type=event_type,
                description=description,
                metadata={
                    'provider': instance.provider.name if instance.provider else None,
                    'amount': float(instance.amount),
                    'previous_status': instance._previous_status,
                    'new_status': instance.status
                }
            )


@receiver(pre_save, sender=Transfer)
def capture_previous_payment_status(sender, instance, **kwargs):
    """
    Capturar el estado anterior del pago
    """
    if instance.pk:
        try:
            previous = Transfer.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except Transfer.DoesNotExist:
            instance._previous_status = None


@receiver(post_delete, sender=Transfer)
def log_payment_deletion(sender, instance, **kwargs):
    """
    Log cuando se eliminan pagos
    """
    if not instance.service_order:
        return
    
    OrderHistory.objects.create(
        service_order=instance.service_order,
        user=getattr(instance, '_current_user', None),
        event_type='payment_deleted',
        description=f'Pago eliminado: {instance.provider.name if instance.provider else "N/A"}',
        metadata={
            'provider': instance.provider.name if instance.provider else None,
            'amount': float(instance.amount),
            'status': instance.status
        }
    )


@receiver(post_save, sender=OrderDocument)
def log_document_upload(sender, instance, created, **kwargs):
    """
    Log cuando se suben documentos
    """
    if created:
        # Obtener el nombre del archivo del FileField
        file_name = instance.file.name.split('/')[-1] if instance.file else 'Sin nombre'
        
        OrderHistory.objects.create(
            service_order=instance.order,
            user=getattr(instance, '_current_user', instance.uploaded_by),
            event_type='document_uploaded',
            description=f'Documento subido: {instance.description or file_name}',
            metadata={
                'document_type': instance.document_type,
                'file_name': file_name,
                'description': instance.description or ''
            }
        )


@receiver(post_delete, sender=OrderDocument)
def log_document_deletion(sender, instance, **kwargs):
    """
    Log cuando se eliminan documentos
    """
    # Obtener el nombre del archivo del FileField
    file_name = instance.file.name.split('/')[-1] if instance.file else 'Sin nombre'
    
    OrderHistory.objects.create(
        service_order=instance.order,
        user=getattr(instance, '_current_user', None),
        event_type='document_deleted',
        description=f'Documento eliminado: {instance.description or file_name}',
        metadata={
            'document_type': instance.document_type,
            'file_name': file_name,
            'description': instance.description or ''
        }
    )
