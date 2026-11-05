import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import { useAuth } from '../context/auth';
import { apiKeres } from '../lib/api';
import { formatSzam } from '../lib/auto';
import './Home.css';

const HERO_KEP = 'https://i.pinimg.com/1200x/09/e5/76/09e576c42453517d24a1cfb60145a16a.jpg';

const elonyok = [
    ['01', 'Gondosan válogatva', 'Csak olyan járművek kerülnek a kínálatba, amelyek megfelelnek a szigorú elvárásainknak.'],
    ['02', 'Átlátható adatok', 'Futás, teljesítmény, évjárat és eladó – minden fontos információ egy helyen, meglepetések nélkül.'],
    ['03', 'Személyes figyelem', 'Közvetlen kapcsolat az eladóval, hogy magabiztosan dönthess a következő autódról.'],
];

const Home = () => {
    const { user } = useAuth();
    const [friss, setFriss] = useState({ autok: [], osszes: null, betoltes: true });

    useEffect(() => {
        const controller = new AbortController();
        apiKeres('/autok?limit=3&rendezes=ujElol', { signal: controller.signal })
            .then((data) => setFriss({ autok: data.autok || [], osszes: data.lapozas?.osszes ?? 0, betoltes: false }))
            .catch((error) => {
                if (error.name !== 'AbortError') setFriss({ autok: [], osszes: null, betoltes: false });
            });
        return () => controller.abort();
    }, []);

    return (
        <main className="oldal home">
            <section className="home-hero">
                <div className="home-tartalom beuszas">
                    <p className="felirat">Prémium használtautó-kínálat</p>
                    <h1>
                        Találd meg a<br />
                        <span className="gradiens-szoveg">következő utad.</span>
                    </h1>
                    <p className="home-leiras">
                        Megbízható autók, átlátható adatok és személyes odafigyelés – hogy az autóválasztás
                        ne kompromisszum, hanem élmény legyen.
                    </p>
                    <div className="home-akciok">
                        <Link className="gomb gomb-fo" to="/autok">
                            Kínálat böngészése <span className="nyil" aria-hidden="true">↗</span>
                        </Link>
                        {user ? (
                            <Link className="gomb gomb-uveg" to="/feltolt">Autó feltöltése</Link>
                        ) : (
                            <Link className="gomb gomb-uveg" to="/login">Belépés</Link>
                        )}
                    </div>

                    <dl className="home-statok">
                        <div>
                            <dt>Elérhető autó</dt>
                            <dd>{friss.osszes == null ? '—' : formatSzam(friss.osszes)}</dd>
                        </div>
                        <div>
                            <dt>Kapcsolat</dt>
                            <dd>Közvetlen</dd>
                        </div>
                        <div>
                            <dt>Adatlap</dt>
                            <dd>Részletes</dd>
                        </div>
                    </dl>
                </div>

                <div className="home-vizual beuszas" style={{ animationDelay: '120ms' }}>
                    <div className="home-kep" role="img" aria-label="Sportautó a Veltrix kínálatából">
                        <img src={HERO_KEP} alt="" />
                    </div>
                    <div className="home-lebego home-lebego-felso uveg">
                        <span className="home-lebego-ikon" aria-hidden="true">✦</span>
                        <span><strong>Válogatott</strong><small>minden egyes autó</small></span>
                    </div>
                    <div className="home-lebego home-lebego-also uveg">
                        <small>VELTRIX</small>
                        <strong>Vezess a saját utadon.</strong>
                    </div>
                </div>
            </section>

            <section className="home-szekcio" aria-labelledby="friss-cim">
                <div className="szekcio-fejlec">
                    <div>
                        <p className="felirat">Friss érkezések</p>
                        <h2 id="friss-cim">Most került a kínálatba</h2>
                    </div>
                    <Link className="gomb gomb-uveg gomb-kicsi" to="/autok">
                        Összes autó <span className="nyil" aria-hidden="true">↗</span>
                    </Link>
                </div>

                {friss.betoltes ? (
                    <div className="autok-racs">{[0, 1, 2].map((i) => <AutoKartyaVaz key={i} />)}</div>
                ) : friss.autok.length > 0 ? (
                    <div className="autok-racs">
                        {friss.autok.map((auto, i) => <AutoKartya key={auto._id} auto={auto} kesleltetes={i} />)}
                    </div>
                ) : (
                    <p className="home-ures uveg">
                        {friss.osszes == null
                            ? 'A kínálat most nem érhető el – próbáld újra később.'
                            : 'Hamarosan érkeznek az első autók.'}
                    </p>
                )}
            </section>

            <section className="home-szekcio" aria-labelledby="elonyok-cim">
                <div className="szekcio-fejlec">
                    <div>
                        <p className="felirat">Miért a Veltrix?</p>
                        <h2 id="elonyok-cim">Autóvásárlás, újragondolva</h2>
                    </div>
                </div>
                <div className="home-elonyok">
                    {elonyok.map(([szam, cim, szoveg]) => (
                        <article className="home-elony uveg" key={szam}>
                            <span className="home-elony-szam gradiens-szoveg">{szam}</span>
                            <h3>{cim}</h3>
                            <p>{szoveg}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="home-cta">
                <div>
                    <h2>Készen állsz a következő autódra?</h2>
                    <p>Böngészd végig a teljes kínálatot, és vedd fel a kapcsolatot közvetlenül az eladóval.</p>
                </div>
                <Link className="gomb home-cta-gomb" to="/autok">
                    Irány a kínálat <span className="nyil" aria-hidden="true">↗</span>
                </Link>
            </section>
        </main>
    );
};

export default Home;
