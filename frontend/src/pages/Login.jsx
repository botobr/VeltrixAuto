import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useSeo } from '../lib/useSeo';
import './Login.css';

export const JelszoMezo = ({ id, value, onChange, autoComplete, placeholder, minLength }) => {
    const [lathato, setLathato] = useState(false);
    return (
        <div className="login-jelszo">
            <input
                className="bemenet"
                id={id}
                type={lathato ? 'text' : 'password'}
                autoComplete={autoComplete}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                minLength={minLength}
                required
            />
            <button type="button" className="login-mutat" onClick={() => setLathato((elozo) => !elozo)} aria-pressed={lathato}>
                {lathato ? 'Elrejt' : 'Mutat'}
            </button>
        </div>
    );
};

const Login = () => {
    const { user, admin, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [jelszo, setJelszo] = useState('');
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);

    useSeo({ cim: 'Bejelentkezés', noindex: true });

    const cel = (felhasznalo) => location.state?.from || (felhasznalo?.statusz === 'admin' ? '/admin' : '/fiok');

    if (user && !folyamatban) {
        return <Navigate to={location.state?.from || (admin ? '/admin' : '/fiok')} replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            const felhasznalo = await login(email.trim(), jelszo);
            navigate(cel(felhasznalo), { replace: true });
        } catch (error) {
            setHiba(error.message);
            setFolyamatban(false);
        }
    };

    return (
        <main className="login-oldal">
            <section className="login-kartya uveg beuszas">
                <div className="login-disz" aria-hidden="true">V</div>
                <p className="felirat">Üdv újra itt</p>
                <h1>Bejelentkezés</h1>
                <p className="login-leiras">{location.state?.uzenet || 'Lépj be a fiókodba a kedvenceid és mentett kereséseid eléréséhez.'}</p>
                <form className="login-urlap" onSubmit={handleSubmit}>
                    <div className="mezo">
                        <span><label htmlFor="email">E-mail-cím</label></span>
                        <input
                            className="bemenet"
                            id="email"
                            type="email"
                            autoComplete="username"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="nev@email.hu"
                            required
                        />
                    </div>
                    <div className="mezo">
                        <span><label htmlFor="jelszo">Jelszó</label></span>
                        <JelszoMezo id="jelszo" autoComplete="current-password" value={jelszo} placeholder="Add meg a jelszavad"
                            onChange={(event) => setJelszo(event.target.value)} />
                    </div>
                    {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
                    <button className="gomb gomb-fo login-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Bejelentkezés…' : 'Belépés'}
                    </button>
                </form>
                <p className="login-valtas">
                    Még nincs fiókod? <Link to="/regisztracio" state={location.state}>Regisztrálj ingyen</Link>
                </p>
            </section>
        </main>
    );
};

export default Login;
