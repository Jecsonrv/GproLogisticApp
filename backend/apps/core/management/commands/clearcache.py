"""
Management command to clear application cache.
Usage: python manage.py clearcache [--all|--dashboard|--clients|--locks]
"""
from django.core.management.base import BaseCommand
from django.core.cache import caches


class Command(BaseCommand):
    help = 'Clear application cache (Redis or local memory)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all caches (default, locks, sessions)',
        )
        parser.add_argument(
            '--dashboard',
            action='store_true',
            help='Clear only dashboard cache',
        )
        parser.add_argument(
            '--locks',
            action='store_true',
            help='Clear distributed locks (use with caution)',
        )
        parser.add_argument(
            '--pattern',
            type=str,
            help='Clear keys matching pattern (e.g., "invoice_*")',
        )

    def handle(self, *args, **options):
        try:
            default_cache = caches['default']
            
            if options['all']:
                # Clear all caches
                self.stdout.write('Clearing all caches...')
                default_cache.clear()
                self.stdout.write(self.style.SUCCESS('✓ Default cache cleared'))
                
                try:
                    locks_cache = caches['locks']
                    locks_cache.clear()
                    self.stdout.write(self.style.SUCCESS('✓ Locks cache cleared'))
                except Exception:
                    pass
                    
                try:
                    sessions_cache = caches['sessions']
                    sessions_cache.clear()
                    self.stdout.write(self.style.SUCCESS('✓ Sessions cache cleared'))
                except Exception:
                    pass
                    
            elif options['dashboard']:
                # Clear only dashboard keys
                keys_to_delete = [
                    'dashboard_main_metrics',
                    'dashboard_alerts',
                    'dashboard_top_clients',
                    'dashboard_recent_orders',
                ]
                for key in keys_to_delete:
                    default_cache.delete(key)
                self.stdout.write(self.style.SUCCESS('✓ Dashboard cache cleared'))
                
            elif options['locks']:
                try:
                    locks_cache = caches['locks']
                    locks_cache.clear()
                    self.stdout.write(self.style.SUCCESS('✓ Distributed locks cleared'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error clearing locks: {e}'))
                    
            elif options['pattern']:
                pattern = options['pattern']
                # Note: Pattern delete only works with Redis backend
                try:
                    client = default_cache.client.get_client()
                    keys = client.keys(f'gpro:{pattern}')
                    if keys:
                        client.delete(*keys)
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ Deleted {len(keys)} keys matching "{pattern}"')
                        )
                    else:
                        self.stdout.write(f'No keys found matching "{pattern}"')
                except AttributeError:
                    self.stdout.write(
                        self.style.WARNING('Pattern delete only available with Redis backend')
                    )
            else:
                # Default: clear main cache
                default_cache.clear()
                self.stdout.write(self.style.SUCCESS('✓ Default cache cleared'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))
