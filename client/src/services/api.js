import axios from 'axios';

const serverBase = process.env.SERVER_URL
  ? `${process.env.SERVER_URL.replace(/\/+$/, '')}/api`
  : import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: serverBase,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reliefnet-auth') 
      ? JSON.parse(localStorage.getItem('reliefnet-auth')).state?.accessToken 
      : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshBase = process.env.SERVER_URL
          ? `${process.env.SERVER_URL.replace(/\/+$/, '')}/api`
          : import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
        const response = await axios.post(
          `${refreshBase}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const { accessToken } = response.data.data;
        
        // Update stored token
        const authData = JSON.parse(localStorage.getItem('reliefnet-auth'));
        if (authData) {
          authData.state.accessToken = accessToken;
          localStorage.setItem('reliefnet-auth', JSON.stringify(authData));
        }
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('reliefnet-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;