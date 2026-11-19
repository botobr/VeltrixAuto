import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import Ikon from '../components/Ikon';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import { formatDatum, formatDatumIdo } from '../lib/auto';
import { ft } from '../lib/webshop';
import { szuroCimkek } from '../lib/szurok';
import { useSeo } from '../lib/useSeo';
import { JelszoMezo } from './Login';
import './Fiok.css';
import './Webshop.css';

const LAPOK = [
    ['kedvencek', 'Kedvencek', 'sziv'],
    ['rendelesek', 'Rendeléseim', 'kosar'],
    ['keresesek', 'Mentett keresések', 'harang'],
    ['profil', 'Profil', 'felhasznalo'],
];

const Rendelesek = () => {
    const [rendelesek, setRendelesek] = useState(null);
    const [hiba, setHiba] = useState('');

    useEffect(() => {
        apiKeres('/fiok/rendelesek').then((data) => setRendelesek(data.rendelesek)).catch((error) => setHiba(error.message));
    }, []);

    if (hiba) return <p className="uzenet uzenet-hiba">{hiba}</p>;
    if (!rendelesek) return <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>;
    if (rendelesek.length === 0) {
        return (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kosar" meret={22} /></span>
                <h3>Még nincs webshop rendelésed</h3>
                <p>A bejelentkezve leadott rendeléseid itt jelennek meg.</p>
                <Link className="gomb gomb-fo" to="/alkatreszek">Tuning alkatrészek</Link>
            </div>
        );
    }
    return (
        <div className="uveg webshop-tabla-tarto">
            <table className="webshop-tabla">
                <thead>
                    <tr><th scope="col">Rendelés</th><th scope="col">Dátum</th><th scope="col">Tételek</th><th scope="col">Összeg</th><th scope="col">Állapot</th></tr>
                </thead>
                <tbody>
                    {rendelesek.map((r) => (
                        <tr key={r.rendelesSzam}>
                            <td><Link to={`/rendeles/${encodeURIComponent(r.rendelesSzam)}`}><strong>{r.rendelesSzam}</strong></Link></td>
                            <td>{formatDatumIdo(r.createdAt)}</td>
                            <td>{r.tetelek.map((t) => `${t.mennyiseg} × ${t.nev}`).join(', ')}</td>
                            <td>{ft(r.osszegek.vegosszeg)}</td>
                            <td><span className={`rendeles-statusz rendeles-statusz-${r.statusz}`}>{r.statuszNev}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Kedvencek = () => {
    const { user } = useAuth();
    const [autok, setAutok] = useState(null);
    const [hiba, setHiba] = useState('');
    const szam = user?.kedvencek?.length || 0;

    useEffect(() => {
        apiKeres('/fiok/kedvencek').then((data) => setAutok(data.autok)).catch((error) => setHiba(error.message));
    }, []);

    if (hiba) return <p className="uzenet uzenet-hiba">{hiba}</p>;
    if (!autok) return <div className="autok-racs">{[0, 1, 2].map((i) => <AutoKartyaVaz key={i} />)}</div>;
    // A szívre kattintva a kártya azonnal eltűnik a listából.
    const lathato = autok.filter((auto) => user?.kedvencek?.includes(auto._id));
    if (lathato.length === 0) {
        return (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="sziv" meret={22} /></span>
                <h3>Még nincs kedvenc autód</h3>
                <p>A kártyákon és az adatlapon a szív ikonnal menthetsz el autókat, hogy később könnyen megtaláld őket.</p>
                <Link className="gomb gomb-fo" to="/autok">Kínálat böngészése</Link>
            </div>
        );
    }
    return (
        <>
            {szam > lathato.length && <p className="fiok-megjegyzes">Néhány kedvenced már nem elérhető (elkelt vagy lejárt a hirdetés).</p>}
            <div className="autok-racs">
                {lathato.map((auto, i) => <AutoKartya key={auto._id} auto={auto} kesleltetes={i} />)}
            </div>
        </>
    );
};

const Keresesek = () => {
    const navigate = useNavigate();
    const [keresesek, setKeresesek] = useState(null);
    const [hiba, setHiba] = useState('');

    useEffect(() => {
        apiKeres('/fiok/keresesek').then((data) => setKeresesek(data.keresesek)).catch((error) => setHiba(error.message));
    }, []);

    const modositas = async (id, adatok) => {
        try {
            const data = await apiKeres(`/fiok/keresesek/${id}`, { method: 'PATCH', body: adatok });
            setKeresesek((elozo) => elozo.map((k) => (k._id === id ? data.kereses : k)));
            return data.kereses;
        } catch (error) {
            setHiba(error.message);
            return null;
        }
    };

    const megnyitas = async (kereses) => {
        await modositas(kereses._id, { megtekintve: true });
        navigate(`/autok?${new URLSearchParams(kereses.parameterek)}`);
    };

    const torles = async (kereses) => {
        if (!window.confirm(`Törlöd a(z) „${kereses.nev}” keresést?`)) return;
        try {
            await apiKeres(`/fiok/keresesek/${kereses._id}`, { method: 'DELETE' });
            setKeresesek((elozo) => elozo.filter((k) => k._id !== kereses._id));
        } catch (error) {
            setHiba(error.message);
        }
    };

    if (!keresesek) return hiba ? <p className="uzenet uzenet-hiba">{hiba}</p> : <div className="betoltes"><span className="porgo" /></div>;
    if (keresesek.length === 0) {
        return (
            <div className="allapot-doboz uveg">
                <span className="allapot-ikon" aria-hidden="true"><Ikon nev="harang" meret={22} /></span>
                <h3>Nincs mentett keresésed</h3>
                <p>Állítsd be a szűrőket a kínálatban, majd kattints a „Keresés mentése” gombra – e-mailben szólunk, ha új, megfelelő autó érkezik.</p>
                <Link className="gomb gomb-fo" to="/autok">Keresés indítása</Link>
            </div>
        );
    }

    return (
        <div className="keresesek">
            {hiba && <p className="uzenet uzenet-hiba">{hiba}</p>}
            {keresesek.map((kereses) => (
                <article className="kereses uveg" key={kereses._id}>
                    <div className="kereses-fej">
                        <h3>{kereses.nev}</h3>
                        {kereses.ujTalalatok > 0 && <span className="kereses-uj">{kereses.ujTalalatok} új</span>}
                    </div>
                    <div className="kereses-cimkek">
                        {szuroCimkek(kereses.parameterek).map(([kulcs, cimke]) => <span key={kulcs}>{cimke}</span>)}
                    </div>
                    <p className="kereses-info">{kereses.talalatok} találat · mentve: {formatDatum(kereses.createdAt)}</p>
                    <div className="kereses-muveletek">
                        <label className="kapcsolo-sor">
                            <input type="checkbox" checked={kereses.ertesites} onChange={(event) => modositas(kereses._id, { ertesites: event.target.checked })} />
                            <span className="kapcsolo" aria-hidden="true" />
                            <span>E-mail értesítés</span>
                        </label>
                        <div className="kereses-gombok">
                            <button className="ikon-gomb" type="button" onClick={() => torles(kereses)} aria-label={`${kereses.nev} törlése`}><Ikon nev="kuka" /></button>
                            <button className="gomb gomb-fo gomb-kicsi" type="button" onClick={() => megnyitas(kereses)}>Találatok <Ikon nev="jobbra" meret={15} /></button>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
};

const Profil = () => {
    const { user, profilMentese, fiokTorlese } = useAuth();
    const navigate = useNavigate();
    const [adatok, setAdatok] = useState({ nev: user.nev, email: user.email, jelenlegiJelszo: '', ujJelszo: '' });
    const [allapot, setAllapot] = useState(null);
    const [torlesJelszo, setTorlesJelszo] = useState('');
    const [torlesHiba, setTorlesHiba] = useState('');
    const emailValtozik = adatok.email.trim().toLowerCase() !== user.email;
    const kellJelszo = emailValtozik || adatok.ujJelszo.length > 0;

    const beallit = (mezo) => (event) => setAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }));

    const mentes = async (event) => {
        event.preventDefault();
        setAllapot({ tipus: 'folyamat' });
        try {
            const data = await profilMentese(adatok);
            setAdatok((elozo) => ({ ...elozo, jelenlegiJelszo: '', ujJelszo: '' }));
            setAllapot({ tipus: 'siker', szoveg: data.message });
        } catch (error) {
            setAllapot({ tipus: 'hiba', szoveg: error.message });
        }
    };

    const torles = async (event) => {
        event.preventDefault();
        if (!window.confirm('Biztosan törlöd a fiókodat? A kedvencek és mentett keresések is elvesznek. Ez nem vonható vissza.')) return;
        try {
            await fiokTorlese(torlesJelszo);
            navigate('/', { replace: true });
        } catch (error) {
            setTorlesHiba(error.message);
        }
    };

    return (
        <div className="profil">
            <form className="uveg profil-blokk" onSubmit={mentes}>
                <h3>Személyes adatok</h3>
                <div className="profil-mezok">
                    <label className="mezo"><span>Név</span>
                        <input className="bemenet" required minLength={2} maxLength={100} autoComplete="name" value={adatok.nev} onChange={beallit('nev')} />
                    </label>
                    <label className="mezo"><span>E-mail-cím</span>
                        <input className="bemenet" type="email" required autoComplete="email" value={adatok.email} onChange={beallit('email')} />
                    </label>
                    <div className="mezo"><span><label htmlFor="uj-jelszo">Új jelszó</label> <small>(ha módosítanád)</small></span>
                        <input className="bemenet" id="uj-jelszo" type="password" minLength={8} autoComplete="new-password" value={adatok.ujJelszo} onChange={beallit('ujJelszo')} />
                    </div>
                    {kellJelszo && (
                        <div className="mezo"><span><label htmlFor="jelenlegi-jelszo">Jelenlegi jelszó</label> <small>(megerősítéshez)</small></span>
                            <JelszoMezo id="jelenlegi-jelszo" autoComplete="current-password" value={adatok.jelenlegiJelszo} onChange={beallit('jelenlegiJelszo')} />
                        </div>
                    )}
                </div>
                {allapot?.tipus === 'siker' && <p className="uzenet uzenet-siker" role="status">{allapot.szoveg}</p>}
                {allapot?.tipus === 'hiba' && <p className="uzenet uzenet-hiba" role="alert">{allapot.szoveg}</p>}
                <button className="gomb gomb-fo" type="submit" disabled={allapot?.tipus === 'folyamat'}>Mentés</button>
            </form>

            <form className="uveg profil-blokk profil-veszely" onSubmit={torles}>
                <h3>Fiók törlése</h3>
                <p>A fiókod és minden hozzá tartozó adat (kedvencek, mentett keresések) véglegesen törlődik.</p>
                <div className="mezo"><span><label htmlFor="torles-jelszo">Jelszó a megerősítéshez</label></span>
                    <JelszoMezo id="torles-jelszo" autoComplete="current-password" value={torlesJelszo} onChange={(event) => setTorlesJelszo(event.target.value)} />
                </div>
                {torlesHiba && <p className="uzenet uzenet-hiba" role="alert">{torlesHiba}</p>}
                <button className="gomb gomb-veszely" type="submit"><Ikon nev="kuka" meret={15} /> Fiók végleges törlése</button>
            </form>
        </div>
    );
};

const Fiok = () => {
    const { user, munkatars } = useAuth();
    const [params, setParams] = useSearchParams();
    const lap = LAPOK.some(([kulcs]) => kulcs === params.get('lap')) ? params.get('lap') : 'kedvencek';

    useSeo({ cim: 'Fiókom', noindex: true });

    return (
        <main className="oldal fiok">
            <header className="fiok-fejlec beuszas">
                <div>
                    <p className="felirat">Fiókom</p>
                    <h1>Szia, <span className="gradiens-szoveg">{user.nev.split(' ').at(-1)}!</span></h1>
                </div>
                {munkatars && <Link className="gomb gomb-uveg" to="/admin">Admin felület <Ikon nev="jobbra" meret={15} /></Link>}
            </header>

            <div className="fulek" role="tablist" aria-label="Fiók menü">
                {LAPOK.map(([kulcs, cimke, ikon]) => (
                    <button
                        key={kulcs}
                        type="button"
                        role="tab"
                        aria-selected={lap === kulcs}
                        className={`ful ${lap === kulcs ? 'aktiv' : ''}`}
                        onClick={() => setParams(kulcs === 'kedvencek' ? {} : { lap: kulcs }, { replace: true })}
                    >
                        <Ikon nev={ikon} meret={16} /> {cimke}
                        {kulcs === 'kedvencek' && user.kedvencek?.length > 0 && <span className="ful-szam">{user.kedvencek.length}</span>}
                    </button>
                ))}
            </div>

            <section className="fiok-tartalom" role="tabpanel">
                {lap === 'kedvencek' && <Kedvencek />}
                {lap === 'rendelesek' && <Rendelesek />}
                {lap === 'keresesek' && <Keresesek />}
                {lap === 'profil' && <Profil />}
            </section>
        </main>
    );
};

export default Fiok;
