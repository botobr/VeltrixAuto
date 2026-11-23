import { useState } from 'react';
import { formatSzam } from '../../lib/auto';

const szazalekFormatum = new Intl.NumberFormat('hu-HU', { style: 'percent', maximumFractionDigits: 0 });

// hány százalék a rész az egészből
const arany = (resz, egesz) => {
    if (egesz <= 0) {
        return '0%';
    }
    return szazalekFormatum.format(resz / egesz);
};

// lista elemeinek összege egy mező szerint
const osszeg = (lista, mezo) => {
    let osszesen = 0;
    for (const elem of lista) {
        osszesen += elem[mezo];
    }
    return osszesen;
};

// A diagram függőleges skálája: kb. 4 vonal, "szép" lépésekkel (1, 2, 5, 10, 20, 50, ...).
const skala = (max, egesz) => {
    if (max <= 0) {
        return { lepes: 1, teteje: 1, racs: [0] };
    }
    const nyers = max / 4;
    // 10 melyik hatványa (pl. 3500 -> 1000)
    const nagysag = Math.pow(10, Math.floor(Math.log10(nyers)));
    const normalt = nyers / nagysag;

    let lepes = 10 * nagysag;
    if (normalt <= 1) {
        lepes = nagysag;
    } else if (normalt <= 2) {
        lepes = 2 * nagysag;
    } else if (normalt <= 5) {
        lepes = 5 * nagysag;
    }
    // darabszámnál nem lehet tört lépés
    if (egesz) {
        lepes = Math.max(1, Math.round(lepes));
    }

    const teteje = Math.ceil(max / lepes) * lepes;
    const racs = [];
    const vonalakSzama = Math.round(teteje / lepes) + 1;
    for (let i = 0; i < vonalakSzama; i++) {
        racs.push(i * lepes);
    }
    return { lepes: lepes, teteje: teteje, racs: racs };
};

