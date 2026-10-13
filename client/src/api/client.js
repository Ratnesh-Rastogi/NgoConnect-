import axios from 'axios';

// Single configured axios instance with automatic httpOnly cookie management
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send and receive httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept responses to extract central error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);
