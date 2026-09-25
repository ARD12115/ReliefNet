import { create } from 'zustand';
import api from '../services/api';

export const useInventoryStore = create((set, get) => ({
  items: [],
  groupedItems: {},
  summary: null,
  history: [],
  isLoading: false,
  error: null,
  
  fetchInventory: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/inventory', { params });
      set({ items: response.data.data.items, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch inventory', isLoading: false });
      throw error;
    }
  },
  
  fetchCampInventory: async (campId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/inventory/camp/${campId}`);
      set({ groupedItems: response.data.data.items, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch camp inventory', isLoading: false });
      throw error;
    }
  },
  
  createItem: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/inventory', data);
      set((state) => ({ items: [...state.items, response.data.data.item], isLoading: false }));
      return response.data.data.item;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create inventory item', isLoading: false });
      throw error;
    }
  },
  
  updateItem: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/inventory/${id}`, data);
      set((state) => ({
        items: state.items.map(item => item._id === id ? response.data.data.item : item),
        isLoading: false
      }));
      return response.data.data.item;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update inventory item', isLoading: false });
      throw error;
    }
  },
  
  bulkUpdate: async (campId, items) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/inventory/camp/${campId}/bulk`, { items });
      set({ isLoading: false });
      // Refetch camp inventory to get updated state
      await get().fetchCampInventory(campId);
      return response.data.data.items;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to bulk update inventory', isLoading: false });
      throw error;
    }
  },
  
  deleteItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/inventory/${id}`);
      set((state) => ({ items: state.items.filter(item => item._id !== id), isLoading: false }));
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete inventory item', isLoading: false });
      throw error;
    }
  },
  
  fetchSummary: async (campId) => {
    try {
      const response = await api.get('/inventory/summary', { params: { campId } });
      set({ summary: response.data.data });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },
  
  fetchHistory: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/inventory/history', { params });
      set({ history: response.data.data.history, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch history', isLoading: false });
      throw error;
    }
  },
  
  clearError: () => set({ error: null })
}));