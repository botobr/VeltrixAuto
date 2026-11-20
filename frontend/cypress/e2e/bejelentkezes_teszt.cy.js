// Bejelentkezés, regisztráció, kijelentkezés, védett oldalak.
// Tesztfelhasználók (backend/tests/e2e/szerver.js): admin@ / ertekesito@ / vasarlo@teszt.hu, jelszó: Teszt1234

describe('Bejelentkezés', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('a menü „Belépés” gombjával bejelentkezik a vásárló, és visszakerül oda, ahonnan jött', () => {
        cy.visit('/');
        cy.get('#belepes-gomb').click();
        cy.location('pathname').should('eq', '/belepes');

        cy.get('#email').type('vasarlo@teszt.hu');
        cy.get('#jelszo').type('Teszt1234');
        cy.contains('button[type=submit]', 'Belépés').click();

        cy.location('pathname').should('eq', '/');
        cy.get('.nav-felhasznalo').should('contain', 'Vásárló Vilma');
        cy.get('#belepes-gomb').should('not.exist');

        cy.get('.nav-felhasznalo').click();
        cy.contains('h1', 'Vilma').should('be.visible');
    });

    it('hibás jelszónál hibaüzenet, és nem jelentkezik be', () => {
        cy.visit('/belepes');
        cy.get('#email').type('vasarlo@teszt.hu');
        cy.get('#jelszo').type('rossz-jelszo');
        cy.contains('button[type=submit]', 'Belépés').click();

        cy.get('[role=alert]').should('contain', 'Hibás email vagy jelszó');
        cy.location('pathname').should('eq', '/belepes');
    });

    it('az admin bejelentkezés után az admin felületre kerül', () => {
        cy.visit('/belepes');
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
        cy.get('#belepes-gomb').should('be.visible');
    });

    it('védett oldal bejelentkezés nélkül a belépéshez irányít, utána vissza', () => {
        cy.visit('/fiok?lap=rendelesek');
        cy.location('pathname').should('eq', '/belepes');
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

    it('új fiók: megerősítő e-mail nélkül nem lehet belépni, a link után igen', () => {
        cy.visit('/regisztracio');
        cy.get('#reg-nev').type('Teszt Elek');
        cy.get('#reg-email').type('elek@pelda.hu');
        cy.get('#reg-jelszo').type('Jelszo1234');
        cy.contains('label', 'adatkezelési').find('input[type=checkbox]').check();
        cy.contains('button', 'Fiók létrehozása').click();
        cy.contains('Elküldtük a megerősítő linket').should('be.visible').and('contain', 'elek@pelda.hu');

        // Megerősítés előtt a belépés tiltott.
        cy.visit('/belepes');
        cy.get('#email').type('elek@pelda.hu');
        cy.get('#jelszo').type('Jelszo1234{enter}');
        cy.get('[role=alert]').should('contain', 'erősítsd meg az e-mail-címedet');

        // A tesztszerver elkapta a megerősítő levelet: a benne lévő linkre lépünk.
        cy.levelek().then((levelek) => {
            const level = levelek.find((l) => l.cimzett.includes('elek@pelda.hu') && l.targy.includes('Erősítsd meg'));
            expect(level, 'megerősítő e-mail').to.exist;
            const link = level.szoveg.match(/https?:\/\/\S+\/email-hitelesites\?token=\S+/)[0];
            cy.visit(new URL(link).pathname + new URL(link).search);
        });
        cy.contains('E-mail-cím megerősítve').should('be.visible');

        cy.visit('/belepes');
        cy.get('#email').type('elek@pelda.hu');
        cy.get('#jelszo').type('Jelszo1234{enter}');
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
