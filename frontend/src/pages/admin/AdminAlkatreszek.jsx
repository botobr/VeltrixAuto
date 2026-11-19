import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useAuth } from '../../context/auth';
import { apiKeres } from '../../lib/api';
import { formatSzam, kepMeret } from '../../lib/auto';
import { KATEGORIAK, alkatreszUrl, ft } from '../../lib/webshop';

/** Készlet közvetlen szerkesztése a listában (Enter vagy a mező elhagyása ment). */
const KeszletMezo = ({ alkatresz, foglalt, onMentes }) => {
    const [ertek, setErtek] = useState(String(alkatresz.keszlet));
    const [elozo, setElozo] = useState(alkatresz.keszlet);
    if (elozo !== alkatresz.keszlet) {
        setElozo(alkatresz.keszlet);
        setErtek(String(alkatresz.keszlet));
    }
    const mentes = () => {
        const szam = Number.parseInt(ertek, 10);
        if (!Number.isInteger(szam) || szam < 0) setErtek(String(alkatresz.keszlet));
        else if (szam !== alkatresz.keszlet) onMentes({ keszlet: szam });
    };
    return (
        <input className={`bemenet keszlet-mezo ${alkatresz.keszlet === 0 ? 'keszlet-nulla' : ''}`} type="number" min={0} inputMode="numeric"
            aria-label={`${alkatresz.nev} készlete`} disabled={foglalt} value={ertek}
            onChange={(e) => setErtek(e.target.value)} onBlur={mentes} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); mentes(); } }} />
    );
};

