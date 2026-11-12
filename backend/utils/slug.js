const ekezetek = { ő: 'o', ű: 'u', Ő: 'o', Ű: 'u' };

const slugify = (szoveg) => String(szoveg || '')
    .replace(/[őűŐŰ]/g, (betu) => ekezetek[betu])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** pl. „ferrari-f40-1990-65f1c2…” – olvasható, de az azonosító a végén egyértelmű. */
const autoSlug = (auto) => {
    const eleje = slugify(`${auto.marka} ${auto.modell} ${auto.evjarat || ''}`);
    return eleje ? `${eleje}-${auto._id}` : String(auto._id);
};

/** pl. „kw-v3-allithato-futomu-65f1c2…” */
const alkatreszSlug = (alkatresz) => {
    const eleje = slugify(`${alkatresz.gyarto || ''} ${alkatresz.nev || ''}`);
    return eleje ? `${eleje}-${alkatresz._id}` : String(alkatresz._id);
};

const idSlugbol = (slug) => {
    const talalat = /([a-f0-9]{24})$/i.exec(String(slug || ''));
    return talalat ? talalat[1] : null;
};

module.exports = { slugify, autoSlug, alkatreszSlug, idSlugbol };
