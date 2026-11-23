// a hosszú ő és ű betűket a normalize nem alakítja át, ezért kézzel cseréljük
const ekezetek = { ő: 'o', ű: 'u', Ő: 'o', Ű: 'u' };

// Szövegből URL-be való rész, pl. "Ferrari F40" -> "ferrari-f40"
const slugify = (szoveg) => {
    let eredmeny = String(szoveg || '');

    eredmeny = eredmeny.replace(/[őűŐŰ]/g, (betu) => ekezetek[betu]);
    // ékezetek levétele (á -> a, é -> e, ...)
    eredmeny = eredmeny.normalize('NFD').replace(/[̀-ͯ]/g, '');
    eredmeny = eredmeny.toLowerCase();
    // minden, ami nem betű vagy szám, kötőjel lesz
    eredmeny = eredmeny.replace(/[^a-z0-9]+/g, '-');
    // elején és végén nem kell kötőjel
    eredmeny = eredmeny.replace(/^-+|-+$/g, '');

    return eredmeny.slice(0, 80);
};

// pl. "ferrari-f40-1990-65f1c2..." (a végén ott az azonosító)
const autoSlug = (auto) => {
    const eleje = slugify(auto.marka + ' ' + auto.modell + ' ' + (auto.evjarat || ''));
    if (eleje) {
        return eleje + '-' + auto._id;
    }
    return String(auto._id);
};

// pl. "kw-v3-allithato-futomu-65f1c2..."
const alkatreszSlug = (alkatresz) => {
    const eleje = slugify((alkatresz.gyarto || '') + ' ' + (alkatresz.nev || ''));
    if (eleje) {
        return eleje + '-' + alkatresz._id;
    }
    return String(alkatresz._id);
};

// a slug végéről kiszedi a 24 karakteres MongoDB azonosítót
const idSlugbol = (slug) => {
    const talalat = /([a-f0-9]{24})$/i.exec(String(slug || ''));
    if (talalat) {
        return talalat[1];
    }
    return null;
};

module.exports = { slugify, autoSlug, alkatreszSlug, idSlugbol };
