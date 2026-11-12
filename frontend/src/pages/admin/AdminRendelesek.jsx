import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { apiKeres } from '../../lib/api';
import { formatDatumIdo, kepMeret } from '../../lib/auto';
import { RENDELES_STATUSZOK, ft } from '../../lib/webshop';
import '../Webshop.css';

const SZUROK = [['nyitott', 'Teendő'], ['fizetesre_var', 'Fizetésre vár'], ['uj', 'Új'], ['feldolgozas', 'Összekészítés'], ['feladva', 'Feladva'], ['atveheto', 'Átvehető'], ['teljesitve', 'Teljesítve'], ['lemondva', 'Lemondva'], ['', 'Mind']];
const NYITOTT = ['fizetesre_var', 'uj', 'feldolgozas', 'feladva', 'atveheto'];

const cimSor = (c) => [c?.nev, c?.adoszam && `adószám: ${c.adoszam}`, [c?.iranyitoszam, c?.varos].filter(Boolean).join(' '), c?.cim].filter(Boolean).join(', ');

const RendelesKartya = ({ rendeles: r, kovetkezo, onModositas, foglalt }) => {
    const [nyitva, setNyitva] = useState(r.statusz === 'uj');
    const [megjegyzes, setMegjegyzes] = useState(r.belsoMegjegyzes || '');
    const lezart = r.statusz === 'lemondva' || r.statusz === 'teljesitve';
    const fizetesKell = r.fizetes.statusz !== 'fizetve' && (r.fizetes.mod === 'atutalas' || r.fizetes.mod === 'kartya');
    // Fizetés nélkül (előre utalás / kártya) csak a lemondás választható; a backend is így ellenőriz.
    const valaszthato = fizetesKell ? ['lemondva'] : kovetkezo;

    return (
        <article className={`uveg rendeles-kartya rendeles-kartya-${r.statusz}`} aria-busy={foglalt}>
            <button className="rendeles-kartya-fej" type="button" onClick={() => setNyitva((e) => !e)} aria-expanded={nyitva}>
                <span className="rendeles-kartya-szam"><strong>{r.rendelesSzam}</strong><small>{formatDatumIdo(r.createdAt)}</small></span>
                <span className="rendeles-kartya-vevo">{r.vevo.nev}<small>{r.tetelek.reduce((s, t) => s + t.mennyiseg, 0)} tétel · {r.szallitasNev}</small></span>
                <span className="rendeles-kartya-osszeg">{ft(r.osszegek.vegosszeg)}<small>{r.fizetesNev}{r.fizetes.statusz === 'fizetve' ? ' · fizetve' : ''}</small></span>
                <span className={`rendeles-statusz rendeles-statusz-${r.statusz}`}>{r.statuszNev}</span>
                <Ikon nev={nyitva ? 'fel' : 'le'} meret={18} />
            </button>

            {nyitva && (
                <div className="rendeles-kartya-tartalom">
                    <div className="rendeles-reszletek">
                        <ul className="rendeles-tetelek">
                            {r.tetelek.map((t) => (
                                <li key={t.alkatresz}>
                                    {t.kep ? <img src={kepMeret(t.kep, 120)} alt="" /> : <span className="top-kep-hiany" />}
                                    <span><Link to={`/alkatreszek/${t.slug}`}>{t.nev}</Link><small>{t.cikkszam} · {t.mennyiseg} × {ft(t.egysegar)}</small></span>
                                    <strong>{ft(t.egysegar * t.mennyiseg)}</strong>
                                </li>
                            ))}
                        </ul>
                        <dl className="adatlap rendeles-adatok">
                            <div><dt>Vevő</dt><dd>{r.vevo.nev} · <a href={`mailto:${r.vevo.email}`}>{r.vevo.email}</a> · <a href={`tel:${r.vevo.telefon}`}>{r.vevo.telefon}</a></dd></div>
                            {r.szallitas.cim && <div><dt>Szállítási cím</dt><dd>{cimSor(r.szallitas.cim)}</dd></div>}
                            {r.szallitas.telephely && <div><dt>Átvétel</dt><dd>{r.szallitas.telephely.nev} ({r.szallitas.telephely.varos})</dd></div>}
                            <div><dt>Számlázás</dt><dd>{cimSor(r.szamlazasiCim)}</dd></div>
                            <div><dt>Összeg</dt><dd>Termékek {ft(r.osszegek.termekek)} · szállítás {ft(r.osszegek.szallitas)}{r.osszegek.kezelesiDij ? ` · kezelési díj ${ft(r.osszegek.kezelesiDij)}` : ''}</dd></div>
                            {r.vevoMegjegyzes && <div><dt>Vevő megjegyzése</dt><dd>{r.vevoMegjegyzes}</dd></div>}
                        </dl>
                        <ol className="rendeles-esemenyek">
                            {r.esemenyek.map((e, i) => (
                                <li key={i}><time>{formatDatumIdo(e.idopont)}</time> {RENDELES_STATUSZOK[e.statusz] || e.statusz}{e.megjegyzes && ` – ${e.megjegyzes}`}</li>
                            ))}
                        </ol>
                    </div>

                    <div className="rendeles-muveletek">
                        {fizetesKell && r.statusz !== 'lemondva' && (
                            <button className="gomb gomb-uveg gomb-kicsi" type="button" disabled={foglalt} onClick={() => onModositas(r, { fizetve: true })}>
                                <Ikon nev="penz" meret={15} /> Fizetés beérkezett
                            </button>
                        )}
                        {!lezart && (
                            <label className="mezo">
                                <span>Státusz</span>
                                <select className="bemenet" value={r.statusz} disabled={foglalt}
                                    onChange={(e) => {
                                        const uj = e.target.value;
                                        if (uj === 'lemondva' && !window.confirm(`Lemondod a(z) ${r.rendelesSzam} rendelést? A készlet visszakerül, a vevő e-mailt kap.`)) return;
                                        onModositas(r, { statusz: uj });
                                    }}>
                                    {!valaszthato.includes(r.statusz) && <option value={r.statusz}>{r.statuszNev}</option>}
                                    {valaszthato.map((s) => <option key={s} value={s}>{RENDELES_STATUSZOK[s]}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="mezo rendeles-megjegyzes">
                            <span>Belső megjegyzés (a vevő nem látja)</span>
                            <textarea className="bemenet" rows={2} maxLength={2000} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)}
                                onBlur={() => { if (megjegyzes !== (r.belsoMegjegyzes || '')) onModositas(r, { belsoMegjegyzes: megjegyzes }); }} />
                        </label>
                    </div>
                </div>
            )}
        </article>
    );
};

const AdminRendelesek = () => {
    const [statusz, setStatusz] = useState('nyitott');
    const [kereses, setKereses] = useState('');
    const [q, setQ] = useState('');
    const [adat, setAdat] = useState({ kulcs: null, rendelesek: [], statuszSzamok: {}, kovetkezoStatuszok: {}, lapozas: { oldal: 1, osszes: 0 } });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState('');

    useEffect(() => {
        const idozito = setTimeout(() => setQ(kereses.trim()), 300);
        return () => clearTimeout(idozito);
    }, [kereses]);

    const kulcs = new URLSearchParams({ statusz, q }).toString();
    useEffect(() => {
        const vezerlo = new AbortController();
        apiKeres(`/admin/rendelesek?${kulcs}`, { signal: vezerlo.signal })
            .then((data) => setAdat({ kulcs, ...data }))
            .catch((error) => { if (error.name !== 'AbortError') setHiba(error.message); });
        return () => vezerlo.abort();
    }, [kulcs]);

    const modositas = async (rendeles, adatok) => {
        setFolyamatban(rendeles._id);
        setHiba('');
        try {
            const data = await apiKeres(`/admin/rendelesek/${rendeles._id}`, { method: 'PATCH', body: adatok }, 'A módosítás nem sikerült.');
            setAdat((elozo) => ({ ...elozo, rendelesek: elozo.rendelesek.map((r) => (r._id === rendeles._id ? { ...data.rendeles, szallitas: { ...data.rendeles.szallitas, telephely: r.szallitas.telephely } } : r)) }));
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban('');
        }
    };

    const tovabbiak = async () => {
        const data = await apiKeres(`/admin/rendelesek?${kulcs}&oldal=${adat.lapozas.oldal + 1}`).catch((error) => { setHiba(error.message); return null; });
        if (data) setAdat((elozo) => ({ ...elozo, rendelesek: [...elozo.rendelesek, ...data.rendelesek], lapozas: data.lapozas }));
    };

    const szam = (s) => (s === 'nyitott'
        ? NYITOTT.reduce((o, k) => o + (adat.statuszSzamok[k] || 0), 0)
        : s === '' ? Object.values(adat.statuszSzamok).reduce((o, d) => o + d, 0) : adat.statuszSzamok[s] || 0);

    return (
        <div className="admin-lista">
            <div className="admin-eszkoztar">
                <div className="szuro-csipek">
                    {SZUROK.map(([s, cimke]) => (
                        <button key={s || 'mind'} type="button" className={`csip ${statusz === s ? 'aktiv' : ''}`} aria-pressed={statusz === s} onClick={() => setStatusz(s)}>
                            {cimke} <small>{szam(s)}</small>
                        </button>
                    ))}
                </div>
                <label className="admin-kereso">
                    <Ikon nev="kereses" />
                    <span className="sr-only">Keresés</span>
                    <input className="bemenet" type="search" placeholder="Rendelésszám, vevő, cikkszám…" value={kereses} onChange={(e) => setKereses(e.target.value)} />
                </label>
            </div>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            {adat.kulcs !== kulcs ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>
            ) : adat.rendelesek.length === 0 ? (
                <div className="allapot-doboz uveg"><h3>{statusz === 'nyitott' && !q ? 'Nincs teendő rendelés' : 'Nincs találat'}</h3></div>
            ) : (
                <div className="rendeles-lista">
                    {adat.rendelesek.map((r) => (
                        <RendelesKartya key={r._id} rendeles={r} kovetkezo={adat.kovetkezoStatuszok[r.szallitas.mod] || []}
                            onModositas={modositas} foglalt={folyamatban === r._id} />
                    ))}
                    {adat.rendelesek.length < adat.lapozas.osszes && (
                        <button className="gomb gomb-uveg" type="button" onClick={tovabbiak}>Továbbiak betöltése</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminRendelesek;
