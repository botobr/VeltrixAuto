import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AlkatreszKartya from '../components/AlkatreszKartya';
import { AutoKartyaVaz } from '../components/AutoKartya';
import Ikon from '../components/Ikon';
import { apiKeres } from '../lib/api';
import { formatSzam } from '../lib/auto';
import { useSeo } from '../lib/useSeo';
import { ALKATRESZ_RENDEZESEK, KATEGORIAK } from '../lib/webshop';
import './Autok.css';
import './Webshop.css';

const OLDAL_MERET = 12;
const SZURO_KULCSOK = ['q', 'kategoria', 'gyarto', 'minAr', 'maxAr', 'keszleten', 'akcios', 'autoMarka', 'autoModell', 'autoEvjarat'];

/** „Melyik autódhoz?” – márka, modell, évjárat; az URL-be írja a kiválasztott autót. */
const AutoValaszto = ({ markak, ertek, onValtozas }) => {
    const [marka, setMarka] = useState(ertek.autoMarka || '');
    const [modell, setModell] = useState(ertek.autoModell || '');
    const [evjarat, setEvjarat] = useState(ertek.autoEvjarat || '');
    const modellek = markak.find((m) => m.marka === marka)?.modellek || [];
    const aktiv = Boolean(ertek.autoMarka);

    return (
        <form
            className="auto-valaszto"
            onSubmit={(event) => {
                event.preventDefault();
                onValtozas({ autoMarka: marka || null, autoModell: marka ? modell || null : null, autoEvjarat: marka ? evjarat || null : null });
            }}
        >
            <h2><Ikon nev="auto" meret={17} /> Melyik autódhoz?</h2>
            <label className="mezo">
                <span>Márka</span>
                <select className="bemenet" value={marka} onChange={(e) => { setMarka(e.target.value); setModell(''); }}>
                    <option value="">Válassz márkát…</option>
                    {markak.map((m) => <option key={m.marka} value={m.marka}>{m.marka}</option>)}
                </select>
            </label>
            <label className="mezo">
                <span>Modell</span>
                <select className="bemenet" value={modell} disabled={!marka} onChange={(e) => setModell(e.target.value)}>
                    <option value="">Minden modell</option>
                    {modellek.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
            </label>
            <label className="mezo">
                <span>Évjárat</span>
                <input className="bemenet" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} placeholder="pl. 2016"
                    disabled={!marka} value={evjarat} onChange={(e) => setEvjarat(e.target.value)} />
            </label>
            <div className="auto-valaszto-gombok">
                <button className="gomb gomb-fo gomb-kicsi" type="submit" disabled={!marka}>Illő alkatrészek</button>
                {aktiv && (
                    <button className="szoveg-gomb" type="button" onClick={() => {
                        setMarka(''); setModell(''); setEvjarat('');
                        onValtozas({ autoMarka: null, autoModell: null, autoEvjarat: null });
                    }}>Törlés</button>
                )}
            </div>
        </form>
    );
};

