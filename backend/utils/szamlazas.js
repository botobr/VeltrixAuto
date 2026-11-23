// Számlázás a Billingo rendszerével (API v3).
// A Billingo a számlát automatikusan beküldi a NAV-nak (online számla), és e-mailben elküldi a vevőnek.
//
// A .env-ben kell:
//   BILLINGO_API_KEY  – Billingo: Beállítások / API kulcsok / Új API kulcs (olvasás + írás joggal)
//   BILLINGO_BLOCK_ID – a számlatömb azonosítója (lekérhető: GET https://api.billingo.hu/v3/document-blocks)
// Ha ezek nincsenek beállítva, a webshop számla nélkül működik (a számlát kézzel kell kiállítani).

const BILLINGO_URL = 'https://api.billingo.hu/v3';
const AFA = '27%';

// a mi fizetési módjaink Billingo nevei
const FIZETESI_MODOK = {
    kartya: 'online_bankcard',
    atutalas: 'wire_transfer',
    utanvet: 'cash_on_delivery',
    helyszinen: 'cash',
};

const beallitva = () => {
    if (process.env.BILLINGO_API_KEY && process.env.BILLINGO_BLOCK_ID) {
        return true;
    }
    return false;
};

// a mai nap budapesti idő szerint 'ÉÉÉÉ-HH-NN' formában
const maiNap = (most = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(most);
};

// kérés a Billingo API-nak, hiba esetén a Billingo hibaüzenetével dob hibát
const billingoKeres = async (metodus, utvonal, torzs) => {
    const beallitasok = {
        method: metodus,
        headers: {
            'X-API-KEY': process.env.BILLINGO_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
    };
    if (torzs !== undefined) {
        beallitasok.body = JSON.stringify(torzs);
    }

    const valasz = await fetch(BILLINGO_URL + utvonal, beallitasok);
    const szoveg = await valasz.text();
    let adat = null;
    if (szoveg) {
        try {
            adat = JSON.parse(szoveg);
        } catch {
            adat = null;
        }
    }

    if (!valasz.ok) {
        let uzenet = szoveg.slice(0, 300);
        if (adat && adat.error && adat.error.message) {
            uzenet = adat.error.message;
        } else if (adat && adat.message) {
            uzenet = adat.message;
        }
        throw new Error('Billingo hiba (' + valasz.status + '): ' + uzenet);
    }
    return adat;
};

// a vevő adatai a Billingonak (a számlázási címből)
const partnerAdatok = (rendeles) => {
    const cim = rendeles.szamlazasiCim;
    const partner = {
        name: cim.nev || rendeles.vevo.nev,
        address: {
            country_code: 'HU',
            post_code: cim.iranyitoszam,
            city: cim.varos,
            address: cim.cim,
        },
        emails: [rendeles.vevo.email],
        phone: rendeles.vevo.telefon,
        tax_type: 'NO_TAX_NUMBER',
    };
    // céges vásárlásnál az adószám is kell
    if (cim.adoszam) {
        partner.taxcode = cim.adoszam;
        partner.tax_type = 'HAS_TAX_NUMBER';
    }
    return partner;
};

// A számla adatai. Az árak bruttó árak 27% ÁFA-val (ahogy a webshopban is szerepelnek).
const szamlaAdatok = (rendeles, partnerId, blockId, most = new Date()) => {
    const tetelek = [];
    for (const tetel of rendeles.tetelek) {
        tetelek.push({
            name: tetel.nev + ' (' + tetel.cikkszam + ')',
            unit_price: tetel.egysegar,
            unit_price_type: 'gross',
            quantity: tetel.mennyiseg,
            unit: 'db',
            vat: AFA,
        });
    }
    if (rendeles.osszegek.szallitas > 0) {
        tetelek.push({ name: 'Szállítási díj', unit_price: rendeles.osszegek.szallitas, unit_price_type: 'gross', quantity: 1, unit: 'db', vat: AFA });
    }
    if (rendeles.osszegek.kezelesiDij > 0) {
        tetelek.push({ name: 'Kezelési díj (utánvét)', unit_price: rendeles.osszegek.kezelesiDij, unit_price_type: 'gross', quantity: 1, unit: 'db', vat: AFA });
    }

    const nap = maiNap(most);
    return {
        partner_id: partnerId,
        block_id: Number(blockId),
        type: 'invoice',
        fulfillment_date: nap,
        due_date: nap,
        payment_method: FIZETESI_MODOK[rendeles.fizetes.mod] || 'other',
        language: 'hu',
        currency: 'HUF',
        electronic: true,
        paid: rendeles.fizetes.statusz === 'fizetve',
        comment: 'Rendelésszám: ' + rendeles.rendelesSzam,
        items: tetelek,
    };
};

// Számla kiállítása és elküldése a vevőnek. Visszaadja: { id, szam }
const szamlaKiallitasa = async (rendeles) => {
    const partner = await billingoKeres('POST', '/partners', partnerAdatok(rendeles));
    const szamla = await billingoKeres('POST', '/documents', szamlaAdatok(rendeles, partner.id, process.env.BILLINGO_BLOCK_ID));

    // ha az e-mail küldés nem sikerül, a számla attól még kész van
    try {
        await billingoKeres('POST', '/documents/' + szamla.id + '/send', { emails: [rendeles.vevo.email] });
    } catch (error) {
        console.error('A számla e-mailben küldése sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
    }

    return { id: String(szamla.id), szam: szamla.invoice_number };
};

// Számla sztornózása (lemondott rendelésnél). A sztornó számlát a vevő is megkapja.
const szamlaSztornozasa = async (szamlaId, email) => {
    const sztorno = await billingoKeres('POST', '/documents/' + szamlaId + '/cancel', {
        cancellation_reason: 'A rendelés lemondva',
        cancellation_recipients: email,
    });
    return { szam: sztorno ? sztorno.invoice_number : null };
};

module.exports = { beallitva, szamlaKiallitasa, szamlaSztornozasa, szamlaAdatok, partnerAdatok, FIZETESI_MODOK };
