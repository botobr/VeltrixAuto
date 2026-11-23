import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { apiKeres } from '../lib/api';
import { formatDatumIdo, kepMeret } from '../lib/auto';
import { useSeo } from '../lib/useSeo';
import { ft } from '../lib/webshop';
import { Osszesito } from './Kosar';
import './Webshop.css';

const LEPESEK = {
    futar: ['uj', 'feldolgozas', 'feladva', 'teljesitve'],
    szemelyes: ['uj', 'feldolgozas', 'atveheto', 'teljesitve'],
};
const LEPES_NEV = { uj: 'Beérkezett', feldolgozas: 'Összekészítés', feladva: 'Feladva', atveheto: 'Átvehető', teljesitve: 'Teljesítve' };

// egy cím egy sorban, pl. "Nagy Péter, 1111 Budapest, Fő utca 1."
const cimSor = (cim) => {
    if (!cim) {
        return '';
    }
    const reszek = [];
    if (cim.nev) {
        reszek.push(cim.nev);
    }
    if (cim.adoszam) {
        reszek.push('adószám: ' + cim.adoszam);
    }
    const varos = [cim.iranyitoszam, cim.varos].filter((resz) => resz).join(' ');
    if (varos) {
        reszek.push(varos);
    }
    if (cim.cim) {
        reszek.push(cim.cim);
    }
    return reszek.join(', ');
};

