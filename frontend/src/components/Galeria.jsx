import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KEP_TIPUSOK, kepMeret } from '../lib/auto';
import Ikon from './Ikon';
import './Galeria.css';

const Galeria = ({ kepek, nev, cimkek = null }) => {
    const [szuro, setSzuro] = useState('osszes');
    const [aktiv, setAktiv] = useState(0);
    const [nagyitva, setNagyitva] = useState(false);
    const erintesKezdet = useRef(null);
    const bezaroGomb = useRef(null);

    const tipusok = useMemo(() => {
        const szamok = new Map();
        for (const kep of kepek) szamok.set(kep.tipus, (szamok.get(kep.tipus) || 0) + 1);
        return [...szamok.entries()];
    }, [kepek]);

    const lathato = useMemo(
        () => (szuro === 'osszes' ? kepek : kepek.filter((kep) => kep.tipus === szuro)),
        [kepek, szuro],
    );
    const index = Math.min(aktiv, Math.max(lathato.length - 1, 0));
    const kep = lathato[index];

    const lepes = useCallback((irany) => {
        setAktiv((elozo) => (elozo + irany + lathato.length) % lathato.length);
    }, [lathato.length]);

    useEffect(() => {
        if (!nagyitva) return undefined;
        const elozoOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        bezaroGomb.current?.focus();
        const billentyu = (event) => {
            if (event.key === 'Escape') setNagyitva(false);
            if (event.key === 'ArrowRight') lepes(1);
            if (event.key === 'ArrowLeft') lepes(-1);
        };
        window.addEventListener('keydown', billentyu);
        return () => {
            document.body.style.overflow = elozoOverflow;
            window.removeEventListener('keydown', billentyu);
        };
    }, [nagyitva, lepes]);

    const erintesKezelok = {
        onTouchStart: (event) => { erintesKezdet.current = event.touches[0].clientX; },
        onTouchEnd: (event) => {
            if (erintesKezdet.current === null) return;
            const kulonbseg = event.changedTouches[0].clientX - erintesKezdet.current;
            if (Math.abs(kulonbseg) > 40) lepes(kulonbseg < 0 ? 1 : -1);
            erintesKezdet.current = null;
        },
    };

    if (kepek.length === 0) {
        return <div className="galeria-fo galeria-ures">VELTRIX</div>;
    }

    return (
        <div className="galeria">
            <div className="galeria-fo" {...erintesKezelok}>
                <button className="galeria-nagyit" type="button" onClick={() => setNagyitva(true)} aria-label="Kép nagyítása">
                    <img src={kepMeret(kep.url, 1400)} alt={`${nev} – ${KEP_TIPUSOK[kep.tipus] || 'kép'} ${index + 1}`} />
                </button>
                {cimkek}
                {lathato.length > 1 && (
                    <>
                        <button className="galeria-lepes galeria-elozo" type="button" onClick={() => lepes(-1)} aria-label="Előző kép">
                            <Ikon nev="balra" />
                        </button>
                        <button className="galeria-lepes galeria-kovetkezo" type="button" onClick={() => lepes(1)} aria-label="Következő kép">
                            <Ikon nev="jobbra" />
                        </button>
                    </>
                )}
                <span className="galeria-szamlalo">{index + 1} / {lathato.length}</span>
            </div>

            {tipusok.length > 1 && (
                <div className="galeria-szurok" role="tablist" aria-label="Képek típus szerint">
                    {[['osszes', kepek.length], ...tipusok].map(([tipus, db]) => (
                        <button
                            key={tipus}
                            type="button"
                            role="tab"
                            aria-selected={szuro === tipus}
                            className={`csip ${szuro === tipus ? 'aktiv' : ''}`}
                            onClick={() => { setSzuro(tipus); setAktiv(0); }}
                        >
                            {tipus === 'osszes' ? 'Összes' : KEP_TIPUSOK[tipus]} <small>{db}</small>
                        </button>
                    ))}
                </div>
            )}

            {lathato.length > 1 && (
                <div className="galeria-belyegek">
                    {lathato.map((elem, i) => (
                        <button
                            key={elem.url}
                            type="button"
                            className={i === index ? 'aktiv' : ''}
                            onClick={() => setAktiv(i)}
                            aria-label={`${i + 1}. kép`}
                            aria-current={i === index}
                        >
                            <img src={kepMeret(elem.url, 240)} alt="" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}

            {nagyitva && (
                <div className="galeria-nagyito" role="dialog" aria-modal="true" aria-label="Képnézegető" {...erintesKezelok}
                    onClick={(event) => { if (event.target === event.currentTarget) setNagyitva(false); }}>
                    <img src={kep.url} alt={`${nev} – ${index + 1}. kép`} />
                    <button ref={bezaroGomb} className="ikon-gomb galeria-nagyito-bezar" type="button" onClick={() => setNagyitva(false)} aria-label="Bezárás">
                        <Ikon nev="x" meret={22} />
                    </button>
                    {lathato.length > 1 && (
                        <>
                            <button className="galeria-lepes galeria-elozo" type="button" onClick={() => lepes(-1)} aria-label="Előző kép"><Ikon nev="balra" meret={24} /></button>
                            <button className="galeria-lepes galeria-kovetkezo" type="button" onClick={() => lepes(1)} aria-label="Következő kép"><Ikon nev="jobbra" meret={24} /></button>
                        </>
                    )}
                    <span className="galeria-szamlalo">{KEP_TIPUSOK[kep.tipus]} · {index + 1} / {lathato.length}</span>
                </div>
            )}
        </div>
    );
};

export default Galeria;
