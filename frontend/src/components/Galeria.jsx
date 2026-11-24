import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KEP_TIPUSOK, kepMeret } from '../lib/auto';
import Ikon from './Ikon';
import './Galeria.css';

// képgaléria az adatlapon: nagy kép, bélyegképek, típus szerinti szűrés, nagyítás
const Galeria = ({ kepek, nev, cimkek = null }) => {
    const [szuro, setSzuro] = useState('osszes');
    const [aktiv, setAktiv] = useState(() => Math.max(0, kepek.findIndex((kep) => kep.tipus === 'termek')));
    const [nagyitva, setNagyitva] = useState(false);
    const erintesKezdet = useRef(null);
    const bezaroGomb = useRef(null);

    // képtípusonként hány kép van: [['kulso', 3], ['belso', 2], ...]
    const tipusok = useMemo(() => {
        const lista = [];
        for (const kep of kepek) {
            const elem = lista.find((sor) => sor[0] === kep.tipus);
            if (elem) {
                elem[1]++;
            } else {
                lista.push([kep.tipus, 1]);
            }
        }
        return lista;
    }, [kepek]);

    // a kiválasztott típusú képek
    const lathato = useMemo(() => {
        if (szuro === 'osszes') {
            return kepek;
        }
        return kepek.filter((kep) => kep.tipus === szuro);
    }, [kepek, szuro]);

    // ne mutasson a lista végén túlra
    let index = aktiv;
    if (index > lathato.length - 1) {
        index = Math.max(lathato.length - 1, 0);
    }
    const kep = lathato[index];

    // következő (1) vagy előző (-1) kép, a végén körbe megy
    const lepes = useCallback((irany) => {
        setAktiv((elozo) => (elozo + irany + lathato.length) % lathato.length);
    }, [lathato.length]);

    // nagyításkor: nem görgethető az oldal, és a billentyűkkel lehet lapozni
    useEffect(() => {
        if (!nagyitva) {
            return undefined;
        }
        const elozoOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (bezaroGomb.current) {
            bezaroGomb.current.focus();
        }

        const billentyu = (event) => {
            if (event.key === 'Escape') {
                setNagyitva(false);
            }
            if (event.key === 'ArrowRight') {
                lepes(1);
            }
            if (event.key === 'ArrowLeft') {
                lepes(-1);
            }
        };
        window.addEventListener('keydown', billentyu);
        return () => {
            document.body.style.overflow = elozoOverflow;
            window.removeEventListener('keydown', billentyu);
        };
    }, [nagyitva, lepes]);

    // telefonon húzással is lehet lapozni
    const erintesKezelok = {
        onTouchStart: (event) => {
            erintesKezdet.current = event.touches[0].clientX;
        },
        onTouchEnd: (event) => {
            if (erintesKezdet.current === null) {
                return;
            }
            const kulonbseg = event.changedTouches[0].clientX - erintesKezdet.current;
            // legalább 40 pixelt kell húzni
            if (kulonbseg < -40) {
                lepes(1);
            } else if (kulonbseg > 40) {
                lepes(-1);
            }
            erintesKezdet.current = null;
        },
    };

    const szuroValtas = (tipus) => {
        setSzuro(tipus);
        setAktiv(0);
    };

    // a nagyítóból a háttérre kattintva lehet kilépni
    const hatterKattintas = (event) => {
        if (event.target === event.currentTarget) {
            setNagyitva(false);
        }
    };

    if (kepek.length === 0) {
        return <div className="galeria-fo galeria-ures">VELTRIX</div>;
    }

    return (
        <div className="galeria">
            <div className="galeria-fo" {...erintesKezelok}>
                <button className="galeria-nagyit" type="button" onClick={() => setNagyitva(true)} aria-label="Kép nagyítása">
                    <img src={kepMeret(kep.url, 1400)} alt={nev + ' – ' + (KEP_TIPUSOK[kep.tipus] || 'kép') + ' ' + (index + 1)} />
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

            {kep.leiras && <p className="galeria-kep-forras">{kep.leiras}</p>}

            {tipusok.length > 1 && (
                <div className="galeria-szurok" role="tablist" aria-label="Képek típus szerint">
                    {[['osszes', kepek.length], ...tipusok].map(([tipus, db]) => (
                        <button
                            key={tipus}
                            type="button"
                            role="tab"
                            aria-selected={szuro === tipus}
                            className={szuro === tipus ? 'csip aktiv' : 'csip'}
                            onClick={() => szuroValtas(tipus)}
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
                            aria-label={(i + 1) + '. kép'}
                            aria-current={i === index}
                        >
                            <img src={kepMeret(elem.url, 240)} alt="" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}

            {nagyitva && (
                <div className="galeria-nagyito" role="dialog" aria-modal="true" aria-label="Képnézegető" {...erintesKezelok} onClick={hatterKattintas}>
                    <img src={kep.url} alt={nev + ' – ' + (index + 1) + '. kép'} />
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
