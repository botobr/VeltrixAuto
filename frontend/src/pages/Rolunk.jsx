import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ikon from '../components/Ikon';
import TelephelyInfo from '../components/TelephelyInfo';
import { apiKeres } from '../lib/api';
import { CEG } from '../lib/ceg';
import { useSeo } from '../lib/useSeo';
import './Tartalom.css';

const ERTEKEK = [
    ['pajzs', 'Átvizsgált autók', 'Minden autót forgalomba helyezés előtt műszakilag átnézünk, előéletét a rendelkezésre álló dokumentumok alapján ellenőrizzük.'],
    ['szem', 'Őszinte adatlapok', 'Az ismert hibákat, sérüléseket is feltüntetjük – külön „Sérülés” képkategóriával, hogy ne a helyszínen érjen meglepetés.'],
    ['kulcs', 'Kényelmes ügyintézés', 'Finanszírozás, beszámítás, átírás és biztosítás egy helyen, egy kapcsolattartóval.'],
    ['szerviz', 'Vásárlás után is', 'Garanciális ügyekben és szervizelésben a vásárlás után is számíthatsz ránk.'],
];

const Rolunk = () => {
    const [telephelyek, setTelephelyek] = useState(null);

    useSeo({
        cim: 'Rólunk – telephelyek, nyitvatartás, elérhetőség',
        leiras: `${CEG.nev}: bemutatkozás, telephelyek címe és nyitvatartása, telefonszám, e-mail.`,
        utvonal: '/rolunk',
        jsonLd: telephelyek?.length ? {
            '@context': 'https://schema.org',
            '@graph': telephelyek.map((t) => ({
                '@type': 'AutoDealer',
                name: `${CEG.nev} – ${t.nev}`,
                telephone: t.telefon || undefined,
                email: t.email || undefined,
                address: { '@type': 'PostalAddress', streetAddress: t.cim, addressLocality: t.varos, postalCode: t.iranyitoszam || undefined, addressRegion: t.megye, addressCountry: 'HU' },
                geo: t.szelesseg != null ? { '@type': 'GeoCoordinates', latitude: t.szelesseg, longitude: t.hosszusag } : undefined,
                openingHoursSpecification: t.nyitvatartas?.filter((n) => !n.zarva).map((n) => ({
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: { hetfo: 'Monday', kedd: 'Tuesday', szerda: 'Wednesday', csutortok: 'Thursday', pentek: 'Friday', szombat: 'Saturday', vasarnap: 'Sunday' }[n.nap],
                    opens: n.nyitas,
                    closes: n.zaras,
                })),
            })),
        } : undefined,
    });

    useEffect(() => {
        apiKeres('/telephelyek').then((data) => setTelephelyek(data.telephelyek)).catch(() => setTelephelyek([]));
    }, []);

    return (
        <main className="oldal tartalom">
            <header className="tartalom-hero beuszas">
                <p className="felirat">Rólunk</p>
                <h1>Autókereskedés, <span className="gradiens-szoveg">ahogy mi szeretnénk vásárolni.</span></h1>
                <p>
                    A {CEG.nev} csapata azzal a céllal indult, hogy a használtautó-vásárlás átlátható és nyugodt
                    döntés legyen. Kevesebb, de gondosan kiválasztott autót kínálunk – mindegyikről részletes
                    adatlappal, valós képekkel és őszinte leírással.
                </p>
            </header>

            <section className="tartalom-szekcio">
                <div className="ertek-racs">
                    {ERTEKEK.map(([ikon, cim, szoveg]) => (
                        <article className="uveg ertek" key={cim}>
                            <span className="ertek-ikon"><Ikon nev={ikon} meret={22} /></span>
                            <h2>{cim}</h2>
                            <p>{szoveg}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="tartalom-szekcio" id="telephelyek" aria-labelledby="telephelyek-cim">
                <div className="szekcio-fejlec">
                    <div>
                        <p className="felirat">Telephelyek</p>
                        <h2 id="telephelyek-cim">Látogass meg minket</h2>
                    </div>
                </div>
                {telephelyek === null ? (
                    <div className="betoltes"><span className="porgo" aria-hidden="true" /></div>
                ) : telephelyek.length === 0 ? (
                    <p className="halvany">A telephelyek adatai hamarosan elérhetők.</p>
                ) : (
                    <div className="telephely-lista">
                        {telephelyek.map((t) => (
                            <article className="uveg telephely-kartya" key={t._id}>
                                <TelephelyInfo telephely={t} />
                                <Link className="szoveg-gomb" to={`/autok?telephely=${t._id}`}>Az itt megtekinthető autók →</Link>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="tartalom-szekcio">
                <div className="uveg kapcsolat-doboz">
                    <div>
                        <h2>Kérdésed van?</h2>
                        <p>Hívj minket nyitvatartási időben, vagy írj e-mailt – egy munkanapon belül válaszolunk.</p>
                    </div>
                    <div className="kapcsolat-gombok">
                        <a className="gomb gomb-fo" href={`tel:${CEG.telefon.replace(/[^\d+]/g, '')}`}><Ikon nev="telefon" meret={16} /> {CEG.telefon}</a>
                        <a className="gomb gomb-uveg" href={`mailto:${CEG.email}`}><Ikon nev="level" meret={16} /> {CEG.email}</a>
                    </div>
                </div>
                <dl className="cegadatok">
                    <div><dt>Cégnév</dt><dd>{CEG.jogiNev}</dd></div>
                    <div><dt>Székhely</dt><dd>{CEG.szekhely}</dd></div>
                    <div><dt>Cégjegyzékszám</dt><dd>{CEG.cegjegyzekszam}</dd></div>
                    <div><dt>Adószám</dt><dd>{CEG.adoszam}</dd></div>
                </dl>
            </section>
        </main>
    );
};

export default Rolunk;
