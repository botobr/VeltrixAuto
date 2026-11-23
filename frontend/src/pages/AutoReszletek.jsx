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
import { useFelhasznalo } from '../context/felhasznalo';
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

// Strukturált adat a Google-nek (schema.org Car), hogy a keresőben szebben jelenjen meg.
// Az undefined mezők kimaradnak a JSON-ból.
const strukturaltAdat = (auto) => {
    const url = window.location.origin + '/autok/' + auto.slug;
    const telephely = auto.telephely;

    let eladoNeve = CEG.nev;
    let eladoTelefon;
    let cim;
    if (telephely) {
        if (telephely.nev) {
            eladoNeve = CEG.nev + ' – ' + telephely.nev;
        }
        eladoTelefon = telephely.telefon || undefined;
        cim = {
            '@type': 'PostalAddress',
            streetAddress: telephely.cim,
            addressLocality: telephely.varos,
            postalCode: telephely.iranyitoszam || undefined,
            addressRegion: telephely.megye,
            addressCountry: 'HU',
        };
    }

    let hengerur;
    if (auto.hengerur_tartalom) {
        hengerur = { '@type': 'QuantitativeValue', value: auto.hengerur_tartalom, unitCode: 'CMQ' };
    }

    let elsoForgalomba;
    if (auto.elso_forgalomba_helyezes) {
        elsoForgalomba = auto.elso_forgalomba_helyezes.slice(0, 10);
    }

    let tulajdonosok;
    if (auto.tulajdonosok_szama !== null && auto.tulajdonosok_szama !== undefined) {
        tulajdonosok = auto.tulajdonosok_szama;
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'Car',
        name: autoNev(auto) + ' (' + auto.evjarat + ')',
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
        numberOfPreviousOwners: tulajdonosok,
        dateVehicleFirstRegistered: elsoForgalomba,
        mileageFromOdometer: { '@type': 'QuantitativeValue', value: auto.kmora_allas, unitCode: 'KMT' },
        vehicleEngine: {
            '@type': 'EngineSpecification',
            enginePower: { '@type': 'QuantitativeValue', value: auto.teljesitmeny, unitCode: 'BHP' },
            engineDisplacement: hengerur,
        },
        image: auto.kepek.map((kep) => kep.url),
        description: auto.leiras || undefined,
        url: url,
        offers: {
            '@type': 'Offer',
            price: auto.vetel_ar,
            priceCurrency: 'HUF',
            availability: ELERHETOSEG[auto.statusz] || ELERHETOSEG.elerheto,
            url: url,
            seller: {
                '@type': 'AutoDealer',
                name: eladoNeve,
                telephone: eladoTelefon,
                address: cim,
            },
        },
    };
};

// A felszereltség csoportosítása (Kényelem, Biztonság, ...).
// Ami egyik csoportba sem tartozik, az "Egyéb" lesz.
const felszereltsegCsoportositasa = (lista) => {
    const csoportok = [];
    const besorolt = [];

    for (const cim in FELSZERELTSEG_CSOPORTOK) {
        const talalat = FELSZERELTSEG_CSOPORTOK[cim].filter((elem) => lista.includes(elem));
        if (talalat.length > 0) {
            csoportok.push([cim, talalat]);
            for (const elem of talalat) {
                besorolt.push(elem);
            }
        }
    }

    const egyeb = [];
    for (const elem of lista) {
        if (!besorolt.includes(elem) && !egyeb.includes(elem)) {
            egyeb.push(elem);
        }
    }
    if (egyeb.length > 0) {
        csoportok.push(['Egyéb', egyeb]);
    }
    return csoportok;
};

