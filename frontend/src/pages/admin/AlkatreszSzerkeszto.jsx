import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AlkatreszKartya from '../../components/AlkatreszKartya';
import Ikon from '../../components/Ikon';
import KepKezelo from '../../components/KepKezelo';
import { API_URL, apiKeres } from '../../lib/api';
import { useSeo } from '../../lib/useSeo';
import { KATEGORIAK, alkatreszUrlapbol, uresAlkatresz } from '../../lib/webshop';
import '../../components/AutoUrlap.css';
import './Admin.css';

// egy számozott rész az űrlapon
const Szekcio = ({ szam, cim, megjegyzes, children }) => (
    <section className="uveg urlap-szekcio">
        <h2><span>{szam}</span> {cim} {megjegyzes && <small>{megjegyzes}</small>}</h2>
        {children}
    </section>
);

// mező felirattal és súgóval
const Mezo = ({ cimke, kotelezo, szeles, sugo, children }) => (
    <label className={szeles ? 'mezo mezo-szeles' : 'mezo'}>
        <span>{cimke}{kotelezo && <small className="kotelezo" aria-hidden="true">*</small>}</span>
        {children}
        {sugo && <small className="mezo-sugo">{sugo}</small>}
    </label>
);

// egy sor módosítása egy listában (a többi sor marad)
const sorModositasa = (sorok, index, mezo, ertek) => {
    return sorok.map((sor, i) => {
        if (i === index) {
            return { ...sor, [mezo]: ertek };
        }
        return sor;
    });
};

// egy sor törlése a listából
const sorTorlese = (sorok, index) => {
    return sorok.filter((sor, i) => i !== index);
};

// Melyik autókra jó: márka (kötelező), modell (üres = mind), évjárat (üres = nincs korlát)
const KompatibilitasSzerkeszto = ({ sorok, setSorok, markak }) => {
    const modosit = (index, mezo, ertek) => {
        setSorok(sorModositasa(sorok, index, mezo, ertek));
    };

    const ujSor = () => {
        setSorok([...sorok, { marka: '', modell: '', evjaratTol: '', evjaratIg: '' }]);
    };

    return (
        <div className="kompatibilitas-szerkeszto">
            <datalist id="marka-javaslatok">{markak.map((marka) => <option key={marka} value={marka} />)}</datalist>
            {sorok.map((sor, i) => (
                <div className="kompatibilitas-sor" key={i}>
                    <input className="bemenet" list="marka-javaslatok" required placeholder="Márka, pl. BMW" aria-label={(i + 1) + '. sor márka'} maxLength={60}
                        value={sor.marka} onChange={(e) => modosit(i, 'marka', e.target.value)} />
                    <input className="bemenet" placeholder="Modell (üres = mind)" aria-label={(i + 1) + '. sor modell'} maxLength={80}
                        value={sor.modell} onChange={(e) => modosit(i, 'modell', e.target.value)} />
                    <input className="bemenet" type="number" inputMode="numeric" placeholder="Évtől" aria-label={(i + 1) + '. sor évjárattól'} min={1950}
                        value={sor.evjaratTol} onChange={(e) => modosit(i, 'evjaratTol', e.target.value)} />
                    <input className="bemenet" type="number" inputMode="numeric" placeholder="Évig" aria-label={(i + 1) + '. sor évjáratig'} min={1950}
                        value={sor.evjaratIg} onChange={(e) => modosit(i, 'evjaratIg', e.target.value)} />
                    <button className="ikon-gomb" type="button" onClick={() => setSorok(sorTorlese(sorok, i))} aria-label={(i + 1) + '. sor törlése'}>
                        <Ikon nev="x" meret={16} />
                    </button>
                </div>
            ))}
            <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={ujSor}>
                <Ikon nev="plusz" meret={15} /> Autó hozzáadása
            </button>
        </div>
    );
};

// műszaki paraméterek (név - érték sorok)
const ParameterSzerkeszto = ({ sorok, setSorok }) => {
    const modosit = (index, mezo, ertek) => {
        setSorok(sorModositasa(sorok, index, mezo, ertek));
    };

    return (
        <div className="kompatibilitas-szerkeszto">
            {sorok.map((sor, i) => (
                <div className="parameter-sor" key={i}>
                    <input className="bemenet" placeholder="pl. Anyag" aria-label={(i + 1) + '. paraméter neve'} maxLength={60} value={sor.nev} onChange={(e) => modosit(i, 'nev', e.target.value)} />
                    <input className="bemenet" placeholder="pl. Alumínium" aria-label={(i + 1) + '. paraméter értéke'} maxLength={120} value={sor.ertek} onChange={(e) => modosit(i, 'ertek', e.target.value)} />
                    <button className="ikon-gomb" type="button" onClick={() => setSorok(sorTorlese(sorok, i))} aria-label={(i + 1) + '. paraméter törlése'}>
                        <Ikon nev="x" meret={16} />
                    </button>
                </div>
            ))}
            <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={() => setSorok([...sorok, { nev: '', ertek: '' }])}>
                <Ikon nev="plusz" meret={15} /> Paraméter hozzáadása
            </button>
        </div>
    );
};

