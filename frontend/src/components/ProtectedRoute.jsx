import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import usePermissionStore from "../stores/permissionStore";

/**
 * ProtectedRoute - Componente de protección de rutas con RBAC
 *
 * Funcionalidades:
 * 1. Verifica autenticación
 * 2. Verifica permisos RBAC para la ruta actual
 * 3. Redirige a /login si no está autenticado
 * 4. Redirige a /403 si no tiene permisos
 *
 * @param {ReactNode} children - Componente a renderizar si tiene acceso
 * @param {string} requiredModule - Módulo requerido (opcional, se infiere de la ruta)
 */
function ProtectedRoute({ children, requiredModule }) {
    const location = useLocation();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasRouteAccess = usePermissionStore((state) => state.hasRouteAccess);
    const hasModuleAccess = usePermissionStore(
        (state) => state.hasModuleAccess
    );
    const permissions = usePermissionStore((state) => state.permissions);

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Si los permisos aún no se han cargado, permitir acceso temporal
    // (se validará cuando se carguen los permisos)
    if (!permissions) {
        return children;
    }

    // Si se especifica un módulo requerido, verificar acceso directo
    if (requiredModule && !hasModuleAccess(requiredModule)) {
        return <Navigate to="/403" replace />;
    }

    // Verificar acceso basado en la ruta actual
    if (!hasRouteAccess(location.pathname)) {
        return <Navigate to="/403" replace />;
    }

    return children;
}

export default ProtectedRoute;
