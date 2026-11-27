import { create } from 'zustand';
import api from '../services/api';

export const useUserStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  pagination: null,
  isLoading: false,
  error: null,

  fetchUsers: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/users', { params });
      set({ 
        users: response.data.data.users, 
        pagination: response.data.data.pagination,
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch users', isLoading: false });
      throw error;
    }
  },

  fetchUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/admin/users/${id}`);
      set({ selectedUser: response.data.data.user, isLoading: false });
      return response.data.data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch user', isLoading: false });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/admin/users/${id}`, null, { params: data });
      set((state) => ({
        users: state.users.map(u => u.id === id ? response.data.data.user : u),
        selectedUser: state.selectedUser?.id === id ? response.data.data.user : state.selectedUser,
        isLoading: false
      }));
      return response.data.data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update user', isLoading: false });
      throw error;
    }
  },

  deactivateUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/admin/users/${id}/deactivate`);
      set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, isActive: false } : u),
        selectedUser: state.selectedUser?.id === id ? { ...state.selectedUser, isActive: false } : state.selectedUser,
        isLoading: false
      }));
      return response.data.data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to deactivate user', isLoading: false });
      throw error;
    }
  },

  activateUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/admin/users/${id}/activate`);
      set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, isActive: true } : u),
        selectedUser: state.selectedUser?.id === id ? { ...state.selectedUser, isActive: true } : state.selectedUser,
        isLoading: false
      }));
      return response.data.data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to activate user', isLoading: false });
      throw error;
    }
  },

  inviteUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/admin/users/invite', null, { params: data });
      set((state) => ({ users: [response.data.data.user, ...state.users], isLoading: false }));
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to invite user', isLoading: false });
      throw error;
    }
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
  clearError: () => set({ error: null })
}));