from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Transfer, BatchPayment
from apps.orders.models import OrderDocument
import os


@receiver(post_save, sender=Transfer)
def sync_transfer_document(sender, instance, created, **kwargs):
    """
    Sincroniza el comprobante del pago a proveedor con los documentos de la OS.
    Crea o actualiza un OrderDocument cuando hay un invoice_file.
    """
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
        print(f"Error al sincronizar documento del transfer: {e}")


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
        print(f"Error al eliminar documento del transfer: {e}")


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
                    document_type='factura_costo',
                    file=instance.proof_file,
                    description=description,
                    uploaded_by=instance.created_by
                )
    except Exception as e:
        print(f"Error al sincronizar documentos del pago agrupado: {e}")


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
        print(f"Error al eliminar documentos del pago agrupado: {e}")
