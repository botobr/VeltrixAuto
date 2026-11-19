// Admin és értékesítő felület: dashboard, rendeléskezelés, alkatrészek, jogosultságok.

const rendelesLeadasa = (alkatreszId) => cy.request('POST', `${Cypress.expose('apiUrl')}/api/rendelesek`, {
    tetelek: [{ id: alkatreszId, mennyiseg: 1 }],
    vevo: { nev: 'Kovács Bence', email: 'bence@pelda.hu', telefon: '+36 30 555 1234' },
    szallitasiMod: 'futar', fizetesiMod: 'utanvet',
    szallitasiCim: { iranyitoszam: '1117', varos: 'Budapest', cim: 'Fő utca 8.' },
    szamlazasiCim: { nev: 'Kovács Bence', iranyitoszam: '1117', varos: 'Budapest', cim: 'Fő utca 8.' },
    aszf: true,
});

describe('Admin', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('dashboard: bevétel, készlet és webshop blokk', function () {
        rendelesLeadasa(this.adatok.alkatreszek.szuro);
        cy.bejelentkezes('admin');
        cy.visit('/admin');
        cy.contains('h1', 'Admin').should('be.visible');
        cy.get('.db-hero').should('contain', 'Bevétel');
        cy.get('.db-hero-lab').szoveg('Összes rögzített bevétel: 2 850 000 Ft');
        cy.contains('.kpi', 'Készleten').should('contain', '3');
        cy.contains('h2', 'Webshop').scrollIntoView();
        cy.contains('.kpi', 'Rendelések').should('contain', '1');
        cy.contains('.kpi', 'Webshop bevétel').should('be.visible');
        cy.contains('.top-lista', 'Legkelendőbb termékek').should('contain', 'Sport levegőszűrő betét');
    });

    it('rendeléskezelés: státuszváltás, a vevő e-mailt kap a feladásról', function () {
        rendelesLeadasa(this.adatok.alkatreszek.szuro);
        cy.bejelentkezes('admin');
        cy.visit('/admin?lap=rendelesek');
        cy.get('.rendeles-kartya').should('have.length', 1).and('contain', 'Kovács Bence');

        cy.get('.rendeles-muveletek').contains('label', 'Státusz').find('select').select('feldolgozas');
        cy.get('.rendeles-kartya .rendeles-statusz').should('contain', 'Összekészítés alatt');
        cy.get('.rendeles-muveletek').contains('label', 'Státusz').find('select').select('feladva');
        cy.get('.rendeles-kartya .rendeles-statusz').should('contain', 'Feladva');

        cy.levelek().then((levelek) => {
            expect(levelek.some((l) => l.targy.startsWith('Rendelésed úton van'))).to.equal(true);
        });
    });

    it('alkatrészek: készlet módosítása a listában, rejtett termék eltűnik a webshopból', () => {
        cy.bejelentkezes('admin');
        cy.visit('/admin?lap=alkatreszek');
        cy.contains('tr', 'GTS Black chiptuning box').find('.keszlet-mezo').clear().type('7{enter}');
        cy.contains('tr', 'GTS Black chiptuning box').find('.keszlet-mezo').should('have.value', '7').and('not.have.class', 'keszlet-nulla');

        cy.contains('tr', 'Remus').find('[aria-label$="látható"]').uncheck({ force: true });
        cy.contains('tr', 'Remus').should('have.class', 'sor-rejtett');

        cy.clearCookies();
        cy.visit('/alkatreszek');
        cy.contains('.alkatresz-kartya', 'Remus').should('not.exist');
        cy.contains('.alkatresz-kartya', 'chiptuning').find('.kosarba-gomb').should('not.be.disabled');
    });

    it('új termék felvétele: kép nélkül nem menthető', () => {
        cy.bejelentkezes('admin');
        cy.visit('/admin/alkatreszek/uj');
        cy.mezo('Termék neve').type('Teszt termék');
        cy.mezo('Gyártó').type('Teszt');
        cy.mezo('Cikkszám').type('teszt-1');
        cy.mezo('Cikkszám').should('have.value', 'TESZT-1');
        cy.mezo('Kategória').select('Futómű');
        cy.contains('label', 'Ár').find('input').type('10000');
        cy.contains('label', 'Univerzális').click();
        cy.get('.szerkeszto-oldalsav .alkatresz-kartya').szoveg('Teszt termék', '10 000 Ft');
        cy.contains('button', 'Termék közzététele').click();
        cy.get('.szerkeszto-hibak').should('contain', 'Legalább egy képet tölts fel');
    });
});

describe('Jogosultságok', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('értékesítő: nincs bevétel, nincs törlés, nincs felhasználókezelés', () => {
        cy.bejelentkezes('ertekesito');
        cy.visit('/admin');
        cy.contains('h1', 'Értékesítés').should('be.visible');
        cy.get('.db-hero').should('contain', 'Eladott autók').and('not.contain', 'Bevétel');
        cy.contains('Webshop bevétel').should('not.exist');
        cy.get('.fulek').should('contain', 'Rendelések').and('contain', 'Alkatrészek').and('not.contain', 'Felhasználók').and('not.contain', 'Telephelyek');

        cy.visit('/admin?lap=alkatreszek');
        cy.get('.alkatresz-tabla').should('be.visible');
        cy.get('button[title="Végleges törlés"]').should('not.exist');

        cy.visit('/admin?lap=hirdetesek');
        cy.get('.admin-hirdetes').should('have.length.at.least', 1);
        cy.get('button[title="Végleges törlés"]').should('not.exist');
    });

    it('vásárló nem látja az admin felületet', () => {
        cy.bejelentkezes('vasarlo');
        cy.visit('/admin');
        cy.contains('Ehhez az oldalhoz nincs jogosultságod').should('be.visible');
        cy.get('.nav-linkek').should('not.contain', 'Admin');
    });
});
