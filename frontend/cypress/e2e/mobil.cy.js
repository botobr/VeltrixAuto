// Mobil nézet (390 px): menü, vízszintes görgetés nélküli oldalak, kosár.

const nincsVizszintesGorgetes = () => cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'vízszintes túlcsordulás').to.be.at.most(doc.documentElement.clientWidth);
});

describe('Mobil nézet', () => {
    beforeEach(() => {
        cy.viewport(390, 844);
        cy.visszaallitas();
    });

    it('hamburger menüből elérhető a webshop', () => {
        cy.visit('/');
        cy.get('.nav-menu-gomb').should('be.visible').click();
        cy.get('.nav-menu-gomb').should('have.attr', 'aria-expanded', 'true');
        cy.contains('.nav-linkek a', 'Tuning alkatrészek').click();
        cy.location('pathname').should('eq', '/alkatreszek');
        cy.get('.nav-menu-gomb').should('have.attr', 'aria-expanded', 'false');
    });

    for (const utvonal of ['/', '/autok', '/alkatreszek', '/kosar', '/belepes']) {
        it(`nincs vízszintes görgetés: ${utvonal}`, () => {
            cy.visit(utvonal);
            cy.get('main').should('be.visible');
            nincsVizszintesGorgetes();
        });
    }

    it('kosár és pénztár mobilon', () => {
        cy.visit('/alkatreszek');
        cy.contains('.alkatresz-kartya', 'Sport levegőszűrő betét').find('.kosarba-gomb').click();
        cy.visit('/kosar');
        cy.get('.kosar-tetel').should('have.length', 1);
        nincsVizszintesGorgetes();
        cy.contains('a', 'Tovább a pénztárhoz').click();
        cy.contains('legend', 'Elérhetőség').should('be.visible');
        nincsVizszintesGorgetes();
    });
});

describe('Süti-tájékoztató', () => {
    it('első látogatáskor megjelenik, elfogadás után eltűnik és nem jön vissza', () => {
        cy.visszaallitas();
        cy.visit('/?sutiTeszt');
        cy.get('.cookie-sav').should('be.visible').contains('button', 'Rendben').click();
        cy.get('.cookie-sav').should('not.exist');
        cy.reload();
        cy.get('.cookie-sav').should('not.exist');
    });
});
