import { useState } from 'react';
import { AUTO_SZEKCIOK, FELSZERELTSEG_CSOPORTOK, STATUSZOK, autoValasztasiLehetosegek } from '../lib/auto';
import Ikon from './Ikon';
import KepKezelo from './KepKezelo';
import './AutoUrlap.css';

const EGYEDI = '__egyedi__';
const maxEvjarat = new Date().getFullYear() + 1;

const Mezo = ({ mezo, cimke, tipus, opciok = {}, adatok, beallit, egyediMezok, setEgyediMezok }) => {
    const id = `auto-${mezo}`;
    const ertek = adatok[mezo];
    const { kotelezo = false, placeholder, egyseg, sugo } = opciok;

    let bemenet;
    if (tipus === 'textarea') {
        bemenet = <textarea className="bemenet" id={id} rows={6} maxLength={opciok.maxLength} placeholder={placeholder} value={ertek} onChange={(e) => beallit(mezo, e.target.value)} />;
    } else if (tipus === 'select') {
        bemenet = (
            <>
                <select
                    className="bemenet"
                    id={id}
                    required={kotelezo}
                    value={egyediMezok[mezo] ? EGYEDI : ertek}
                    onChange={(event) => {
                        const egyedi = event.target.value === EGYEDI;
                        setEgyediMezok((elozo) => ({ ...elozo, [mezo]: egyedi }));
                        beallit(mezo, egyedi ? '' : event.target.value);
                    }}
                >
                    <option value="" disabled>Válassz…</option>
                    {autoValasztasiLehetosegek[mezo].map((lehetoseg) => <option key={lehetoseg} value={lehetoseg}>{lehetoseg}</option>)}
                    <option value={EGYEDI}>Egyéb – saját megadás</option>
                </select>
                {egyediMezok[mezo] && (
                    <input className="bemenet" aria-label={`${cimke} – saját érték`} required={kotelezo} autoFocus
                        placeholder={`Írd be: ${cimke.toLocaleLowerCase('hu')}`} value={ertek} onChange={(e) => beallit(mezo, e.target.value)} />
                )}
            </>
        );
    } else if (tipus === 'enum') {
        bemenet = (
            <select className="bemenet" id={id} value={ertek} onChange={(e) => beallit(mezo, e.target.value)}>
                <option value="">Nincs megadva</option>
                {opciok.ertekek.map((lehetoseg) => <option key={lehetoseg} value={lehetoseg}>{lehetoseg}</option>)}
            </select>
        );
    } else if (tipus === 'bool') {
        bemenet = (
            <div className="harom-allas" role="radiogroup" aria-labelledby={`${id}-cimke`}>
                {[['true', 'Igen'], ['false', 'Nem'], ['', 'Nincs megadva']].map(([v, felirat]) => (
                    <button key={felirat} type="button" role="radio" aria-checked={ertek === v} className={`csip ${ertek === v ? 'aktiv' : ''}`} onClick={() => beallit(mezo, v)}>
                        {felirat}
                    </button>
                ))}
            </div>
        );
    } else {
        bemenet = (
            <div className={egyseg ? 'bemenet-egyseggel' : undefined}>
                <input
                    className="bemenet"
                    id={id}
                    type={tipus}
                    inputMode={tipus === 'number' ? (opciok.tort ? 'decimal' : 'numeric') : undefined}
                    min={tipus === 'number' ? (opciok.min ?? 0) : undefined}
                    max={mezo === 'evjarat' ? maxEvjarat : opciok.max}
                    step={tipus === 'number' ? (opciok.tort ? 0.1 : 1) : undefined}
                    maxLength={opciok.maxLength}
                    placeholder={placeholder}
                    required={kotelezo}
                    value={ertek}
                    onChange={(e) => beallit(mezo, opciok.nagybetu ? e.target.value.toUpperCase() : e.target.value)}
                />
                {egyseg && <span>{egyseg}</span>}
            </div>
        );
    }

    return (
        <div className={`mezo ${tipus === 'textarea' ? 'mezo-szeles' : ''}`}>
            <span id={`${id}-cimke`}>
                {tipus === 'bool' ? cimke : <label htmlFor={id}>{cimke}</label>}
                {kotelezo && <small className="kotelezo" aria-hidden="true">*</small>}
            </span>
            {bemenet}
            {sugo && <small className="mezo-sugo">{sugo}</small>}
        </div>
    );
};

const Felszereltseg = ({ lista, setLista }) => {
    const [uj, setUj] = useState('');
    const ismert = new Set(Object.values(FELSZERELTSEG_CSOPORTOK).flat());
    const egyedi = lista.filter((elem) => !ismert.has(elem));

    const valtas = (elem) => setLista(lista.includes(elem) ? lista.filter((e) => e !== elem) : [...lista, elem]);
    const hozzaad = () => {
        const tiszta = uj.trim();
        if (tiszta && !lista.includes(tiszta)) setLista([...lista, tiszta]);
        setUj('');
    };

    return (
        <div className="felszereltseg-valaszto">
            {Object.entries(FELSZERELTSEG_CSOPORTOK).map(([csoport, elemek]) => (
                <fieldset key={csoport}>
                    <legend>{csoport}</legend>
                    <div className="szuro-csipek">
                        {elemek.map((elem) => (
                            <button key={elem} type="button" className={`csip ${lista.includes(elem) ? 'aktiv' : ''}`} aria-pressed={lista.includes(elem)} onClick={() => valtas(elem)}>
                                {lista.includes(elem) && <Ikon nev="pipa" meret={12} />} {elem}
                            </button>
                        ))}
                    </div>
                </fieldset>
            ))}
            <fieldset>
                <legend>Egyéb extrák</legend>
                <div className="szuro-csipek">
                    {egyedi.map((elem) => (
                        <button key={elem} type="button" className="csip aktiv" onClick={() => valtas(elem)} aria-label={`${elem} eltávolítása`}>
                            {elem} <Ikon nev="x" meret={12} />
                        </button>
                    ))}
                </div>
                <div className="felszereltseg-uj">
                    <input
                        className="bemenet"
                        placeholder="pl. Webasto, gyári vonóhorog…"
                        maxLength={60}
                        value={uj}
                        aria-label="Új extra"
                        onChange={(e) => setUj(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); hozzaad(); } }}
                    />
                    <button type="button" className="gomb gomb-uveg gomb-kicsi" onClick={hozzaad} disabled={!uj.trim()}>Hozzáadás</button>
                </div>
            </fieldset>
        </div>
    );
};

