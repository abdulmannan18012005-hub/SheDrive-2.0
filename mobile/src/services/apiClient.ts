import axios from 'axios';
import { getToken, removeToken } from './secureStore';

// Assuming local dev server or production URL
const API_URL = 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Handle token expiration/invalidation
      await removeToken();
      // AuthContext will need to be notified to clear state
    }
    return Promise.reject(error);
  }
);
