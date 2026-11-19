import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlkatreszKartya from '../components/AlkatreszKartya';
import AutoKartya from '../components/AutoKartya';
import { KedvencGomb, OsszehasonlitasGomb } from '../components/AutoMuveletek';
import ErdeklodesUrlap from '../components/ErdeklodesUrlap';
import Galeria from '../components/Galeria';
import HitelKalkulator from '../components/HitelKalkulator';
import Ikon from '../components/Ikon';
import Megosztas from '../components/Megosztas';
import TelephelyInfo from '../components/TelephelyInfo';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import { FELSZERELTSEG_CSOPORTOK, STATUSZOK, autoNev, formatAr, formatSzam, muszakiAdatok } from '../lib/auto';
import { CEG } from '../lib/ceg';
import { legkisebbHaviReszlet } from '../lib/hitel';
import { olvas, ir } from '../lib/tarolo';
import { useSeo } from '../lib/useSeo';
import NemTalalhato from './NemTalalhato';
import './AutoReszletek.css';

const ELERHETOSEG = {
    elerheto: 'https://schema.org/InStock',
    foglalt: 'https://schema.org/LimitedAvailability',
    elkelt: 'https://schema.org/SoldOut',
};

const strukturaltAdat = (auto) => ({
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${autoNev(auto)} (${auto.evjarat})`,
    brand: { '@type': 'Brand', name: auto.marka },
    model: auto.modell,
    vehicleModelDate: String(auto.evjarat),
    itemCondition: 'https://schema.org/UsedCondition',
    bodyType: auto.kivitel,
    color: auto.szin,
    fuelType: auto.uzemanyag,
    vehicleTransmission: auto.valto || undefined,
    driveWheelConfiguration: auto.hajtas || undefined,
    numberOfDoors: auto.ajtok_szama || undefined,
    seatingCapacity: auto.ulesek_szama || undefined,
    numberOfPreviousOwners: auto.tulajdonosok_szama ?? undefined,
    dateVehicleFirstRegistered: auto.elso_forgalomba_helyezes?.slice(0, 10),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: auto.kmora_allas, unitCode: 'KMT' },
    vehicleEngine: {
        '@type': 'EngineSpecification',
        enginePower: { '@type': 'QuantitativeValue', value: auto.teljesitmeny, unitCode: 'BHP' },
        engineDisplacement: auto.hengerur_tartalom ? { '@type': 'QuantitativeValue', value: auto.hengerur_tartalom, unitCode: 'CMQ' } : undefined,
    },
    image: auto.kepek.map((kep) => kep.url),
    description: auto.leiras || undefined,
    url: `${window.location.origin}/autok/${auto.slug}`,
    offers: {
        '@type': 'Offer',
        price: auto.vetel_ar,
        priceCurrency: 'HUF',
        availability: ELERHETOSEG[auto.statusz] || ELERHETOSEG.elerheto,
        url: `${window.location.origin}/autok/${auto.slug}`,
        seller: {
            '@type': 'AutoDealer',
            name: auto.telephely?.nev ? `${CEG.nev} – ${auto.telephely.nev}` : CEG.nev,
            telephone: auto.telephely?.telefon || undefined,
            address: auto.telephely ? {
                '@type': 'PostalAddress',
                streetAddress: auto.telephely.cim,
                addressLocality: auto.telephely.varos,
                postalCode: auto.telephely.iranyitoszam || undefined,
                addressRegion: auto.telephely.megye,
                addressCountry: 'HU',
            } : undefined,
        },
    },
});

const felszereltsegCsoportositasa = (lista) => {
    const csoportok = [];
    const maradek = new Set(lista);
    for (const [cim, elemek] of Object.entries(FELSZERELTSEG_CSOPORTOK)) {
        const talalat = elemek.filter((elem) => maradek.has(elem));
        talalat.forEach((elem) => maradek.delete(elem));
        if (talalat.length) csoportok.push([cim, talalat]);
    }
    if (maradek.size) csoportok.push(['Egyéb', [...maradek]]);
    return csoportok;
};

const TelefonGomb = ({ auto, munkatars }) => {
    const [lathato, setLathato] = useState(false);
    const telefon = auto.elado_telefonszam || auto.telephely?.telefon;
    if (!telefon) return null;

    if (lathato) {
        return (
            <a className="gomb gomb-uveg reszletek-telefon" href={`tel:${telefon.replace(/[^\d+]/g, '')}`}>
                <Ikon nev="telefon" meret={16} /> {telefon}
            </a>
        );
    }
    return (
        <button
            className="gomb gomb-uveg reszletek-telefon"
            type="button"
            onClick={() => {
                setLathato(true);
                if (!munkatars) apiKeres(`/autok/${auto._id}/esemeny`, { method: 'POST', body: { tipus: 'telefon' } }).catch(() => {});
            }}
        >
            <Ikon nev="telefon" meret={16} /> Telefonszám megjelenítése
        </button>
    );
};

/** Az autóhoz illő tuning alkatrészek (a webshopból); ha nincs egy sem, a szekció nem jelenik meg. */
const IlloAlkatreszek = ({ auto }) => {
    const [alkatreszek, setAlkatreszek] = useState([]);
    useEffect(() => {
        apiKeres(`/alkatreszek/autohoz/${auto._id}`).then((data) => setAlkatreszek(data.alkatreszek)).catch(() => setAlkatreszek([]));
    }, [auto._id]);
    if (alkatreszek.length === 0) return null;
    const link = `/alkatreszek?autoMarka=${encodeURIComponent(auto.marka)}&autoModell=${encodeURIComponent(auto.modell)}&autoEvjarat=${auto.evjarat}`;
    return (
        <section className="reszletek-blokk nyomtatasban-rejtett" aria-labelledby="tuning-cim">
            <div className="illo-alkatreszek-fej">
                <h2 id="tuning-cim">Tuning alkatrészek ehhez az autóhoz</h2>
                <Link className="szoveg-gomb" to={link}>Összes illő alkatrész →</Link>
            </div>
            <div className="autok-racs">
                {alkatreszek.map((a, i) => <AlkatreszKartya key={a._id} alkatresz={a} kesleltetes={i} />)}
            </div>
        </section>
    );
};

const Reszletek = ({ auto, hasonlok, munkatars }) => {
    const adatok = useMemo(() => muszakiAdatok(auto), [auto]);
    const felszereltseg = useMemo(() => felszereltsegCsoportositasa(auto.felszereltseg || []), [auto.felszereltseg]);
    const nev = autoNev(auto);
    const elkelt = auto.statusz === 'elkelt';

    useSeo({
        cim: `${nev} (${auto.evjarat}) – ${formatAr(auto.vetel_ar)}`,
        leiras: [
            `${nev} eladó: ${auto.evjarat}, ${formatSzam(auto.kmora_allas)} km, ${auto.uzemanyag}`,
            auto.valto, `${auto.teljesitmeny} LE`, auto.kivitel, auto.telephely?.varos,
        ].filter(Boolean).join(', ') + '.',
        kep: auto.kep,
        utvonal: `/autok/${auto.slug}`,
        tipus: 'product',
        jsonLd: strukturaltAdat(auto),
    });

    const fontos = [
        ['Évjárat', auto.evjarat],
        ['Futás', `${formatSzam(auto.kmora_allas)} km`],
        ['Üzemanyag', auto.uzemanyag],
        ['Váltó', auto.valto || '—'],
        ['Teljesítmény', `${formatSzam(auto.teljesitmeny)} LE`],
        ['Hajtás', auto.hajtas || '—'],
    ];

    return (
        <main className="oldal reszletek">
            <nav className="morzsa" aria-label="Morzsamenü">
                <Link to="/">Főoldal</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to="/autok">Kínálat</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to={`/autok?marka=${encodeURIComponent(auto.marka)}`}>{auto.marka}</Link>
                <Ikon nev="jobbra" meret={14} />
                <span aria-current="page">{auto.modell}</span>
            </nav>

            {elkelt && (
                <p className="reszletek-elkelt" role="status">
                    Ez az autó már elkelt. <Link to={`/autok?marka=${encodeURIComponent(auto.marka)}`}>Nézd meg a hasonló kínálatot →</Link>
                </p>
            )}

            <div className="reszletek-fo">
                <Galeria
                    kepek={auto.kepek}
                    nev={nev}
                    cimkek={(
                        <div className="auto-cimkek">
                            {auto.kiemelt && <span className="auto-cimke auto-cimke-kiemelt"><Ikon nev="csillag" meret={12} kitoltes /> Kiemelt</span>}
                            {auto.statusz !== 'elerheto' && <span className={`auto-cimke auto-cimke-${auto.statusz}`}>{STATUSZOK[auto.statusz]}</span>}
                            {auto.uj && auto.statusz === 'elerheto' && <span className="auto-cimke auto-cimke-uj">Új hirdetés</span>}
                        </div>
                    )}
                />

                <aside className="reszletek-panel uveg">
                    <p className="auto-marka">{auto.marka}</p>
                    <h1>{auto.modell}</h1>
                    <p className="reszletek-alcim">
                        {[auto.evjarat, auto.kivitel, auto.szin].filter(Boolean).join(' · ')}
                    </p>

                    <div className="reszletek-ar">
                        <strong>{formatAr(auto.vetel_ar)}</strong>
                        {!elkelt && auto.vetel_ar > 500000 && (
                            <a href="#finanszirozas">Havi {formatSzam(legkisebbHaviReszlet(auto.vetel_ar))} Ft-tól*</a>
                        )}
                    </div>

                    <dl className="reszletek-fontos">
                        {fontos.map(([cimke, ertek]) => (
                            <div key={cimke}><dt>{cimke}</dt><dd>{ertek}</dd></div>
                        ))}
                    </dl>

                    <div className="reszletek-jelvenyek">
                        {auto.garancia_honap > 0 && <span><Ikon nev="pajzs" meret={15} /> {auto.garancia_honap} hónap garancia</span>}
                        {auto.szervizkonyv && <span><Ikon nev="szerviz" meret={15} /> Vezetett szervizkönyv</span>}
                        {auto.serulesmentes && <span><Ikon nev="pipa" meret={15} /> Sérülésmentes</span>}
                        {auto.tulajdonosok_szama === 1 && <span><Ikon nev="kulcs" meret={15} /> Első tulajdonostól</span>}
                    </div>

                    {!elkelt && (
                        <div className="reszletek-cta">
                            <a className="gomb gomb-fo" href="#erdeklodes"><Ikon nev="level" meret={16} /> Érdekel az autó</a>
                            <TelefonGomb auto={auto} munkatars={munkatars} />
                        </div>
                    )}

                    <div className="reszletek-muveletek">
                        <KedvencGomb auto={auto} cimkevel />
                        <OsszehasonlitasGomb auto={auto} cimkevel />
                    </div>
                    <Megosztas auto={auto} />

                    {munkatars && (
                        <Link className="gomb gomb-uveg gomb-kicsi reszletek-admin" to={`/admin/autok/${auto._id}`}>
                            <Ikon nev="szerkeszt" meret={15} /> Hirdetés szerkesztése
                        </Link>
                    )}

                    {auto.telephely && (
                        <p className="reszletek-hely">
                            <Ikon nev="terkep" meret={15} /> {auto.telephely.nev}, {auto.telephely.varos}
                        </p>
                    )}
                </aside>
            </div>

            <div className="reszletek-tartalom">
                <section className="reszletek-blokk" aria-labelledby="adatok-cim">
                    <h2 id="adatok-cim">Műszaki adatok és előélet</h2>
                    <dl className="adatlap">
                        {adatok.map(([cimke, ertek]) => (
                            <div key={cimke}><dt>{cimke}</dt><dd>{ertek}</dd></div>
                        ))}
                    </dl>
                </section>

                {felszereltseg.length > 0 && (
                    <section className="reszletek-blokk" aria-labelledby="felszereltseg-cim">
                        <h2 id="felszereltseg-cim">Felszereltség <small>{auto.felszereltseg.length} tétel</small></h2>
                        <div className="felszereltseg">
                            {felszereltseg.map(([cim, elemek]) => (
                                <div key={cim}>
                                    <h3>{cim}</h3>
                                    <ul>
                                        {elemek.map((elem) => <li key={elem}><Ikon nev="pipa" meret={15} /> {elem}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {auto.leiras && (
                    <section className="reszletek-blokk" aria-labelledby="leiras-cim">
                        <h2 id="leiras-cim">Leírás</h2>
                        <p className="reszletek-leiras">{auto.leiras}</p>
                    </section>
                )}

                {!elkelt && (
                    <section className="reszletek-blokk nyomtatasban-rejtett" id="finanszirozas" aria-labelledby="hitel-cim">
                        <h2 id="hitel-cim">Finanszírozás</h2>
                        <HitelKalkulator ar={auto.vetel_ar} />
                    </section>
                )}

                <section className="reszletek-blokk reszletek-kapcsolat" id="erdeklodes" aria-labelledby="erdeklodes-cim">
                    <div className="uveg reszletek-urlap nyomtatasban-rejtett">
                        <h2 id="erdeklodes-cim">Érdekel az autó?</h2>
                        <p>Írj nekünk, és munkaidőben hamarosan visszajelzünk – akár próbaút-időponttal.</p>
                        {elkelt ? <p className="uzenet uzenet-hiba">Erre az autóra már nem fogadunk érdeklődést.</p> : <ErdeklodesUrlap auto={auto} />}
                    </div>
                    {auto.telephely && (
                        <div className="uveg reszletek-telephely">
                            <h2>Megtekinthető itt</h2>
                            <TelephelyInfo telephely={auto.telephely} />
                        </div>
                    )}
                </section>

                <IlloAlkatreszek auto={auto} />

                {hasonlok.length > 0 && (
                    <section className="reszletek-blokk nyomtatasban-rejtett" aria-labelledby="hasonlo-cim">
                        <h2 id="hasonlo-cim">Hasonló autók</h2>
                        <div className="autok-racs">
                            {hasonlok.map((elem, i) => <AutoKartya key={elem._id} auto={elem} kesleltetes={i} />)}
                        </div>
                    </section>
                )}

                <p className="csak-nyomtatas">
                    {CEG.nev} · {window.location.origin}/autok/{auto.slug}
                    {auto.telephely?.telefon && ` · ${auto.telephely.telefon}`}
                </p>
            </div>
        </main>
    );
};

const AutoReszletek = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { munkatars } = useAuth();
    const [adat, setAdat] = useState({ slug: null, auto: null, hasonlok: [], hiba: null });

    useEffect(() => {
        const controller = new AbortController();
        apiKeres(`/autok/${encodeURIComponent(slug)}`, { signal: controller.signal }, 'Az autó betöltése nem sikerült.')
            .then((data) => {
                setAdat({ slug, auto: data.auto, hasonlok: data.hasonlok || [], hiba: null });
                // Régi vagy elírt URL → a kanonikus címre irányítunk.
                if (data.auto.slug !== slug) navigate(`/autok/${data.auto.slug}`, { replace: true });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setAdat({ slug, auto: null, hasonlok: [], hiba: error });
            });
        return () => controller.abort();
    }, [slug, navigate]);

    // Megtekintés számlálása munkamenetenként egyszer (munkatársét nem számoljuk).
    const autoId = adat.auto?._id;
    useEffect(() => {
        if (!autoId || munkatars) return;
        const lattam = olvas('veltrix-megtekintett', [], 'session');
        if (lattam.includes(autoId)) return;
        ir('veltrix-megtekintett', [...lattam, autoId].slice(-200), 'session');
        apiKeres(`/autok/${autoId}/esemeny`, { method: 'POST', body: { tipus: 'megtekintes' } }).catch(() => {});
    }, [autoId, munkatars]);

    const aktualis = adat.slug === slug || adat.auto?.slug === slug;
    if (!aktualis) {
        return <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Adatlap betöltése…</main>;
    }
    if (adat.hiba?.status === 404) return <NemTalalhato cim="Ez a hirdetés nem található" szoveg="Lehet, hogy az autó már elkelt, vagy a hirdetés lejárt." />;
    if (adat.hiba) {
        return (
            <main className="oldal">
                <div className="allapot-doboz uveg" role="alert">
                    <h1>Most nem érjük el az adatlapot</h1>
                    <p>{adat.hiba.message}</p>
                    <button className="gomb gomb-uveg" type="button" onClick={() => window.location.reload()}>Újrapróbálom</button>
                </div>
            </main>
        );
    }
    return <Reszletek key={adat.auto._id} auto={adat.auto} hasonlok={adat.hasonlok} munkatars={munkatars} />;
};

export default AutoReszletek;
