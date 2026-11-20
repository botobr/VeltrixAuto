import { Link } from 'react-router-dom';
import { CEG } from '../lib/ceg';
import { useSeo } from '../lib/useSeo';
import { DIJAK, ft } from '../lib/webshop';
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
        <h2>1. A szolgáltató (eladó)</h2>
        <Szolgaltato />

        <h2>2. A feltételek hatálya</h2>
        <p>
            Jelen Általános Szerződési Feltételek (ÁSZF) a {CEG.nev} weboldalának használatára vonatkoznak: a hirdetések
            böngészésére, a felhasználói fiókra, a kedvencek és mentett keresések funkcióra, az érdeklődési űrlapra, valamint
            a <Link to="/alkatreszek">tuning alkatrész webshopban</Link> leadott rendelésekre (6–11. pont).
        </p>
        <p>
            Gépjármű-adásvételi szerződés a weboldalon keresztül nem jön létre: az autók megvásárlása a telephelyen, külön
            írásbeli adásvételi szerződéssel történik. A webshopban az alkatrészek megvásárlása távollévők között kötött,
            elektronikus úton létrejövő szerződés, amelyre a 45/2014. (II. 26.) Korm. rendelet és a Polgári Törvénykönyv
            fogyasztókra vonatkozó szabályai is irányadók.
        </p>
        <p>
            Fogyasztó az önálló foglalkozása és gazdasági tevékenysége körén kívül eljáró természetes személy. A 9. pontban
            leírt elállási jog kizárólag a fogyasztót illeti meg.
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
            vásárolhatók meg; a foglalás feltételeit külön megállapodás rögzíti. Az autókra vonatkozó szavatossági és jótállási
            feltételeket az adásvételi szerződés tartalmazza.
        </p>
        <p>A hitelkalkulátor eredménye tájékoztató jellegű, nem minősül hitelajánlatnak; a hitel feltételeit a finanszírozó határozza meg.</p>

        <h2>4. Felhasználói fiók</h2>
        <p>
            A regisztráció ingyenes, és a webshopban vásárlás nem feltétele. A felhasználó köteles valós adatokat megadni, és
            jelszavát bizalmasan kezelni. A fiók bármikor törölhető a <Link to="/fiok?lap=profil">Fiókom › Profil</Link> oldalon;
            ilyenkor a kedvencek és a mentett keresések véglegesen törlődnek, a rendelések számviteli adatait azonban a
            jogszabályi megőrzési idő végéig meg kell őriznünk. A szolgáltató jogosult a fiókot felfüggeszteni vagy törölni,
            ha azt jogellenes célra vagy a weboldal működésének zavarására használják.
        </p>

        <h2>5. Érdeklődés, kapcsolatfelvétel</h2>
        <p>
            Az érdeklődési űrlap elküldése nem jelent vételi kötelezettséget. Az üzenetre munkaidőben, észszerű határidőn belül
            válaszolunk. Az űrlap visszaélésszerű (pl. automatizált, kéretlen reklámcélú) használatát technikai eszközökkel korlátozzuk.
        </p>

        <h2>6. Webshop: termékek, árak, a szerződés létrejötte</h2>
        <p>
            A webshopban új tuning alkatrészeket és kiegészítőket árusítunk. A termékoldalon feltüntetjük a termék nevét,
            gyártóját, cikkszámát, lényeges tulajdonságait, árát és készletállapotát. A termékképek illusztrációk, a termék
            megjelenése ettől eltérhet.
        </p>
        <p>
            Az árak forintban értendők és tartalmazzák az általános forgalmi adót; a szállítási és a kezelési díjat külön
            tüntetjük fel (7–8. pont). Akciós ár esetén az akció a termékoldalon jelzett ideig vagy a készlet erejéig tart.
            Ha a weboldalon nyilvánvalóan hibás ár jelenik meg (pl. 0 Ft vagy a szokásos ár töredéke), nem vagyunk kötelesek
            a terméket ezen az áron értékesíteni; ilyenkor felajánljuk a helyes áron történő vásárlást, vagy a vevő díjmentesen
            visszaléphet.
        </p>
        <p>A rendelés menete:</p>
        <ol>
            <li>a kiválasztott termékeket a kosárba helyezi, ahol a mennyiség módosítható és a tételek törölhetők;</li>
            <li>a pénztárban megadja elérhetőségét, kiválasztja a szállítási és fizetési módot, és megadja a szállítási és számlázási adatokat;</li>
            <li>
                a rendelés leadása előtt a pénztár összesítőjében ellenőrizheti a tételeket, a díjakat és a végösszeget, és bármely
                adatot javíthat (a kosárba visszalépve a termékeket is);
            </li>
            <li>a „Megrendelem – fizetési kötelezettséggel” gombbal a rendelést elküldi, ami fizetési kötelezettséggel jár.</li>
        </ol>
        <p>
            A rendelés beérkezését haladéktalanul, legkésőbb 48 órán belül e-mailben visszaigazoljuk. A szerződés a visszaigazoló
            e-mail megérkezésével jön létre. Ha a visszaigazolás 48 órán belül nem érkezik meg, a vevő mentesül az ajánlati
            kötöttség alól. A szerződés nyelve magyar; a szerződést elektronikusan rögzítjük, a rendelés adatai a visszaigazoló
            e-mailben szereplő linken, illetve bejelentkezve a <Link to="/fiok?lap=rendelesek">Fiókom › Rendeléseim</Link> oldalon
            megtekinthetők. Magatartási kódexnek nem vetettük alá magunkat.
        </p>
        <p>
            <strong>Kompatibilitás.</strong> A „Melyik autódhoz?” szűrő és a termékoldalon feltüntetett illeszkedési adatok a gyártói
            információkon alapuló tájékoztatást adnak. Vásárlás előtt kérjük, ellenőrizze az autó pontos típusát (szükség esetén
            alvázszám alapján) – kérésre segítünk ebben. Egyes termékek (pl. a „versenycélra” jelölt alkatrészek) közúti
            forgalomban csak hatósági engedéllyel vagy egyáltalán nem használhatók; erre a termékoldalon figyelmeztetünk.
            A termékek szakszerű beszerelését javasoljuk; beszerelést telephelyünkön külön megállapodás alapján vállalunk.
        </p>

        <h2>7. Fizetési módok</h2>
        <ul>
            <li>
                <strong>Online bankkártyás fizetés:</strong> a fizetés a Stripe biztonságos fizetőoldalán történik; a kártyaadatok
                hozzánk nem jutnak el. Ha a fizetés 30 percen belül nem történik meg, a rendelés automatikusan törlődik, és a
                lefoglalt termékek felszabadulnak.
            </li>
            <li>
                <strong>Előre utalás:</strong> az utalási adatokat a visszaigazolásban küldjük el; közleményként a rendelésszámot
                kérjük megadni. A terméket az összeg beérkezése után adjuk fel. Ha az összeg {DIJAK.utalasiHatarido} napon belül
                nem érkezik meg, a rendelést lemondhatjuk.
            </li>
            <li><strong>Utánvét:</strong> fizetés készpénzben vagy kártyával a futárnál; kezelési díja {ft(DIJAK.utanvet)}.</li>
            <li><strong>Fizetés átvételkor:</strong> személyes átvételnél a telephelyen, készpénzzel vagy bankkártyával.</li>
        </ul>
        <p>A vásárlásról elektronikus számlát állítunk ki.</p>

        <h2>8. Szállítás és átvétel</h2>
        <ul>
            <li>
                <strong>Házhozszállítás futárral</strong> Magyarország területén: díja {ft(DIJAK.futar)},{' '}
                {ft(DIJAK.ingyenesSzallitasHatar)} termékérték felett ingyenes. Készleten lévő terméknél a csomagot általában
                1–2 munkanapon belül átadjuk a futárszolgálatnak, a kézbesítés ezt követően 1–3 munkanap.
            </li>
            <li>
                <strong>Személyes átvétel</strong> a kiválasztott telephelyen, díjmentesen, a nyitvatartási időben – miután
                e-mailben értesítettük, hogy a rendelés átvehető. A rendelést az értesítéstől számított 8 munkanapig tartjuk fenn.
            </li>
        </ul>
        <p>
            A teljesítés legkésőbbi határideje a szerződés létrejöttétől számított 30 nap. Ha a termék – előre nem látható
            okból – mégsem szállítható, erről haladéktalanul értesítjük, és a kifizetett összeget legkésőbb 14 napon belül
            visszatérítjük. A kárveszély a termék vevő (vagy az általa kijelölt személy) részére történő átadásával száll át.
            Kérjük, a csomagot átvételkor ellenőrizze; sérült csomag esetén vegyen fel jegyzőkönyvet a futárral.
        </p>

        <h2>9. Elállási jog (14 nap)</h2>
        <p>
            A fogyasztó a szerződéstől <strong>14 napon belül indokolás nélkül elállhat</strong>. Az elállási határidő a termék
            – több termék külön szállítása esetén az utolsó termék – átvételének napjától számít. Az elállási jog a szerződés
            megkötése és a termék átvétele közötti időszakban is gyakorolható.
        </p>
        <p>
            <strong>Az elállás módja:</strong> egyértelmű nyilatkozat, amelyet e-mailben (<a href={`mailto:${CEG.email}`}>{CEG.email}</a>)
            vagy postai levélben ({CEG.szekhely}) küldhet el; ehhez használhatja az alábbi nyilatkozat-mintát is. A határidő
            betartásához elegendő, ha a nyilatkozatot a határidő lejárta előtt elküldi.
        </p>
        <p>
            <strong>A termék visszaküldése:</strong> a terméket az elállási nyilatkozat elküldésétől számított 14 napon belül
            kell visszaküldeni vagy a telephelyünkön átadni. A visszaküldés közvetlen költsége a fogyasztót terheli.
        </p>
        <p>
            <strong>Visszatérítés:</strong> az elállási nyilatkozat beérkezésétől számított legkésőbb 14 napon belül visszatérítjük
            a teljes kifizetett összeget, beleértve a szállítási díjat is (kivéve a legolcsóbb szokásos szállítási módnál drágább,
            kifejezetten választott szállítás többletköltségét). A visszatérítés az eredeti fizetési móddal történik, kivéve ha
            más módba kifejezetten beleegyezik; ezért többletdíj nem terheli. A visszatérítést visszatarthatjuk, amíg a termék
            vissza nem érkezik, vagy amíg igazolja, hogy visszaküldte – a kettő közül a korábbi időpontig.
        </p>
        <p>
            <strong>Értékcsökkenés:</strong> a fogyasztó a termék jellegének, tulajdonságainak és működésének megállapításához
            szükséges kezelésen túli használatból eredő értékcsökkenésért felel. Ilyen lehet például, ha az alkatrészt beszerelték
            és használták, vagy ha az eredeti csomagolás és tartozékok nélkül, sérülten érkezik vissza.
        </p>
        <p>Az elállási jog nem illeti meg a fogyasztót (45/2014. (II. 26.) Korm. rendelet 29. §):</p>
        <ul>
            <li>a fogyasztó utasítása alapján vagy kifejezett kérésére előállított, egyértelműen személyre szabott terméknél (pl. egyedi méretre gyártott alkatrész);</li>
            <li>olyan terméknél, amely jellegénél fogva átadását követően elválaszthatatlanul vegyül más termékkel (pl. a motorba töltött olaj, adalék);</li>
            <li>zárt csomagolású terméknél, amely egészségvédelmi vagy higiéniai okokból az átadást követő kibontás után nem küldhető vissza.</li>
        </ul>

        <h3>Elállási nyilatkozat-minta</h3>
        <div className="jogi-minta">
            <p>(Csak a szerződéstől való elállási szándék esetén töltse ki és juttassa vissza.)</p>
            <p>Címzett: {CEG.jogiNev}, {CEG.szekhely}, {CEG.email}</p>
            <p>
                Alulírott kijelentem, hogy gyakorlom elállási jogomat az alábbi termék(ek) adásvételére irányuló szerződés tekintetében:
                ……………………………………
            </p>
            <p>Rendelésszám: …………… · Szerződéskötés / átvétel időpontja: ……………</p>
            <p>A fogyasztó neve: …………………… · A fogyasztó címe: ……………………</p>
            <p>A visszatérítéshez bankszámlaszám (ha más módon kéri): ……………………</p>
            <p>A fogyasztó aláírása (kizárólag papíron tett nyilatkozat esetén): …………… · Kelt: ……………</p>
        </div>

        <h2>10. Szavatosság és jótállás</h2>
        <p>
            <strong>Kellékszavatosság.</strong> Hibás teljesítés esetén a vevő kellékszavatossági igényt érvényesíthet: elsősorban
            kijavítást vagy kicserélést kérhet, kivéve ha ez lehetetlen vagy aránytalan többletköltséggel járna. Ha a kijavítás
            vagy kicserélés nem lehetséges, vagy azt nem végezzük el, árleszállítást kérhet, vagy – nem jelentéktelen hiba esetén –
            elállhat a szerződéstől. Fogyasztó a termék átvételétől számított <strong>2 évig</strong> érvényesítheti
            kellékszavatossági igényét. Az átvételtől számított <strong>egy éven belül</strong> felismert hibáról vélelmezni kell,
            hogy az már az átadáskor megvolt, kivéve ha ez a termék vagy a hiba jellegével összeegyeztethetetlen; ezt követően a
            vevőnek kell bizonyítania, hogy a hiba már az átadáskor fennállt. A hibát felfedezése után késedelem nélkül kell
            közölni; a felfedezéstől számított két hónapon belül közölt hibát késedelem nélkül közöltnek kell tekinteni.
        </p>
        <p>
            <strong>Termékszavatosság.</strong> Fogyasztó a termék hibája esetén – választása szerint kellékszavatossági igény
            helyett – a gyártóval vagy forgalmazóval szemben is felléphet, és a termék kijavítását, ha ez nem lehetséges, kicserélését
            kérheti. Termékszavatossági igény a gyártó általi forgalomba hozataltól számított 2 évig érvényesíthető. A hibát
            a vevőnek kell bizonyítania.
        </p>
        <p>
            <strong>Jótállás.</strong> Ha a termékre jogszabály kötelező jótállást ír elő (151/2003. (IX. 22.) Korm. rendelet),
            vagy a gyártó, illetve mi önkéntes jótállást vállalunk, annak időtartamát és feltételeit a termékoldal, illetve
            a jótállási jegy tartalmazza. A jótállás nem érinti a szavatossági jogokat.
        </p>
        <p>
            Nem tartozik a szavatosság és a jótállás körébe a szakszerűtlen beszerelésből, rendeltetésellenes használatból
            (pl. versenyhasználat, a gyártói határértékeken túli terhelés), baleseti sérülésből vagy természetes kopásból eredő hiba.
        </p>
        <p>
            Szavatossági vagy jótállási igényét a fenti elérhetőségeinken jelezheti; a termék kijavítását vagy kicserélését
            legfeljebb 15 napon belül elvégezzük, és erről jegyzőkönyvet veszünk fel.
        </p>

        <h2>11. Felelősség</h2>
        <p>
            A szolgáltató nem felel a weboldal átmeneti elérhetetlenségéből, illetve a felhasználó eszközén fellépő hibákból
            eredő károkért. A weboldalon található külső hivatkozások (pl. térkép, közösségi oldalak) tartalmáért a szolgáltató nem felel.
        </p>

        <h2>12. Szellemi tulajdon</h2>
        <p>A weboldal arculata, szövegei és fényképei a szolgáltató szellemi tulajdonát képezik; engedély nélküli felhasználásuk tilos.</p>

        <h2>13. Panaszkezelés, jogvita</h2>
        <p>
            Panaszát a fenti elérhetőségeken teheti meg. A szóbeli panaszt azonnal megvizsgáljuk; ha erre nincs mód, jegyzőkönyvet
            veszünk fel. Az írásbeli panaszt 30 napon belül írásban, indokolással ellátva megválaszoljuk.
        </p>
        <p>
            Ha a panaszt elutasítjuk, a fogyasztó a lakóhelye vagy tartózkodási helye szerint illetékes <strong>békéltető
            testülethez</strong> fordulhat (elérhetőségük: bekeltetes.hu), panaszt tehet a lakóhelye szerinti
            <strong> kormányhivatal fogyasztóvédelmi hatóságánál</strong> (fogyasztovedelem.kormany.hu), illetve bírósághoz fordulhat.
            A békéltető testületi eljárásban együttműködési kötelezettségünk van. Jelen ÁSZF-re a magyar jog az irányadó.
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
                        <td>Webshop rendelés</td>
                        <td>név, e-mail-cím, telefonszám, szállítási és számlázási cím, cégnév és adószám (ha megadja), rendelt termékek, fizetési és szállítási mód, megjegyzés</td>
                        <td>a rendelés teljesítése, kapcsolattartás – szerződés teljesítése (GDPR 6. cikk (1) b))</td>
                        <td>a teljesítést követő 5 év (Ptk. elévülés)</td>
                    </tr>
                    <tr>
                        <td>Számlázás</td>
                        <td>számlázási név, cím, adószám, a vásárlás adatai</td>
                        <td>számviteli bizonylat megőrzése – jogi kötelezettség (GDPR 6. cikk (1) c), számviteli törvény 169. §)</td>
                        <td>8 év</td>
                    </tr>
                    <tr>
                        <td>Online fizetés</td>
                        <td>a fizetés azonosítója és eredménye (a kártyaadatokat kizárólag a Stripe kezeli)</td>
                        <td>a fizetés ellenőrzése – szerződés teljesítése (GDPR 6. cikk (1) b))</td>
                        <td>a rendelés adataival együtt</td>
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
            <li>e-mail-küldő szolgáltató (értesítések, érdeklődések és rendelés-visszaigazolások továbbítása);</li>
            <li>Stripe Payments Europe Ltd. (Írország) – online bankkártyás fizetés; a kártyaadatokat önálló adatkezelőként kezeli, azok hozzánk nem jutnak el;</li>
            <li>futárszolgálat (házhozszállításnál a címzett neve, címe és telefonszáma a kézbesítéshez);</li>
            <li>számlázó szolgáltató (a számla kiállításához szükséges adatok);</li>
            <li>Google Fonts (betűtípusok betöltése – ennek során az IP-cím a Google szervereihez jut);</li>
            <li>OpenStreetMap (csak ha a térkép betöltésére kattint).</li>
        </ul>
        <p>
            Érdeklődés esetén az adatokat kizárólag az érintett telephely munkatársai, rendelés esetén a rendelést feldolgozó
            munkatársak ismerik meg. Adatait harmadik félnek nem adjuk el.
        </p>

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
                    <tr><td><code>veltrix-kosar</code></td><td>helyi tároló</td><td>a webshop kosarának tartalma (termékazonosító és darabszám)</td><td>a rendelés leadásáig vagy törlésig</td></tr>
                    <tr><td><code>veltrix-cookie-tudomasul</code></td><td>helyi tároló</td><td>ez a tájékoztató sáv ne jelenjen meg újra</td><td>törlésig</td></tr>
                    <tr><td><code>veltrix-megtekintett</code></td><td>munkamenet-tároló</td><td>egy adatlap megtekintése munkamenetenként csak egyszer számít</td><td>a böngésző bezárásáig</td></tr>
                </tbody>
            </table>
        </div>
        <h2>Külső szolgáltatások</h2>
        <p>
            A betűtípusokat a Google Fonts szolgáltatásból töltjük be (sütit nem helyez el, de az IP-cím a Google-hoz jut).
            A telephelyek térképe csak külön kattintásra töltődik be az OpenStreetMap szervereiről. A Facebook- és
            Messenger-megosztás gomb csak rákattintáskor lép kapcsolatba a Facebookkal. Online kártyás fizetésnél a fizetés a
            Stripe saját oldalán történik, amely a saját sütijeit a Stripe tájékoztatója szerint használja.
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
