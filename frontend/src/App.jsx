import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Lablec, { CookieSav, OsszehasonlitasSav } from './components/Lablec';
import Nav from './components/Nav';
import { AuthProvider } from './context/AuthContext';
import { OsszehasonlitasProvider } from './context/OsszehasonlitasProvider';
import { useAuth } from './context/auth';
import AutoReszletek from './pages/AutoReszletek';
import Autok from './pages/Autok';
import Home from './pages/Home';
import Login from './pages/Login';
import NemTalalhato from './pages/NemTalalhato';

// A ritkábban használt oldalak külön csomagban töltődnek be.
const Regisztracio = lazy(() => import('./pages/Regisztracio'));
const Fiok = lazy(() => import('./pages/Fiok'));
const Osszehasonlitas = lazy(() => import('./pages/Osszehasonlitas'));
const Rolunk = lazy(() => import('./pages/Rolunk'));
const Szolgaltatasok = lazy(() => import('./pages/Szolgaltatasok'));
const Jogi = lazy(() => import('./pages/Jogi'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const AutoSzerkeszto = lazy(() => import('./pages/admin/AutoSzerkeszto'));

const Betoltes = ({ szoveg = 'Betöltés…' }) => (
    <main className="betoltes" aria-live="polite">
        <span className="porgo" aria-hidden="true" />
        {szoveg}
    </main>
);

/** Bejelentkezéshez (és opcionálisan admin szerepkörhöz) kötött oldal. */
const VedettOldal = ({ children, csakAdmin = false }) => {
    const { user, admin, loading } = useAuth();
    const location = useLocation();
    if (loading) return <Betoltes szoveg="Munkamenet ellenőrzése…" />;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    if (csakAdmin && !admin) return <NemTalalhato cim="Ehhez az oldalhoz nincs jogosultságod" szoveg="Az oldal csak a kereskedés munkatársai számára érhető el." />;
    return children;
};

const GorgetesFelulre = () => {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname, hash]);
    return null;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <OsszehasonlitasProvider>
                    <GorgetesFelulre />
                    <div className="app-kontener">
                        <a className="ugras-tartalomra" href="#tartalom">Ugrás a tartalomra</a>
                        <Nav />
                        <div id="tartalom" className="app-tartalom">
                            <Suspense fallback={<Betoltes />}>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/autok" element={<Autok />} />
                                    <Route path="/autok/:slug" element={<AutoReszletek />} />
                                    <Route path="/osszehasonlitas" element={<Osszehasonlitas />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/regisztracio" element={<Regisztracio />} />
                                    <Route path="/rolunk" element={<Rolunk />} />
                                    <Route path="/szolgaltatasok" element={<Szolgaltatasok />} />
                                    <Route path="/aszf" element={<Jogi dokumentum="aszf" />} />
                                    <Route path="/adatkezeles" element={<Jogi dokumentum="adatkezeles" />} />
                                    <Route path="/cookie" element={<Jogi dokumentum="cookie" />} />
                                    <Route path="/fiok" element={<VedettOldal><Fiok /></VedettOldal>} />
                                    <Route path="/admin" element={<VedettOldal csakAdmin><Admin /></VedettOldal>} />
                                    <Route path="/admin/autok/uj" element={<VedettOldal csakAdmin><AutoSzerkeszto /></VedettOldal>} />
                                    <Route path="/admin/autok/:id" element={<VedettOldal csakAdmin><AutoSzerkeszto /></VedettOldal>} />
                                    <Route path="/feltolt" element={<Navigate to="/admin/autok/uj" replace />} />
                                    <Route path="*" element={<NemTalalhato />} />
                                </Routes>
                            </Suspense>
                        </div>
                        <Lablec />
                    </div>
                    <div className="also-savok">
                        <CookieSav />
                        <OsszehasonlitasSav />
                    </div>
                </OsszehasonlitasProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
