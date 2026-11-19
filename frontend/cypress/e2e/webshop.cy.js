// Tuning alkatrész webshop: szűrés autóra, termékoldal, kosár, pénztár, rendelés utánvéttel / utalással.

const kosarba = (termekNev) => cy.contains('.alkatresz-kartya', termekNev).find('.kosarba-gomb').click();

const elerhetosegKitoltese = () => {
    cy.mezo('Teljes név').type('Kovács Bence');
    cy.mezo('E-mail').type('bence@pelda.hu');
    cy.mezo('Telefonszám').type('+36 30 555 1234');
};

const futarCim = () => {
    cy.contains('.valasztas', 'Házhozszállítás futárral').click();
    cy.mezo('Irányítószám').type('1117');
    cy.mezo('Település').type('Budapest');
    cy.mezo('Utca, házszám').type('Október huszonharmadika utca 8.');
};

describe('Webshop – böngészés', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('„Melyik autódhoz?”: márka, modell, évjárat szerint csak az illő termékek', () => {
        cy.visit('/alkatreszek');
        cy.get('.alkatresz-kartya').should('have.length', 5);

        cy.get('.auto-valaszto').within(() => {
            cy.mezo('Márka').select('BMW');
            cy.mezo('Modell').select('E46');
            cy.mezo('Évjárat').type('2003');
            cy.contains('button', 'Illő alkatrészek').click();
        });

        cy.location('search').should('contain', 'autoMarka=BMW').and('contain', 'autoModell=E46');
        cy.get('.autok-talalat').should('contain', 'BMW E46 (2003)');
        // E46 futómű + E46 szűrő + univerzális kúpos szűrő; a Golf-dob és az F30-as chip nem.
        cy.get('.alkatresz-kartya').should('have.length', 3);
        cy.contains('.alkatresz-kartya', 'Golf').should('not.exist');
        cy.contains('.alkatresz-kartya', 'F30').should('not.exist');
    });

    it('kategória és akció szűrő, ár szerinti rendezés', () => {
        cy.visit('/alkatreszek');
        cy.contains('.alkatresz-szurok .csip', 'Levegőszűrő és szívórendszer').click();
        cy.get('.alkatresz-kartya').should('have.length', 2);

        cy.get('#alkatresz-rendezes').select('arNovekvo');
        cy.get('.alkatresz-kartya').first().should('contain', 'Nyitott kúpos levegőszűrő');

        cy.contains('label', 'Csak akciós').click();
        cy.get('.autok-talalat').should('contain', '0');
        cy.contains('h3', 'Nincs a feltételeknek megfelelő termék').should('be.visible');
    });

    it('termékoldal: akciós ár, megtakarítás, illő autók; elfogyott terméket nem lehet kosárba tenni', () => {
        cy.visit('/alkatreszek');
        cy.contains('.alkatresz-kartya a', 'V3 állítható menetes futómű').click();
        cy.contains('h1', 'V3 állítható menetes futómű').should('be.visible');
        cy.get('.alkatresz-reszletek-ar').szoveg('589 000 Ft', '649 000 Ft');
        cy.get('.alkatresz-megtakaritas').szoveg('Megtakarítás: 60 000 Ft');
        cy.get('.kompatibilitas-lista').should('contain', 'BMW E46 (1998–2006)');

        cy.visit('/alkatreszek');
        cy.contains('.alkatresz-kartya', 'chiptuning').find('.kosarba-gomb').should('be.disabled').and('contain', 'Elfogyott');
    });
});

