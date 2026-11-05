import { Link } from 'react-router-dom';
import { CEG } from '../lib/ceg';
import { useSeo } from '../lib/useSeo';
import './Tartalom.css';

/*
 * MINTA jogi szövegek. Élesítés előtt jogásszal / adatvédelmi szakemberrel
 * ellenőriztetni kell, és a cégadatokat a lib/ceg.js-ben a valósra cserélni.
 */

const Szolgaltato = () => (
    <dl className="cegadatok">
        <div><dt>Cégnév</dt><dd>{CEG.jogiNev}</dd></div>
        <div><dt>Székhely</dt><dd>{CEG.szekhely}</dd></div>
        <div><dt>Cégjegyzékszám</dt><dd>{CEG.cegjegyzekszam}</dd></div>
        <div><dt>Adószám</dt><dd>{CEG.adoszam}</dd></div>
        <div><dt>E-mail</dt><dd><a href={`mailto:${CEG.email}`}>{CEG.email}</a></dd></div>
        <div><dt>Telefon</dt><dd>{CEG.telefon}</dd></div>
        <div><dt>Tárhelyszolgáltató</dt><dd>{CEG.tarhelySzolgaltato}</dd></div>
    </dl>
);

const Aszf = () => (
    <>
        <h2>1. A szolgáltató</h2>
        <Szolgaltato />

        <h2>2. A feltételek hatálya</h2>
        <p>
            Jelen Általános Szerződési Feltételek (ÁSZF) a {CEG.nev} weboldalának használatára vonatkoznak: a hirdetések
            böngészésére, a felhasználói fiókra, a kedvencek és mentett keresések funkcióra, valamint az érdeklődési űrlapra.
            A weboldalon keresztül gépjármű-adásvételi szerződés nem jön létre; az autók megvásárlása a telephelyen,
            külön írásbeli adásvételi szerződéssel történik.
        </p>

        <h2>3. A hirdetések tartalma</h2>
        <p>
            A hirdetésekben szereplő adatokat (műszaki adatok, felszereltség, előélet, kilométeróra-állás) a rendelkezésünkre
            álló dokumentumok és a jármű vizsgálata alapján, a legnagyobb gondossággal adjuk meg. Az adatok tájékoztató
            jellegűek, nem minősülnek ajánlattételnek; az irányadó adatokat az adásvételi szerződés és a jármű okmányai tartalmazzák.
        </p>
        <p>
            Az árak forintban értendők, és – eltérő jelölés hiányában – tartalmazzák az általános forgalmi adót. Az átírás és
            a regisztráció költségei nem részei a vételárnak. A „Foglalva” jelzésű autók más érdeklődő számára átmenetileg nem
            vásárolhatók meg; a foglalás feltételeit külön megállapodás rögzíti.
        </p>
        <p>A hitelkalkulátor eredménye tájékoztató jellegű, nem minősül hitelajánlatnak; a hitel feltételeit a finanszírozó határozza meg.</p>

        <h2>4. Felhasználói fiók</h2>
        <p>
            A regisztráció ingyenes. A felhasználó köteles valós adatokat megadni, és jelszavát bizalmasan kezelni. A fiók
            bármikor törölhető a <Link to="/fiok?lap=profil">Fiókom › Profil</Link> oldalon; ilyenkor a kedvencek és a
            mentett keresések is véglegesen törlődnek. A szolgáltató jogosult a fiókot felfüggeszteni vagy törölni, ha azt
            jogellenes célra vagy a weboldal működésének zavarására használják.
        </p>

        <h2>5. Érdeklődés, kapcsolatfelvétel</h2>
        <p>
            Az érdeklődési űrlap elküldése nem jelent vételi kötelezettséget. Az üzenetre munkaidőben, észszerű határidőn belül
            válaszolunk. Az űrlap visszaélésszerű (pl. automatizált, kéretlen reklámcélú) használatát technikai eszközökkel korlátozzuk.
        </p>

        <h2>6. Felelősség</h2>
        <p>
            A szolgáltató nem felel a weboldal átmeneti elérhetetlenségéből, illetve a felhasználó eszközén fellépő hibákból
            eredő károkért. A weboldalon található külső hivatkozások (pl. térkép, közösségi oldalak) tartalmáért a szolgáltató nem felel.
        </p>

        <h2>7. Szellemi tulajdon</h2>
        <p>A weboldal arculata, szövegei és fényképei a szolgáltató szellemi tulajdonát képezik; engedély nélküli felhasználásuk tilos.</p>

        <h2>8. Panaszkezelés, jogvita</h2>
        <p>
            Panaszát a fenti elérhetőségeken teheti meg; azt 30 napon belül írásban megválaszoljuk. Fogyasztói jogvita esetén
            a lakóhelye szerint illetékes békéltető testülethez fordulhat. Jelen ÁSZF-re a magyar jog az irányadó.
        </p>
    </>
);

