// src/api/api.js — JWT-based API layer (Production-ready)
import axios from 'axios';

const normalizeBaseUrl = (url) => url.replace(/\/api\/?$/, '').replace(/\/$/, '');
const isBrowser = typeof window !== 'undefined';
const isLocalFrontend = isBrowser && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const isLocalApiUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizeBaseUrl(url));
const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const LOCAL_API_PORTS = [5000, 5001, 5002, 5003, 5004];

const buildLocalApiCandidates = () =>
  LOCAL_API_PORTS.map((port) => `http://localhost:${port}`);

const storedApiBaseUrl =
  isBrowser && !configuredApiBaseUrl
    ? localStorage.getItem('apiBaseUrl')
    : null;

let apiBaseUrl = normalizeBaseUrl(
  configuredApiBaseUrl ||
    storedApiBaseUrl ||
    (isLocalFrontend ? buildLocalApiCandidates()[0] : 'http://localhost:5000')
);

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const setApiBaseUrl = (nextBaseUrl) => {
  apiBaseUrl = normalizeBaseUrl(nextBaseUrl);
  api.defaults.baseURL = `${apiBaseUrl}/api`;
  if (isBrowser && isLocalFrontend) {
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
  }
};

const getFallbackCandidates = () => {
  if (!isLocalFrontend) return [];
  const current = normalizeBaseUrl(apiBaseUrl);
  const localCandidates = buildLocalApiCandidates();

  // If current API URL is already local, try other local ports.
  if (isLocalApiUrl(current)) {
    return localCandidates.filter((candidate) => normalizeBaseUrl(candidate) !== current);
  }

  // If current API URL is remote/misconfigured, try all local ports.
  return localCandidates;
};

const isNetworkError = (error) => !error.response;

// ─── JWT Token helpers ───
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

// ─── Attach JWT to every request ───
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Handle responses & auto-logout on 401 ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);

      // Auto-clear token on authentication failure
      if (error.response.status === 401) {
        const msg = error.response.data?.error || '';
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('not found')) {
          removeToken();
          localStorage.removeItem('user');
        }
      }
    } else {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ─── Generic fetcher ───
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await api({ url: endpoint, ...options });
    return response.data;
  } catch (error) {
    const fallbackCandidates = getFallbackCandidates();
    if (!isNetworkError(error) || fallbackCandidates.length === 0) {
      throw error;
    }

    // Try known local backend ports in sequence and persist first working one.
    for (const candidate of fallbackCandidates) {
      try {
        const response = await api({
          ...options,
          url: endpoint,
          baseURL: `${candidate}/api`,
        });
        setApiBaseUrl(candidate);
        return response.data;
      } catch (candidateError) {
        if (!isNetworkError(candidateError)) {
          throw candidateError;
        }
      }
    }

    throw error;
  }
};

// ─── Auth APIs ───
export const authAPI = {
  register: (data) =>
    apiFetch('/auth/register', { method: 'POST', data }),

  login: (data) =>
    apiFetch('/auth/login', { method: 'POST', data }),

  googleLogin: (data) =>
    apiFetch('/auth/google', { method: 'POST', data }),

  firebaseLogin: (data) =>
    apiFetch('/auth/firebase-login', { method: 'POST', data }),

  getMe: () => apiFetch('/auth/me'),
};

// ─── User APIs ───
export const userAPI = {
  getProfile: () => apiFetch('/users/profile'),
  checkProfile: () => apiFetch('/users/check-profile'),
  saveProfile: (data) =>
    apiFetch('/users/save-form', { method: 'POST', data }),
  saveWeddingProfile: (data) =>
    apiFetch('/users/save-wedding-profile', { method: 'POST', data }),
  savePhone: (phone) =>
    apiFetch('/newusers', { method: 'POST', data: { phone } }),
};

// ─── Quote/Bid APIs ───
export const quoteAPI = {
  submit: (data) =>
    apiFetch('/quotes', { method: 'POST', data }),
  getMyQuotes: () => apiFetch('/quotes/my'),
  getAvailable: () => apiFetch('/quotes/available'),
  getMySent: () => apiFetch('/quotes/my-sent'),
  getMyDeals: () => apiFetch('/quotes/my-deals'),
  getById: (id) => apiFetch(`/quotes/${id}`),
  respond: (id, data) =>
    apiFetch(`/quotes/${id}/respond`, { method: 'PATCH', data }),
  accept: (id) =>
    apiFetch(`/quotes/${id}/accept`, { method: 'PATCH' }),
  reject: (id) =>
    apiFetch(`/quotes/${id}/reject`, { method: 'PATCH' }),
};

// ─── Payment APIs (Razorpay) ───
export const paymentAPI = {
  createOrder: (data) =>
    apiFetch('/payment/create-order', { method: 'POST', data }),
  verifyPayment: (data) =>
    apiFetch('/payment/verify', { method: 'POST', data }),
  getCredits: () => apiFetch('/payment/credits'),
  getPlans: () => apiFetch('/payment/plans'),
  getHistory: () => apiFetch('/payment/payment-history'),
  getPaymentStatus: () => apiFetch('/payment/payment-status'),
};

