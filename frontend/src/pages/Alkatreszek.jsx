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

// "Melyik autódhoz?" - márka, modell, évjárat kiválasztása
const AutoValaszto = ({ markak, ertek, onValtozas }) => {
    const [marka, setMarka] = useState(ertek.autoMarka || '');
    const [modell, setModell] = useState(ertek.autoModell || '');
    const [evjarat, setEvjarat] = useState(ertek.autoEvjarat || '');
    const aktiv = Boolean(ertek.autoMarka);

    // a kiválasztott márka modelljei
    let modellek = [];
    const valasztott = markak.find((elem) => elem.marka === marka);
    if (valasztott) {
        modellek = valasztott.modellek;
    }

    const kuldes = (event) => {
        event.preventDefault();
        if (!marka) {
            onValtozas({ autoMarka: null, autoModell: null, autoEvjarat: null });
            return;
        }
        onValtozas({ autoMarka: marka, autoModell: modell || null, autoEvjarat: evjarat || null });
    };

    const markaValtozas = (event) => {
        setMarka(event.target.value);
        setModell(''); // másik márkánál a modell nem jó
    };

    const torles = () => {
        setMarka('');
        setModell('');
        setEvjarat('');
        onValtozas({ autoMarka: null, autoModell: null, autoEvjarat: null });
    };

    return (
        <form className="auto-valaszto" onSubmit={kuldes}>
            <h2><Ikon nev="auto" meret={17} /> Melyik autódhoz?</h2>
            <label className="mezo">
                <span>Márka</span>
                <select className="bemenet" value={marka} onChange={markaValtozas}>
                    <option value="">Válassz márkát…</option>
                    {markak.map((elem) => <option key={elem.marka} value={elem.marka}>{elem.marka}</option>)}
                </select>
            </label>
            <label className="mezo">
                <span>Modell</span>
                <select className="bemenet" value={modell} disabled={!marka} onChange={(e) => setModell(e.target.value)}>
                    <option value="">Minden modell</option>
                    {modellek.map((nev) => <option key={nev} value={nev}>{nev}</option>)}
                </select>
            </label>
            <label className="mezo">
                <span>Évjárat</span>
                <input className="bemenet" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} placeholder="pl. 2016"
                    disabled={!marka} value={evjarat} onChange={(e) => setEvjarat(e.target.value)} />
            </label>
            <div className="auto-valaszto-gombok">
                <button className="gomb gomb-fo gomb-kicsi" type="submit" disabled={!marka}>Illő alkatrészek</button>
                {aktiv && <button className="szoveg-gomb" type="button" onClick={torles}>Törlés</button>}
            </div>
        </form>
    );
};

