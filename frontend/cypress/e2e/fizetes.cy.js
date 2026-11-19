// Online kártyás fizetés (Stripe). A tesztszerver a Stripe fizetőoldal helyett rögtön visszairányít,
// a „fizetve” jelzést pedig a teszt küldi el aláírt webhookként – pont úgy, ahogy a Stripe tenné.

const kartyasRendeles = () => {
    cy.visit('/alkatreszek');
    cy.contains('.alkatresz-kartya', 'Sport levegőszűrő betét').find('.kosarba-gomb').click();
    cy.visit('/penztar');
    cy.mezo('Teljes név').type('Kovács Bence');
    cy.mezo('E-mail').type('bence@pelda.hu');
    cy.mezo('Telefonszám').type('+36 30 555 1234');
    cy.contains('.valasztas', 'Házhozszállítás futárral').click();
    cy.mezo('Irányítószám').type('1117');
    cy.mezo('Település').type('Budapest');
    cy.mezo('Utca, házszám').type('Fő utca 8.');
    cy.contains('.valasztas', 'Online bankkártyás fizetés').click();
    cy.contains('Stripe fizetőoldalára irányítunk').should('be.visible');
    cy.contains('label', 'Elfogadom az').find('input').check();
    cy.contains('button', 'Megrendelem').click();
};

describe('Kártyás fizetés', () => {
    beforeEach(() => {
        cy.visszaallitas();
    });

    it('sikeres fizetés: a visszaigazoló oldal megvárja a Stripe visszajelzését', () => {
        kartyasRendeles();
        cy.location('search').should('contain', 'fizetes=siker');
        cy.contains('h1', 'Fizetés ellenőrzése').should('be.visible');

        cy.utolsoRendeles().then((rendeles) => {
            expect(rendeles.statusz).to.equal('fizetesre_var');
            cy.stripeVisszajelzes(rendeles.munkamenetId, 'sikeres');
        });

        // Az oldal pár másodpercenként újrakérdez – megjelenik a sikeres állapot.
        cy.contains('h1', 'Köszönjük a', { timeout: 15000 }).should('be.visible');
        cy.contains('Online bankkártyás fizetés · kifizetve').should('be.visible');
        cy.utolsoRendeles().its('statusz').should('eq', 'uj');
    });

    it('lejárt fizetés: a rendelés lemondva, a készlet visszakerül', () => {
        kartyasRendeles();
        cy.contains('h1', 'Fizetés ellenőrzése').should('be.visible');
        cy.utolsoRendeles().then((rendeles) => cy.stripeVisszajelzes(rendeles.munkamenetId, 'lejart'));
        cy.reload();
        cy.contains('h1', 'A rendelés lemondva').should('be.visible');

        cy.visit('/alkatreszek?q=K%26N');
        cy.contains('.alkatresz-kartya', 'Sport levegőszűrő betét').find('.keszlet-keszleten').should('be.visible');
    });
});
