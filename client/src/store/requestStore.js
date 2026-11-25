import { create } from 'zustand';
import api from '../services/api';

export const useRequestStore = create((set, get) => ({
  requests: [],
  selectedRequest: null,
  stats: null,
  isLoading: false,
  error: null,
  
  fetchRequests: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/requests', { params });
      set({ requests: response.data.data.requests, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch requests', isLoading: false });
      throw error;
    }
  },
  
  fetchRequest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/requests/${id}`);
      set({ selectedRequest: response.data.data.request, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch request', isLoading: false });
      throw error;
    }
  },
  
  createRequest: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/requests', data);
      set((state) => ({ requests: [response.data.data.request, ...state.requests], isLoading: false }));
      return response.data.data.request;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create request', isLoading: false });
      throw error;
    }
  },
  
  updateRequest: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/requests/${id}`, data);
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? response.data.data.request : r),
        selectedRequest: state.selectedRequest?.id === id ? response.data.data.request : state.selectedRequest,
        isLoading: false
      }));
      return response.data.data.request;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update request', isLoading: false });
      throw error;
    }
  },
  
  cancelRequest: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/requests/${id}/cancel`, { reason });
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? response.data.data.request : r),
        selectedRequest: state.selectedRequest?.id === id ? response.data.data.request : state.selectedRequest,
        isLoading: false
      }));
      return response.data.data.request;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to cancel request', isLoading: false });
      throw error;
    }
  },
  
  fetchStats: async (campId) => {
    try {
      const response = await api.get('/requests/stats', { params: { campId } });
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },
  
  setSelectedRequest: (request) => set({ selectedRequest: request }),
  clearError: () => set({ error: null })
}));