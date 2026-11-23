import { useId, useRef, useState } from 'react';
import { apiKeres } from '../lib/api';
import { KEP_TIPUSOK, kepMeret, kepTomoritese } from '../lib/auto';
import Ikon from './Ikon';
import './KepKezelo.css';

const MAX_KEP = 30;
const EGYSZERRE = 3; // egyszerre ennyi kép töltődik fel

// Képek kezelése: feltöltés (behúzással is), típus, sorrend, törlés.
// A képek rögtön felkerülnek a Cloudinary-ra, mentéskor már csak az URL-eket küldjük el.
const KepKezelo = ({ kepek, setKepek, onUjKep }) => {
    const id = useId();
    const inputRef = useRef(null);
    const huzott = useRef(null);
    const [feltoltesek, setFeltoltesek] = useState([]);
    const [hibak, setHibak] = useState([]);
    const [zonaAktiv, setZonaAktiv] = useState(false);
    const [huzasCel, setHuzasCel] = useState(null);

    // egy kép tömörítése és feltöltése
    const egyKepFeltoltese = async (elem) => {
        try {
            const adat = await kepTomoritese(elem.fajl);
            const kep = await apiKeres('/kepek', { method: 'POST', body: { kep: adat } }, elem.fajl.name + ': a feltöltés nem sikerült.');
            if (onUjKep) {
                onUjKep(kep.publicId);
            }
            setKepek((elozo) => [...elozo, { url: kep.url, publicId: kep.publicId, tipus: 'kulso', leiras: '' }]);
        } catch (error) {
            setHibak((elozo) => [...elozo, error.message]);
        } finally {
            setFeltoltesek((elozo) => elozo.filter((feltoltes) => feltoltes.kulcs !== elem.kulcs));
        }
    };

    const feltoltes = async (fajlok) => {
        const lista = [];
        for (const fajl of fajlok) {
            if (fajl) {
                lista.push(fajl);
            }
        }
        if (lista.length === 0) {
            return;
        }
        setHibak([]);

        // ennyi kép fér még el
        let hely = MAX_KEP - kepek.length - feltoltesek.length;
        if (hely < 0) {
            hely = 0;
        }
        if (lista.length > hely) {
            setHibak(['Legfeljebb ' + MAX_KEP + ' kép tölthető fel – ' + hely + ' fért el.']);
        }

        const sor = [];
        for (let i = 0; i < lista.length && i < hely; i++) {
            sor.push({ kulcs: Date.now() + '-' + i + '-' + lista[i].name, fajl: lista[i] });
        }
        // a feltöltés alatt álló képek (pörgő ikon)
        setFeltoltesek((elozo) => [...elozo, ...sor.map((elem) => ({ kulcs: elem.kulcs, nev: elem.fajl.name }))]);

        // egyszerre csak néhány kép töltődik fel, így a sorrend is megmarad
        for (let i = 0; i < sor.length; i += EGYSZERRE) {
            const csomag = sor.slice(i, i + EGYSZERRE);
            await Promise.all(csomag.map(egyKepFeltoltese));
        }

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    // kép áthelyezése a listában
    const mozgatas = (honnan, hova) => {
        if (hova < 0 || hova >= kepek.length || honnan === hova) {
            return;
        }
        setKepek((elozo) => {
            const uj = [...elozo];
            const elem = uj.splice(honnan, 1)[0];
            uj.splice(hova, 0, elem);
            return uj;
        });
    };

    const modositas = (index, adatok) => {
        setKepek((elozo) => elozo.map((kep, i) => {
            if (i === index) {
                return { ...kep, ...adatok };
            }
            return kep;
        }));
    };

    const torles = (index) => {
        setKepek((elozo) => elozo.filter((kep, i) => i !== index));
    };

    // --- fájlok behúzása a feltöltő mezőbe ---
    const zonaFolott = (event) => {
        if (event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            setZonaAktiv(true);
        }
    };

    const zonaraEjtes = (event) => {
        if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
            return;
        }
        event.preventDefault();
        setZonaAktiv(false);
        feltoltes(event.dataTransfer.files);
    };

    // --- a képek sorrendjének módosítása húzással ---
    const huzasKezdete = (event, index) => {
        huzott.current = index;
        event.dataTransfer.effectAllowed = 'move';
    };

    const huzasFolott = (event, index) => {
        if (huzott.current !== null) {
            event.preventDefault();
            setHuzasCel(index);
        }
    };

    const ejtes = (event, index) => {
        if (huzott.current === null) {
            return;
        }
        event.preventDefault();
        mozgatas(huzott.current, index);
        huzott.current = null;
        setHuzasCel(null);
    };

    const huzasVege = () => {
        huzott.current = null;
        setHuzasCel(null);
    };

    return (
        <div className="kepkezelo">
            <label
                className={zonaAktiv ? 'kep-zona aktiv' : 'kep-zona'}
                htmlFor={id}
                onDragOver={zonaFolott}
                onDragLeave={() => setZonaAktiv(false)}
                onDrop={zonaraEjtes}
            >
                <span className="kep-zona-ikon" aria-hidden="true"><Ikon nev="kep" meret={22} /></span>
                <strong>Húzd ide a képeket, vagy kattints a tallózáshoz</strong>
                <small>Egyszerre több kép is · JPG, PNG, WebP, HEIC · feltöltés előtt automatikusan tömörítjük · max. {MAX_KEP} kép</small>
                <input
                    ref={inputRef}
                    id={id}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => feltoltes(event.target.files)}
                />
            </label>

            {hibak.length > 0 && (
                <ul className="uzenet uzenet-hiba kepkezelo-hibak" role="alert">
                    {hibak.map((hiba) => <li key={hiba}>{hiba}</li>)}
                </ul>
            )}

            {(kepek.length > 0 || feltoltesek.length > 0) && (
                <>
                    <p className="kepkezelo-sugo">Az első kép a borítókép. Húzd a képeket a sorrend módosításához, és add meg a típusukat – az adatlapon e szerint szűrhetők.</p>
                    <ol className="kepkezelo-racs">
                        {kepek.map((kep, index) => (
                            <li
                                key={kep.publicId}
                                className={huzasCel === index ? 'kepkezelo-elem huzas-cel' : 'kepkezelo-elem'}
                                draggable
                                onDragStart={(event) => huzasKezdete(event, index)}
                                onDragOver={(event) => huzasFolott(event, index)}
                                onDragLeave={() => setHuzasCel(null)}
                                onDrop={(event) => ejtes(event, index)}
                                onDragEnd={huzasVege}
                            >
                                <div className="kepkezelo-kep">
                                    <img src={kepMeret(kep.url, 400)} alt={(index + 1) + '. kép'} draggable={false} />
                                    <span className="kepkezelo-sorszam">{index === 0 ? 'Borítókép' : index + 1}</span>
                                    <span className="kepkezelo-fogo" aria-hidden="true"><Ikon nev="fogd" meret={16} /></span>
                                </div>
                                <div className="kepkezelo-vezerlok">
                                    <select
                                        className="bemenet"
                                        aria-label={(index + 1) + '. kép típusa'}
                                        value={kep.tipus}
                                        onChange={(event) => modositas(index, { tipus: event.target.value })}
                                    >
                                        {Object.entries(KEP_TIPUSOK).map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                                    </select>
                                    <div className="kepkezelo-gombok">
                                        <button type="button" className="ikon-gomb" onClick={() => mozgatas(index, index - 1)} disabled={index === 0} aria-label="Előrébb">
                                            <Ikon nev="balra" meret={15} />
                                        </button>
                                        <button type="button" className="ikon-gomb" onClick={() => mozgatas(index, index + 1)} disabled={index === kepek.length - 1} aria-label="Hátrébb">
                                            <Ikon nev="jobbra" meret={15} />
                                        </button>
                                        <button type="button" className="ikon-gomb" onClick={() => mozgatas(index, 0)} disabled={index === 0} aria-label="Legyen a borítókép" title="Borítókép">
                                            <Ikon nev="csillag" meret={15} />
                                        </button>
                                        <button type="button" className="ikon-gomb kepkezelo-torles" onClick={() => torles(index)} aria-label={(index + 1) + '. kép törlése'}>
                                            <Ikon nev="kuka" meret={15} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {feltoltesek.map((elem) => (
                            <li key={elem.kulcs} className="kepkezelo-elem kepkezelo-tolt" aria-live="polite">
                                <div className="kepkezelo-kep"><span className="porgo" aria-hidden="true" /></div>
                                <small>{elem.nev}</small>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </div>
    );
};

export default KepKezelo;
