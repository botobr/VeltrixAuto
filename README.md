# Veltrix Autók

Használtautó-kereskedés weboldala tuning alkatrész webshoppal.

- **Autókínálat:** szűrés, autó adatlap, kedvencek, összehasonlítás, mentett keresések e-mail értesítéssel, érdeklődés küldése.
- **Webshop:** tuning alkatrészek „Melyik autódhoz?” szűréssel. Van kosár és pénztár, a fizetés lehet kártyás (Stripe), átutalásos, utánvétes vagy személyes. A rendelésekről automatikusan számla készül (Billingo).
- **Kereskedői felület:** dashboard (bevétel, készlet, statisztika), hirdetések, rendelések, alkatrészek, érdeklődések, telephelyek és felhasználók kezelése. Két munkatársi szerepkör van: admin és értékesítő.

## Tartalom

1. [Technológiák](#technológiák)
2. [Mappaszerkezet](#mappaszerkezet)
3. [Telepítés és indítás](#telepítés-és-indítás)
4. [Környezeti változók (.env)](#környezeti-változók-env)
5. [Hasznos parancsok](#hasznos-parancsok)
6. [Tesztek](#tesztek)
7. [Szerepkörök és jogosultságok](#szerepkörök-és-jogosultságok)
8. [Fizetés, számlázás, automatikus takarítás](#fizetés-számlázás-automatikus-takarítás)
9. [Élesítés](#élesítés)

## Technológiák

| Rész | Technológia |
| --- | --- |
| Backend | Node.js 22+ (fejlesztve 24-gyel), Express 5, Mongoose 9 (MongoDB), express-session + connect-mongo |
| Frontend | React 19, Vite 8, React Router 7 |
| Képek | Cloudinary |
| Fizetés | Stripe Checkout |
| Számlázás | Billingo API v3 |
| E-mail | Nodemailer (SMTP) |
| Biztonság | helmet (CSP, biztonsági fejlécek), saját kéréskorlátozó, bcrypt jelszó-titkosítás |
| Tesztek | Node.js `node:test` (unit és integrációs), mongodb-memory-server, Cypress (E2E) |

## Mappaszerkezet

```
Veltrix/
├── backend/
│   ├── app.js               az Express alkalmazás (útvonalak, biztonsági fejlécek, munkamenet)
│   ├── server.js            indítás: adatbázis, szerver, időzített takarítás
│   ├── models/              Mongoose modellek (Auto, Alkatresz, Rendeles, Felhasznalo, Telephely, Erdeklodes)
│   ├── routes/              API útvonalak (/api/...)
│   ├── middlewares/         bejelentkezés és jogosultság ellenőrzése
│   ├── utils/               üzleti logika (dashboard, webshop, fizetés, számlázás, e-mail, takarítás…)
│   ├── scripts/             admin létrehozása, minta-alkatrészek feltöltése
│   └── tests/               unit, integrációs tesztek és az E2E tesztszerver
└── frontend/
    ├── src/
    │   ├── pages/           oldalak (az admin oldalak a pages/admin mappában)
    │   ├── components/      közös komponensek
    │   ├── context/         bejelentkezés, kosár, összehasonlítás állapota
    │   └── lib/             segédfüggvények (API hívás, formázás, szűrők…)
    ├── cypress/             E2E tesztek
    └── public/_headers      biztonsági fejlécek éles tárhelyhez (Netlify / Cloudflare Pages)
```

## Telepítés és indítás

Ami kell hozzá: **Node.js 22 vagy újabb**, egy **MongoDB** adatbázis (például ingyenes MongoDB Atlas) és egy **Cloudinary** fiók a képekhez. A Stripe, a Billingo és az SMTP nem kötelező: ezek nélkül az adott funkció egyszerűen ki van kapcsolva.

```bash
# 1. Függőségek
cd backend && npm install
cd ../frontend && npm install

# 2. Beállítások: másold le a mintát, és töltsd ki (lásd lent)
cd ../backend
cp .env.example .env

# 3. Az első admin felhasználó létrehozása
npm run admin -- admin@pelda.hu "Teljes Név" jelszo12345

# 4. (nem kötelező) kb. 275 minta tuning alkatrész feltöltése képekkel
npm run alkatreszek

# 5. Indítás – két külön terminálban
cd backend && npm run dev       # http://localhost:3600/api
cd frontend && npm run dev      # http://localhost:5173
```

> **Figyelem:** ha a csapat egy közös adatbázist használ, a `npm run alkatreszek` és az admin létrehozása mindenkinél ugyanabba az adatbázisba ír. Érdemes saját, fejlesztői adatbázissal dolgozni.

## Környezeti változók (.env)

A backend a `backend/.env` fájlt olvassa (minta: `backend/.env.example`). A `.env` fájlt **nem szabad** feltölteni a gitre, mert titkos kulcsok vannak benne.

| Változó | Kötelező | Mire jó |
| --- | --- | --- |
| `PORT` | nem (3600) | a backend portja |
| `MONGO_DB` | **igen** | MongoDB kapcsolódási cím |
| `SESSION_SECRET` | **élesben igen** | a munkamenet-sütik aláírása (hosszú, véletlen szöveg) |
| `FRONTEND_URL` | igen | a frontend címe (CORS, linkek az e-mailekben, sitemap) |
| `NODE_ENV` | nem | `production` esetén a süti csak HTTPS-en megy |
| `TRUST_PROXY` | nem | reverse proxy (pl. nginx) mögött `1` |
| `CLOUDINARY_API_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **igen** | képfeltöltés |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | élesben igen | e-mail küldés. Ha nincs beállítva, a levelek csak a konzolra íródnak ki, **így regisztrálni sem lehet** (kell az e-mail megerősítés). |
| `ERTESITESI_EMAIL` | nem | ide mennek az új rendelések és érdeklődések (vesszővel több cím is lehet). Üresen: minden admin. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | nem | kártyás fizetés. Ha bármelyik üres, a kártyás fizetés nem választható. |
| `BANKSZAMLASZAM`, `BANKSZAMLA_KEDVEZMENYEZETT` | nem | az előre utalás adatai a visszaigazolásban |
| `BILLINGO_API_KEY`, `BILLINGO_BLOCK_ID` | nem | automatikus számlázás. Ha üres, a számlát kézzel kell kiállítani. |
| `TAKARITAS` | nem | `ki` esetén nem fut az automatikus rendelés-takarítás (lásd lent) |

A frontendnek egy változója van, a `VITE_API_URL` (alapból `http://localhost:3600/api`). Ezt a `frontend/.env` fájlban lehet megadni. Ugyanitt adható meg a `VITE_FACEBOOK_APP_ID` is, ami a Messenger megosztáshoz kell, és nem kötelező.

## Hasznos parancsok

| Hol | Parancs | Mit csinál |
| --- | --- | --- |
| backend | `npm run dev` | szerver indítása, változáskor újraindul (nodemon) |
| backend | `npm start` | szerver indítása (élesben) |
| backend | `npm run admin -- email "Név" jelszo` | admin létrehozása vagy meglévő felhasználó adminná tétele |
| backend | `npm run alkatreszek` | minta-alkatrészek feltöltése; `-- --szaraz` csak ellenőriz, `-- --torles` törli őket |
| backend | `npm test` | az összes backend teszt |
| frontend | `npm run dev` | fejlesztői szerver |
| frontend | `npm run build` | éles build a `dist` mappába |
| frontend | `npm run lint` | ESLint |
| frontend | `npm run e2e` | Cypress E2E tesztek (lásd lent) |

## Tesztek

A részletes leírás és az összes teszteset: [backend/tests/tesztelesi_dokumentacio.md](backend/tests/tesztelesi_dokumentacio.md).

| Fajta | Parancs | Mit tesztel |
| --- | --- | --- |
| Unit | `cd backend && npm run test:egyseg` | függvények önmagukban (validáció, dashboard számítások, számla adatai…) |
| Integrációs | `cd backend && npm run test:integracio` | a valódi API, valódi (memóriában futó) MongoDB-vel |
| Összes backend | `cd backend && npm test` | a fenti kettő együtt |
| E2E | `cd frontend && npm run e2e` | a teljes oldal böngészőben (Cypress) |
| E2E felülettel | `cd frontend && npm run e2e:open` | a Cypress ablaka, a tesztek egyenként futtathatók |

- **A tesztek nem nyúlnak az éles adatokhoz.** Az integrációs és az E2E tesztek is saját, memóriában futó adatbázist indítanak. A Cloudinary, a Stripe, a Billingo és az e-mail helyett kamu függvények futnak.
- **Szándékos hibák:** a `npm test` eredményében **2 szándékosan sikertelen** teszt van (`fail demo`). Ezek a tesztelési dokumentáció példái arra, hogy a teszt észreveszi az eltérést.
- **Első futtatás:** a MongoDB egyszer letöltődik (kb. 100 MB), ezért az első futtatás lassabb, és néha időtúllépéssel elbukik. Ilyenkor csak futtasd újra.
- **E2E portok:** az E2E tesztek a 3601-es (backend) és az 5174-es (frontend) portot használják, így a fejlesztői szerverek mellett is futtathatók.

## Szerepkörök és jogosultságok

A jogosultságok egy helyen vannak megadva: `backend/utils/jogosultsagok.js`. A backend minden védett útvonalon ellenőrzi őket, a frontend csak elrejti, amihez nincs jog.

| | Vásárló | Értékesítő | Admin |
| --- | :---: | :---: | :---: |
| Kedvencek, mentett keresések, rendelés | ✔ | ✔ | ✔ |
| Kereskedői felület, dashboard (bevétel nélkül) | | ✔ | ✔ |
| Hirdetések és alkatrészek szerkesztése, rendelések kezelése | | ✔ | ✔ |
| Törlés (hirdetés, alkatrész, érdeklődés) | | | ✔ |
| Pénzügyi adatok (bevétel, eladási ár) | | | ✔ |
| Telephelyek és felhasználók kezelése | | | ✔ |

## Fizetés, számlázás, automatikus takarítás

**Kártyás fizetés (Stripe)**

A vevő a Stripe saját oldalán fizet, a kártyaadatok nem jutnak el hozzánk. A sikeres vagy lejárt fizetésről a Stripe webhookot küld a `<backend>/api/fizetes/webhook` címre. Ezekre az eseményekre kell feliratkozni:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Helyi teszteléshez:

```bash
stripe listen --forward-to localhost:3600/api/fizetes/webhook
```

Az ez által kiírt `whsec_...` kulcs kerül a `STRIPE_WEBHOOK_SECRET`-be. Tesztkártya: `4242 4242 4242 4242`, bármilyen jövőbeli dátummal és CVC-vel.

**Visszatérítés**

Ha az admin vagy az értékesítő lemond egy kártyával már kifizetett rendelést, a rendszer a Stripe-on automatikusan visszatéríti a teljes összeget. Ha a visszatérítés nem sikerül, a rendelés nem lesz lemondva, és hibaüzenet jelenik meg. Átutalásos rendelésnél a pénzt kézzel kell visszautalni.

**Számlázás (Billingo)**

A kifizetett rendelésről automatikusan elektronikus számla készül, és a Billingo e-mailben elküldi a vevőnek. A NAV adatszolgáltatást is a Billingo intézi. Hogy mikor készül el a számla, az a fizetési módtól függ:

- **kártyás fizetés:** a sikeres fizetéskor;
- **átutalás:** amikor az admin rögzíti, hogy megjött a pénz;
- **utánvét és helyszíni fizetés:** amikor a rendelés „Teljesítve” állapotba kerül.

Lemondott rendelés számláját a rendszer sztornózza. Ha a számla nem készül el (például hibás adószám miatt), a hiba megjelenik a rendelésnél, és ott az „Újrapróbálom” gombbal újra lehet próbálni. Beállítás:

1. **API kulcs:** a Billingóban: Beállítások › API kulcsok › Új API kulcs (olvasás + írás). Ez kerül a `BILLINGO_API_KEY`-be.
2. **Számlatömb azonosító:** a `GET https://api.billingo.hu/v3/document-blocks` kérésre (`X-API-KEY` fejléccel) visszaadott számlatömb `id`-ja kerül a `BILLINGO_BLOCK_ID`-be.
3. **Próba:** élesítés előtt érdemes egy próbarendeléssel ellenőrizni.

**Automatikus takarítás**

A backend 10 percenként lemondja azokat a rendeléseket, amelyek miatt a készlet feleslegesen lenne lefoglalva:

- **Lejárt átutalás:** átutalásos rendelésnél, ha 8 napon belül nem érkezik meg a pénz. A vevő erről e-mailt kap.
- **Beragadt kártyás rendelés:** ha a Stripe „lejárt” visszajelzése elveszett. Ilyenkor a rendszer megkérdezi a Stripe-ot. Ha közben mégis kifizették, rögzíti a fizetést, és elkészíti a számlát.

Ha több fejlesztő ugyanazt az adatbázist használja, elég, ha csak egy gépen fut a takarítás. A többieknek `TAKARITAS=ki` kell a `.env`-be.

## Élesítés

- `NODE_ENV=production`, hosszú véletlen `SESSION_SECRET`, HTTPS.
- Reverse proxy mögött `TRUST_PROXY=1`, különben a kéréskorlátozó minden látogatót egy IP-nek lát.
- A frontend `npm run build` után a `frontend/dist` mappa tölthető fel. A `robots.txt`, a `sitemap.xml` és a `/megosztas/...` címeket a backendhez kell továbbítani.
- A biztonsági fejléceket Netlify-on és Cloudflare Pages-en a `frontend/public/_headers` adja. Más tárhelyen ugyanezeket a szerver beállításaiban kell megadni.
- A jogi oldalakon (`frontend/src/lib/ceg.js`, ÁSZF) **mintaadatok** vannak, ezeket élesítés előtt le kell cserélni a valódi cégadatokra.
