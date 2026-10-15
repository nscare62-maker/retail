import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for ML requests
  headers: {
    'Accept': 'application/json',
  }
});

// Response interceptor for clear unified error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network error occurred.';
    if (error.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export const apiService = {
  // System Health
  getHealth: () => api.get('/health').then(res => res.data),
  getReady: () => api.get('/ready').then(res => res.data),

  // Datasets
  uploadDataset: (file, name, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    return api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    }).then(res => res.data);
  },
  loadSampleDataset: () => api.post('/datasets/sample').then(res => res.data),
  getDatasets: () => api.get('/datasets').then(res => res.data),
  getDataset: (id) => api.get(`/datasets/${id}`).then(res => res.data),
  getDatasetPreview: (id, limit = 20) => api.get(`/datasets/${id}/preview?limit=${limit}`).then(res => res.data),
  getDatasetQuality: (id) => api.get(`/datasets/${id}/quality`).then(res => res.data),
  deleteDataset: (id) => api.delete(`/datasets/${id}`).then(res => res.data),

  // Preprocessing
  preprocessDataset: (id, config) => api.post(`/datasets/${id}/preprocess`, config).then(res => res.data),
  getPreprocessingStatus: (id) => api.get(`/datasets/${id}/preprocessing-status`).then(res => res.data),

  // TFT Models
  trainModel: (config) => api.post('/models/train', config).then(res => res.data),
  getModels: () => api.get('/models').then(res => res.data),
  getModel: (id) => api.get(`/models/${id}`).then(res => res.data),
  getModelStatus: (id) => api.get(`/models/${id}/status`).then(res => res.data),
  getModelMetrics: (id) => api.get(`/models/${id}/metrics`).then(res => res.data),
  deleteModel: (id) => api.delete(`/models/${id}`).then(res => res.data),

  // Demand Forecasts
  generateForecast: (params) => api.post('/forecasts', params).then(res => res.data),
  getForecasts: () => api.get('/forecasts').then(res => res.data),
  getForecast: (id) => api.get(`/forecasts/${id}`).then(res => res.data),
  getForecastExportUrl: (id) => `${API_BASE_URL}/forecasts/${id}/export`,

  // Inventory Planning
  generateInventory: (params) => api.post('/inventory/recommendations', params).then(res => res.data),
  getInventoryRecommendations: () => api.get('/inventory/recommendations').then(res => res.data),
  getInventoryRecommendation: (id) => api.get(`/inventory/recommendations/${id}`).then(res => res.data),
  getInventoryExportUrl: (id) => `${API_BASE_URL}/inventory/recommendations/${id}/export`,
};

export default api;
