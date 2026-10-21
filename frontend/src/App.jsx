import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Nav from './components/Nav';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth';
import Feltolt from './pages/Feltolt';
import Home from './pages/Home';
import Login from './pages/Login';
import Autok from './pages/Autok';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return <main className="betoltes" aria-live="polite">Munkamenet ellenőrzése…</main>;
    }
    return user ? children : <Navigate to="/login" replace state={{ from: '/feltolt' }} />;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <div className="app-kontener">
                <Nav />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/autok" element={<Autok />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/feltolt" element={<ProtectedRoute><Feltolt /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;