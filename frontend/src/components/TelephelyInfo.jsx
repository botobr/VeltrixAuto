import { useState } from 'react';
import Ikon from './Ikon';
import './TelephelyInfo.css';

const NAPOK = [
    ['hetfo', 'Hétfő'], ['kedd', 'Kedd'], ['szerda', 'Szerda'], ['csutortok', 'Csütörtök'],
    ['pentek', 'Péntek'], ['szombat', 'Szombat'], ['vasarnap', 'Vasárnap'],
];

// JS getDay(): 0 = vasárnap
const maiNap = () => NAPOK[(new Date().getDay() + 6) % 7][0];

const mostNyitva = (nyitvatartas) => {
    const ma = nyitvatartas?.find((sor) => sor.nap === maiNap());
    if (!ma || ma.zarva) return false;
    const most = new Date();
    const ido = `${String(most.getHours()).padStart(2, '0')}:${String(most.getMinutes()).padStart(2, '0')}`;
    return ido >= ma.nyitas && ido < ma.zaras;
};

const teljesCim = (t) => `${t.iranyitoszam ? `${t.iranyitoszam} ` : ''}${t.varos}, ${t.cim}`;

/** Telephely: cím, elérhetőség, nyitvatartás és kattintásra betöltődő térkép. */
const TelephelyInfo = ({ telephely, cimsor = true }) => {
    const [terkep, setTerkep] = useState(false);
    const vanKoordinata = telephely.szelesseg != null && telephely.hosszusag != null;
    const nyitva = mostNyitva(telephely.nyitvatartas);
    const utvonalUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        vanKoordinata ? `${telephely.szelesseg},${telephely.hosszusag}` : teljesCim(telephely),
    )}`;

    const lat = telephely.szelesseg;
    const lng = telephely.hosszusag;
    const terkepUrl = vanKoordinata
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.007},${lng + 0.012},${lat + 0.007}&layer=mapnik&marker=${lat},${lng}`
        : null;

    return (
        <div className="telephely">
            <div className="telephely-adatok">
                {cimsor && (
                    <div className="telephely-fej">
                        <h3>{telephely.nev}</h3>
                        {telephely.nyitvatartas?.length > 0 && (
                            <span className={`telephely-allapot ${nyitva ? 'nyitva' : ''}`}>{nyitva ? 'Most nyitva' : 'Most zárva'}</span>
                        )}
                    </div>
                )}
                <ul className="telephely-elerhetoseg">
                    <li><Ikon nev="terkep" /> {teljesCim(telephely)}{telephely.megye && <small> · {telephely.megye}</small>}</li>
                    {telephely.telefon && (
                        <li><Ikon nev="telefon" /> <a href={`tel:${telephely.telefon.replace(/[^\d+]/g, '')}`}>{telephely.telefon}</a></li>
                    )}
                    {telephely.email && <li><Ikon nev="level" /> <a href={`mailto:${telephely.email}`}>{telephely.email}</a></li>}
                </ul>

                {telephely.nyitvatartas?.length > 0 && (
                    <table className="telephely-nyitvatartas">
                        <caption className="sr-only">Nyitvatartás</caption>
                        <tbody>
                            {NAPOK.map(([kulcs, nev]) => {
                                const sor = telephely.nyitvatartas.find((elem) => elem.nap === kulcs);
                                return (
                                    <tr key={kulcs} className={kulcs === maiNap() ? 'ma' : ''}>
                                        <th scope="row">{nev}</th>
                                        <td>{!sor || sor.zarva ? 'Zárva' : `${sor.nyitas} – ${sor.zaras}`}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <a className="gomb gomb-uveg gomb-kicsi" href={utvonalUrl} target="_blank" rel="noopener noreferrer">
                    <Ikon nev="terkep" meret={15} /> Útvonaltervezés
                </a>
            </div>

            {terkepUrl && (
                <div className="telephely-terkep">
                    {terkep ? (
                        <iframe title={`${telephely.nev} térképen`} src={terkepUrl} loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                        <button type="button" onClick={() => setTerkep(true)}>
                            <Ikon nev="terkep" meret={28} />
                            <strong>Térkép megjelenítése</strong>
                            <small>Betöltéskor az OpenStreetMap szervereihez kapcsolódunk.</small>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TelephelyInfo;
