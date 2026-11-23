import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlkatreszKartya, { ArKijelzes, KosarbaGomb } from '../components/AlkatreszKartya';
import Galeria from '../components/Galeria';
import Ikon from '../components/Ikon';
import { useFelhasznalo } from '../context/felhasznalo';
import { useKosar } from '../context/kosar';
import { apiKeres } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { alkatreszUrl, ft, keszletSzoveg, kompatibilitasSzoveg } from '../lib/webshop';
import NemTalalhato from './NemTalalhato';
import './AutoReszletek.css';
import './Webshop.css';

// a ténylegesen fizetendő ár
const aktualisAr = (alkatresz) => {
    if (alkatresz.akcios) {
        return alkatresz.akciosAr;
    }
    return alkatresz.ar;
};

// strukturált adat a Google-nek (schema.org Product)
const strukturaltAdat = (a) => {
    let leiras = a.rovidLeiras;
    if (!leiras && a.leiras) {
        leiras = a.leiras.slice(0, 300);
    }

    let elerhetoseg = 'https://schema.org/OutOfStock';
    if (a.keszlet > 0) {
        elerhetoseg = 'https://schema.org/InStock';
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: a.nev,
        sku: a.cikkszam,
        brand: { '@type': 'Brand', name: a.gyarto },
        category: a.kategoriaNev,
        image: a.kepek.map((kep) => kep.url),
        description: leiras || undefined,
        offers: {
            '@type': 'Offer',
            priceCurrency: 'HUF',
            price: aktualisAr(a),
            availability: elerhetoseg,
            itemCondition: 'https://schema.org/NewCondition',
            url: window.location.origin + alkatreszUrl(a),
        },
    };
};

// link a webshop listához, ami erre az autóra szűr
const kompatibilitasLink = (sor) => {
    let link = '/alkatreszek?autoMarka=' + encodeURIComponent(sor.marka);
    if (sor.modell) {
        link += '&autoModell=' + encodeURIComponent(sor.modell);
    }
    return link;
};

// darabszám választó (- és + gombbal)
const MennyisegValaszto = ({ ertek, max, onValtozas }) => {
    const kevesebb = () => {
        if (ertek > 1) {
            onValtozas(ertek - 1);
        }
    };

    const tobb = () => {
        if (ertek < max) {
            onValtozas(ertek + 1);
        }
    };

    // beírt szám: legalább 1 és legfeljebb max
    const beiras = (event) => {
        let szam = Number.parseInt(event.target.value, 10) || 1;
        if (szam < 1) {
            szam = 1;
        }
        if (szam > max) {
            szam = Math.max(1, max);
        }
        onValtozas(szam);
    };

    return (
        <div className="mennyiseg" role="group" aria-label="Mennyiség">
            <button type="button" className="ikon-gomb" onClick={kevesebb} disabled={ertek <= 1} aria-label="Eggyel kevesebb">
                <Ikon nev="minusz" meret={16} />
            </button>
            <input className="bemenet" type="number" inputMode="numeric" min={1} max={max} value={ertek} aria-label="Darabszám" onChange={beiras} />
            <button type="button" className="ikon-gomb" onClick={tobb} disabled={ertek >= max} aria-label="Eggyel több">
                <Ikon nev="plusz" meret={16} />
            </button>
        </div>
    );
};

