// Bejelentkezés, regisztráció, kijelentkezés, védett oldalak.
// Tesztfelhasználók (backend/tests/e2e/szerver.js): admin@ / ertekesito@ / vasarlo@teszt.hu, jelszó: Teszt1234

describe('Bejelentkezés', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('a menü „Belépés” gombjával bejelentkezik a vásárló, és visszakerül oda, ahonnan jött', () => {
        cy.visit('/');
        cy.get('#login-button').click();
        cy.location('pathname').should('eq', '/login');

        cy.get('#email').type('vasarlo@teszt.hu');
        cy.get('#jelszo').type('Teszt1234');
        cy.contains('button[type=submit]', 'Belépés').click();

        cy.location('pathname').should('eq', '/');
        cy.get('.nav-felhasznalo').should('contain', 'Vásárló Vilma');
        cy.get('#login-button').should('not.exist');

        cy.get('.nav-felhasznalo').click();
        cy.contains('h1', 'Vilma').should('be.visible');
    });

    it('hibás jelszónál hibaüzenet, és nem jelentkezik be', () => {
        cy.visit('/login');
        cy.get('#email').type('vasarlo@teszt.hu');
        cy.get('#jelszo').type('rossz-jelszo');
        cy.contains('button[type=submit]', 'Belépés').click();

        cy.get('[role=alert]').should('contain', 'Hibás email vagy jelszó');
        cy.location('pathname').should('eq', '/login');
    });

    it('az admin bejelentkezés után az admin felületre kerül', () => {
        cy.visit('/login');
        cy.get('#email').type('admin@teszt.hu');
        cy.get('#jelszo').type('Teszt1234{enter}');
        cy.location('pathname').should('eq', '/admin');
        cy.contains('h1', 'Admin').should('be.visible');
    });

    it('kijelentkezés után újra a „Belépés” gomb látszik', () => {
        cy.bejelentkezes('vasarlo');
        cy.visit('/fiok');
        cy.contains('button', 'Kilépés').click();
        cy.location('pathname').should('eq', '/');
        cy.get('#login-button').should('be.visible');
    });

    it('védett oldal bejelentkezés nélkül a belépéshez irányít, utána vissza', () => {
        cy.visit('/fiok?lap=rendelesek');
        cy.location('pathname').should('eq', '/login');
        cy.get('#email').type('vasarlo@teszt.hu');
        cy.get('#jelszo').type('Teszt1234{enter}');
        cy.location('pathname').should('eq', '/fiok');
        cy.location('search').should('eq', '?lap=rendelesek');
    });
});

describe('Regisztráció', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('új vásárlói fiók létrehozása', () => {
        cy.visit('/regisztracio');
        cy.get('#reg-nev').type('Teszt Elek');
        cy.get('#reg-email').type('elek@pelda.hu');
        cy.get('#reg-jelszo').type('Jelszo1234');
        cy.contains('label', 'adatkezelési').find('input[type=checkbox]').check();
        cy.contains('button', 'Fiók létrehozása').click();

        cy.location('pathname').should('eq', '/fiok');
        cy.contains('h1', 'Elek').should('be.visible');
    });

    it('már létező e-mail-címmel nem enged regisztrálni', () => {
        cy.visit('/regisztracio');
        cy.get('#reg-nev').type('Másik Vilma');
        cy.get('#reg-email').type('vasarlo@teszt.hu');
        cy.get('#reg-jelszo').type('Jelszo1234');
        cy.contains('label', 'adatkezelési').find('input[type=checkbox]').check();
        cy.contains('button', 'Fiók létrehozása').click();
        cy.get('[role=alert]').should('contain', 'már regisztráltak');
    });
});
