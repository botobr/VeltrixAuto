import { Link } from 'react-router-dom';
import Ikon from '../components/Ikon';
import { useKosar } from '../context/kosar';
import { kepMeret } from '../lib/auto';
import { useKosarEllenorzes } from '../lib/useKosarEllenorzes';
import { useSeo } from '../lib/useSeo';
import { alkatreszUrl, ft } from '../lib/webshop';
import './Webshop.css';

/** A rendelés összegzése (kosár és pénztár oldalsávja). */
export const Osszesito = ({ osszegek, szallitasKivalasztva = false, children }) => (
    <dl className="osszesito">
        <div><dt>Termékek</dt><dd>{ft(osszegek.termekek)}</dd></div>
        <div>
            <dt>Szállítás</dt>
            <dd>{szallitasKivalasztva ? (osszegek.szallitas ? ft(osszegek.szallitas) : 'Ingyenes') : 'a pénztárban'}</dd>
        </div>
        {osszegek.kezelesiDij > 0 && <div><dt>Kezelési díj</dt><dd>{ft(osszegek.kezelesiDij)}</dd></div>}
        <div className="osszesito-vegosszeg"><dt>Fizetendő</dt><dd>{ft(osszegek.vegosszeg)}</dd></div>
        {children}
    </dl>
);

const Kosar = () => {
    const { mennyisegBeallitas, eltavolitas } = useKosar();
    const { adat, hiba, betolt, ures } = useKosarEllenorzes();
    useSeo({ cim: 'Kosár', noindex: true });

    if (ures) {
        return (
            <main className="oldal kosar-oldal">
                <div className="allapot-doboz uveg">
                    <span className="allapot-ikon" aria-hidden="true"><Ikon nev="kosar" meret={22} /></span>
                    <h1>A kosarad üres</h1>
                    <p>Nézz körül a tuning alkatrészek között – szűrhetsz az autód típusára is.</p>
                    <Link className="gomb gomb-fo" to="/alkatreszek">Tuning alkatrészek</Link>
                </div>
            </main>
        );
    }
    if (!adat) {
        return hiba
            ? <main className="oldal"><p className="uzenet uzenet-hiba" role="alert">{hiba}</p></main>
            : <main className="betoltes" aria-live="polite"><span className="porgo" aria-hidden="true" />Kosár betöltése…</main>;
    }

    const ingyenesHatar = adat.szallitasiModok.find((m) => m.kulcs === 'futar')?.ingyenesHatar;
    const hianyzikIngyeneshez = ingyenesHatar ? ingyenesHatar - adat.osszegek.termekek : 0;

    return (
        <main className="oldal kosar-oldal">
            <header className="webshop-fejlec">
                <p className="felirat">Webshop</p>
                <h1>Kosár</h1>
            </header>

            <div className={`webshop-elrendezes ${betolt ? 'webshop-tolt' : ''}`} aria-busy={betolt}>
                <section className="uveg kosar-tetelek" aria-label="Kosár tételei">
                    {adat.tetelek.map((t) => (
                        <article key={t.id} className={`kosar-tetel ${t.hiba ? 'kosar-tetel-hiba' : ''}`}>
                            <Link to={alkatreszUrl(t)} className="kosar-kep">
                                {t.kep ? <img src={kepMeret(t.kep, 200)} alt="" /> : <span>VELTRIX</span>}
                            </Link>
                            <div className="kosar-tetel-fo">
                                <p className="auto-marka">{t.gyarto} · {t.cikkszam}</p>
                                <Link to={alkatreszUrl(t)} className="kosar-tetel-nev">{t.nev}</Link>
                                <p className="kosar-egysegar">
                                    {t.egysegar < t.ar && <s>{ft(t.ar)}</s>} {ft(t.egysegar)} / db
                                </p>
                                {t.hiba && <p className="kosar-hiba" role="alert"><Ikon nev="x" meret={14} /> {t.hiba}</p>}
                            </div>
                            <div className="kosar-tetel-vezerlok">
                                <div className="mennyiseg" role="group" aria-label={`${t.nev} mennyisége`}>
                                    <button type="button" className="ikon-gomb" aria-label="Eggyel kevesebb" onClick={() => mennyisegBeallitas(t.id, t.mennyiseg - 1)}>
                                        <Ikon nev="minusz" meret={16} />
                                    </button>
                                    <span className="mennyiseg-ertek" aria-live="polite">{t.mennyiseg}</span>
                                    <button type="button" className="ikon-gomb" aria-label="Eggyel több" disabled={t.mennyiseg >= t.keszlet}
                                        onClick={() => mennyisegBeallitas(t.id, t.mennyiseg + 1)}>
                                        <Ikon nev="plusz" meret={16} />
                                    </button>
                                </div>
                                <strong className="kosar-sorosszeg">{ft(t.sorosszeg)}</strong>
                                <button type="button" className="szoveg-gomb kosar-torles" onClick={() => eltavolitas(t.id)}>Eltávolítás</button>
                            </div>
                        </article>
                    ))}
                </section>

                <aside className="uveg webshop-oldalsav">
                    <h2>Összesítés</h2>
                    <Osszesito osszegek={adat.osszegek} />
                    {hianyzikIngyeneshez > 0 && (
                        <p className="ingyenes-szallitas">Még <strong>{ft(hianyzikIngyeneshez)}</strong> és ingyenes a házhozszállítás!</p>
                    )}
                    {hiba && <p className="uzenet uzenet-hiba" role="alert">{hiba}</p>}
                    {adat.rendelheto
                        ? <Link className="gomb gomb-fo" to="/penztar">Tovább a pénztárhoz <Ikon nev="jobbra" meret={16} /></Link>
                        : <p className="uzenet uzenet-hiba">A pirossal jelölt tételek mennyiségét csökkentsd, vagy töröld őket a rendeléshez.</p>}
                    <Link className="szoveg-gomb" to="/alkatreszek">← Vásárlás folytatása</Link>
                </aside>
            </div>
        </main>
    );
};

export default Kosar;
