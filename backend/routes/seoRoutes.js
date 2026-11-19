const express = require('express');
const AlkatreszModel = require('../models/Alkatresz');
const AutokModel = require('../models/Autok');
const { publikusFeltetelek } = require('../utils/autoSzuro');
const { oldalUrl } = require('../utils/email');
const { alkatreszSlug, autoSlug, idSlugbol } = require('../utils/slug');

const router = express.Router();

const STATIKUS_OLDALAK = ['/', '/autok', '/alkatreszek', '/rolunk', '/szolgaltatasok', '/aszf', '/adatkezeles', '/cookie'];

const htmlEscape = (szoveg) => String(szoveg ?? '').replace(/[&<>"']/g, (karakter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[karakter]));

const arFormatum = new Intl.NumberFormat('hu-HU');

router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send([
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /fiok',
        'Disallow: /login',
        'Disallow: /regisztracio',
        'Disallow: /osszehasonlitas',
        'Disallow: /kosar',
        'Disallow: /penztar',
        'Disallow: /rendeles/',
        'Disallow: /megosztas/',
        '',
        `Sitemap: ${oldalUrl()}/sitemap.xml`,
        '',
    ].join('\n'));
});

router.get('/sitemap.xml', async (req, res) => {
    const autok = await AutokModel.find({ $and: [...publikusFeltetelek(), { statusz: { $ne: 'elkelt' } }] })
        .select('marka modell evjarat updatedAt')
        .sort({ updatedAt: -1 })
        .limit(45000);
    const alkatreszek = await AlkatreszModel.find({ lathato: true }).select('nev gyarto updatedAt').sort({ updatedAt: -1 }).limit(4000);

    const bejegyzes = (utvonal, modositva, prioritas) => [
        '  <url>',
        `    <loc>${htmlEscape(oldalUrl() + utvonal)}</loc>`,
        modositva ? `    <lastmod>${new Date(modositva).toISOString()}</lastmod>` : null,
        `    <priority>${prioritas}</priority>`,
        '  </url>',
    ].filter(Boolean).join('\n');

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...STATIKUS_OLDALAK.map((utvonal) => bejegyzes(utvonal, null, ['/', '/autok', '/alkatreszek'].includes(utvonal) ? '1.0' : '0.5')),
        ...autok.map((auto) => bejegyzes(`/autok/${autoSlug(auto)}`, auto.updatedAt, '0.8')),
        ...alkatreszek.map((a) => bejegyzes(`/alkatreszek/${alkatreszSlug(a)}`, a.updatedAt, '0.7')),
        '</urlset>',
    ].join('\n');

    res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
});

/**
 * Megosztási oldal közösségi oldalakhoz. A Facebook/Messenger robotja nem futtat
 * JavaScriptet, ezért az Open Graph adatokat szerveroldalon adjuk ki, a látogatót
 * pedig azonnal továbbirányítjuk a valódi adatlapra.
 */
router.get('/megosztas/autok/:slug', async (req, res) => {
    const id = idSlugbol(req.params.slug);
    const auto = id ? await AutokModel.findOne({ $and: [{ _id: id }, ...publikusFeltetelek()] }) : null;
    if (!auto) {
        return res.redirect(302, `${oldalUrl()}/autok`);
    }

    const cel = `${oldalUrl()}/autok/${autoSlug(auto)}`;
    const cim = `${auto.marka} ${auto.modell} (${auto.evjarat}) – ${arFormatum.format(auto.vetel_ar)} Ft | Veltrix Autók`;
    const leiras = [
        `${arFormatum.format(auto.kmora_allas)} km`,
        auto.uzemanyag,
        `${auto.teljesitmeny} LE`,
        auto.valto,
        auto.kivitel,
    ].filter(Boolean).join(' · ');
    const kep = auto.kepek[0]?.url || auto.kep || '';

    res.set('Cache-Control', 'public, max-age=600').type('html').send(`<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<title>${htmlEscape(cim)}</title>
<meta name="description" content="${htmlEscape(leiras)}">
<link rel="canonical" href="${htmlEscape(cel)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Veltrix Autók">
<meta property="og:locale" content="hu_HU">
<meta property="og:title" content="${htmlEscape(cim)}">
<meta property="og:description" content="${htmlEscape(leiras)}">
<meta property="og:url" content="${htmlEscape(cel)}">
${kep ? `<meta property="og:image" content="${htmlEscape(kep)}">` : ''}
<meta property="product:price:amount" content="${auto.vetel_ar}">
<meta property="product:price:currency" content="HUF">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${htmlEscape(cel)}">
</head>
<body>
<p><a href="${htmlEscape(cel)}">${htmlEscape(cim)}</a></p>
<script>location.replace(${JSON.stringify(cel).replace(/</g, '\\u003c')});</script>
</body>
</html>`);
});

module.exports = router;
