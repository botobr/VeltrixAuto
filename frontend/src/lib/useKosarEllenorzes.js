import { useEffect, useState } from 'react';
import { useKosar } from '../context/kosar';
import { apiKeres } from './api';

/**
 * A kosár tartalmát a szerverrel ellenőrizteti: aktuális árak, készlet, választható
 * szállítási/fizetési módok és a végösszeg. A már nem elérhető termékeket kiveszi a kosárból.
 */
export const useKosarEllenorzes = ({ szallitasiMod = null, fizetesiMod = null } = {}) => {
    const { tetelek, eltavolitas } = useKosar();
    const kulcs = JSON.stringify([tetelek, szallitasiMod, fizetesiMod]);
    const [allapot, setAllapot] = useState({ kulcs: null, adat: null, hiba: '' });

    useEffect(() => {
        if (tetelek.length === 0) return undefined;
        const vezerlo = new AbortController();
        const idozito = setTimeout(() => {
            apiKeres('/kosar', { method: 'POST', body: { tetelek, szallitasiMod, fizetesiMod }, signal: vezerlo.signal }, 'A kosár ellenőrzése nem sikerült.')
                .then((adat) => {
                    setAllapot({ kulcs, adat, hiba: '' });
                    if (adat.hianyzo.length) eltavolitas(adat.hianyzo);
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') setAllapot((elozo) => ({ ...elozo, kulcs, hiba: error.message }));
                });
        }, 200);
        return () => {
            clearTimeout(idozito);
            vezerlo.abort();
        };
    }, [kulcs, tetelek, szallitasiMod, fizetesiMod, eltavolitas]);

    if (tetelek.length === 0) return { adat: null, hiba: '', betolt: false, ures: true };
    return { adat: allapot.adat, hiba: allapot.hiba, betolt: allapot.kulcs !== kulcs, ures: false };
};
