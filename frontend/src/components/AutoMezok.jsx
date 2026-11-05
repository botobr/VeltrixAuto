import { autoMezok, autoValasztasiLehetosegek } from '../lib/auto';

const EGYEDI = '__egyedi__';
const maxEvjarat = new Date().getFullYear() + 1;

const AutoMezok = ({ adatok, setAdatok, egyediMezok, setEgyediMezok, idElotag = 'auto' }) => {
    const beallit = (mezo, ertek) => setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));

    return (
        <div className="auto-urlap-racs">
            {autoMezok.map(([mezo, cimke, placeholder, tipus, { opcionalis = false } = {}]) => {
                const id = `${idElotag}-${mezo}`;
                return (
                    <div className={`mezo ${tipus === 'textarea' ? 'mezo-szeles' : ''}`} key={mezo}>
                        <span>
                            <label htmlFor={id}>{cimke}</label>
                            {opcionalis && <small>(nem kötelező)</small>}
                        </span>
                        {tipus === 'textarea' ? (
                            <textarea
                                className="bemenet"
                                id={id}
                                name={mezo}
                                rows={5}
                                maxLength={2000}
                                placeholder={placeholder}
                                value={adatok[mezo]}
                                onChange={(event) => beallit(mezo, event.target.value)}
                            />
                        ) : tipus === 'select' ? (
                            <>
                                <select
                                    className="bemenet"
                                    id={id}
                                    name={mezo}
                                    required
                                    value={egyediMezok[mezo] ? EGYEDI : adatok[mezo]}
                                    onChange={(event) => {
                                        const egyedi = event.target.value === EGYEDI;
                                        setEgyediMezok((elozo) => ({ ...elozo, [mezo]: egyedi }));
                                        beallit(mezo, egyedi ? '' : event.target.value);
                                    }}
                                >
                                    <option value="" disabled>{placeholder}</option>
                                    {autoValasztasiLehetosegek[mezo].map((lehetoseg) => (
                                        <option key={lehetoseg} value={lehetoseg}>{lehetoseg}</option>
                                    ))}
                                    <option value={EGYEDI}>Egyéb – saját megadás</option>
                                </select>
                                {egyediMezok[mezo] && (
                                    <input
                                        className="bemenet"
                                        aria-label={`${cimke} – saját érték`}
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder={`Írd be: ${cimke.toLocaleLowerCase('hu')}`}
                                        value={adatok[mezo]}
                                        onChange={(event) => beallit(mezo, event.target.value)}
                                    />
                                )}
                            </>
                        ) : (
                            <input
                                className="bemenet"
                                id={id}
                                name={mezo}
                                type={tipus}
                                inputMode={tipus === 'number' ? 'numeric' : undefined}
                                min={tipus === 'number' ? (mezo === 'evjarat' ? 1886 : 0) : undefined}
                                max={mezo === 'evjarat' ? maxEvjarat : undefined}
                                step={tipus === 'number' ? 1 : undefined}
                                maxLength={tipus === 'tel' ? 40 : undefined}
                                placeholder={placeholder}
                                required={!opcionalis}
                                value={adatok[mezo]}
                                onChange={(event) => beallit(mezo, event.target.value)}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AutoMezok;
