import './commands';

// A süti sáv eltakarná az oldal alját, ezért minden oldal előtt "elfogadjuk".
// Kivétel: a süti sávot tesztelő teszt (?sutiTeszt van az URL-ben).
Cypress.on('window:before:load', (win) => {
    if (!win.location.search.includes('sutiTeszt')) {
        win.localStorage.setItem('veltrix-cookie-tudomasul', 'true');
    }
});