const szamVagyNull = (ertek) => {
    if (ertek === '' || ertek === null || ertek === undefined) {
        return null;
    }
    return Number(ertek);
};

// a termék szerkesztő űrlap élő előnézettel
const Szerkeszto = ({ alkatresz, markak }) => {
    const navigate = useNavigate();
    const uj = !alkatresz;
    const [adatok, setAdatok] = useState(() => {
        if (uj) {
            return uresAlkatresz();
        }
        return alkatreszUrlapbol(alkatresz);
    });
    const [hibak, setHibak] = useState([]);
    const [mentes, setMentes] = useState(false);

    // egy mező értékének beállítása
    const beallit = (mezo) => (ertek) => {
        setAdatok((elozo) => ({ ...elozo, [mezo]: ertek }));
    };

    // input változásakor (checkboxnál a checked kell)
    const mezo = (nev) => (event) => {
        if (event.target.type === 'checkbox') {
            beallit(nev)(event.target.checked);
        } else {
            beallit(nev)(event.target.value);
        }
    };

    const setKepek = (frissito) => {
        setAdatok((elozo) => {
            let kepek = frissito;
            if (typeof frissito === 'function') {
                kepek = frissito(elozo.kepek);
            }
            return { ...elozo, kepek: kepek };
        });
    };

    // ha feltöltött képeket, de nem mentette el, kilépéskor töröljük őket (mint az autó szerkesztőben)
    const ujKepek = useRef([]);
    const mentve = useRef(false);
    useEffect(() => {
        const kepek = ujKepek.current;
        return () => {
            if (mentve.current || kepek.length === 0) {
                return;
            }
            fetch(API_URL + '/kepek', {
                method: 'DELETE',
                credentials: 'include',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicIds: kepek }),
            }).catch(() => {});
        };
    }, []);

    const kuldes = async (event) => {
        event.preventDefault();
        setHibak([]);
        if (adatok.kepek.length === 0) {
            setHibak(['Legalább egy képet tölts fel.']);
            return;
        }
        setMentes(true);

        let url = '/admin/alkatreszek';
        let metodus = 'POST';
        if (!uj) {
            url = '/admin/alkatreszek/' + alkatresz._id;
            metodus = 'PUT';
        }

        // a számokat számként küldjük, univerzálisnál nem kell kompatibilitás
        const torzs = {
            ...adatok,
            ar: szamVagyNull(adatok.ar),
            akciosAr: szamVagyNull(adatok.akciosAr),
            keszlet: szamVagyNull(adatok.keszlet),
            kepek: adatok.kepek.map((kep) => ({ url: kep.url, publicId: kep.publicId, tipus: kep.tipus, leiras: kep.leiras })),
            kompatibilitas: adatok.univerzalis ? [] : adatok.kompatibilitas,
        };

        try {
            const data = await apiKeres(url, { method: metodus, body: torzs }, 'A mentés nem sikerült.');
            mentve.current = true;
            navigate('/alkatreszek/' + data.alkatresz.slug, { replace: uj });
        } catch (error) {
            setHibak([error.message]);
            setMentes(false);
        }
    };

    const elonezet = {
        ...adatok,
        _id: 'elonezet',
        slug: '',
        ar: Number(adatok.ar) || 0,
        akciosAr: szamVagyNull(adatok.akciosAr),
        akcios: adatok.akciosAr !== '' && Number(adatok.akciosAr) < Number(adatok.ar),
        keszlet: Number(adatok.keszlet) || 0,
        kep: adatok.kepek.length > 0 ? adatok.kepek[0].url : undefined,
        kategoriaNev: KATEGORIAK[adatok.kategoria] || 'Kategória',
        nev: adatok.nev || 'Termék neve',
        gyarto: adatok.gyarto || 'Gyártó',
    };

    let gombFelirat = 'Változtatások mentése';
    if (mentes) {
        gombFelirat = 'Mentés…';
    } else if (uj) {
        gombFelirat = 'Termék közzététele';
    }

    return (
        <form className="szerkeszto" onSubmit={kuldes}>
            <div className="szerkeszto-elrendezes">
                <div className="auto-urlap">
                    <Szekcio szam={1} cim="Képek" megjegyzes="az első a borítókép – lehetőleg világos háttérrel">
                        <KepKezelo kepek={adatok.kepek} setKepek={setKepek} onUjKep={(publicId) => ujKepek.current.push(publicId)} />
                    </Szekcio>

                    <Szekcio szam={2} cim="Alapadatok">
                        <div className="auto-urlap-racs">
                            <Mezo cimke="Termék neve" kotelezo szeles>
                                <input className="bemenet" required maxLength={140} placeholder="pl. V3 állítható menetes futómű" value={adatok.nev} onChange={mezo('nev')} />
                            </Mezo>
                            <Mezo cimke="Gyártó" kotelezo>
                                <input className="bemenet" required maxLength={60} placeholder="pl. KW, K&N, Bilstein" value={adatok.gyarto} onChange={mezo('gyarto')} />
                            </Mezo>
                            <Mezo cimke="Cikkszám" kotelezo sugo="Egyedi; betű, szám és . _ / - jel.">
                                <input className="bemenet" required maxLength={40} pattern="[A-Za-z0-9._\/\-]+" placeholder="pl. 35220075" value={adatok.cikkszam}
                                    onChange={(e) => beallit('cikkszam')(e.target.value.toUpperCase())} />
                            </Mezo>
                            <Mezo cimke="Kategória" kotelezo>
                                <select className="bemenet" required value={adatok.kategoria} onChange={mezo('kategoria')}>
                                    <option value="" disabled>Válassz…</option>
                                    {Object.entries(KATEGORIAK).map(([kulcs, nev]) => <option key={kulcs} value={kulcs}>{nev}</option>)}
                                </select>
                            </Mezo>
                            <Mezo cimke="Rövid leírás" szeles sugo="A kártyán és a termékoldal tetején jelenik meg (max. 300 karakter).">
                                <input className="bemenet" maxLength={300} placeholder="pl. Keménység és magasság külön állítható, TÜV-papírokkal" value={adatok.rovidLeiras} onChange={mezo('rovidLeiras')} />
                            </Mezo>
                            <Mezo cimke="Részletes leírás" szeles>
                                <textarea className="bemenet" rows={6} maxLength={8000} value={adatok.leiras} onChange={mezo('leiras')} />
                            </Mezo>
                        </div>
                    </Szekcio>

                    <Szekcio szam={3} cim="Ár és készlet" megjegyzes="bruttó forintban">
                        <div className="auto-urlap-racs">
                            <Mezo cimke="Ár" kotelezo>
                                <div className="bemenet-egyseggel">
                                    <input className="bemenet" type="number" required min={0} step={1} inputMode="numeric" value={adatok.ar} onChange={mezo('ar')} />
                                    <span>Ft</span>
                                </div>
                            </Mezo>
                            <Mezo cimke="Akciós ár" sugo="Üresen: nincs akció. Kisebb legyen a normál árnál.">
                                <div className="bemenet-egyseggel">
                                    <input className="bemenet" type="number" min={0} step={1} inputMode="numeric" value={adatok.akciosAr} onChange={mezo('akciosAr')} />
                                    <span>Ft</span>
                                </div>
                            </Mezo>
                            <Mezo cimke="Készlet" kotelezo>
                                <div className="bemenet-egyseggel">
                                    <input className="bemenet" type="number" required min={0} step={1} inputMode="numeric" value={adatok.keszlet} onChange={mezo('keszlet')} />
                                    <span>db</span>
                                </div>
                            </Mezo>
                        </div>
                    </Szekcio>

                    <Szekcio szam={4} cim="Mely autókra illik?">
                        <label className="kapcsolo-sor">
                            <input type="checkbox" checked={adatok.univerzalis} onChange={mezo('univerzalis')} />
                            <span className="kapcsolo" aria-hidden="true" /> Univerzális – minden autóhoz használható
                        </label>
                        {!adatok.univerzalis && (
                            <>
                                <p className="mezo-sugo">Üres modell = a márka minden modellje; üres évjárat = nincs korlát.</p>
                                <KompatibilitasSzerkeszto sorok={adatok.kompatibilitas} setSorok={beallit('kompatibilitas')} markak={markak} />
                            </>
                        )}
                    </Szekcio>

                    <Szekcio szam={5} cim="Műszaki paraméterek" megjegyzes={adatok.parameterek.length + ' sor'}>
                        <ParameterSzerkeszto sorok={adatok.parameterek} setSorok={beallit('parameterek')} />
                    </Szekcio>

                    <Szekcio szam={6} cim="Megjelenés">
                        <div className="urlap-kapcsolok">
                            <label className="kapcsolo-sor">
                                <input type="checkbox" checked={adatok.lathato} onChange={mezo('lathato')} />
                                <span className="kapcsolo" aria-hidden="true" /> Látható a webshopban
                            </label>
                            <label className="kapcsolo-sor">
                                <input type="checkbox" checked={adatok.kiemelt} onChange={mezo('kiemelt')} />
                                <span className="kapcsolo" aria-hidden="true" /> Kiemelt termék (a lista elején)
                            </label>
                        </div>
                    </Szekcio>
                </div>

                <aside className="szerkeszto-oldalsav">
                    <p className="szerkeszto-elonezet-cim">Élő előnézet</p>
                    <div className="szerkeszto-elonezet-kartya" inert>
                        <AlkatreszKartya alkatresz={elonezet} />
                    </div>
                    {hibak.length > 0 && (
                        <ul className="uzenet uzenet-hiba szerkeszto-hibak" role="alert">{hibak.map((hiba) => <li key={hiba}>{hiba}</li>)}</ul>
                    )}
                    <button className="gomb gomb-fo" type="submit" disabled={mentes}>{gombFelirat}</button>
                    <Link className="gomb gomb-uveg" to="/admin?lap=alkatreszek">Mégse</Link>
                </aside>
            </div>
        </form>
    );
};