// a termék adatlapja
const Reszletek = ({ alkatresz: a, kapcsolodok, munkatars }) => {
    const { mennyiseg: kosarban } = useKosar();
    const [darab, setDarab] = useState(1);
    const keszlet = keszletSzoveg(a.keszlet);

    // ennyit lehet még a kosárba tenni (max 99)
    let maxDarab = Math.min(99, a.keszlet - kosarban(a._id));
    if (maxDarab < 0) {
        maxDarab = 0;
    }
    // a kiválasztott darab nem lehet több a maximumnál
    const valasztottDarab = Math.max(1, Math.min(darab, maxDarab));

    useSeo({
        cim: a.nev + ' – ' + a.gyarto + ' (' + a.cikkszam + ')',
        leiras: a.rovidLeiras || a.gyarto + ' ' + a.nev + ' – ' + a.kategoriaNev + '. Ár: ' + ft(aktualisAr(a)) + '.',
        kep: a.kep,
        utvonal: alkatreszUrl(a),
        tipus: 'product',
        jsonLd: strukturaltAdat(a),
    });

    return (
        <main className="oldal reszletek alkatresz-reszletek">
            <nav className="morzsa" aria-label="Morzsamenü">
                <Link to="/">Főoldal</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to="/alkatreszek">Tuning alkatrészek</Link>
                <Ikon nev="jobbra" meret={14} />
                <Link to={'/alkatreszek?kategoria=' + a.kategoria}>{a.kategoriaNev}</Link>
                <Ikon nev="jobbra" meret={14} />
                <span aria-current="page">{a.nev}</span>
            </nav>

            {munkatars && !a.lathato && <p className="reszletek-elkelt" role="status">Ez a termék rejtett – a vásárlók nem látják.</p>}

            <div className="reszletek-fo">
                {a.kepek.length > 0 ? (
                    <Galeria
                        kepek={a.kepek}
                        nev={a.nev}
                        cimkek={a.akcios ? <div className="auto-cimkek"><span className="auto-cimke alkatresz-cimke-akcio">Akció</span></div> : null}
                    />
                ) : <div className="galeria"><div className="galeria-fo auto-kep-hiany">VELTRIX</div></div>}

                <aside className="reszletek-panel uveg">
                    <p className="auto-marka">{a.gyarto} · {a.kategoriaNev}</p>
                    <h1>{a.nev}</h1>
                    <p className="reszletek-alcim">Cikkszám: {a.cikkszam}</p>

                    <div className="reszletek-ar alkatresz-reszletek-ar">
                        <ArKijelzes alkatresz={a} />
                        {a.akcios && <span className="alkatresz-megtakaritas">Megtakarítás: {ft(a.ar - a.akciosAr)}</span>}
                    </div>
                    <p className={'alkatresz-keszlet keszlet-' + keszlet.tipus}><Ikon nev="csomag" meret={15} /> {keszlet.szoveg}</p>

                    {a.rovidLeiras && <p className="alkatresz-panel-leiras">{a.rovidLeiras}</p>}

                    {a.keszlet > 0 && (
                        <div className="alkatresz-vasarlas">
                            {maxDarab > 0
                                ? <MennyisegValaszto ertek={Math.min(darab, maxDarab)} max={maxDarab} onValtozas={setDarab} />
                                : <p className="alkatresz-kosarban">A teljes készlet a kosaradban van.</p>}
                            <KosarbaGomb alkatresz={a} mennyiseg={valasztottDarab} nagy />
                        </div>
                    )}
                    {kosarban(a._id) > 0 && <Link className="szoveg-gomb" to="/kosar">{kosarban(a._id)} db a kosaradban – Kosár megtekintése →</Link>}

                    <div className="reszletek-jelvenyek">
                        <span><Ikon nev="csomag" meret={15} /> Futárral 100 000 Ft felett ingyen</span>
                        <span><Ikon nev="terkep" meret={15} /> Személyes átvétel telephelyünkön</span>
                        <span><Ikon nev="szerviz" meret={15} /> Beszerelést is vállalunk</span>
                    </div>

                    {munkatars && (
                        <Link className="gomb gomb-uveg gomb-kicsi reszletek-admin" to={'/admin/alkatreszek/' + a._id}>
                            <Ikon nev="szerkeszt" meret={15} /> Termék szerkesztése
                        </Link>
                    )}
                </aside>
            </div>

            <div className="reszletek-tartalom">
                <section className="reszletek-blokk" aria-labelledby="illik-cim">
                    <h2 id="illik-cim">Mely autókra illik?</h2>
                    {a.univerzalis ? (
                        <p className="alkatresz-univerzalis"><Ikon nev="pipa" meret={16} /> Univerzális termék – a legtöbb autóhoz használható. Kérdés esetén írj nekünk!</p>
                    ) : (
                        <ul className="kompatibilitas-lista">
                            {a.kompatibilitas.map((sor) => (
                                <li key={kompatibilitasSzoveg(sor)}>
                                    <Link to={kompatibilitasLink(sor)}>
                                        <Ikon nev="auto" meret={15} /> {kompatibilitasSzoveg(sor)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {a.parameterek.length > 0 && (
                    <section className="reszletek-blokk" aria-labelledby="parameterek-cim">
                        <h2 id="parameterek-cim">Műszaki adatok</h2>
                        <dl className="adatlap">
                            {a.parameterek.map((parameter) => <div key={parameter.nev}><dt>{parameter.nev}</dt><dd>{parameter.ertek}</dd></div>)}
                        </dl>
                    </section>
                )}

                {a.leiras && (
                    <section className="reszletek-blokk" aria-labelledby="leiras-cim">
                        <h2 id="leiras-cim">Leírás</h2>
                        <p className="reszletek-leiras">{a.leiras}</p>
                    </section>
                )}

                {kapcsolodok.length > 0 && (
                    <section className="reszletek-blokk" aria-labelledby="kapcsolodo-cim">
                        <h2 id="kapcsolodo-cim">Hasonló termékek</h2>
                        <div className="autok-racs">
                            {kapcsolodok.map((elem, i) => <AlkatreszKartya key={elem._id} alkatresz={elem} kesleltetes={i} />)}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
};

// a termék betöltése az URL alapján
const AlkatreszReszletek = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { munkatars } = useFelhasznalo();
    const [adat, setAdat] = useState({ slug: null, alkatresz: null, kapcsolodok: [], hiba: null });

    useEffect(() => {
        const controller = new AbortController();
        apiKeres('/alkatreszek/' + encodeURIComponent(slug), { signal: controller.signal }, 'A termék betöltése nem sikerült.')
            .then((data) => {
                setAdat({ slug: slug, alkatresz: data.alkatresz, kapcsolodok: data.kapcsolodok || [], hiba: null });
                // ha régi a link, átírjuk a helyesre
                if (data.alkatresz.slug !== slug) {
                    navigate('/alkatreszek/' + data.alkatresz.slug, { replace: true });
                }
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setAdat({ slug: slug, alkatresz: null, kapcsolodok: [], hiba: error });
                }
            });
        return () => controller.abort();
    }, [slug, navigate]);

    const aktualis = adat.slug === slug || (adat.alkatresz && adat.alkatresz.slug === slug);
    if (!aktualis) {
        return <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Termék betöltése…</main>;
    }
    if (adat.hiba && adat.hiba.status === 404) {
        return <NemTalalhato cim="Ez a termék nem található" szoveg="Lehet, hogy már nem forgalmazzuk. Nézz körül a többi alkatrész között!" />;
    }
    if (adat.hiba) {
        return (
            <main className="oldal">
                <div className="allapot-doboz uveg" role="alert">
                    <h1>Most nem érjük el a terméket</h1>
                    <p>{adat.hiba.message}</p>
                    <button className="gomb gomb-uveg" type="button" onClick={() => window.location.reload()}>Újrapróbálom</button>
                </div>
            </main>
        );
    }
    return <Reszletek key={adat.alkatresz._id} alkatresz={adat.alkatresz} kapcsolodok={adat.kapcsolodok} munkatars={munkatars} />;
};

export default AlkatreszReszletek;
