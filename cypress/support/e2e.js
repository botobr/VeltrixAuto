// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
Cypress.Commands.add('checkA11y', (options = {}) => {
	cy.document().then((document) => {
		cy.window().then((window) => {
			if (window.axe) return
			const axeSource = require('axe-core').source
			window.Function('window', `const module = undefined; const exports = undefined; ${axeSource}; return window.axe;`)(window)
		})
	}).then(() => cy.window()).then((window) => window.axe.run(window.document, options)).then(({ violations }) => {
		const osszefoglalo = violations.map((h) => `${h.id}: ${h.help}\n${h.nodes.map((node) => `  ${node.target.join(', ')} — ${node.failureSummary || ''}`).join('\n')}`).join('\n')
		expect(violations, osszefoglalo).to.have.length(0)
	})
})

beforeEach(() => {
	cy.mockVeltrixApi()
})