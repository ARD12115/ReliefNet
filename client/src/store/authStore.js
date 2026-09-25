import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
        if (accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
      },
      
      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      updateUser: (userData) => set((state) => ({ 
        user: state.user ? { ...state.user, ...userData } : null 
      })),
      
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, accessToken } = response.data.data;
          get().setAuth(user, accessToken);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || 'Login failed' };
        } finally {
          set({ isLoading: false });
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', userData);
          const { user, accessToken } = response.data.data;
          get().setAuth(user, accessToken);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || 'Registration failed' };
        } finally {
          set({ isLoading: false });
        }
      },
      
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },
      
      refreshToken: async () => {
        try {
          const response = await api.post('/auth/refresh');
          const { accessToken } = response.data.data;
          set({ accessToken });
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          return true;
        } catch (error) {
          get().clearAuth();
          return false;
        }
      },
      
      fetchMe: async () => {
        const { accessToken } = get();
        if (!accessToken) return false;
        
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.data.user, isAuthenticated: true });
          return true;
        } catch (error) {
          // Try to refresh token
          const refreshed = await get().refreshToken();
          if (!refreshed) {
            get().clearAuth();
          }
          return false;
        }
      }
    }),
    {
      name: 'reliefnet-auth',
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export const AuthProvider = ({ children }) => {
  // Initialize auth on app load
  React.useEffect(() => {
    const { fetchMe } = useAuthStore.getState();
    fetchMe();
  }, []);
  
  return children;
};

import React from 'react';