// a telefonszám csak kattintásra jelenik meg (így meg tudjuk számolni, hányan nézték meg)
const TelefonGomb = ({ auto, munkatars }) => {
    const [lathato, setLathato] = useState(false);

    let telefon = auto.elado_telefonszam;
    if (!telefon && auto.telephely) {
        telefon = auto.telephely.telefon;
    }
    if (!telefon) {
        return null;
    }

    const megjelenites = () => {
        setLathato(true);
        if (!munkatars) {
            apiKeres('/autok/' + auto._id + '/esemeny', { method: 'POST', body: { tipus: 'telefon' } }).catch(() => {});
        }
    };

    if (lathato) {
        return (
            <a className="gomb gomb-uveg reszletek-telefon" href={'tel:' + telefon.replace(/[^\d+]/g, '')}>
                <Ikon nev="telefon" meret={16} /> {telefon}
            </a>
        );
    }
    return (
        <button className="gomb gomb-uveg reszletek-telefon" type="button" onClick={megjelenites}>
            <Ikon nev="telefon" meret={16} /> Telefonszám megjelenítése
        </button>
    );
};

// Az autóhoz illő tuning alkatrészek a webshopból. Ha nincs ilyen, nem jelenik meg.
const IlloAlkatreszek = ({ auto }) => {
    const [alkatreszek, setAlkatreszek] = useState([]);

    useEffect(() => {
        apiKeres('/alkatreszek/autohoz/' + auto._id)
            .then((data) => setAlkatreszek(data.alkatreszek))
            .catch(() => setAlkatreszek([]));
    }, [auto._id]);

    if (alkatreszek.length === 0) {
        return null;
    }

    const link = '/alkatreszek?autoMarka=' + encodeURIComponent(auto.marka)
        + '&autoModell=' + encodeURIComponent(auto.modell)
        + '&autoEvjarat=' + auto.evjarat;
    return (
        <section className="reszletek-blokk nyomtatasban-rejtett" aria-labelledby="tuning-cim">
            <div className="illo-alkatreszek-fej">
                <h2 id="tuning-cim">Tuning alkatrészek ehhez az autóhoz</h2>
                <Link className="szoveg-gomb" to={link}>Összes illő alkatrész →</Link>
            </div>
            <div className="autok-racs">
                {alkatreszek.map((alkatresz, i) => <AlkatreszKartya key={alkatresz._id} alkatresz={alkatresz} kesleltetes={i} />)}
            </div>
        </section>
    );
};

// az autó adatlapja
const Reszletek = ({ auto, hasonlok, munkatars }) => {
    const adatok = useMemo(() => muszakiAdatok(auto), [auto]);
    const felszereltseg = useMemo(() => felszereltsegCsoportositasa(auto.felszereltseg || []), [auto.felszereltseg]);
    const nev = autoNev(auto);
    const elkelt = auto.statusz === 'elkelt';
    const varos = auto.telephely ? auto.telephely.varos : null;

    // a keresőknek szóló leírás, pl. "BMW 320d eladó: 2019, 85 000 km, Dízel, Automata, 190 LE, Sedan, Budaörs."
    const leirasReszek = [nev + ' eladó: ' + auto.evjarat + ', ' + formatSzam(auto.kmora_allas) + ' km, ' + auto.uzemanyag];
    if (auto.valto) {
        leirasReszek.push(auto.valto);
    }
    leirasReszek.push(auto.teljesitmeny + ' LE');
    if (auto.kivitel) {
        leirasReszek.push(auto.kivitel);
    }
    if (varos) {
        leirasReszek.push(varos);
    }

    useSeo({
        cim: nev + ' (' + auto.evjarat + ') – ' + formatAr(auto.vetel_ar),
        leiras: leirasReszek.join(', ') + '.',
        kep: auto.kep,
        utvonal: '/autok/' + auto.slug,
        tipus: 'product',
        jsonLd: strukturaltAdat(auto),
    });

    // a legfontosabb adatok a jobb oldali panelen
    const fontos = [
        ['Évjárat', auto.evjarat],
        ['Futás', formatSzam(auto.kmora_allas) + ' km'],
        ['Üzemanyag', auto.uzemanyag],
        ['Váltó', auto.valto || '—'],
        ['Teljesítmény', formatSzam(auto.teljesitmeny) + ' LE'],
        ['Hajtás', auto.hajtas || '—'],
    ];

    const alcim = [auto.evjarat, auto.kivitel, auto.szin].filter((resz) => resz).join(' · ');
    const markaLink = '/autok?marka=' + encodeURIComponent(auto.marka);

    return (
        <main className="oldal reszletek">
            <nav className="morzsa" aria-label="Morzsamenü">
                <Link to="/">Főoldal</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to="/autok">Kínálat</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to={markaLink}>{auto.marka}</Link>
                <Ikon nev="jobbra" meret={14} />
                <span aria-current="page">{auto.modell}</span>
            </nav>

            {elkelt && (
                <p className="reszletek-elkelt" role="status">
                    Ez az autó már elkelt. <Link to={markaLink}>Nézd meg a hasonló kínálatot →</Link>
                </p>
            )}

            <div className="reszletek-fo">
                <Galeria
                    kepek={auto.kepek}
                    nev={nev}
                    cimkek={(
                        <div className="auto-cimkek">
                            {auto.kiemelt && <span className="auto-cimke auto-cimke-kiemelt"><Ikon nev="csillag" meret={12} kitoltes /> Kiemelt</span>}
                            {auto.statusz !== 'elerheto' && <span className={'auto-cimke auto-cimke-' + auto.statusz}>{STATUSZOK[auto.statusz]}</span>}
                            {auto.uj && auto.statusz === 'elerheto' && <span className="auto-cimke auto-cimke-uj">Új hirdetés</span>}
                        </div>
                    )}
                />

                <aside className="reszletek-panel uveg">
                    <p className="auto-marka">{auto.marka}</p>
                    <h1>{auto.modell}</h1>
                    <p className="reszletek-alcim">{alcim}</p>

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
                        <Link className="gomb gomb-uveg gomb-kicsi reszletek-admin" to={'/admin/autok/' + auto._id}>
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
                    {auto.telephely && auto.telephely.telefon && ' · ' + auto.telephely.telefon}
                </p>
            </div>
        </main>
    );
};

