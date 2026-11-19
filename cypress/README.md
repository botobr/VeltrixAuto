# Veltrix frontend E2E tests

## Run

From the repository root:

- `npm run test:e2e` starts Vite, waits for it to be ready, runs Cypress headlessly, then stops the server.
- `npm run test:e2e:open` starts Vite and opens Cypress interactively.
- `npm run cypress:run` runs Cypress against an already-running frontend at `http://127.0.0.1:5173`.

## Strategy

The suite uses `cypress/fixtures/frontend-autok.json` and a catch-all API interceptor in `cypress/support/commands.js`. This keeps tests repeatable and independent of MongoDB, credentials, email, Cloudinary, and backend availability. Unhandled API calls fail explicitly instead of leaking to a live service.

Coverage includes home/quick search, URL-backed search and filters, car details and phone reveal, guest auth redirects, login failure/success, compare flow, cookie persistence, not-found and no-results states, API retry, mobile navigation, and a WCAG 2.1 A/AA axe-core smoke audit.

The API mock is intentionally a small in-memory test contract, not a replacement for backend integration tests. Cypress retries are disabled so intermittent failures remain visible.