// a webshop szűrői a bal oldalon
const Szurok = ({ szurok, adatok, onValtozas, onTorles }) => {
    const [minAr, setMinAr] = useState(szurok.minAr || '');
    const [maxAr, setMaxAr] = useState(szurok.maxAr || '');

    let kategoriak = [];
    if (szurok.kategoria) {
        kategoriak = szurok.kategoria.split(',');
    }

    let markak = [];
    let gyartok = [];
    let minArPlaceholder = 'min.';
    let maxArPlaceholder = 'max.';
    // amíg nem jöttek meg a szerverről a darabszámok, a sima kategória listát mutatjuk
    let kategoriaLista = [];
    for (const kulcs in KATEGORIAK) {
        kategoriaLista.push({ kulcs: kulcs, nev: KATEGORIAK[kulcs], db: null });
    }
    if (adatok) {
        markak = adatok.markak || [];
        gyartok = adatok.gyartok || [];
        if (adatok.kategoriak) {
            kategoriaLista = adatok.kategoriak;
        }
        if (adatok.tartomany) {
            minArPlaceholder = formatSzam(adatok.tartomany.minAr);
            maxArPlaceholder = formatSzam(adatok.tartomany.maxAr);
        }
    }
    // az üres kategóriák nem kellenek (kivéve, ha ki van választva)
    kategoriaLista = kategoriaLista.filter((kategoria) => kategoria.db === null || kategoria.db > 0 || kategoriak.includes(kategoria.kulcs));

    const kategoriaValtas = (kulcs) => {
        let uj;
        if (kategoriak.includes(kulcs)) {
            uj = kategoriak.filter((elem) => elem !== kulcs);
        } else {
            uj = [...kategoriak, kulcs];
        }
        onValtozas({ kategoria: uj.join(',') || null });
    };

    const arSzures = (event) => {
        event.preventDefault();
        onValtozas({ minAr: minAr || null, maxAr: maxAr || null });
    };

    // ha változik az autó az URL-ben, a választót újra kell kezdeni (ezért a key)
    const autoKulcs = szurok.autoMarka + '|' + szurok.autoModell + '|' + szurok.autoEvjarat;

    return (
        <aside className="alkatresz-szurok uveg" aria-label="Szűrők">
            <AutoValaszto key={autoKulcs} markak={markak} ertek={szurok} onValtozas={onValtozas} />

            <fieldset>
                <legend>Kategória</legend>
                <div className="szuro-csipek">
                    {kategoriaLista.map((kategoria) => (
                        <button key={kategoria.kulcs} type="button" className={kategoriak.includes(kategoria.kulcs) ? 'csip aktiv' : 'csip'}
                            aria-pressed={kategoriak.includes(kategoria.kulcs)} onClick={() => kategoriaValtas(kategoria.kulcs)}>
                            {kategoria.nev}{kategoria.db !== null && <small> {kategoria.db}</small>}
                        </button>
                    ))}
                </div>
            </fieldset>

            {gyartok.length > 0 && (
                <label className="mezo">
                    <span>Gyártó</span>
                    <select className="bemenet" value={szurok.gyarto || ''} onChange={(e) => onValtozas({ gyarto: e.target.value || null })}>
                        <option value="">Minden gyártó</option>
                        {gyartok.map((gyarto) => <option key={gyarto.nev} value={gyarto.nev}>{gyarto.nev} ({gyarto.db})</option>)}
                    </select>
                </label>
            )}

            <fieldset>
                <legend>Ár (Ft)</legend>
                <form className="ar-szuro" onSubmit={arSzures}>
                    <input className="bemenet" type="number" min={0} inputMode="numeric" placeholder={minArPlaceholder}
                        aria-label="Minimális ár" value={minAr} onChange={(e) => setMinAr(e.target.value)} />
                    <span aria-hidden="true">–</span>
                    <input className="bemenet" type="number" min={0} inputMode="numeric" placeholder={maxArPlaceholder}
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

// a webshop termék listája
const Alkatreszek = () => {
    const [params, setParams] = useSearchParams();

    // a beállított szűrők az URL-ből
    const szurok = useMemo(() => {
        const eredmeny = {};
        for (const kulcs of SZURO_KULCSOK) {
            if (params.get(kulcs)) {
                eredmeny[kulcs] = params.get(kulcs);
            }
        }
        return eredmeny;
    }, [params]);
    const rendezes = params.get('rendezes') || 'ujElol';
    const [kereses, setKereses] = useState(szurok.q || '');
    const [szuroAdatok, setSzuroAdatok] = useState(null);
    const [eredmeny, setEredmeny] = useState({ kulcs: null, alkatreszek: [], lapozas: { oldal: 1, osszes: 0 }, hiba: '' });
    const [tobbBetoltes, setTobbBetoltes] = useState(false);
    const [frissites, setFrissites] = useState(0);

    let autoCim = '';
    if (szurok.autoMarka) {
        autoCim = szurok.autoMarka;
        if (szurok.autoModell) {
            autoCim += ' ' + szurok.autoModell;
        }
        if (szurok.autoEvjarat) {
            autoCim += ' (' + szurok.autoEvjarat + ')';
        }
    }
    useSeo({
        cim: autoCim ? 'Tuning alkatrészek – ' + autoCim : 'Tuning alkatrészek webshop',
        leiras: 'Állítható futóművek, sport és nyitott levegőszűrők, kipufogók, fékek és más tuning alkatrészek – szűrés az autód típusára.',
        utvonal: '/alkatreszek',
    });

    // a kérés paraméterei szövegként (ebből tudjuk, hogy kell-e újra tölteni)
    const keresKulcs = useMemo(() => {
        const parameterek = new URLSearchParams(szurok);
        parameterek.set('rendezes', rendezes);
        return parameterek.toString();
    }, [szurok, rendezes]);
    const kulcs = keresKulcs + '#' + frissites;
    const betoltes = eredmeny.kulcs !== kulcs;

    // URL paraméterek módosítása (null értéknél törli)
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

    // keresés: gépelés után kicsit várunk
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

    useEffect(() => {
        apiKeres('/alkatreszek/szurok')
            .then((data) => setSzuroAdatok(data))
            .catch(() => setSzuroAdatok(null));
    }, []);

    // a termékek betöltése
    useEffect(() => {
        const controller = new AbortController();
        const aktualisKulcs = keresKulcs + '#' + frissites;
        const url = '/alkatreszek?' + keresKulcs + '&limit=' + OLDAL_MERET;

        apiKeres(url, { signal: controller.signal }, 'A termékek betöltése nem sikerült.')
            .then((data) => {
                setEredmeny({ kulcs: aktualisKulcs, alkatreszek: data.alkatreszek, lapozas: data.lapozas, hiba: '' });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setEredmeny({ kulcs: aktualisKulcs, alkatreszek: [], lapozas: { oldal: 1, osszes: 0 }, hiba: error.message });
                }
            });

        return () => controller.abort();
    }, [keresKulcs, frissites]);

    // következő oldal
    const tovabbiak = async () => {
        setTobbBetoltes(true);
        try {
            const url = '/alkatreszek?' + keresKulcs + '&limit=' + OLDAL_MERET + '&oldal=' + (eredmeny.lapozas.oldal + 1);
            const data = await apiKeres(url);
            setEredmeny((elozo) => ({ ...elozo, alkatreszek: [...elozo.alkatreszek, ...data.alkatreszek], lapozas: data.lapozas }));
        } catch (error) {
            setEredmeny((elozo) => ({ ...elozo, hiba: error.message }));
        } finally {
            setTobbBetoltes(false);
        }
    };

    // minden szűrő törlése (a rendezés marad)
    const torles = () => {
        setKereses('');
        if (rendezes !== 'ujElol') {
            setParams({ rendezes: rendezes }, { replace: true });
        } else {
            setParams({}, { replace: true });
        }
    };

    const rendezesValtozas = (event) => {
        if (event.target.value === 'ujElol') {
            parameterek({ rendezes: null });
        } else {
            parameterek({ rendezes: event.target.value });
        }
    };

    const alkatreszek = eredmeny.alkatreszek;
    const lapozas = eredmeny.lapozas;
    const hiba = eredmeny.hiba;
    const vanSzuro = Object.keys(szurok).length > 0;

    // a találatok része: hiba / betöltés / termékek / nincs találat
    let talalatok;
    if (hiba && !betoltes) {
        talalatok = (
            <div className="allapot-doboz uveg" role="alert">
                <span className="allapot-ikon" aria-hidden="true">!</span>
                <h3>Most nem érjük el a webshopot</h3>
                <p>{hiba}</p>
                <button className="gomb gomb-uveg" type="button" onClick={() => setFrissites((szam) => szam + 1)}>Újrapróbálom</button>
            </div>
        );
    } else if (betoltes) {
        talalatok = <div className="autok-racs" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <AutoKartyaVaz key={i} />)}</div>;
    } else if (alkatreszek.length > 0) {
        talalatok = (
            <>
                <div className="autok-racs">
                    {alkatreszek.map((alkatresz, i) => <AlkatreszKartya key={alkatresz._id} alkatresz={alkatresz} kesleltetes={i % OLDAL_MERET} />)}
                </div>
                {alkatreszek.length < lapozas.osszes && (
                    <div className="autok-tobb">
                        <button className="gomb gomb-uveg" type="button" onClick={tovabbiak} disabled={tobbBetoltes}>
                            {tobbBetoltes ? 'Betöltés…' : 'Továbbiak betöltése (' + formatSzam(lapozas.osszes - alkatreszek.length) + ')'}
                        </button>
                    </div>
                )}
            </>
        );
    } else {
        let szoveg = 'Lazíts a szűrőkön, vagy nézz vissza később.';
        if (autoCim) {
            szoveg = 'Ehhez az autóhoz (' + autoCim + ') most nincs illő alkatrész. Írj nekünk, és beszerezzük!';
        }
        talalatok = (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kereses" meret={22} /></span>
                <h3>{vanSzuro ? 'Nincs a feltételeknek megfelelő termék' : 'Hamarosan érkeznek a termékek'}</h3>
                <p>{szoveg}</p>
                {vanSzuro && <button className="gomb gomb-uveg" type="button" onClick={torles}>Szűrők törlése</button>}
            </div>
        );
    }

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
                <Szurok key={szurok.minAr + '|' + szurok.maxAr} szurok={szurok} adatok={szuroAdatok} onValtozas={parameterek} onTorles={torles} />

                <section className="autok-talalatok" aria-labelledby="alkatresz-talalatok">
                    <h2 id="alkatresz-talalatok" className="sr-only">Találatok</h2>
                    <div className="autok-eszkoztar">
                        <p className="autok-talalat" aria-live="polite">
                            {betoltes && 'Termékek betöltése…'}
                            {!betoltes && <><strong>{formatSzam(lapozas.osszes)}</strong> termék</>}
                            {!betoltes && autoCim && <> · <span className="alkatresz-auto-cimke"><Ikon nev="auto" meret={14} /> {autoCim}</span></>}
                        </p>
                        <label className="autok-rendezes" htmlFor="alkatresz-rendezes">
                            <span className="sr-only">Rendezés</span>
                            <select className="bemenet" id="alkatresz-rendezes" value={rendezes} onChange={rendezesValtozas}>
                                {ALKATRESZ_RENDEZESEK.map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                            </select>
                        </label>
                    </div>

                    {talalatok}
                </section>
            </div>
        </main>
    );
};

export default Alkatreszek;
