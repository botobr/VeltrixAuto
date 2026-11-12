import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useAuth } from '../../context/auth';
import { apiKeres } from '../../lib/api';
import { STATUSZOK, autoNev, autoUrl, formatAr, formatDatum, formatSzam, kepMeret } from '../../lib/auto';

const datumMezo = (ertek) => (ertek ? String(ertek).slice(0, 10) : '');

const AdminHirdetesek = () => {
    const { jog } = useAuth();
    const [szuro, setSzuro] = useState({ q: '', statusz: '', lathatosag: '', rendezes: 'ujElol' });
    const [q, setQ] = useState('');
    const [eredmeny, setEredmeny] = useState({ kulcs: null, autok: [] });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState('');
    // A lejárat-ellenőrzés viszonyítási időpontja (az oldal megnyitásakor).
    const [most] = useState(() => Date.now());

    useEffect(() => {
        const idozito = setTimeout(() => setQ(szuro.q.trim()), 300);
        return () => clearTimeout(idozito);
    }, [szuro.q]);

    const kulcs = new URLSearchParams({ q, statusz: szuro.statusz, lathatosag: szuro.lathatosag, rendezes: szuro.rendezes }).toString();
    useEffect(() => {
        const controller = new AbortController();
        apiKeres(`/admin/autok?${kulcs}`, { signal: controller.signal })
            .then((data) => setEredmeny({ kulcs, autok: data.autok }))
            .catch((error) => { if (error.name !== 'AbortError') setHiba(error.message); });
        return () => controller.abort();
    }, [kulcs]);

    const allapotModositas = async (auto, modositas) => {
        setFolyamatban(auto._id);
        setHiba('');
        try {
            const data = await apiKeres(`/autok/${auto._id}/allapot`, { method: 'PATCH', body: modositas }, 'A módosítás nem sikerült.');
            setEredmeny((elozo) => ({
                ...elozo,
                autok: elozo.autok.map((elem) => (elem._id === auto._id ? { ...elem, ...data.auto, telephely: elem.telephely, erdeklodesek: elem.erdeklodesek, ujErdeklodesek: elem.ujErdeklodesek } : elem)),
            }));
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban('');
        }
    };

    const torles = async (auto) => {
        if (!window.confirm(`Biztosan véglegesen törlöd: ${autoNev(auto)}? A képek is törlődnek. (Elrejtéshez használd a „Látható” kapcsolót.)`)) return;
        setFolyamatban(auto._id);
        try {
            await apiKeres(`/delete-auto/${auto._id}`, { method: 'DELETE' }, 'A törlés nem sikerült.');
            setEredmeny((elozo) => ({ ...elozo, autok: elozo.autok.filter((elem) => elem._id !== auto._id) }));
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban('');
        }
    };

    const beallit = (mezo) => (event) => setSzuro((elozo) => ({ ...elozo, [mezo]: event.target.value }));
    const betoltes = eredmeny.kulcs !== kulcs;

    return (
        <div className="admin-lista">
            <div className="admin-eszkoztar">
                <label className="admin-kereso">
                    <Ikon nev="kereses" />
                    <span className="sr-only">Keresés</span>
                    <input className="bemenet" type="search" placeholder="Márka, modell…" value={szuro.q} onChange={beallit('q')} />
                </label>
                <select className="bemenet" aria-label="Státusz" value={szuro.statusz} onChange={beallit('statusz')}>
                    <option value="">Minden státusz</option>
                    {Object.entries(STATUSZOK).map(([kulcsErtek, cimke]) => <option key={kulcsErtek} value={kulcsErtek}>{cimke}</option>)}
                </select>
                <select className="bemenet" aria-label="Láthatóság" value={szuro.lathatosag} onChange={beallit('lathatosag')}>
                    <option value="">Minden hirdetés</option>
                    <option value="rejtett">Rejtett</option>
                    <option value="lejart">Lejárt</option>
                    <option value="kiemelt">Kiemelt</option>
                </select>
                <select className="bemenet" aria-label="Rendezés" value={szuro.rendezes} onChange={beallit('rendezes')}>
                    <option value="ujElol">Legújabb</option>
                    <option value="megtekintes">Legnézettebb</option>
                    <option value="arCsokkeno">Legdrágább</option>
                </select>
            </div>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            {betoltes ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>
            ) : eredmeny.autok.length === 0 ? (
                <div className="allapot-doboz uveg">
                    <h3>Nincs találat</h3>
                    <Link className="gomb gomb-fo" to="/admin/autok/uj"><Ikon nev="plusz" meret={16} /> Új hirdetés</Link>
                </div>
            ) : (
                <div className="admin-hirdetesek">
                    {eredmeny.autok.map((auto) => {
                        const lejart = auto.lejarat && new Date(auto.lejarat).getTime() <= most;
                        const foglalt = folyamatban === auto._id;
                        return (
                            <article className={`admin-hirdetes uveg ${!auto.lathato || lejart ? 'rejtett' : ''}`} key={auto._id} aria-busy={foglalt}>
                                <Link className="admin-hirdetes-kep" to={autoUrl(auto)}>
                                    {auto.kep ? <img src={kepMeret(auto.kep, 320)} alt="" loading="lazy" /> : <span>VELTRIX</span>}
                                    {auto.kiemelt && <span className="auto-cimke auto-cimke-kiemelt"><Ikon nev="csillag" meret={11} kitoltes /></span>}
                                </Link>

                                <div className="admin-hirdetes-fo">
                                    <div className="admin-hirdetes-cim">
                                        <Link to={autoUrl(auto)}><strong>{autoNev(auto)}</strong> <span>{auto.evjarat}</span></Link>
                                        <span className="admin-hirdetes-ar">{formatAr(auto.vetel_ar)}</span>
                                    </div>
                                    <p className="admin-hirdetes-meta">
                                        {[
                                            auto.azonosito,
                                            auto.telephely?.nev,
                                            `${formatSzam(auto.kmora_allas)} km`,
                                            // Az eladási adatokat a backend csak pénzügyi joggal küldi.
                                            auto.statusz === 'elkelt' && auto.eladas_datum ? `Eladva ${formatDatum(auto.eladas_datum)}, ${formatAr(auto.eladasi_ar)}` : null,
                                        ].filter(Boolean).join(' · ')}
                                        {!auto.lathato && <span className="admin-jel">Rejtett</span>}
                                        {lejart && <span className="admin-jel">Lejárt</span>}
                                    </p>
                                    <div className="admin-statok" aria-label="Statisztika">
                                        <span title="Megtekintések"><Ikon nev="szem" meret={15} /> {formatSzam(auto.megtekintesek || 0)}</span>
                                        <span title="Telefonszám-kattintások"><Ikon nev="telefon" meret={15} /> {formatSzam(auto.telefonKattintasok || 0)}</span>
                                        <Link title="Érdeklődések" to={`/admin?lap=erdeklodesek&auto=${auto._id}`}>
                                            <Ikon nev="level" meret={15} /> {auto.erdeklodesek}
                                            {auto.ujErdeklodesek > 0 && <span className="admin-uj">{auto.ujErdeklodesek} új</span>}
                                        </Link>
                                    </div>
                                </div>

                                <div className="admin-hirdetes-vezerlok">
                                    <label className="mezo">
                                        <span>Státusz</span>
                                        <select className={`bemenet statusz-${auto.statusz}`} value={auto.statusz} disabled={foglalt}
                                            onChange={(event) => allapotModositas(auto, { statusz: event.target.value })}>
                                            {Object.entries(STATUSZOK).map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                                        </select>
                                    </label>
                                    <label className="mezo">
                                        <span>Lejárat</span>
                                        <input className="bemenet" type="date" value={datumMezo(auto.lejarat)} disabled={foglalt}
                                            onChange={(event) => allapotModositas(auto, { lejarat: event.target.value || null })} />
                                    </label>
                                    <label className="kapcsolo-sor">
                                        <input type="checkbox" checked={auto.lathato} disabled={foglalt}
                                            onChange={(event) => allapotModositas(auto, { lathato: event.target.checked })} />
                                        <span className="kapcsolo" aria-hidden="true" /> Látható
                                    </label>
                                    <label className="kapcsolo-sor">
                                        <input type="checkbox" checked={auto.kiemelt} disabled={foglalt}
                                            onChange={(event) => allapotModositas(auto, { kiemelt: event.target.checked })} />
                                        <span className="kapcsolo" aria-hidden="true" /> Kiemelt
                                    </label>
                                </div>

                                <div className="admin-hirdetes-muveletek">
                                    <Link className="gomb gomb-uveg gomb-kicsi" to={`/admin/autok/${auto._id}`}><Ikon nev="szerkeszt" meret={15} /> Szerkesztés</Link>
                                    {jog('hirdetesTorles') && (
                                        <button className="ikon-gomb" type="button" onClick={() => torles(auto)} disabled={foglalt} aria-label={`${autoNev(auto)} törlése`} title="Végleges törlés">
                                            <Ikon nev="kuka" />
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminHirdetesek;
