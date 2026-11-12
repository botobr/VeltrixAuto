import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useAuth } from '../../context/auth';
import { useSeo } from '../../lib/useSeo';
import AdminAlkatreszek from './AdminAlkatreszek';
import AdminDashboard from './AdminDashboard';
import AdminErdeklodesek from './AdminErdeklodesek';
import AdminFelhasznalok from './AdminFelhasznalok';
import AdminHirdetesek from './AdminHirdetesek';
import AdminRendelesek from './AdminRendelesek';
import AdminTelephelyek from './AdminTelephelyek';
import './Admin.css';

/** [kulcs, felirat, ikon, komponens, szükséges jog] – a fül csak a joggal rendelkezőknek látszik. */
const LAPOK = [
    ['attekintes', 'Dashboard', 'osszehasonlit', AdminDashboard, 'kezelofelulet'],
    ['hirdetesek', 'Hirdetések', 'auto', AdminHirdetesek, 'kezelofelulet'],
    ['rendelesek', 'Rendelések', 'kosar', AdminRendelesek, 'rendelesKezeles'],
    ['alkatreszek', 'Alkatrészek', 'csomag', AdminAlkatreszek, 'alkatreszSzerkesztes'],
    ['erdeklodesek', 'Érdeklődések', 'level', AdminErdeklodesek, 'erdeklodesKezeles'],
    ['telephelyek', 'Telephelyek', 'terkep', AdminTelephelyek, 'telephelyKezeles'],
    ['felhasznalok', 'Felhasználók', 'felhasznalo', AdminFelhasznalok, 'felhasznaloKezeles'],
];

const Admin = () => {
    const [params, setParams] = useSearchParams();
    const { jog, admin } = useAuth();
    const lapok = LAPOK.filter(([, , , , szuksegesJog]) => jog(szuksegesJog));
    const aktiv = lapok.find(([kulcs]) => kulcs === params.get('lap')) || lapok[0];
    const [kulcs, , , Tartalom] = aktiv;

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
                {lapok.map(([lapKulcs, cimke, ikon]) => (
                    <button
                        key={lapKulcs}
                        type="button"
                        role="tab"
                        aria-selected={kulcs === lapKulcs}
                        className={`ful ${kulcs === lapKulcs ? 'aktiv' : ''}`}
                        onClick={() => setParams(lapKulcs === 'attekintes' ? {} : { lap: lapKulcs })}
                    >
                        <Ikon nev={ikon} meret={16} /> {cimke}
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
