"""
GPRO Logistic - Sistema de Caché y Locks Distribuidos
=====================================================

Este módulo proporciona:
1. Decoradores para cachear respuestas de views
2. Locks distribuidos para operaciones críticas (facturación, pagos)
3. Utilidades de caché para el Dashboard y consultas pesadas

Uso de Locks:
    @distributed_lock('facturar_os_{order_id}')
    def facturar_orden(order_id):
        # Solo un proceso puede ejecutar esto a la vez para la misma orden
        ...

Uso de Cache:
    @cache_response(timeout=300, key_prefix='dashboard')
    def get_dashboard_metrics(request):
        ...
"""

import functools
import hashlib
import time
import logging
from contextlib import contextmanager
from typing import Optional, Callable, Any

from django.conf import settings
from django.core.cache import caches
from rest_framework.response import Response

logger = logging.getLogger(__name__)


# ============================================
# DISTRIBUTED LOCKS
# ============================================

class LockAcquisitionError(Exception):
    """Error cuando no se puede obtener un lock."""
    pass


class DistributedLock:
    """
    Lock distribuido usando Redis (o caché local en desarrollo).
    
    Garantiza que solo un proceso pueda ejecutar una operación crítica
    a la vez, incluso en un cluster de servidores.
    
    Ejemplo:
        lock = DistributedLock('facturar_os_123')
        if lock.acquire():
            try:
                # Operación crítica
                facturar_orden(123)
            finally:
                lock.release()
    """
    
    def __init__(
        self, 
        lock_name: str, 
        timeout: int = None,
        retry_count: int = 3,
        retry_delay: float = 0.1
    ):
        self.lock_name = f"lock:{lock_name}"
        self.timeout = timeout or getattr(settings, 'DISTRIBUTED_LOCK_TIMEOUT', 30)
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self._lock_value = None
        
        # Usar caché de locks si está disponible
        try:
            self.cache = caches['locks']
        except Exception:
            self.cache = caches['default']
    
    def acquire(self) -> bool:
        """
        Intenta adquirir el lock.
        
        Returns:
            True si se obtuvo el lock, False si no.
        """
        import uuid
        self._lock_value = str(uuid.uuid4())
        
        for attempt in range(self.retry_count):
            # Intentar establecer el lock (nx = solo si no existe)
            acquired = self.cache.add(
                self.lock_name, 
                self._lock_value, 
                self.timeout
            )
            
            if acquired:
                logger.debug(f"Lock adquirido: {self.lock_name}")
                return True
            
            if attempt < self.retry_count - 1:
                time.sleep(self.retry_delay)
        
        logger.warning(f"No se pudo adquirir lock: {self.lock_name}")
        return False
    
    def release(self) -> bool:
        """
        Libera el lock si lo poseemos.
        
        Returns:
            True si se liberó, False si no era nuestro.
        """
        current_value = self.cache.get(self.lock_name)
        
        if current_value == self._lock_value:
            self.cache.delete(self.lock_name)
            logger.debug(f"Lock liberado: {self.lock_name}")
            return True
        
        logger.warning(f"Lock no liberado (no era nuestro): {self.lock_name}")
        return False
    
    def __enter__(self):
        if not self.acquire():
            raise LockAcquisitionError(
                f"No se pudo obtener lock para: {self.lock_name}"
            )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False


@contextmanager
def distributed_lock(
    lock_name: str, 
    timeout: int = None,
    raise_on_failure: bool = True
):
    """
    Context manager para locks distribuidos.
    
    Args:
        lock_name: Nombre único del lock
        timeout: Tiempo máximo del lock en segundos
        raise_on_failure: Si True, lanza excepción si no se obtiene el lock
    
    Ejemplo:
        with distributed_lock('facturar_os_123'):
            procesar_factura(123)
    
    Raises:
        LockAcquisitionError: Si no se puede obtener el lock y raise_on_failure=True
    """
    lock = DistributedLock(lock_name, timeout=timeout)
    acquired = lock.acquire()
    
    if not acquired and raise_on_failure:
        raise LockAcquisitionError(
            f"Operación en progreso. Intente nuevamente en unos segundos."
        )
    
    try:
        yield acquired
    finally:
        if acquired:
            lock.release()