// ─── Admin APIs ───
export const adminAPI = {
  getMe: () => apiFetch('/admin/me'),
  getStats: () => apiFetch('/admin/stats'),
  listUsers: () => apiFetch('/admin/users'),
  getUser: (id) => apiFetch(`/admin/users/${id}`),
  updateUser: (id, payload) =>
    apiFetch(`/admin/users/${id}`, { method: 'PATCH', data: payload }),
  deleteUser: (id) =>
    apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
  blockUser: (id, reason) =>
    apiFetch(`/admin/users/${id}/block`, { method: 'POST', data: { reason } }),
  unblockUser: (id) =>
    apiFetch(`/admin/users/${id}/unblock`, { method: 'POST' }),
  adjustCredits: (id, amount, reason) =>
    apiFetch(`/admin/users/${id}/credits`, { method: 'POST', data: { amount, reason } }),
};

// ─── Vendor APIs ───
export const vendorAPI = {
  getDashboard: () => apiFetch('/vendor/dashboard'),
  getProfile: () => apiFetch('/vendor/profile'),
  updateProfile: (data) => apiFetch('/vendor/profile', { method: 'POST', data }),
  getPortfolio: () => apiFetch('/vendor/portfolio'),
  addPortfolioItem: (data) => apiFetch('/vendor/portfolio', { method: 'POST', data }),
  deletePortfolioItem: (id) => apiFetch(`/vendor/portfolio/${id}`, { method: 'DELETE' }),
  getEarnings: () => apiFetch('/vendor/earnings'),
  // Public vendor listing (no auth needed)
  getPublicVendors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/vendors/public${query ? `?${query}` : ''}`);
  },
};

// ─── Bid APIs ───
export const bidAPI = {
  getBids: () => apiFetch('/bids'),
  getBidById: (id) => apiFetch(`/bids/${id}`),
  createBid: (data) => apiFetch('/bids', { method: 'POST', data }),
  submitQuote: (id, quoteAmount, message) => apiFetch(`/bids/${id}/quote`, { method: 'POST', data: { quoteAmount, message } }),
  acceptTracker: (id, plannerId) => apiFetch(`/bids/${id}/accept`, { method: 'PUT', data: { plannerId } }),
};

// ─── Chat APIs ───
export const chatAPI = {
  getRooms: () => apiFetch('/chat/rooms'),
  createRoom: (data) => apiFetch('/chat/rooms', { method: 'POST', data }),
  getMessages: (roomId, page = 1) => apiFetch(`/chat/rooms/${roomId}/messages?page=${page}`),
  sendMessage: (roomId, data) => apiFetch(`/chat/rooms/${roomId}/messages`, { method: 'POST', data }),
  getUnreadCount: () => apiFetch('/chat/unread'),
};

// ─── Upload APIs ───
export const uploadAPI = {
  uploadImage: async (file, folder = 'misc') => {
    const formData = new FormData();
    formData.append('image', file);
    const token = getToken();
    const response = await axios.post(
      `${apiBaseUrl}/api/upload/image?folder=${folder}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
    return response.data;
  },
  uploadImages: async (files, folder = 'misc') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const token = getToken();
    const response = await axios.post(
      `${apiBaseUrl}/api/upload/images?folder=${folder}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
    return response.data;
  },
};

// ─── AI APIs ───
export const aiAPI = {
  checkHealth: () => apiFetch('/ai/health'),
  getThemes: () => apiFetch('/ai/themes'),
  checkCredits: (data) =>
    apiFetch('/ai/check-credits', { method: 'POST', data }),
  generate: async (formData) => {
    const token = getToken();
    const response = await axios({
      method: 'POST',
      url: `${apiBaseUrl}/api/ai/generate`,
      data: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.data;
  },
  changeAngle: async (formData) => {
    const token = getToken();
    const response = await axios({
      method: 'POST',
      url: `${apiBaseUrl}/api/ai/change-angle`,
      data: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.data;
  },
  sendFeedback: (data) =>
    apiFetch('/ai/feedback', { method: 'POST', data }),
  downloadImage: (data) =>
    apiFetch('/ai/download-image', { method: 'POST', data }),
};

// ─── Couple Moodboard AI APIs ───
export const coupleMoodboardAPI = {
  checkHealth: () => apiFetch('/ai/couple-moodboard/health'),
  generate: async (formData) => {
    const token = getToken();
    const response = await axios({
      method: 'POST',
      url: `${apiBaseUrl}/api/ai/couple-moodboard/generate`,
      data: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 300000, // 5 min timeout for vision + flux pipeline
    });
    return response.data;
  },
  downloadImage: (data) =>
    apiFetch('/ai/couple-moodboard/download-image', { method: 'POST', data }),
};

export default api;
