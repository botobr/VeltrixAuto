import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import Ikon from '../components/Ikon';
import SzuroPanel from '../components/SzuroPanel';
import { useFelhasznalo } from '../context/felhasznalo';
import { apiKeres } from '../lib/api';
import { formatSzam } from '../lib/auto';
import { CIMKE_PARAMETEREK, RENDEZESEK, aktivSzurokSzama, szuroCimkek, szurokParamsbol } from '../lib/szurok';
import { useSeo } from '../lib/useSeo';
import './Autok.css';

const OLDAL_MERET = 12;

// "Keresés mentése" gomb és űrlap (bejelentkezés kell hozzá)
const KeresesMentese = ({ szurok }) => {
    const { felhasznalo } = useFelhasznalo();
    const location = useLocation();
    const [nyitva, setNyitva] = useState(false);
    const [nev, setNev] = useState('');
    const [ertesites, setErtesites] = useState(true);
    const [allapot, setAllapot] = useState(null);

    if (!felhasznalo) {
        return (
            <Link className="gomb gomb-uveg gomb-kicsi" to="/belepes" state={{ from: location.pathname + location.search, uzenet: 'A keresés mentéséhez jelentkezz be.' }}>
                <Ikon nev="harang" meret={15} /> Keresés mentése
            </Link>
        );
    }

    const mentes = async (event) => {
        event.preventDefault();
        setAllapot({ tipus: 'folyamat' });
        try {
            const torzs = { nev: nev, parameterek: szurok, ertesites: ertesites };
            await apiKeres('/fiok/keresesek', { method: 'POST', body: torzs }, 'A keresés mentése nem sikerült.');
            setAllapot({ tipus: 'siker' });
            setNyitva(false);
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        }
    };

    const allapotTipus = allapot ? allapot.tipus : null;

    // megnyitáskor a szűrőkből javaslunk nevet
    const megnyitas = () => {
        const feliratok = szuroCimkek(szurok).map((cimke) => cimke[1]);
        const javaslat = feliratok.join(', ').slice(0, 80);
        setNev(javaslat || 'Mentett keresés');
        setNyitva(true);
    };

    if (allapotTipus === 'siker') {
        return <span className="mentes-siker"><Ikon nev="pipa" meret={15} /> Elmentve – <Link to="/fiok?lap=keresesek">Mentett keresések</Link></span>;
    }
    if (!nyitva) {
        return (
            <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={megnyitas}>
                <Ikon nev="harang" meret={15} /> Keresés mentése
            </button>
        );
    }
    return (
        <form className="mentes-urlap uveg" onSubmit={mentes}>
            <label className="mezo">
                <span>Keresés neve</span>
                <input className="bemenet" value={nev} maxLength={80} required autoFocus onChange={(event) => setNev(event.target.value)} />
            </label>
            <label className="jelolo">
                <input type="checkbox" checked={ertesites} onChange={(event) => setErtesites(event.target.checked)} />
                <span>E-mail értesítés új, megfelelő autóról</span>
            </label>
            {allapotTipus === 'hiba' && <p className="uzenet uzenet-hiba">{allapot.szoveg}</p>}
            <div className="mentes-gombok">
                <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={() => setNyitva(false)}>Mégse</button>
                <button className="gomb gomb-fo gomb-kicsi" type="submit" disabled={allapotTipus === 'folyamat'}>Mentés</button>
            </div>
        </form>
    );
};