describe('Webshop – kosár és rendelés', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('kosár: darabszám a menüben, mennyiség módosítása, készletkorlát, eltávolítás', () => {
        cy.visit('/alkatreszek');
        kosarba('Sport levegőszűrő betét');
        kosarba('Nyitott kúpos levegőszűrő');
        cy.get('.nav-kosar .nav-jelveny').should('have.text', '2');

        // Az utolsó darab már a kosárban van: a gomb letilt.
        cy.contains('.alkatresz-kartya', 'Nyitott kúpos levegőszűrő').find('.kosarba-gomb').should('be.disabled');

        cy.get('.nav-kosar').click();
        cy.location('pathname').should('eq', '/kosar');
        cy.contains('.kosar-tetel', 'Sport levegőszűrő betét').find('[aria-label="Eggyel több"]').click();
        cy.contains('.kosar-tetel', 'Sport levegőszűrő betét').find('.kosar-sorosszeg').szoveg('65 800 Ft');
        cy.get('.osszesito').szoveg('82 700 Ft');
        cy.get('.ingyenes-szallitas').szoveg('Még 17 300 Ft és ingyenes a házhozszállítás');

        cy.contains('.kosar-tetel', 'Nyitott kúpos').contains('Eltávolítás').click();
        cy.get('.kosar-tetel').should('have.length', 1);
        cy.get('.nav-kosar .nav-jelveny').should('have.text', '2'); // 2 db szűrő
    });

    it('rendelés utánvéttel: összesítés a szerverről, visszaigazolás, e-mail, a kosár kiürül', () => {
        cy.visit('/alkatreszek');
        kosarba('Sport levegőszűrő betét');
        cy.visit('/kosar');
        cy.contains('a', 'Tovább a pénztárhoz').click();

        elerhetosegKitoltese();
        futarCim();
        cy.contains('.valasztas', 'Utánvét').click();
        cy.get('.webshop-oldalsav .osszesito').szoveg('32 900 Ft', '2490 Ft', '590 Ft', '35 980 Ft');
        cy.contains('label', 'Elfogadom az').find('input').check();
        cy.contains('button', 'Megrendelem – fizetési kötelezettséggel').click();

        cy.location('pathname').should('match', /^\/rendeles\/VX-\d{4}-00001$/);
        cy.contains('h1', 'Köszönjük a').should('be.visible');
        cy.get('.rendeles-lepesek li.aktualis').should('contain', 'Beérkezett');
        cy.get('.nav-kosar .nav-jelveny').should('not.exist');
        cy.levelek().then((levelek) => {
            const targyak = levelek.map((l) => l.targy);
            expect(targyak.some((t) => t.startsWith('Köszönjük a rendelésed – VX-'))).to.equal(true);
            expect(targyak.some((t) => t.startsWith('Új webshop rendelés: VX-'))).to.equal(true);
        });
    });

    it('személyes átvétel előre utalással: telephely-választó, utalási adatok a visszaigazolásban', () => {
        cy.visit('/alkatreszek');
        kosarba('V3 állítható menetes futómű');
        cy.visit('/penztar');

        elerhetosegKitoltese();
        cy.contains('.valasztas', 'Személyes átvétel').click();
        cy.mezo('Átvételi hely').select(1);
        // Személyes átvételnél nincs utánvét.
        cy.contains('.valasztas', 'Utánvét').should('not.exist');
        cy.contains('.valasztas', 'Előre utalás').click();
        cy.mezo('Irányítószám').type('2040');
        cy.mezo('Település').type('Budaörs');
        cy.mezo('Utca, házszám').type('Fő utca 2.');
        cy.contains('label', 'Elfogadom az').find('input').check();
        cy.contains('button', 'Megrendelem').click();

        cy.contains('h1', 'Fizetésre vár').should('be.visible');
        cy.contains('h2', 'Előre utalás').should('be.visible');
        cy.get('.rendeles-fizetes').szoveg('11773016-12345678-00000000', '589 000 Ft');
    });

    it('ha közben elfogy a termék, a pénztár nem engedi leadni a rendelést', function () {
        cy.visit('/alkatreszek');
        kosarba('Nyitott kúpos levegőszűrő');
        // Valaki más megveszi az utolsó darabot.
        cy.request('POST', `${Cypress.expose('apiUrl')}/api/rendelesek`, {
            tetelek: [{ id: this.adatok.alkatreszek.kupos, mennyiseg: 1 }],
            vevo: { nev: 'Más Vevő', email: 'mas@pelda.hu', telefon: '+36 20 111 2222' },
            szallitasiMod: 'futar', fizetesiMod: 'utanvet',
            szallitasiCim: { iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
            szamlazasiCim: { nev: 'Más Vevő', iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
            aszf: true,
        });
        cy.visit('/kosar');
        cy.contains('.kosar-tetel', 'Nyitott kúpos').find('.kosar-hiba').should('contain', 'Elfogyott');
        cy.contains('a', 'Tovább a pénztárhoz').should('not.exist');
    });
});
