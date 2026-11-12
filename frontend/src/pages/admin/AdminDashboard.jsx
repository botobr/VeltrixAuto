import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useAuth } from '../../context/auth';
import { apiKeres } from '../../lib/api';
import { autoNev, autoUrl, formatDatum, formatSzam, formatTizedes, kepMeret } from '../../lib/auto';
import { olvas, ir } from '../../lib/tarolo';
import { OszlopDiagram, SavLista, SzegmensSav } from './DashboardDiagramok';
import './Dashboard.css';

/*
 * Admin dashboard. Minden szám a backendről (/api/admin/dashboard) érkezik
 * készen kiszámolva – itt csak formázás és megjelenítés történik.
 */

const IDOSZAKOK = [
    ['30', '30 nap', 'utolsó 30 nap', 'az előző 30 naphoz'],
    ['90', '90 nap', 'utolsó 90 nap', 'az előző 90 naphoz'],
    ['365', '12 hónap', 'utolsó 12 hónap', 'az előző 12 hónaphoz'],
    ['osszes', 'Teljes időszak', 'teljes időszak', null],
];
const TAROLO_KULCS = 'veltrix-dashboard-idoszak';

const kompakt = new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 });
const szazalek = new Intl.NumberFormat('hu-HU', { style: 'percent', maximumFractionDigits: 1 });
const honapRovid = new Intl.DateTimeFormat('hu-HU', { month: 'short' });
const honapHosszu = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const napFormatum = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' });
const idoFormatum = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' });

const ft = (ertek) => `${formatSzam(Math.round(ertek || 0))} Ft`;
const ftKompakt = (ertek) => (Math.abs(ertek || 0) >= 1e6 ? `${kompakt.format(ertek)} Ft` : ft(ertek));
const helyiDatum = (kulcs) => {
    const [ev, ho, nap = 1] = kulcs.split('-').map(Number);
    return new Date(ev, ho - 1, nap);
};

const Valtozas = ({ ertek, viszonyitas }) => {
    if (!viszonyitas) return null;
    if (ertek === null || ertek === undefined) {
        return <span className="db-valtozas">Az előző időszakban nem volt adat, nincs mihez viszonyítani</span>;
    }
    const irany = ertek > 0 ? 'fel' : ertek < 0 ? 'le' : 'semleges';
    return (
        <span className={`db-valtozas db-valtozas-${irany}`}>
            {irany !== 'semleges' && <Ikon nev={irany} meret={14} />}
            {ertek > 0 ? '+' : ertek < 0 ? '−' : ''}{formatTizedes(Math.abs(ertek))}% {viszonyitas} képest
        </span>
    );
};

const Csempe = ({ cimke, ertek, megjegyzes, link, title }) => (
    <div className="kpi">
        <span className="kpi-cimke">{cimke}</span>
        <strong className="kpi-ertek" title={title}>{ertek}</strong>
        {megjegyzes && <span className="kpi-megjegyzes">{link ? <Link to={link}>{megjegyzes}</Link> : megjegyzes}</span>}
    </div>
);

const AutoCella = ({ auto }) => (
    <Link to={autoUrl(auto)} className="top-auto">
        {auto.kep ? <img src={kepMeret(auto.kep, 120)} alt="" loading="lazy" /> : <span className="top-kep-hiany" />}
        <span>{autoNev(auto)} <small>{auto.evjarat}</small></span>
    </Link>
);

