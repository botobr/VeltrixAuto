import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiKeres } from '../lib/api';
import { FelhasznaloContext } from './felhasznalo';

// A bejelentkezett felhasználó adatai és a bejelentkezéssel kapcsolatos függvények.
export const FelhasznaloProvider = ({ children }) => {
    const [felhasznalo, setFelhasznalo] = useState(null);
    const [betoltes, setBetoltes] = useState(true);

    // oldal betöltésekor megkérdezzük a szervert, hogy be vagyunk-e jelentkezve
    useEffect(() => {
        let aktiv = true;
        apiKeres('/auth/profil')
            .then((data) => {
                if (aktiv) {
                    setFelhasznalo(data.felhasznalo);
                }
            })
            .catch(() => {
                if (aktiv) {
                    setFelhasznalo(null);
                }
            })
            .finally(() => {
                if (aktiv) {
                    setBetoltes(false);
                }
            });

        return () => {
            aktiv = false;
        };
    }, []);

    const bejelentkezes = useCallback(async (email, jelszo) => {
        const data = await apiKeres('/auth/bejelentkezes', { method: 'POST', body: { email: email, jelszo: jelszo } }, 'Nem sikerült bejelentkezni.');
        setFelhasznalo(data.felhasznalo);
        return data.felhasznalo;
    }, []);

    const regisztracio = useCallback(async (adatok) => {
        return apiKeres('/auth/regisztracio', { method: 'POST', body: adatok }, 'A regisztráció nem sikerült.');
    }, []);

    const profilMentese = useCallback(async (adatok) => {
        const data = await apiKeres('/auth/profil', { method: 'PUT', body: adatok }, 'A profil mentése nem sikerült.');
        setFelhasznalo(data.felhasznalo);
        return data;
    }, []);

    const fiokTorlese = useCallback(async (jelszo) => {
        await apiKeres('/auth/profil', { method: 'DELETE', body: { jelszo: jelszo } }, 'A fiók törlése nem sikerült.');
        setFelhasznalo(null);
    }, []);

    const kijelentkezes = useCallback(async () => {
        try {
            await apiKeres('/auth/kijelentkezes', { method: 'POST' }, 'Nem sikerült kijelentkezni.');
        } catch (error) {
            // ha a munkamenet már lejárt (401), akkor amúgy is ki vagyunk jelentkezve
            if (error.status !== 401) {
                throw error;
            }
        }
        setFelhasznalo(null);
    }, []);

    // Kedvenc hozzáadása / eltávolítása.
    // Először rögtön átállítjuk a képernyőn, és ha a szerver hibát ad, visszaállítjuk.
    const kedvencValtas = useCallback(async (autoId) => {
        if (!felhasznalo) {
            return false;
        }

        const regiKedvencek = felhasznalo.kedvencek || [];
        const kedvenc = regiKedvencek.includes(autoId);

        let ujKedvencek;
        if (kedvenc) {
            ujKedvencek = regiKedvencek.filter((id) => id !== autoId);
        } else {
            ujKedvencek = [...regiKedvencek, autoId];
        }
        setFelhasznalo((elozo) => ({ ...elozo, kedvencek: ujKedvencek }));

        try {
            const metodus = kedvenc ? 'DELETE' : 'POST';
            const data = await apiKeres('/fiok/kedvencek/' + autoId, { method: metodus }, 'A kedvencek mentése nem sikerült.');
            setFelhasznalo((elozo) => {
                if (!elozo) {
                    return elozo;
                }
                return { ...elozo, kedvencek: data.kedvencek };
            });
        } catch (error) {
            // visszaállítjuk a régit
            setFelhasznalo((elozo) => {
                if (!elozo) {
                    return elozo;
                }
                return { ...elozo, kedvencek: regiKedvencek };
            });
            if (error.status === 401) {
                setFelhasznalo(null);
            }
            throw error;
        }
        return true;
    }, [felhasznalo]);

    // Van-e ilyen joga a felhasználónak (a szervertől kapott lista alapján).
    // Ez csak a megjelenítéshez kell, az igazi ellenőrzés a szerveren van.
    const jog = useCallback((nev) => {
        if (!felhasznalo || !felhasznalo.jogok) {
            return false;
        }
        return felhasznalo.jogok.includes(nev);
    }, [felhasznalo]);

    const value = useMemo(() => ({
        felhasznalo,
        betoltes,
        admin: felhasznalo !== null && felhasznalo.statusz === 'admin',
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
