import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import Ikon from '../components/Ikon';
import SzuroPanel from '../components/SzuroPanel';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import { formatSzam } from '../lib/auto';
import { CIMKE_PARAMETEREK, RENDEZESEK, aktivSzurokSzama, szuroCimkek, szurokParamsbol } from '../lib/szurok';
import { useSeo } from '../lib/useSeo';
import './Autok.css';

const OLDAL_MERET = 12;

const KeresesMentese = ({ szurok }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [nyitva, setNyitva] = useState(false);
    const [nev, setNev] = useState('');
    const [ertesites, setErtesites] = useState(true);
    const [allapot, setAllapot] = useState(null);

    if (!user) {
        return (
            <Link className="gomb gomb-uveg gomb-kicsi" to="/login" state={{ from: location.pathname + location.search, uzenet: 'A keresés mentéséhez jelentkezz be.' }}>
                <Ikon nev="harang" meret={15} /> Keresés mentése
            </Link>
        );
    }

    const mentes = async (event) => {
        event.preventDefault();
        setAllapot({ tipus: 'folyamat' });
        try {
            await apiKeres('/fiok/keresesek', { method: 'POST', body: { nev, parameterek: szurok, ertesites } }, 'A keresés mentése nem sikerült.');
            setAllapot({ tipus: 'siker' });
            setNyitva(false);
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        }
    };

    if (allapot?.tipus === 'siker') {
        return <span className="mentes-siker"><Ikon nev="pipa" meret={15} /> Elmentve – <Link to="/fiok?lap=keresesek">Mentett keresések</Link></span>;
    }
    if (!nyitva) {
        return (
            <button
                className="gomb gomb-uveg gomb-kicsi"
                type="button"
                onClick={() => {
                    setNev(szuroCimkek(szurok).map(([, cimke]) => cimke).join(', ').slice(0, 80) || 'Mentett keresés');
                    setNyitva(true);
                }}
            >
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
            {allapot?.tipus === 'hiba' && <p className="uzenet uzenet-hiba">{allapot.szoveg}</p>}
            <div className="mentes-gombok">
                <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={() => setNyitva(false)}>Mégse</button>
                <button className="gomb gomb-fo gomb-kicsi" type="submit" disabled={allapot?.tipus === 'folyamat'}>Mentés</button>
            </div>
        </form>
    );
};

const Autok = () => {
    const [params, setParams] = useSearchParams();
    const szurok = useMemo(() => szurokParamsbol(params), [params]);
    const rendezes = params.get('rendezes') || 'ujElol';
    const aktivSzam = aktivSzurokSzama(szurok);

    const [kereses, setKereses] = useState(szurok.q || '');
    const [elozoQ, setElozoQ] = useState(szurok.q || '');
    const [panelNyitva, setPanelNyitva] = useState(false);

    // Böngésző vissza gomb / külső link: a keresőmező kövesse az URL-t.
    if ((szurok.q || '') !== elozoQ) {
        setElozoQ(szurok.q || '');
        if (kereses.trim() !== (szurok.q || '')) setKereses(szurok.q || '');
    }
    const [szuroAdatok, setSzuroAdatok] = useState(null);
    const [frissites, setFrissites] = useState(0);
    const [eredmeny, setEredmeny] = useState({ kulcs: null, autok: [], lapozas: { oldal: 1, osszes: 0 }, hiba: '' });
    const [tobbBetoltes, setTobbBetoltes] = useState(false);

    useSeo({
        cim: szurok.marka ? `Eladó ${szurok.marka}${szurok.modell ? ` ${szurok.modell}` : ''} autók` : 'Használt autó kínálat',
        leiras: 'Böngészd a Veltrix teljes használtautó-kínálatát: szűrés márka, ár, évjárat, futás, üzemanyag, váltó és telephely szerint.',
        utvonal: szurok.marka ? `/autok?marka=${encodeURIComponent(szurok.marka)}` : '/autok',
    });

    // Az API-kérés paraméterei az URL-ből (a szűrők + rendezés).
    const keresKulcs = useMemo(() => {
        const p = new URLSearchParams(szurok);
        p.set('rendezes', rendezes);
        return p.toString();
    }, [szurok, rendezes]);
    const kulcs = `${keresKulcs}#${frissites}`;
    const betoltes = eredmeny.kulcs !== kulcs;

    const parameterek = (modositas) => {
        const uj = new URLSearchParams(params);
        for (const [k, v] of Object.entries(modositas)) {
            if (v === null || v === undefined || v === '') uj.delete(k);
            else uj.set(k, v);
        }
        setParams(uj, { replace: true });
    };

    // Kereső: gépelés közben késleltetve frissíti az URL-t.
    useEffect(() => {
        const ertek = kereses.trim();
        if (ertek === (szurok.q || '')) return undefined;
        const idozito = setTimeout(() => parameterek({ q: ertek || null }), 350);
        return () => clearTimeout(idozito);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kereses]);

    useEffect(() => {
        apiKeres('/autok/szurok').then(setSzuroAdatok).catch(() => setSzuroAdatok(null));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const aktKulcs = `${keresKulcs}#${frissites}`;
        apiKeres(`/autok?${keresKulcs}&limit=${OLDAL_MERET}`, { signal: controller.signal }, 'Az autók betöltése nem sikerült.')
            .then((data) => setEredmeny({ kulcs: aktKulcs, autok: data.autok || [], lapozas: data.lapozas, hiba: '' }))
            .catch((error) => {
                if (error.name === 'AbortError') return;
                setEredmeny({ kulcs: aktKulcs, autok: [], lapozas: { oldal: 1, osszes: 0 }, hiba: error.message || 'Nem sikerült kapcsolódni a szerverhez.' });
            });
        return () => controller.abort();
    }, [keresKulcs, frissites]);

    // Mobilon a teljes képernyős szűrőpanel alatt ne görgessen az oldal.
    useEffect(() => {
        if (!panelNyitva) return undefined;
        const elozo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = elozo; };
    }, [panelNyitva]);

    const tovabbiak = async () => {
        setTobbBetoltes(true);
        try {
            const data = await apiKeres(`/autok?${keresKulcs}&limit=${OLDAL_MERET}&oldal=${eredmeny.lapozas.oldal + 1}`);
            setEredmeny((elozo) => {
                const meglevo = new Set(elozo.autok.map((auto) => auto._id));
                return { ...elozo, autok: [...elozo.autok, ...data.autok.filter((auto) => !meglevo.has(auto._id))], lapozas: data.lapozas };
            });
        } catch (error) {
            setEredmeny((elozo) => ({ ...elozo, hiba: error.message }));
        } finally {
            setTobbBetoltes(false);
        }
    };

    const osszesTorlese = () => {
        setKereses('');
        setParams(rendezes !== 'ujElol' ? { rendezes } : {}, { replace: true });
    };

    const { autok, lapozas, hiba } = eredmeny;
    const cimkek = szuroCimkek(szurok);
    const vanTobb = !betoltes && autok.length < lapozas.osszes;

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
                                <select className="bemenet" id="auto-rendezes" value={rendezes}
                                    onChange={(event) => parameterek({ rendezes: event.target.value === 'ujElol' ? null : event.target.value })}>
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
                                    onClick={() => {
                                        if (kulcs === 'q') setKereses('');
                                        parameterek(Object.fromEntries(CIMKE_PARAMETEREK[kulcs].map((p) => [p, null])));
                                    }}
                                    aria-label={`Szűrő törlése: ${cimke}`}
                                >
                                    {cimke} <Ikon nev="x" meret={13} />
                                </button>
                            ))}
                            <KeresesMentese key={keresKulcs} szurok={szurok} />
                        </div>
                    )}

                    {hiba && !betoltes ? (
                        <div className="allapot-doboz uveg" role="alert">
                            <span className="allapot-ikon" aria-hidden="true">!</span>
                            <h3>Most nem érjük el a kínálatot</h3>
                            <p>{hiba}</p>
                            <button className="gomb gomb-uveg" type="button" onClick={() => setFrissites((n) => n + 1)}>Újrapróbálom</button>
                        </div>
                    ) : betoltes ? (
                        <div className="autok-racs" aria-hidden="true">
                            {[0, 1, 2, 3, 4, 5].map((elem) => <AutoKartyaVaz key={elem} />)}
                        </div>
                    ) : autok.length > 0 ? (
                        <>
                            <div className="autok-racs">
                                {autok.map((auto, i) => <AutoKartya key={auto._id} auto={auto} kesleltetes={i % OLDAL_MERET} />)}
                            </div>
                            {vanTobb && (
                                <div className="autok-tobb">
                                    <button className="gomb gomb-uveg" type="button" onClick={tovabbiak} disabled={tobbBetoltes}>
                                        {tobbBetoltes ? 'Betöltés…' : `Továbbiak betöltése (${formatSzam(lapozas.osszes - autok.length)})`}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="allapot-doboz uveg">
                            <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kereses" meret={22} /></span>
                            <h3>{cimkek.length ? 'Nincs a szűrőknek megfelelő autó' : 'Hamarosan érkeznek az autók'}</h3>
                            <p>
                                {cimkek.length
                                    ? 'Lazíts a feltételeken, vagy mentsd el a keresést – e-mailben szólunk, ha érkezik megfelelő autó.'
                                    : 'Jelenleg még nincs feltöltött autó a kínálatban.'}
                            </p>
                            {cimkek.length > 0 && <button className="gomb gomb-uveg" type="button" onClick={osszesTorlese}>Szűrők törlése</button>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
};

export default Autok;
