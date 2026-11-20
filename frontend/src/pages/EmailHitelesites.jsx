import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiKeres } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import './Login.css';

const EmailHitelesites = () => {
    const [params] = useSearchParams();
    const [email, setEmail] = useState(params.get('ujrakuldes') || '');
    const [allapot, setAllapot] = useState({ tipus: params.get('token') ? 'folyamat' : 'urlap', szoveg: '' });

    useSeo({ cim: 'E-mail-cím megerősítése', noindex: true });

    useEffect(() => {
        const token = params.get('token');
        if (!token) return undefined;
        apiKeres('/auth/verify-email', { method: 'POST', body: { token } }, 'A megerősítés nem sikerült.')
            .then((data) => setAllapot({ tipus: 'siker', szoveg: data.message }))
            .catch((error) => setAllapot({ tipus: 'hiba', szoveg: error.message }));
        return undefined;
    }, [params]);

    const ujrakuldes = async (event) => {
        event.preventDefault();
        setAllapot({ tipus: 'folyamat', szoveg: '' });
        try {
            const data = await apiKeres('/auth/resend-verification', { method: 'POST', body: { email } });
            setAllapot({ tipus: 'siker', szoveg: data.message });
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        }
    };

    return (
        <main className="login-oldal">
            <section className="login-kartya uveg beuszas">
                <div className="login-disz" aria-hidden="true">V</div>
                <p className="felirat">Fiókbiztonság</p>
                <h1>E-mail-cím megerősítése</h1>
                {allapot.tipus === 'urlap' || allapot.tipus === 'folyamat' ? (
                    <form className="login-urlap" onSubmit={ujrakuldes}>
                        <p className="login-leiras">Add meg a regisztrációkor használt címedet, és új megerősítő linket küldünk.</p>
                        <div className="mezo"><label htmlFor="hitelesito-email">E-mail-cím</label><input className="bemenet" id="hitelesito-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                        {allapot.szoveg && <p className="uzenet uzenet-hiba" role="alert">{allapot.szoveg}</p>}
                        <button className="gomb gomb-fo login-gomb" type="submit" disabled={allapot.tipus === 'folyamat'}>Új link küldése</button>
                    </form>
                ) : (
                    <>
                        <p className={allapot.tipus === 'hiba' ? 'uzenet uzenet-hiba' : 'login-leiras'} role={allapot.tipus === 'hiba' ? 'alert' : undefined}>{allapot.szoveg}</p>
                        <Link className="gomb gomb-fo login-gomb" to="/login">Tovább a bejelentkezéshez</Link>
                    </>
                )}
            </section>
        </main>
    );
};

export default EmailHitelesites;