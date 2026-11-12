import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiKeres } from '../../lib/api';
import { autoNev, autoUrl, formatSzam, kepMeret } from '../../lib/auto';

const rovidSzam = new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 });
const napFormatum = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' });

/** Az utolsó 30 nap, a hiányzó napok 0 értékkel. */
const napiSor = (napi) => {
    const szamok = new Map(napi.map((elem) => [elem._id, elem.db]));
    return Array.from({ length: 30 }, (_, i) => {
        const datum = new Date();
        datum.setDate(datum.getDate() - (29 - i));
        const kulcs = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
        return { kulcs, datum, db: szamok.get(kulcs) || 0 };
    });
};

const Csempe = ({ cimke, ertek, megjegyzes, link }) => (
    <div className="kpi">
        <span className="kpi-cimke">{cimke}</span>
        <strong className="kpi-ertek">{ertek}</strong>
        {megjegyzes && <span className="kpi-megjegyzes">{link ? <Link to={link}>{megjegyzes}</Link> : megjegyzes}</span>}
    </div>
);

const NapiDiagram = ({ napok }) => {
    const [aktiv, setAktiv] = useState(null);
    const [tablazat, setTablazat] = useState(false);
    const max = Math.max(...napok.map((nap) => nap.db), 1);
    // Kerek skála-maximum a rácsvonalakhoz.
    const lepes = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
    const tetoErtek = Math.ceil(max / lepes) * lepes;
    const racs = Array.from({ length: tetoErtek / lepes + 1 }, (_, i) => i * lepes);
    const osszes = napok.reduce((s, nap) => s + nap.db, 0);

    return (
        <figure className="diagram uveg">
            <figcaption className="diagram-fej">
                <div>
                    <h3>Érdeklődések naponta</h3>
                    <span>Utolsó 30 nap · összesen {formatSzam(osszes)}</span>
                </div>
                <button className="szoveg-gomb" type="button" onClick={() => setTablazat((elozo) => !elozo)} aria-pressed={tablazat}>
                    {tablazat ? 'Diagram' : 'Táblázat'}
                </button>
            </figcaption>

            {tablazat ? (
                <div className="diagram-tabla">
                    <table>
                        <thead><tr><th scope="col">Nap</th><th scope="col">Érdeklődés</th></tr></thead>
                        <tbody>
                            {[...napok].reverse().map((nap) => (
                                <tr key={nap.kulcs}><td>{napFormatum.format(nap.datum)}</td><td>{nap.db}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="diagram-terulet" role="img" aria-label={`Napi érdeklődések az utolsó 30 napban, összesen ${osszes}. A pontos értékek a Táblázat nézetben.`}>
                    <div className="diagram-racs" aria-hidden="true">
                        {racs.map((ertek) => (
                            <div key={ertek} className="diagram-racsvonal" style={{ bottom: `${(ertek / tetoErtek) * 100}%` }}>
                                <span>{ertek}</span>
                            </div>
                        ))}
                    </div>
                    <div className="diagram-oszlopok" onPointerLeave={() => setAktiv(null)}>
                        {napok.map((nap, i) => (
                            <div
                                key={nap.kulcs}
                                className={`diagram-sav ${aktiv === i ? 'aktiv' : ''}`}
                                onPointerEnter={() => setAktiv(i)}
                            >
                                {nap.db > 0 && <span className="diagram-oszlop" style={{ height: `${(nap.db / tetoErtek) * 100}%` }} />}
                                {aktiv === i && (
                                    <span className={`diagram-tipp ${i > 22 ? 'balra' : ''}`} role="tooltip">
                                        <strong>{nap.db}</strong> érdeklődés<small>{napFormatum.format(nap.datum)}</small>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="diagram-tengely" aria-hidden="true">
                        {napok.filter((_, i) => i % 7 === 1 || i === 29).map((nap) => (
                            <span key={nap.kulcs} style={{ left: `${((napok.indexOf(nap) + 0.5) / napok.length) * 100}%` }}>
                                {napFormatum.format(nap.datum)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </figure>
    );
};

const AdminAttekintes = () => {
    const [adat, setAdat] = useState(null);
    const [hiba, setHiba] = useState('');

    useEffect(() => {
        apiKeres('/admin/statisztika').then(setAdat).catch((error) => setHiba(error.message));
    }, []);

    const napok = useMemo(() => (adat ? napiSor(adat.erdeklodesek.napi || []) : []), [adat]);

    if (hiba) return <p className="uzenet uzenet-hiba">{hiba}</p>;
    if (!adat) return <div className="betoltes"><span className="porgo" aria-hidden="true" />Statisztika betöltése…</div>;

    const { autok, osszesitett, erdeklodesek, top, felhasznalok } = adat;
    const aktiv = (autok.elerheto || 0) + (autok.foglalt || 0);

    return (
        <div className="attekintes">
            <div className="kpi-sor">
                <Csempe cimke="Aktív hirdetés" ertek={formatSzam(aktiv)} megjegyzes={`${autok.foglalt || 0} foglalva · ${autok.elkelt || 0} elkelt`} link="/admin?lap=hirdetesek" />
                <Csempe cimke="Új érdeklődés" ertek={formatSzam(erdeklodesek.uj || 0)} megjegyzes={`${erdeklodesek.utolso30nap} az utolsó 30 napban`} link="/admin?lap=erdeklodesek" />
                <Csempe cimke="Megtekintések" ertek={rovidSzam.format(osszesitett.megtekintesek || 0)} megjegyzes="összes adatlap-megtekintés" />
                <Csempe cimke="Telefonszám-kattintás" ertek={rovidSzam.format(osszesitett.telefonKattintasok || 0)} megjegyzes="megjelenített telefonszám" />
                <Csempe cimke="Készletérték" ertek={`${rovidSzam.format(osszesitett.keszletErtek || 0)} Ft`} megjegyzes="nem eladott autók vételára" />
                <Csempe cimke="Regisztrált vásárló" ertek={formatSzam(felhasznalok.felhasznalo || 0)} megjegyzes={`${felhasznalok.admin || 0} admin`} link="/admin?lap=felhasznalok" />
            </div>

            {(autok.rejtett > 0 || autok.lejart > 0) && (
                <p className="uzenet admin-figyelmeztetes">
                    {autok.rejtett > 0 && `${autok.rejtett} rejtett hirdetés. `}
                    {autok.lejart > 0 && `${autok.lejart} lejárt hirdetés nem jelenik meg a kínálatban. `}
                    <Link to="/admin?lap=hirdetesek">Kezelés →</Link>
                </p>
            )}

            <div className="attekintes-racs">
                <NapiDiagram napok={napok} />

                <div className="uveg top-lista">
                    <h3>Legnézettebb hirdetések</h3>
                    {top.length === 0 ? <p className="halvany">Még nincs adat.</p> : (
                        <table>
                            <thead>
                                <tr><th scope="col">Autó</th><th scope="col">Megtekintés</th><th scope="col">Telefon</th></tr>
                            </thead>
                            <tbody>
                                {top.map((auto) => (
                                    <tr key={auto._id}>
                                        <td>
                                            <Link to={autoUrl(auto)} className="top-auto">
                                                {auto.kep ? <img src={kepMeret(auto.kep, 120)} alt="" /> : <span className="top-kep-hiany" />}
                                                <span>{autoNev(auto)} <small>{auto.evjarat}</small></span>
                                            </Link>
                                        </td>
                                        <td>{formatSzam(auto.megtekintesek || 0)}</td>
                                        <td>{formatSzam(auto.telefonKattintasok || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAttekintes;
