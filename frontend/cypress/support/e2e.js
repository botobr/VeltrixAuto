import './commands';

// A süti-tájékoztató sávja eltakarná az oldal alját: minden oldalbetöltés előtt elfogadottnak jelöljük.
// Kivétel: a sávot ellenőrző teszt, amely az URL-ben ?sutiTeszt jelöléssel tölti be az oldalt.
Cypress.on('window:before:load', (win) => {
    if (!win.location.search.includes('sutiTeszt')) win.localStorage.setItem('veltrix-cookie-tudomasul', 'true');
});
