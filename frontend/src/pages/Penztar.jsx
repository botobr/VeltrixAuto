import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useFelhasznalo } from '../context/felhasznalo';
import { useKosar } from '../context/kosar';
import { apiKeres } from '../lib/api';
import { useKosarEllenorzes } from '../lib/useKosarEllenorzes';
import { useSeo } from '../lib/useSeo';
import { ft } from '../lib/webshop';
import { Osszesito } from './Kosar';
import './Webshop.css';

// egy mező felirattal
const Mezo = ({ cimke, children, szeles = false }) => (
    <label className={szeles ? 'mezo mezo-szeles' : 'mezo'}>
        <span>{cimke}</span>
        {children}
    </label>
);

// irányítószám, település, utca (szállítási és számlázási címhez is)
const CimMezok = ({ cim, beallit, elotag }) => (
    <>
        <Mezo cimke="Irányítószám">
            <input className="bemenet" required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete={elotag + ' postal-code'}
                value={cim.iranyitoszam} onChange={(e) => beallit('iranyitoszam', e.target.value)} />
        </Mezo>
        <Mezo cimke="Település">
            <input className="bemenet" required maxLength={60} autoComplete={elotag + ' address-level2'} value={cim.varos} onChange={(e) => beallit('varos', e.target.value)} />
        </Mezo>
        <Mezo cimke="Utca, házszám" szeles>
            <input className="bemenet" required maxLength={160} autoComplete={elotag + ' street-address'} value={cim.cim} onChange={(e) => beallit('cim', e.target.value)} />
        </Mezo>
    </>
);

// választható lehetőség (rádiógomb), pl. szállítási mód
const Valasztas = ({ nev, ertek, aktualis, onValaszt, cim, leiras, jobb }) => (
    <label className={aktualis === ertek ? 'valasztas aktiv' : 'valasztas'}>
        <input type="radio" name={nev} value={ertek} checked={aktualis === ertek} onChange={() => onValaszt(ertek)} required />
        <span className="valasztas-szoveg"><strong>{cim}</strong>{leiras && <small>{leiras}</small>}</span>
        {jobb && <span className="valasztas-jobb">{jobb}</span>}
    </label>
);

const ures = { iranyitoszam: '', varos: '', cim: '' };

