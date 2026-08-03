import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

// Read API Base URL from env variable (fallback to http://localhost:5131/api)
let rawUrl = import.meta.env.VITE_API_URL ;
rawUrl = rawUrl.replace(/\/+$/, '');
const baseURL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const API = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach token & normalize route prefix
API.interceptors.request.use(
  (config) => {
    // If URL path begins with /api/, strip /api to prevent duplicate /api/api/ routes
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    const token = secureStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
export { API };
