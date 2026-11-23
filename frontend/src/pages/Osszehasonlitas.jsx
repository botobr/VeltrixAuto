import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { useOsszehasonlitas } from '../context/osszehasonlitas';
import { apiKeres } from '../lib/api';
import { STATUSZOK, autoNev, autoUrl, formatAr, formatHonap, formatSzam, formatTizedes, igenNem, kepMeret } from '../lib/auto';
import { useSeo } from '../lib/useSeo';
import './Osszehasonlitas.css';

// A táblázat sorai:
// - ertek: kiolvassa az értéket az autóból
// - kiir: hogyan jelenjen meg
// - legjobb: 'min' ha a kisebb a jobb, 'max' ha a nagyobb (ezt kiemeljük)
const SOROK = [
    { cimke: 'Vételár', ertek: (auto) => auto.vetel_ar, kiir: formatAr, legjobb: 'min' },
    { cimke: 'Évjárat', ertek: (auto) => auto.evjarat, kiir: String, legjobb: 'max' },
    { cimke: 'Kilométeróra', ertek: (auto) => auto.kmora_allas, kiir: (szam) => formatSzam(szam) + ' km', legjobb: 'min' },
    { cimke: 'Teljesítmény', ertek: (auto) => auto.teljesitmeny, kiir: (szam) => formatSzam(szam) + ' LE', legjobb: 'max' },
    { cimke: 'Hengerűrtartalom', ertek: (auto) => auto.hengerur_tartalom || null, kiir: (szam) => formatSzam(szam) + ' cm³' },
    { cimke: 'Üzemanyag', ertek: (auto) => auto.uzemanyag, kiir: String },
    { cimke: 'Sebességváltó', ertek: (auto) => auto.valto, kiir: String },
    { cimke: 'Hajtás', ertek: (auto) => auto.hajtas, kiir: String },
    { cimke: 'Kivitel', ertek: (auto) => auto.kivitel, kiir: String },
    { cimke: 'Vegyes fogyasztás', ertek: (auto) => auto.fogyasztas, kiir: fogyasztasKiirasa, legjobb: 'min' },
    { cimke: 'CO₂-kibocsátás', ertek: (auto) => auto.co2, kiir: (szam) => formatSzam(szam) + ' g/km', legjobb: 'min' },
    { cimke: 'Ajtók / ülések', ertek: ajtokEsUlesek, kiir: String },
    { cimke: 'Tulajdonosok', ertek: (auto) => auto.tulajdonosok_szama, kiir: String, legjobb: 'min' },
    { cimke: 'Első forgalomba helyezés', ertek: (auto) => auto.elso_forgalomba_helyezes, kiir: formatHonap },
    { cimke: 'Műszaki vizsga', ertek: (auto) => auto.muszaki_vizsga, kiir: formatHonap },
    { cimke: 'Garancia', ertek: (auto) => auto.garancia_honap, kiir: (honap) => (honap ? honap + ' hónap' : 'Nincs'), legjobb: 'max' },
    { cimke: 'Szervizkönyv', ertek: (auto) => auto.szervizkonyv, kiir: igenNem },
    { cimke: 'Sérülésmentes', ertek: (auto) => auto.serulesmentes, kiir: igenNem },
    { cimke: 'Felszereltség', ertek: felszereltsegSzama, kiir: (db) => db + ' tétel', legjobb: 'max' },
    { cimke: 'Szín', ertek: (auto) => auto.szin, kiir: String },
    { cimke: 'Telephely', ertek: telephelyNeve, kiir: String },
];

function fogyasztasKiirasa(ertek, auto) {
    let egyseg = 'l';
    if (auto.uzemanyag === 'Elektromos') {
        egyseg = 'kWh';
    }
    return formatTizedes(ertek) + ' ' + egyseg + '/100 km';
}

function ajtokEsUlesek(auto) {
    if (!auto.ajtok_szama && !auto.ulesek_szama) {
        return null;
    }
    const ajtok = auto.ajtok_szama !== null && auto.ajtok_szama !== undefined ? auto.ajtok_szama : '–';
    const ulesek = auto.ulesek_szama !== null && auto.ulesek_szama !== undefined ? auto.ulesek_szama : '–';
    return ajtok + ' / ' + ulesek;
}

function felszereltsegSzama(auto) {
    if (!auto.felszereltseg || auto.felszereltseg.length === 0) {
        return null;
    }
    return auto.felszereltseg.length;
}

function telephelyNeve(auto) {
    if (!auto.telephely) {
        return null;
    }
    return auto.telephely.nev + ', ' + auto.telephely.varos;
}

const uresErtek = (ertek) => ertek === null || ertek === undefined || ertek === '';

