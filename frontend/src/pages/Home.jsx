import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AutoKartya, { AutoKartyaVaz } from '../components/AutoKartya';
import Ikon from '../components/Ikon';
import { apiKeres } from '../lib/api';
import { formatSzam } from '../lib/auto';
import { CEG } from '../lib/ceg';
import { useSeo } from '../lib/useSeo';
import './Home.css';

const HERO_KEP = 'https://i.pinimg.com/1200x/09/e5/76/09e576c42453517d24a1cfb60145a16a.jpg';

const ARHATAROK = [3000000, 5000000, 8000000, 12000000, 20000000, 40000000];

const SZOLGALTATASOK = [
    ['pajzs', 'Garancia', 'Garanciális autók külön jelölve, átlátható feltételekkel.', '/szolgaltatasok#garancia'],
    ['penz', 'Finanszírozás', 'Hitel és lízing a helyszínen, kalkulátorral előre számolhatsz.', '/szolgaltatasok#finanszirozas'],
    ['csere', 'Beszámítás', 'Jelenlegi autódat beszámítjuk az újba – kérj előzetes ajánlatot.', '/szolgaltatasok#beszamitas'],
    ['szerviz', 'Szervizelés', 'Partnerszervizeinkben a vásárlás után is számíthatsz ránk.', '/szolgaltatasok#szervizeles'],
];

const GyorsKereso = ({ markak }) => {
    const navigate = useNavigate();
    const [marka, setMarka] = useState('');
    const [maxAr, setMaxAr] = useState('');

    return (
        <form
            className="gyorskereso uveg"
            onSubmit={(event) => {
                event.preventDefault();
                const p = new URLSearchParams();
                if (marka) p.set('marka', marka);
                if (maxAr) p.set('maxAr', maxAr);
                navigate(`/autok${p.size ? `?${p}` : ''}`);
            }}
        >
            <label>
                <span>Márka</span>
                <select value={marka} onChange={(event) => setMarka(event.target.value)}>
                    <option value="">Bármelyik</option>
                    {markak.map((m) => <option key={m.marka} value={m.marka}>{m.marka}</option>)}
                </select>
            </label>
            <label>
                <span>Maximum ár</span>
                <select value={maxAr} onChange={(event) => setMaxAr(event.target.value)}>
                    <option value="">Bármennyi</option>
                    {ARHATAROK.map((ar) => <option key={ar} value={ar}>{formatSzam(ar)} Ft</option>)}
                </select>
            </label>
            <button className="gomb gomb-fo" type="submit"><Ikon nev="kereses" meret={17} /> Keresés</button>
        </form>
    );
};

