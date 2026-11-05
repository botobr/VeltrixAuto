import { useState } from 'react';
import { Link } from 'react-router-dom';
import AutoKartya from '../components/AutoKartya';
import AutoMezok from '../components/AutoMezok';
import KepValaszto from '../components/KepValaszto';
import { apiKeres } from '../lib/api';
import { kuldhetoAdatok, szamMezok, uresAutoAdatok } from '../lib/auto';
import './Feltolt.css';

const Feltolt = () => {
    const [adatok, setAdatok] = useState(uresAutoAdatok);
    const [egyediMezok, setEgyediMezok] = useState({});
    const [kep, setKep] = useState(null);
    const [uzenet, setUzenet] = useState(null);
    const [folyamatban, setFolyamatban] = useState(false);

    const elonezetAuto = {
        ...adatok,
        ...Object.fromEntries(szamMezok.map((mezo) => [mezo, adatok[mezo] === '' ? null : Number(adatok[mezo])])),
        kep: kep?.adat,
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setUzenet(null);
        if (!kep) {
            setUzenet({ tipus: 'hiba', szoveg: 'A feltöltéshez válassz egy képet az autóról.' });
            return;
        }
        setFolyamatban(true);
        try {
            const data = await apiKeres(
                '/new-auto',
                { method: 'POST', body: { ...kuldhetoAdatok(adatok), kep: kep.adat } },
                'Az autó feltöltése nem sikerült.',
            );
            setAdatok(uresAutoAdatok);
            setEgyediMezok({});
            setKep(null);
            setUzenet({ tipus: 'siker', szoveg: data.message || 'Az autó sikeresen feltöltve.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            setUzenet({ tipus: 'hiba', szoveg: error.message });
        } finally {
            setFolyamatban(false);
        }
    };

    return (
        <main className="oldal feltolt">
            <header className="feltolt-fejlec beuszas">
                <p className="felirat">Veltrix garázs</p>
                <h1>Új autó <span className="gradiens-szoveg">feltöltése</span></h1>
                <p>Add meg a jármű adatait, és tölts fel róla egy jó minőségű képet – az előnézet élőben frissül.</p>
            </header>

            {uzenet?.tipus === 'siker' && (
                <p className="uzenet uzenet-siker feltolt-siker" role="status">
                    {uzenet.szoveg} <Link to="/autok">Megnézem a kínálatban →</Link>
                </p>
            )}

            <div className="feltolt-elrendezes">
                <form className="feltolt-kartya uveg" onSubmit={handleSubmit}>
                    <h2 className="feltolt-blokk-cim">Jármű adatai</h2>
                    <AutoMezok
                        adatok={adatok}
                        setAdatok={setAdatok}
                        egyediMezok={egyediMezok}
                        setEgyediMezok={setEgyediMezok}
                        idElotag="uj"
                    />
                    <div className="feltolt-kep">
                        <KepValaszto
                            elonezet={kep?.adat}
                            kepNev={kep?.nev}
                            onKep={(adat, nev) => setKep({ adat, nev })}
                            onHiba={(szoveg) => setUzenet(szoveg ? { tipus: 'hiba', szoveg } : null)}
                        />
                    </div>
                    {uzenet?.tipus === 'hiba' && <p className="uzenet uzenet-hiba feltolt-uzenet" role="alert">{uzenet.szoveg}</p>}
                    <button className="gomb gomb-fo feltolt-kuldes" type="submit" disabled={folyamatban}>
                        {folyamatban ? 'Feltöltés…' : 'Autó feltöltése'}
                        {!folyamatban && <span className="nyil" aria-hidden="true">↗</span>}
                    </button>
                </form>

                <aside className="feltolt-elonezet" aria-label="Hirdetés előnézete">
                    <p className="feltolt-elonezet-cim">Élő előnézet</p>
                    <AutoKartya auto={elonezetAuto} />
                </aside>
            </div>
        </main>
    );
};

export default Feltolt;