const BevetelKartya = ({ bevetel, idoszakSzoveg, elozoSzoveg }) => (
    <section className="db-kartya uveg db-hero" aria-labelledby="db-bevetel-cim">
        <h2 id="db-bevetel-cim" className="db-hero-cimke"><Ikon nev="penz" meret={16} /> Bevétel · {idoszakSzoveg}</h2>
        <p className="db-hero-ertek" title={ft(bevetel.idoszak)}>{ftKompakt(bevetel.idoszak)}</p>
        <Valtozas ertek={bevetel.valtozas} viszonyitas={elozoSzoveg} />

        <dl className="db-hero-statok">
            <div>
                <dt>Eladott autó</dt>
                <dd>{formatSzam(bevetel.eladottDb)}{bevetel.elozoEladottDb !== null && <small> (előtte {formatSzam(bevetel.elozoEladottDb)})</small>}</dd>
            </div>
            <div>
                <dt>Átlagos eladási ár</dt>
                <dd title={bevetel.atlagAr !== null ? ft(bevetel.atlagAr) : undefined}>{bevetel.atlagAr !== null ? ftKompakt(bevetel.atlagAr) : '–'}</dd>
            </div>
            <div>
                <dt>Átlagos eladási idő</dt>
                <dd>{bevetel.atlagNap !== null ? `${formatSzam(bevetel.atlagNap)} nap` : '–'}</dd>
            </div>
            <div>
                <dt>Átlagos árengedmény</dt>
                <dd>{bevetel.atlagEngedmeny !== null ? szazalek.format(bevetel.atlagEngedmeny) : '–'}</dd>
            </div>
        </dl>

        <p className="db-hero-lab">
            Összes rögzített bevétel: <strong>{ft(bevetel.osszes)}</strong> · {formatSzam(bevetel.osszesEladott)} eladott autó
        </p>
        {bevetel.osszesEladott === 0 && (
            <p className="db-sugo">
                Még nincs rögzített eladás. Ha egy hirdetést <Link to="/admin?lap=hirdetesek">„Elkelt” státuszra</Link> állítasz,
                az eladás ide kerül. A tényleges eladási árat és dátumot a hirdetés szerkesztésénél lehet megadni.
            </p>
        )}
    </section>
);

/** Pénzügyi jog nélkül (értékesítő): csak darabszámok, összeg nélkül. */
const EladasKartya = ({ eladasok, idoszakSzoveg, elozoSzoveg }) => (
    <section className="db-kartya uveg db-hero" aria-labelledby="db-eladas-cim">
        <h2 id="db-eladas-cim" className="db-hero-cimke"><Ikon nev="auto" meret={16} /> Eladott autók · {idoszakSzoveg}</h2>
        <p className="db-hero-ertek">{formatSzam(eladasok.idoszak)}</p>
        <Valtozas ertek={eladasok.valtozas} viszonyitas={elozoSzoveg} />
        <dl className="db-hero-statok">
            <div>
                <dt>Előző időszakban</dt>
                <dd>{eladasok.elozo !== null ? formatSzam(eladasok.elozo) : '–'}</dd>
            </div>
            <div>
                <dt>Átlagos eladási idő</dt>
                <dd>{eladasok.atlagNap !== null ? `${formatSzam(eladasok.atlagNap)} nap` : '–'}</dd>
            </div>
        </dl>
    </section>
);

