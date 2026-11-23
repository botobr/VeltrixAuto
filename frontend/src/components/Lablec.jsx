import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiKeres } from '../lib/api';
import { CEG } from '../lib/ceg';
import { olvas, ir } from '../lib/tarolo';
import { useOsszehasonlitas } from '../context/osszehasonlitas';
import Ikon from './Ikon';
import './Lablec.css';

const Lablec = () => {
    const [telephely, setTelephely] = useState(null);

    // az első telephely adatait írjuk ki a láblécben
    useEffect(() => {
        apiKeres('/telephelyek')
            .then((data) => {
                if (data.telephelyek && data.telephelyek.length > 0) {
                    setTelephely(data.telephelyek[0]);
                }
            })
            .catch(() => {
                // ha nem sikerül, a cég alap adatai maradnak
            });
    }, []);

    let telefon = CEG.telefon;
    let email = CEG.email;
    if (telephely && telephely.telefon) {
        telefon = telephely.telefon;
    }
    if (telephely && telephely.email) {
        email = telephely.email;
    }
    // a tel: linkbe csak számok és + kellenek
    const telefonLink = 'tel:' + telefon.replace(/[^\d+]/g, '');

    return (
        <footer className="lablec">
            <div className="lablec-belso">
                <div className="lablec-marka">
                    <Link className="nav-logo" to="/" aria-label="Veltrix – főoldal">
                        <span className="nav-emblema" aria-hidden="true">V</span>
                        <span className="nav-logo-szoveg">VELTRIX<small>AUTÓK</small></span>
                    </Link>
                    <p>Válogatott használt autók átlátható adatokkal, garanciával és személyes kiszolgálással.</p>
                </div>
                <nav aria-label="Kínálat">
                    <h2>Kínálat</h2>
                    <Link to="/autok">Összes autó</Link>
                    <Link to="/autok?ujak=1">Új hirdetések</Link>
                    <Link to="/autok?garancias=1">Garanciális autók</Link>
                    <Link to="/osszehasonlitas">Összehasonlítás</Link>
                </nav>
                <nav aria-label="Szolgáltatások">
                    <h2>Szolgáltatások</h2>
                    <Link to="/szolgaltatasok#finanszirozas">Finanszírozás</Link>
                    <Link to="/szolgaltatasok#beszamitas">Beszámítás</Link>
                    <Link to="/szolgaltatasok#garancia">Garancia</Link>
                    <Link to="/szolgaltatasok#vasarlas">Vásárlás menete</Link>
                </nav>
                <div className="lablec-kapcsolat">
                    <h2>Kapcsolat</h2>
                    {telephely && <span><Ikon nev="terkep" meret={15} /> {telephely.iranyitoszam} {telephely.varos}, {telephely.cim}</span>}
                    <a href={telefonLink}><Ikon nev="telefon" meret={15} /> {telefon}</a>
                    <a href={'mailto:' + email}><Ikon nev="level" meret={15} /> {email}</a>
                    <Link to="/rolunk#telephelyek"><Ikon nev="ora" meret={15} /> Nyitvatartás</Link>
                </div>
            </div>
            <div className="lablec-also">
                <span>© {new Date().getFullYear()} {CEG.jogiNev}</span>
                <nav aria-label="Jogi információk">
                    <Link to="/aszf">ÁSZF</Link>
                    <Link to="/adatkezeles">Adatkezelés</Link>
                    <Link to="/cookie">Cookie-tájékoztató</Link>
                </nav>
            </div>
        </footer>
    );
};

const COOKIE_KULCS = 'veltrix-cookie-tudomasul';

// Süti tájékoztató sáv. Csak a működéshez szükséges sütiket használjuk, ezért elég, ha tudomásul veszi.
export const CookieSav = () => {
    const [lathato, setLathato] = useState(() => !olvas(COOKIE_KULCS, false));

    const rendben = () => {
        ir(COOKIE_KULCS, true);
        setLathato(false);
    };

    if (!lathato) {
        return null;
    }
    return (
        <div className="cookie-sav uveg" role="region" aria-label="Süti-tájékoztató">
            <p>
                Az oldal csak a működéséhez szükséges sütiket és böngészőtárolót használ (bejelentkezés, kedvencek,
                összehasonlítás). Követő vagy reklámcélú sütit nem alkalmazunk. <Link to="/cookie">Részletek</Link>
            </p>
            <button className="gomb gomb-fo gomb-kicsi" type="button" onClick={rendben}>
                Rendben
            </button>
        </div>
    );
};

// Az oldal alján lévő sáv az összehasonlításra kiválasztott autókkal.
export const OsszehasonlitasSav = () => {
    const { autok, eltavolitas, urites } = useOsszehasonlitas();
    const lathato = autok.length > 0;

    // amíg a sáv látszik, az oldal alján hagyunk helyet, hogy ne takarjon ki semmit
    useEffect(() => {
        if (lathato) {
            document.body.classList.add('van-also-sav');
        } else {
            document.body.classList.remove('van-also-sav');
        }
        return () => document.body.classList.remove('van-also-sav');
    }, [lathato]);

    if (!lathato) {
        return null;
    }

    const idk = autok.map((auto) => auto.id).join(',');
    return (
        <aside className="osszehasonlitas-sav uveg" aria-label="Összehasonlítás">
            <div className="osszehasonlitas-sav-autok">
                {autok.map((auto) => (
                    <span className="osszehasonlitas-sav-auto" key={auto.id} title={auto.nev}>
                        {auto.kep ? <img src={auto.kep} alt="" /> : <span className="osszehasonlitas-sav-kep-hiany" />}
                        <button type="button" onClick={() => eltavolitas(auto.id)} aria-label={`${auto.nev} eltávolítása`}>
                            <Ikon nev="x" meret={12} />
                        </button>
                    </span>
                ))}
            </div>
            <span className="osszehasonlitas-sav-szoveg">{autok.length} autó kiválasztva</span>
            <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={urites}>Törlés</button>
            <Link className="gomb gomb-fo gomb-kicsi" to={'/osszehasonlitas?autok=' + idk}>
                Összehasonlítás
            </Link>
        </aside>
    );
};

export default Lablec;
