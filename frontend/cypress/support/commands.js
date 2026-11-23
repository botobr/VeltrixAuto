// Saját Cypress parancsok a tesztekhez.
// A tesztadatok a backend/tests/e2e/szerver.js fájlban vannak (felhasználók, autók, alkatrészek).

// a tesztszerver címe
const api = (utvonal) => {
    return Cypress.expose('apiUrl') + utvonal;
};

// Az adatbázis visszaállítása a tesztadatokra. Az id-kat @adatok néven lehet elérni.
Cypress.Commands.add('visszaallitas', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    return cy.request('POST', api('/__e2e/visszaallitas')).its('body').as('adatok');
});

// a tesztfelhasználók e-mail címei
const TESZT_EMAILEK = {
    admin: 'admin@teszt.hu',
    ertekesito: 'ertekesito@teszt.hu',
    vasarlo: 'vasarlo@teszt.hu',
};

// Bejelentkezés a felület nélkül (gyorsabb). Szerepkör: admin, ertekesito vagy vasarlo.
Cypress.Commands.add('bejelentkezes', (szerep) => {
    return cy.request('POST', api('/api/auth/bejelentkezes'), { email: TESZT_EMAILEK[szerep], jelszo: 'Teszt1234' });
});

// Űrlap mező keresése a felirata alapján, pl. cy.mezo('Teljes név')
Cypress.Commands.add('mezo', (cimke) => {
    return cy.contains('label', cimke).then(($label) => {
        const id = $label.attr('for');
        if (id) {
            return cy.get('#' + CSS.escape(id));
        }
        // ha nincs for, akkor a label-en belül van a mező
        return cy.wrap($label).find('input, select, textarea').first();
    });
});

// a legutóbbi rendelés a tesztszerverről
Cypress.Commands.add('utolsoRendeles', () => {
    return cy.request(api('/__e2e/rendelesek/utolso')).its('body');
});

// a Stripe visszajelzés (sikeres fizetés vagy lejárat) szimulálása
Cypress.Commands.add('stripeVisszajelzes', (munkamenetId, tipus = 'sikeres') => {
    return cy.request('POST', api('/__e2e/fizetes/' + munkamenetId), { tipus: tipus });
});

// az e-mailek, amiket a tesztszerver "elküldött"
Cypress.Commands.add('levelek', () => {
    return cy.request(api('/__e2e/levelek')).its('body');
});

// Szöveg ellenőrzése úgy, hogy a szóközök fajtája ne számítson.
// A magyar számformázás (pl. "2 490 000 Ft") speciális szóközt használ, ezért kell.
// Példa: cy.get('.reszletek-ar').szoveg('2 490 000 Ft')
Cypress.Commands.add('szoveg', { prevSubject: 'element' }, (elem, ...vartak) => {
    return cy.wrap(elem, { log: false }).should(($el) => {
        const szoveg = $el.text().replace(/\s+/g, ' ');
        for (const vart of vartak) {
            expect(szoveg).to.include(vart);
        }
    });
});
