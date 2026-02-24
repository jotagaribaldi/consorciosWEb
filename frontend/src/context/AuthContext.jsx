import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('consorci_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('consorci_token') || null);

    const login = useCallback(async (email, senha) => {
        const res = await api.post('/auth/login', { email, senha });
        const { token: t, user: u } = res.data;
        localStorage.setItem('consorci_token', t);
        localStorage.setItem('consorci_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
        return u;
    }, []);

    const register = useCallback(async (nome, email, senha) => {
        const res = await api.post('/auth/register', { nome, email, senha });
        const { token: t, user: u } = res.data;
        localStorage.setItem('consorci_token', t);
        localStorage.setItem('consorci_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
        return u;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('consorci_token');
        localStorage.removeItem('consorci_user');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    }, []);

    const isRole = useCallback((...roles) => user && roles.includes(user.role), [user]);
    const isAuth = !!token && !!user;

    return (
        <AuthContext.Provider value={{ user, token, isAuth, isRole, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export default AuthContext;