// Oszlopdiagram rácsvonalakkal és tooltippel, át lehet váltani táblázatra is.
// sor: [{ kulcs, ertek, tengely, tipp: { ertek, reszlet, datum } }]
export const OszlopDiagram = ({
    cim, alcim, sor, ariaCimke, uresSzoveg,
    tengelyFormat = formatSzam, tengelyIndexek, szukIndexek, tablaFejlec, tablaSor,
    egesz = true, className = '',
}) => {
    const [aktiv, setAktiv] = useState(null);
    const [tablazat, setTablazat] = useState(false);
    let max = 0;
    for (const elem of sor) {
        if (elem.ertek > max) {
            max = elem.ertek;
        }
    }
    const { teteje, racs } = skala(max, egesz);

    // melyik oszlop alá kerüljön felirat (ha nincs megadva, mindegyik alá)
    let cimkezettIndexek = tengelyIndexek;
    if (!cimkezettIndexek) {
        cimkezettIndexek = sor.map((elem, i) => i);
    }
    // keskeny képernyőn csak ezek látszanak
    let szukonIsLathato = szukIndexek;
    if (!szukonIsLathato) {
        szukonIsLathato = cimkezettIndexek;
    }
    const cimkezett = new Set(cimkezettIndexek);
    const mindig = new Set(szukonIsLathato);

    return (
        <figure className={'diagram db-kartya uveg ' + className}>
            <figcaption className="diagram-fej">
                <div>
                    <h3>{cim}</h3>
                    {alcim && <span>{alcim}</span>}
                </div>
                <button className="szoveg-gomb" type="button" onClick={() => setTablazat((elozo) => !elozo)} aria-pressed={tablazat}>
                    {tablazat ? 'Diagram' : 'Táblázat'}
                </button>
            </figcaption>

            {tablazat ? (
                <div className="diagram-tabla">
                    <table>
                        <thead><tr>{tablaFejlec.map((fejlec) => <th key={fejlec} scope="col">{fejlec}</th>)}</tr></thead>
                        <tbody>
                            {[...sor].reverse().map((elem) => (
                                <tr key={elem.kulcs}>{tablaSor(elem).map((cella, i) => <td key={i}>{cella}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="diagram-terulet" role="img" aria-label={ariaCimke}>
                    <div className="diagram-racs" aria-hidden="true">
                        {racs.map((ertek) => (
                            <div key={ertek} className="diagram-racsvonal" style={{ bottom: `${(ertek / teteje) * 100}%` }}>
                                <span>{tengelyFormat(ertek)}</span>
                            </div>
                        ))}
                    </div>
                    {max === 0 && uresSzoveg && <p className="db-diagram-ures">{uresSzoveg}</p>}
                    <div className="diagram-oszlopok" onPointerLeave={() => setAktiv(null)}>
                        {sor.map((elem, i) => (
                            <div key={elem.kulcs} className={`diagram-sav ${aktiv === i ? 'aktiv' : ''}`} onPointerEnter={() => setAktiv(i)}>
                                {elem.ertek > 0 && <span className="diagram-oszlop" style={{ height: `${(elem.ertek / teteje) * 100}%` }} />}
                                {aktiv === i && (
                                    <span className={`diagram-tipp ${i >= sor.length * 0.7 ? 'balra' : ''}`} role="tooltip">
                                        <strong>{elem.tipp.ertek}</strong>
                                        {elem.tipp.reszlet && <span>{elem.tipp.reszlet}</span>}
                                        <small>{elem.tipp.datum}</small>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="diagram-tengely" aria-hidden="true">
                        {sor.map((elem, i) => cimkezett.has(i) && (
                            <span key={elem.kulcs} className={mindig.has(i) ? '' : 'db-szuk-rejtett'} style={{ left: `${((i + 0.5) / sor.length) * 100}%` }}>
                                {elem.tengely}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </figure>
    );
};

// vízszintes sávok (pl. üzemanyag szerint)
export const SavLista = ({ cim, alcim, elemek, egyseg = 'autó' }) => {
    let max = 1;
    for (const elem of elemek) {
        if (elem.db > max) {
            max = elem.db;
        }
    }
    const osszes = osszeg(elemek, 'db');

    return (
        <figure className="db-kartya uveg db-savlista">
            <figcaption className="diagram-fej">
                <div>
                    <h3>{cim}</h3>
                    {alcim && <span>{alcim}</span>}
                </div>
            </figcaption>
            {osszes === 0 ? <p className="db-ures">Nincs készleten lévő autó.</p> : (
                <ul>
                    {elemek.map((elem) => (
                        <li key={elem.nev} title={elem.nev + ': ' + formatSzam(elem.db) + ' ' + egyseg + ' (' + arany(elem.db, osszes) + ')'}>
                            <span className="db-sav-nev">{elem.nev}</span>
                            <span className="db-sav-sin" aria-hidden="true">
                                {elem.db > 0 && <span className="db-sav" style={{ width: `${(elem.db / max) * 100}%` }} />}
                            </span>
                            <span className="db-sav-ertek">{formatSzam(elem.db)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </figure>
    );
};

// egy egész részei egy vékony sávban, jelmagyarázattal. reszek: [{ kulcs, nev, db }]
export const SzegmensSav = ({ reszek, cimke }) => {
    const osszes = osszeg(reszek, 'db');
    const leiras = reszek.map((resz) => resz.nev + ': ' + resz.db + ' (' + arany(resz.db, osszes) + ')').join(', ');

    return (
        <div className="db-szegmens">
            <div className="db-szegmens-sav" role="img" aria-label={`${cimke}: ${leiras}`}>
                {osszes === 0 ? <span className="db-szegmens-ures" /> : reszek.filter((resz) => resz.db > 0).map((resz) => (
                    <span key={resz.kulcs} className={`db-szegmens-resz db-szin-${resz.kulcs}`} style={{ flexGrow: resz.db }}
                        title={`${resz.nev}: ${resz.db} (${arany(resz.db, osszes)})`} />
                ))}
            </div>
            <ul className="db-jelmagyarazat">
                {reszek.map((resz) => (
                    <li key={resz.kulcs}>
                        <span className={`db-jel db-szin-${resz.kulcs}`} aria-hidden="true" />
                        {resz.nev}
                        <strong>{formatSzam(resz.db)}</strong>
                        <small>{arany(resz.db, osszes)}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
};
