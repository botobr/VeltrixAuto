/*
 * Biztonságos böngészőtároló-elérés: privát módban, letiltott sütiknél vagy
 * beágyazott nézetben a localStorage hibát dobhat – ilyenkor csendben kihagyjuk.
 */
export const olvas = (kulcs, alap, tarolo = 'local') => {
    try {
        const nyers = (tarolo === 'session' ? sessionStorage : localStorage).getItem(kulcs);
        return nyers === null ? alap : JSON.parse(nyers);
    } catch {
        return alap;
    }
};

export const ir = (kulcs, ertek, tarolo = 'local') => {
    try {
        (tarolo === 'session' ? sessionStorage : localStorage).setItem(kulcs, JSON.stringify(ertek));
    } catch {
        // A tároló nem elérhető – a funkció ettől még működik, csak nem marad meg.
    }
};
