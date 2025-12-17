"""
Management command to check infrastructure health (PostgreSQL + Redis).
Usage: python manage.py check_infra
"""
from django.core.management.base import BaseCommand
from django.db import connections
from django.core.cache import caches
from django.conf import settings
import time


class Command(BaseCommand):
    help = 'Check infrastructure health (database and cache)'

    def handle(self, *args, **options):
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(' GPRO Logistic - Infrastructure Health Check')
        self.stdout.write('=' * 50 + '\n')
        
        all_healthy = True
        
        # Check Database
        self.stdout.write('\n📦 DATABASE')
        self.stdout.write('-' * 30)
        try:
            db_engine = settings.DATABASES['default']['ENGINE']
            db_name = settings.DATABASES['default'].get('NAME', 'Unknown')
            
            if 'postgresql' in db_engine:
                self.stdout.write(f'   Engine: PostgreSQL')
                self.stdout.write(f'   Database: {db_name}')
                self.stdout.write(f'   Host: {settings.DATABASES["default"].get("HOST", "localhost")}')
            else:
                self.stdout.write(f'   Engine: SQLite')
                self.stdout.write(f'   File: {db_name}')
            
            # Test connection
            start = time.time()
            connection = connections['default']
            connection.ensure_connection()
            
            # Execute simple query
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            
            latency = (time.time() - start) * 1000
            self.stdout.write(self.style.SUCCESS(f'   Status: ✓ Connected ({latency:.1f}ms)'))
            
        except Exception as e:
            all_healthy = False
            self.stdout.write(self.style.ERROR(f'   Status: ✗ Error - {e}'))
        
        # Check Redis / Cache
        self.stdout.write('\n💾 CACHE (Redis)')
        self.stdout.write('-' * 30)
        try:
            redis_enabled = getattr(settings, 'REDIS_ENABLED', False)
            
            if redis_enabled:
                self.stdout.write(f'   Backend: Redis')
                self.stdout.write(f'   URL: {settings.REDIS_URL}')
                
                # Test default cache
                cache = caches['default']
                start = time.time()
                cache.set('health_check', 'ok', 10)
                result = cache.get('health_check')
                cache.delete('health_check')
                latency = (time.time() - start) * 1000
                
                if result == 'ok':
                    self.stdout.write(self.style.SUCCESS(f'   Default Cache: ✓ Connected ({latency:.1f}ms)'))
                else:
                    raise Exception('Cache set/get failed')
                
                # Test locks cache
                try:
                    locks_cache = caches['locks']
                    locks_cache.set('lock_health', 'ok', 10)
                    locks_cache.delete('lock_health')
                    self.stdout.write(self.style.SUCCESS('   Locks Cache: ✓ Connected'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'   Locks Cache: ⚠ {e}'))
                    
            else:
                self.stdout.write('   Backend: Local Memory (development)')
                self.stdout.write(self.style.WARNING('   ⚠ Redis not enabled - using local memory cache'))
                
                # Test local cache anyway
                cache = caches['default']
                cache.set('health_check', 'ok', 10)
                result = cache.get('health_check')
                cache.delete('health_check')
                
                if result == 'ok':
                    self.stdout.write(self.style.SUCCESS('   Local Cache: ✓ Working'))
                    
        except Exception as e:
            all_healthy = False
            self.stdout.write(self.style.ERROR(f'   Status: ✗ Error - {e}'))
        
        # Check Environment
        self.stdout.write('\n⚙️  ENVIRONMENT')
        self.stdout.write('-' * 30)
        self.stdout.write(f'   Environment: {getattr(settings, "ENVIRONMENT", "unknown")}')
        self.stdout.write(f'   Debug: {settings.DEBUG}')
        self.stdout.write(f'   Redis Enabled: {getattr(settings, "REDIS_ENABLED", False)}')
        
        # Summary
        self.stdout.write('\n' + '=' * 50)
        if all_healthy:
            self.stdout.write(self.style.SUCCESS(' ✓ All systems operational'))
        else:
            self.stdout.write(self.style.ERROR(' ✗ Some systems have issues'))
        self.stdout.write('=' * 50 + '\n')
