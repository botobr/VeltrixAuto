// Autókínálat: lista, szűrés, adatlap, érdeklődés, kedvencek, illő tuning alkatrészek.

describe('Autókínálat', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('a kínálat a nem eladott autókat mutatja, márkára szűrhető', () => {
        cy.visit('/autok');
        cy.get('.autok-talalat').should('contain', '3');
        cy.get('.auto-kartya').should('have.length', 3);
        cy.contains('.auto-kartya', 'S3').should('not.exist'); // az Audi S3 elkelt

        cy.get('#auto-kereses').type('Golf');
        cy.location('search').should('contain', 'q=Golf');
        cy.get('.auto-kartya').should('have.length', 1).and('contain', 'Golf');
    });

    it('adatlap: adatok, morzsamenü és az autóhoz illő tuning alkatrészek', function () {
        cy.visit(`/autok/${this.adatok.autok.bmw}`);
        // A rövid (csak azonosítós) címről a kanonikus, olvasható címre irányít.
        cy.location('pathname').should('match', /^\/autok\/bmw-e46-318ci-2001-/);
        cy.contains('h1', 'E46 318CI').should('be.visible');
        cy.get('.reszletek-ar').szoveg('2 490 000 Ft');

        cy.contains('h2', 'Tuning alkatrészek ehhez az autóhoz').scrollIntoView();
        cy.get('.alkatresz-kartya').should('contain', 'V3 állítható menetes futómű').and('not.contain', 'chiptuning');
    });

    it('érdeklődés küldése az adatlapról', function () {
        cy.visit(`/autok/${this.adatok.autok.golf}`);
        cy.get('#erdeklodes').scrollIntoView();
        cy.get('#erdeklodes').within(() => {
            cy.mezo('Név').type('Kiss Anna');
            cy.mezo('E-mail').type('anna@pelda.hu');
            cy.contains('label', 'adatkezelési').find('input[type=checkbox]').check();
            // A spamvédelem miatt az űrlap kitöltése legalább 3 másodperc.
            cy.wait(3200);
            cy.contains('button', 'Üzenet küldése').click();
            cy.contains('h3', 'Üzenet elküldve').should('be.visible');
        });
        cy.levelek().then((levelek) => {
            expect(levelek.some((l) => l.targy.includes('Új érdeklődés: Volkswagen Golf'))).to.equal(true);
        });
    });

    it('kedvencek: bejelentkezve menthető, és megjelenik a fiókban', function () {
        cy.bejelentkezes('vasarlo');
        cy.visit('/autok');
        cy.contains('.auto-kartya', 'Golf').find('[aria-label="Mentés a kedvencek közé"]').click();
        cy.contains('.auto-kartya', 'Golf').find('[aria-label="Eltávolítás a kedvencek közül"]').should('exist');

        cy.visit('/fiok');
        cy.get('.auto-kartya').should('have.length', 1).and('contain', 'Golf');
    });
});
