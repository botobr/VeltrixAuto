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

    const regisztracio = useCallback(async (adatok) => {
        const data = await apiKeres('/auth/register', { method: 'POST', body: adatok }, 'A regisztráció nem sikerült.');
        setUser(data.user);
        return data.user;
    }, []);

    const profilMentese = useCallback(async (adatok) => {
        const data = await apiKeres('/auth/me', { method: 'PUT', body: adatok }, 'A profil mentése nem sikerült.');
        setUser(data.user);
        return data;
    }, []);

    const fiokTorlese = useCallback(async (jelszo) => {
        await apiKeres('/auth/me', { method: 'DELETE', body: { jelszo } }, 'A fiók törlése nem sikerült.');
        setUser(null);
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

    /** Kedvenc be/ki – optimista frissítéssel, hiba esetén visszaállítva. */
    const kedvencValtas = useCallback(async (autoId) => {
        if (!user) return false;
        const kedvenc = user.kedvencek?.includes(autoId);
        const elozo = user.kedvencek || [];
        setUser((u) => ({ ...u, kedvencek: kedvenc ? elozo.filter((id) => id !== autoId) : [...elozo, autoId] }));
        try {
            const data = await apiKeres(`/fiok/kedvencek/${autoId}`, { method: kedvenc ? 'DELETE' : 'POST' }, 'A kedvencek mentése nem sikerült.');
            setUser((u) => (u ? { ...u, kedvencek: data.kedvencek } : u));
        } catch (error) {
            setUser((u) => (u ? { ...u, kedvencek: elozo } : u));
            if (error.status === 401) setUser(null);
            throw error;
        }
        return true;
    }, [user]);

    /** A backendtől kapott jogok alapján (utils/jogosultsagok.js) – csak megjelenítéshez, az ellenőrzés a szerveren van. */
    const jog = useCallback((nev) => Boolean(user?.jogok?.includes(nev)), [user]);

    const value = useMemo(() => ({
        user,
        loading,
        admin: user?.statusz === 'admin',
        munkatars: jog('kezelofelulet'),
        jog,
        login,
        logout,
        regisztracio,
        profilMentese,
        fiokTorlese,
        kedvencValtas,
    }), [user, loading, jog, login, logout, regisztracio, profilMentese, fiokTorlese, kedvencValtas]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
