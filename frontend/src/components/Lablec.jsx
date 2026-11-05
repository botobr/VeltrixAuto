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

    useEffect(() => {
        apiKeres('/telephelyek').then((data) => setTelephely(data.telephelyek?.[0] || null)).catch(() => {});
    }, []);

    const telefon = telephely?.telefon || CEG.telefon;
    const email = telephely?.email || CEG.email;

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
                    <a href={`tel:${telefon.replace(/[^\d+]/g, '')}`}><Ikon nev="telefon" meret={15} /> {telefon}</a>
                    <a href={`mailto:${email}`}><Ikon nev="level" meret={15} /> {email}</a>
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

/** Tájékoztató sáv: csak működéshez szükséges sütik vannak, ezért elég a tudomásulvétel. */
export const CookieSav = () => {
    const [lathato, setLathato] = useState(() => !olvas(COOKIE_KULCS, false));
    if (!lathato) return null;
    return (
        <div className="cookie-sav uveg" role="region" aria-label="Süti-tájékoztató">
            <p>
                Az oldal csak a működéséhez szükséges sütiket és böngészőtárolót használ (bejelentkezés, kedvencek,
                összehasonlítás). Követő vagy reklámcélú sütit nem alkalmazunk. <Link to="/cookie">Részletek</Link>
            </p>
            <button className="gomb gomb-fo gomb-kicsi" type="button" onClick={() => { ir(COOKIE_KULCS, true); setLathato(false); }}>
                Rendben
            </button>
        </div>
    );
};

/** Lebegő sáv a kiválasztott összehasonlítandó autókkal. */
export const OsszehasonlitasSav = () => {
    const { autok, eltavolitas, urites } = useOsszehasonlitas();
    const lathato = autok.length > 0;

    // Amíg a sáv látszik, az oldal alján hely marad, hogy ne takarjon ki tartalmat.
    useEffect(() => {
        document.body.classList.toggle('van-also-sav', lathato);
        return () => document.body.classList.remove('van-also-sav');
    }, [lathato]);

    if (!lathato) return null;
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
            <Link className="gomb gomb-fo gomb-kicsi" to={`/osszehasonlitas?autok=${autok.map((auto) => auto.id).join(',')}`}>
                Összehasonlítás
            </Link>
        </aside>
    );
};

export default Lablec;