const Home = () => {
    const [adatok, setAdatok] = useState({ autok: [], osszes: null, kiemelt: false, betoltes: true });
    const [markak, setMarkak] = useState([]);

    useSeo({
        leiras: `${CEG.nev}: válogatott használt autók részletes adatlappal, garanciával, finanszírozással és beszámítással.`,
        utvonal: '/',
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: CEG.nev,
            url: window.location.origin,
            potentialAction: {
                '@type': 'SearchAction',
                target: `${window.location.origin}/autok?q={kereses}`,
                'query-input': 'required name=kereses',
            },
        },
    });

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        Promise.all([
            apiKeres('/autok?limit=3&kiemelt=1', { signal }),
            apiKeres('/autok?limit=3&rendezes=ujElol', { signal }),
        ])
            .then(([kiemelt, friss]) => {
                const vanKiemelt = kiemelt.autok.length > 0;
                setAdatok({ autok: vanKiemelt ? kiemelt.autok : friss.autok, osszes: friss.lapozas.osszes, kiemelt: vanKiemelt, betoltes: false });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setAdatok({ autok: [], osszes: null, kiemelt: false, betoltes: false });
            });
        apiKeres('/autok/szurok', { signal }).then((data) => setMarkak(data.markak || [])).catch(() => {});
        return () => controller.abort();
    }, []);

    return (
        <main className="oldal home">
            <section className="home-hero">
                <div className="home-tartalom beuszas">
                    <p className="felirat">Prémium használtautó-kínálat</p>
                    <h1>
                        <span className="nincs-tores">Találd meg a</span><br />
                        <span className="gradiens-szoveg">következő utad.</span>
                    </h1>
                    <p className="home-leiras">
                        Megbízható autók, átlátható adatok és személyes odafigyelés – hogy az autóválasztás
                        ne kompromisszum, hanem élmény legyen.
                    </p>
                    <GyorsKereso markak={markak} />

                    <dl className="home-statok">
                        <div>
                            <dt>Elérhető autó</dt>
                            <dd>{adatok.osszes == null ? '—' : formatSzam(adatok.osszes)}</dd>
                        </div>
                        <div>
                            <dt>Márka</dt>
                            <dd>{markak.length || '—'}</dd>
                        </div>
                        <div>
                            <dt>Kapcsolat</dt>
                            <dd>Közvetlen</dd>
                        </div>
                    </dl>
                </div>

                <div className="home-vizual beuszas" style={{ animationDelay: '120ms' }}>
                    <div className="home-kep" role="img" aria-label="Sportautó a Veltrix kínálatából">
                        <img src={HERO_KEP} alt="" />
                    </div>
                    <div className="home-lebego home-lebego-felso uveg">
                        <span className="home-lebego-ikon" aria-hidden="true"><Ikon nev="pajzs" meret={18} /></span>
                        <span><strong>Átvizsgált autók</strong><small>részletes adatlappal</small></span>
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
                        <p className="felirat">{adatok.kiemelt ? 'Kiemelt ajánlatok' : 'Friss érkezések'}</p>
                        <h2 id="friss-cim">{adatok.kiemelt ? 'A hét legjobb ajánlatai' : 'Most került a kínálatba'}</h2>
                    </div>
                    <Link className="gomb gomb-uveg gomb-kicsi" to="/autok">
                        Összes autó <span className="nyil" aria-hidden="true">↗</span>
                    </Link>
                </div>

                {adatok.betoltes ? (
                    <div className="autok-racs">{[0, 1, 2].map((i) => <AutoKartyaVaz key={i} />)}</div>
                ) : adatok.autok.length > 0 ? (
                    <div className="autok-racs">
                        {adatok.autok.map((auto, i) => <AutoKartya key={auto._id} auto={auto} kesleltetes={i} />)}
                    </div>
                ) : (
                    <p className="home-ures uveg">
                        {adatok.osszes == null
                            ? 'A kínálat most nem érhető el – próbáld újra később.'
                            : 'Hamarosan érkeznek az első autók.'}
                    </p>
                )}
            </section>

            <section className="home-szekcio" aria-labelledby="szolg-cim">
                <div className="szekcio-fejlec">
                    <div>
                        <p className="felirat">Szolgáltatások</p>
                        <h2 id="szolg-cim">Több, mint egy hirdetés</h2>
                    </div>
                    <Link className="gomb gomb-uveg gomb-kicsi" to="/szolgaltatasok#vasarlas">Vásárlás menete <span className="nyil" aria-hidden="true">↗</span></Link>
                </div>
                <div className="home-elonyok">
                    {SZOLGALTATASOK.map(([ikon, cim, szoveg, link]) => (
                        <Link className="home-elony uveg" key={cim} to={link}>
                            <span className="ertek-ikon home-elony-ikon"><Ikon nev={ikon} meret={20} /></span>
                            <h3>{cim}</h3>
                            <p>{szoveg}</p>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="home-cta">
                <div>
                    <h2>Nem találod, amit keresel?</h2>
                    <p>Regisztrálj, mentsd el a keresésedet, és e-mailben szólunk, amint megfelelő autó érkezik.</p>
                </div>
                <Link className="gomb home-cta-gomb" to="/regisztracio">
                    Értesítést kérek <span className="nyil" aria-hidden="true">↗</span>
                </Link>
            </section>
        </main>
    );
};

export default Home;
