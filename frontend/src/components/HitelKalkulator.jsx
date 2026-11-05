import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CEG } from '../lib/ceg';
import { formatSzam } from '../lib/auto';
import { haviReszlet } from '../lib/hitel';
import './HitelKalkulator.css';

const FUTAMIDOK = [12, 24, 36, 48, 60, 72, 84, 96];

const HitelKalkulator = ({ ar: kezdoAr, szerkesztheto = false }) => {
    const id = useId();
    const [ar, setAr] = useState(kezdoAr || 10000000);
    const [onreszSzazalek, setOnreszSzazalek] = useState(30);
    const [futamido, setFutamido] = useState(60);
    const [thm, setThm] = useState(CEG.thm);

    const onresz = Math.round(ar * onreszSzazalek / 100);
    const hitelosszeg = Math.max(ar - onresz, 0);
    const reszlet = haviReszlet(hitelosszeg, futamido, Number(thm) || 0);
    const osszesen = reszlet * futamido;

    return (
        <div className="hitel uveg">
            <div className="hitel-mezok">
                {szerkesztheto && (
                    <label className="mezo" htmlFor={`${id}-ar`}>
                        <span>Az autó ára (Ft)</span>
                        <input
                            className="bemenet"
                            id={`${id}-ar`}
                            type="number"
                            min={100000}
                            step={100000}
                            value={ar}
                            onChange={(event) => setAr(Math.max(Number(event.target.value) || 0, 0))}
                        />
                    </label>
                )}
                <label className="mezo" htmlFor={`${id}-onresz`}>
                    <span>Önerő: {onreszSzazalek}% <small>({formatSzam(onresz)} Ft)</small></span>
                    <input
                        className="csuszka"
                        id={`${id}-onresz`}
                        type="range"
                        min={0}
                        max={70}
                        step={5}
                        value={onreszSzazalek}
                        onChange={(event) => setOnreszSzazalek(Number(event.target.value))}
                    />
                </label>
                <div className="mezo">
                    <span id={`${id}-futamido`}>Futamidő</span>
                    <div className="hitel-futamidok" role="radiogroup" aria-labelledby={`${id}-futamido`}>
                        {FUTAMIDOK.map((honap) => (
                            <button
                                key={honap}
                                type="button"
                                role="radio"
                                aria-checked={futamido === honap}
                                className={`csip ${futamido === honap ? 'aktiv' : ''}`}
                                onClick={() => setFutamido(honap)}
                            >
                                {honap} hó
                            </button>
                        ))}
                    </div>
                </div>
                <label className="mezo" htmlFor={`${id}-thm`}>
                    <span>THM (%) <small>tájékoztató</small></span>
                    <input
                        className="bemenet"
                        id={`${id}-thm`}
                        type="number"
                        min={0}
                        max={40}
                        step={0.1}
                        value={thm}
                        onChange={(event) => setThm(event.target.value)}
                    />
                </label>
            </div>

            <div className="hitel-eredmeny">
                <span>Becsült havi részlet</span>
                <strong className="gradiens-szoveg">{formatSzam(Math.round(reszlet))} Ft</strong>
                <dl>
                    <div><dt>Hitelösszeg</dt><dd>{formatSzam(hitelosszeg)} Ft</dd></div>
                    <div><dt>Visszafizetendő</dt><dd>{formatSzam(Math.round(osszesen))} Ft</dd></div>
                </dl>
                <p>
                    A kalkuláció tájékoztató jellegű, nem minősül ajánlattételnek. A pontos feltételeket a
                    finanszírozó partner hitelbírálata határozza meg. <Link to="/szolgaltatasok#finanszirozas">Részletek</Link>
                </p>
            </div>
        </div>
    );
};

export default HitelKalkulator;
