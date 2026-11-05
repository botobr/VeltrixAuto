import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import './Login.css';

const Login = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [jelszo, setJelszo] = useState('');
    const [jelszoLathato, setJelszoLathato] = useState(false);
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);

    const cel = location.state?.from || '/autok';

    if (user && !folyamatban) {
        return <Navigate to={cel} replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            await login(email.trim(), jelszo);
            navigate(cel, { replace: true });
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
                <p className="login-leiras">Lépj be a Veltrix fiókodba az autók kezeléséhez.</p>
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
                        <div className="login-jelszo">
                            <input
                                className="bemenet"
                                id="jelszo"
                                type={jelszoLathato ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={jelszo}
                                onChange={(event) => setJelszo(event.target.value)}
                                placeholder="Add meg a jelszavad"
                                required
                            />
                            <button
                                type="button"
                                className="login-mutat"
                                onClick={() => setJelszoLathato((elozo) => !elozo)}
                                aria-pressed={jelszoLathato}
                            >
                                {jelszoLathato ? 'Elrejt' : 'Mutat'}
                            </button>
                        </div>
                    </div>
                    {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
                    <button className="gomb gomb-fo login-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Bejelentkezés…' : 'Belépés'}
                    </button>
                </form>
                <Link className="login-vissza" to="/">← Vissza a főoldalra</Link>
            </section>
        </main>
    );
};

export default Login;
