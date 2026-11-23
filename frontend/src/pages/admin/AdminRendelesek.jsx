import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { apiKeres } from '../../lib/api';
import { formatDatumIdo, kepMeret } from '../../lib/auto';
import { RENDELES_STATUSZOK, ft } from '../../lib/webshop';
import '../Webshop.css';

// a szűrő gombok: [státusz, felirat] ('' = mind, 'nyitott' = ami még nincs lezárva)
const SZUROK = [
    ['nyitott', 'Teendő'],
    ['fizetesre_var', 'Fizetésre vár'],
    ['uj', 'Új'],
    ['feldolgozas', 'Összekészítés'],
    ['feladva', 'Feladva'],
    ['atveheto', 'Átvehető'],
    ['teljesitve', 'Teljesítve'],
    ['lemondva', 'Lemondva'],
    ['', 'Mind'],
];
const NYITOTT = ['fizetesre_var', 'uj', 'feldolgozas', 'feladva', 'atveheto'];

// egy cím egy sorban
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

// a számla adatai a rendelésnél (szám, sztornó, vagy a hiba és egy újrapróbálás gomb)
const SzamlaSor = ({ rendeles, foglalt, onModositas }) => {
    const szamla = rendeles.szamla;
    if (!szamla) {
        return null;
    }

    if (szamla.szam) {
        return (
            <div>
                <dt>Számla</dt>
                <dd>
                    {szamla.szam} ({formatDatumIdo(szamla.kiallitva)})
                    {szamla.sztornoSzam && <> · sztornózva: {szamla.sztornoSzam}</>}
                    {szamla.hiba && <span className="admin-jel">{szamla.hiba}</span>}
                </dd>
            </div>
        );
    }

    if (szamla.hiba) {
        return (
            <div>
                <dt>Számla</dt>
                <dd>
                    <span className="admin-jel">Nem készült el: {szamla.hiba}</span>{' '}
                    <button className="szoveg-gomb" type="button" disabled={foglalt} onClick={() => onModositas(rendeles, { szamla: true })}>
                        Újrapróbálom
                    </button>
                </dd>
            </div>
        );
    }
    return null;
};

