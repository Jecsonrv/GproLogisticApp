import { create } from "zustand";
import axios from "../lib/axios";

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

            // Fetch full user profile immediately
            const userResponse = await axios.get("/users/me/");

            set({
                user: userResponse.data,
                isAuthenticated: true,
                loading: false,
            });
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.detail || "Login failed",
                loading: false,
            });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true });
        const token = localStorage.getItem("access_token");

        if (token) {
            try {
                // Verify token and get user data
                const response = await axios.get("/users/me/");
                set({
                    user: response.data,
                    isAuthenticated: true,
                    isCheckingAuth: false,
                });
            } catch (error) {
                // Token invalid or expired
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                set({
                    user: null,
                    isAuthenticated: false,
                    isCheckingAuth: false,
                });
            }
        } else {
            set({
                user: null,
                isAuthenticated: false,
                isCheckingAuth: false,
            });
        }
    },
}));

export default useAuthStore;
