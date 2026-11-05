import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import Ikon from './Ikon';

const ErdeklodesUrlap = ({ auto }) => {
    const id = useId();
    const { user } = useAuth();
    // A kitöltés kezdete: a túl gyorsan (robot által) beküldött űrlapot a szerver eldobja.
    const [kezdes] = useState(() => Date.now());
    const [adatok, setAdatok] = useState({
        nev: user?.nev || '',
        email: user?.email || '',
        telefon: '',
        uzenet: `Érdeklődnék a(z) ${auto.marka} ${auto.modell} (${auto.evjarat}) iránt. Kérem, vegyék fel velem a kapcsolatot.`,
        adatkezeles: false,
        weboldal: '',
    });
    const [allapot, setAllapot] = useState({ tipus: null, szoveg: '' });
    const [folyamatban, setFolyamatban] = useState(false);

    const beallit = (mezo) => (event) => {
        const ertek = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));
    };

    const kuldes = async (event) => {
        event.preventDefault();
        setFolyamatban(true);
        setAllapot({ tipus: null, szoveg: '' });
        try {
            const data = await apiKeres('/erdeklodesek', { method: 'POST', body: { ...adatok, auto: auto._id, kezdes } }, 'Az üzenet elküldése nem sikerült.');
            setAllapot({ tipus: 'siker', szoveg: data.message });
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        } finally {
            setFolyamatban(false);
        }
    };

    if (allapot.tipus === 'siker') {
        return (
            <div className="erdeklodes-siker">
                <span className="erdeklodes-siker-ikon"><Ikon nev="pipa" meret={26} /></span>
                <h3>Üzenet elküldve</h3>
                <p>{allapot.szoveg}</p>
            </div>
        );
    }

    return (
        <form className="erdeklodes-urlap" onSubmit={kuldes} noValidate={false}>
            <div className="erdeklodes-sor">
                <label className="mezo" htmlFor={`${id}-nev`}>
                    <span>Név</span>
                    <input className="bemenet" id={`${id}-nev`} autoComplete="name" required minLength={2} maxLength={100}
                        value={adatok.nev} onChange={beallit('nev')} />
                </label>
                <label className="mezo" htmlFor={`${id}-email`}>
                    <span>E-mail</span>
                    <input className="bemenet" id={`${id}-email`} type="email" autoComplete="email" required maxLength={120}
                        value={adatok.email} onChange={beallit('email')} />
                </label>
            </div>
            <label className="mezo" htmlFor={`${id}-telefon`}>
                <span>Telefonszám <small>(nem kötelező)</small></span>
                <input className="bemenet" id={`${id}-telefon`} type="tel" autoComplete="tel" maxLength={40} placeholder="+36 30 123 4567"
                    value={adatok.telefon} onChange={beallit('telefon')} />
            </label>
            <label className="mezo" htmlFor={`${id}-uzenet`}>
                <span>Üzenet</span>
                <textarea className="bemenet" id={`${id}-uzenet`} required minLength={10} maxLength={3000} rows={4}
                    value={adatok.uzenet} onChange={beallit('uzenet')} />
            </label>

            {/* Robotcsapda: emberek nem látják, a robotok kitöltik. */}
            <div className="robotcsapda" aria-hidden="true">
                <label htmlFor={`${id}-weboldal`}>Weboldal</label>
                <input id={`${id}-weboldal`} tabIndex={-1} autoComplete="off" value={adatok.weboldal} onChange={beallit('weboldal')} />
            </div>

            <label className="jelolo">
                <input type="checkbox" required checked={adatok.adatkezeles} onChange={beallit('adatkezeles')} />
                <span>
                    Elolvastam és elfogadom az <Link to="/adatkezeles" target="_blank">adatkezelési tájékoztatót</Link>.
                </span>
            </label>

            {allapot.tipus === 'hiba' && <p className="uzenet uzenet-hiba" role="alert">{allapot.szoveg}</p>}
            <button className="gomb gomb-fo" type="submit" disabled={folyamatban}>
                {folyamatban ? 'Küldés…' : <><Ikon nev="level" meret={16} /> Üzenet küldése</>}
            </button>
        </form>
    );
};

export default ErdeklodesUrlap;