/** Webshop: rendelések, bevétel (csak pénzügyi joggal érkezik), teendők, készletjelzés, toplista. */
const WebshopBlokk = ({ webshop: w, idoszakSzoveg, elozoSzoveg, jog }) => {
    const penzugy = w.bevetel !== undefined;
    const link = (lap) => (jog(lap === 'rendelesek' ? 'rendelesKezeles' : 'alkatreszSzerkesztes') ? `/admin?lap=${lap}` : undefined);
    return (
        <section className="db-webshop" aria-labelledby="db-webshop-cim">
            <h2 id="db-webshop-cim" className="db-szekcio-cim"><Ikon nev="kosar" meret={17} /> Webshop · {idoszakSzoveg}</h2>
            <div className="kpi-sor">
                {penzugy && (
                    <div className="kpi">
                        <span className="kpi-cimke">Webshop bevétel</span>
                        <strong className="kpi-ertek" title={ft(w.bevetel)}>{ftKompakt(w.bevetel)}</strong>
                        <Valtozas ertek={w.bevetelValtozas} viszonyitas={elozoSzoveg} />
                    </div>
                )}
                <div className="kpi">
                    <span className="kpi-cimke">Rendelések</span>
                    <strong className="kpi-ertek">{formatSzam(w.rendelesek)}</strong>
                    <Valtozas ertek={w.rendelesValtozas} viszonyitas={elozoSzoveg} />
                </div>
                {penzugy && <Csempe cimke="Átlagos kosárérték" ertek={w.atlagKosar !== null ? ftKompakt(w.atlagKosar) : '–'} megjegyzes="lemondott rendelések nélkül" />}
                <Csempe cimke="Teendő rendelés" ertek={formatSzam(w.teendo)} link={link('rendelesek')}
                    megjegyzes={`${w.fizetesreVar} fizetésre vár`} />
                <Csempe cimke="Fogyó készlet" ertek={formatSzam(w.alacsonyKeszlet)} link={link('alkatreszek')}
                    megjegyzes={`${w.elfogyott} elfogyott · ${w.termekek} aktív termék`} />
            </div>
            {w.top.length > 0 && (
                <div className="db-kartya uveg top-lista">
                    <h3>Legkelendőbb termékek</h3>
                    <div className="db-tabla-gorgeto">
                        <table>
                            <thead><tr><th scope="col">Termék</th><th scope="col">Eladva</th>{penzugy && <th scope="col">Bevétel</th>}</tr></thead>
                            <tbody>
                                {w.top.map((t) => (
                                    <tr key={t.id}>
                                        <th scope="row">{t.nev} <small>{t.cikkszam}</small></th>
                                        <td>{formatSzam(t.db)} db</td>
                                        {penzugy && <td title={ft(t.bevetel)}>{ftKompakt(t.bevetel)}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
};

const Dashboard = ({ adat, idoszakSzoveg, elozoSzoveg, jog }) => {
    const { bevetel, keszlet, erdeklodesek, felhasznalok, forgalom } = adat;
    // A backend pénzügyi jog nélkül nem küld bevételi adatot (bevetel === null).
    const penzugy = bevetel !== null;

    const haviSor = (adat.havi || []).map((honap) => {
        const datum = helyiDatum(honap.kulcs);
        return {
            kulcs: honap.kulcs,
            ertek: honap.bevetel,
            db: honap.db,
            tengely: honapRovid.format(datum),
            honap: honapHosszu.format(datum),
            tipp: { ertek: ft(honap.bevetel), reszlet: `${formatSzam(honap.db)} eladott autó`, datum: honapHosszu.format(datum) },
        };
    });
    const haviOsszes = haviSor.reduce((osszeg, honap) => osszeg + honap.ertek, 0);

    const napiSor = erdeklodesek.napi.map((nap) => {
        const datum = helyiDatum(nap.kulcs);
        return {
            kulcs: nap.kulcs,
            ertek: nap.db,
            tengely: napFormatum.format(datum),
            datum,
            tipp: { ertek: `${nap.db} érdeklődés`, datum: napFormatum.format(datum) },
        };
    });
    const napiOsszes = napiSor.reduce((osszeg, nap) => osszeg + nap.ertek, 0);

    const napiDiagram = (
        <OszlopDiagram
            cim="Érdeklődések naponta"
            alcim={`Utolsó 30 nap · összesen ${formatSzam(napiOsszes)}`}
            sor={napiSor}
            tengelyIndexek={[1, 8, 15, 22, 29]}
            szukIndexek={[1, 15, 29]}
            uresSzoveg="Az utolsó 30 napban nem érkezett érdeklődés."
            ariaCimke={`Napi érdeklődések az utolsó 30 napban, összesen ${napiOsszes}. A pontos értékek a Táblázat nézetben.`}
            tablaFejlec={['Nap', 'Érdeklődés']}
            tablaSor={(nap) => [napFormatum.format(nap.datum), nap.ertek]}
        />
    );

    return (
        <>
            {!penzugy && (
                <div className="db-fo-sor">
                    <EladasKartya eladasok={adat.eladasok} idoszakSzoveg={idoszakSzoveg} elozoSzoveg={elozoSzoveg} />
                    {napiDiagram}
                </div>
            )}
            {penzugy && <div className="db-fo-sor">
                <BevetelKartya bevetel={bevetel} idoszakSzoveg={idoszakSzoveg} elozoSzoveg={elozoSzoveg} />
                <OszlopDiagram
                    className="db-bevetel-diagram"
                    cim="Havi bevétel"
                    alcim={`Utolsó 12 hónap · összesen ${ft(haviOsszes)}`}
                    sor={haviSor}
                    egesz={false}
                    tengelyFormat={(ertek) => kompakt.format(ertek)}
                    szukIndexek={haviSor.map((_, i) => i).filter((i) => (haviSor.length - 1 - i) % 2 === 0)}
                    uresSzoveg="Az utolsó 12 hónapban nem volt rögzített eladás."
                    ariaCimke={`Havi bevétel az utolsó 12 hónapban, összesen ${ft(haviOsszes)}. A pontos értékek a Táblázat nézetben.`}
                    tablaFejlec={['Hónap', 'Bevétel', 'Eladott autó']}
                    tablaSor={(honap) => [honap.honap, ft(honap.ertek), formatSzam(honap.db)]}
                />
            </div>}

            <div className="kpi-sor">
                <Csempe cimke="Készleten" ertek={formatSzam(keszlet.db)} link="/admin?lap=hirdetesek"
                    megjegyzes={`${keszlet.statuszok.foglalt} foglalva · ${keszlet.kiemelt} kiemelt`} />
                <Csempe cimke="Készletérték" ertek={ftKompakt(keszlet.ertek)} title={ft(keszlet.ertek)} megjegyzes="a nem eladott autók vételára" />
                <Csempe cimke="Átlagos vételár" ertek={keszlet.atlagAr !== null ? ftKompakt(keszlet.atlagAr) : '–'}
                    title={keszlet.atlagAr !== null ? ft(keszlet.atlagAr) : undefined} megjegyzes="készleten lévő autók" />
                <Csempe cimke="Átlagos állásidő" ertek={keszlet.atlagNap !== null ? `${formatSzam(keszlet.atlagNap)} nap` : '–'}
                    megjegyzes={`${keszlet.regi} autó ${keszlet.regiHatarNap} napnál régebben`} />
                <Csempe cimke="Érdeklődés" ertek={formatSzam(erdeklodesek.idoszak)} link="/admin?lap=erdeklodesek"
                    megjegyzes={`${erdeklodesek.uj} új, megválaszolatlan`} />
                <Csempe cimke="Regisztrált vásárló" ertek={formatSzam(felhasznalok.felhasznalo)} link={jog('felhasznaloKezeles') ? '/admin?lap=felhasznalok' : undefined}
                    megjegyzes={`${felhasznalok.ujak} új · ${idoszakSzoveg}`} />
            </div>

            {(keszlet.rejtett > 0 || keszlet.lejart > 0) && (
                <p className="uzenet admin-figyelmeztetes">
                    {keszlet.rejtett > 0 && `${keszlet.rejtett} rejtett hirdetés. `}
                    {keszlet.lejart > 0 && `${keszlet.lejart} lejárt hirdetés nem jelenik meg a kínálatban. `}
                    <Link to="/admin?lap=hirdetesek">Kezelés →</Link>
                </p>
            )}

            {adat.webshop && <WebshopBlokk webshop={adat.webshop} idoszakSzoveg={idoszakSzoveg} elozoSzoveg={elozoSzoveg} jog={jog} />}

            <div className="db-racs db-racs-2">
                <section className="db-kartya uveg" aria-labelledby="db-allapot-cim">
                    <div className="diagram-fej">
                        <div>
                            <h3 id="db-allapot-cim">Hirdetések állapota</h3>
                            <span>Az összes hirdetés státusz szerint</span>
                        </div>
                    </div>
                    <SzegmensSav
                        cimke="Hirdetések állapota"
                        reszek={[
                            { kulcs: 'elerheto', nev: 'Elérhető', db: keszlet.statuszok.elerheto },
                            { kulcs: 'foglalt', nev: 'Foglalva', db: keszlet.statuszok.foglalt },
                            { kulcs: 'elkelt', nev: 'Elkelt', db: keszlet.statuszok.elkelt },
                        ]}
                    />
                </section>
                <section className="db-kartya uveg" aria-labelledby="db-forgalom-cim">
                    <div className="diagram-fej">
                        <div>
                            <h3 id="db-forgalom-cim">Látogatottság</h3>
                            <span>Összesítve, az összes hirdetésen</span>
                        </div>
                    </div>
                    <dl className="db-mini-statok">
                        <div><dt><Ikon nev="szem" meret={15} /> Adatlap-megtekintés</dt><dd>{formatSzam(forgalom.megtekintesek)}</dd></div>
                        <div><dt><Ikon nev="telefon" meret={15} /> Telefonszám-kattintás</dt><dd>{formatSzam(forgalom.telefonKattintasok)}</dd></div>
                        <div>
                            <dt><Ikon nev="level" meret={15} /> Érdeklődés állapota</dt>
                            <dd className="db-mini-reszlet">{erdeklodesek.uj} új · {erdeklodesek.folyamatban} folyamatban · {erdeklodesek.lezart} lezárt</dd>
                        </div>
                    </dl>
                </section>
            </div>

            <div className="db-racs db-racs-3">
                <SavLista cim="Üzemanyag" alcim="Készleten lévő autók" elemek={keszlet.uzemanyag} />
                <SavLista cim="Kivitel" alcim="Készleten lévő autók" elemek={keszlet.kivitel} />
                <SavLista cim="Árkategória" alcim="Készleten lévő autók vételára" elemek={keszlet.arSavok} />
            </div>

            <div className="db-racs db-racs-tablak">
                <section className="db-kartya uveg top-lista" aria-labelledby="db-markak-cim">
                    <h3 id="db-markak-cim">Márkák</h3>
                    <p className="db-tabla-megjegyzes">Készlet most · {penzugy ? 'eladás és bevétel' : 'eladás'}: {idoszakSzoveg}</p>
                    {adat.markak.length === 0 ? <p className="db-ures">Még nincs adat.</p> : (
                        <div className="db-tabla-gorgeto">
                            <table>
                                <thead>
                                    <tr><th scope="col">Márka</th><th scope="col">Készleten</th><th scope="col">Készletérték</th><th scope="col">Eladva</th>{penzugy && <th scope="col">Bevétel</th>}</tr>
                                </thead>
                                <tbody>
                                    {adat.markak.map((marka) => (
                                        <tr key={marka.marka}>
                                            <th scope="row">{marka.marka}</th>
                                            <td>{formatSzam(marka.keszletDb)}</td>
                                            <td title={ft(marka.keszletErtek)}>{ftKompakt(marka.keszletErtek)}</td>
                                            <td>{formatSzam(marka.eladottDb)}</td>
                                            {penzugy && <td title={ft(marka.bevetel)}>{marka.bevetel ? ftKompakt(marka.bevetel) : '–'}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="db-kartya uveg top-lista" aria-labelledby="db-telephelyek-cim">
                    <h3 id="db-telephelyek-cim">Telephelyek</h3>
                    <p className="db-tabla-megjegyzes">Készlet most · {penzugy ? 'eladás és bevétel' : 'eladás'}: {idoszakSzoveg}</p>
                    {adat.telephelyek.length === 0 ? <p className="db-ures">Még nincs telephely.{jog('telephelyKezeles') && <> <Link to="/admin?lap=telephelyek">Hozzáadás →</Link></>}</p> : (
                        <div className="db-tabla-gorgeto">
                            <table>
                                <thead>
                                    <tr><th scope="col">Telephely</th><th scope="col">Készleten</th><th scope="col">Eladva</th>{penzugy && <th scope="col">Bevétel</th>}</tr>
                                </thead>
                                <tbody>
                                    {adat.telephelyek.map((telephely) => (
                                        <tr key={telephely.id}>
                                            <th scope="row">{telephely.nev}{telephely.varos && <small> {telephely.varos}</small>}</th>
                                            <td title={ft(telephely.keszletErtek)}>{formatSzam(telephely.keszletDb)}</td>
                                            <td>{formatSzam(telephely.eladottDb)}</td>
                                            {penzugy && <td title={ft(telephely.bevetel)}>{telephely.bevetel ? ftKompakt(telephely.bevetel) : '–'}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {penzugy && napiDiagram}

            <div className="db-racs db-racs-tablak">
                <section className="db-kartya uveg top-lista" aria-labelledby="db-eladott-cim">
                    <h3 id="db-eladott-cim">Legutóbb eladott</h3>
                    {adat.legutobbEladott.length === 0 ? <p className="db-ures">Még nincs eladott autó.</p> : (
                        <div className="db-tabla-gorgeto">
                            <table>
                                <thead><tr><th scope="col">Autó</th><th scope="col">Eladva</th>{penzugy && <th scope="col">Eladási ár</th>}</tr></thead>
                                <tbody>
                                    {adat.legutobbEladott.map((auto) => (
                                        <tr key={auto._id}>
                                            <td><AutoCella auto={auto} /></td>
                                            <td>{formatDatum(auto.eladas_datum) || '–'}</td>
                                            {penzugy && (
                                                <td>
                                                    {ft(auto.eladasi_ar)}
                                                    {auto.vetel_ar > 0 && auto.eladasi_ar < auto.vetel_ar && (
                                                        <small className="db-engedmeny">−{szazalek.format((auto.vetel_ar - auto.eladasi_ar) / auto.vetel_ar)}</small>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="db-kartya uveg top-lista" aria-labelledby="db-top-cim">
                    <h3 id="db-top-cim">Legnézettebb hirdetések</h3>
                    {adat.top.length === 0 ? <p className="db-ures">Még nincs adat.</p> : (
                        <div className="db-tabla-gorgeto">
                            <table>
                                <thead><tr><th scope="col">Autó</th><th scope="col">Megtekintés</th><th scope="col">Telefon</th></tr></thead>
                                <tbody>
                                    {adat.top.map((auto) => (
                                        <tr key={auto._id}>
                                            <td><AutoCella auto={auto} /></td>
                                            <td>{formatSzam(auto.megtekintesek || 0)}</td>
                                            <td>{formatSzam(auto.telefonKattintasok || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
};

const AdminDashboard = () => {
    const { jog } = useAuth();
    const [idoszak, setIdoszak] = useState(() => {
        const mentett = olvas(TAROLO_KULCS, '30');
        return IDOSZAKOK.some(([kulcs]) => kulcs === mentett) ? mentett : '30';
    });
    const [frissites, setFrissites] = useState(0);
    const [eredmeny, setEredmeny] = useState({ kulcs: null, adat: null, hiba: '' });
    const kulcs = `${idoszak}:${frissites}`;

    useEffect(() => {
        const vezerlo = new AbortController();
        apiKeres(`/admin/dashboard?idoszak=${idoszak}`, { signal: vezerlo.signal }, 'A dashboard betöltése nem sikerült.')
            .then((adat) => setEredmeny({ kulcs, adat, hiba: '' }))
            .catch((error) => {
                if (error.name !== 'AbortError') setEredmeny((elozo) => ({ ...elozo, kulcs, hiba: error.message }));
            });
        return () => vezerlo.abort();
    }, [idoszak, kulcs]);

    const valaszt = (uj) => {
        setIdoszak(uj);
        ir(TAROLO_KULCS, uj);
    };

    const [, , idoszakSzoveg, elozoSzoveg] = IDOSZAKOK.find(([k]) => k === idoszak);
    const betolt = eredmeny.kulcs !== kulcs;
    const { adat, hiba } = eredmeny;

    return (
        <div className="dashboard" aria-busy={betolt}>
            <div className="db-eszkoztar">
                <div className="db-idoszak" role="group" aria-label="Időszak">
                    {IDOSZAKOK.map(([ertek, felirat]) => (
                        <button key={ertek} type="button" className={`csip ${idoszak === ertek ? 'aktiv' : ''}`} aria-pressed={idoszak === ertek} onClick={() => valaszt(ertek)}>
                            {felirat}
                        </button>
                    ))}
                </div>
                <div className="db-frissites">
                    {adat && <span>Frissítve {idoFormatum.format(new Date(adat.generalva))}</span>}
                    <button className="szoveg-gomb" type="button" onClick={() => setFrissites((n) => n + 1)} disabled={betolt}>
                        {betolt && adat ? 'Frissítés…' : 'Frissítés'}
                    </button>
                </div>
            </div>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            {!adat ? (
                !hiba && <div className="betoltes"><span className="porgo" aria-hidden="true" />Dashboard betöltése…</div>
            ) : (
                <div className={`db-tartalom ${betolt ? 'db-tolt' : ''}`}>
                    <Dashboard adat={adat} idoszakSzoveg={idoszakSzoveg} elozoSzoveg={elozoSzoveg} jog={jog} />
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
