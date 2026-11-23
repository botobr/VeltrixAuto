import { useEffect, useState } from 'react';
import { useKosar } from '../context/kosar';
import { apiKeres } from './api';

// A kosarat elküldi a szervernek ellenőrzésre: friss árak, készlet, szállítási és fizetési módok, végösszeg.
// Ha egy termék már nem kapható, kiveszi a kosárból.
export const useKosarEllenorzes = ({ szallitasiMod = null, fizetesiMod = null } = {}) => {
    const { tetelek, eltavolitas } = useKosar();
    // ebből tudjuk, hogy a kapott adat a mostani kosárhoz tartozik-e
    const kulcs = JSON.stringify([tetelek, szallitasiMod, fizetesiMod]);
    const [allapot, setAllapot] = useState({ kulcs: null, adat: null, hiba: '' });

    useEffect(() => {
        if (tetelek.length === 0) {
            return undefined;
        }

        const vezerlo = new AbortController();
        // kicsit várunk, hogy gyors kattintgatásnál ne küldjünk sok kérést
        const idozito = setTimeout(() => {
            const torzs = { tetelek: tetelek, szallitasiMod: szallitasiMod, fizetesiMod: fizetesiMod };
            apiKeres('/kosar', { method: 'POST', body: torzs, signal: vezerlo.signal }, 'A kosár ellenőrzése nem sikerült.')
                .then((adat) => {
                    setAllapot({ kulcs: kulcs, adat: adat, hiba: '' });
                    if (adat.hianyzo.length > 0) {
                        eltavolitas(adat.hianyzo);
                    }
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') {
                        setAllapot((elozo) => ({ ...elozo, kulcs: kulcs, hiba: error.message }));
                    }
                });
        }, 200);

        return () => {
            clearTimeout(idozito);
            vezerlo.abort();
        };
    }, [kulcs, tetelek, szallitasiMod, fizetesiMod, eltavolitas]);

    if (tetelek.length === 0) {
        return { adat: null, hiba: '', betolt: false, ures: true };
    }
    return { adat: allapot.adat, hiba: allapot.hiba, betolt: allapot.kulcs !== kulcs, ures: false };
};
