import { defineConfig } from 'cypress';

// E2E tesztek: npm run e2e (lásd cypress/inditas.js)
// A tesztek egy külön tesztszerverrel futnak (memóriában lévő adatbázissal), nem az éles adatokkal.
export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5174',
        // a tesztszerver címe (a tesztekben: Cypress.expose('apiUrl'))
        expose: {
            apiUrl: 'http://localhost:3601',
        },
        viewportWidth: 1280,
        viewportHeight: 800,
        defaultCommandTimeout: 8000,
        video: false,
        screenshotOnRunFailure: true,
        retries: { runMode: 1, openMode: 0 },
    },
});
