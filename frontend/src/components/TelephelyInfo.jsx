import { useState } from 'react';
import Ikon from './Ikon';
import './TelephelyInfo.css';

const NAPOK = [
    ['hetfo', 'Hétfő'], ['kedd', 'Kedd'], ['szerda', 'Szerda'], ['csutortok', 'Csütörtök'],
    ['pentek', 'Péntek'], ['szombat', 'Szombat'], ['vasarnap', 'Vasárnap'],
];

// melyik nap van ma (a getDay() 0-val, vasárnappal kezd, ezért kell átszámolni)
const maiNap = () => {
    const index = (new Date().getDay() + 6) % 7;
    return NAPOK[index][0];
};

// nyitva vannak-e most
const mostNyitva = (nyitvatartas) => {
    if (!nyitvatartas) {
        return false;
    }
    const ma = nyitvatartas.find((sor) => sor.nap === maiNap());
    if (!ma || ma.zarva) {
        return false;
    }
    const most = new Date();
    const ora = String(most.getHours()).padStart(2, '0');
    const perc = String(most.getMinutes()).padStart(2, '0');
    const ido = ora + ':' + perc;
    // az 'ÓÓ:PP' szövegeket így össze lehet hasonlítani
    return ido >= ma.nyitas && ido < ma.zaras;
};

const teljesCim = (telephely) => {
    let cim = telephely.varos + ', ' + telephely.cim;
    if (telephely.iranyitoszam) {
        cim = telephely.iranyitoszam + ' ' + cim;
    }
    return cim;
};

// telephely adatai: cím, elérhetőség, nyitvatartás, térkép (csak kattintásra töltődik be)
const TelephelyInfo = ({ telephely, cimsor = true }) => {
    const [terkep, setTerkep] = useState(false);
    const lat = telephely.szelesseg;
    const lng = telephely.hosszusag;
    const vanKoordinata = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
    const nyitva = mostNyitva(telephely.nyitvatartas);
    const vanNyitvatartas = telephely.nyitvatartas && telephely.nyitvatartas.length > 0;

    // útvonaltervezés Google Mapsben (koordinátával vagy címmel)
    let cel = teljesCim(telephely);
    if (vanKoordinata) {
        cel = lat + ',' + lng;
    }
    const utvonalUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(cel);

    // OpenStreetMap térkép a telephely körül
    let terkepUrl = null;
    if (vanKoordinata) {
        const bbox = (lng - 0.012) + ',' + (lat - 0.007) + ',' + (lng + 0.012) + ',' + (lat + 0.007);
        terkepUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + lat + ',' + lng;
    }

    return (
        <div className="telephely">
            <div className="telephely-adatok">
                {cimsor && (
                    <div className="telephely-fej">
                        <h3>{telephely.nev}</h3>
                        {vanNyitvatartas && (
                            <span className={nyitva ? 'telephely-allapot nyitva' : 'telephely-allapot'}>{nyitva ? 'Most nyitva' : 'Most zárva'}</span>
                        )}
                    </div>
                )}
                <ul className="telephely-elerhetoseg">
                    <li><Ikon nev="terkep" /> {teljesCim(telephely)}{telephely.megye && <small> · {telephely.megye}</small>}</li>
                    {telephely.telefon && (
                        <li><Ikon nev="telefon" /> <a href={'tel:' + telephely.telefon.replace(/[^\d+]/g, '')}>{telephely.telefon}</a></li>
                    )}
                    {telephely.email && <li><Ikon nev="level" /> <a href={'mailto:' + telephely.email}>{telephely.email}</a></li>}
                </ul>

                {vanNyitvatartas && (
                    <table className="telephely-nyitvatartas">
                        <caption className="sr-only">Nyitvatartás</caption>
                        <tbody>
                            {NAPOK.map(([kulcs, nev]) => {
                                const sor = telephely.nyitvatartas.find((elem) => elem.nap === kulcs);
                                let ido = 'Zárva';
                                if (sor && !sor.zarva) {
                                    ido = sor.nyitas + ' – ' + sor.zaras;
                                }
                                return (
                                    <tr key={kulcs} className={kulcs === maiNap() ? 'ma' : ''}>
                                        <th scope="row">{nev}</th>
                                        <td>{ido}</td>
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
                        <iframe title={telephely.nev + ' térképen'} src={terkepUrl} loading="lazy" referrerPolicy="no-referrer" />
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
