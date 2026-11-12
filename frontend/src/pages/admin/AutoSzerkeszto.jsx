import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AutoKartya from '../../components/AutoKartya';
import AutoUrlap from '../../components/AutoUrlap';
import Ikon from '../../components/Ikon';
import { useAuth } from '../../context/auth';
import { API_URL, apiKeres } from '../../lib/api';
import { autoNev, egyediMezokAdatokbol, kuldhetoAdatok, szamMezokElonezethez, uresUrlap, urlapAdatokbol } from '../../lib/auto';
import { useSeo } from '../../lib/useSeo';
import './Admin.css';

const Szerkeszto = ({ auto, telephelyek }) => {
    const { jog } = useAuth();
    const navigate = useNavigate();
    const uj = !auto;
    const [adatok, setAdatok] = useState(() => {
        const kezdo = uj ? uresUrlap() : urlapAdatokbol(auto);
        if (uj && telephelyek.length === 1) kezdo.telephely = telephelyek[0]._id;
        return kezdo;
    });
    const [egyediMezok, setEgyediMezok] = useState(() => egyediMezokAdatokbol(adatok));
    const [hibak, setHibak] = useState([]);
    const [mentes, setMentes] = useState(false);

    // Mentés nélkül elhagyott, frissen feltöltött képek takarítása.
    const ujKepek = useRef(new Set());
    const mentve = useRef(false);
    useEffect(() => () => {
        if (mentve.current || ujKepek.current.size === 0) return;
        fetch(`${API_URL}/kepek`, {
            method: 'DELETE',
            credentials: 'include',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicIds: [...ujKepek.current] }),
        }).catch(() => {});
    }, []);

    const kuldes = async (event) => {
        event.preventDefault();
        setHibak([]);
        if (adatok.kepek.length === 0) {
            setHibak(['Legalább egy képet tölts fel.']);
            return;
        }
        setMentes(true);
        try {
            const data = await apiKeres(uj ? '/new-auto' : `/update-auto/${auto._id}`, {
                method: uj ? 'POST' : 'PUT',
                body: kuldhetoAdatok(adatok),
            }, 'A mentés nem sikerült.');
            mentve.current = true;
            const mentett = data.auto || data.updatedAuto;
            navigate(`/autok/${mentett.slug}`, { replace: uj });
        } catch (error) {
            setHibak(error.message ? [error.message] : ['A mentés nem sikerült.']);
            setMentes(false);
        }
    };

    const elonezet = { ...adatok, ...szamMezokElonezethez(adatok), kep: adatok.kepek[0]?.url, telephely: telephelyek.find((t) => t._id === adatok.telephely) };

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
                    onUjKep={(publicId) => ujKepek.current.add(publicId)}
                />
                <aside className="szerkeszto-oldalsav">
                    <p className="szerkeszto-elonezet-cim">Élő előnézet</p>
                    <AutoKartya auto={elonezet} muveletek={false} link={false} />
                    {hibak.length > 0 && (
                        <ul className="uzenet uzenet-hiba szerkeszto-hibak" role="alert">
                            {hibak.map((hiba) => <li key={hiba}>{hiba}</li>)}
                        </ul>
                    )}
                    <button className="gomb gomb-fo" type="submit" disabled={mentes}>
                        {mentes ? 'Mentés…' : uj ? 'Hirdetés közzététele' : 'Változtatások mentése'}
                    </button>
                    <Link className="gomb gomb-uveg" to={uj ? '/admin?lap=hirdetesek' : `/autok/${auto.slug}`}>Mégse</Link>
                </aside>
            </div>
        </form>
    );
};

const AutoSzerkeszto = () => {
    const { id } = useParams();
    const uj = !id;
    const [allapot, setAllapot] = useState({ kulcs: null, auto: null, telephelyek: [], hiba: '' });
    const kulcs = id || 'uj';

    useSeo({ cim: uj ? 'Új hirdetés' : 'Hirdetés szerkesztése', noindex: true });

    useEffect(() => {
        Promise.all([
            apiKeres('/telephelyek').then((data) => data.telephelyek).catch(() => []),
            uj ? Promise.resolve(null) : apiKeres(`/autok/${id}`, {}, 'Az autó betöltése nem sikerült.').then((data) => data.auto),
        ])
            .then(([telephelyek, auto]) => setAllapot({ kulcs, auto, telephelyek, hiba: '' }))
            .catch((error) => setAllapot({ kulcs, auto: null, telephelyek: [], hiba: error.message }));
    }, [id, uj, kulcs]);

    return (
        <main className="oldal admin">
            <header className="admin-fejlec">
                <div>
                    <Link className="vissza-link" to="/admin?lap=hirdetesek"><Ikon nev="balra" meret={15} /> Hirdetések</Link>
                    <h1>{uj ? 'Új hirdetés' : allapot.auto ? autoNev(allapot.auto) : 'Hirdetés szerkesztése'}</h1>
                </div>
            </header>
            {allapot.kulcs !== kulcs ? (
                <div className="betoltes"><span className="porgo" aria-hidden="true" />Betöltés…</div>
            ) : allapot.hiba ? (
                <p className="uzenet uzenet-hiba" role="alert">{allapot.hiba}</p>
            ) : (
                <Szerkeszto key={kulcs} auto={allapot.auto} telephelyek={allapot.telephelyek} />
            )}
        </main>
    );
};

export default AutoSzerkeszto;
