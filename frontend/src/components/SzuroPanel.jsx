import { useState } from 'react';
import { HAJTASOK, MEGYEK, VALTOK, autoValasztasiLehetosegek } from '../lib/auto';
import { lista } from '../lib/szurok';
import Ikon from './Ikon';
import './SzuroPanel.css';

const aktualisEv = new Date().getFullYear();

/** Szám-intervallum: gépelés közben nem frissít, csak Enterre vagy a mező elhagyásakor. */
const Tartomany = ({ cim, tolKulcs, igKulcs, szurok, onValtozas, egyseg, lepes = 1, placeholderTol = 'min.', placeholderIg = 'max.' }) => {
    const [vazlat, setVazlat] = useState({});
    const ertek = (kulcs) => vazlat[kulcs] ?? szurok[kulcs] ?? '';

    const veglegesit = (kulcs) => {
        if (vazlat[kulcs] === undefined) return;
        const tiszta = String(vazlat[kulcs]).replace(/\s/g, '');
        setVazlat((elozo) => {
            const uj = { ...elozo };
            delete uj[kulcs];
            return uj;
        });
        if ((szurok[kulcs] || '') !== tiszta) onValtozas({ [kulcs]: tiszta || null });
    };

    const mezo = (kulcs, placeholder, cimke) => (
        <input
            className="bemenet"
            type="number"
            inputMode="numeric"
            min={0}
            step={lepes}
            placeholder={placeholder}
            aria-label={cimke}
            value={ertek(kulcs)}
            onChange={(event) => setVazlat((elozo) => ({ ...elozo, [kulcs]: event.target.value }))}
            onBlur={() => veglegesit(kulcs)}
            onKeyDown={(event) => { if (event.key === 'Enter') veglegesit(kulcs); }}
        />
    );

    return (
        <fieldset className="szuro-csoport">
            <legend>{cim}{egyseg && <small> ({egyseg})</small>}</legend>
            <div className="szuro-tartomany">
                {mezo(tolKulcs, placeholderTol, `${cim} minimum`)}
                <span aria-hidden="true">–</span>
                {mezo(igKulcs, placeholderIg, `${cim} maximum`)}
            </div>
        </fieldset>
    );
};

const Csipek = ({ cim, kulcs, ertekek, szurok, onValtozas }) => {
    const kivalasztott = lista(szurok[kulcs]);
    const valtas = (ertek) => {
        const uj = kivalasztott.includes(ertek) ? kivalasztott.filter((elem) => elem !== ertek) : [...kivalasztott, ertek];
        onValtozas({ [kulcs]: uj.length ? uj.join(',') : null });
    };
    return (
        <fieldset className="szuro-csoport">
            <legend>{cim}</legend>
            <div className="szuro-csipek">
                {ertekek.map((ertek) => (
                    <button
                        key={ertek}
                        type="button"
                        className={`csip ${kivalasztott.includes(ertek) ? 'aktiv' : ''}`}
                        aria-pressed={kivalasztott.includes(ertek)}
                        onClick={() => valtas(ertek)}
                    >
                        {ertek}
                    </button>
                ))}
            </div>
        </fieldset>
    );
};

const Kapcsolo = ({ cimke, kulcs, szurok, onValtozas, ikon }) => (
    <label className="szuro-kapcsolo">
        <input
            type="checkbox"
            checked={szurok[kulcs] === '1'}
            onChange={(event) => onValtozas({ [kulcs]: event.target.checked ? '1' : null })}
        />
        <span className="kapcsolo" aria-hidden="true" />
        <span>{ikon && <Ikon nev={ikon} meret={15} />} {cimke}</span>
    </label>
);

