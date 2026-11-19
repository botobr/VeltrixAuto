describe('Nem található oldal', () => {
  beforeEach(() => {
    cy.visit('/nem-letezo-oldal')
  })

  it('megjeleníti a 404-es állapotot és a navigációs lehetőségeket', () => {
    cy.get('main').should('contain.text', '404')
    cy.get('h1').should('contain.text', 'Ez az oldal nem található')
    cy.contains('a', 'Kínálat böngészése').should('have.attr', 'href', '/autok')
    cy.contains('a', 'Főoldal').should('have.attr', 'href', '/')
  })

  it('a Főoldal link visszavisz a főoldalra', () => {
    cy.contains('a', 'Főoldal').click()
    cy.get('h1', { timeout: 10000 }).should('contain.text', 'következő utad.')
  })
})