// az adatlap betöltése az URL alapján
const AutoReszletek = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { munkatars } = useFelhasznalo();
    const [adat, setAdat] = useState({ slug: null, auto: null, hasonlok: [], hiba: null });

    useEffect(() => {
        const controller = new AbortController();
        apiKeres('/autok/' + encodeURIComponent(slug), { signal: controller.signal }, 'Az autó betöltése nem sikerült.')
            .then((data) => {
                setAdat({ slug: slug, auto: data.auto, hasonlok: data.hasonlok || [], hiba: null });
                // ha régi vagy elírt a link, átírjuk a helyesre
                if (data.auto.slug !== slug) {
                    navigate('/autok/' + data.auto.slug, { replace: true });
                }
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setAdat({ slug: slug, auto: null, hasonlok: [], hiba: error });
                }
            });
        return () => controller.abort();
    }, [slug, navigate]);

    // A megtekintést munkamenetenként csak egyszer számoljuk (a munkatársét nem).
    // A már megnézett autókat a sessionStorage-ban tároljuk.
    const autoId = adat.auto ? adat.auto._id : null;
    useEffect(() => {
        if (!autoId || munkatars) {
            return;
        }
        const megnezett = olvas('veltrix-megtekintett', [], 'session');
        if (megnezett.includes(autoId)) {
            return;
        }
        megnezett.push(autoId);
        ir('veltrix-megtekintett', megnezett.slice(-200), 'session');
        apiKeres('/autok/' + autoId + '/esemeny', { method: 'POST', body: { tipus: 'megtekintes' } }).catch(() => {});
    }, [autoId, munkatars]);

    // még a régi autó adatai vannak betöltve
    const aktualis = adat.slug === slug || (adat.auto && adat.auto.slug === slug);
    if (!aktualis) {
        return <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Adatlap betöltése…</main>;
    }
    if (adat.hiba && adat.hiba.status === 404) {
        return <NemTalalhato cim="Ez a hirdetés nem található" szoveg="Lehet, hogy az autó már elkelt, vagy a hirdetés lejárt." />;
    }
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
