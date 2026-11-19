/*
 * Saját Cypress-parancsok a Veltrix E2E-tesztekhez.
 * A tesztadatok a backend/tests/e2e/szerver.js fájlban vannak (felhasználók, autók, alkatrészek).
 */

const api = (utvonal) => `${Cypress.expose('apiUrl')}${utvonal}`;

/** Adatbázis visszaállítása a mintaadatokra; az azonosítókat `@adatok` aliasként adja vissza. */
Cypress.Commands.add('visszaallitas', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    return cy.request('POST', api('/__e2e/visszaallitas')).its('body').as('adatok');
});

/** Bejelentkezés felület nélkül (API-n keresztül) – a gyors előkészítéshez. Szerepkör: admin | ertekesito | vasarlo. */
Cypress.Commands.add('bejelentkezes', (szerep) => {
    const email = { admin: 'admin@teszt.hu', ertekesito: 'ertekesito@teszt.hu', vasarlo: 'vasarlo@teszt.hu' }[szerep];
    return cy.request('POST', api('/api/auth/login'), { email, jelszo: 'Teszt1234' });
});

/** Űrlapmező a címkéje alapján (pl. cy.mezo('Teljes név')). */
Cypress.Commands.add('mezo', (cimke) => cy.contains('label', cimke).then(($label) => {
    const id = $label.attr('for');
    return id ? cy.get(`#${CSS.escape(id)}`) : cy.wrap($label).find('input, select, textarea').first();
}));

/** Az utolsó rendelés a tesztszerverről (rendelésszám, státusz, fizetési munkamenet). */
Cypress.Commands.add('utolsoRendeles', () => cy.request(api('/__e2e/rendelesek/utolso')).its('body'));

/** A Stripe aláírt visszajelzésének szimulálása (sikeres fizetés vagy lejárat). */
Cypress.Commands.add('stripeVisszajelzes', (munkamenetId, tipus = 'sikeres') => cy.request('POST', api(`/__e2e/fizetes/${munkamenetId}`), { tipus }));

/** A tesztszerver által „elküldött” e-mailek. */
Cypress.Commands.add('levelek', () => cy.request(api('/__e2e/levelek')).its('body'));

/**
 * Szöveg-ellenőrzés szóköz-függetlenül: a magyar számformázás (pl. „2 490 000 Ft”) nem törő
 * keskeny szóközt használ, ezt sima szóközzel is megtalálja. Többet is ellenőrizhet egyszerre.
 *   cy.get('.reszletek-ar').szoveg('2 490 000 Ft')
 */
Cypress.Commands.add('szoveg', { prevSubject: 'element' }, (elem, ...vartak) => cy.wrap(elem, { log: false }).should(($el) => {
    const szoveg = $el.text().replace(/\s+/g, ' ');
    for (const vart of vartak) expect(szoveg).to.include(vart);
}));
