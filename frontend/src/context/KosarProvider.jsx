import { useCallback, useEffect, useMemo, useState } from 'react';
import { olvas, ir } from '../lib/tarolo';
import { KosarContext, MAX_MENNYISEG } from './kosar';

const KULCS = 'veltrix-kosar';

// a localStorage-ból olvasott kosár ellenőrzése (ha valaki belepiszkált, ne omoljon össze)
const tisztitas = (lista) => {
    if (!Array.isArray(lista)) {
        return [];
    }
    const tetelek = [];
    for (const tetel of lista) {
        if (!tetel || typeof tetel.id !== 'string') {
            continue;
        }
        if (!Number.isInteger(tetel.mennyiseg) || tetel.mennyiseg <= 0) {
            continue;
        }
        tetelek.push({ id: tetel.id, mennyiseg: Math.min(tetel.mennyiseg, MAX_MENNYISEG) });
    }
    return tetelek.slice(0, 30);
};

// A kosár a böngészőben van tárolva (bejelentkezés nélkül is működik).
// Csak a termék id-ját és a darabszámot tároljuk, az árat mindig a szervertől kérjük.
export const KosarProvider = ({ children }) => {
    const [tetelek, setTetelek] = useState(() => tisztitas(olvas(KULCS, [])));

    // minden változásnál elmentjük
    useEffect(() => {
        ir(KULCS, tetelek);
    }, [tetelek]);

    // ha egy másik fülön változik a kosár, itt is frissítjük
    useEffect(() => {
        const figyelo = (event) => {
            if (event.key === KULCS) {
                setTetelek(tisztitas(olvas(KULCS, [])));
            }
        };
        window.addEventListener('storage', figyelo);
        return () => window.removeEventListener('storage', figyelo);
    }, []);

    const hozzaadas = useCallback((id, mennyiseg = 1) => {
        setTetelek((elozo) => {
            const meglevo = elozo.find((tetel) => tetel.id === id);
            if (!meglevo) {
                return [...elozo, { id: id, mennyiseg: Math.min(mennyiseg, MAX_MENNYISEG) }];
            }
            // ha már benne van, növeljük a darabszámot
            return elozo.map((tetel) => {
                if (tetel.id !== id) {
                    return tetel;
                }
                return { ...tetel, mennyiseg: Math.min(tetel.mennyiseg + mennyiseg, MAX_MENNYISEG) };
            });
        });
    }, []);

    const mennyisegBeallitas = useCallback((id, mennyiseg) => {
        setTetelek((elozo) => {
            // 0 darabnál kivesszük
            if (mennyiseg <= 0) {
                return elozo.filter((tetel) => tetel.id !== id);
            }
            return elozo.map((tetel) => {
                if (tetel.id !== id) {
                    return tetel;
                }
                return { ...tetel, mennyiseg: Math.min(mennyiseg, MAX_MENNYISEG) };
            });
        });
    }, []);

    // egy vagy több termék kivétele (id vagy id-k tömbje)
    const eltavolitas = useCallback((idk) => {
        let torlendok = [idk];
        if (Array.isArray(idk)) {
            torlendok = idk;
        }
        setTetelek((elozo) => elozo.filter((tetel) => !torlendok.includes(tetel.id)));
    }, []);

    const urites = useCallback(() => {
        setTetelek([]);
    }, []);

    const value = useMemo(() => {
        let darab = 0;
        for (const tetel of tetelek) {
            darab += tetel.mennyiseg;
        }

        // egy termékből hány darab van a kosárban
        const mennyiseg = (id) => {
            const tetel = tetelek.find((elem) => elem.id === id);
            if (tetel) {
                return tetel.mennyiseg;
            }
            return 0;
        };

        return { tetelek, darab, mennyiseg, hozzaadas, mennyisegBeallitas, eltavolitas, urites };
    }, [tetelek, hozzaadas, mennyisegBeallitas, eltavolitas, urites]);

    return <KosarContext.Provider value={value}>{children}</KosarContext.Provider>;
};