const Szurok = ({ szurok, adatok, onValtozas, onTorles }) => {
    const kategoriak = szurok.kategoria ? szurok.kategoria.split(',') : [];
    const [minAr, setMinAr] = useState(szurok.minAr || '');
    const [maxAr, setMaxAr] = useState(szurok.maxAr || '');
    const kategoriaValtas = (kulcs) => {
        const uj = kategoriak.includes(kulcs) ? kategoriak.filter((k) => k !== kulcs) : [...kategoriak, kulcs];
        onValtozas({ kategoria: uj.join(',') || null });
    };

    return (
        <aside className="alkatresz-szurok uveg" aria-label="Szűrők">
            <AutoValaszto key={`${szurok.autoMarka}|${szurok.autoModell}|${szurok.autoEvjarat}`} markak={adatok?.markak || []} ertek={szurok} onValtozas={onValtozas} />

            <fieldset>
                <legend>Kategória</legend>
                <div className="szuro-csipek">
                    {(adatok?.kategoriak || Object.entries(KATEGORIAK).map(([kulcs, nev]) => ({ kulcs, nev, db: null })))
                        .filter((k) => k.db === null || k.db > 0 || kategoriak.includes(k.kulcs))
                        .map((k) => (
                            <button key={k.kulcs} type="button" className={`csip ${kategoriak.includes(k.kulcs) ? 'aktiv' : ''}`}
                                aria-pressed={kategoriak.includes(k.kulcs)} onClick={() => kategoriaValtas(k.kulcs)}>
                                {k.nev}{k.db !== null && <small> {k.db}</small>}
                            </button>
                        ))}
                </div>
            </fieldset>

            {adatok?.gyartok?.length > 0 && (
                <label className="mezo">
                    <span>Gyártó</span>
                    <select className="bemenet" value={szurok.gyarto || ''} onChange={(e) => onValtozas({ gyarto: e.target.value || null })}>
                        <option value="">Minden gyártó</option>
                        {adatok.gyartok.map((g) => <option key={g.nev} value={g.nev}>{g.nev} ({g.db})</option>)}
                    </select>
                </label>
            )}

            <fieldset>
                <legend>Ár (Ft)</legend>
                <form className="ar-szuro" onSubmit={(e) => { e.preventDefault(); onValtozas({ minAr: minAr || null, maxAr: maxAr || null }); }}>
                    <input className="bemenet" type="number" min={0} inputMode="numeric" placeholder={adatok?.tartomany ? formatSzam(adatok.tartomany.minAr) : 'min.'}
                        aria-label="Minimális ár" value={minAr} onChange={(e) => setMinAr(e.target.value)} />
                    <span aria-hidden="true">–</span>
                    <input className="bemenet" type="number" min={0} inputMode="numeric" placeholder={adatok?.tartomany ? formatSzam(adatok.tartomany.maxAr) : 'max.'}
                        aria-label="Maximális ár" value={maxAr} onChange={(e) => setMaxAr(e.target.value)} />
                    <button className="ikon-gomb" type="submit" aria-label="Ár szűrő alkalmazása"><Ikon nev="jobbra" /></button>
                </form>
            </fieldset>

            <label className="kapcsolo-sor">
                <input type="checkbox" checked={szurok.keszleten === '1'} onChange={(e) => onValtozas({ keszleten: e.target.checked ? '1' : null })} />
                <span className="kapcsolo" aria-hidden="true" /> Csak készleten lévő
            </label>
            <label className="kapcsolo-sor">
                <input type="checkbox" checked={szurok.akcios === '1'} onChange={(e) => onValtozas({ akcios: e.target.checked ? '1' : null })} />
                <span className="kapcsolo" aria-hidden="true" /> Csak akciós
            </label>

            <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={onTorles}>Szűrők törlése</button>
        </aside>
    );
};

