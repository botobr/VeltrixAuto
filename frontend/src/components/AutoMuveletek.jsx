import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFelhasznalo } from '../context/felhasznalo';
import { MAX_OSSZEHASONLITAS, useOsszehasonlitas } from '../context/osszehasonlitas';
import Ikon from './Ikon';

// Kedvenc gomb (szív). Ha nincs bejelentkezve, a belépés oldalra visz.
export const KedvencGomb = ({ auto, cimkevel = false, className = '' }) => {
    const { felhasznalo, kedvencValtas } = useFelhasznalo();
    const navigate = useNavigate();
    const location = useLocation();
    const [hiba, setHiba] = useState('');

    let kedvenc = false;
    if (felhasznalo && felhasznalo.kedvencek) {
        kedvenc = felhasznalo.kedvencek.includes(auto._id);
    }

    const kattintas = async (event) => {
        // a gomb a kártyán belül van, ne nyissa meg az autót
        event.preventDefault();
        event.stopPropagation();
        if (!felhasznalo) {
            navigate('/belepes', { state: { from: location.pathname + location.search, uzenet: 'A kedvencek mentéséhez jelentkezz be.' } });
            return;
        }
        setHiba('');
        try {
            await kedvencValtas(auto._id);
        } catch (error) {
            setHiba(error.message);
        }
    };

    let felirat = 'Kedvencekhez';
    let leiras = 'Mentés a kedvencek közé';
    let osztaly = 'ikon-gomb kedvenc-gomb ' + className;
    if (kedvenc) {
        felirat = 'Kedvenc';
        leiras = 'Eltávolítás a kedvencek közül';
        osztaly = 'ikon-gomb kedvenc-gomb aktiv ' + className;
    }

    return (
        <button
            type="button"
            className={osztaly}
            onClick={kattintas}
            aria-pressed={kedvenc}
            aria-label={leiras}
            title={hiba || felirat}
        >
            <Ikon nev="sziv" kitoltes={kedvenc} />
            {cimkevel && <span>{felirat}</span>}
        </button>
    );
};

// Összehasonlítás gomb (max 4 autó választható ki)
export const OsszehasonlitasGomb = ({ auto, cimkevel = false, className = '' }) => {
    const { benne, valtas, tele } = useOsszehasonlitas();
    const kivalasztva = benne(auto._id);
    const letiltva = !kivalasztva && tele;

    const kattintas = (event) => {
        event.preventDefault();
        event.stopPropagation();
        valtas(auto);
    };

    let osztaly = 'ikon-gomb osszehasonlit-gomb ' + className;
    let leiras = 'Hozzáadás az összehasonlításhoz';
    if (kivalasztva) {
        osztaly = 'ikon-gomb osszehasonlit-gomb aktiv ' + className;
        leiras = 'Eltávolítás az összehasonlításból';
    }

    let cim = 'Összehasonlítás';
    if (letiltva) {
        cim = 'Legfeljebb ' + MAX_OSSZEHASONLITAS + ' autó hasonlítható össze';
    }

    return (
        <button
            type="button"
            className={osztaly}
            onClick={kattintas}
            aria-pressed={kivalasztva}
            disabled={letiltva}
            aria-label={leiras}
            title={cim}
        >
            <Ikon nev={kivalasztva ? 'pipa' : 'osszehasonlit'} />
            {cimkevel && <span>{kivalasztva ? 'Összehasonlításban' : 'Összehasonlítás'}</span>}
        </button>
    );
};
