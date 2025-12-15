import { create } from "zustand";

/**
 * RBAC Permission Store
 * Gestiona los permisos del usuario en el frontend
 * Los permisos se obtienen desde /users/me/ al autenticarse
 */

// Definición de permisos por rol (respaldo si el backend no responde)
const ROLE_PERMISSIONS = {
    admin: {
        modules: {
            dashboard: true,
            service_orders: true,
            provider_payments: true,
            catalogs: true,
            clients: true,
            services: true,
            invoicing: true,
            account_statements: true,
            provider_statements: true,
            users: true,
        },
        actions: {
            approve_payment: true,
            delete_invoice: true,
            manage_users: true,
            export_data: true,
        },
        is_admin: true,
        can_approve_payments: true,
        can_manage_users: true,
        can_access_finance: true,
    },
    operativo2: {
        modules: {
            dashboard: true,
            service_orders: true,
            provider_payments: true,
            catalogs: true,
            clients: true,
            services: true,
            invoicing: true,
            account_statements: true,
            provider_statements: true,
            users: false, // NO acceso a usuarios
        },
        actions: {
            approve_payment: true,
            delete_invoice: false,
            manage_users: false,
            export_data: true,
        },
        is_admin: false,
        can_approve_payments: true,
        can_manage_users: false,
        can_access_finance: true,
    },
    operativo: {
        modules: {
            dashboard: true,
            service_orders: true,
            provider_payments: true, // Puede ver/editar, pero NO aprobar
            catalogs: true,
            clients: true,
            services: true,
            invoicing: false, // NO acceso
            account_statements: false, // NO acceso
            provider_statements: false, // NO acceso
            users: false, // NO acceso
        },
        actions: {
            approve_payment: false, // RESTRICCIÓN CRÍTICA
            delete_invoice: false,
            manage_users: false,
            export_data: false,
        },
        is_admin: false,
        can_approve_payments: false,
        can_manage_users: false,
        can_access_finance: false,
    },
};

// Mapeo de rutas a módulos
export const ROUTE_TO_MODULE = {
    "/": "dashboard",
    "/service-orders": "service_orders",
    "/provider-payments": "provider_payments",
    "/catalogs": "catalogs",
    "/clients": "clients",
    "/services": "services",
    "/client-pricing": "services",
    "/invoicing": "invoicing",
    "/account-statements": "account_statements",
    "/provider-statements": "provider_statements",
    "/users": "users",
    "/profile": "dashboard", // Siempre accesible
};

const usePermissionStore = create((set, get) => ({
    permissions: null,
    role: null,

    /**
     * Establecer permisos desde la respuesta del servidor
     */
    setPermissions: (permissionsData) => {
        set({
            permissions: permissionsData,
            role: permissionsData?.role || null,
        });
    },

    /**
     * Establecer permisos basados en el rol (fallback)
     */
    setPermissionsByRole: (role) => {
        const rolePermissions =
            ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.operativo;
        set({
            permissions: { ...rolePermissions, role },
            role: role,
        });
    },

    /**
     * Limpiar permisos (logout)
     */
    clearPermissions: () => {
        set({ permissions: null, role: null });
    },

    /**
     * Verificar acceso a un módulo
     */
    hasModuleAccess: (moduleName) => {
        const { permissions } = get();
        if (!permissions) return false;
        return permissions.modules?.[moduleName] === true;
    },

    /**
     * Verificar si puede realizar una acción
     */
    canPerformAction: (actionName) => {
        const { permissions } = get();
        if (!permissions) return false;
        return permissions.actions?.[actionName] === true;
    },

    /**
     * Verificar acceso a una ruta
     */
    hasRouteAccess: (path) => {
        const { permissions } = get();
        if (!permissions) return false;

        // Profile siempre accesible
        if (path === "/profile") return true;

        // Obtener el módulo base de la ruta
        const basePath = "/" + (path.split("/")[1] || "");
        const moduleName = ROUTE_TO_MODULE[basePath];

        if (!moduleName) return true; // Rutas no mapeadas son accesibles

        return permissions.modules?.[moduleName] === true;
    },

    /**
     * Verificar si es admin
     */
    isAdmin: () => {
        const { permissions } = get();
        return permissions?.is_admin === true;
    },

    /**
     * Verificar si puede aprobar pagos
     */
    canApprovePayments: () => {
        const { permissions } = get();
        return permissions?.can_approve_payments === true;
    },

    /**
     * Verificar si puede gestionar usuarios
     */
    canManageUsers: () => {
        const { permissions } = get();
        return permissions?.can_manage_users === true;
    },

    /**
     * Verificar si tiene acceso a finanzas
     */
    canAccessFinance: () => {
        const { permissions } = get();
        return permissions?.can_access_finance === true;
    },

    /**
     * Obtener lista de módulos accesibles
     */
    getAccessibleModules: () => {
        const { permissions } = get();
        if (!permissions?.modules) return [];
        return Object.entries(permissions.modules)
            .filter(([_, hasAccess]) => hasAccess)
            .map(([module]) => module);
    },
}));

export default usePermissionStore;
