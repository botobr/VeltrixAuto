import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useFelhasznalo } from '../context/felhasznalo';
import { useSeo } from '../lib/useSeo';
import './Belepes.css';

export const JelszoMezo = ({ id, value, onChange, autoComplete, placeholder, minLength }) => {
    const [lathato, setLathato] = useState(false);
    return (
        <div className="belepes-jelszo">
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
            <button type="button" className="belepes-mutat" onClick={() => setLathato((elozo) => !elozo)} aria-pressed={lathato}>
                {lathato ? 'Elrejt' : 'Mutat'}
            </button>
        </div>
    );
};

const Belepes = () => {
    const { felhasznalo, munkatars, bejelentkezes } = useFelhasznalo();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [jelszo, setJelszo] = useState('');
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState(false);

    useSeo({ cim: 'Bejelentkezés', noindex: true });

    const cel = (belepett) => location.state?.from || (belepett?.jogok?.includes('kezelofelulet') ? '/admin' : '/fiok');

    if (felhasznalo && !folyamatban) {
        return <Navigate to={location.state?.from || (munkatars ? '/admin' : '/fiok')} replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setHiba('');
        setFolyamatban(true);
        try {
            const belepett = await bejelentkezes(email.trim(), jelszo);
            navigate(cel(belepett), { replace: true });
        } catch (error) {
            console.log(error.message);
            
            setHiba(error.message);
            setFolyamatban(false);
        }
    };

    return (
        <main className="belepes-oldal">
            <section className="belepes-kartya uveg beuszas">
                <div className="belepes-disz" aria-hidden="true">V</div>
                <p className="felirat">Üdv újra itt</p>
                <h1>Bejelentkezés</h1>
                <p className="belepes-leiras">{location.state?.uzenet || 'Lépj be a fiókodba a kedvenceid és mentett kereséseid eléréséhez.'}</p>
                <form className="belepes-urlap" onSubmit={handleSubmit}>
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
                    <Link className="belepes-vissza" to="/jelszo-elfelejtve">Elfelejtetted a jelszavad?</Link>
                    {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
                    <button className="gomb gomb-fo belepes-gomb" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Bejelentkezés…' : 'Belépés'}
                    </button>
                </form>
                <p className="belepes-valtas">
                    Még nincs fiókod? <Link to="/regisztracio" state={location.state}>Regisztrálj ingyen</Link>
                </p>
            </section>
        </main>
    );
};

export default Belepes;
