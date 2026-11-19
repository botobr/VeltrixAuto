// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
const API_PREFIX = '/api'

Cypress.Commands.add('mockVeltrixApi', () => {
	cy.fixture('frontend-autok.json').then((autok) => {
		cy.intercept('**/api/**', (req) => {
			const url = new URL(req.url)
			const utvonal = url.pathname.replace(API_PREFIX, '')
			const query = url.searchParams

			if (req.method === 'GET' && utvonal === '/auth/me') {
				req.reply({ statusCode: 401, body: { error: 'Nincs bejelentkezve.' } })
				return
			}

			if (req.method === 'GET' && utvonal === '/telephelyek') {
				req.reply({ telephelyek: [autok[0].telephely] })
				return
			}

			if (req.method === 'GET' && utvonal === '/autok/szurok') {
				req.reply({
					markak: [
						{ marka: 'Toyota', db: 1, modellek: ['Corolla'] },
						{ marka: 'BMW', db: 1, modellek: ['320i'] },
					],
					megyek: ['Budapest', 'Pest'],
					telephelyek: [autok[0].telephely, { ...autok[0].telephely, _id: 'telephely-buda', nev: 'Veltrix Buda' }],
					tartomanyok: { minEv: 2019 },
				})
				return
			}

			if (req.method === 'GET' && utvonal === '/autok') {
				let talalatok = [...autok]
				if (query.get('kiemelt') === '1') talalatok = talalatok.filter((auto) => auto.kiemelt)
				if (query.has('marka')) talalatok = talalatok.filter((auto) => auto.marka.toLowerCase() === query.get('marka').toLowerCase())
				if (query.has('modell')) talalatok = talalatok.filter((auto) => auto.modell.toLowerCase() === query.get('modell').toLowerCase())
				if (query.has('maxAr')) talalatok = talalatok.filter((auto) => auto.vetel_ar <= Number(query.get('maxAr')))
				if (query.has('minAr')) talalatok = talalatok.filter((auto) => auto.vetel_ar >= Number(query.get('minAr')))
				if (query.has('q')) {
					const keresett = query.get('q').toLowerCase()
					talalatok = talalatok.filter((auto) => `${auto.marka} ${auto.modell}`.toLowerCase().includes(keresett))
				}
				if (query.has('uzemanyag')) talalatok = talalatok.filter((auto) => query.get('uzemanyag').split(',').includes(auto.uzemanyag))
				if (query.has('garancias')) talalatok = talalatok.filter((auto) => auto.garancia_honap > 0)
				if (query.has('ujak')) talalatok = talalatok.filter((auto) => auto.uj)
				if (query.get('rendezes') === 'arNovekvo') talalatok.sort((a, b) => a.vetel_ar - b.vetel_ar)
				if (query.get('rendezes') === 'arCsokkeno') talalatok.sort((a, b) => b.vetel_ar - a.vetel_ar)

				const osszes = talalatok.length
				const limit = Number(query.get('limit') || 12)
				const oldal = Number(query.get('oldal') || 1)
				const kezdet = (oldal - 1) * limit
				req.reply({ autok: talalatok.slice(kezdet, kezdet + limit), lapozas: { oldal, limit, osszes } })
				return
			}

			const autoMatch = utvonal.match(/^\/autok\/([^/]+)$/)
			if (req.method === 'GET' && autoMatch) {
				const auto = autok.find((elem) => elem._id === autoMatch[1] || elem.slug === autoMatch[1])
				if (!auto) {
					req.reply({ statusCode: 404, body: { error: 'A hirdetés nem található.' } })
					return
				}
				req.reply({ auto, hasonlok: autok.filter((elem) => elem._id !== auto._id).slice(0, 2) })
				return
			}

			if (req.method === 'POST' && /^\/autok\/[^/]+\/esemeny$/.test(utvonal)) {
				req.reply({ statusCode: 201, body: { sikeres: true } })
				return
			}

			if (req.method === 'POST' && utvonal === '/auth/login') {
				if (req.body?.email === 'teszt@veltrix.hu' && req.body?.jelszo === 'helyes-jelszo') {
					req.reply({ user: { _id: 'teszt-user', nev: 'Teszt Felhasználó', email: req.body.email, kedvencek: [], jogok: [] } })
				} else {
					req.reply({ statusCode: 401, body: { error: 'Hibás e-mail-cím vagy jelszó.' } })
				}
				return
			}

			req.reply({ statusCode: 404, body: { error: `Nincs tesztelt API útvonal: ${req.method} ${utvonal}` } })
		})
	})
})