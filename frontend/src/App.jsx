import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Nav from './components/Nav';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth';
import Autok from './pages/Autok';
import Feltolt from './pages/Feltolt';
import Home from './pages/Home';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return (
            <main className="betoltes" aria-live="polite">
                <span className="porgo" aria-hidden="true" />
                Munkamenet ellenőrzése…
            </main>
        );
    }
    return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

const GorgetesFelulre = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);
    return null;
};

const Lablec = () => (
    <footer className="lablec">
        <div className="lablec-belso">
            <strong>VELTRIX</strong>
            <span>© {new Date().getFullYear()} Veltrix Autók · Válogatott használt autók</span>
        </div>
    </footer>
);

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <GorgetesFelulre />
                <div className="app-kontener">
                    <Nav />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/autok" element={<Autok />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/feltolt" element={<ProtectedRoute><Feltolt /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <Lablec />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
