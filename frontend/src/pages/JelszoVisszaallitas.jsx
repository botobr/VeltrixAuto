import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiKeres } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { JelszoMezo } from './Login';
import './Login.css';

const JelszoVisszaallitas = () => {
    const [params] = useSearchParams();
    const token = params.get('token');
    const [email, setEmail] = useState('');
    const [jelszo, setJelszo] = useState('');
    const [allapot, setAllapot] = useState({ tipus: 'urlap', szoveg: '' });

    useSeo({ cim: token ? 'Új jelszó beállítása' : 'Elfelejtett jelszó', noindex: true });

    const kuldes = async (event) => {
        event.preventDefault();
        setAllapot({ tipus: 'folyamat', szoveg: '' });
        try {
            const data = token
                ? await apiKeres('/auth/reset-password', { method: 'POST', body: { token, jelszo } }, 'A jelszó frissítése nem sikerült.')
                : await apiKeres('/auth/forgot-password', { method: 'POST', body: { email } });
            setAllapot({ tipus: 'siker', szoveg: data.message });
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        }
    };

    const sikeres = allapot.tipus === 'siker';
    return (
        <main className="login-oldal">
            <section className="login-kartya uveg beuszas">
                <div className="login-disz" aria-hidden="true">V</div>
                <p className="felirat">Fiókbiztonság</p>
                <h1>{token ? 'Új jelszó beállítása' : 'Elfelejtett jelszó'}</h1>
                {sikeres ? (
                    <><p className="login-leiras">{allapot.szoveg}</p><Link className="gomb gomb-fo login-gomb" to="/login">Tovább a bejelentkezéshez</Link></>
                ) : (
                    <form className="login-urlap" onSubmit={kuldes}>
                        <p className="login-leiras">{token ? 'Válassz legalább 8 karakteres új jelszót.' : 'Megadjuk, hogyan állíthatod vissza a jelszavadat.'}</p>
                        {token ? <div className="mezo"><label htmlFor="uj-jelszo">Új jelszó</label><JelszoMezo id="uj-jelszo" autoComplete="new-password" minLength={8} value={jelszo} onChange={(event) => setJelszo(event.target.value)} /></div>
                            : <div className="mezo"><label htmlFor="reset-email">E-mail-cím</label><input className="bemenet" id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
                        {allapot.szoveg && <p className="uzenet uzenet-hiba" role="alert">{allapot.szoveg}</p>}
                        <button className="gomb gomb-fo login-gomb" type="submit" disabled={allapot.tipus === 'folyamat'}>{token ? 'Jelszó mentése' : 'Visszaállító link küldése'}</button>
                    </form>
                )}
                <Link className="login-vissza" to="/login">Vissza a bejelentkezéshez</Link>
            </section>
        </main>
    );
};

export default JelszoVisszaallitas;