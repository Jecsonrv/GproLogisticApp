from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import (
    Transfer,
    BatchPayment,
    ProviderCreditNote,
    CreditNoteApplication,
    ProviderInvoice,
    TransferPayment,
    ProviderInvoicePayment,
    DirectCostAllocation,
)
from apps.orders.models import OrderDocument
from apps.users.models import Notification
import os
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


def _safe_float(value):
    try:
        if value is None:
            return None
        if isinstance(value, Decimal):
            return float(value)
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_actor(instance):
    return getattr(instance, '_current_user', None) or getattr(instance, 'created_by', None)


def _create_order_history_event(service_order, actor, event_type, description, metadata=None):
    if not service_order:
        return

    from apps.orders.models import OrderHistory

    OrderHistory.objects.create(
        service_order=service_order,
        user=actor,
        event_type=event_type,
        description=description,
        metadata=metadata or {},
    )


def _capture_previous_deleted_state(model_cls, instance):
    if not instance.pk:
        instance._was_deleted = False
        return

    try:
        previous = model_cls.all_objects.get(pk=instance.pk)
        instance._was_deleted = previous.is_deleted
    except model_cls.DoesNotExist:
        instance._was_deleted = False


@receiver(pre_save, sender=Transfer)
def capture_transfer_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(Transfer, instance)


@receiver(pre_save, sender=TransferPayment)
def capture_transfer_payment_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(TransferPayment, instance)


@receiver(pre_save, sender=ProviderInvoice)
def capture_provider_invoice_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(ProviderInvoice, instance)


@receiver(pre_save, sender=ProviderInvoicePayment)
def capture_provider_invoice_payment_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(ProviderInvoicePayment, instance)


@receiver(pre_save, sender=DirectCostAllocation)
def capture_direct_cost_allocation_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(DirectCostAllocation, instance)


@receiver(pre_save, sender=ProviderCreditNote)
def capture_provider_credit_note_deleted_state(sender, instance, **kwargs):
    _capture_previous_deleted_state(ProviderCreditNote, instance)


@receiver(post_save, sender=Transfer)
def audit_transfer_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    provider_name = instance.provider.name if instance.provider else instance.beneficiary_name or 'N/A'
    _create_order_history_event(
        service_order=instance.service_order,
        actor=_resolve_actor(instance),
        event_type='payment_deleted',
        description=f'Gasto eliminado: {provider_name}',
        metadata={
            'source': 'transfer',
            'transfer_id': instance.id,
            'provider': provider_name,
            'amount': _safe_float(instance.amount),
            'status': instance.status,
        },
    )


@receiver(post_save, sender=TransferPayment)
def audit_transfer_payment_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    transfer = instance.transfer
    provider_name = transfer.provider.name if transfer and transfer.provider else transfer.beneficiary_name if transfer else 'N/A'
    _create_order_history_event(
        service_order=transfer.service_order if transfer else None,
        actor=_resolve_actor(instance),
        event_type='payment_deleted',
        description=f'Pago a proveedor eliminado: {provider_name}',
        metadata={
            'source': 'transfer_payment',
            'payment_id': instance.id,
            'transfer_id': transfer.id if transfer else None,
            'provider': provider_name,
            'amount': _safe_float(instance.amount),
            'payment_method': instance.payment_method,
            'payment_date': instance.payment_date.isoformat() if instance.payment_date else None,
        },
    )


@receiver(post_save, sender=ProviderInvoice)
def audit_provider_invoice_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    provider_name = instance.provider.name if instance.provider else 'N/A'
    _create_order_history_event(
        service_order=instance.service_order,
        actor=_resolve_actor(instance),
        event_type='payment_deleted',
        description=f'Factura de proveedor eliminada: {instance.invoice_number}',
        metadata={
            'source': 'provider_invoice',
            'provider_invoice_id': instance.id,
            'invoice_number': instance.invoice_number,
            'provider': provider_name,
            'amount': _safe_float(instance.total_amount),
            'payment_status': instance.payment_status,
        },
    )


@receiver(post_save, sender=ProviderInvoicePayment)
def audit_provider_invoice_payment_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    invoice = instance.provider_invoice
    provider_name = invoice.provider.name if invoice and invoice.provider else 'N/A'
    _create_order_history_event(
        service_order=invoice.service_order if invoice else None,
        actor=_resolve_actor(instance),
        event_type='payment_deleted',
        description=f'Pago de factura de proveedor eliminado: {invoice.invoice_number if invoice else "N/A"}',
        metadata={
            'source': 'provider_invoice_payment',
            'payment_id': instance.id,
            'provider_invoice_id': invoice.id if invoice else None,
            'invoice_number': invoice.invoice_number if invoice else None,
            'provider': provider_name,
            'amount': _safe_float(instance.amount),
            'payment_method': instance.payment_method,
            'payment_date': instance.payment_date.isoformat() if instance.payment_date else None,
        },
    )