// márkák egy listából (ha nem sikerül betölteni, üres lista)
const markakBetoltese = async (url) => {
    try {
        const data = await apiKeres(url);
        return data.markak.map((elem) => elem.marka);
    } catch {
        return [];
    }
};

// új termék vagy meglévő szerkesztése (az adatok betöltése)
const AlkatreszSzerkeszto = () => {
    const { id } = useParams();
    const uj = !id;
    const kulcs = id || 'uj';
    const [allapot, setAllapot] = useState({ kulcs: null, alkatresz: null, markak: [], hiba: '' });
    useSeo({ cim: uj ? 'Új termék' : 'Termék szerkesztése', noindex: true });

    useEffect(() => {
        const betoltes = async () => {
            let alkatresz = null;
            if (!uj) {
                try {
                    const data = await apiKeres('/admin/alkatreszek/' + id, {}, 'A termék betöltése nem sikerült.');
                    alkatresz = data.alkatresz;
                } catch (error) {
                    setAllapot({ kulcs: kulcs, alkatresz: null, markak: [], hiba: error.message });
                    return;
                }
            }

            // márka javaslatok: az autók márkái és a már megadott kompatibilitások márkái
            const autoMarkak = await markakBetoltese('/autok/szurok');
            const alkatreszMarkak = await markakBetoltese('/alkatreszek/szurok');
            const markak = [];
            for (const marka of [...autoMarkak, ...alkatreszMarkak]) {
                if (!markak.includes(marka)) {
                    markak.push(marka);
                }
            }
            markak.sort((a, b) => a.localeCompare(b, 'hu'));

            setAllapot({ kulcs: kulcs, alkatresz: alkatresz, markak: markak, hiba: '' });
        };
        betoltes();
    }, [id, uj, kulcs]);

    let cim = 'Termék szerkesztése';
    if (uj) {
        cim = 'Új termék';
    } else if (allapot.alkatresz && allapot.alkatresz.nev) {
        cim = allapot.alkatresz.nev;
    }

    return (
        <main className="oldal admin">
            <header className="admin-fejlec">
                <div>
                    <Link className="vissza-link" to="/admin?lap=alkatreszek"><Ikon nev="balra" meret={15} /> Alkatrészek</Link>
                    <h1>{cim}</h1>
                </div>
            </header>
            {allapot.kulcs !== kulcs && <div className="betoltes"><span className="porgo" aria-hidden="true" />Betöltés…</div>}
            {allapot.kulcs === kulcs && allapot.hiba && <p className="uzenet uzenet-hiba" role="alert">{allapot.hiba}</p>}
            {allapot.kulcs === kulcs && !allapot.hiba && (
                <Szerkeszto key={kulcs} alkatresz={allapot.alkatresz} markak={allapot.markak} />
            )}
        </main>
    );
};

export default AlkatreszSzerkeszto;
