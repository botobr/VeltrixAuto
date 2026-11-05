import { useCallback, useEffect, useMemo, useState } from 'react';
import { autoNev } from '../lib/auto';
import { olvas, ir } from '../lib/tarolo';
import { MAX_OSSZEHASONLITAS, OsszehasonlitasContext } from './osszehasonlitas';

const KULCS = 'veltrix-osszehasonlitas';

/** Az összehasonlításra kijelölt autók – bejelentkezés nélkül is, a böngészőben tárolva. */
export const OsszehasonlitasProvider = ({ children }) => {
    const [autok, setAutok] = useState(() => {
        const mentett = olvas(KULCS, []);
        return Array.isArray(mentett) ? mentett.slice(0, MAX_OSSZEHASONLITAS) : [];
    });

    useEffect(() => {
        ir(KULCS, autok);
    }, [autok]);

    const benne = useCallback((id) => autok.some((auto) => auto.id === id), [autok]);

    /** Hozzáadás/eltávolítás; `false`, ha a lista megtelt. */
    const valtas = useCallback((auto) => {
        if (autok.some((elem) => elem.id === auto._id)) {
            setAutok((elozo) => elozo.filter((elem) => elem.id !== auto._id));
            return true;
        }
        if (autok.length >= MAX_OSSZEHASONLITAS) return false;
        const uj = { id: auto._id, slug: auto.slug, nev: autoNev(auto), kep: auto.kep || auto.kepek?.[0]?.url || null };
        setAutok((elozo) => (elozo.some((elem) => elem.id === uj.id) ? elozo : [...elozo, uj]));
        return true;
    }, [autok]);

    const eltavolitas = useCallback((id) => setAutok((elozo) => elozo.filter((elem) => elem.id !== id)), []);
    const urites = useCallback(() => setAutok([]), []);

    const value = useMemo(() => ({ autok, benne, valtas, eltavolitas, urites, tele: autok.length >= MAX_OSSZEHASONLITAS }),
        [autok, benne, valtas, eltavolitas, urites]);
    return <OsszehasonlitasContext.Provider value={value}>{children}</OsszehasonlitasContext.Provider>;
};
