import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [jelszo, setJelszo] = useState('');
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            await login(email.trim(), jelszo);
            navigate(location.state?.from || '/feltolt', { replace: true });
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban(false);
        }
    };

    return (
        <main className="login-oldal">
            <section className="login-kartya">
                <div className="login-disz" aria-hidden="true">V</div>
                <p className="felirat">ÜDV ÚJRA ITT</p>
                <h1>Bejelentkezés</h1>
                <p className="login-leiras">Lépj be a Veltrix fiókodba az autók kezeléséhez.</p>
                <form className="login-urlap" onSubmit={handleSubmit}>
                    <label htmlFor="email">E-mail-cím</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nev@email.hu"
                        required
                    />
                    <label htmlFor="jelszo">Jelszó</label>
                    <input
                        id="jelszo"
                        type="password"
                        autoComplete="current-password"
                        value={jelszo}
                        onChange={(event) => setJelszo(event.target.value)}
                        placeholder="Add meg a jelszavad"
                        required
                    />
                    {hiba && <p className="login-hiba" role="alert">{hiba}</p>}
                    <button className="gomb gomb-arany login-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Bejelentkezés…' : 'Belépés'}
                    </button>
                </form>
                <Link className="login-vissza" to="/">Vissza a főoldalra</Link>
            </section>
        </main>
    );
};

export default Login;
