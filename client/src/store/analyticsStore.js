import { create } from 'zustand';
import api from '../services/api';

export const useAnalyticsStore = create((set, get) => ({
  overview: null,
  requestsTrend: [],
  inventoryDistribution: { byCategory: [], byCamp: [] },
  transferPerformance: { byStatus: [], byPriority: [], avgDeliveryHours: 0, topRoutes: [] },
  campPerformance: [],
  isLoading: false,
  error: null,

  fetchOverview: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/analytics/overview');
      set({ overview: response.data.data, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch overview', isLoading: false });
      throw error;
    }
  },

  fetchRequestsTrend: async (period = '6m') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/analytics/requests-trend', { params: { period } });
      set({ requestsTrend: response.data.data.trend, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch requests trend', isLoading: false });
      throw error;
    }
  },

  fetchInventoryDistribution: async (campId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/analytics/inventory-distribution', { params: { campId } });
      set({ inventoryDistribution: response.data.data, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch inventory distribution', isLoading: false });
      throw error;
    }
  },

  fetchTransferPerformance: async (period = '6m') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/analytics/transfer-performance', { params: { period } });
      set({ transferPerformance: response.data.data, isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch transfer performance', isLoading: false });
      throw error;
    }
  },

  fetchCampPerformance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/analytics/camp-performance');
      set({ campPerformance: response.data.data.camps, isLoading: false });
      return response.data.data.camps;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch camp performance', isLoading: false });
      throw error;
    }
  },

  fetchAll: async (period = '6m') => {
    await Promise.all([
      get().fetchOverview(),
      get().fetchRequestsTrend(period),
      get().fetchInventoryDistribution(),
      get().fetchTransferPerformance(period),
      get().fetchCampPerformance()
    ]);
  },

  clearError: () => set({ error: null })
}));