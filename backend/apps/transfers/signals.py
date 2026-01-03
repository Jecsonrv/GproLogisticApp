from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Transfer, BatchPayment, ProviderCreditNote, CreditNoteApplication
from apps.orders.models import OrderDocument
from apps.users.models import Notification
import os
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Transfer)
def capture_transfer_previous_status(sender, instance, **kwargs):
    """
    Capturar el estado anterior antes de guardar para detectar cambios
    """
    if instance.pk:
        try:
            previous = Transfer.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except Transfer.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender=Transfer)
def sync_transfer_document(sender, instance, created, **kwargs):
    """
    Sincroniza el comprobante del pago a proveedor con los documentos de la OS.
    Crea o actualiza un OrderDocument cuando hay un invoice_file.
    """
    # === NOTIFICACIONES ===
    # Si se crea un nuevo gasto PENDIENTE, notificar a los administradores
    if created and instance.status == 'pendiente':
        os_info = f" (OS: {instance.service_order.order_number})" if instance.service_order else ""
        Notification.notify_all_admins(
            title="Nuevo Gasto por Aprobar",
            message=f"Se ha registrado un gasto de ${instance.amount} para {instance.provider.name if instance.provider else 'Proveedor'}{os_info}. Requiere aprobación.",
            notification_type='warning',
            category='payment',
            related_object=instance
        )

    # Si cambió a APROBADO o PAGADO, notificar al creador
    if not created and hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
        if instance.created_by:
            os_info = f" en OS {instance.service_order.order_number}" if instance.service_order else ""
            if instance.status == 'aprobado':
                Notification.create_notification(
                    user=instance.created_by,
                    title="Pago Aprobado",
                    message=f"Tu solicitud de pago para {instance.provider.name if instance.provider else 'Proveedor'}{os_info} ha sido aprobado.",
                    notification_type='success',
                    category='payment',
                    related_object=instance
                )
            elif instance.status == 'pagado':
                Notification.create_notification(
                    user=instance.created_by,
                    title="Pago Realizado",
                    message=f"El pago a {instance.provider.name if instance.provider else 'Proveedor'}{os_info} por ${instance.amount} ya fue realizado.",
                    notification_type='success',
                    category='payment',
                    related_object=instance
                )

    # Solo procesar si tiene service_order y invoice_file
    if not instance.service_order or not instance.invoice_file:
        return
    
    try:
        # Buscar si ya existe un documento vinculado a este transfer
        existing_doc = OrderDocument.objects.filter(
            order=instance.service_order,
            description__contains=f"Transfer-{instance.id}"
        ).first()
        
        # Generar descripción descriptiva
        provider_name = instance.provider.name if instance.provider else instance.beneficiary_name or "Proveedor"
        description = f"Comprobante - {provider_name} - ${instance.amount} - Transfer-{instance.id}"
        if instance.invoice_number:
            description = f"{instance.invoice_number} - {description}"
        
        if existing_doc:
            # Actualizar documento existente si el archivo cambió
            if existing_doc.file != instance.invoice_file:
                # Eliminar archivo antiguo si existe
                if existing_doc.file:
                    try:
                        if os.path.isfile(existing_doc.file.path):
                            os.remove(existing_doc.file.path)
                    except:
                        pass
                
                existing_doc.file = instance.invoice_file
                existing_doc.description = description
                existing_doc.save()
        else:
            # Crear nuevo documento
            OrderDocument.objects.create(
                order=instance.service_order,
                document_type='factura_costo',
                file=instance.invoice_file,
                description=description,
                uploaded_by=instance.created_by
            )
    except Exception as e:
        logger.error(f"Error al sincronizar documento del transfer: {e}")


@receiver(post_delete, sender=Transfer)
def delete_transfer_document(sender, instance, **kwargs):
    """
    Elimina el documento asociado cuando se elimina un transfer.
    """
    if not instance.service_order:
        return
    
    try:
        # Buscar y eliminar el documento asociado
        OrderDocument.objects.filter(
            order=instance.service_order,
            description__contains=f"Transfer-{instance.id}"
        ).delete()
    except Exception as e:
        logger.error(f"Error al eliminar documento del transfer: {e}")


@receiver(post_save, sender=BatchPayment)
def sync_batch_payment_documents(sender, instance, created, **kwargs):
    """
    Cuando se crea o actualiza un BatchPayment con comprobante,
    sincroniza el archivo con los OrderDocuments de todas las OS afectadas.
    """
    if not instance.proof_file:
        return

    try:
        # Obtener todas las OS únicas afectadas por este pago agrupado
        service_orders = instance.get_service_orders()

        for service_order in service_orders:
            # Buscar si ya existe un documento para este lote
            existing_doc = OrderDocument.objects.filter(
                order=service_order,
                description__contains=f"Lote {instance.batch_number}"
            ).first()

            description = f"Comprobante Pago Lote {instance.batch_number} - {instance.provider.name} - ${instance.total_amount}"

            if existing_doc:
                # Actualizar si el archivo cambió
                if existing_doc.file != instance.proof_file:
                    # Eliminar archivo antiguo
                    if existing_doc.file:
                        try:
                            if os.path.isfile(existing_doc.file.path):
                                os.remove(existing_doc.file.path)
                        except:
                            pass

                    existing_doc.file = instance.proof_file
                    existing_doc.description = description
                    existing_doc.save()
            else:
                # Crear nuevo documento
                OrderDocument.objects.create(
                    order=service_order,
                    document_type='pago_proveedor',
                    file=instance.proof_file,
                    description=description,
                    uploaded_by=instance.created_by
                )
    except Exception as e:
        logger.error(f"Error al sincronizar documentos del pago agrupado: {e}")


