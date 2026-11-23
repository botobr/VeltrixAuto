import { useState } from 'react';
import { HAJTASOK, MEGYEK, VALTOK, autoValasztasiLehetosegek } from '../lib/auto';
import { lista } from '../lib/szurok';
import Ikon from './Ikon';
import './SzuroPanel.css';

const aktualisEv = new Date().getFullYear();

// Tól-ig mezők (pl. ár). Gépelés közben még nem szűr, csak Enterre vagy ha kilép a mezőből.
const Tartomany = ({ cim, tolKulcs, igKulcs, szurok, onValtozas, egyseg, lepes = 1, placeholderTol = 'min.', placeholderIg = 'max.' }) => {
    // a még be nem írt (gépelés alatti) értékek
    const [vazlat, setVazlat] = useState({});

    const ertek = (kulcs) => {
        if (vazlat[kulcs] !== undefined) {
            return vazlat[kulcs];
        }
        if (szurok[kulcs] !== undefined) {
            return szurok[kulcs];
        }
        return '';
    };

    const veglegesit = (kulcs) => {
        if (vazlat[kulcs] === undefined) {
            return;
        }
        // a szóközöket kivesszük (pl. "1 000 000")
        const tiszta = String(vazlat[kulcs]).replace(/\s/g, '');
        setVazlat((elozo) => {
            const uj = { ...elozo };
            delete uj[kulcs];
            return uj;
        });
        if ((szurok[kulcs] || '') !== tiszta) {
            onValtozas({ [kulcs]: tiszta || null });
        }
    };

    const enterre = (event, kulcs) => {
        if (event.key === 'Enter') {
            veglegesit(kulcs);
        }
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
            onKeyDown={(event) => enterre(event, kulcs)}
        />
    );

    return (
        <fieldset className="szuro-csoport">
            <legend>{cim}{egyseg && <small> ({egyseg})</small>}</legend>
            <div className="szuro-tartomany">
                {mezo(tolKulcs, placeholderTol, cim + ' minimum')}
                <span aria-hidden="true">–</span>
                {mezo(igKulcs, placeholderIg, cim + ' maximum')}
            </div>
        </fieldset>
    );
};

// több választható gomb (pl. üzemanyag: Benzin, Dízel, ...)
const Csipek = ({ cim, kulcs, ertekek, szurok, onValtozas }) => {
    const kivalasztott = lista(szurok[kulcs]);

    const valtas = (ertek) => {
        let uj;
        if (kivalasztott.includes(ertek)) {
            uj = kivalasztott.filter((elem) => elem !== ertek);
        } else {
            uj = [...kivalasztott, ertek];
        }
        if (uj.length > 0) {
            onValtozas({ [kulcs]: uj.join(',') });
        } else {
            onValtozas({ [kulcs]: null });
        }
    };
    return (
        <fieldset className="szuro-csoport">
            <legend>{cim}</legend>
            <div className="szuro-csipek">
                {ertekek.map((ertek) => (
                    <button
                        key={ertek}
                        type="button"
                        className={kivalasztott.includes(ertek) ? 'csip aktiv' : 'csip'}
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

// be/ki kapcsoló (pl. csak garanciális autók)
const Kapcsolo = ({ cimke, kulcs, szurok, onValtozas, ikon }) => (
    <label className="szuro-kapcsolo">
        <input
            type="checkbox"
            checked={szurok[kulcs] === '1'}
            onChange={(event) => {
                if (event.target.checked) {
                    onValtozas({ [kulcs]: '1' });
                } else {
                    onValtozas({ [kulcs]: null });
                }
            }}
        />
        <span className="kapcsolo" aria-hidden="true" />
        <span>{ikon && <Ikon nev={ikon} meret={15} />} {cimke}</span>
    </label>
);

// a szűrő panel az autók oldalán
const SzuroPanel = ({ szurok, adatok, onValtozas, onTorles, aktivSzam, nyitva, onBezaras }) => {
    let markak = [];
    let megyek = MEGYEK;
    let telephelyek = [];
    let legregebbiEv = 1990;
    if (adatok) {
        markak = adatok.markak || [];
        if (adatok.megyek && adatok.megyek.length > 0) {
            megyek = adatok.megyek;
        }
        telephelyek = adatok.telephelyek || [];
        if (adatok.tartomanyok && adatok.tartomanyok.minEv) {
            legregebbiEv = adatok.tartomanyok.minEv;
        }
    }

    // a kiválasztott márka modelljei
    let modellek = [];
    const valasztottMarka = (szurok.marka || '').toLowerCase();
    for (const marka of markak) {
        if (marka.marka.toLowerCase() === valasztottMarka) {
            modellek = marka.modellek;
        }
    }

    // évjáratok a listához: jövő évtől visszafelé (legalább 30 év)
    const minEv = Math.min(legregebbiEv, aktualisEv - 30);
    const evek = [];
    for (let ev = aktualisEv + 1; ev >= minEv; ev--) {
        evek.push(ev);
    }

    // a megyében lévő telephelyek
    let megyeTelephelyei = telephelyek;
    if (szurok.megye) {
        megyeTelephelyei = telephelyek.filter((telephely) => telephely.megye === szurok.megye);
    }

    return (
        <aside className={nyitva ? 'szuro-panel uveg szuro-panel-nyitva' : 'szuro-panel uveg'} aria-label="Szűrők">
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
                {telephelyek.length > 1 && (
                    <select className="bemenet" aria-label="Telephely" value={szurok.telephely || ''} onChange={(event) => onValtozas({ telephely: event.target.value || null })}>
                        <option value="">Összes telephely</option>
                        {megyeTelephelyei.map((telephely) => (
                            <option key={telephely._id} value={telephely._id}>{telephely.nev} – {telephely.varos}</option>
                        ))}
                    </select>
                )}
            </fieldset>

            <button className="gomb gomb-fo szuro-mutat" type="button" onClick={onBezaras}>Találatok mutatása</button>
        </aside>
    );
};

export default SzuroPanel;
