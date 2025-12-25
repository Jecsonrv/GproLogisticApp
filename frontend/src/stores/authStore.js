import { create } from "zustand";
import axios from "../lib/axios";
import usePermissionStore from "./permissionStore";

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    isCheckingAuth: true,
    error: null,

    login: async (username, password) => {
        set({ loading: true, error: null });
        try {
            const response = await axios.post("/users/token/", {
                username,
                password,
            });
            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);

            // Fetch full user profile with permissions
            const userResponse = await axios.get("/users/me/");

            // Sincronizar permisos RBAC
            if (userResponse.data.permissions) {
                usePermissionStore
                    .getState()
                    .setPermissions(userResponse.data.permissions);
            } else {
                // Fallback: usar rol para determinar permisos
                usePermissionStore
                    .getState()
                    .setPermissionsByRole(userResponse.data.role);
            }

            set({
                user: userResponse.data,
                isAuthenticated: true,
                loading: false,
            });
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.detail || "Error al iniciar sesión. Por favor, intente nuevamente.",
                loading: false,
            });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        // Limpiar permisos al cerrar sesión
        usePermissionStore.getState().clearPermissions();
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true });
        const token = localStorage.getItem("access_token");

        if (token) {
            try {
                // Verify token and get user data with permissions
                const response = await axios.get("/users/me/");

                // Sincronizar permisos RBAC
                if (response.data.permissions) {
                    usePermissionStore
                        .getState()
                        .setPermissions(response.data.permissions);
                } else {
                    // Fallback: usar rol para determinar permisos
                    usePermissionStore
                        .getState()
                        .setPermissionsByRole(response.data.role);
                }

                set({
                    user: response.data,
                    isAuthenticated: true,
                    isCheckingAuth: false,
                });
            } catch (error) {
                // Token invalid or expired
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                usePermissionStore.getState().clearPermissions();
                set({
                    user: null,
                    isAuthenticated: false,
                    isCheckingAuth: false,
                });
            }
        } else {
            usePermissionStore.getState().clearPermissions();
            set({
                user: null,
                isAuthenticated: false,
                isCheckingAuth: false,
            });
        }
    },
}));

export default useAuthStore;
