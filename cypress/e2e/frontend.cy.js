describe('Veltrix frontend – kritikus felhasználói folyamatok', () => {
  it('betölti a főoldalt, kínálati elemeket mutat, és a gyorskeresővel szűrhető kínálatra navigál', () => {
    cy.visit('/')

    cy.get('main').should('be.visible')
    cy.get('h1').should('contain.text', 'következő utad.')
    cy.contains('h2', 'Most került a kínálatba').should('be.visible')
    cy.contains('article.auto-kartya', 'Corolla').should('be.visible')
    cy.contains('article.auto-kartya', 'BMW').should('be.visible')
    cy.get('.home-statok').should('contain.text', '2')

    cy.get('.gyorskereso select').eq(0).select('Toyota')
    cy.get('.gyorskereso select').eq(1).select('8000000')
    cy.get('.gyorskereso').contains('button', 'Keresés').click()

    cy.location('pathname').should('eq', '/autok')
    cy.location('search').should('include', 'marka=Toyota').and('include', 'maxAr=8000000')
    cy.contains('article.auto-kartya', 'Corolla').should('be.visible')
    cy.contains('article.auto-kartya', 'BMW').should('not.exist')
  })

  it('a kínálati szűrők módosítják az URL-t és a találati listát', () => {
    cy.visit('/autok')
    cy.contains('article.auto-kartya', 'Corolla').should('be.visible')
    cy.contains('article.auto-kartya', 'BMW').should('be.visible')

    cy.findByLabelText('Márka').select('Toyota')
    cy.location('search').should('include', 'marka=Toyota')
    cy.contains('button', 'Szűrő törlése: Toyota').should('be.visible')
    cy.contains('article.auto-kartya', 'Corolla').should('be.visible')
    cy.contains('article.auto-kartya', 'BMW').should('not.exist')

    cy.findByLabelText('Rendezés').select('arCsokkeno')
    cy.location('search').should('include', 'rendezes=arCsokkeno')
  })

  it('a kereső gépelés után szinkronizálja a keresőkifejezést az URL-lel', () => {
    cy.visit('/autok')
    cy.get('#auto-kereses').type('BMW')

    cy.location('search', { timeout: 6000 }).should('include', 'q=BMW')
    cy.contains('button', 'Szűrő törlése: „BMW”').should('be.visible')
    cy.contains('article.auto-kartya', 'BMW').should('be.visible')
    cy.contains('article.auto-kartya', 'Corolla').should('not.exist')
  })

  it('részletes adatlapot jelenít meg, és csak kattintásra fedi fel a telefonszámot', () => {
    cy.visit('/autok/toyota-corolla-2021')

    cy.get('h1').should('contain.text', 'Corolla')
    cy.contains('strong', '7 890 000 Ft').should('be.visible')
    cy.contains('h2', 'Műszaki adatok és előélet').should('be.visible')
    cy.contains('h2', 'Felszereltség').should('be.visible')
    cy.contains('Klíma').should('be.visible')

    cy.contains('button', 'Telefonszám megjelenítése').click()
    cy.contains('a.reszletek-telefon', '+36 30 123 4567')
      .should('have.attr', 'href', 'tel:+36301234567')
  })

  it('az érdeklődés nélküli vendég a kedvenc mentésekor bejelentkezésre kerül', () => {
    cy.visit('/autok')
    cy.contains('article.auto-kartya', 'Corolla')
      .find('button[aria-label="Mentés a kedvencek közé"]')
      .click()

    cy.location('pathname').should('eq', '/login')
    cy.contains('A kedvencek mentéséhez jelentkezz be.').should('be.visible')
    cy.get('#email').should('be.visible')
    cy.get('#jelszo').should('be.visible')
  })

  it('érthető hibát mutat sikertelen bejelentkezésnél, és lehetővé teszi a jelszó felfedését', () => {
    cy.visit('/login')
    cy.get('#email').type('hibas@example.test')
    cy.get('#jelszo').type('hibas-jelszo')
    cy.get('#jelszo').should('have.attr', 'type', 'password')
    cy.contains('button', 'Mutat').click()
    cy.get('#jelszo').should('have.attr', 'type', 'text')
    cy.contains('button', 'Elrejt').click()
    cy.get('#jelszo').should('have.attr', 'type', 'password')
    cy.contains('button', 'Belépés').click()

    cy.get('[role="alert"]').should('contain.text', 'Hibás e-mail-cím vagy jelszó')
    cy.location('pathname').should('eq', '/login')
  })

  it('a kiválasztott autó összehasonlítási sávba kerül, majd megjelenik az összehasonlító táblázatban', () => {
    cy.visit('/autok')
    cy.contains('article.auto-kartya', 'Corolla')
      .find('button[aria-label="Hozzáadás az összehasonlításhoz"]')
      .click()

    cy.get('aside[aria-label="Összehasonlítás"]')
      .should('contain.text', '1 autó kiválasztva')
    cy.get('aside[aria-label="Összehasonlítás"]').contains('a', 'Összehasonlítás').click()
    cy.location('pathname').should('eq', '/osszehasonlitas')
    cy.contains('h1', 'Melyik legyen').should('be.visible')
    cy.get('.osszehasonlitas-tabla').should('contain.text', 'Corolla')
    cy.get('.osszehasonlitas-tabla').should('contain.text', '7 890 000 Ft')
  })

  it('megjegyzi a süti-tájékoztató elfogadását újratöltés után is', () => {
    cy.visit('/')
    cy.get('[aria-label="Süti-tájékoztató"]').should('be.visible')
    cy.contains('button', 'Rendben').click()
    cy.get('[aria-label="Süti-tájékoztató"]').should('not.exist')
    cy.reload()
    cy.get('[aria-label="Süti-tájékoztató"]').should('not.exist')
  })

  it('ismeretlen útvonalon valódi 404 oldalt ad navigációs lehetőségekkel', () => {
    cy.visit('/nincs-ilyen-oldal')
    cy.get('main').should('contain.text', '404')
    cy.get('h1').should('contain.text', 'Ez az oldal nem található')
    cy.contains('a', 'Kínálat böngészése').should('have.attr', 'href', '/autok')
    cy.contains('a', 'Főoldal').should('have.attr', 'href', '/')
  })
})
