import './Home.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth';

const Home = () => {
    const { user } = useAuth();

    return (
        <main className="home-kontener">
            <section className="home-hero">
                <div className="home-tartalom">
                    <p className="felirat">GONDOSAN VÁLOGATOTT HASZNÁLT AUTÓK</p>
                    <h1>Találd meg a<br /><span>következő utad.</span></h1>
                    <p className="home-leiras">
                        Megbízható autók, átlátható adatok és személyes odafigyelés –
                        hogy az autóválasztás élmény legyen.
                    </p>
                    <div className="home-akciok">
                        {user ? (
                            <Link className="gomb gomb-arany" to="/feltolt">Autó feltöltése <span aria-hidden="true">↗</span></Link>
                        ) : (
                            <Link className="gomb gomb-arany" to="/login">Belépés a fiókba <span aria-hidden="true">↗</span></Link>
                        )}
                        <a className="gomb gomb-atlatszo" href="#elonyok">Fedezd fel</a>
                    </div>
                    <div className="home-bizalom">
                        <span className="bizalom-jel" aria-hidden="true">✦</span>
                        <p><strong>Minőség, amire számíthatsz</strong><br />Minden részlet számít.</p>
                    </div>
                </div>
                <div className="home-kep" role="img" aria-label="1995-ös Honda NSX Type T sportautó">
                    <div className="home-kep-keret" />
                    <div className="home-kep-cimke"><span>VELTRIX</span><small>VEZESS A SAJÁT UTADON</small></div>
                </div>
                <span className="home-sorszam" aria-hidden="true">01 / 03</span>
            </section>
            <section className="home-elonyok" id="elonyok">
                <div><span>01</span><h2>Gondosan válogatva</h2><p>Csak olyan járművek, amelyek megfelelnek az elvárásainknak.</p></div>
                <div><span>02</span><h2>Átlátható adatok</h2><p>Minden fontos információ egy helyen, rejtett meglepetések nélkül.</p></div>
                <div><span>03</span><h2>Személyes figyelem</h2><p>Segítünk, hogy magabiztosan dönthess a következő autódról.</p></div>
            </section>
        </main>
    );
};

export default Home;