import { useId, useRef, useState } from 'react';
import { kepBeolvasasa } from '../lib/auto';
import './KepValaszto.css';

const KepValaszto = ({ elonezet, kepNev, onKep, onHiba, cimke = 'Autó képe' }) => {
    const id = useId();
    const inputRef = useRef(null);
    const [huzas, setHuzas] = useState(false);

    const feldolgoz = async (file) => {
        if (!file) return;
        onHiba?.('');
        try {
            onKep(await kepBeolvasasa(file), file.name);
        } catch (error) {
            onHiba?.(error.message);
        } finally {
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="mezo mezo-szeles">
            <span><label htmlFor={id}>{cimke}</label></span>
            <label
                className={`kep-zona ${huzas ? 'kep-zona-huzas' : ''} ${elonezet ? 'kep-zona-van' : ''}`}
                htmlFor={id}
                onDragOver={(event) => { event.preventDefault(); setHuzas(true); }}
                onDragLeave={() => setHuzas(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setHuzas(false);
                    feldolgoz(event.dataTransfer.files?.[0]);
                }}
            >
                {elonezet ? (
                    <>
                        <img src={elonezet} alt="A kiválasztott autó képe" />
                        <span className="kep-zona-csere">Kép cseréje</span>
                    </>
                ) : (
                    <span className="kep-zona-ures">
                        <span className="kep-zona-ikon" aria-hidden="true">↑</span>
                        <strong>Húzd ide a képet, vagy kattints a tallózáshoz</strong>
                        <small>JPG, PNG vagy WebP · legfeljebb 4 MB</small>
                    </span>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => feldolgoz(event.target.files?.[0])}
                />
            </label>
            {kepNev && <small className="kep-zona-nev">{kepNev}</small>}
        </div>
    );
};

export default KepValaszto;