const AutoUrlap = ({ adatok, setAdatok, egyediMezok, setEgyediMezok, telephelyek, onUjKep, penzugy = false }) => {
    const beallit = (mezo, ertek) => setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));
    const setKepek = (frissito) => setAdatok((elozo) => ({ ...elozo, kepek: typeof frissito === 'function' ? frissito(elozo.kepek) : frissito }));

    return (
        <div className="auto-urlap">
            <section className="uveg urlap-szekcio">
                <h2><span>1</span> Képek</h2>
                <KepKezelo kepek={adatok.kepek} setKepek={setKepek} onUjKep={onUjKep} />
            </section>

            {AUTO_SZEKCIOK.map((szekcio, i) => (
                <section className="uveg urlap-szekcio" key={szekcio.cim}>
                    <h2><span>{i + 2}</span> {szekcio.cim}</h2>
                    <div className="auto-urlap-racs">
                        {szekcio.mezok.map(([mezo, cimke, tipus, opciok]) => (
                            <Mezo key={mezo} mezo={mezo} cimke={cimke} tipus={tipus} opciok={opciok}
                                adatok={adatok} beallit={beallit} egyediMezok={egyediMezok} setEgyediMezok={setEgyediMezok} />
                        ))}
                    </div>
                </section>
            ))}

            <section className="uveg urlap-szekcio">
                <h2><span>{AUTO_SZEKCIOK.length + 2}</span> Felszereltség <small>{adatok.felszereltseg.length} kiválasztva</small></h2>
                <Felszereltseg lista={adatok.felszereltseg} setLista={(lista) => beallit('felszereltseg', lista)} />
            </section>

            <section className="uveg urlap-szekcio">
                <h2><span>{AUTO_SZEKCIOK.length + 3}</span> Hirdetés beállításai</h2>
                <div className="auto-urlap-racs">
                    <label className="mezo">
                        <span>Státusz</span>
                        <select className="bemenet" value={adatok.statusz} onChange={(e) => beallit('statusz', e.target.value)}>
                            {Object.entries(STATUSZOK).map(([ertek, cimke]) => <option key={ertek} value={ertek}>{cimke}</option>)}
                        </select>
                    </label>
                    {penzugy && adatok.statusz === 'elkelt' && (
                        <>
                            <label className="mezo">
                                <span>Tényleges eladási ár <small>(üresen: a vételár)</small></span>
                                <div className="bemenet-egyseggel">
                                    <input className="bemenet" type="number" inputMode="numeric" min={0} step={1}
                                        placeholder={adatok.vetel_ar || 'pl. 8500000'} value={adatok.eladasi_ar}
                                        onChange={(e) => beallit('eladasi_ar', e.target.value)} />
                                    <span>Ft</span>
                                </div>
                            </label>
                            <label className="mezo">
                                <span>Eladás dátuma <small>(üresen: mai nap)</small></span>
                                <input className="bemenet" type="date" max={new Date().toISOString().slice(0, 10)} value={adatok.eladas_datum}
                                    onChange={(e) => beallit('eladas_datum', e.target.value)} />
                            </label>
                        </>
                    )}
                    <label className="mezo">
                        <span>Telephely / megtekintési hely</span>
                        <select className="bemenet" value={adatok.telephely} onChange={(e) => beallit('telephely', e.target.value)}>
                            <option value="">Nincs megadva</option>
                            {telephelyek.map((t) => <option key={t._id} value={t._id}>{t.nev} – {t.varos}</option>)}
                        </select>
                    </label>
                    <label className="mezo">
                        <span>Hirdetés lejárata <small>(üresen: nem jár le)</small></span>
                        <input className="bemenet" type="date" value={adatok.lejarat} onChange={(e) => beallit('lejarat', e.target.value)} />
                    </label>
                    <div className="mezo urlap-kapcsolok">
                        <label className="kapcsolo-sor">
                            <input type="checkbox" checked={adatok.lathato} onChange={(e) => beallit('lathato', e.target.checked)} />
                            <span className="kapcsolo" aria-hidden="true" /> Látható a kínálatban
                        </label>
                        <label className="kapcsolo-sor">
                            <input type="checkbox" checked={adatok.kiemelt} onChange={(e) => beallit('kiemelt', e.target.checked)} />
                            <span className="kapcsolo" aria-hidden="true" /> Kiemelt hirdetés (a lista elején)
                        </label>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AutoUrlap;