def require_lock(lock_name_template: str, timeout: int = None):
    """
    Decorador para funciones que requieren lock exclusivo.
    
    El template puede incluir argumentos de la función.
    
    Ejemplo:
        @require_lock('facturar_os_{order_id}')
        def facturar_orden(order_id):
            ...
        
        @require_lock('pagar_proveedor_{provider_id}_{amount}')
        def procesar_pago(provider_id, amount):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Construir nombre del lock con argumentos
            # Combinar args posicionales con kwargs
            func_args = func.__code__.co_varnames[:func.__code__.co_argcount]
            all_kwargs = dict(zip(func_args, args))
            all_kwargs.update(kwargs)
            
            lock_name = lock_name_template.format(**all_kwargs)
            
            with distributed_lock(lock_name, timeout=timeout):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


# ============================================
# RESPONSE CACHING
# ============================================

def get_cache_key(prefix: str, request, *args, **kwargs) -> str:
    """
    Genera una clave de caché única basada en:
    - Prefijo
    - Path de la request
    - Query params
    - Usuario (si está autenticado)
    """
    parts = [prefix, request.path]
    
    # Incluir query params ordenados
    if request.GET:
        query_string = '&'.join(
            f"{k}={v}" for k, v in sorted(request.GET.items())
        )
        parts.append(query_string)
    
    # Incluir usuario para datos personalizados
    if hasattr(request, 'user') and request.user.is_authenticated:
        parts.append(f"user:{request.user.id}")
    
    # Crear hash para keys muy largas
    key_string = ':'.join(parts)
    if len(key_string) > 200:
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    return key_string


def cache_response(
    timeout: int = 300,
    key_prefix: str = 'view',
    cache_alias: str = 'default',
    vary_on_user: bool = True
):
    """
    Decorador para cachear respuestas de views DRF.
    
    Args:
        timeout: Tiempo de vida del caché en segundos
        key_prefix: Prefijo para la clave de caché
        cache_alias: Nombre del caché a usar
        vary_on_user: Si True, genera clave diferente por usuario
    
    Ejemplo:
        @cache_response(timeout=300, key_prefix='dashboard')
        def get(self, request):
            return Response(expensive_calculation())
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(view_instance, request, *args, **kwargs):
            # Saltar caché para métodos que modifican datos
            if request.method not in ['GET', 'HEAD']:
                return func(view_instance, request, *args, **kwargs)
            
            cache = caches[cache_alias]
            cache_key = get_cache_key(key_prefix, request, *args, **kwargs)
            
            # Intentar obtener de caché
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return Response(cached_response)
            
            # Ejecutar función y cachear resultado
            response = func(view_instance, request, *args, **kwargs)
            
            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout)
                logger.debug(f"Cache SET: {cache_key}")
            
            return response
        
        return wrapper
    return decorator


def invalidate_cache(pattern: str, cache_alias: str = 'default'):
    """
    Invalida entradas de caché que coincidan con un patrón.
    
    Nota: Esto solo funciona bien con Redis. En otros backends
    puede requerir borrado manual de keys específicas.
    
    Args:
        pattern: Patrón de keys a invalidar (ej: 'dashboard:*')
        cache_alias: Nombre del caché
    """
    cache = caches[cache_alias]
    
    # Intentar usar delete_pattern si está disponible (django-redis)
    if hasattr(cache, 'delete_pattern'):
        deleted = cache.delete_pattern(f"*{pattern}*")
        logger.info(f"Cache invalidado: {pattern} ({deleted} keys)")
        return deleted
    
    # Fallback: no podemos hacer delete por patrón
    logger.warning(f"Cache backend no soporta delete_pattern: {pattern}")
    return 0


# ============================================
# CACHE UTILITIES
# ============================================

class CacheManager:
    """
    Utilidad para manejar caché de forma más semántica.
    
    Ejemplo:
        cache = CacheManager()
        
        # Obtener o calcular
        metrics = cache.get_or_set(
            'dashboard:metrics:today',
            lambda: calculate_metrics(),
            timeout=300
        )
        
        # Invalidar grupo
        cache.invalidate_group('dashboard')
    """
    
    def __init__(self, cache_alias: str = 'default'):
        self.cache = caches[cache_alias]
        self.timeouts = getattr(settings, 'CACHE_TIMEOUTS', {})
    
    def get(self, key: str, default: Any = None) -> Any:
        """Obtiene valor del caché."""
        return self.cache.get(key, default)
    
    def set(self, key: str, value: Any, timeout: int = None):
        """Establece valor en caché."""
        self.cache.set(key, value, timeout)
    
    def delete(self, key: str):
        """Elimina una key del caché."""
        self.cache.delete(key)
    
    def get_or_set(
        self, 
        key: str, 
        default_func: Callable, 
        timeout: int = None
    ) -> Any:
        """
        Obtiene valor del caché o lo calcula y guarda.
        
        Args:
            key: Clave del caché
            default_func: Función que calcula el valor si no existe
            timeout: Tiempo de vida
        
        Returns:
            Valor del caché o calculado
        """
        value = self.cache.get(key)
        if value is not None:
            return value
        
        value = default_func()
        self.cache.set(key, value, timeout)
        return value
    
    def get_timeout(self, name: str) -> int:
        """Obtiene timeout configurado por nombre."""
        return self.timeouts.get(name, 300)
    
    def invalidate_group(self, group: str):
        """Invalida todas las keys de un grupo."""
        invalidate_cache(group, self.cache._cache.get_master_client() if hasattr(self.cache, '_cache') else 'default')


# Instancia global para uso conveniente
cache_manager = CacheManager()
