import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useFelhasznalo } from '../context/felhasznalo';
import { useKosar } from '../context/kosar';
import Ikon from './Ikon';
import './Nav.css';

const Nav = () => {
    const { felhasznalo, munkatars, jog, kijelentkezes } = useFelhasznalo();
    const { darab: kosarDarab } = useKosar();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [hiba, setHiba] = useState('');
    const [nyitva, setNyitva] = useState(false);
    const [gorgetett, setGorgetett] = useState(false);
    const [elozoUtvonal, setElozoUtvonal] = useState(pathname);

    // ha másik oldalra megyünk, a mobil menü bezárul
    if (elozoUtvonal !== pathname) {
        setElozoUtvonal(pathname);
        setNyitva(false);
    }

    // ha legörgettek, a fejléc kap egy hátteret
    useEffect(() => {
        const figyelo = () => {
            setGorgetett(window.scrollY > 12);
        };
        figyelo();
        window.addEventListener('scroll', figyelo, { passive: true });
        return () => window.removeEventListener('scroll', figyelo);
    }, []);

    const kilepes = async () => {
        setHiba('');
        try {
            // előbb a főoldalra megyünk, mert ha pl. a Fiók oldalon van,
            // akkor kijelentkezés után a belépés oldalra dobná
            navigate('/');
            await kijelentkezes();
        } catch (error) {
            setHiba(error.message);
        }
    };

    // a név első betűje az avatarba
    let monogram = '?';
    let kedvencekSzama = 0;
    if (felhasznalo) {
        const nev = (felhasznalo.nev || felhasznalo.email || '?').trim();
        monogram = nev.charAt(0).toUpperCase();
        if (felhasznalo.kedvencek) {
            kedvencekSzama = felhasznalo.kedvencek.length;
        }
    }

    let kosarFelirat = 'Kosár';
    if (kosarDarab) {
        kosarFelirat = 'Kosár (' + kosarDarab + ' termék)';
    }

    let fejlecOsztaly = 'nav-fejlec';
    if (gorgetett) {
        fejlecOsztaly += ' nav-gorgetett';
    }
    if (nyitva) {
        fejlecOsztaly += ' nav-nyitva';
    }

    return (
        <header className={fejlecOsztaly}>
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
                        <Link className="nav-kosar ikon-gomb" to="/kosar" aria-label={kosarFelirat} title="Kosár">
                            <Ikon nev="kosar" meret={19} />
                            {kosarDarab > 0 && <span className="nav-jelveny">{kosarDarab > 99 ? '99+' : kosarDarab}</span>}
                        </Link>
                        {felhasznalo ? (
                            <>
                                <Link className="nav-felhasznalo" to="/fiok" title="Fiókom">
                                    <span className="nav-avatar" aria-hidden="true">
                                        {monogram}
                                        {kedvencekSzama > 0 && <span className="nav-jelveny">{kedvencekSzama}</span>}
                                    </span>
                                    <span className="nav-felhasznalo-nev">{felhasznalo.nev || felhasznalo.email}</span>
                                </Link>
                                <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={kilepes}>
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
                                <Link className="gomb gomb-uveg gomb-kicsi" id="belepes-gomb" to="/belepes" state={{ from: pathname }}>Belépés</Link>
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
