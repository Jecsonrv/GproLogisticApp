
@receiver(post_save, sender=InvoicePayment)
def notify_payment_received(sender, instance, created, **kwargs):
    """
    Notificar cuando se recibe un pago de cliente
    """
    if created and instance.amount > 0:
        # Notificar al creador de la factura (si existe y no es quien registró el pago)
        invoice_creator = instance.invoice.created_by
        payment_registrar = getattr(instance, 'created_by', None)
        
        if invoice_creator and invoice_creator != payment_registrar:
            Notification.create_notification(
                user=invoice_creator,
                title="Pago Recibido",
                message=f"Se registró un pago de ${instance.amount} para la factura {instance.invoice.invoice_number}",
                notification_type='success',
                category='payment',
                related_object=instance.invoice
            )
