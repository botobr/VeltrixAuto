import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { MAX_OSSZEHASONLITAS, useOsszehasonlitas } from '../context/osszehasonlitas';
import Ikon from './Ikon';

/** Kedvencnek jelölés – bejelentkezés nélkül a belépő oldalra visz. */
export const KedvencGomb = ({ auto, cimkevel = false, className = '' }) => {
    const { user, kedvencValtas } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [hiba, setHiba] = useState('');
    const kedvenc = Boolean(user?.kedvencek?.includes(auto._id));

    const kattintas = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
            navigate('/login', { state: { from: location.pathname + location.search, uzenet: 'A kedvencek mentéséhez jelentkezz be.' } });
            return;
        }
        setHiba('');
        try {
            await kedvencValtas(auto._id);
        } catch (error) {
            setHiba(error.message);
        }
    };

    return (
        <button
            type="button"
            className={`ikon-gomb kedvenc-gomb ${kedvenc ? 'aktiv' : ''} ${className}`}
            onClick={kattintas}
            aria-pressed={kedvenc}
            aria-label={kedvenc ? 'Eltávolítás a kedvencek közül' : 'Mentés a kedvencek közé'}
            title={hiba || (kedvenc ? 'Kedvenc' : 'Kedvencekhez')}
        >
            <Ikon nev="sziv" kitoltes={kedvenc} />
            {cimkevel && <span>{kedvenc ? 'Kedvenc' : 'Kedvencekhez'}</span>}
        </button>
    );
};

export const OsszehasonlitasGomb = ({ auto, cimkevel = false, className = '' }) => {
    const { benne, valtas, tele } = useOsszehasonlitas();
    const kivalasztva = benne(auto._id);
    const letiltva = !kivalasztva && tele;

    return (
        <button
            type="button"
            className={`ikon-gomb osszehasonlit-gomb ${kivalasztva ? 'aktiv' : ''} ${className}`}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                valtas(auto);
            }}
            aria-pressed={kivalasztva}
            disabled={letiltva}
            aria-label={kivalasztva ? 'Eltávolítás az összehasonlításból' : 'Hozzáadás az összehasonlításhoz'}
            title={letiltva ? `Legfeljebb ${MAX_OSSZEHASONLITAS} autó hasonlítható össze` : 'Összehasonlítás'}
        >
            <Ikon nev={kivalasztva ? 'pipa' : 'osszehasonlit'} />
            {cimkevel && <span>{kivalasztva ? 'Összehasonlításban' : 'Összehasonlítás'}</span>}
        </button>
    );
};
