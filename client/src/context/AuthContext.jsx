import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true); // true until first /me resolves

    // Fetch current user from server using stored token
    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }
        try {
            const res = await authAPI.getMe();
            setUser(res.data.user);
        } catch {
            // Token invalid or expired — clear it
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // On mount, resolve user from token
    useEffect(() => { fetchUser(); }, [fetchUser]);

    // Keep multiple browser tabs in sync
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'token') fetchUser();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [fetchUser]);

    /** Call after a successful login — stores token and loads user */
    const login = useCallback(async (token) => {
        localStorage.setItem('token', token);
        await fetchUser();
    }, [fetchUser]);

    /** Clear session */
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    /** Update the in-memory user after profile edit */
    const updateUser = useCallback((updated) => {
        setUser(updated);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

/** Convenience hook */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

export default AuthContext;
