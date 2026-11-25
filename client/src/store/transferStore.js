import { create } from 'zustand';
import api from '../services/api';

export const useTransferStore = create((set, get) => ({
  transfers: [],
  selectedTransfer: null,
  stats: null,
  isLoading: false,
  error: null,
  
  fetchTransfers: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/transfers', { params });
      set({ transfers: response.data.data.transfers, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch transfers', isLoading: false });
      throw error;
    }
  },
  
  fetchTransfer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/transfers/${id}`);
      set({ selectedTransfer: response.data.data.transfer, isLoading: false });
      return response.data.data.transfer;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch transfer', isLoading: false });
      throw error;
    }
  },
  
  assignTransfer: async (id, assignedToId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/transfers/${id}/assign`, { assignedToId });
      set((state) => ({
        transfers: state.transfers.map(t => t.id === id ? response.data.data.transfer : t),
        selectedTransfer: state.selectedTransfer?.id === id ? response.data.data.transfer : state.selectedTransfer,
        isLoading: false
      }));
      return response.data.data.transfer;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to assign transfer', isLoading: false });
      throw error;
    }
  },
  
  updateTransferStatus: async (id, status, notes, cancellationReason) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/transfers/${id}/status`, { status, notes, cancellationReason });
      set((state) => ({
        transfers: state.transfers.map(t => t.id === id ? response.data.data.transfer : t),
        selectedTransfer: state.selectedTransfer?.id === id ? response.data.data.transfer : state.selectedTransfer,
        isLoading: false
      }));
      return response.data.data.transfer;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update transfer status', isLoading: false });
      throw error;
    }
  },
  
  createManualTransfer: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/transfers/manual', data);
      set((state) => ({ transfers: [response.data.data.transfer, ...state.transfers], isLoading: false }));
      return response.data.data.transfer;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create transfer', isLoading: false });
      throw error;
    }
  },
  
  deleteTransfer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/transfers/${id}`);
      set((state) => ({ transfers: state.transfers.filter(t => t.id !== id), isLoading: false }));
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete transfer', isLoading: false });
      throw error;
    }
  },
  
  fetchStats: async (campId) => {
    try {
      const response = await api.get('/transfers/stats', { params: { campId } });
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },
  
  setSelectedTransfer: (transfer) => set({ selectedTransfer: transfer }),
  clearError: () => set({ error: null })
}));