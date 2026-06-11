import axios from 'axios';

const BASE = (import.meta?.env?.VITE_API_URL) || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle token expiry globally
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ─────────────────────────────────────────────────────────────
export const authAPI = {
    register:       (data) => api.post('/auth/register', data),
    login:          (data) => api.post('/auth/login', data),
    getMe:          ()     => api.get('/auth/me'),
    updateProfile:  (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    googleAuthUrl:  ()     => `${BASE}/auth/google`,
};

// ─── Upload API ───────────────────────────────────────────────────────────
export const uploadAPI = {
    uploadDocument: (formData) => api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getStats:       () => api.get('/upload/stats'),
    getMyUploads:   () => api.get('/upload/my-uploads'),
};

// ─── Admin API ────────────────────────────────────────────────────────────
export const adminAPI = {
    getPending:      () => api.get('/admin/pending'),
    approveUpload:   (id) => api.post(`/admin/approve/${id}`),
    rejectUpload:    (id, reviewComment) => api.post(`/admin/reject/${id}`, { reviewComment }),
    checkDuplicate:  (data) => api.post('/admin/check-duplicate', data),
};

// ─── Chat API ─────────────────────────────────────────────────────────────
export const chatAPI = {
    getConversations:   () => api.get('/chat/conversations'),
    createConversation: () => api.post('/chat/conversations'),
    getMessages:        (id) => api.get(`/chat/conversations/${id}/messages`),
    // Note: sendMessage streams via SSE, so we handle it using native fetch in the component, not axios.
};

export default api;