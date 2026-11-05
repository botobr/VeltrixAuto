import { Link } from 'react-router-dom';
import { useSeo } from '../lib/useSeo';

const NemTalalhato = ({ cim = 'Ez az oldal nem található', szoveg = 'Lehet, hogy elírtad a címet, vagy az oldal már nem létezik.' }) => {
    useSeo({ cim, noindex: true });
    return (
        <main className="oldal">
            <div className="allapot-doboz uveg nem-talalhato">
                <span className="nem-talalhato-kod gradiens-szoveg" aria-hidden="true">404</span>
                <h1>{cim}</h1>
                <p>{szoveg}</p>
                <div className="allapot-gombok">
                    <Link className="gomb gomb-fo" to="/autok">Kínálat böngészése</Link>
                    <Link className="gomb gomb-uveg" to="/">Főoldal</Link>
                </div>
            </div>
        </main>
    );
};

export default NemTalalhato;