const Alkatreszek = () => {
    const [params, setParams] = useSearchParams();
    const szurok = useMemo(() => Object.fromEntries(SZURO_KULCSOK.filter((k) => params.get(k)).map((k) => [k, params.get(k)])), [params]);
    const rendezes = params.get('rendezes') || 'ujElol';
    const [kereses, setKereses] = useState(szurok.q || '');
    const [szuroAdatok, setSzuroAdatok] = useState(null);
    const [eredmeny, setEredmeny] = useState({ kulcs: null, alkatreszek: [], lapozas: { oldal: 1, osszes: 0 }, hiba: '' });
    const [tobbBetoltes, setTobbBetoltes] = useState(false);
    const [frissites, setFrissites] = useState(0);

    const autoCim = szurok.autoMarka ? `${szurok.autoMarka}${szurok.autoModell ? ` ${szurok.autoModell}` : ''}${szurok.autoEvjarat ? ` (${szurok.autoEvjarat})` : ''}` : '';
    useSeo({
        cim: autoCim ? `Tuning alkatrészek – ${autoCim}` : 'Tuning alkatrészek webshop',
        leiras: 'Állítható futóművek, sport és nyitott levegőszűrők, kipufogók, fékek és más tuning alkatrészek – szűrés az autód típusára.',
        utvonal: '/alkatreszek',
    });

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

    useEffect(() => {
        const ertek = kereses.trim();
        if (ertek === (szurok.q || '')) return undefined;
        const idozito = setTimeout(() => parameterek({ q: ertek || null }), 350);
        return () => clearTimeout(idozito);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kereses]);

    useEffect(() => {
        apiKeres('/alkatreszek/szurok').then(setSzuroAdatok).catch(() => setSzuroAdatok(null));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const aktKulcs = `${keresKulcs}#${frissites}`;
        apiKeres(`/alkatreszek?${keresKulcs}&limit=${OLDAL_MERET}`, { signal: controller.signal }, 'A termékek betöltése nem sikerült.')
            .then((data) => setEredmeny({ kulcs: aktKulcs, alkatreszek: data.alkatreszek, lapozas: data.lapozas, hiba: '' }))
            .catch((error) => {
                if (error.name !== 'AbortError') setEredmeny({ kulcs: aktKulcs, alkatreszek: [], lapozas: { oldal: 1, osszes: 0 }, hiba: error.message });
            });
        return () => controller.abort();
    }, [keresKulcs, frissites]);

    const tovabbiak = async () => {
        setTobbBetoltes(true);
        try {
            const data = await apiKeres(`/alkatreszek?${keresKulcs}&limit=${OLDAL_MERET}&oldal=${eredmeny.lapozas.oldal + 1}`);
            setEredmeny((elozo) => ({ ...elozo, alkatreszek: [...elozo.alkatreszek, ...data.alkatreszek], lapozas: data.lapozas }));
        } catch (error) {
            setEredmeny((elozo) => ({ ...elozo, hiba: error.message }));
        } finally {
            setTobbBetoltes(false);
        }
    };

    const torles = () => {
        setKereses('');
        setParams(rendezes !== 'ujElol' ? { rendezes } : {}, { replace: true });
    };

    const { alkatreszek, lapozas, hiba } = eredmeny;
    const vanSzuro = Object.keys(szurok).length > 0;

    return (
        <main className="oldal autok alkatreszek">
            <section className="autok-bemutato beuszas">
                <div>
                    <p className="felirat">Veltrix tuning shop</p>
                    <h1>Tuning <span className="gradiens-szoveg">alkatrészek.</span></h1>
                    <p className="alkatreszek-alcim">Futóművek, szívórendszerek, kipufogók és fékek – válaszd ki az autódat, és csak az illő alkatrészeket mutatjuk.</p>
                </div>
                <label className="autok-kereso uveg" htmlFor="alkatresz-kereses">
                    <Ikon nev="kereses" meret={20} />
                    <span className="sr-only">Keresés</span>
                    <input id="alkatresz-kereses" type="search" placeholder="Termék, gyártó, cikkszám…" value={kereses} onChange={(e) => setKereses(e.target.value)} />
                </label>
            </section>

            <div className="autok-elrendezes">
                <Szurok key={`${szurok.minAr}|${szurok.maxAr}`} szurok={szurok} adatok={szuroAdatok} onValtozas={parameterek} onTorles={torles} />

                <section className="autok-talalatok" aria-labelledby="alkatresz-talalatok">
                    <h2 id="alkatresz-talalatok" className="sr-only">Találatok</h2>
                    <div className="autok-eszkoztar">
                        <p className="autok-talalat" aria-live="polite">
                            {betoltes ? 'Termékek betöltése…' : <><strong>{formatSzam(lapozas.osszes)}</strong> termék{autoCim && <> · <span className="alkatresz-auto-cimke"><Ikon nev="auto" meret={14} /> {autoCim}</span></>}</>}
                        </p>
                        <label className="autok-rendezes" htmlFor="alkatresz-rendezes">
                            <span className="sr-only">Rendezés</span>
                            <select className="bemenet" id="alkatresz-rendezes" value={rendezes}
                                onChange={(e) => parameterek({ rendezes: e.target.value === 'ujElol' ? null : e.target.value })}>
                                {ALKATRESZ_RENDEZESEK.map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                            </select>
                        </label>
                    </div>

                    {hiba && !betoltes ? (
                        <div className="allapot-doboz uveg" role="alert">
                            <span className="allapot-ikon" aria-hidden="true">!</span>
                            <h3>Most nem érjük el a webshopot</h3>
                            <p>{hiba}</p>
                            <button className="gomb gomb-uveg" type="button" onClick={() => setFrissites((n) => n + 1)}>Újrapróbálom</button>
                        </div>
                    ) : betoltes ? (
                        <div className="autok-racs" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <AutoKartyaVaz key={i} />)}</div>
                    ) : alkatreszek.length > 0 ? (
                        <>
                            <div className="autok-racs">
                                {alkatreszek.map((a, i) => <AlkatreszKartya key={a._id} alkatresz={a} kesleltetes={i % OLDAL_MERET} />)}
                            </div>
                            {alkatreszek.length < lapozas.osszes && (
                                <div className="autok-tobb">
                                    <button className="gomb gomb-uveg" type="button" onClick={tovabbiak} disabled={tobbBetoltes}>
                                        {tobbBetoltes ? 'Betöltés…' : `Továbbiak betöltése (${formatSzam(lapozas.osszes - alkatreszek.length)})`}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="allapot-doboz uveg">
                            <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kereses" meret={22} /></span>
                            <h3>{vanSzuro ? 'Nincs a feltételeknek megfelelő termék' : 'Hamarosan érkeznek a termékek'}</h3>
                            <p>{autoCim ? `Ehhez az autóhoz (${autoCim}) most nincs illő alkatrész. Írj nekünk, és beszerezzük!` : 'Lazíts a szűrőkön, vagy nézz vissza később.'}</p>
                            {vanSzuro && <button className="gomb gomb-uveg" type="button" onClick={torles}>Szűrők törlése</button>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
};

export default Alkatreszek;
