import { useEffect, useState } from 'react';
import Ikon from '../../components/Ikon';
import TelephelyInfo from '../../components/TelephelyInfo';
import { apiKeres } from '../../lib/api';
import { MEGYEK } from '../../lib/auto';

const NAPOK = [
    ['hetfo', 'Hétfő'], ['kedd', 'Kedd'], ['szerda', 'Szerda'], ['csutortok', 'Csütörtök'],
    ['pentek', 'Péntek'], ['szombat', 'Szombat'], ['vasarnap', 'Vasárnap'],
];

const uresTelephely = () => ({
    nev: '', iranyitoszam: '', varos: '', cim: '', megye: 'Budapest', telefon: '', email: '', szelesseg: '', hosszusag: '',
    nyitvatartas: NAPOK.map(([nap]) => ({
        nap,
        zarva: nap === 'vasarnap',
        nyitas: '09:00',
        zaras: nap === 'szombat' ? '13:00' : '18:00',
    })),
});

const urlapbol = (t) => ({
    ...uresTelephely(),
    ...t,
    szelesseg: t.szelesseg ?? '',
    hosszusag: t.hosszusag ?? '',
    nyitvatartas: NAPOK.map(([nap]) => t.nyitvatartas?.find((sor) => sor.nap === nap) || { nap, zarva: true, nyitas: '09:00', zaras: '17:00' }),
});

const TelephelyUrlap = ({ kezdo, onMentve, onMegse }) => {
    const [adatok, setAdatok] = useState(() => urlapbol(kezdo || {}));
    const [hiba, setHiba] = useState('');
    const [mentes, setMentes] = useState(false);

    const beallit = (mezo) => (event) => setAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }));
    const napBeallit = (index, mezo, ertek) => setAdatok((elozo) => ({
        ...elozo,
        nyitvatartas: elozo.nyitvatartas.map((sor, i) => (i === index ? { ...sor, [mezo]: ertek } : sor)),
    }));

    const kuldes = async (event) => {
        event.preventDefault();
        setMentes(true);
        setHiba('');
        try {
            const data = await apiKeres(kezdo?._id ? `/telephelyek/${kezdo._id}` : '/telephelyek', {
                method: kezdo?._id ? 'PUT' : 'POST',
                body: adatok,
            }, 'A telephely mentése nem sikerült.');
            onMentve(data.telephely);
        } catch (error) {
            setHiba(error.message);
            setMentes(false);
        }
    };

    return (
        <form className="uveg admin-urlap" onSubmit={kuldes}>
            <h3>{kezdo?._id ? 'Telephely szerkesztése' : 'Új telephely'}</h3>
            <div className="admin-urlap-racs">
                <label className="mezo"><span>Név</span><input className="bemenet" required maxLength={80} placeholder="pl. Budaörsi bemutatóterem" value={adatok.nev} onChange={beallit('nev')} /></label>
                <label className="mezo"><span>Megye</span>
                    <select className="bemenet" value={adatok.megye} onChange={beallit('megye')}>
                        {MEGYEK.map((megye) => <option key={megye} value={megye}>{megye}</option>)}
                    </select>
                </label>
                <label className="mezo"><span>Irányítószám</span><input className="bemenet" maxLength={10} value={adatok.iranyitoszam} onChange={beallit('iranyitoszam')} /></label>
                <label className="mezo"><span>Város</span><input className="bemenet" required maxLength={60} value={adatok.varos} onChange={beallit('varos')} /></label>
                <label className="mezo mezo-szeles"><span>Utca, házszám</span><input className="bemenet" required maxLength={120} value={adatok.cim} onChange={beallit('cim')} /></label>
                <label className="mezo"><span>Telefon</span><input className="bemenet" type="tel" maxLength={40} value={adatok.telefon} onChange={beallit('telefon')} /></label>
                <label className="mezo"><span>E-mail <small>(ide érkeznek az érdeklődések)</small></span><input className="bemenet" type="email" maxLength={120} value={adatok.email} onChange={beallit('email')} /></label>
                <label className="mezo"><span>Földrajzi szélesség <small>(térképhez)</small></span><input className="bemenet" type="number" step="any" min={-90} max={90} placeholder="pl. 47.4625" value={adatok.szelesseg} onChange={beallit('szelesseg')} /></label>
                <label className="mezo"><span>Földrajzi hosszúság</span><input className="bemenet" type="number" step="any" min={-180} max={180} placeholder="pl. 18.9572" value={adatok.hosszusag} onChange={beallit('hosszusag')} /></label>
            </div>
            <p className="admin-sugo">Tipp: a koordinátákat a Google Térképen a helyre jobb gombbal kattintva másolhatod ki.</p>

            <fieldset className="nyitvatartas-szerkeszto">
                <legend>Nyitvatartás</legend>
                {adatok.nyitvatartas.map((sor, i) => (
                    <div className="nyitvatartas-sor" key={sor.nap}>
                        <span>{NAPOK[i][1]}</span>
                        <label className="kapcsolo-sor">
                            <input type="checkbox" checked={!sor.zarva} onChange={(event) => napBeallit(i, 'zarva', !event.target.checked)} />
                            <span className="kapcsolo" aria-hidden="true" /> {sor.zarva ? 'Zárva' : 'Nyitva'}
                        </label>
                        <input className="bemenet" type="time" aria-label={`${NAPOK[i][1]} nyitás`} disabled={sor.zarva} value={sor.nyitas} onChange={(event) => napBeallit(i, 'nyitas', event.target.value)} />
                        <input className="bemenet" type="time" aria-label={`${NAPOK[i][1]} zárás`} disabled={sor.zarva} value={sor.zaras} onChange={(event) => napBeallit(i, 'zaras', event.target.value)} />
                    </div>
                ))}
            </fieldset>

            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
            <div className="admin-urlap-gombok">
                <button className="gomb gomb-uveg" type="button" onClick={onMegse}>Mégse</button>
                <button className="gomb gomb-fo" type="submit" disabled={mentes}>{mentes ? 'Mentés…' : 'Mentés'}</button>
            </div>
        </form>
    );
};

