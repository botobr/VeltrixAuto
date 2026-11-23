import { useCallback, useEffect, useMemo, useState } from 'react';
import { autoNev } from '../lib/auto';
import { olvas, ir } from '../lib/tarolo';
import { MAX_OSSZEHASONLITAS, OsszehasonlitasContext } from './osszehasonlitas';

const KULCS = 'veltrix-osszehasonlitas';

// Az összehasonlításra kiválasztott autók (a böngészőben tárolva, bejelentkezés nélkül is).
export const OsszehasonlitasProvider = ({ children }) => {
    const [autok, setAutok] = useState(() => {
        const mentett = olvas(KULCS, []);
        if (!Array.isArray(mentett)) {
            return [];
        }
        return mentett.slice(0, MAX_OSSZEHASONLITAS);
    });

    useEffect(() => {
        ir(KULCS, autok);
    }, [autok]);

    // benne van-e már az autó
    const benne = useCallback((id) => {
        return autok.some((auto) => auto.id === id);
    }, [autok]);

    // Hozzáadás vagy kivétel. Ha a lista tele van, false-t ad vissza.
    const valtas = useCallback((auto) => {
        if (benne(auto._id)) {
            setAutok((elozo) => elozo.filter((elem) => elem.id !== auto._id));
            return true;
        }
        if (autok.length >= MAX_OSSZEHASONLITAS) {
            return false;
        }

        let kep = auto.kep || null;
        if (!kep && auto.kepek && auto.kepek.length > 0) {
            kep = auto.kepek[0].url;
        }
        const uj = { id: auto._id, slug: auto.slug, nev: autoNev(auto), kep: kep };

        setAutok((elozo) => {
            if (elozo.some((elem) => elem.id === uj.id)) {
                return elozo;
            }
            return [...elozo, uj];
        });
        return true;
    }, [autok, benne]);

    const eltavolitas = useCallback((id) => {
        setAutok((elozo) => elozo.filter((elem) => elem.id !== id));
    }, []);

    const urites = useCallback(() => {
        setAutok([]);
    }, []);

    const value = useMemo(() => ({
        autok,
        benne,
        valtas,
        eltavolitas,
        urites,
        tele: autok.length >= MAX_OSSZEHASONLITAS,
    }), [autok, benne, valtas, eltavolitas, urites]);

    return <OsszehasonlitasContext.Provider value={value}>{children}</OsszehasonlitasContext.Provider>;
};
