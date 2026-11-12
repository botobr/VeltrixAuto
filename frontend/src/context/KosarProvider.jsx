import { useCallback, useEffect, useMemo, useState } from 'react';
import { olvas, ir } from '../lib/tarolo';
import { KosarContext, MAX_MENNYISEG } from './kosar';

const KULCS = 'veltrix-kosar';

const tisztitas = (lista) => (Array.isArray(lista) ? lista : [])
    .filter((t) => typeof t?.id === 'string' && Number.isInteger(t.mennyiseg) && t.mennyiseg > 0)
    .map((t) => ({ id: t.id, mennyiseg: Math.min(t.mennyiseg, MAX_MENNYISEG) }))
    .slice(0, 30);

/**
 * A kosár a böngészőben (bejelentkezés nélkül is). Csak azonosítót és darabszámot
 * tárol: az ár, a készlet és a végösszeg mindig a szerverről jön.
 */
export const KosarProvider = ({ children }) => {
    const [tetelek, setTetelek] = useState(() => tisztitas(olvas(KULCS, [])));

    useEffect(() => {
        ir(KULCS, tetelek);
    }, [tetelek]);

    // Másik böngészőfülön módosított kosár kövesse ezt a fület is.
    useEffect(() => {
        const figyelo = (event) => {
            if (event.key === KULCS) setTetelek(tisztitas(olvas(KULCS, [])));
        };
        window.addEventListener('storage', figyelo);
        return () => window.removeEventListener('storage', figyelo);
    }, []);

    const hozzaadas = useCallback((id, mennyiseg = 1) => {
        setTetelek((elozo) => {
            const meglevo = elozo.find((t) => t.id === id);
            if (meglevo) return elozo.map((t) => (t.id === id ? { ...t, mennyiseg: Math.min(t.mennyiseg + mennyiseg, MAX_MENNYISEG) } : t));
            return [...elozo, { id, mennyiseg: Math.min(mennyiseg, MAX_MENNYISEG) }];
        });
    }, []);

    const mennyisegBeallitas = useCallback((id, mennyiseg) => {
        setTetelek((elozo) => (mennyiseg <= 0
            ? elozo.filter((t) => t.id !== id)
            : elozo.map((t) => (t.id === id ? { ...t, mennyiseg: Math.min(mennyiseg, MAX_MENNYISEG) } : t))));
    }, []);

    const eltavolitas = useCallback((ids) => {
        const torlendo = new Set([].concat(ids));
        setTetelek((elozo) => elozo.filter((t) => !torlendo.has(t.id)));
    }, []);

    const urites = useCallback(() => setTetelek([]), []);

    const value = useMemo(() => ({
        tetelek,
        darab: tetelek.reduce((osszeg, t) => osszeg + t.mennyiseg, 0),
        mennyiseg: (id) => tetelek.find((t) => t.id === id)?.mennyiseg || 0,
        hozzaadas,
        mennyisegBeallitas,
        eltavolitas,
        urites,
    }), [tetelek, hozzaadas, mennyisegBeallitas, eltavolitas, urites]);

    return <KosarContext.Provider value={value}>{children}</KosarContext.Provider>;
};