// A rendelés visszaigazolása és állapota (a vevő e-mailben is megkapja a linkjét).
const Rendeles = () => {
    const { szam } = useParams();
    const [params] = useSearchParams();
    const kulcs = params.get('kulcs') || '';
    const fizetesVissza = params.get('fizetes');
    const [allapot, setAllapot] = useState({ rendeles: null, hiba: '' });
    const [fizetesInditas, setFizetesInditas] = useState(false);
    const [frissites, setFrissites] = useState(0);

    useSeo({ cim: 'Rendelés ' + szam, noindex: true });

    useEffect(() => {
        const url = '/rendelesek/' + encodeURIComponent(szam) + '?kulcs=' + encodeURIComponent(kulcs);
        apiKeres(url, {}, 'A rendelés betöltése nem sikerült.')
            .then((data) => {
                setAllapot({ rendeles: data.rendeles, hiba: '' });
            })
            .catch((error) => {
                let uzenet = error.message;
                if (error.status === 404) {
                    uzenet = 'A rendelés nem található, vagy a link érvénytelen.';
                }
                setAllapot({ rendeles: null, hiba: uzenet });
            });
    }, [szam, kulcs, frissites]);

    // Kártyás fizetés után a Stripe visszajelzése pár másodperc múlva ér ide,
    // addig 2 másodpercenként újra lekérjük a rendelést (max 10-szer).
    let varakozas = false;
    if (fizetesVissza === 'siker' && allapot.rendeles) {
        varakozas = allapot.rendeles.fizetes.statusz === 'fuggo' && allapot.rendeles.statusz === 'fizetesre_var';
    }
    useEffect(() => {
        if (!varakozas || frissites >= 10) {
            return undefined;
        }
        const idozito = setTimeout(() => {
            setFrissites((szamlalo) => szamlalo + 1);
        }, 2000);
        return () => clearTimeout(idozito);
    }, [varakozas, frissites]);

    // megszakadt kártyás fizetés újraindítása
    const ujraFizetes = async () => {
        setFizetesInditas(true);
        try {
            const url = '/rendelesek/' + encodeURIComponent(szam) + '/fizetes?kulcs=' + encodeURIComponent(kulcs);
            const valasz = await apiKeres(url, { method: 'POST' }, 'A fizetés nem indítható.');
            window.location.assign(valasz.fizetesUrl);
        } catch (error) {
            setAllapot((elozo) => ({ ...elozo, hiba: error.message }));
            setFizetesInditas(false);
        }
    };

    const r = allapot.rendeles;
    const hiba = allapot.hiba;
    if (!r) {
        if (hiba) {
            return (
                <main className="oldal">
                    <div className="allapot-doboz uveg" role="alert">
                        <h1>Hoppá</h1>
                        <p>{hiba}</p>
                        <Link className="gomb gomb-uveg" to="/alkatreszek">Vissza a webshopba</Link>
                    </div>
                </main>
            );
        }
        return <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Rendelés betöltése…</main>;
    }

    const lepesek = LEPESEK[r.szallitas.mod];
    const aktualisLepes = lepesek.indexOf(r.statusz);
    const lemondva = r.statusz === 'lemondva';

    // az oldal címe az állapottól függ
    let cim = r.statuszNev;
    if (lemondva) {
        cim = 'A rendelés lemondva';
    } else if (r.statusz === 'fizetesre_var') {
        cim = varakozas ? 'Fizetés ellenőrzése…' : 'Fizetésre vár';
    } else if (params.get('uj') || fizetesVissza === 'siker') {
        cim = <>Köszönjük a <span className="gradiens-szoveg">rendelésed!</span></>;
    }

    // a lépés osztálya: kész / aktuális / még nem
    const lepesOsztaly = (i) => {
        if (i < aktualisLepes) {
            return 'kesz';
        }
        if (i === aktualisLepes) {
            return 'aktualis';
        }
        return '';
    };

    return (
        <main className="oldal rendeles-oldal">
            <header className="webshop-fejlec">
                <p className="felirat">Rendelés · {r.rendelesSzam}</p>
                <h1>{cim}</h1>
                <p className="rendeles-alcim">Leadva: {formatDatumIdo(r.createdAt)} · visszaigazolást küldtünk ide: <strong>{r.vevo.email}</strong></p>
            </header>

            {fizetesVissza === 'megszakitva' && r.statusz === 'fizetesre_var' && (
                <p className="uzenet admin-figyelmeztetes" role="status">A fizetés megszakadt. A termékeket 30 percig fenntartjuk – próbáld újra lent.</p>
            )}

            {!lemondva && r.statusz !== 'fizetesre_var' && (
                <ol className="rendeles-lepesek" aria-label="A rendelés állapota">
                    {lepesek.map((lepes, i) => (
                        <li key={lepes} className={lepesOsztaly(i)} aria-current={i === aktualisLepes ? 'step' : undefined}>
                            <span>{i < aktualisLepes ? <Ikon nev="pipa" meret={14} /> : i + 1}</span>
                            {LEPES_NEV[lepes]}
                        </li>
                    ))}
                </ol>
            )}

            <div className="webshop-elrendezes">
                <div className="penztar-lepesek">
                    {r.statusz === 'fizetesre_var' && (
                        <section className="uveg penztar-blokk rendeles-fizetes">
                            {r.fizetes.mod === 'atutalas' ? (
                                <>
                                    <h2>Előre utalás</h2>
                                    {r.atutalas ? (
                                        <dl className="adatlap">
                                            <div><dt>Számlaszám</dt><dd>{r.atutalas.szamlaszam}</dd></div>
                                            {r.atutalas.kedvezmenyezett && <div><dt>Kedvezményezett</dt><dd>{r.atutalas.kedvezmenyezett}</dd></div>}
                                            <div><dt>Összeg</dt><dd>{ft(r.osszegek.vegosszeg)}</dd></div>
                                            <div><dt>Közlemény</dt><dd>{r.atutalas.kozlemeny}</dd></div>
                                        </dl>
                                    ) : <p>Az utalási adatokat e-mailben küldjük el.</p>}
                                    <p className="penztar-sugo">Az összekészítést az utalás beérkezése után kezdjük meg.</p>
                                </>
                            ) : (
                                <>
                                    <h2>Online fizetés</h2>
                                    {varakozas
                                        ? <p><span className="porgo" aria-hidden="true" /> A fizetés visszaigazolására várunk…</p>
                                        : <p>A rendelésed fizetésre vár.</p>}
                                    {r.ujraFizetheto && !varakozas && (
                                        <button className="gomb gomb-fo" type="button" onClick={ujraFizetes} disabled={fizetesInditas}>
                                            <Ikon nev="penz" meret={16} /> {fizetesInditas ? 'Átirányítás…' : 'Fizetés most'}
                                        </button>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    <section className="uveg penztar-blokk">
                        <h2>Tételek</h2>
                        <ul className="rendeles-tetelek">
                            {r.tetelek.map((t) => (
                                <li key={t.alkatresz}>
                                    {t.kep ? <img src={kepMeret(t.kep, 120)} alt="" /> : <span className="top-kep-hiany" />}
                                    <span><Link to={'/alkatreszek/' + t.slug}>{t.nev}</Link><small>{t.cikkszam} · {t.mennyiseg} × {ft(t.egysegar)}</small></span>
                                    <strong>{ft(t.egysegar * t.mennyiseg)}</strong>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="uveg penztar-blokk">
                        <h2>Szállítás és számlázás</h2>
                        <dl className="adatlap">
                            <div><dt>Szállítás</dt><dd>{r.szallitasNev}</dd></div>
                            {r.szallitas.cim && <div><dt>Szállítási cím</dt><dd>{cimSor(r.szallitas.cim)}</dd></div>}
                            {r.szallitas.telephely && <div><dt>Átvételi hely</dt><dd>{r.szallitas.telephely.nev}, {cimSor(r.szallitas.telephely)}</dd></div>}
                            <div><dt>Fizetés</dt><dd>{r.fizetesNev}{r.fizetes.statusz === 'fizetve' && ' · kifizetve'}</dd></div>
                            <div><dt>Számlázási cím</dt><dd>{cimSor(r.szamlazasiCim)}</dd></div>
                            {r.szamla && r.szamla.szam && (
                                <div>
                                    <dt>Számla</dt>
                                    <dd>{r.szamla.szam} – e-mailben elküldtük{r.szamla.sztornoSzam && ' (sztornózva)'}</dd>
                                </div>
                            )}
                            {r.fizetes.visszaterites && r.fizetes.visszaterites.ekkor && (
                                <div><dt>Visszatérítés</dt><dd>A kártyás fizetés összegét visszatérítettük ({formatDatumIdo(r.fizetes.visszaterites.ekkor)}).</dd></div>
                            )}
                            <div><dt>Telefon</dt><dd>{r.vevo.telefon}</dd></div>
                            {r.vevoMegjegyzes && <div><dt>Megjegyzés</dt><dd>{r.vevoMegjegyzes}</dd></div>}
                        </dl>
                    </section>
                </div>

                <aside className="uveg webshop-oldalsav">
                    <h2>Összesen</h2>
                    <Osszesito osszegek={r.osszegek} szallitasKivalasztva />
                    <Link className="gomb gomb-uveg" to="/alkatreszek">Vissza a webshopba</Link>
                </aside>
            </div>
        </main>
    );
};

export default Rendeles;
