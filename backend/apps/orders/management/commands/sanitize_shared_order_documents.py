import os

from django.core.files.base import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from apps.orders.models import OrderDocument, order_document_upload_path


class Command(BaseCommand):
    help = (
        "Detect and sanitize shared OrderDocument file paths across service orders. "
        "Default mode is dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Without this flag, the command only reports.",
        )
        parser.add_argument(
            "--order-number",
            type=str,
            help="Scope analysis to shared files that affect this OS number (e.g. 300-2026).",
        )
        parser.add_argument(
            "--group-limit",
            type=int,
            default=None,
            help="Limit the number of shared file groups to process/report.",
        )
        parser.add_argument(
            "--min-os-count",
            type=int,
            default=2,
            help="Only include file groups present in at least N distinct orders.",
        )
        parser.add_argument(
            "--show-groups",
            action="store_true",
            help="Print each shared group path and counters.",
        )
        parser.add_argument(
            "--only-order-records",
            action="store_true",
            help=(
                "When used with --order-number, only repoint records from that OS. "
                "Useful for phased rollout."
            ),
        )
        parser.add_argument(
            "--stop-on-error",
            action="store_true",
            help="Stop execution on first file copy/update error during apply.",
        )

    def _get_shared_groups(self, order_number=None, min_os_count=2, group_limit=None):
        shared = OrderDocument.objects.values("file").annotate(
            total=Count("id"),
            os_count=Count("order", distinct=True),
        ).filter(os_count__gte=min_os_count)

        if order_number:
            scoped_files = OrderDocument.objects.filter(
                order__order_number=order_number
            ).values_list("file", flat=True)
            shared = shared.filter(file__in=scoped_files)

        shared = shared.order_by("-os_count", "-total", "file")
        if group_limit:
            shared = shared[:group_limit]

        return list(shared)

    def _copy_to_unique_path(self, doc):
        old_name = (doc.file.name or "").strip()
        if not old_name:
            raise CommandError(f"OrderDocument {doc.id} has empty file path")

        if not default_storage.exists(old_name):
            raise CommandError(
                f"Source file does not exist for OrderDocument {doc.id}: {old_name}"
            )

        source_basename = os.path.basename(old_name) or f"document_{doc.id}"

        with default_storage.open(old_name, "rb") as src:
            target_name = order_document_upload_path(doc, source_basename)
            saved_name = default_storage.save(target_name, File(src))

        doc.file.name = saved_name
        doc.save(update_fields=["file"])

        return old_name, saved_name

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        order_number = options.get("order_number")
        group_limit = options.get("group_limit")
        min_os_count = options.get("min_os_count")
        show_groups = options.get("show_groups")
        only_order_records = options.get("only_order_records")
        stop_on_error = options.get("stop_on_error")

        if min_os_count < 2:
            raise CommandError("--min-os-count must be >= 2")

        if only_order_records and not order_number:
            raise CommandError("--only-order-records requires --order-number")

        shared_groups = self._get_shared_groups(
            order_number=order_number,
            min_os_count=min_os_count,
            group_limit=group_limit,
        )

        shared_paths = len(shared_groups)
        affected_documents = sum(g["total"] for g in shared_groups)
        records_to_repoint = 0
        if only_order_records:
            for group in shared_groups:
                docs_qs = OrderDocument.objects.filter(file=group["file"])
                target_count = docs_qs.filter(order__order_number=order_number).count()
                if target_count == 0:
                    continue
                non_target_count = docs_qs.exclude(order__order_number=order_number).count()
                if non_target_count > 0:
                    records_to_repoint += target_count
                else:
                    records_to_repoint += max(target_count - 1, 0)
        else:
            records_to_repoint = sum(max(g["total"] - 1, 0) for g in shared_groups)

        mode = "APPLY" if apply_changes else "DRY-RUN"
        self.stdout.write(self.style.WARNING(f"Mode: {mode}"))
        if order_number:
            self.stdout.write(f"Scope order_number: {order_number}")

        self.stdout.write(
            f"Shared groups: {shared_paths} | Affected documents: {affected_documents} | "
            f"Documents to repoint: {records_to_repoint}"
        )

        if shared_paths == 0:
            self.stdout.write(self.style.SUCCESS("No shared file groups found."))
            return

        if show_groups:
            self.stdout.write("\nTop shared groups in scope:")
            for group in shared_groups:
                self.stdout.write(
                    f"- {group['file']} | total={group['total']} | os_count={group['os_count']}"
                )

        if not apply_changes:
            self.stdout.write(
                self.style.SUCCESS(
                    "Dry-run complete. Use --apply to repoint duplicates to unique file paths."
                )
            )
            return

        updated = 0
        skipped_empty = 0
        errors = 0

        self.stdout.write("\nApplying changes (no file deletions will be performed)...")

        for index, group in enumerate(shared_groups, start=1):
            file_path = group["file"]
            docs = list(
                OrderDocument.objects.filter(file=file_path)
                .select_related("order")
                .order_by("id")
            )

            if len(docs) <= 1:
                continue

            keeper = docs[0]
            duplicates = docs[1:]

            if only_order_records:
                target_docs = [
                    d for d in docs if d.order and d.order.order_number == order_number
                ]
                if not target_docs:
                    continue

                non_target_docs = [
                    d for d in docs if not d.order or d.order.order_number != order_number
                ]

                if non_target_docs:
                    # Desacoplar toda la OS objetivo del archivo compartido.
                    duplicates = target_docs
                    keeper = non_target_docs[0]
                else:
                    # Si el grupo solo pertenece a esa OS, mantener uno y repuntar el resto.
                    keeper = target_docs[0]
                    duplicates = target_docs[1:]

                if not duplicates:
                    continue

            self.stdout.write(
                f"[{index}/{shared_paths}] file={file_path} | keep_doc_id={keeper.id} | repoint={len(duplicates)}"
            )

            for doc in duplicates:
                if not doc.file:
                    skipped_empty += 1
                    continue

                try:
                    old_name, new_name = self._copy_to_unique_path(doc)
                    updated += 1
                    self.stdout.write(
                        f"  repointed doc_id={doc.id} os={doc.order.order_number}"
                        f" old={old_name} -> new={new_name}"
                    )
                except Exception as exc:
                    errors += 1
                    self.stderr.write(
                        self.style.ERROR(
                            f"  error doc_id={doc.id} os={doc.order.order_number}: {exc}"
                        )
                    )
                    if stop_on_error:
                        raise

        self.stdout.write("\nSummary:")
        self.stdout.write(f"- Updated docs: {updated}")
        self.stdout.write(f"- Skipped empty file refs: {skipped_empty}")
        self.stdout.write(f"- Errors: {errors}")
        self.stdout.write(
            self.style.SUCCESS(
                "Sanitization finished. Original files were NOT deleted by this command."
            )
        )
