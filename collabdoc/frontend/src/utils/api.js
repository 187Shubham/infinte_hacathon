import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Intercept to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const documentAPI = {
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (title) => api.post('/documents', { title }),
  updateTitle: (id, title) => api.patch(`/documents/${id}/title`, { title }),
  delete: (id) => api.delete(`/documents/${id}`),
  addCollaborator: (id, email) => api.post(`/documents/${id}/collaborators`, { email }),
  removeCollaborator: (id, userId) => api.delete(`/documents/${id}/collaborators/${userId}`),
  getVersions: (id) => api.get(`/documents/${id}/versions`),
};

export default api;
