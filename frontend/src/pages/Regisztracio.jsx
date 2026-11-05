import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { useAuth } from '../context/auth';
import { useSeo } from '../lib/useSeo';
import { JelszoMezo } from './Login';
import './Login.css';

const ELONYOK = [
    ['sziv', 'Kedvenc autók mentése bármely eszközről'],
    ['harang', 'E-mail értesítés új, neked megfelelő autókról'],
    ['osszehasonlit', 'Mentett keresések egy kattintással'],
];

const Regisztracio = () => {
    const { user, regisztracio } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [adatok, setAdatok] = useState({ nev: '', email: '', jelszo: '', adatkezeles: false, weboldal: '' });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);

    useSeo({ cim: 'Regisztráció', noindex: true });

    if (user && !folyamatban) return <Navigate to={location.state?.from || '/fiok'} replace />;

    const beallit = (mezo) => (event) => {
        const ertek = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));
    };

    const kuldes = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            await regisztracio({ ...adatok, email: adatok.email.trim() });
            navigate(location.state?.from || '/fiok', { replace: true });
        } catch (error) {
            setHiba(error.message);
            setFolyamatban(false);
        }
    };

    return (
        <main className="login-oldal">
            <section className="login-kartya uveg beuszas">
                <div className="login-disz" aria-hidden="true">V</div>
                <p className="felirat">Ingyenes fiók</p>
                <h1>Regisztráció</h1>
                <ul className="login-elonyok">
                    {ELONYOK.map(([ikon, szoveg]) => <li key={szoveg}><Ikon nev={ikon} meret={16} /> {szoveg}</li>)}
                </ul>
                <form className="login-urlap" onSubmit={kuldes}>
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
                    <button className="gomb gomb-fo login-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Regisztráció…' : 'Fiók létrehozása'}
                    </button>
                </form>
                <p className="login-valtas">
                    Van már fiókod? <Link to="/login" state={location.state}>Jelentkezz be</Link>
                </p>
            </section>
        </main>
    );
};

export default Regisztracio;
