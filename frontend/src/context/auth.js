import { createContext, useContext } from 'react';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3600/api').replace(/\/$/, '');
export const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('A useAuth az AuthProvideren belül használható.');
    return context;
};