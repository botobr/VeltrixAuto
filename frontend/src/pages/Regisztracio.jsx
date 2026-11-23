import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { useFelhasznalo } from '../context/felhasznalo';
import { useSeo } from '../lib/useSeo';
import { JelszoMezo } from './Belepes';
import './Belepes.css';

const ELONYOK = [
    ['sziv', 'Kedvenc autók mentése bármely eszközről'],
    ['harang', 'E-mail értesítés új, neked megfelelő autókról'],
    ['osszehasonlit', 'Mentett keresések egy kattintással'],
];

const Regisztracio = () => {
    const { felhasznalo, regisztracio } = useFelhasznalo();
    const location = useLocation();
    const [adatok, setAdatok] = useState({ nev: '', email: '', jelszo: '', adatkezeles: false, weboldal: '' });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);
    const [sikeres, setSikeres] = useState(false);

    useSeo({ cim: 'Regisztráció', noindex: true });

    // ha már be van jelentkezve
    if (felhasznalo && !folyamatban) {
        let hova = '/fiok';
        if (location.state && location.state.from) {
            hova = location.state.from;
        }
        return <Navigate to={hova} replace />;
    }

    const beallit = (mezo) => (event) => {
        let ertek = event.target.value;
        if (event.target.type === 'checkbox') {
            ertek = event.target.checked;
        }
        setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));
    };

    const kuldes = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            await regisztracio({ ...adatok, email: adatok.email.trim() });
            setSikeres(true);
        } catch (error) {
            setHiba(error.message);
            setFolyamatban(false);
        }
    };

    return (
        <main className="belepes-oldal">
            <section className="belepes-kartya uveg beuszas">
                <div className="belepes-disz" aria-hidden="true">V</div>
                <p className="felirat">Ingyenes fiók</p>
                <h1>Regisztráció</h1>
                <ul className="belepes-elonyok">
                    {ELONYOK.map(([ikon, szoveg]) => <li key={szoveg}><Ikon nev={ikon} meret={16} /> {szoveg}</li>)}
                </ul>
                {sikeres ? (
                    <>
                        <p className="belepes-leiras">Elküldtük a megerősítő linket a(z) <strong>{adatok.email}</strong> címre. A fiókod aktiválásához kattints a linkre.</p>
                        <Link className="gomb gomb-fo belepes-gomb" to="/belepes">Tovább a bejelentkezéshez</Link>
                        <p className="belepes-vissza">Nem kaptad meg? <Link to={'/email-hitelesites?ujrakuldes=' + encodeURIComponent(adatok.email)}>Új link kérése</Link></p>
                    </>
                ) : <form className="belepes-urlap" onSubmit={kuldes}>
                    <div className="mezo">
                        <span><label htmlFor="reg-nev">Név</label></span>
                        <input className="bemenet" id="reg-nev" autoComplete="name" required minLength={2} maxLength={100}
                            value={adatok.nev} onChange={beallit('nev')} />
                    </div>
                    <div className="mezo">
                        <span><label htmlFor="reg-email">E-mail-cím</label></span>
                        <input className="bemenet" id="reg-email" type="email" autoComplete="email" required
                            value={adatok.email} onChange={beallit('email')} placeholder="nev@email.hu" />
                    </div>
                    <div className="mezo">
                        <span><label htmlFor="reg-jelszo">Jelszó</label> <small>(legalább 8 karakter)</small></span>
                        <JelszoMezo id="reg-jelszo" autoComplete="new-password" minLength={8} value={adatok.jelszo} onChange={beallit('jelszo')} />
                    </div>
                    {/* robotcsapda, ember nem látja */}
                    <div className="robotcsapda" aria-hidden="true">
                        <label htmlFor="reg-weboldal">Weboldal</label>
                        <input id="reg-weboldal" tabIndex={-1} autoComplete="off" value={adatok.weboldal} onChange={beallit('weboldal')} />
                    </div>
                    <label className="jelolo">
                        <input type="checkbox" required checked={adatok.adatkezeles} onChange={beallit('adatkezeles')} />
                        <span>
                            Elfogadom az <Link to="/aszf" target="_blank">ÁSZF-et</Link> és az <Link to="/adatkezeles" target="_blank">adatkezelési tájékoztatót</Link>.
                        </span>
                    </label>
                    {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
                    <button className="gomb gomb-fo belepes-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Regisztráció…' : 'Fiók létrehozása'}
                    </button>
                </form>}
                {!sikeres && <p className="belepes-valtas">
                    Van már fiókod? <Link to="/belepes" state={location.state}>Jelentkezz be</Link>
                </p>}
            </section>
        </main>
    );
};

export default Regisztracio;
