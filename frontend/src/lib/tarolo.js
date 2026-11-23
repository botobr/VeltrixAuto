// localStorage / sessionStorage olvasása és írása.
// Privát módban vagy letiltott sütiknél hibát dobhat, ezért try-catch-be tesszük.

const valasztottTarolo = (tarolo) => {
    if (tarolo === 'session') {
        return sessionStorage;
    }
    return localStorage;
};

export const olvas = (kulcs, alap, tarolo = 'local') => {
    try {
        const nyers = valasztottTarolo(tarolo).getItem(kulcs);
        if (nyers === null) {
            return alap;
        }
        return JSON.parse(nyers);
    } catch {
        return alap;
    }
};

export const ir = (kulcs, ertek, tarolo = 'local') => {
    try {
        valasztottTarolo(tarolo).setItem(kulcs, JSON.stringify(ertek));
    } catch {
        // nem baj, ha nem sikerül, csak nem marad meg az adat
    }
};