@receiver(post_save, sender=DirectCostAllocation)
def audit_direct_cost_allocation_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    invoice = instance.provider_invoice
    service_name = None
    if instance.order_charge and instance.order_charge.service:
        service_name = instance.order_charge.service.name

    _create_order_history_event(
        service_order=invoice.service_order if invoice else None,
        actor=_resolve_actor(instance),
        event_type='charge_deleted',
        description=f'Asignación de costo eliminada: {service_name or "Servicio"}',
        metadata={
            'source': 'direct_cost_allocation',
            'allocation_id': instance.id,
            'provider_invoice_id': invoice.id if invoice else None,
            'invoice_number': invoice.invoice_number if invoice else None,
            'service': service_name,
            'amount': _safe_float(instance.cost_amount),
        },
    )


@receiver(post_save, sender=ProviderCreditNote)
def audit_provider_credit_note_soft_delete(sender, instance, created, **kwargs):
    if created or not instance.is_deleted or getattr(instance, '_was_deleted', False):
        return

    related_transfer = instance.original_transfer
    _create_order_history_event(
        service_order=related_transfer.service_order if related_transfer else None,
        actor=_resolve_actor(instance),
        event_type='payment_deleted',
        description=f'Nota de crédito eliminada: {instance.note_number}',
        metadata={
            'source': 'provider_credit_note',
            'credit_note_id': instance.id,
            'note_number': instance.note_number,
            'provider': instance.provider.name if instance.provider else None,
            'amount': _safe_float(instance.amount),
            'status': instance.status,
        },
    )


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
        # Usar clave exacta con delimitadores para evitar coincidencias parciales
        # Ej: [Transfer:42] no matchea con [Transfer:421]
        description_key = f"[Transfer:{instance.id}]"
        
        # Buscar si ya existe un documento vinculado a este transfer
        existing_doc = OrderDocument.objects.filter(
            order=instance.service_order,
            description__contains=description_key
        ).first()
        
        # Generar descripción descriptiva
        provider_name = instance.provider.name if instance.provider else instance.beneficiary_name or "Proveedor"
        description = f"Comprobante - {provider_name} - ${instance.amount} {description_key}"
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
        # Buscar y eliminar el documento asociado usando clave exacta
        description_key = f"[Transfer:{instance.id}]"
        OrderDocument.objects.filter(
            order=instance.service_order,
            description__contains=description_key
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

        # Usar clave exacta con delimitadores
        description_key = f"[Lote:{instance.batch_number}]"

        for service_order in service_orders:
            # Buscar si ya existe un documento para este lote
            existing_doc = OrderDocument.objects.filter(
                order=service_order,
                description__contains=description_key
            ).first()

            description = f"Comprobante Pago {description_key} - {instance.provider.name} - ${instance.total_amount}"

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
        logger.error(f"Error al sincronizar documentos del pago agrupado: {e}")


@receiver(post_delete, sender=BatchPayment)
def delete_batch_payment_documents(sender, instance, **kwargs):
    """
    Elimina los OrderDocuments asociados al BatchPayment cuando se elimina.
    Solo elimina documentos que contengan la clave exacta del lote.
    """
    try:
        description_key = f"[Lote:{instance.batch_number}]"
        OrderDocument.objects.filter(
            description__contains=description_key
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
        
        # Descripción única con delimitadores para evitar coincidencias parciales
        description_key = f"[NC:{instance.note_number}]"
        description = f"Nota de Crédito {instance.note_number} - {instance.provider.name} - ${instance.amount} {description_key}"

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
        description_key = f"[NC:{instance.note_number}]"
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
        
        # Descripción única con delimitadores
        description_key = f"[AppNC:{credit_note.note_number}:{instance.transfer_id}]"
        description = f"Aplicación NC {credit_note.note_number} a Factura {instance.transfer.invoice_number} - Aplicado: ${instance.amount} {description_key}"

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
                document_type='factura_costo',
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
        description_key = f"[AppNC:{credit_note.note_number}:{instance.transfer_id}]"
        
        OrderDocument.objects.filter(
            order=instance.transfer.service_order,
            description__contains=description_key
        ).delete()
    except Exception as e:
        logger.error(f"Error al eliminar documento de aplicación de NC: {e}")


@receiver(post_save, sender=Transfer)
def sync_invoice_totals_on_transfer_change(sender, instance, created, **kwargs):
    """
    CRITICAL FIX: Sincronización Financiera.
    Si se modifica un Transfer (gasto) que está vinculado a una Factura (Invoice),
    se debe forzar el recálculo de la factura para reflejar cambios en montos, márgenes o IVA.
    """
    if instance.invoice:
        try:
            # Recalcular totales de la factura vinculada
            instance.invoice.calculate_totals()
            logger.info(f"Sincronizados totales de Factura #{instance.invoice.id} por cambios en Gasto #{instance.id}")
        except Exception as e:
            logger.error(f"Error al sincronizar totales de factura desde transfer: {e}")