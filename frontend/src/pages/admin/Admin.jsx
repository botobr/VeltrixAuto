import { Link, useSearchParams } from 'react-router-dom';
import Ikon from '../../components/Ikon';
import { useSeo } from '../../lib/useSeo';
import AdminDashboard from './AdminDashboard';
import AdminErdeklodesek from './AdminErdeklodesek';
import AdminFelhasznalok from './AdminFelhasznalok';
import AdminHirdetesek from './AdminHirdetesek';
import AdminTelephelyek from './AdminTelephelyek';
import './Admin.css';

const LAPOK = [
    ['attekintes', 'Dashboard', 'osszehasonlit', AdminDashboard],
    ['hirdetesek', 'Hirdetések', 'auto', AdminHirdetesek],
    ['erdeklodesek', 'Érdeklődések', 'level', AdminErdeklodesek],
    ['telephelyek', 'Telephelyek', 'terkep', AdminTelephelyek],
    ['felhasznalok', 'Felhasználók', 'felhasznalo', AdminFelhasznalok],
];

const Admin = () => {
    const [params, setParams] = useSearchParams();
    const aktiv = LAPOK.find(([kulcs]) => kulcs === params.get('lap')) || LAPOK[0];
    const [kulcs, , , Tartalom] = aktiv;

    useSeo({ cim: 'Admin', noindex: true });

    return (
        <main className="oldal admin">
            <header className="admin-fejlec">
                <div>
                    <p className="felirat">Kereskedői felület</p>
                    <h1>Admin</h1>
                </div>
                <Link className="gomb gomb-fo" to="/admin/autok/uj"><Ikon nev="plusz" meret={16} /> Új hirdetés</Link>
            </header>

            <div className="fulek" role="tablist" aria-label="Admin menü">
                {LAPOK.map(([lapKulcs, cimke, ikon]) => (
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
