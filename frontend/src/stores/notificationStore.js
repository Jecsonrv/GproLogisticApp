import { create } from "zustand";
import api from "../lib/axios";

const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    lastFetched: null,

    // Cargar notificaciones desde la API
    fetchNotifications: async (forceRefresh = false) => {
        const state = get();

        // Evitar múltiples llamadas simultáneas
        if (state.loading) return;

        // Cache de 30 segundos a menos que se fuerce refresh
        const now = Date.now();
        if (
            !forceRefresh &&
            state.lastFetched &&
            now - state.lastFetched < 30000
        ) {
            return;
        }

        set({ loading: true, error: null });

        try {
            const response = await api.get("/users/notifications/");
            const { notifications, unread_count } = response.data;

            set({
                notifications: notifications || [],
                unreadCount: unread_count || 0,
                loading: false,
                lastFetched: now,
            });
        } catch (error) {
            console.error("Error fetching notifications:", error);
            set({
                error: "Error al cargar notificaciones",
                loading: false,
            });
        }
    },

    // Marcar una notificación como leída
    markAsRead: async (id) => {
        try {
            await api.post(`/users/notifications/${id}/mark_read/`);

            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    },

    // Marcar todas como leídas
    markAllAsRead: async () => {
        try {
            await api.post("/users/notifications/mark_all_read/");

            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    read: true,
                })),
                unreadCount: 0,
            }));
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    },

    // Eliminar una notificación
    deleteNotification: async (id) => {
        try {
            await api.delete(`/users/notifications/${id}/`);

            set((state) => {
                const notification = state.notifications.find(
                    (n) => n.id === id
                );
                const wasUnread = notification && !notification.read;

                return {
                    notifications: state.notifications.filter(
                        (n) => n.id !== id
                    ),
                    unreadCount: wasUnread
                        ? Math.max(0, state.unreadCount - 1)
                        : state.unreadCount,
                };
            });
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    },

    // Eliminar todas las notificaciones
    clearAll: async () => {
        try {
            await api.post("/users/notifications/clear_all/");

            set({ notifications: [], unreadCount: 0 });
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    },

    // Eliminar solo las leídas
    clearRead: async () => {
        try {
            await api.post("/users/notifications/clear_read/");

            set((state) => ({
                notifications: state.notifications.filter((n) => !n.read),
            }));
        } catch (error) {
            console.error("Error clearing read notifications:", error);
        }
    },

    // Obtener conteo de no leídas (útil para polling)
    fetchUnreadCount: async () => {
        try {
            const response = await api.get(
                "/users/notifications/unread_count/"
            );
            set({ unreadCount: response.data.unread_count || 0 });
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    },

    // Agregar notificación local (para tiempo real si se implementa WebSocket)
    addNotification: (notification) =>
        set((state) => ({
            notifications: [
                {
                    id: Date.now(),
                    read: false,
                    timestamp: new Date().toISOString(),
                    ...notification,
                },
                ...state.notifications,
            ],
            unreadCount: state.unreadCount + 1,
        })),

    // Reset del store (útil en logout)
    reset: () =>
        set({
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: null,
            lastFetched: null,
        }),
}));

export default useNotificationStore;