// a pénztár oldal (rendelés leadása)
const Penztar = () => {
    const { felhasznalo } = useFelhasznalo();
    const { tetelek, urites } = useKosar();
    const navigate = useNavigate();
    // ha be van jelentkezve, kitöltjük a nevét és e-mail címét
    const [vevo, setVevo] = useState(() => {
        if (felhasznalo) {
            return { nev: felhasznalo.nev || '', email: felhasznalo.email || '', telefon: '' };
        }
        return { nev: '', email: '', telefon: '' };
    });
    const [szallitasiMod, setSzallitasiMod] = useState(null);
    const [telephely, setTelephely] = useState('');
    const [szallitasiCim, setSzallitasiCim] = useState(ures);
    const [szamlazasEgyezik, setSzamlazasEgyezik] = useState(true);
    const [ceges, setCeges] = useState(false);
    const [szamlazasiCim, setSzamlazasiCim] = useState({ ...ures, nev: '', adoszam: '' });
    const [valasztottFizetes, setValasztottFizetes] = useState(null);
    const [megjegyzes, setMegjegyzes] = useState('');
    const [aszf, setAszf] = useState(false);
    const [kuldes, setKuldes] = useState(false);
    const [hibak, setHibak] = useState([]);

    const { adat, hiba, betolt, ures: uresKosar } = useKosarEllenorzes({ szallitasiMod, fizetesiMod: valasztottFizetes });
    useSeo({ cim: 'Pénztár', noindex: true });

    // üres kosárral nincs mit itt csinálni
    if (uresKosar && !kuldes) {
        return <Navigate to="/kosar" replace />;
    }
    if (!adat) {
        if (hiba) {
            return <main className="oldal"><p className="uzenet uzenet-hiba" role="alert">{hiba}</p></main>;
        }
        return <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Pénztár betöltése…</main>;
    }

    // a választott fizetési mód csak akkor jó, ha a szállítási módhoz is választható
    let fizetesiMod = null;
    for (const mod of adat.fizetesiModok) {
        if (mod.kulcs === valasztottFizetes) {
            fizetesiMod = valasztottFizetes;
        }
    }
    const futar = szallitasiMod === 'futar';
    // külön számlázási cím kell, ha nem futár, vagy ha nem egyezik a szállítási címmel
    const szamlazasKulon = !futar || !szamlazasEgyezik;

    // egy objektum egy mezőjének beállítása (pl. beallito(setVevo)('nev', 'Péter'))
    const beallito = (setter) => (mezo, ertek) => {
        setter((elozo) => ({ ...elozo, [mezo]: ertek }));
    };

    const leadas = async (event) => {
        event.preventDefault();
        setHibak([]);
        setKuldes(true);

        // a számlázási cím összeállítása
        let adoszam = '';
        if (ceges) {
            adoszam = szamlazasiCim.adoszam;
        }
        let szamlazas;
        if (szamlazasKulon) {
            szamlazas = { ...szamlazasiCim, nev: szamlazasiCim.nev || vevo.nev, adoszam: adoszam };
        } else {
            let nev = vevo.nev;
            if (ceges && szamlazasiCim.nev) {
                nev = szamlazasiCim.nev;
            }
            szamlazas = { ...szallitasiCim, nev: nev, adoszam: adoszam };
        }

        const torzs = {
            tetelek: tetelek,
            vevo: vevo,
            szallitasiMod: szallitasiMod,
            fizetesiMod: fizetesiMod,
            megjegyzes: megjegyzes,
            aszf: aszf,
            szamlazasiCim: szamlazas,
        };
        if (szallitasiMod === 'szemelyes') {
            torzs.telephely = telephely;
        }
        if (futar) {
            torzs.szallitasiCim = szallitasiCim;
        }

        try {
            const valasz = await apiKeres('/rendelesek', { method: 'POST', body: torzs }, 'A rendelés leadása nem sikerült.');
            urites();
            // kártyás fizetésnél átmegyünk a Stripe oldalára
            if (valasz.fizetesUrl) {
                window.location.assign(valasz.fizetesUrl);
                return;
            }
            navigate('/rendeles/' + encodeURIComponent(valasz.rendelesSzam) + '?kulcs=' + valasz.kulcs + '&uj=1', { replace: true });
        } catch (error) {
            setHibak([error.message]);
            setKuldes(false);
        }
    };

    return (
        <main className="oldal penztar-oldal">
            <header className="webshop-fejlec">
                <p className="felirat">Webshop</p>
                <h1>Pénztár</h1>
            </header>

            <form className="webshop-elrendezes" onSubmit={leadas}>
                <div className="penztar-lepesek">
                    <fieldset className="uveg penztar-blokk">
                        <legend><span>1</span> Elérhetőség</legend>
                        <div className="penztar-racs">
                            <Mezo cimke="Teljes név">
                                <input className="bemenet" required minLength={2} maxLength={120} autoComplete="name" value={vevo.nev} onChange={(e) => beallito(setVevo)('nev', e.target.value)} />
                            </Mezo>
                            <Mezo cimke="E-mail">
                                <input className="bemenet" type="email" required maxLength={120} autoComplete="email" value={vevo.email} onChange={(e) => beallito(setVevo)('email', e.target.value)} />
                            </Mezo>
                            <Mezo cimke="Telefonszám">
                                <input className="bemenet" type="tel" required maxLength={40} autoComplete="tel" placeholder="+36 30 123 4567" value={vevo.telefon} onChange={(e) => beallito(setVevo)('telefon', e.target.value)} />
                            </Mezo>
                        </div>
                        {!felhasznalo && <p className="penztar-sugo">Van fiókod? <Link to="/belepes" state={{ from: '/penztar' }}>Jelentkezz be</Link>, és a rendeléseidet a Fiókomban is látod.</p>}
                    </fieldset>

                    <fieldset className="uveg penztar-blokk">
                        <legend><span>2</span> Szállítás</legend>
                        <div className="valasztasok">
                            {adat.szallitasiModok.map((mod) => (
                                <Valasztas key={mod.kulcs} nev="szallitas" ertek={mod.kulcs} aktualis={szallitasiMod} onValaszt={setSzallitasiMod} cim={mod.nev}
                                    leiras={mod.ingyenesHatar ? ft(mod.ingyenesHatar) + ' felett ingyenes' : null}
                                    jobb={mod.dij ? ft(mod.dij) : 'Ingyenes'} />
                            ))}
                        </div>
                        {futar && (
                            <div className="penztar-racs">
                                <CimMezok cim={szallitasiCim} beallit={beallito(setSzallitasiCim)} elotag="shipping" />
                            </div>
                        )}
                        {szallitasiMod === 'szemelyes' && (
                            <Mezo cimke="Átvételi hely">
                                <select className="bemenet" required value={telephely} onChange={(e) => setTelephely(e.target.value)}>
                                    <option value="">Válassz telephelyet…</option>
                                    {adat.telephelyek.map((hely) => <option key={hely._id} value={hely._id}>{hely.nev} – {hely.iranyitoszam} {hely.varos}, {hely.cim}</option>)}
                                </select>
                            </Mezo>
                        )}
                    </fieldset>

                    <fieldset className="uveg penztar-blokk">
                        <legend><span>3</span> Fizetés</legend>
                        {!szallitasiMod ? <p className="penztar-sugo">Előbb válassz szállítási módot.</p> : (
                            <div className="valasztasok">
                                {adat.fizetesiModok.map((mod) => (
                                    <Valasztas key={mod.kulcs} nev="fizetes" ertek={mod.kulcs} aktualis={fizetesiMod} onValaszt={setValasztottFizetes} cim={mod.nev}
                                        leiras={mod.online ? 'A Stripe biztonságos fizetőoldalán – a kártyaadataid hozzánk nem jutnak el.' : null}
                                        jobb={mod.dij ? '+' + ft(mod.dij) : null} />
                                ))}
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="uveg penztar-blokk">
                        <legend><span>4</span> Számlázás</legend>
                        {futar && (
                            <label className="jelolo">
                                <input type="checkbox" checked={szamlazasEgyezik} onChange={(e) => setSzamlazasEgyezik(e.target.checked)} />
                                <span>A számlázási cím megegyezik a szállítási címmel</span>
                            </label>
                        )}
                        <label className="jelolo">
                            <input type="checkbox" checked={ceges} onChange={(e) => setCeges(e.target.checked)} />
                            <span>Cég nevére kérem a számlát</span>
                        </label>
                        <div className="penztar-racs">
                            {(ceges || szamlazasKulon) && (
                                <Mezo cimke={ceges ? 'Cégnév' : 'Számlázási név'}>
                                    <input className="bemenet" required={ceges} maxLength={120} placeholder={ceges ? '' : vevo.nev}
                                        value={szamlazasiCim.nev} onChange={(e) => beallito(setSzamlazasiCim)('nev', e.target.value)} />
                                </Mezo>
                            )}
                            {ceges && (
                                <Mezo cimke="Adószám">
                                    <input className="bemenet" required pattern="\d{8}-\d-\d{2}" placeholder="12345678-1-12" value={szamlazasiCim.adoszam}
                                        onChange={(e) => beallito(setSzamlazasiCim)('adoszam', e.target.value)} />
                                </Mezo>
                            )}
                            {szamlazasKulon && <CimMezok cim={szamlazasiCim} beallit={beallito(setSzamlazasiCim)} elotag="billing" />}
                        </div>
                        <Mezo cimke="Megjegyzés a rendeléshez (nem kötelező)" szeles>
                            <textarea className="bemenet" rows={3} maxLength={1000} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)}
                                placeholder="pl. beszerelést is kérnék, vagy az autó típusa a kompatibilitás ellenőrzéséhez" />
                        </Mezo>
                    </fieldset>
                </div>

                <aside className={betolt ? 'uveg webshop-oldalsav webshop-tolt' : 'uveg webshop-oldalsav'}>
                    <h2>Rendelésed</h2>
                    <ul className="penztar-tetelek">
                        {adat.tetelek.map((t) => (
                            <li key={t.id}><span>{t.mennyiseg} × {t.nev}</span><strong>{ft(t.sorosszeg)}</strong></li>
                        ))}
                    </ul>
                    <Osszesito osszegek={adat.osszegek} szallitasKivalasztva={Boolean(szallitasiMod)} />
                    <label className="jelolo">
                        <input type="checkbox" checked={aszf} onChange={(e) => setAszf(e.target.checked)} required />
                        <span>Elfogadom az <Link to="/aszf" target="_blank">ÁSZF-et</Link> és az <Link to="/adatkezeles" target="_blank">adatkezelési tájékoztatót</Link>.</span>
                    </label>
                    {(hibak.length > 0 || !adat.rendelheto) && (
                        <div className="uzenet uzenet-hiba" role="alert">
                            {!adat.rendelheto && <>A kosárban készlethiány van. <Link to="/kosar">Vissza a kosárhoz</Link></>}
                            {adat.rendelheto && hibak.map((uzenet) => <p key={uzenet}>{uzenet}</p>)}
                        </div>
                    )}
                    <button className="gomb gomb-fo" type="submit" disabled={kuldes || betolt || !adat.rendelheto || !fizetesiMod}>
                        {kuldes ? 'Rendelés leadása…' : 'Megrendelem – fizetési kötelezettséggel'}
                    </button>
                    {fizetesiMod === 'kartya' && <p className="penztar-sugo">A gomb után a Stripe fizetőoldalára irányítunk.</p>}
                    <Link className="szoveg-gomb" to="/kosar">← Vissza a kosárhoz</Link>
                </aside>
            </form>
        </main>
    );
};

export default Penztar;
