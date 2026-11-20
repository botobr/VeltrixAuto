import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiKeres } from '../lib/api';
import { FelhasznaloContext } from './felhasznalo';

export const FelhasznaloProvider = ({ children }) => {
    const [felhasznalo, setFelhasznalo] = useState(null);
    const [betoltes, setBetoltes] = useState(true);

    useEffect(() => {
        let active = true;
        apiKeres('/auth/profil')
            .then((data) => {
                if (active) setFelhasznalo(data.felhasznalo);
            })
            .catch(() => {
                if (active) setFelhasznalo(null);
            })
            .finally(() => {
                if (active) setBetoltes(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const bejelentkezes = useCallback(async (email, jelszo) => {
        const data = await apiKeres('/auth/bejelentkezes', { method: 'POST', body: { email, jelszo } }, 'Nem sikerült bejelentkezni.');
        setFelhasznalo(data.felhasznalo);
        return data.felhasznalo;
    }, []);

    const regisztracio = useCallback(async (adatok) => {
        const data = await apiKeres('/auth/regisztracio', { method: 'POST', body: adatok }, 'A regisztráció nem sikerült.');
        return data;
    }, []);

    const profilMentese = useCallback(async (adatok) => {
        const data = await apiKeres('/auth/profil', { method: 'PUT', body: adatok }, 'A profil mentése nem sikerült.');
        setFelhasznalo(data.felhasznalo);
        return data;
    }, []);

    const fiokTorlese = useCallback(async (jelszo) => {
        await apiKeres('/auth/profil', { method: 'DELETE', body: { jelszo } }, 'A fiók törlése nem sikerült.');
        setFelhasznalo(null);
    }, []);

    const kijelentkezes = useCallback(async () => {
        try {
            await apiKeres('/auth/kijelentkezes', { method: 'POST' }, 'Nem sikerült kijelentkezni.');
        } catch (error) {
            // Ha a munkamenet már lejárt, a felhasználó ténylegesen ki van jelentkezve.
            if (error.status !== 401) throw error;
        }
        setFelhasznalo(null);
    }, []);

    /** Kedvenc be/ki – optimista frissítéssel, hiba esetén visszaállítva. */
    const kedvencValtas = useCallback(async (autoId) => {
        if (!felhasznalo) return false;
        const kedvenc = felhasznalo.kedvencek?.includes(autoId);
        const elozo = felhasznalo.kedvencek || [];
        setFelhasznalo((u) => ({ ...u, kedvencek: kedvenc ? elozo.filter((id) => id !== autoId) : [...elozo, autoId] }));
        try {
            const data = await apiKeres(`/fiok/kedvencek/${autoId}`, { method: kedvenc ? 'DELETE' : 'POST' }, 'A kedvencek mentése nem sikerült.');
            setFelhasznalo((u) => (u ? { ...u, kedvencek: data.kedvencek } : u));
        } catch (error) {
            setFelhasznalo((u) => (u ? { ...u, kedvencek: elozo } : u));
            if (error.status === 401) setFelhasznalo(null);
            throw error;
        }
        return true;
    }, [felhasznalo]);

    /** A backendtől kapott jogok alapján (utils/jogosultsagok.js) – csak megjelenítéshez, az ellenőrzés a szerveren van. */
    const jog = useCallback((nev) => Boolean(felhasznalo?.jogok?.includes(nev)), [felhasznalo]);

    const value = useMemo(() => ({
        felhasznalo,
        betoltes,
        admin: felhasznalo?.statusz === 'admin',
        munkatars: jog('kezelofelulet'),
        jog,
        bejelentkezes,
        kijelentkezes,
        regisztracio,
        profilMentese,
        fiokTorlese,
        kedvencValtas,
    }), [felhasznalo, betoltes, jog, bejelentkezes, kijelentkezes, regisztracio, profilMentese, fiokTorlese, kedvencValtas]);
    return <FelhasznaloContext.Provider value={value}>{children}</FelhasznaloContext.Provider>;
};
