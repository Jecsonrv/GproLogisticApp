from django.core.management.base import BaseCommand
from django.db.models import Exists, OuterRef
from django.utils import timezone

from apps.orders.models import OrderCharge
from apps.transfers.models import DirectCostAllocation


class Command(BaseCommand):
    help = (
        "Corrige cargos marcados como tercerizados sin asignacion activa "
        "de costo directo (huerfanos historicos)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica los cambios. Sin esta bandera solo muestra vista previa.",
        )
        parser.add_argument(
            "--service-order-id",
            type=int,
            default=None,
            help="Limita la correccion a una orden de servicio especifica.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limita la cantidad de registros a procesar (0 = sin limite).",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        service_order_id = options["service_order_id"]
        limit = max(0, int(options["limit"] or 0))

        orphan_allocations_qs = DirectCostAllocation.objects.filter(
            is_deleted=False,
            provider_invoice__is_deleted=True,
        )
        if service_order_id:
            orphan_allocations_qs = orphan_allocations_qs.filter(
                order_charge__service_order_id=service_order_id
            )
        if limit:
            orphan_allocations_qs = orphan_allocations_qs[:limit]

        orphan_allocations = list(orphan_allocations_qs)

        if orphan_allocations:
            self.stdout.write(
                self.style.WARNING(
                    f"Se detectaron {len(orphan_allocations)} asignacion(es) activa(s) con factura de proveedor eliminada."
                )
            )

            for alloc in orphan_allocations:
                self.stdout.write(
                    f"  - Allocation #{alloc.id} | Charge #{alloc.order_charge_id} | ProviderInvoice #{alloc.provider_invoice_id} (eliminada)"
                )

            if apply_changes:
                now = timezone.now()
                DirectCostAllocation.objects.filter(
                    id__in=[alloc.id for alloc in orphan_allocations]
                ).update(is_deleted=True, deleted_at=now)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Asignaciones huérfanas por factura eliminada desactivadas: {len(orphan_allocations)}."
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        "Vista previa: estas asignaciones se desactivarán al usar --apply."
                    )
                )

        active_allocation = DirectCostAllocation.objects.filter(
            order_charge_id=OuterRef("pk"),
            is_deleted=False,
            provider_invoice__is_deleted=False,
        )

        queryset = (
            OrderCharge.objects.filter(
                is_deleted=False,
                is_third_party_service=True,
            )
            .annotate(has_active_allocation=Exists(active_allocation))
            .filter(has_active_allocation=False)
            .select_related("service_order", "invoice", "service")
            .order_by("id")
        )

        if service_order_id:
            queryset = queryset.filter(service_order_id=service_order_id)

        if limit:
            queryset = queryset[:limit]

        orphan_charges = list(queryset)

        if not orphan_charges:
            self.stdout.write(
                self.style.SUCCESS(
                    "No se encontraron cargos tercerizados huerfanos."
                )
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f"Se detectaron {len(orphan_charges)} cargo(s) tercerizado(s) sin asignacion activa."
            )
        )

        for charge in orphan_charges:
            invoice_info = f"Factura #{charge.invoice_id}" if charge.invoice_id else "Sin factura"
            self.stdout.write(
                f"  - Charge #{charge.id} | OS {charge.service_order.order_number} | "
                f"Servicio: {charge.service.name} | {invoice_info}"
            )

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    "Vista previa completada. Use --apply para ejecutar la correccion."
                )
            )
            return

        updated = 0
        for charge in orphan_charges:
            OrderCharge.objects.filter(pk=charge.pk).update(
                is_third_party_service=False
            )
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Correccion aplicada. Cargos normalizados: {updated}."
            )
        )
