import { useId, useRef, useState } from 'react';
import { apiKeres } from '../lib/api';
import { KEP_TIPUSOK, kepMeret, kepTomoritese } from '../lib/auto';
import Ikon from './Ikon';
import './KepKezelo.css';

const MAX_KEP = 30;
const PARHUZAMOS = 3;

/**
 * Több kép kezelése: feltöltés (húzással is), típus, sorrend, törlés.
 * A képek azonnal felkerülnek a Cloudinaryra; a hirdetés mentésekor csak az URL-ek mennek.
 */
const KepKezelo = ({ kepek, setKepek, onUjKep }) => {
    const id = useId();
    const inputRef = useRef(null);
    const huzott = useRef(null);
    const [feltoltesek, setFeltoltesek] = useState([]);
    const [hibak, setHibak] = useState([]);
    const [zonaAktiv, setZonaAktiv] = useState(false);
    const [huzasCel, setHuzasCel] = useState(null);

    const feltoltes = async (fajlok) => {
        const lista = [...fajlok].filter(Boolean);
        if (!lista.length) return;
        setHibak([]);
        const hely = MAX_KEP - kepek.length - feltoltesek.length;
        if (lista.length > hely) setHibak([`Legfeljebb ${MAX_KEP} kép tölthető fel – ${Math.max(hely, 0)} fért el.`]);
        const sor = lista.slice(0, Math.max(hely, 0)).map((fajl, i) => ({ kulcs: `${Date.now()}-${i}-${fajl.name}`, fajl }));
        setFeltoltesek((elozo) => [...elozo, ...sor.map(({ kulcs, fajl }) => ({ kulcs, nev: fajl.name }))]);

        const egy = async ({ kulcs, fajl }) => {
            try {
                const adat = await kepTomoritese(fajl);
                const kep = await apiKeres('/kepek', { method: 'POST', body: { kep: adat } }, `${fajl.name}: a feltöltés nem sikerült.`);
                onUjKep?.(kep.publicId);
                setKepek((elozo) => [...elozo, { url: kep.url, publicId: kep.publicId, tipus: 'kulso', leiras: '' }]);
            } catch (error) {
                setHibak((elozo) => [...elozo, error.message]);
            } finally {
                setFeltoltesek((elozo) => elozo.filter((elem) => elem.kulcs !== kulcs));
            }
        };

        // Egyszerre legfeljebb néhány feltöltés fut, a sorrend megmarad.
        for (let i = 0; i < sor.length; i += PARHUZAMOS) {
            await Promise.all(sor.slice(i, i + PARHUZAMOS).map(egy));
        }
        if (inputRef.current) inputRef.current.value = '';
    };

    const mozgatas = (honnan, hova) => {
        if (hova < 0 || hova >= kepek.length || honnan === hova) return;
        setKepek((elozo) => {
            const uj = [...elozo];
            const [elem] = uj.splice(honnan, 1);
            uj.splice(hova, 0, elem);
            return uj;
        });
    };

    const modositas = (index, adatok) => setKepek((elozo) => elozo.map((kep, i) => (i === index ? { ...kep, ...adatok } : kep)));
    const torles = (index) => setKepek((elozo) => elozo.filter((_, i) => i !== index));

    return (
        <div className="kepkezelo">
            <label
                className={`kep-zona ${zonaAktiv ? 'aktiv' : ''}`}
                htmlFor={id}
                onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setZonaAktiv(true); } }}
                onDragLeave={() => setZonaAktiv(false)}
                onDrop={(event) => {
                    if (!event.dataTransfer.files?.length) return;
                    event.preventDefault();
                    setZonaAktiv(false);
                    feltoltes(event.dataTransfer.files);
                }}
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
                                className={`kepkezelo-elem ${huzasCel === index ? 'huzas-cel' : ''}`}
                                draggable
                                onDragStart={(event) => { huzott.current = index; event.dataTransfer.effectAllowed = 'move'; }}
                                onDragOver={(event) => { if (huzott.current !== null) { event.preventDefault(); setHuzasCel(index); } }}
                                onDragLeave={() => setHuzasCel(null)}
                                onDrop={(event) => {
                                    if (huzott.current === null) return;
                                    event.preventDefault();
                                    mozgatas(huzott.current, index);
                                    huzott.current = null;
                                    setHuzasCel(null);
                                }}
                                onDragEnd={() => { huzott.current = null; setHuzasCel(null); }}
                            >
                                <div className="kepkezelo-kep">
                                    <img src={kepMeret(kep.url, 400)} alt={`${index + 1}. kép`} draggable={false} />
                                    <span className="kepkezelo-sorszam">{index === 0 ? 'Borítókép' : index + 1}</span>
                                    <span className="kepkezelo-fogo" aria-hidden="true"><Ikon nev="fogd" meret={16} /></span>
                                </div>
                                <div className="kepkezelo-vezerlok">
                                    <select
                                        className="bemenet"
                                        aria-label={`${index + 1}. kép típusa`}
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
                                        <button type="button" className="ikon-gomb kepkezelo-torles" onClick={() => torles(index)} aria-label={`${index + 1}. kép törlése`}>
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
