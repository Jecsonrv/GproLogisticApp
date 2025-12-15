from rest_framework import permissions

# =============================================================================
# SISTEMA RBAC - Control de Acceso Basado en Roles
# =============================================================================
# 
# ROLES DEFINIDOS:
# - admin: Acceso total (Superusuario)
# - operativo: Básico - Dashboard, OS, Pagos a Proveedores, Catálogos
#              Restricción: NO puede aprobar pagos
# - operativo2: Avanzado - Acceso total EXCEPTO módulo de Usuarios
#
# =============================================================================


class IsAdminUser(permissions.BasePermission):
    """
    Solo permite acceso a usuarios con rol 'admin'.
    Usado para: Gestión de usuarios, configuración del sistema.
    """
    message = "Acceso denegado. Se requiere rol de Administrador."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsOperativo2OrAdmin(permissions.BasePermission):
    """
    Permite acceso a usuarios con rol 'admin' u 'operativo2'.
    Usado para: Módulos financieros avanzados (CXC, CXP, Facturación).
    """
    message = "Acceso denegado. Se requiere rol Operativo 2 o superior."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'operativo2']


class IsAnyOperativo(permissions.BasePermission):
    """
    Permite acceso a cualquier usuario autenticado con rol válido.
    Usado para: Dashboard, OS, Pagos a Proveedores, Catálogos básicos.
    """
    message = "Acceso denegado. Se requiere rol de Operativo o superior."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'operativo2', 'operativo']


class CanApprovePayments(permissions.BasePermission):
    """
    Verifica si el usuario puede aprobar pagos.
    SOLO admin y operativo2 pueden aprobar.
    Operativo básico NO puede aprobar (restricción de negocio).
    """
    message = "No tiene permisos para aprobar pagos. Contacte a un supervisor."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Solo admin y operativo2 pueden aprobar pagos
        return request.user.role in ['admin', 'operativo2']


class TransferApprovalPermission(permissions.BasePermission):
    """
    Permiso especial para el endpoint de aprobación de Transfers.
    Bloquea operativos básicos de aprobar pagos.
    """
    message = "Su rol no permite aprobar pagos. Contacte a un Administrador."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Si es una solicitud para cambiar estado a 'aprobado'
        if request.method in ['PATCH', 'PUT']:
            new_status = request.data.get('status')
            if new_status == 'aprobado':
                # Solo admin y operativo2 pueden aprobar
                return request.user.role in ['admin', 'operativo2']
        
        # Otras operaciones permitidas
        return request.user.role in ['admin', 'operativo2', 'operativo']


# =============================================================================
# DEFINICIÓN DE PERMISOS POR MÓDULO
# =============================================================================

# Mapeo de módulos a permisos requeridos
MODULE_PERMISSIONS = {
    # Módulos accesibles por todos los operativos
    'dashboard': ['admin', 'operativo2', 'operativo'],
    'service_orders': ['admin', 'operativo2', 'operativo'],
    'provider_payments': ['admin', 'operativo2', 'operativo'],  # Ver/Editar, NO aprobar
    'catalogs': ['admin', 'operativo2', 'operativo'],
    'clients': ['admin', 'operativo2', 'operativo'],
    'services': ['admin', 'operativo2', 'operativo'],
    
    # Módulos restringidos a operativo2 y admin
    'invoicing': ['admin', 'operativo2'],
    'account_statements': ['admin', 'operativo2'],
    'provider_statements': ['admin', 'operativo2'],
    
    # Módulos exclusivos de admin
    'users': ['admin'],
}

# Acciones especiales con permisos específicos
ACTION_PERMISSIONS = {
    'approve_payment': ['admin', 'operativo2'],  # Operativo básico NO puede
    'delete_invoice': ['admin'],
    'manage_users': ['admin'],
    'export_data': ['admin', 'operativo2'],
}


def user_has_module_access(user, module_name):
    """
    Verifica si un usuario tiene acceso a un módulo específico.
    Usado por el frontend para renderizado condicional.
    """
    if not user or not user.is_authenticated:
        return False
    
    allowed_roles = MODULE_PERMISSIONS.get(module_name, [])
    return user.role in allowed_roles


def user_can_perform_action(user, action_name):
    """
    Verifica si un usuario puede realizar una acción específica.
    """
    if not user or not user.is_authenticated:
        return False
    
    allowed_roles = ACTION_PERMISSIONS.get(action_name, [])
    return user.role in allowed_roles


def get_user_permissions(user):
    """
    Retorna un diccionario con todos los permisos del usuario.
    Usado para enviar al frontend en la respuesta de /users/me/
    """
    if not user or not user.is_authenticated:
        return {
            'modules': {},
            'actions': {},
            'role': None,
        }
    
    user_role = user.role
    
    # Permisos de módulos
    modules = {
        module: user_role in roles 
        for module, roles in MODULE_PERMISSIONS.items()
    }
    
    # Permisos de acciones
    actions = {
        action: user_role in roles 
        for action, roles in ACTION_PERMISSIONS.items()
    }
    
    return {
        'modules': modules,
        'actions': actions,
        'role': user_role,
        'is_admin': user_role == 'admin',
        'can_approve_payments': user_role in ['admin', 'operativo2'],
        'can_manage_users': user_role == 'admin',
        'can_access_finance': user_role in ['admin', 'operativo2'],
    }


# =============================================================================
# ALIASES PARA COMPATIBILIDAD CON CÓDIGO EXISTENTE
# =============================================================================

# Alias: IsOperativo = IsAnyOperativo (permite todos los roles operativos)
IsOperativo = IsAnyOperativo

# Alias: IsOperativo2 = IsOperativo2OrAdmin (permite operativo2 y admin)
IsOperativo2 = IsOperativo2OrAdmin
