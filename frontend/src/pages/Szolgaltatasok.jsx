import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HitelKalkulator from '../components/HitelKalkulator';
import Ikon from '../components/Ikon';
import { CEG } from '../lib/ceg';
import { useSeo } from '../lib/useSeo';
import './Tartalom.css';

const LEPESEK = [
    ['Válassz online', 'Szűrj a kínálatban, mentsd el a kedvenceidet, és hasonlítsd össze őket egymás mellett.'],
    ['Érdeklődj', 'Küldj üzenetet az adatlapról vagy hívj minket – egyeztetünk egy megtekintési és próbaút-időpontot.'],
    ['Próbaút és átvizsgálás', 'A helyszínen kipróbálhatod az autót, és megnézheted a dokumentumait. Független átvizsgálást is szívesen támogatunk.'],
    ['Foglalás', 'Ha döntöttél, foglalóval lefoglaljuk neked az autót – az adatlapon ilyenkor „Foglalva” jelzés jelenik meg.'],
    ['Finanszírozás és beszámítás', 'Igény szerint intézzük a hitelkérelmet, és felértékeljük a beszámítandó autódat.'],
    ['Átadás', 'Adásvételi szerződés, átírás, biztosítás – az átadás napján mindent egy helyen intézünk.'],
];

const SZOLGALTATASOK = [
    {
        id: 'garancia',
        ikon: 'pajzs',
        cim: 'Garancia',
        szoveg: [
            'A garanciális autókat az adatlapon és a kártyákon külön jelöljük, a garancia időtartamával együtt. A kínálatban a „Csak garanciális autók” szűrővel is kereshetsz.',
            'A garancia pontos feltételeit (lefedett fődarabok, kizárások, önrész) az adásvételkor átadott garanciajegy tartalmazza. Kérdés esetén a vásárlás előtt is szívesen elküldjük.',
            'A jogszabály szerinti kellékszavatossági jogaidat a kereskedői garancia nem korlátozza.',
        ],
    },
    {
        id: 'finanszirozas',
        ikon: 'penz',
        cim: 'Finanszírozás',
        szoveg: [
            'Partnereinken keresztül hitelt és lízinget is közvetítünk, akár önerő nélkül is (a hitelbírálattól függően). A hitelkérelmet a helyszínen, a vásárlással egy időben intézzük.',
            'Az alábbi kalkulátorral és az adatlapokon megjelenő „Havi … Ft-tól” értékkel tájékoztató jelleggel számolhatsz. A pontos THM-et és törlesztőrészletet a finanszírozó határozza meg.',
        ],
    },
    {
        id: 'beszamitas',
        ikon: 'csere',
        cim: 'Beszámítás',
        szoveg: [
            'Jelenlegi autódat beszámítjuk a vásárlásba. Küldd el a típust, évjáratot, futásteljesítményt és néhány fotót – előzetes ajánlatot adunk, amelyet a helyszíni átvizsgálás után véglegesítünk.',
            'A beszámítás összegét a vételárból levonjuk, így kevesebb önerőre vagy hitelre lesz szükség.',
        ],
    },
    {
        id: 'szervizeles',
        ikon: 'szerviz',
        cim: 'Szervizelés',
        szoveg: [
            'Partnerszervizeinkben a vásárlás után is kedvezményesen végeztetheted el a karbantartásokat, a szezonális kerékcserét és a műszaki vizsgára való felkészítést.',
            'Az autó szervizelőéletét – ha rendelkezésre áll – az átadáskor dokumentálva adjuk át; a „Vezetett szervizkönyv” jelzés az adatlapon látható.',
        ],
    },
];

const Szolgaltatasok = () => {
    const { hash } = useLocation();

    useSeo({
        cim: 'Szolgáltatások – garancia, finanszírozás, beszámítás, szervizelés',
        leiras: 'Garancia, autóhitel és lízing, beszámítás, szervizelés és a vásárlás menete lépésről lépésre a Veltrix Autóknál.',
        utvonal: '/szolgaltatasok',
    });

    // Horgonyra érkezéskor (pl. /szolgaltatasok#finanszirozas) görgessünk a szakaszhoz.
    useEffect(() => {
        if (!hash) return;
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hash]);

    return (
        <main className="oldal tartalom">
            <header className="tartalom-hero beuszas">
                <p className="felirat">Szolgáltatások</p>
                <h1>Minden, ami az <span className="gradiens-szoveg">autóvásárláshoz kell.</span></h1>
                <p>Garancia, finanszírozás, beszámítás és szerviz egy helyen – hogy a döntés után már csak vezetni kelljen.</p>
                <nav className="tartalom-ugro" aria-label="Ugrás">
                    {SZOLGALTATASOK.map((sz) => <a key={sz.id} className="csip" href={`#${sz.id}`}>{sz.cim}</a>)}
                    <a className="csip" href="#vasarlas">Vásárlás menete</a>
                </nav>
            </header>

            <div className="szolgaltatas-lista">
                {SZOLGALTATASOK.map((sz) => (
                    <section className="uveg szolgaltatas" id={sz.id} key={sz.id} aria-labelledby={`${sz.id}-cim`}>
                        <span className="ertek-ikon"><Ikon nev={sz.ikon} meret={22} /></span>
                        <div>
                            <h2 id={`${sz.id}-cim`}>{sz.cim}</h2>
                            {sz.szoveg.map((bekezdes) => <p key={bekezdes}>{bekezdes}</p>)}
                            {sz.id === 'finanszirozas' && <div className="szolgaltatas-kalkulator"><HitelKalkulator szerkesztheto /></div>}
                            {sz.id === 'garancia' && <Link className="szoveg-gomb" to="/autok?garancias=1">Garanciális autók →</Link>}
                            {sz.id === 'beszamitas' && <a className="szoveg-gomb" href={`mailto:${CEG.email}?subject=${encodeURIComponent('Beszámítás – előzetes ajánlatkérés')}`}>Ajánlatkérés e-mailben →</a>}
                        </div>
                    </section>
                ))}
            </div>

            <section className="tartalom-szekcio" id="vasarlas" aria-labelledby="vasarlas-cim">
                <div className="szekcio-fejlec">
                    <div>
                        <p className="felirat">Vásárlás menete</p>
                        <h2 id="vasarlas-cim">Hat lépés a kulcsig</h2>
                    </div>
                </div>
                <ol className="lepesek">
                    {LEPESEK.map(([cim, szoveg], i) => (
                        <li className="uveg lepes" key={cim}>
                            <span className="lepes-szam gradiens-szoveg">{String(i + 1).padStart(2, '0')}</span>
                            <h3>{cim}</h3>
                            <p>{szoveg}</p>
                        </li>
                    ))}
                </ol>
            </section>
        </main>
    );
};

export default Szolgaltatasok;