// az autók listája szűrőkkel
const Autok = () => {
    const [params, setParams] = useSearchParams();
    const szurok = useMemo(() => szurokParamsbol(params), [params]);
    const rendezes = params.get('rendezes') || 'ujElol';
    const aktivSzam = aktivSzurokSzama(szurok);

    const [kereses, setKereses] = useState(szurok.q || '');
    const [elozoQ, setElozoQ] = useState(szurok.q || '');
    const [panelNyitva, setPanelNyitva] = useState(false);

    // ha az URL változik (pl. vissza gomb), a keresőmezőbe is az kerüljön
    const urlKereses = szurok.q || '';
    if (urlKereses !== elozoQ) {
        setElozoQ(urlKereses);
        if (kereses.trim() !== urlKereses) {
            setKereses(urlKereses);
        }
    }
    const [szuroAdatok, setSzuroAdatok] = useState(null);
    const [frissites, setFrissites] = useState(0);
    const [eredmeny, setEredmeny] = useState({ kulcs: null, autok: [], lapozas: { oldal: 1, osszes: 0 }, hiba: '' });
    const [tobbBetoltes, setTobbBetoltes] = useState(false);

    let oldalCim = 'Használt autó kínálat';
    let oldalUtvonal = '/autok';
    if (szurok.marka) {
        oldalCim = 'Eladó ' + szurok.marka + (szurok.modell ? ' ' + szurok.modell : '') + ' autók';
        oldalUtvonal = '/autok?marka=' + encodeURIComponent(szurok.marka);
    }
    useSeo({
        cim: oldalCim,
        leiras: 'Böngészd a Veltrix teljes használtautó-kínálatát: szűrés márka, ár, évjárat, futás, üzemanyag, váltó és telephely szerint.',
        utvonal: oldalUtvonal,
    });

    // a kérés paraméterei (szűrők + rendezés) szövegként
    const keresKulcs = useMemo(() => {
        const parameterek = new URLSearchParams(szurok);
        parameterek.set('rendezes', rendezes);
        return parameterek.toString();
    }, [szurok, rendezes]);
    // ha ez nem egyezik a betöltött eredmény kulcsával, akkor még töltünk
    const kulcs = keresKulcs + '#' + frissites;
    const betoltes = eredmeny.kulcs !== kulcs;

    // az URL paraméterek módosítása (null értéknél törli)
    const parameterek = (modositas) => {
        const uj = new URLSearchParams(params);
        for (const nev in modositas) {
            const ertek = modositas[nev];
            if (ertek === null || ertek === undefined || ertek === '') {
                uj.delete(nev);
            } else {
                uj.set(nev, ertek);
            }
        }
        setParams(uj, { replace: true });
    };

    // a keresőmező: gépelés után kicsit várunk, és csak utána írjuk az URL-be
    useEffect(() => {
        const ertek = kereses.trim();
        if (ertek === (szurok.q || '')) {
            return undefined;
        }
        const idozito = setTimeout(() => {
            parameterek({ q: ertek || null });
        }, 350);
        return () => clearTimeout(idozito);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kereses]);

    // a szűrő panel adatai (márkák, megyék...)
    useEffect(() => {
        apiKeres('/autok/szurok')
            .then((data) => setSzuroAdatok(data))
            .catch(() => setSzuroAdatok(null));
    }, []);

    // az autók betöltése, ha változik a szűrés
    useEffect(() => {
        const controller = new AbortController();
        const aktualisKulcs = keresKulcs + '#' + frissites;
        const url = '/autok?' + keresKulcs + '&limit=' + OLDAL_MERET;

        apiKeres(url, { signal: controller.signal }, 'Az autók betöltése nem sikerült.')
            .then((data) => {
                setEredmeny({ kulcs: aktualisKulcs, autok: data.autok || [], lapozas: data.lapozas, hiba: '' });
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    return;
                }
                const uzenet = error.message || 'Nem sikerült kapcsolódni a szerverhez.';
                setEredmeny({ kulcs: aktualisKulcs, autok: [], lapozas: { oldal: 1, osszes: 0 }, hiba: uzenet });
            });

        return () => controller.abort();
    }, [keresKulcs, frissites]);

    // telefonon a teljes képernyős szűrő panel alatt ne görgessen az oldal
    useEffect(() => {
        if (!panelNyitva) {
            return undefined;
        }
        const elozo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = elozo;
        };
    }, [panelNyitva]);

    // a következő oldal hozzáadása a listához
    const tovabbiak = async () => {
        setTobbBetoltes(true);
        try {
            const url = '/autok?' + keresKulcs + '&limit=' + OLDAL_MERET + '&oldal=' + (eredmeny.lapozas.oldal + 1);
            const data = await apiKeres(url);
            setEredmeny((elozo) => {
                // ha közben új autó jött, ne legyen kétszer a listában
                const meglevoIdk = elozo.autok.map((auto) => auto._id);
                const ujAutok = data.autok.filter((auto) => !meglevoIdk.includes(auto._id));
                return { ...elozo, autok: [...elozo.autok, ...ujAutok], lapozas: data.lapozas };
            });
        } catch (error) {
            setEredmeny((elozo) => ({ ...elozo, hiba: error.message }));
        } finally {
            setTobbBetoltes(false);
        }
    };

    // minden szűrő törlése (a rendezés marad)
    const osszesTorlese = () => {
        setKereses('');
        if (rendezes !== 'ujElol') {
            setParams({ rendezes: rendezes }, { replace: true });
        } else {
            setParams({}, { replace: true });
        }
    };

    // egy szűrő címke törlése
    const cimkeTorlese = (kulcs) => {
        if (kulcs === 'q') {
            setKereses('');
        }
        const torlendo = {};
        for (const parameter of CIMKE_PARAMETEREK[kulcs]) {
            torlendo[parameter] = null;
        }
        parameterek(torlendo);
    };

    const rendezesValtozas = (event) => {
        if (event.target.value === 'ujElol') {
            parameterek({ rendezes: null });
        } else {
            parameterek({ rendezes: event.target.value });
        }
    };

    const autok = eredmeny.autok;
    const lapozas = eredmeny.lapozas;
    const hiba = eredmeny.hiba;
    const cimkek = szuroCimkek(szurok);
    const vanTobb = !betoltes && autok.length < lapozas.osszes;

    // a találatok része: hiba / betöltés / autók / nincs találat
    let talalatok;
    if (hiba && !betoltes) {
        talalatok = (
            <div className="allapot-doboz uveg" role="alert">
                <span className="allapot-ikon" aria-hidden="true">!</span>
                <h3>Most nem érjük el a kínálatot</h3>
                <p>{hiba}</p>
                <button className="gomb gomb-uveg" type="button" onClick={() => setFrissites((szam) => szam + 1)}>Újrapróbálom</button>
            </div>
        );
    } else if (betoltes) {
        talalatok = (
            <div className="autok-racs" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((elem) => <AutoKartyaVaz key={elem} />)}
            </div>
        );
    } else if (autok.length > 0) {
        talalatok = (
            <>
                <div className="autok-racs">
                    {autok.map((auto, i) => <AutoKartya key={auto._id} auto={auto} kesleltetes={i % OLDAL_MERET} />)}
                </div>
                {vanTobb && (
                    <div className="autok-tobb">
                        <button className="gomb gomb-uveg" type="button" onClick={tovabbiak} disabled={tobbBetoltes}>
                            {tobbBetoltes ? 'Betöltés…' : 'Továbbiak betöltése (' + formatSzam(lapozas.osszes - autok.length) + ')'}
                        </button>
                    </div>
                )}
            </>
        );
    } else if (cimkek.length > 0) {
        talalatok = (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kereses" meret={22} /></span>
                <h3>Nincs a szűrőknek megfelelő autó</h3>
                <p>Lazíts a feltételeken, vagy mentsd el a keresést – e-mailben szólunk, ha érkezik megfelelő autó.</p>
                <button className="gomb gomb-uveg" type="button" onClick={osszesTorlese}>Szűrők törlése</button>
            </div>
        );
    } else {
        talalatok = (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kereses" meret={22} /></span>
                <h3>Hamarosan érkeznek az autók</h3>
                <p>Jelenleg még nincs feltöltött autó a kínálatban.</p>
            </div>
        );
    }

    return (
        <main className="oldal autok">
            <section className="autok-bemutato beuszas">
                <div>
                    <p className="felirat">Veltrix garázs</p>
                    <h1>Válogatott <span className="gradiens-szoveg">kínálat.</span></h1>
                </div>
                <label className="autok-kereso uveg" htmlFor="auto-kereses">
                    <Ikon nev="kereses" meret={20} />
                    <span className="sr-only">Keresés</span>
                    <input
                        id="auto-kereses"
                        type="search"
                        placeholder="Márka, modell, felszereltség…"
                        value={kereses}
                        onChange={(event) => setKereses(event.target.value)}
                    />
                </label>
            </section>

            <div className="autok-elrendezes">
                <SzuroPanel
                    szurok={szurok}
                    adatok={szuroAdatok}
                    aktivSzam={aktivSzam}
                    onValtozas={parameterek}
                    onTorles={osszesTorlese}
                    nyitva={panelNyitva}
                    onBezaras={() => setPanelNyitva(false)}
                />

                <section aria-labelledby="autok-cim" className="autok-talalatok">
                    <h2 id="autok-cim" className="sr-only">Találatok</h2>
                    <div className="autok-eszkoztar">
                        <p className="autok-talalat" aria-live="polite">
                            {betoltes ? 'Autók betöltése…' : <><strong>{formatSzam(lapozas.osszes)}</strong> találat</>}
                        </p>
                        <div className="autok-eszkoztar-jobb">
                            <button className="gomb gomb-uveg gomb-kicsi autok-szuro-gomb" type="button" onClick={() => setPanelNyitva(true)}>
                                <Ikon nev="szuro" meret={15} /> Szűrők {aktivSzam > 0 && <span className="szuro-szam">{aktivSzam}</span>}
                            </button>
                            <label className="autok-rendezes" htmlFor="auto-rendezes">
                                <span className="sr-only">Rendezés</span>
                                <select className="bemenet" id="auto-rendezes" value={rendezes} onChange={rendezesValtozas}>
                                    {RENDEZESEK.map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                                </select>
                            </label>
                        </div>
                    </div>

                    {cimkek.length > 0 && (
                        <div className="aktiv-szurok">
                            {cimkek.map(([kulcs, cimke]) => (
                                <button
                                    key={kulcs}
                                    type="button"
                                    className="aktiv-szuro"
                                    onClick={() => cimkeTorlese(kulcs)}
                                    aria-label={'Szűrő törlése: ' + cimke}
                                >
                                    {cimke} <Ikon nev="x" meret={13} />
                                </button>
                            ))}
                            <KeresesMentese key={keresKulcs} szurok={szurok} />
                        </div>
                    )}

                    {talalatok}
                </section>
            </div>
        </main>
    );
};

export default Autok;
