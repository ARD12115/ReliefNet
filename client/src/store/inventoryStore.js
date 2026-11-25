import { create } from 'zustand';
import api from '../services/api';

export const useInventoryStore = create((set, get) => ({
  items: [],
  groupedItems: {},
  summary: null,
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
        items: state.items.map(item => item.id === id ? response.data.data.item : item),
        isLoading: false
      }));
      return response.data.data.item;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update inventory item', isLoading: false });
      throw error;
    }
  },
  
  deleteItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/inventory/${id}`);
      set((state) => ({ items: state.items.filter(item => item.id !== id), isLoading: false }));
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

  clearError: () => set({ error: null })
}));