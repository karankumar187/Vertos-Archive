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
    getLiveDocuments:() => api.get('/admin/documents'),
    deleteDocument:  (id) => api.delete(`/admin/documents/${id}`),
    reprocessDocument: (id) => api.post(`/admin/documents/${id}/reprocess`),
    approveUpload:   (id, data = {}) => api.post(`/admin/approve/${id}`, data),
    rejectUpload:    (id, reviewComment) => api.post(`/admin/reject/${id}`, { reviewComment }),
    checkDuplicate:  (data) => api.post('/admin/check-duplicate', data),
    
    // Users
    getUsers:        () => api.get('/admin/users'),
    updateUserRole:  (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    suspendUser:     (id, suspend) => api.put(`/admin/users/${id}/suspend`, { suspend }),
    
    // Analytics & Logs
    getAnalytics:    () => api.get('/admin/analytics'),
    getActivityLogs: () => api.get('/admin/logs'),
    
    // Announcements
    getAnnouncements:() => api.get('/admin/announcements'),
    createAnnouncement: (data) => api.post('/admin/announcements', data),
    updateAnnouncement: (id, data) => api.put(`/admin/announcements/${id}`, data),
    deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`)
};

// ─── Chat API ─────────────────────────────────────────────────────────────
export const chatAPI = {
    getConversations: () => api.get('/chat/conversations'),
    createConversation: () => api.post('/chat/conversations'),
    getMessages: (id) => api.get(`/chat/conversations/${id}/messages`),
    deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
    toggleStar: (id) => api.patch(`/chat/conversations/${id}/star`),
    // Note: sendMessage streams via SSE, so we handle it using native fetch in the component, not axios.
};
// ─── Analytics API ───────────────────────────────────────────────────────
export const analyticsAPI = {
    getHomepageData: () => api.get('/analytics/homepage'),
};

// ─── Leaderboard API ─────────────────────────────────────────────────────
export const leaderboardAPI = {
    getLeaderboard: (period) => api.get(`/leaderboard?period=${period}`)
};

// ─── Community APIs ───────────────────────────────────────────────────────
export const queriesAPI = {
    getQueries: () => api.get('/queries'),
    createQuery: (data) => api.post('/queries', data),
    addAnswer: (id, data) => api.post(`/queries/${id}/answers`, data),
    deleteAnswer: (id, answerId) => api.delete(`/queries/${id}/answers/${answerId}`),
    deleteQuery: (id) => api.delete(`/queries/${id}`),
};

export const eventsAPI = {
    getEvents: () => api.get('/events'),
    createEvent: (data) => api.post('/events', data),
    registerForEvent: (id) => api.post(`/events/${id}/register`),
};

export const archiveAPI = {
    getArchive: (params) => api.get('/archive', { params }),
    downloadDocument: (id) => api.get(`/archive/download/${id}`, { responseType: 'blob' }),
    getDownloadUrl: (id) => `${BASE}/archive/download/${id}`,
};

// Public Announcements API (no admin required)
export const announcementsAPI = {
    getPublished: () => api.get('/auth/announcements'),
    registerForAnnouncement: (id) => api.post(`/auth/announcements/${id}/register`),
};

export default api;