const Adatkezeles = () => (
    <>
        <h2>1. Az adatkezelő</h2>
        <Szolgaltato />
        <p>Adatvédelmi kérdésekben: <a href={`mailto:${CEG.adatvedelmiEmail}`}>{CEG.adatvedelmiEmail}</a></p>

        <h2>2. Kezelt adatok, célok és jogalapok</h2>
        <div className="jogi-tabla-tarto">
            <table className="jogi-tabla">
                <thead>
                    <tr><th scope="col">Adatkezelés</th><th scope="col">Kezelt adatok</th><th scope="col">Cél és jogalap</th><th scope="col">Időtartam</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Felhasználói fiók</td>
                        <td>név, e-mail-cím, jelszó (titkosított lenyomatként), kedvencek, mentett keresések</td>
                        <td>a fiókhoz kötött szolgáltatások nyújtása – szerződés teljesítése (GDPR 6. cikk (1) b))</td>
                        <td>a fiók törléséig</td>
                    </tr>
                    <tr>
                        <td>Érdeklődés</td>
                        <td>név, e-mail-cím, telefonszám (nem kötelező), üzenet, az érintett autó</td>
                        <td>kapcsolatfelvétel, szerződéskötést megelőző lépések – GDPR 6. cikk (1) b)</td>
                        <td>az ügy lezárásától számított 1 év</td>
                    </tr>
                    <tr>
                        <td>Értesítés új autókról</td>
                        <td>e-mail-cím, mentett keresési feltételek</td>
                        <td>a kért értesítések küldése – hozzájárulás (GDPR 6. cikk (1) a)), keresésenként bármikor kikapcsolható</td>
                        <td>a keresés törléséig vagy az értesítés kikapcsolásáig</td>
                    </tr>
                    <tr>
                        <td>Munkamenet</td>
                        <td>munkamenet-azonosító süti, a bejelentkezett felhasználó azonosítója</td>
                        <td>a bejelentkezés fenntartása – jogos érdek (GDPR 6. cikk (1) f))</td>
                        <td>legfeljebb 8 óra vagy kijelentkezésig</td>
                    </tr>
                    <tr>
                        <td>Visszaélések elleni védelem</td>
                        <td>IP-cím</td>
                        <td>túlterhelés, kéretlen üzenetek és jelszópróbálgatás kiszűrése – jogos érdek (GDPR 6. cikk (1) f))</td>
                        <td>a szerver memóriájában, legfeljebb 1 óra</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p>
            Az adatlapok megtekintéseinek és a telefonszám-megjelenítéseknek a számát személyhez nem köthető, összesített
            formában rögzítjük. Követő, profilalkotó vagy reklámcélú eszközt nem használunk.
        </p>

        <h2>3. Adatfeldolgozók és címzettek</h2>
        <ul>
            <li>tárhely- és adatbázis-szolgáltató (az adatok tárolása);</li>
            <li>Cloudinary Ltd. (a hirdetések fényképeinek tárolása – személyes adatot nem tartalmaz);</li>
            <li>e-mail-küldő szolgáltató (értesítések és érdeklődések továbbítása);</li>
            <li>Google Fonts (betűtípusok betöltése – ennek során az IP-cím a Google szervereihez jut);</li>
            <li>OpenStreetMap (csak ha a térkép betöltésére kattint).</li>
        </ul>
        <p>Érdeklődés esetén az adatokat kizárólag az érintett telephely munkatársai ismerik meg. Adatait harmadik félnek nem adjuk el.</p>

        <h2>4. Az Ön jogai</h2>
        <p>
            Kérheti a személyes adataihoz való hozzáférést, azok helyesbítését, törlését, kezelésének korlátozását, az adatok
            hordozhatóságát, és tiltakozhat a jogos érdeken alapuló adatkezelés ellen. Hozzájárulását bármikor visszavonhatja.
            Fiókját és minden hozzá tartozó adatot önállóan is törölheti a <Link to="/fiok?lap=profil">Fiókom › Profil</Link> oldalon.
            Kérelmére legkésőbb 30 napon belül válaszolunk.
        </p>
        <p>
            Panaszával a Nemzeti Adatvédelmi és Információszabadság Hatósághoz fordulhat (1055 Budapest, Falk Miksa utca 9–11.;
            www.naih.hu), illetve bírósághoz fordulhat.
        </p>

        <h2>5. Adatbiztonság</h2>
        <p>
            A jelszavakat kizárólag visszafejthetetlen lenyomat formájában tároljuk, a munkamenet-süti nem érhető el
            JavaScriptből, és a kapcsolat titkosított (HTTPS). A belépést és az űrlapokat túlterhelés elleni védelemmel látjuk el.
        </p>
    </>
);

