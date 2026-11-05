import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { useOsszehasonlitas } from '../context/osszehasonlitas';
import { apiKeres } from '../lib/api';
import { STATUSZOK, autoNev, autoUrl, formatAr, formatHonap, formatSzam, formatTizedes, igenNem, kepMeret } from '../lib/auto';
import { useSeo } from '../lib/useSeo';
import './Osszehasonlitas.css';

/* [címke, érték-kiolvasó, megjelenítés, legjobb: 'min' | 'max' | undefined] */
const SOROK = [
    ['Vételár', (a) => a.vetel_ar, formatAr, 'min'],
    ['Évjárat', (a) => a.evjarat, String, 'max'],
    ['Kilométeróra', (a) => a.kmora_allas, (v) => `${formatSzam(v)} km`, 'min'],
    ['Teljesítmény', (a) => a.teljesitmeny, (v) => `${formatSzam(v)} LE`, 'max'],
    ['Hengerűrtartalom', (a) => a.hengerur_tartalom || null, (v) => `${formatSzam(v)} cm³`],
    ['Üzemanyag', (a) => a.uzemanyag, String],
    ['Sebességváltó', (a) => a.valto, String],
    ['Hajtás', (a) => a.hajtas, String],
    ['Kivitel', (a) => a.kivitel, String],
    ['Vegyes fogyasztás', (a) => a.fogyasztas, (v, a) => `${formatTizedes(v)} ${a.uzemanyag === 'Elektromos' ? 'kWh' : 'l'}/100 km`, 'min'],
    ['CO₂-kibocsátás', (a) => a.co2, (v) => `${formatSzam(v)} g/km`, 'min'],
    ['Ajtók / ülések', (a) => (a.ajtok_szama || a.ulesek_szama ? `${a.ajtok_szama ?? '–'} / ${a.ulesek_szama ?? '–'}` : null), String],
    ['Tulajdonosok', (a) => a.tulajdonosok_szama, String, 'min'],
    ['Első forgalomba helyezés', (a) => a.elso_forgalomba_helyezes, formatHonap],
    ['Műszaki vizsga', (a) => a.muszaki_vizsga, formatHonap],
    ['Garancia', (a) => a.garancia_honap, (v) => (v ? `${v} hónap` : 'Nincs'), 'max'],
    ['Szervizkönyv', (a) => a.szervizkonyv, igenNem],
    ['Sérülésmentes', (a) => a.serulesmentes, igenNem],
    ['Felszereltség', (a) => a.felszereltseg?.length || null, (v) => `${v} tétel`, 'max'],
    ['Szín', (a) => a.szin, String],
    ['Telephely', (a) => (a.telephely ? `${a.telephely.nev}, ${a.telephely.varos}` : null), String],
];

const Osszehasonlitas = () => {
    const [params, setParams] = useSearchParams();
    const { autok: kivalasztott, eltavolitas } = useOsszehasonlitas();
    const idk = useMemo(() => {
        const urlbol = (params.get('autok') || '').split(',').filter((id) => /^[a-f0-9]{24}$/i.test(id));
        return (urlbol.length ? urlbol : kivalasztott.map((auto) => auto.id)).slice(0, 4);
    }, [params, kivalasztott]);
    const kulcs = idk.join(',');
    const [eredmeny, setEredmeny] = useState({ kulcs: null, autok: [] });

    useSeo({ cim: 'Autók összehasonlítása', noindex: true });

    useEffect(() => {
        if (!kulcs) return undefined;
        const controller = new AbortController();
        Promise.all(kulcs.split(',').map((id) => apiKeres(`/autok/${id}`, { signal: controller.signal }).then((d) => d.auto).catch(() => null)))
            .then((autok) => setEredmeny({ kulcs, autok: autok.filter(Boolean) }))
            .catch(() => {});
        return () => controller.abort();
    }, [kulcs]);

    const autok = eredmeny.kulcs === kulcs ? eredmeny.autok : null;

    const legjobbak = useMemo(() => {
        if (!autok || autok.length < 2) return {};
        const eredmenyek = {};
        for (const [cimke, kiolvas, , irany] of SOROK) {
            if (!irany) continue;
            const ertekek = autok.map(kiolvas).filter((v) => typeof v === 'number');
            if (ertekek.length < 2) continue;
            const cel = irany === 'min' ? Math.min(...ertekek) : Math.max(...ertekek);
            if (ertekek.every((v) => v === cel)) continue;
            eredmenyek[cimke] = cel;
        }
        return eredmenyek;
    }, [autok]);

    const torles = (id) => {
        eltavolitas(id);
        const maradek = idk.filter((elem) => elem !== id);
        setParams(maradek.length ? { autok: maradek.join(',') } : {}, { replace: true });
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

            {!autok ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" />Betöltés…</div>
            ) : autok.length === 0 ? (
                <div className="allapot-doboz uveg"><h2>A kiválasztott autók már nem elérhetők.</h2><Link className="gomb gomb-fo" to="/autok">Kínálat</Link></div>
            ) : (
                <div className="osszehasonlitas-gorgeto">
                    <table className="osszehasonlitas-tabla" style={{ '--oszlopok': autok.length }}>
                        <thead>
                            <tr>
                                <th scope="col"><span className="sr-only">Tulajdonság</span></th>
                                {autok.map((auto) => (
                                    <th scope="col" key={auto._id}>
                                        <div className="osszehasonlitas-auto">
                                            <button className="ikon-gomb osszehasonlitas-torles" type="button" onClick={() => torles(auto._id)} aria-label={`${autoNev(auto)} eltávolítása`}>
                                                <Ikon nev="x" meret={14} />
                                            </button>
                                            <Link to={autoUrl(auto)}>
                                                {auto.kep ? <img src={kepMeret(auto.kep, 480)} alt="" /> : <span className="osszehasonlitas-kep-hiany">VELTRIX</span>}
                                                <span className="auto-marka">{auto.marka}</span>
                                                <strong>{auto.modell}</strong>
                                            </Link>
                                            {auto.statusz !== 'elerheto' && <span className={`auto-cimke auto-cimke-${auto.statusz}`}>{STATUSZOK[auto.statusz]}</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SOROK.map(([cimke, kiolvas, megjelenit]) => {
                                const ertekek = autok.map(kiolvas);
                                if (ertekek.every((v) => v === null || v === undefined || v === '')) return null;
                                return (
                                    <tr key={cimke}>
                                        <th scope="row">{cimke}</th>
                                        {autok.map((auto, i) => {
                                            const v = ertekek[i];
                                            const ures = v === null || v === undefined || v === '';
                                            const legjobb = !ures && legjobbak[cimke] === v;
                                            return (
                                                <td key={auto._id} className={legjobb ? 'legjobb' : ''}>
                                                    {ures ? <span className="halvany">—</span> : megjelenit(v, auto)}
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
                                    <td key={auto._id}><Link className="gomb gomb-fo gomb-kicsi" to={`${autoUrl(auto)}#erdeklodes`}>Érdekel</Link></td>
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