const SzuroPanel = ({ szurok, adatok, onValtozas, onTorles, aktivSzam, nyitva, onBezaras }) => {
    const markak = adatok?.markak || [];
    const modellek = markak.find((m) => m.marka.toLowerCase() === (szurok.marka || '').toLowerCase())?.modellek || [];
    const megyek = adatok?.megyek?.length ? adatok.megyek : MEGYEK;
    const minEv = Math.min(adatok?.tartomanyok?.minEv || 1990, aktualisEv - 30);
    const evek = Array.from({ length: aktualisEv + 1 - minEv + 1 }, (_, i) => aktualisEv + 1 - i);

    return (
        <aside className={`szuro-panel uveg ${nyitva ? 'szuro-panel-nyitva' : ''}`} aria-label="Szűrők">
            <div className="szuro-fejlec">
                <h2><Ikon nev="szuro" /> Szűrők {aktivSzam > 0 && <span className="szuro-szam">{aktivSzam}</span>}</h2>
                {aktivSzam > 0 && <button className="szoveg-gomb" type="button" onClick={onTorles}>Összes törlése</button>}
                <button className="ikon-gomb szuro-bezaras" type="button" onClick={onBezaras} aria-label="Szűrők bezárása">
                    <Ikon nev="x" />
                </button>
            </div>

            <div className="szuro-gyors">
                <Kapcsolo cimke="Csak új hirdetések (7 nap)" kulcs="ujak" szurok={szurok} onValtozas={onValtozas} />
                <Kapcsolo cimke="Csak garanciális autók" kulcs="garancias" szurok={szurok} onValtozas={onValtozas} />
            </div>

            <fieldset className="szuro-csoport">
                <legend>Márka és modell</legend>
                <select
                    className="bemenet"
                    aria-label="Márka"
                    value={szurok.marka || ''}
                    onChange={(event) => onValtozas({ marka: event.target.value || null, modell: null })}
                >
                    <option value="">Összes márka</option>
                    {markak.map((m) => <option key={m.marka} value={m.marka}>{m.marka} ({m.db})</option>)}
                </select>
                <select
                    className="bemenet"
                    aria-label="Modell"
                    value={szurok.modell || ''}
                    disabled={!szurok.marka}
                    onChange={(event) => onValtozas({ modell: event.target.value || null })}
                >
                    <option value="">{szurok.marka ? 'Összes modell' : 'Előbb válassz márkát'}</option>
                    {modellek.map((modell) => <option key={modell} value={modell}>{modell}</option>)}
                </select>
            </fieldset>

            <Tartomany cim="Ár" egyseg="Ft" tolKulcs="minAr" igKulcs="maxAr" lepes={100000} szurok={szurok} onValtozas={onValtozas} />

            <fieldset className="szuro-csoport">
                <legend>Évjárat</legend>
                <div className="szuro-tartomany">
                    <select className="bemenet" aria-label="Évjárat ettől" value={szurok.evjaratTol || ''} onChange={(event) => onValtozas({ evjaratTol: event.target.value || null })}>
                        <option value="">tól</option>
                        {evek.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                    </select>
                    <span aria-hidden="true">–</span>
                    <select className="bemenet" aria-label="Évjárat eddig" value={szurok.evjaratIg || ''} onChange={(event) => onValtozas({ evjaratIg: event.target.value || null })}>
                        <option value="">ig</option>
                        {evek.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                    </select>
                </div>
            </fieldset>

            <Tartomany cim="Futásteljesítmény" egyseg="km" tolKulcs="kmTol" igKulcs="kmIg" lepes={5000} szurok={szurok} onValtozas={onValtozas} />
            <Csipek cim="Üzemanyag" kulcs="uzemanyag" ertekek={autoValasztasiLehetosegek.uzemanyag} szurok={szurok} onValtozas={onValtozas} />
            <Csipek cim="Sebességváltó" kulcs="valto" ertekek={VALTOK} szurok={szurok} onValtozas={onValtozas} />
            <Csipek cim="Hajtás" kulcs="hajtas" ertekek={HAJTASOK} szurok={szurok} onValtozas={onValtozas} />
            <Csipek cim="Karosszéria" kulcs="kivitel" ertekek={autoValasztasiLehetosegek.kivitel} szurok={szurok} onValtozas={onValtozas} />
            <Tartomany cim="Teljesítmény" egyseg="LE" tolKulcs="teljesitmenyTol" igKulcs="teljesitmenyIg" lepes={10} szurok={szurok} onValtozas={onValtozas} />

            <fieldset className="szuro-csoport">
                <legend>Elhelyezkedés</legend>
                <select className="bemenet" aria-label="Megye" value={szurok.megye || ''} onChange={(event) => onValtozas({ megye: event.target.value || null, telephely: null })}>
                    <option value="">Összes megye</option>
                    {megyek.map((megye) => <option key={megye} value={megye}>{megye}</option>)}
                </select>
                {adatok?.telephelyek?.length > 1 && (
                    <select className="bemenet" aria-label="Telephely" value={szurok.telephely || ''} onChange={(event) => onValtozas({ telephely: event.target.value || null })}>
                        <option value="">Összes telephely</option>
                        {adatok.telephelyek
                            .filter((t) => !szurok.megye || t.megye === szurok.megye)
                            .map((t) => <option key={t._id} value={t._id}>{t.nev} – {t.varos}</option>)}
                    </select>
                )}
            </fieldset>

            <button className="gomb gomb-fo szuro-mutat" type="button" onClick={onBezaras}>Találatok mutatása</button>
        </aside>
    );
};

export default SzuroPanel;
