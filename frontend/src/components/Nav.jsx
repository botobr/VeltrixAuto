import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/auth';
import './Nav.css';

const Nav = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [hiba, setHiba] = useState('');

    const handleLogout = async () => {
        setHiba('');
        try {
            await logout();
            navigate('/');
        } catch (error) {
            setHiba(error.message);
        }
    };

    return (
        <header className="nav-fejlec">
            <nav className="nav-kontener" aria-label="Fő navigáció">
                <Link className="nav-logo" to="/" aria-label="Veltrix – főoldal">
                    <span className="nav-emblema">V</span>
                    <span>VELTRIX<small>AUTÓK</small></span>
                </Link>
                <div className="nav-linkek">
                    {user && (
                        <NavLink to="/feltolt" className={({ isActive }) => `nav-link${isActive ? ' aktiv' : ''}`}>
                            Autó feltöltése
                        </NavLink>
                    )}
                </div>
                <div className="nav-fiok">
                    {user ? (
                        <>
                            <span className="nav-felhasznalo">{user.nev || user.email}</span>
                            <button className="nav-kilepes" type="button" onClick={handleLogout}>Kilépés</button>
                        </>
                    ) : (
                        <Link className="gomb gomb-arany nav-belepes" to="/login">Bejelentkezés</Link>
                    )}
                </div>
            </nav>
            {hiba && <p className="nav-hiba" role="alert">{hiba}</p>}
        </header>
    );
};

export default Nav;