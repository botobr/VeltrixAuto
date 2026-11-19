const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:5173",
    viewportWidth: 1365,
    viewportHeight: 900,
    defaultCommandTimeout: 8000,
    retries: {
      runMode: 0,
      openMode: 0,
    },
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
