import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import AutoMezok from '../components/AutoMezok';
import KepValaszto from '../components/KepValaszto';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import { autoAdatokbol, egyediMezokAdatokbol, formatSzam, kuldhetoAdatok } from '../lib/auto';
import './Autok.css';

const OLDAL_MERET = 12;

const rendezesek = [
    ['ujElol', 'Legújabb hirdetés'],
    ['arNovekvo', 'Ár szerint növekvő'],
    ['arCsokkeno', 'Ár szerint csökkenő'],
    ['evjaratCsokkeno', 'Legújabb évjárat'],
];

const autokLekerese = (q, rendezes, oldal, signal) => {
    const parameterek = new URLSearchParams({ rendezes, oldal: String(oldal), limit: String(OLDAL_MERET) });
    if (q) parameterek.set('q', q);
    return apiKeres(`/autok?${parameterek}`, { signal }, 'Az autók betöltése nem sikerült.');
};

const SzerkesztoModal = ({ auto, onBezaras, onMentve }) => {
    const [adatok, setAdatok] = useState(() => autoAdatokbol(auto));
    const [egyediMezok, setEgyediMezok] = useState(() => egyediMezokAdatokbol(autoAdatokbol(auto)));
    const [ujKep, setUjKep] = useState(null);
    const [hiba, setHiba] = useState('');
    const [mentes, setMentes] = useState(false);
    const panelRef = useRef(null);

    const bezaras = useCallback(() => {
        if (!mentes) onBezaras();
    }, [mentes, onBezaras]);

    useEffect(() => {
        const elozoOverflow = document.body.style.overflow;
        const elozoFokusz = document.activeElement;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();
        return () => {
            document.body.style.overflow = elozoOverflow;
            elozoFokusz?.focus?.();
        };
    }, []);

    useEffect(() => {
        const billentyu = (event) => {
            if (event.key === 'Escape') bezaras();
        };
        window.addEventListener('keydown', billentyu);
        return () => window.removeEventListener('keydown', billentyu);
    }, [bezaras]);

    const mentese = async (event) => {
        event.preventDefault();
        setMentes(true);
        setHiba('');
        try {
            const payload = kuldhetoAdatok(adatok);
            if (ujKep) payload.kep = ujKep.adat;
            const data = await apiKeres(`/update-auto/${auto._id}`, { method: 'PUT', body: payload }, 'Az autó mentése nem sikerült.');
            onMentve(data.updatedAuto);
        } catch (error) {
            setHiba(error.message);
            setMentes(false);
        }
    };

    return (
        <div className="modal-hatter" onMouseDown={(event) => { if (event.target === event.currentTarget) bezaras(); }}>
            <section
                className="modal uveg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="szerkeszto-cim"
                tabIndex={-1}
                ref={panelRef}
            >
                <header className="modal-fejlec">
                    <div>
                        <p className="felirat">Hirdetés szerkesztése</p>
                        <h2 id="szerkeszto-cim">{auto.marka} {auto.modell}</h2>
                    </div>
                    <button className="modal-bezaras" type="button" aria-label="Bezárás" onClick={bezaras} disabled={mentes}>×</button>
                </header>
                <form onSubmit={mentese}>
                    <AutoMezok
                        adatok={adatok}
                        setAdatok={setAdatok}
                        egyediMezok={egyediMezok}
                        setEgyediMezok={setEgyediMezok}
                        idElotag="szerk"
                    />
                    <div className="modal-kep">
                        <KepValaszto
                            elonezet={ujKep?.adat || auto.kep}
                            kepNev={ujKep?.nev}
                            onKep={(adat, nev) => setUjKep({ adat, nev })}
                            onHiba={setHiba}
                        />
                    </div>
                    {hiba && <p className="uzenet uzenet-hiba modal-uzenet" role="alert">{hiba}</p>}
                    <div className="modal-akciok">
                        <button className="gomb gomb-uveg" type="button" onClick={bezaras} disabled={mentes}>Mégse</button>
                        <button className="gomb gomb-fo" type="submit" disabled={mentes}>
                            {mentes ? 'Mentés…' : 'Változtatások mentése'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};

const Autok = () => {
    const { user } = useAuth();
    const admin = user?.statusz === 'admin';

    const [kereses, setKereses] = useState('');
    const [q, setQ] = useState('');
    const [rendezes, setRendezes] = useState('ujElol');
    const [frissites, setFrissites] = useState(0);

    const [autok, setAutok] = useState([]);
    const [lapozas, setLapozas] = useState({ oldal: 1, osszes: 0, oldalak: 0 });
    const [kinalatMeret, setKinalatMeret] = useState(null);
    const [betoltottKulcs, setBetoltottKulcs] = useState(null);
    const [tobbBetoltes, setTobbBetoltes] = useState(false);
    const [hiba, setHiba] = useState('');

    const [szerkesztett, setSzerkesztett] = useState(null);
    const [torlesFolyamatban, setTorlesFolyamatban] = useState('');
    const [muveletHiba, setMuveletHiba] = useState('');

    // Gépelés közben ne küldjünk minden leütésnél kérést.
    useEffect(() => {
        const idozito = setTimeout(() => setQ(kereses.trim()), 300);
        return () => clearTimeout(idozito);
    }, [kereses]);

    // A betöltés állapota abból következik, hogy az aktuális lekérdezés eredménye megérkezett-e már.
    const kulcs = `${q}|${rendezes}|${frissites}`;
    const betoltes = betoltottKulcs !== kulcs;

    useEffect(() => {
        const controller = new AbortController();
        const keresKulcs = `${q}|${rendezes}|${frissites}`;
        autokLekerese(q, rendezes, 1, controller.signal)
            .then((data) => {
                setAutok(data.autok || []);
                setLapozas(data.lapozas);
                if (!q) setKinalatMeret(data.lapozas.osszes);
                setHiba('');
                setBetoltottKulcs(keresKulcs);
            })
            .catch((error) => {
                if (error.name === 'AbortError') return;
                setHiba(error.message || 'Nem sikerült kapcsolódni a szerverhez.');
                setBetoltottKulcs(keresKulcs);
            });
        return () => controller.abort();
    }, [q, rendezes, frissites]);

    const tovabbiak = async () => {
        setTobbBetoltes(true);
        try {
            const data = await autokLekerese(q, rendezes, lapozas.oldal + 1);
            setAutok((elozo) => {
                const meglevo = new Set(elozo.map((auto) => auto._id));
                return [...elozo, ...data.autok.filter((auto) => !meglevo.has(auto._id))];
            });
            setLapozas(data.lapozas);
        } catch (error) {
            setMuveletHiba(error.message);
        } finally {
            setTobbBetoltes(false);
        }
    };

    const autoTorlese = async (auto) => {
        if (!window.confirm(`Biztosan törlöd ezt az autót: ${auto.marka} ${auto.modell}?`)) return;
        setTorlesFolyamatban(auto._id);
        setMuveletHiba('');
        try {
            await apiKeres(`/delete-auto/${auto._id}`, { method: 'DELETE' }, 'Az autó törlése nem sikerült.');
            setAutok((elozo) => elozo.filter((elem) => elem._id !== auto._id));
            setLapozas((elozo) => ({ ...elozo, osszes: Math.max(elozo.osszes - 1, 0) }));
            setKinalatMeret((elozo) => (elozo == null ? elozo : Math.max(elozo - 1, 0)));
        } catch (error) {
            setMuveletHiba(error.message);
        } finally {
            setTorlesFolyamatban('');
        }
    };

    const vanTobb = !betoltes && autok.length < lapozas.osszes;

    return (
        <main className="oldal autok">
            <section className="autok-bemutato beuszas">
                <div>
                    <p className="felirat">Veltrix garázs</p>
                    <h1>Válogatott <span className="gradiens-szoveg">kínálat.</span></h1>
                    <p className="autok-bevezeto">
                        Fedezd fel aktuális kínálatunkat, és találd meg azt az autót, amely minden úton társad lesz.
                    </p>
                </div>
                <div className="autok-szamlalo uveg" aria-live="polite">
                    <strong className="gradiens-szoveg">{kinalatMeret == null ? '—' : formatSzam(kinalatMeret)}</strong>
                    <span>elérhető<br />jármű</span>
                </div>
            </section>

            <section aria-labelledby="autok-cim">
                <h2 id="autok-cim" className="sr-only">Aktuális kínálat</h2>
                <div className="autok-eszkoztar uveg">
                    <label className="autok-kereso" htmlFor="auto-kereses">
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="sr-only">Keresés</span>
                        <input
                            id="auto-kereses"
                            type="search"
                            placeholder="Márka, modell, üzemanyag, évjárat…"
                            value={kereses}
                            onChange={(event) => setKereses(event.target.value)}
                        />
                    </label>
                    <label className="autok-rendezes" htmlFor="auto-rendezes">
                        <span className="sr-only">Rendezés</span>
                        <select
                            className="bemenet"
                            id="auto-rendezes"
                            value={rendezes}
                            onChange={(event) => setRendezes(event.target.value)}
                        >
                            {rendezesek.map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                        </select>
                    </label>
                </div>

                <p className="autok-talalat" aria-live="polite">
                    {betoltes ? 'Autók betöltése…' : `${formatSzam(lapozas.osszes)} találat${q ? ` erre: „${q}”` : ''}`}
                </p>

                {muveletHiba && <p className="uzenet uzenet-hiba autok-muvelet-hiba" role="alert">{muveletHiba}</p>}

                {hiba && !betoltes ? (
                    <div className="autok-allapot uveg" role="alert">
                        <span className="autok-allapot-ikon" aria-hidden="true">!</span>
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
                            {autok.map((auto, i) => (
                                <AutoKartya
                                    key={auto._id}
                                    auto={auto}
                                    admin={admin}
                                    kesleltetes={i % OLDAL_MERET}
                                    onSzerkesztes={(kivalasztott) => { setMuveletHiba(''); setSzerkesztett(kivalasztott); }}
                                    onTorles={autoTorlese}
                                    torlesFolyamatban={torlesFolyamatban === auto._id}
                                />
                            ))}
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
                    <div className="autok-allapot uveg">
                        <span className="autok-allapot-ikon" aria-hidden="true">⌕</span>
                        <h3>{q ? 'Nincs ilyen találat' : 'Hamarosan érkeznek az autók'}</h3>
                        <p>{q ? 'Próbálj másik keresési kifejezést.' : 'Jelenleg még nincs feltöltött autó a kínálatban.'}</p>
                        {kereses && <button className="gomb gomb-uveg" type="button" onClick={() => setKereses('')}>Keresés törlése</button>}
                    </div>
                )}
            </section>

            {user && (
                <section className="autok-cta uveg">
                    <div>
                        <p className="felirat">Új autó érkezett?</p>
                        <h2>Kerüljön be a kínálatba.</h2>
                    </div>
                    <Link className="gomb gomb-fo" to="/feltolt">
                        Autó feltöltése <span className="nyil" aria-hidden="true">↗</span>
                    </Link>
                </section>
            )}

            {szerkesztett && (
                <SzerkesztoModal
                    auto={szerkesztett}
                    onBezaras={() => setSzerkesztett(null)}
                    onMentve={(frissAuto) => {
                        setAutok((elozo) => elozo.map((auto) => (auto._id === frissAuto._id ? frissAuto : auto)));
                        setSzerkesztett(null);
                    }}
                />
            )}
        </main>
    );
};

export default Autok;