// egy rendelés (lenyitható kártya)
const RendelesKartya = ({ rendeles: r, kovetkezo, onModositas, foglalt }) => {
    const [nyitva, setNyitva] = useState(r.statusz === 'uj');
    const [megjegyzes, setMegjegyzes] = useState(r.belsoMegjegyzes || '');
    const lezart = r.statusz === 'lemondva' || r.statusz === 'teljesitve';
    const fizetesKell = r.fizetes.statusz !== 'fizetve' && (r.fizetes.mod === 'atutalas' || r.fizetes.mod === 'kartya');

    // ha még nincs kifizetve (utalás / kártya), csak lemondani lehet (a backend is így ellenőrzi)
    let valaszthato = kovetkezo;
    if (fizetesKell) {
        valaszthato = ['lemondva'];
    }

    // hány darab termék van a rendelésben
    let darab = 0;
    for (const tetel of r.tetelek) {
        darab += tetel.mennyiseg;
    }

    let osszegReszletek = 'Termékek ' + ft(r.osszegek.termekek) + ' · szállítás ' + ft(r.osszegek.szallitas);
    if (r.osszegek.kezelesiDij) {
        osszegReszletek += ' · kezelési díj ' + ft(r.osszegek.kezelesiDij);
    }

    const statuszValtas = (event) => {
        const uj = event.target.value;
        if (uj === 'lemondva') {
            let kerdes = 'Lemondod a(z) ' + r.rendelesSzam + ' rendelést? A készlet visszakerül, a vevő e-mailt kap.';
            if (r.fizetes.mod === 'kartya' && r.fizetes.statusz === 'fizetve') {
                kerdes += ' A kártyás fizetés összegét a Stripe automatikusan visszatéríti.';
            }
            const biztos = window.confirm(kerdes);
            if (!biztos) {
                return;
            }
        }
        onModositas(r, { statusz: uj });
    };

    // a megjegyzést akkor mentjük, amikor kilép a mezőből
    const megjegyzesMentese = () => {
        if (megjegyzes !== (r.belsoMegjegyzes || '')) {
            onModositas(r, { belsoMegjegyzes: megjegyzes });
        }
    };

    return (
        <article className={'uveg rendeles-kartya rendeles-kartya-' + r.statusz} aria-busy={foglalt}>
            <button className="rendeles-kartya-fej" type="button" onClick={() => setNyitva(!nyitva)} aria-expanded={nyitva}>
                <span className="rendeles-kartya-szam"><strong>{r.rendelesSzam}</strong><small>{formatDatumIdo(r.createdAt)}</small></span>
                <span className="rendeles-kartya-vevo">{r.vevo.nev}<small>{darab} tétel · {r.szallitasNev}</small></span>
                <span className="rendeles-kartya-osszeg">{ft(r.osszegek.vegosszeg)}<small>{r.fizetesNev}{r.fizetes.statusz === 'fizetve' ? ' · fizetve' : ''}</small></span>
                <span className={'rendeles-statusz rendeles-statusz-' + r.statusz}>{r.statuszNev}</span>
                <Ikon nev={nyitva ? 'fel' : 'le'} meret={18} />
            </button>

            {nyitva && (
                <div className="rendeles-kartya-tartalom">
                    <div className="rendeles-reszletek">
                        <ul className="rendeles-tetelek">
                            {r.tetelek.map((t) => (
                                <li key={t.alkatresz}>
                                    {t.kep ? <img src={kepMeret(t.kep, 120)} alt="" /> : <span className="top-kep-hiany" />}
                                    <span><Link to={'/alkatreszek/' + t.slug}>{t.nev}</Link><small>{t.cikkszam} · {t.mennyiseg} × {ft(t.egysegar)}</small></span>
                                    <strong>{ft(t.egysegar * t.mennyiseg)}</strong>
                                </li>
                            ))}
                        </ul>
                        <dl className="adatlap rendeles-adatok">
                            <div><dt>Vevő</dt><dd>{r.vevo.nev} · <a href={'mailto:' + r.vevo.email}>{r.vevo.email}</a> · <a href={'tel:' + r.vevo.telefon}>{r.vevo.telefon}</a></dd></div>
                            {r.szallitas.cim && <div><dt>Szállítási cím</dt><dd>{cimSor(r.szallitas.cim)}</dd></div>}
                            {r.szallitas.telephely && <div><dt>Átvétel</dt><dd>{r.szallitas.telephely.nev} ({r.szallitas.telephely.varos})</dd></div>}
                            <div><dt>Számlázás</dt><dd>{cimSor(r.szamlazasiCim)}</dd></div>
                            <SzamlaSor rendeles={r} foglalt={foglalt} onModositas={onModositas} />
                            {r.fizetes.visszaterites && r.fizetes.visszaterites.id && (
                                <div><dt>Visszatérítés</dt><dd>Visszatérítve: {formatDatumIdo(r.fizetes.visszaterites.ekkor)} (Stripe: {r.fizetes.visszaterites.id})</dd></div>
                            )}
                            <div><dt>Összeg</dt><dd>{osszegReszletek}</dd></div>
                            {r.vevoMegjegyzes && <div><dt>Vevő megjegyzése</dt><dd>{r.vevoMegjegyzes}</dd></div>}
                        </dl>
                        <ol className="rendeles-esemenyek">
                            {r.esemenyek.map((esemeny, i) => (
                                <li key={i}>
                                    <time>{formatDatumIdo(esemeny.idopont)}</time> {RENDELES_STATUSZOK[esemeny.statusz] || esemeny.statusz}
                                    {esemeny.megjegyzes && ' – ' + esemeny.megjegyzes}
                                </li>
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
                                <select className="bemenet" value={r.statusz} disabled={foglalt} onChange={statuszValtas}>
                                    {!valaszthato.includes(r.statusz) && <option value={r.statusz}>{r.statuszNev}</option>}
                                    {valaszthato.map((statusz) => <option key={statusz} value={statusz}>{RENDELES_STATUSZOK[statusz]}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="mezo rendeles-megjegyzes">
                            <span>Belső megjegyzés (a vevő nem látja)</span>
                            <textarea className="bemenet" rows={2} maxLength={2000} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)}
                                onBlur={megjegyzesMentese} />
                        </label>
                    </div>
                </div>
            )}
        </article>
    );
};

// az admin rendelések lista
const AdminRendelesek = () => {
    const [statusz, setStatusz] = useState('nyitott');
    const [kereses, setKereses] = useState('');
    const [q, setQ] = useState('');
    const [adat, setAdat] = useState({ kulcs: null, rendelesek: [], statuszSzamok: {}, kovetkezoStatuszok: {}, lapozas: { oldal: 1, osszes: 0 } });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState('');

    // keresés: gépelés után kicsit várunk
    useEffect(() => {
        const idozito = setTimeout(() => {
            setQ(kereses.trim());
        }, 300);
        return () => clearTimeout(idozito);
    }, [kereses]);

    const kulcs = new URLSearchParams({ statusz: statusz, q: q }).toString();

    useEffect(() => {
        const vezerlo = new AbortController();
        apiKeres('/admin/rendelesek?' + kulcs, { signal: vezerlo.signal })
            .then((data) => {
                setAdat({ kulcs: kulcs, ...data });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setHiba(error.message);
                }
            });
        return () => vezerlo.abort();
    }, [kulcs]);

    const modositas = async (rendeles, adatok) => {
        setFolyamatban(rendeles._id);
        setHiba('');
        try {
            const data = await apiKeres('/admin/rendelesek/' + rendeles._id, { method: 'PATCH', body: adatok }, 'A módosítás nem sikerült.');
            setAdat((elozo) => {
                const rendelesek = elozo.rendelesek.map((elem) => {
                    if (elem._id !== rendeles._id) {
                        return elem;
                    }
                    // a válaszban a telephely csak id, ezért a régit (névvel) megtartjuk
                    return { ...data.rendeles, szallitas: { ...data.rendeles.szallitas, telephely: elem.szallitas.telephely } };
                });
                return { ...elozo, rendelesek: rendelesek };
            });
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban('');
        }
    };

    // következő oldal
    const tovabbiak = async () => {
        try {
            const data = await apiKeres('/admin/rendelesek?' + kulcs + '&oldal=' + (adat.lapozas.oldal + 1));
            setAdat((elozo) => ({ ...elozo, rendelesek: [...elozo.rendelesek, ...data.rendelesek], lapozas: data.lapozas }));
        } catch (error) {
            setHiba(error.message);
        }
    };

    // hány rendelés tartozik a szűrő gombhoz ('' = mind, 'nyitott' = még nincs lezárva)
    const szam = (szuroStatusz) => {
        if (szuroStatusz !== '' && szuroStatusz !== 'nyitott') {
            return adat.statuszSzamok[szuroStatusz] || 0;
        }
        let db = 0;
        for (const rendelesStatusz in adat.statuszSzamok) {
            if (szuroStatusz === '' || NYITOTT.includes(rendelesStatusz)) {
                db += adat.statuszSzamok[rendelesStatusz];
            }
        }
        return db;
    };

    let ures = 'Nincs találat';
    if (statusz === 'nyitott' && !q) {
        ures = 'Nincs teendő rendelés';
    }

    return (
        <div className="admin-lista">
            <div className="admin-eszkoztar">
                <div className="szuro-csipek">
                    {SZUROK.map(([szuroStatusz, cimke]) => (
                        <button key={szuroStatusz || 'mind'} type="button" className={statusz === szuroStatusz ? 'csip aktiv' : 'csip'}
                            aria-pressed={statusz === szuroStatusz} onClick={() => setStatusz(szuroStatusz)}>
                            {cimke} <small>{szam(szuroStatusz)}</small>
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

            {adat.kulcs !== kulcs && <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>}

            {adat.kulcs === kulcs && adat.rendelesek.length === 0 && (
                <div className="allapot-doboz uveg"><h3>{ures}</h3></div>
            )}

            {adat.kulcs === kulcs && adat.rendelesek.length > 0 && (
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