const AdminAlkatreszek = () => {
    const { jog } = useAuth();
    const [szuro, setSzuro] = useState({ q: '', kategoria: '', keszlet: '', lathatosag: '', rendezes: 'ujElol' });
    const [q, setQ] = useState('');
    const [eredmeny, setEredmeny] = useState({ kulcs: null, alkatreszek: [], alacsonyKeszlet: 2 });
    const [hiba, setHiba] = useState('');
    const [folyamatban, setFolyamatban] = useState('');

    useEffect(() => {
        const idozito = setTimeout(() => setQ(szuro.q.trim()), 300);
        return () => clearTimeout(idozito);
    }, [szuro.q]);

    const kulcs = new URLSearchParams({ q, kategoria: szuro.kategoria, keszlet: szuro.keszlet, lathatosag: szuro.lathatosag, rendezes: szuro.rendezes }).toString();
    useEffect(() => {
        const vezerlo = new AbortController();
        apiKeres(`/admin/alkatreszek?${kulcs}`, { signal: vezerlo.signal })
            .then((data) => setEredmeny({ kulcs, alkatreszek: data.alkatreszek, alacsonyKeszlet: data.alacsonyKeszlet }))
            .catch((error) => { if (error.name !== 'AbortError') setHiba(error.message); });
        return () => vezerlo.abort();
    }, [kulcs]);

    const modositas = async (alkatresz, adatok) => {
        setFolyamatban(alkatresz._id);
        setHiba('');
        try {
            const data = await apiKeres(`/admin/alkatreszek/${alkatresz._id}`, { method: 'PATCH', body: adatok }, 'A módosítás nem sikerült.');
            setEredmeny((elozo) => ({ ...elozo, alkatreszek: elozo.alkatreszek.map((a) => (a._id === alkatresz._id ? data.alkatresz : a)) }));
        } catch (error) {
            setHiba(error.message);
        } finally {
            setFolyamatban('');
        }
    };

    const torles = async (alkatresz) => {
        if (!window.confirm(`Biztosan véglegesen törlöd: ${alkatresz.nev}? A képek is törlődnek. (Elrejtéshez használd a „Látható” kapcsolót.)`)) return;
        setFolyamatban(alkatresz._id);
        try {
            await apiKeres(`/admin/alkatreszek/${alkatresz._id}`, { method: 'DELETE' }, 'A törlés nem sikerült.');
            setEredmeny((elozo) => ({ ...elozo, alkatreszek: elozo.alkatreszek.filter((a) => a._id !== alkatresz._id) }));
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
                    <input className="bemenet" type="search" placeholder="Név, gyártó, cikkszám…" value={szuro.q} onChange={beallit('q')} />
                </label>
                <select className="bemenet" aria-label="Kategória" value={szuro.kategoria} onChange={beallit('kategoria')}>
                    <option value="">Minden kategória</option>
                    {Object.entries(KATEGORIAK).map(([k, nev]) => <option key={k} value={k}>{nev}</option>)}
                </select>
                <select className="bemenet" aria-label="Készlet" value={szuro.keszlet} onChange={beallit('keszlet')}>
                    <option value="">Minden készlet</option>
                    <option value="alacsony">Fogyóban (≤ {eredmeny.alacsonyKeszlet} db)</option>
                    <option value="elfogyott">Elfogyott</option>
                </select>
                <select className="bemenet" aria-label="Szűrés" value={szuro.lathatosag} onChange={beallit('lathatosag')}>
                    <option value="">Minden termék</option>
                    <option value="rejtett">Rejtett</option>
                    <option value="akcios">Akciós</option>
                </select>
                <select className="bemenet" aria-label="Rendezés" value={szuro.rendezes} onChange={beallit('rendezes')}>
                    <option value="ujElol">Legújabb</option>
                    <option value="nepszeru">Legtöbbet eladott</option>
                    <option value="keszlet">Legkevesebb készlet</option>
                </select>
                <Link className="gomb gomb-fo gomb-kicsi" to="/admin/alkatreszek/uj"><Ikon nev="plusz" meret={15} /> Új termék</Link>
            </div>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            {betoltes ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>
            ) : eredmeny.alkatreszek.length === 0 ? (
                <div className="allapot-doboz uveg">
                    <h3>{q || szuro.kategoria || szuro.keszlet || szuro.lathatosag ? 'Nincs találat' : 'Még nincs termék a webshopban'}</h3>
                    <Link className="gomb gomb-fo" to="/admin/alkatreszek/uj"><Ikon nev="plusz" meret={16} /> Új termék</Link>
                </div>
            ) : (
                <div className="uveg admin-tabla-tarto">
                    <table className="admin-tabla alkatresz-tabla">
                        <thead>
                            <tr>
                                <th scope="col">Termék</th><th scope="col">Ár</th><th scope="col">Készlet</th><th scope="col">Eladva</th>
                                <th scope="col">Látható</th><th scope="col">Kiemelt</th><th scope="col"><span className="sr-only">Műveletek</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {eredmeny.alkatreszek.map((a) => {
                                const foglalt = folyamatban === a._id;
                                return (
                                    <tr key={a._id} aria-busy={foglalt} className={!a.lathato ? 'sor-rejtett' : ''}>
                                        <td>
                                            <Link className="top-auto" to={alkatreszUrl(a)}>
                                                {a.kep ? <img src={kepMeret(a.kep, 120)} alt="" /> : <span className="top-kep-hiany" />}
                                                <span><strong>{a.nev}</strong><small>{a.gyarto} · {a.cikkszam} · {a.kategoriaNev}</small></span>
                                            </Link>
                                        </td>
                                        <td>
                                            {a.akcios ? <><s className="halvany-ar">{ft(a.ar)}</s><br /><strong>{ft(a.akciosAr)}</strong></> : ft(a.ar)}
                                        </td>
                                        <td>
                                            <KeszletMezo alkatresz={a} foglalt={foglalt} onMentes={(adatok) => modositas(a, adatok)} />
                                            {a.keszlet > 0 && a.keszlet <= eredmeny.alacsonyKeszlet && <span className="admin-jel">Fogyóban</span>}
                                        </td>
                                        <td title={`${formatSzam(a.megtekintesek || 0)} megtekintés`}>{formatSzam(a.eladottDb || 0)} db</td>
                                        <td>
                                            <label className="kapcsolo-sor">
                                                <input type="checkbox" checked={a.lathato} disabled={foglalt} aria-label={`${a.nev} látható`} onChange={(e) => modositas(a, { lathato: e.target.checked })} />
                                                <span className="kapcsolo" aria-hidden="true" />
                                            </label>
                                        </td>
                                        <td>
                                            <label className="kapcsolo-sor">
                                                <input type="checkbox" checked={a.kiemelt} disabled={foglalt} aria-label={`${a.nev} kiemelt`} onChange={(e) => modositas(a, { kiemelt: e.target.checked })} />
                                                <span className="kapcsolo" aria-hidden="true" />
                                            </label>
                                        </td>
                                        <td>
                                            <div className="admin-hirdetes-muveletek">
                                                <Link className="ikon-gomb" to={`/admin/alkatreszek/${a._id}`} aria-label={`${a.nev} szerkesztése`} title="Szerkesztés"><Ikon nev="szerkeszt" /></Link>
                                                {jog('alkatreszTorles') && (
                                                    <button className="ikon-gomb" type="button" onClick={() => torles(a)} disabled={foglalt} aria-label={`${a.nev} törlése`} title="Végleges törlés">
                                                        <Ikon nev="kuka" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminAlkatreszek;
