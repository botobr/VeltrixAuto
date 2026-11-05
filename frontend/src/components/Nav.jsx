import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import './Nav.css';

const Nav = () => {
    const { user, logout } = useAuth();
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
                        <NavLink to="/" end>Főoldal</NavLink>
                        <NavLink to="/autok">Kínálat</NavLink>
                        {user && <NavLink to="/feltolt">Feltöltés</NavLink>}
                    </div>
                    <div className="nav-fiok">
                        {user ? (
                            <>
                                <span className="nav-felhasznalo" title={user.email}>
                                    <span className="nav-avatar" aria-hidden="true">{monogram}</span>
                                    <span className="nav-felhasznalo-nev">{user.nev || user.email}</span>
                                </span>
                                <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={handleLogout}>Kilépés</button>
                                <Link className="gomb gomb-fo gomb-kicsi nav-cta" to="/feltolt">
                                    + Új hirdetés
                                </Link>
                            </>
                        ) : (
                            <Link className="gomb gomb-fo gomb-kicsi nav-cta" to="/login">Bejelentkezés</Link>
                        )}
                    </div>
                </div>
            </nav>
            {hiba && <p className="nav-hiba" role="alert">{hiba}</p>}
        </header>
    );
};

export default Nav;
