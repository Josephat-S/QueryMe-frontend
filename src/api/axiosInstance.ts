import axios from 'axios';
import { clearAuthState, getStoredToken } from '../utils/authStorage';

const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

let serverTimeOffset = 0;

export const getServerTime = (): number => Date.now() + serverTimeOffset;

export const syncClock = (serverTimeStr: string) => {
  if (!serverTimeStr) return;
  const normalized = serverTimeStr.endsWith('Z') || serverTimeStr.includes('+') ? serverTimeStr : `${serverTimeStr}Z`;
  const serverTime = new Date(normalized).getTime();
  if (!Number.isNaN(serverTime)) {
    serverTimeOffset = serverTime - Date.now();
    console.log(`[Clock Sync] Server time synchronized from body. Offset: ${serverTimeOffset}ms`);
  }
};

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const dateHeader = response.headers?.['date'] || response.headers?.['Date'];
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      if (!Number.isNaN(serverTime)) {
        serverTimeOffset = serverTime - Date.now();
        console.log(`[Clock Sync] Server time synchronized. Offset: ${serverTimeOffset}ms`);
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState();
      window.dispatchEvent(new CustomEvent('qm:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
