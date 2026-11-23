import { useEffect, useState } from 'react';
import Ikon from '../../components/Ikon';
import { useFelhasznalo } from '../../context/felhasznalo';
import { apiKeres } from '../../lib/api';
import { formatDatum } from '../../lib/auto';

const SZEREPKOROK = { admin: 'Admin', ertekesito: 'Értékesítő', felhasznalo: 'Vásárló' };

// új felhasználó (pl. értékesítő) felvétele
const UjFelhasznalo = ({ onLetrehozva, onMegse }) => {
    const [adatok, setAdatok] = useState({ nev: '', email: '', jelszo: '', statusz: 'ertekesito' });
    const [hiba, setHiba] = useState('');

    const beallit = (mezo) => (event) => {
        setAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }));
    };

    const kuldes = async (event) => {
        event.preventDefault();
        setHiba('');
        try {
            const data = await apiKeres('/felhasznalok', { method: 'POST', body: adatok }, 'A létrehozás nem sikerült.');
            onLetrehozva(data.felhasznalo);
        } catch (error) {
            setHiba(error.message);
        }
    };

    return (
        <form className="uveg admin-urlap" onSubmit={kuldes}>
            <h3>Új felhasználó</h3>
            <div className="admin-urlap-racs">
                <label className="mezo"><span>Név</span><input className="bemenet" required value={adatok.nev} onChange={beallit('nev')} /></label>
                <label className="mezo"><span>E-mail</span><input className="bemenet" type="email" required value={adatok.email} onChange={beallit('email')} /></label>
                <label className="mezo"><span>Ideiglenes jelszó <small>(min. 8 karakter)</small></span><input className="bemenet" type="text" minLength={8} required autoComplete="off" value={adatok.jelszo} onChange={beallit('jelszo')} /></label>
                <label className="mezo"><span>Szerepkör</span>
                    <select className="bemenet" value={adatok.statusz} onChange={beallit('statusz')}>
                        {Object.entries(SZEREPKOROK).map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                    </select>
                </label>
            </div>
            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
            <div className="admin-urlap-gombok">
                <button className="gomb gomb-uveg" type="button" onClick={onMegse}>Mégse</button>
                <button className="gomb gomb-fo" type="submit">Létrehozás</button>
            </div>
        </form>
    );
};

// felhasználók kezelése (csak admin)
const AdminFelhasznalok = () => {
    const { felhasznalo } = useFelhasznalo();
    const [felhasznalok, setFelhasznalok] = useState(null);
    const [uj, setUj] = useState(false);
    const [szuro, setSzuro] = useState('');
    const [hiba, setHiba] = useState('');

    useEffect(() => {
        apiKeres('/felhasznalok')
            .then((data) => setFelhasznalok(data.felhasznalok))
            .catch((error) => setHiba(error.message));
    }, []);

    const szerepkorValtas = async (valasztott, statusz) => {
        setHiba('');
        try {
            const torzs = { nev: valasztott.nev, email: valasztott.email, statusz: statusz };
            const data = await apiKeres('/felhasznalok/' + valasztott._id, { method: 'PUT', body: torzs }, 'A módosítás nem sikerült.');
            setFelhasznalok((elozo) => elozo.map((elem) => {
                if (elem._id === valasztott._id) {
                    return data.felhasznalo;
                }
                return elem;
            }));
        } catch (error) {
            setHiba(error.message);
        }
    };

    const torles = async (valasztott) => {
        if (!window.confirm('Törlöd ' + valasztott.nev + ' (' + valasztott.email + ') fiókját?')) {
            return;
        }
        try {
            await apiKeres('/felhasznalok/' + valasztott._id, { method: 'DELETE' }, 'A törlés nem sikerült.');
            setFelhasznalok((elozo) => elozo.filter((elem) => elem._id !== valasztott._id));
        } catch (error) {
            setHiba(error.message);
        }
    };

    const letrehozva = (ujFelhasznalo) => {
        setFelhasznalok((elozo) => [ujFelhasznalo, ...elozo]);
        setUj(false);
    };

    if (!felhasznalok) {
        if (hiba) {
            return <p className="uzenet uzenet-hiba">{hiba}</p>;
        }
        return <div className="betoltes"><span className="porgo" /></div>;
    }

    // szerepkör szerinti szűrés
    let lathato = felhasznalok;
    if (szuro) {
        lathato = felhasznalok.filter((elem) => elem.statusz === szuro);
    }

    // hány felhasználó van egy szerepkörben
    const darab = (szerepkor) => {
        let db = 0;
        for (const elem of felhasznalok) {
            if (elem.statusz === szerepkor) {
                db++;
            }
        }
        return db;
    };

    return (
        <div className="admin-lista">
            {uj ? (
                <UjFelhasznalo onLetrehozva={letrehozva} onMegse={() => setUj(false)} />
            ) : (
                <div className="admin-eszkoztar">
                    <div className="szuro-csipek">
                        <button type="button" className={!szuro ? 'csip aktiv' : 'csip'} onClick={() => setSzuro('')}>Mind ({felhasznalok.length})</button>
                        {Object.entries(SZEREPKOROK).map(([ertek, cimke]) => (
                            <button key={ertek} type="button" className={szuro === ertek ? 'csip aktiv' : 'csip'} onClick={() => setSzuro(ertek)}>
                                {cimke} ({darab(ertek)})
                            </button>
                        ))}
                    </div>
                    <button className="gomb gomb-fo gomb-kicsi" type="button" onClick={() => setUj(true)}><Ikon nev="plusz" meret={15} /> Új felhasználó</button>
                </div>
            )}
            {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}

            <div className="uveg admin-tabla-tarto">
                <table className="admin-tabla">
                    <thead>
                        <tr><th scope="col">Név</th><th scope="col">E-mail</th><th scope="col">Regisztrált</th><th scope="col">Kedvencek</th><th scope="col">Szerepkör</th><th scope="col"><span className="sr-only">Művelet</span></th></tr>
                    </thead>
                    <tbody>
                        {lathato.map((f) => {
                            const sajat = f._id === felhasznalo._id;
                            return (
                                <tr key={f._id}>
                                    <td><strong>{f.nev}</strong>{sajat && <small className="halvany"> (te)</small>}</td>
                                    <td><a href={'mailto:' + f.email}>{f.email}</a></td>
                                    <td>{formatDatum(f.createdAt)}</td>
                                    <td>{f.kedvencek ? f.kedvencek.length : 0}</td>
                                    <td>
                                        <select className="bemenet" aria-label={f.nev + ' szerepköre'} value={f.statusz} disabled={sajat}
                                            onChange={(event) => szerepkorValtas(f, event.target.value)}>
                                            {Object.entries(SZEREPKOROK).map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        {!sajat && (
                                            <button className="ikon-gomb" type="button" onClick={() => torles(f)} aria-label={f.nev + ' törlése'}><Ikon nev="kuka" /></button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminFelhasznalok;
