import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL, AuthContext } from './auth';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        fetch(`${API_URL}/auth/me`, { credentials: 'include' })
            .then(async (response) => {
                if (!response.ok) return null;
                const data = await response.json();
                return data.user;
            })
            .then((currentUser) => {
                if (active) setUser(currentUser);
            })
            .catch(() => {
                if (active) setUser(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (email, jelszo) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, jelszo }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Nem sikerült bejelentkezni.');
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Nem sikerült kijelentkezni.');
        }
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
