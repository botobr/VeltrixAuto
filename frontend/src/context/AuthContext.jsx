import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiKeres } from '../lib/api';
import { AuthContext } from './auth';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        apiKeres('/auth/me')
            .then((data) => {
                if (active) setUser(data.user);
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
        const data = await apiKeres('/auth/login', { method: 'POST', body: { email, jelszo } }, 'Nem sikerült bejelentkezni.');
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiKeres('/auth/logout', { method: 'POST' }, 'Nem sikerült kijelentkezni.');
        } catch (error) {
            // Ha a munkamenet már lejárt, a felhasználó ténylegesen ki van jelentkezve.
            if (error.status !== 401) throw error;
        }
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