// autók összehasonlítása táblázatban (max 4 autó)
const Osszehasonlitas = () => {
    const [params, setParams] = useSearchParams();
    const { autok: kivalasztott, eltavolitas } = useOsszehasonlitas();

    // az autók id-jai az URL-ből, vagy ha ott nincs, a kiválasztottak közül
    const idk = useMemo(() => {
        const urlbol = (params.get('autok') || '').split(',').filter((id) => /^[a-f0-9]{24}$/i.test(id));
        if (urlbol.length > 0) {
            return urlbol.slice(0, 4);
        }
        return kivalasztott.map((auto) => auto.id).slice(0, 4);
    }, [params, kivalasztott]);
    const kulcs = idk.join(',');
    const [eredmeny, setEredmeny] = useState({ kulcs: null, autok: [] });

    useSeo({ cim: 'Autók összehasonlítása', noindex: true });

    // az autók betöltése egyenként (ha valamelyik már nem elérhető, kihagyjuk)
    useEffect(() => {
        if (!kulcs) {
            return undefined;
        }
        const controller = new AbortController();

        const betoltes = async () => {
            const autok = [];
            for (const id of kulcs.split(',')) {
                try {
                    const data = await apiKeres('/autok/' + id, { signal: controller.signal });
                    autok.push(data.auto);
                } catch {
                    // ez az autó már nem elérhető
                }
            }
            if (!controller.signal.aborted) {
                setEredmeny({ kulcs: kulcs, autok: autok });
            }
        };
        betoltes();

        return () => controller.abort();
    }, [kulcs]);

    let autok = null;
    if (eredmeny.kulcs === kulcs) {
        autok = eredmeny.autok;
    }

    // soronként a legjobb érték (pl. a legkisebb ár), ezt kiemeljük
    const legjobbak = useMemo(() => {
        const eredmenyek = {};
        if (!autok || autok.length < 2) {
            return eredmenyek;
        }
        for (const sor of SOROK) {
            if (!sor.legjobb) {
                continue;
            }
            const ertekek = autok.map(sor.ertek).filter((ertek) => typeof ertek === 'number');
            if (ertekek.length < 2) {
                continue;
            }
            let legjobb;
            if (sor.legjobb === 'min') {
                legjobb = Math.min(...ertekek);
            } else {
                legjobb = Math.max(...ertekek);
            }
            // ha mindegyik egyforma, nincs mit kiemelni
            const mindEgyforma = ertekek.every((ertek) => ertek === legjobb);
            if (!mindEgyforma) {
                eredmenyek[sor.cimke] = legjobb;
            }
        }
        return eredmenyek;
    }, [autok]);

    const torles = (id) => {
        eltavolitas(id);
        const maradek = idk.filter((elem) => elem !== id);
        if (maradek.length > 0) {
            setParams({ autok: maradek.join(',') }, { replace: true });
        } else {
            setParams({}, { replace: true });
        }
    };

    if (!kulcs) {
        return (
            <main className="oldal">
                <div className="allapot-doboz uveg osszehasonlitas-ures">
                    <span className="allapot-ikon" aria-hidden="true"><Ikon nev="osszehasonlit" meret={22} /></span>
                    <h1>Hasonlíts össze akár 4 autót</h1>
                    <p>A kínálatban a kártyák sarkában lévő <Ikon nev="osszehasonlit" meret={14} /> gombbal jelölj ki autókat, és itt egymás mellett láthatod az adataikat.</p>
                    <Link className="gomb gomb-fo" to="/autok">Kínálat böngészése</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="oldal osszehasonlitas">
            <header className="osszehasonlitas-fejlec beuszas">
                <p className="felirat">Összehasonlítás</p>
                <h1>Melyik legyen <span className="gradiens-szoveg">a tiéd?</span></h1>
                <p>A soronként legjobb értéket kiemeljük. A link megosztható, a kiválasztás a böngésződben marad meg.</p>
            </header>

            {!autok && <div className="betoltes"><span className="porgo" aria-hidden="true" />Betöltés…</div>}

            {autok && autok.length === 0 && (
                <div className="allapot-doboz uveg"><h2>A kiválasztott autók már nem elérhetők.</h2><Link className="gomb gomb-fo" to="/autok">Kínálat</Link></div>
            )}

            {autok && autok.length > 0 && (
                <div className="osszehasonlitas-gorgeto">
                    <table className="osszehasonlitas-tabla" style={{ '--oszlopok': autok.length }}>
                        <thead>
                            <tr>
                                <th scope="col"><span className="sr-only">Tulajdonság</span></th>
                                {autok.map((auto) => (
                                    <th scope="col" key={auto._id}>
                                        <div className="osszehasonlitas-auto">
                                            <button className="ikon-gomb osszehasonlitas-torles" type="button" onClick={() => torles(auto._id)} aria-label={autoNev(auto) + ' eltávolítása'}>
                                                <Ikon nev="x" meret={14} />
                                            </button>
                                            <Link to={autoUrl(auto)}>
                                                {auto.kep ? <img src={kepMeret(auto.kep, 480)} alt="" /> : <span className="osszehasonlitas-kep-hiany">VELTRIX</span>}
                                                <span className="auto-marka">{auto.marka}</span>
                                                <strong>{auto.modell}</strong>
                                            </Link>
                                            {auto.statusz !== 'elerheto' && <span className={'auto-cimke auto-cimke-' + auto.statusz}>{STATUSZOK[auto.statusz]}</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SOROK.map((sor) => {
                                const ertekek = autok.map(sor.ertek);
                                // ha egyik autónál sincs megadva, a sort nem mutatjuk
                                if (ertekek.every(uresErtek)) {
                                    return null;
                                }
                                return (
                                    <tr key={sor.cimke}>
                                        <th scope="row">{sor.cimke}</th>
                                        {autok.map((auto, i) => {
                                            const ertek = ertekek[i];
                                            const ures = uresErtek(ertek);
                                            const legjobb = !ures && legjobbak[sor.cimke] === ertek;
                                            return (
                                                <td key={auto._id} className={legjobb ? 'legjobb' : ''}>
                                                    {ures ? <span className="halvany">—</span> : sor.kiir(ertek, auto)}
                                                    {legjobb && <Ikon nev="csillag" meret={12} kitoltes />}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            <tr>
                                <th scope="row"><span className="sr-only">Művelet</span></th>
                                {autok.map((auto) => (
                                    <td key={auto._id}><Link className="gomb gomb-fo gomb-kicsi" to={autoUrl(auto) + '#erdeklodes'}>Érdekel</Link></td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
};

export default Osszehasonlitas;