const AdminTelephelyek = () => {
    const [telephelyek, setTelephelyek] = useState(null);
    const [szerkesztett, setSzerkesztett] = useState(null);
    const [hiba, setHiba] = useState('');

    useEffect(() => {
        apiKeres('/telephelyek').then((data) => setTelephelyek(data.telephelyek)).catch((error) => setHiba(error.message));
    }, []);

    const mentve = (telephely) => {
        setTelephelyek((elozo) => (elozo.some((t) => t._id === telephely._id)
            ? elozo.map((t) => (t._id === telephely._id ? telephely : t))
            : [...elozo, telephely]));
        setSzerkesztett(null);
    };

    const torles = async (telephely) => {
        if (!window.confirm(`Törlöd a(z) ${telephely.nev} telephelyet?`)) return;
        try {
            await apiKeres(`/telephelyek/${telephely._id}`, { method: 'DELETE' }, 'A törlés nem sikerült.');
            setTelephelyek((elozo) => elozo.filter((t) => t._id !== telephely._id));
        } catch (error) {
            setHiba(error.message);
        }
    };

    if (!telephelyek) return hiba ? <p className="uzenet uzenet-hiba">{hiba}</p> : <div className="betoltes"><span className="porgo" /></div>;

    return (
        <div className="admin-lista">
            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
            {szerkesztett ? (
                <TelephelyUrlap key={szerkesztett._id || 'uj'} kezdo={szerkesztett} onMentve={mentve} onMegse={() => setSzerkesztett(null)} />
            ) : (
                <div className="admin-eszkoztar">
                    <p className="halvany">A telephelyek címe, nyitvatartása és elérhetősége megjelenik az adatlapokon és a Rólunk oldalon. Az érdeklődések a telephely e-mail-címére mennek.</p>
                    <button className="gomb gomb-fo gomb-kicsi" type="button" onClick={() => setSzerkesztett({})}><Ikon nev="plusz" meret={15} /> Új telephely</button>
                </div>
            )}
            {telephelyek.length === 0 && !szerkesztett && (
                <div className="allapot-doboz uveg"><h3>Még nincs telephely</h3><p>Vegyél fel legalább egyet, hogy a vásárlók lássák, hol tekinthetik meg az autókat.</p></div>
            )}
            {telephelyek.map((telephely) => (
                <article className="uveg admin-telephely" key={telephely._id}>
                    <TelephelyInfo telephely={telephely} />
                    <div className="admin-hirdetes-muveletek">
                        <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={() => setSzerkesztett(telephely)}><Ikon nev="szerkeszt" meret={15} /> Szerkesztés</button>
                        <button className="ikon-gomb" type="button" onClick={() => torles(telephely)} aria-label={`${telephely.nev} törlése`}><Ikon nev="kuka" /></button>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default AdminTelephelyek;