@receiver(post_delete, sender=BatchPayment)
def delete_batch_payment_documents(sender, instance, **kwargs):
    """
    Elimina los OrderDocuments asociados al BatchPayment cuando se elimina.
    """
    try:
        # Eliminar todos los documentos asociados a este lote
        OrderDocument.objects.filter(
            description__contains=f"Lote {instance.batch_number}"
        ).delete()
    except Exception as e:
        logger.error(f"Error al eliminar documentos del pago agrupado: {e}")


@receiver(post_save, sender=ProviderCreditNote)
def sync_credit_note_document(sender, instance, created, **kwargs):
    """
    Sincroniza el PDF de la Nota de Crédito con los documentos de la OS.
    Se basa en el 'original_transfer' vinculado a la NC.
    """
    # Validar que tenga PDF y esté vinculada a un transfer con OS
    if not instance.pdf_file or not instance.original_transfer or not instance.original_transfer.service_order:
        return

    try:
        service_order = instance.original_transfer.service_order
        
        # Descripción única para identificar el documento
        description_key = f"NC-{instance.note_number}"
        description = f"Nota de Crédito {instance.note_number} - {instance.provider.name} - ${instance.amount}"

        # Buscar si ya existe
        existing_doc = OrderDocument.objects.filter(
            order=service_order,
            description__contains=description_key
        ).first()

        if existing_doc:
            # Actualizar si el archivo cambió
            if existing_doc.file != instance.pdf_file:
                # Eliminar archivo antiguo
                if existing_doc.file:
                    try:
                        if os.path.isfile(existing_doc.file.path):
                            os.remove(existing_doc.file.path)
                    except:
                        pass
                
                existing_doc.file = instance.pdf_file
                existing_doc.description = description
                existing_doc.save()
        else:
            # Crear nuevo documento
            OrderDocument.objects.create(
                order=service_order,
                document_type='factura_costo', # Se clasifica como factura de costo/comprobante
                file=instance.pdf_file,
                description=description,
                uploaded_by=instance.created_by
            )

    except Exception as e:
        logger.error(f"Error al sincronizar documento de Nota de Crédito: {e}")


@receiver(post_delete, sender=ProviderCreditNote)
def delete_credit_note_document(sender, instance, **kwargs):
    """
    Elimina el documento asociado cuando se elimina una Nota de Crédito.
    """
    if not instance.original_transfer or not instance.original_transfer.service_order:
        return

    try:
        description_key = f"NC-{instance.note_number}"
        OrderDocument.objects.filter(
            order=instance.original_transfer.service_order,
            description__contains=description_key
        ).delete()
    except Exception as e:
        logger.error(f"Error al eliminar documento de Nota de Crédito: {e}")


@receiver(post_save, sender=CreditNoteApplication)
def sync_application_document(sender, instance, created, **kwargs):
    """
    Sincroniza el PDF de la NC con la OS de la factura APLICADA.
    Esto permite que si aplico una NC a la factura B, la OS de B tenga el documento.
    """
    # Validar que la NC tenga archivo y el transfer tenga OS
    if not instance.credit_note.pdf_file or not instance.transfer.service_order:
        return

    # Si la aplicación es a la misma factura original, ya lo maneja el signal de ProviderCreditNote
    if instance.transfer == instance.credit_note.original_transfer:
        return

    try:
        service_order = instance.transfer.service_order
        credit_note = instance.credit_note
        
        # Descripción única
        description_key = f"Aplicación NC-{credit_note.note_number}"
        description = f"Aplicación NC {credit_note.note_number} a Factura {instance.transfer.invoice_number} - Aplicado: ${instance.amount}"

        existing_doc = OrderDocument.objects.filter(
            order=service_order,
            description__contains=description_key
        ).first()

        if existing_doc:
            if existing_doc.file != credit_note.pdf_file:
                existing_doc.file = credit_note.pdf_file
                existing_doc.description = description
                existing_doc.save()
        else:
             OrderDocument.objects.create(
                order=service_order,
                document_type='pago_proveedor', # Clasificado como pago
                file=credit_note.pdf_file,
                description=description,
                uploaded_by=instance.applied_by
            )
            
    except Exception as e:
        logger.error(f"Error al sincronizar documento de aplicación de NC: {e}")


@receiver(post_delete, sender=CreditNoteApplication)
def delete_application_document(sender, instance, **kwargs):
    """
    Elimina el documento generado por la aplicación.
    """
    if not instance.transfer.service_order:
        return

    try:
        credit_note = instance.credit_note
        description_key = f"Aplicación NC-{credit_note.note_number}"
        
        OrderDocument.objects.filter(
            order=instance.transfer.service_order,
            description__contains=description_key
        ).delete()
    except Exception as e:
        logger.error(f"Error al eliminar documento de aplicación de NC: {e}")