const Cookie = () => (
    <>
        <p>
            Az oldal kizárólag a működéséhez szükséges sütit, illetve a böngésző helyi tárolóját használja. Analitikai, követő
            vagy reklámcélú sütit nem alkalmazunk, ezért ezekhez hozzájárulást sem kérünk.
        </p>
        <div className="jogi-tabla-tarto">
            <table className="jogi-tabla">
                <thead>
                    <tr><th scope="col">Név</th><th scope="col">Típus</th><th scope="col">Cél</th><th scope="col">Lejárat</th></tr>
                </thead>
                <tbody>
                    <tr><td><code>connect.sid</code></td><td>süti (HttpOnly)</td><td>bejelentkezett munkamenet fenntartása</td><td>8 óra / kijelentkezés</td></tr>
                    <tr><td><code>veltrix-osszehasonlitas</code></td><td>helyi tároló</td><td>az összehasonlításra kijelölt autók megjegyzése</td><td>törlésig</td></tr>
                    <tr><td><code>veltrix-cookie-tudomasul</code></td><td>helyi tároló</td><td>ez a tájékoztató sáv ne jelenjen meg újra</td><td>törlésig</td></tr>
                    <tr><td><code>veltrix-megtekintett</code></td><td>munkamenet-tároló</td><td>egy adatlap megtekintése munkamenetenként csak egyszer számít</td><td>a böngésző bezárásáig</td></tr>
                </tbody>
            </table>
        </div>
        <h2>Külső szolgáltatások</h2>
        <p>
            A betűtípusokat a Google Fonts szolgáltatásból töltjük be (sütit nem helyez el, de az IP-cím a Google-hoz jut).
            A telephelyek térképe csak külön kattintásra töltődik be az OpenStreetMap szervereiről. A Facebook- és
            Messenger-megosztás gomb csak rákattintáskor lép kapcsolatba a Facebookkal.
        </p>
        <h2>A sütik kezelése</h2>
        <p>
            A böngésző beállításaiban a sütik és a helyi tároló bármikor törölhetők vagy letilthatók. A munkamenet-süti
            letiltása esetén a bejelentkezés nem működik; a többi funkció ettől még használható.
        </p>
    </>
);

const DOKUMENTUMOK = {
    aszf: { cim: 'Általános Szerződési Feltételek', rovid: 'ÁSZF', Tartalom: Aszf },
    adatkezeles: { cim: 'Adatkezelési tájékoztató', rovid: 'Adatkezelés', Tartalom: Adatkezeles },
    cookie: { cim: 'Cookie-tájékoztató', rovid: 'Sütik', Tartalom: Cookie },
};

const Jogi = ({ dokumentum }) => {
    const { cim, Tartalom } = DOKUMENTUMOK[dokumentum];
    useSeo({ cim, utvonal: `/${dokumentum}` });

    return (
        <main className="oldal tartalom jogi">
            <header className="tartalom-hero">
                <p className="felirat">Jogi információk</p>
                <h1>{cim}</h1>
                <p>Hatályos: {CEG.jogiDatum}</p>
                <nav className="tartalom-ugro" aria-label="Jogi dokumentumok">
                    {Object.entries(DOKUMENTUMOK).map(([kulcs, doc]) => (
                        <Link key={kulcs} className={`csip ${kulcs === dokumentum ? 'aktiv' : ''}`} to={`/${kulcs}`}>{doc.rovid}</Link>
                    ))}
                </nav>
            </header>
            <article className="jogi-szoveg uveg">
                <Tartalom />
            </article>
        </main>
    );
};

export default Jogi;
