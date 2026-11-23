const crypto = require('node:crypto');
const express = require('express');
const AlkatreszModel = require('../models/Alkatresz');
const AutoModel = require('../models/Auto');
const { publikusFeltetelek } = require('../utils/autoSzuro');
const { oldalUrl } = require('../utils/email');
const { alkatreszSlug, autoSlug, idSlugbol } = require('../utils/slug');

const router = express.Router();

const STATIKUS_OLDALAK = ['/', '/autok', '/alkatreszek', '/rolunk', '/szolgaltatasok', '/aszf', '/adatkezeles', '/cookie'];

// a HTML-be írt szövegben a speciális karaktereket le kell cserélni (XSS ellen)
const htmlEscape = (szoveg) => {
    if (szoveg === null || szoveg === undefined) {
        return '';
    }
    return String(szoveg)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const arFormatum = new Intl.NumberFormat('hu-HU');

// robots.txt a keresőknek (mit ne indexeljenek)
router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send([
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /fiok',
        'Disallow: /belepes',
        'Disallow: /regisztracio',
        'Disallow: /osszehasonlitas',
        'Disallow: /kosar',
        'Disallow: /penztar',
        'Disallow: /rendeles/',
        'Disallow: /megosztas/',
        '',
        'Sitemap: ' + oldalUrl() + '/sitemap.xml',
        '',
    ].join('\n'));
});

// egy oldal a sitemap-ben
const sitemapBejegyzes = (utvonal, modositva, prioritas) => {
    const sorok = [];
    sorok.push('  <url>');
    sorok.push('    <loc>' + htmlEscape(oldalUrl() + utvonal) + '</loc>');
    if (modositva) {
        sorok.push('    <lastmod>' + new Date(modositva).toISOString() + '</lastmod>');
    }
    sorok.push('    <priority>' + prioritas + '</priority>');
    sorok.push('  </url>');
    return sorok.join('\n');
};

// sitemap.xml a keresőknek: a fix oldalak, az autók és az alkatrészek
router.get('/sitemap.xml', async (req, res) => {
    const autok = await AutoModel.find({ $and: [...publikusFeltetelek(), { statusz: { $ne: 'elkelt' } }] })
        .select('marka modell evjarat updatedAt')
        .sort({ updatedAt: -1 })
        .limit(45000);
    const alkatreszek = await AlkatreszModel.find({ lathato: true })
        .select('nev gyarto updatedAt')
        .sort({ updatedAt: -1 })
        .limit(4000);

    const sorok = [];
    sorok.push('<?xml version="1.0" encoding="UTF-8"?>');
    sorok.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const utvonal of STATIKUS_OLDALAK) {
        let prioritas = '0.5';
        if (utvonal === '/' || utvonal === '/autok' || utvonal === '/alkatreszek') {
            prioritas = '1.0';
        }
        sorok.push(sitemapBejegyzes(utvonal, null, prioritas));
    }
    for (const auto of autok) {
        sorok.push(sitemapBejegyzes('/autok/' + autoSlug(auto), auto.updatedAt, '0.8'));
    }
    for (const alkatresz of alkatreszek) {
        sorok.push(sitemapBejegyzes('/alkatreszek/' + alkatreszSlug(alkatresz), alkatresz.updatedAt, '0.7'));
    }
    sorok.push('</urlset>');
    const xml = sorok.join('\n');

    res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
});

// Megosztás oldal Facebookhoz / Messengerhez.
// A Facebook nem futtat JavaScriptet, ezért itt a szerveren rakjuk bele az oldal adatait (og: címkék),
// a látogatót pedig rögtön átirányítjuk az autó oldalára.
router.get('/megosztas/autok/:slug', async (req, res) => {
    const id = idSlugbol(req.params.slug);
    let auto = null;
    if (id) {
        auto = await AutoModel.findOne({ $and: [{ _id: id }, ...publikusFeltetelek()] });
    }
    if (!auto) {
        return res.redirect(302, oldalUrl() + '/autok');
    }

    const cel = oldalUrl() + '/autok/' + autoSlug(auto);
    const cim = auto.marka + ' ' + auto.modell + ' (' + auto.evjarat + ') – ' + arFormatum.format(auto.vetel_ar) + ' Ft | Veltrix Autók';

    const leirasReszek = [arFormatum.format(auto.kmora_allas) + ' km', auto.uzemanyag, auto.teljesitmeny + ' LE'];
    if (auto.valto) {
        leirasReszek.push(auto.valto);
    }
    if (auto.kivitel) {
        leirasReszek.push(auto.kivitel);
    }
    const leiras = leirasReszek.filter((resz) => resz).join(' · ');

    let kep = auto.kep || '';
    if (auto.kepek.length > 0) {
        kep = auto.kepek[0].url;
    }

    // ez a backend egyetlen HTML oldala, a szkript csak a nonce-szal futhat (CSP)
    const nonce = crypto.randomBytes(16).toString('base64');
    res.set('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; img-src https: data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
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
<script nonce="${nonce}">location.replace(${JSON.stringify(cel).replace(/</g, '\\u003c')});</script>
</body>
</html>`);
});

module.exports = router;
