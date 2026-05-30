// src/api/api.js — JWT-based API layer (Production-ready)
import axios from 'axios';

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const apiBaseUrl = configuredApiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // ⏳ 10-second timeout to prevent infinite hangs
});

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
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.message = 'Connection timed out. Please verify that your backend server is running on port 5000.';
    } else if (error.message === 'Network Error') {
      error.message = 'Network Error: Cannot connect to backend server. Please verify that the backend is running on port 5000 and has not crashed.';
    }

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
  const response = await api({ url: endpoint, ...options });
  return response.data;
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
  accept: (id, data) =>
    apiFetch(`/quotes/${id}/accept`, { method: 'PATCH', data }),
  reject: (id, data) =>
    apiFetch(`/quotes/${id}/reject`, { method: 'PATCH', data }),
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
  uploadFile: async (file, folder = 'misc') => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const response = await axios.post(
      `${apiBaseUrl}/api/upload/file?folder=${folder}`,
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
  getVideoStyles: () => apiFetch('/ai/video-styles'),
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
  generateVideo: async (formData) => {
    const token = getToken();
    const response = await axios({
      method: 'POST',
      url: `${apiBaseUrl}/api/ai/generate-video`,
      data: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 310000,
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
  editImage: async (formData) => {
    const token = getToken();
    const response = await axios({
      method: 'POST',
      url: `${apiBaseUrl}/api/ai/couple-moodboard/edit-image`,
      data: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 300000,
    });
    return response.data;
  },
  downloadImage: (data) =>
    apiFetch('/ai/couple-moodboard/download-image', { method: 'POST', data }),
};

export default api;
