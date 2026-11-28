import axios from 'axios';
import { attachLoadBalancer, createLoadBalancer, parseEndpoints } from './loadBalancer';

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/** Backend endpoints to balance across. VITE_API_URLS (comma-separated) wins over VITE_API_URL. */
export const API_ENDPOINTS = parseEndpoints(import.meta.env.VITE_API_URLS, import.meta.env.VITE_API_URL);

/** Shared HTTP client. Every service module talks to the backend through this instance. */
export const api = axios.create({
  baseURL: API_ENDPOINTS[0],
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nova:token') ?? sessionStorage.getItem('nova:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Round-robin + failover across API_ENDPOINTS. Registered before the error formatter
// below so failed endpoints are retried before the user sees an error.
attachLoadBalancer(api, createLoadBalancer(API_ENDPOINTS));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Something went wrong. Please try again.');
    return Promise.reject(Object.assign(error, { userMessage: message }));
  },
);

/** Simulates network latency for sample data so loading states are exercised during development. */
export const mockDelay = (data, ms = 650) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
