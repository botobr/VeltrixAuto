import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useFelhasznalo } from '../../context/felhasznalo';
import { useSeo } from '../../lib/useSeo';
import AdminAlkatreszek from './AdminAlkatreszek';
import AdminDashboard from './AdminDashboard';
import AdminErdeklodesek from './AdminErdeklodesek';
import AdminFelhasznalok from './AdminFelhasznalok';
import AdminHirdetesek from './AdminHirdetesek';
import AdminRendelesek from './AdminRendelesek';
import AdminTelephelyek from './AdminTelephelyek';
import './Admin.css';

// az admin felület fülei (egy fül csak akkor látszik, ha megvan hozzá a jog)
const LAPOK = [
    { kulcs: 'attekintes', felirat: 'Dashboard', ikon: 'osszehasonlit', komponens: AdminDashboard, jog: 'kezelofelulet' },
    { kulcs: 'hirdetesek', felirat: 'Hirdetések', ikon: 'auto', komponens: AdminHirdetesek, jog: 'kezelofelulet' },
    { kulcs: 'rendelesek', felirat: 'Rendelések', ikon: 'kosar', komponens: AdminRendelesek, jog: 'rendelesKezeles' },
    { kulcs: 'alkatreszek', felirat: 'Alkatrészek', ikon: 'csomag', komponens: AdminAlkatreszek, jog: 'alkatreszSzerkesztes' },
    { kulcs: 'erdeklodesek', felirat: 'Érdeklődések', ikon: 'level', komponens: AdminErdeklodesek, jog: 'erdeklodesKezeles' },
    { kulcs: 'telephelyek', felirat: 'Telephelyek', ikon: 'terkep', komponens: AdminTelephelyek, jog: 'telephelyKezeles' },
    { kulcs: 'felhasznalok', felirat: 'Felhasználók', ikon: 'felhasznalo', komponens: AdminFelhasznalok, jog: 'felhasznaloKezeles' },
];

// az admin felület (fülekkel)
const Admin = () => {
    const [params, setParams] = useSearchParams();
    const { jog, admin } = useFelhasznalo();

    // csak azok a fülek, amikhez van joga
    const lapok = LAPOK.filter((lap) => jog(lap.jog));

    // a megnyitott fül az URL-ből (?lap=...), ha nincs, az első
    let aktiv = lapok[0];
    for (const lap of lapok) {
        if (lap.kulcs === params.get('lap')) {
            aktiv = lap;
        }
    }
    const kulcs = aktiv.kulcs;
    const Tartalom = aktiv.komponens;

    const fulValtas = (lapKulcs) => {
        if (lapKulcs === 'attekintes') {
            setParams({});
        } else {
            setParams({ lap: lapKulcs });
        }
    };

    useSeo({ cim: 'Admin', noindex: true });

    return (
        <main className="oldal admin">
            <header className="admin-fejlec">
                <div>
                    <p className="felirat">Kereskedői felület</p>
                    <h1>{admin ? 'Admin' : 'Értékesítés'}</h1>
                </div>
                {jog('hirdetesSzerkesztes') && <Link className="gomb gomb-fo" to="/admin/autok/uj"><Ikon nev="plusz" meret={16} /> Új hirdetés</Link>}
            </header>

            <div className="fulek" role="tablist" aria-label="Admin menü">
                {lapok.map((lap) => (
                    <button
                        key={lap.kulcs}
                        type="button"
                        role="tab"
                        aria-selected={kulcs === lap.kulcs}
                        className={kulcs === lap.kulcs ? 'ful aktiv' : 'ful'}
                        onClick={() => fulValtas(lap.kulcs)}
                    >
                        <Ikon nev={lap.ikon} meret={16} /> {lap.felirat}
                    </button>
                ))}
            </div>

            <section className="admin-tartalom" role="tabpanel">
                <Tartalom />
            </section>
        </main>
    );
};

export default Admin;
