import { create } from 'zustand';
import api from '../services/api';

export const useCampStore = create((set, get) => ({
  camps: [],
  selectedCamp: null,
  stats: null,
  isLoading: false,
  error: null,
  
  fetchCamps: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/camps', { params });
      set({ camps: response.data.data.camps, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch camps', isLoading: false });
      throw error;
    }
  },
  
  fetchCamp: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/camps/${id}`);
      set({ selectedCamp: response.data.data.camp, isLoading: false });
      return response.data.data.camp;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch camp', isLoading: false });
      throw error;
    }
  },
  
  createCamp: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/camps', data);
      set((state) => ({ camps: [response.data.data.camp, ...state.camps], isLoading: false }));
      return response.data.data.camp;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create camp', isLoading: false });
      throw error;
    }
  },
  
  updateCamp: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/camps/${id}`, data);
      set((state) => ({
        camps: state.camps.map(c => c._id === id ? response.data.data.camp : c),
        selectedCamp: state.selectedCamp?._id === id ? response.data.data.camp : state.selectedCamp,
        isLoading: false
      }));
      return response.data.data.camp;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update camp', isLoading: false });
      throw error;
    }
  },
  
  fetchNearbyCamps: async (lat, lng, radius = 50000) => {
    try {
      const response = await api.get('/camps/nearby', { params: { lat, lng, radius } });
      return response.data.data.camps;
    } catch (error) {
      throw error;
    }
  },
  
  fetchCampStats: async (id) => {
    try {
      const response = await api.get(`/camps/${id}/stats`);
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },
  
  setSelectedCamp: (camp) => set({ selectedCamp: camp }),
  clearError: () => set({ error: null })
}));