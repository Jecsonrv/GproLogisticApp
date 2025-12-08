import { create } from 'zustand';
import axios from '../lib/axios';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/users/token/', { username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      // In a real app, you'd decode the token to get user info or make another request
      set({ user: { username: username }, isAuthenticated: true, loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.detail || 'Login failed', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Potentially validate token here (e.g., check expiry)
      set({ isAuthenticated: true });
    } else {
      set({ isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
