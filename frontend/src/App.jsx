import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Nav from './components/Nav';
import Home from './pages/Home';

function App() {
    return (
        <div className="app-kontener">
            <BrowserRouter>
                <Nav />
                <Routes>
                    <Route
                        path="/"
                        element={<Home />}
                    />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;