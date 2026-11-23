import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AutoKartya from '../../components/AutoKartya';
import AutoUrlap from '../../components/AutoUrlap';
import Ikon from '../../components/Ikon';
import { useFelhasznalo } from '../../context/felhasznalo';
import { API_URL, apiKeres } from '../../lib/api';
import { autoNev, egyediMezokAdatokbol, kuldhetoAdatok, szamMezokElonezethez, uresUrlap, urlapAdatokbol } from '../../lib/auto';
import { useSeo } from '../../lib/useSeo';
import './Admin.css';

// az autó szerkesztő űrlap élő előnézettel
const Szerkeszto = ({ auto, telephelyek }) => {
    const { jog } = useFelhasznalo();
    const navigate = useNavigate();
    const uj = !auto;
    const [adatok, setAdatok] = useState(() => {
        if (!uj) {
            return urlapAdatokbol(auto);
        }
        const kezdo = uresUrlap();
        // ha csak egy telephely van, azt kiválasztjuk
        if (telephelyek.length === 1) {
            kezdo.telephely = telephelyek[0]._id;
        }
        return kezdo;
    });
    const [egyediMezok, setEgyediMezok] = useState(() => egyediMezokAdatokbol(adatok));
    const [hibak, setHibak] = useState([]);
    const [mentes, setMentes] = useState(false);

    // Ha feltöltött képeket, de nem mentette el a hirdetést, kilépéskor töröljük a képeket.
    const ujKepek = useRef([]);
    const mentve = useRef(false);
    useEffect(() => {
        // a tömb ugyanaz marad (csak push-olunk bele), ezért elég egyszer elkérni
        const kepek = ujKepek.current;
        return () => {
            if (mentve.current || kepek.length === 0) {
                return;
            }
            // keepalive: akkor is elküldi, ha közben elhagyja az oldalt
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

        // új autónál POST, szerkesztésnél PUT
        let url = '/autok';
        let metodus = 'POST';
        if (!uj) {
            url = '/autok/' + auto._id;
            metodus = 'PUT';
        }

        try {
            const data = await apiKeres(url, { method: metodus, body: kuldhetoAdatok(adatok) }, 'A mentés nem sikerült.');
            mentve.current = true;
            navigate('/autok/' + data.auto.slug, { replace: uj });
        } catch (error) {
            setHibak([error.message || 'A mentés nem sikerült.']);
            setMentes(false);
        }
    };

    // az előnézet kártya adatai
    let elonezetKep;
    if (adatok.kepek.length > 0) {
        elonezetKep = adatok.kepek[0].url;
    }
    const elonezet = {
        ...adatok,
        ...szamMezokElonezethez(adatok),
        kep: elonezetKep,
        telephely: telephelyek.find((telephely) => telephely._id === adatok.telephely),
    };

    let gombFelirat = 'Változtatások mentése';
    if (mentes) {
        gombFelirat = 'Mentés…';
    } else if (uj) {
        gombFelirat = 'Hirdetés közzététele';
    }

    return (
        <form className="szerkeszto" onSubmit={kuldes} noValidate={false}>
            <div className="szerkeszto-elrendezes">
                <AutoUrlap
                    penzugy={jog('penzugy')}
                    adatok={adatok}
                    setAdatok={setAdatok}
                    egyediMezok={egyediMezok}
                    setEgyediMezok={setEgyediMezok}
                    telephelyek={telephelyek}
                    onUjKep={(publicId) => ujKepek.current.push(publicId)}
                />
                <aside className="szerkeszto-oldalsav">
                    <p className="szerkeszto-elonezet-cim">Élő előnézet</p>
                    <AutoKartya auto={elonezet} muveletek={false} link={false} />
                    {hibak.length > 0 && (
                        <ul className="uzenet uzenet-hiba szerkeszto-hibak" role="alert">
                            {hibak.map((hiba) => <li key={hiba}>{hiba}</li>)}
                        </ul>
                    )}
                    <button className="gomb gomb-fo" type="submit" disabled={mentes}>{gombFelirat}</button>
                    <Link className="gomb gomb-uveg" to={uj ? '/admin?lap=hirdetesek' : '/autok/' + auto.slug}>Mégse</Link>
                </aside>
            </div>
        </form>
    );
};

// új hirdetés vagy meglévő szerkesztése (az adatok betöltése)
const AutoSzerkeszto = () => {
    const { id } = useParams();
    const uj = !id;
    const [allapot, setAllapot] = useState({ kulcs: null, auto: null, telephelyek: [], hiba: '' });
    const kulcs = id || 'uj';

    useSeo({ cim: uj ? 'Új hirdetés' : 'Hirdetés szerkesztése', noindex: true });

    useEffect(() => {
        const betoltes = async () => {
            // a telephelyek a legördülő listához (ha nem sikerül, üres lista)
            let telephelyek = [];
            try {
                const data = await apiKeres('/telephelyek');
                telephelyek = data.telephelyek;
            } catch {
                // nem baj, üres lista marad
            }

            // szerkesztésnél az autó adatai
            let auto = null;
            if (!uj) {
                try {
                    const data = await apiKeres('/autok/' + id, {}, 'Az autó betöltése nem sikerült.');
                    auto = data.auto;
                } catch (error) {
                    setAllapot({ kulcs: kulcs, auto: null, telephelyek: [], hiba: error.message });
                    return;
                }
            }

            setAllapot({ kulcs: kulcs, auto: auto, telephelyek: telephelyek, hiba: '' });
        };
        betoltes();
    }, [id, uj, kulcs]);

    let cim = 'Hirdetés szerkesztése';
    if (uj) {
        cim = 'Új hirdetés';
    } else if (allapot.auto) {
        cim = autoNev(allapot.auto);
    }

    return (
        <main className="oldal admin">
            <header className="admin-fejlec">
                <div>
                    <Link className="vissza-link" to="/admin?lap=hirdetesek"><Ikon nev="balra" meret={15} /> Hirdetések</Link>
                    <h1>{cim}</h1>
                </div>
            </header>
            {allapot.kulcs !== kulcs && <div className="betoltes"><span className="porgo" aria-hidden="true" />Betöltés…</div>}
            {allapot.kulcs === kulcs && allapot.hiba && <p className="uzenet uzenet-hiba" role="alert">{allapot.hiba}</p>}
            {allapot.kulcs === kulcs && !allapot.hiba && (
                <Szerkeszto key={kulcs} auto={allapot.auto} telephelyek={allapot.telephelyek} />
            )}
        </main>
    );
};

export default AutoSzerkeszto;
