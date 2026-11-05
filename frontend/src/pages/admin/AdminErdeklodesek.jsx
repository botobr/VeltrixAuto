import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { apiKeres } from '../../lib/api';
import { formatDatumIdo, kepMeret } from '../../lib/auto';

const STATUSZOK = [['uj', 'Új'], ['folyamatban', 'Folyamatban'], ['lezart', 'Lezárt']];

const Megjegyzes = ({ erdeklodes, onMentes }) => {
    const [szoveg, setSzoveg] = useState(erdeklodes.megjegyzes || '');
    return (
        <label className="mezo erdeklodes-megjegyzes">
            <span>Belső megjegyzés</span>
            <textarea
                className="bemenet"
                rows={2}
                maxLength={2000}
                placeholder="pl. visszahívva, próbaút pénteken 10:00"
                value={szoveg}
                onChange={(event) => setSzoveg(event.target.value)}
                onBlur={() => { if (szoveg !== (erdeklodes.megjegyzes || '')) onMentes({ megjegyzes: szoveg }); }}
            />
        </label>
    );
};

const AdminErdeklodesek = () => {
    const [params, setParams] = useSearchParams();
    const statusz = params.get('statusz') || '';
    const autoSzuro = params.get('auto') || '';
    const [adat, setAdat] = useState({ kulcs: null, erdeklodesek: [], statuszSzamok: {}, lapozas: null });
    const [hiba, setHiba] = useState('');
    const kulcs = `${statusz}|${autoSzuro}`;

    useEffect(() => {
        const controller = new AbortController();
        const p = new URLSearchParams();
        if (statusz) p.set('statusz', statusz);
        if (autoSzuro) p.set('auto', autoSzuro);
        apiKeres(`/admin/erdeklodesek?${p}`, { signal: controller.signal })
            .then((data) => setAdat({ kulcs, ...data }))
            .catch((error) => { if (error.name !== 'AbortError') setHiba(error.message); });
        return () => controller.abort();
    }, [kulcs, statusz, autoSzuro]);

    const szuroBeallitasa = (mezo, ertek) => {
        const uj = new URLSearchParams(params);
        if (ertek) uj.set(mezo, ertek);
        else uj.delete(mezo);
        setParams(uj, { replace: true });
    };

    const modositas = async (erdeklodes, adatok) => {
        setHiba('');
        try {
            const data = await apiKeres(`/admin/erdeklodesek/${erdeklodes._id}`, { method: 'PATCH', body: adatok }, 'A mentés nem sikerült.');
            setAdat((elozo) => ({
                ...elozo,
                erdeklodesek: elozo.erdeklodesek.map((e) => (e._id === erdeklodes._id ? { ...e, ...data.erdeklodes, auto: e.auto } : e)),
                statuszSzamok: adatok.statusz && adatok.statusz !== erdeklodes.statusz
                    ? { ...elozo.statuszSzamok, [erdeklodes.statusz]: (elozo.statuszSzamok[erdeklodes.statusz] || 1) - 1, [adatok.statusz]: (elozo.statuszSzamok[adatok.statusz] || 0) + 1 }
                    : elozo.statuszSzamok,
            }));
        } catch (error) {
            setHiba(error.message);
        }
    };

    const torles = async (erdeklodes) => {
        if (!window.confirm(`Törlöd ${erdeklodes.nev} érdeklődését?`)) return;
        try {
            await apiKeres(`/admin/erdeklodesek/${erdeklodes._id}`, { method: 'DELETE' });
            setAdat((elozo) => ({ ...elozo, erdeklodesek: elozo.erdeklodesek.filter((e) => e._id !== erdeklodes._id) }));
        } catch (error) {
            setHiba(error.message);
        }
    };

    const tovabbiak = async () => {
        const p = new URLSearchParams({ oldal: String(adat.lapozas.oldal + 1) });
        if (statusz) p.set('statusz', statusz);
        if (autoSzuro) p.set('auto', autoSzuro);
        try {
            const data = await apiKeres(`/admin/erdeklodesek?${p}`);
            setAdat((elozo) => ({ ...elozo, erdeklodesek: [...elozo.erdeklodesek, ...data.erdeklodesek], lapozas: data.lapozas }));
        } catch (error) {
            setHiba(error.message);
        }
    };

    const osszes = Object.values(adat.statuszSzamok).reduce((s, db) => s + db, 0);

    return (
        <div className="admin-lista">
            <div className="admin-eszkoztar">
                <div className="szuro-csipek" role="group" aria-label="Szűrés státusz szerint">
                    <button type="button" className={`csip ${!statusz ? 'aktiv' : ''}`} onClick={() => szuroBeallitasa('statusz', '')}>Összes ({osszes})</button>
                    {STATUSZOK.map(([ertek, cimke]) => (
                        <button key={ertek} type="button" className={`csip ${statusz === ertek ? 'aktiv' : ''}`} onClick={() => szuroBeallitasa('statusz', ertek)}>
                            {cimke} ({adat.statuszSzamok[ertek] || 0})
                        </button>
                    ))}
                </div>
                {autoSzuro && (
                    <button className="aktiv-szuro" type="button" onClick={() => szuroBeallitasa('auto', '')}>
                        Csak egy autó <Ikon nev="x" meret={13} />
                    </button>
                )}
            </div>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            {adat.kulcs !== kulcs ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>
            ) : adat.erdeklodesek.length === 0 ? (
                <div className="allapot-doboz uveg"><h3>Nincs érdeklődés ebben a nézetben</h3></div>
            ) : (
                <div className="erdeklodesek">
                    {adat.erdeklodesek.map((e) => (
                        <article className={`erdeklodes uveg erdeklodes-${e.statusz}`} key={e._id}>
                            <header className="erdeklodes-fej">
                                {e.auto ? (
                                    <Link className="erdeklodes-auto" to={`/autok/${e.auto.slug}`}>
                                        {e.auto.kep && <img src={kepMeret(e.auto.kep, 120)} alt="" />}
                                        <span>{e.auto.nev}</span>
                                    </Link>
                                ) : <span className="erdeklodes-auto">{e.autoNev} <small>(törölt hirdetés)</small></span>}
                                <time dateTime={e.createdAt}>{formatDatumIdo(e.createdAt)}</time>
                            </header>
                            <div className="erdeklodes-szemely">
                                <strong>{e.nev}</strong>
                                <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.auto?.nev || e.autoNev}`)}`}><Ikon nev="level" meret={14} /> {e.email}</a>
                                {e.telefon && <a href={`tel:${e.telefon.replace(/[^\d+]/g, '')}`}><Ikon nev="telefon" meret={14} /> {e.telefon}</a>}
                            </div>
                            <p className="erdeklodes-uzenet">{e.uzenet}</p>
                            <Megjegyzes key={e._id} erdeklodes={e} onMentes={(adatok) => modositas(e, adatok)} />
                            <footer className="erdeklodes-lab">
                                <label className="mezo">
                                    <span className="sr-only">Státusz</span>
                                    <select className="bemenet" value={e.statusz} onChange={(event) => modositas(e, { statusz: event.target.value })}>
                                        {STATUSZOK.map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                                    </select>
                                </label>
                                <button className="ikon-gomb" type="button" onClick={() => torles(e)} aria-label="Érdeklődés törlése"><Ikon nev="kuka" /></button>
                            </footer>
                        </article>
                    ))}
                </div>
            )}

            {adat.lapozas && adat.erdeklodesek.length < adat.lapozas.osszes && (
                <div className="autok-tobb"><button className="gomb gomb-uveg" type="button" onClick={tovabbiak}>Továbbiak</button></div>
            )}
        </div>
    );
};

export default AdminErdeklodesek;
