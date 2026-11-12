import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useKosar } from '../context/kosar';
import Ikon from './Ikon';
import './Nav.css';

const Nav = () => {
    const { user, munkatars, jog, logout } = useAuth();
    const { darab: kosarDarab } = useKosar();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [hiba, setHiba] = useState('');
    const [nyitva, setNyitva] = useState(false);
    const [gorgetett, setGorgetett] = useState(false);
    const [elozoUtvonal, setElozoUtvonal] = useState(pathname);

    // Navigáláskor a mobilmenü bezárul.
    if (elozoUtvonal !== pathname) {
        setElozoUtvonal(pathname);
        setNyitva(false);
    }

    useEffect(() => {
        const figyelo = () => setGorgetett(window.scrollY > 12);
        figyelo();
        window.addEventListener('scroll', figyelo, { passive: true });
        return () => window.removeEventListener('scroll', figyelo);
    }, []);

    const handleLogout = async () => {
        setHiba('');
        try {
            await logout();
            navigate('/');
        } catch (error) {
            setHiba(error.message);
        }
    };

    const monogram = (user?.nev || user?.email || '?').trim().charAt(0).toUpperCase();
    const kedvencekSzama = user?.kedvencek?.length || 0;

    return (
        <header className={`nav-fejlec ${gorgetett ? 'nav-gorgetett' : ''} ${nyitva ? 'nav-nyitva' : ''}`}>
            <nav className="nav-kontener" aria-label="Fő navigáció">
                <Link className="nav-logo" to="/" aria-label="Veltrix – főoldal">
                    <span className="nav-emblema" aria-hidden="true">V</span>
                    <span className="nav-logo-szoveg">VELTRIX<small>AUTÓK</small></span>
                </Link>

                <button
                    className="nav-menu-gomb"
                    type="button"
                    aria-expanded={nyitva}
                    aria-controls="nav-menu"
                    onClick={() => setNyitva((elozo) => !elozo)}
                >
                    <span className="sr-only">{nyitva ? 'Menü bezárása' : 'Menü megnyitása'}</span>
                    <span className="nav-menu-ikon" aria-hidden="true" />
                </button>

                <div className="nav-menu" id="nav-menu">
                    <div className="nav-linkek">
                        <NavLink to="/autok">Kínálat</NavLink>
                        <NavLink to="/alkatreszek">Tuning alkatrészek</NavLink>
                        <NavLink to="/szolgaltatasok">Szolgáltatások</NavLink>
                        <NavLink to="/rolunk">Rólunk</NavLink>
                        {munkatars && <NavLink to="/admin">Admin</NavLink>}
                    </div>
                    <div className="nav-fiok">
                        <Link className="nav-kosar ikon-gomb" to="/kosar" aria-label={`Kosár${kosarDarab ? ` (${kosarDarab} termék)` : ''}`} title="Kosár">
                            <Ikon nev="kosar" meret={19} />
                            {kosarDarab > 0 && <span className="nav-jelveny">{kosarDarab > 99 ? '99+' : kosarDarab}</span>}
                        </Link>
                        {user ? (
                            <>
                                <Link className="nav-felhasznalo" to="/fiok" title="Fiókom">
                                    <span className="nav-avatar" aria-hidden="true">
                                        {monogram}
                                        {kedvencekSzama > 0 && <span className="nav-jelveny">{kedvencekSzama}</span>}
                                    </span>
                                    <span className="nav-felhasznalo-nev">{user.nev || user.email}</span>
                                </Link>
                                <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={handleLogout}>
                                    <Ikon nev="kilep" meret={15} /> Kilépés
                                </button>
                                {jog('hirdetesSzerkesztes') && (
                                    <Link className="gomb gomb-fo gomb-kicsi nav-cta" to="/admin/autok/uj">
                                        <Ikon nev="plusz" meret={15} /> Új hirdetés
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link className="gomb gomb-uveg gomb-kicsi" to="/login" state={{ from: pathname }}>Belépés</Link>
                                <Link className="gomb gomb-fo gomb-kicsi nav-cta" to="/regisztracio">Regisztráció</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
            {hiba && <p className="nav-hiba" role="alert">{hiba}</p>}
        </header>
    );
};

export default Nav;
