import { useEffect } from 'react';
import { CEG } from './ceg';

const ALAP_CIM = 'Veltrix Autók – válogatott használt autók';
const ALAP_LEIRAS = 'Válogatott használt és prémium autók részletes adatlappal, átlátható árakkal, finanszírozással és garanciával.';

// egy <meta> címke beállítása (ha nincs érték, töröljük)
const metaBeallitasa = (attributum, kulcs, ertek) => {
    let elem = document.head.querySelector('meta[' + attributum + '="' + kulcs + '"]');
    if (!ertek) {
        if (elem) {
            elem.remove();
        }
        return;
    }
    if (!elem) {
        elem = document.createElement('meta');
        elem.setAttribute(attributum, kulcs);
        document.head.appendChild(elem);
    }
    elem.setAttribute('content', ertek);
};

// egy <link> címke beállítása (pl. canonical)
const linkBeallitasa = (rel, href) => {
    let elem = document.head.querySelector('link[rel="' + rel + '"]');
    if (!href) {
        if (elem) {
            elem.remove();
        }
        return;
    }
    if (!elem) {
        elem = document.createElement('link');
        elem.setAttribute('rel', rel);
        document.head.appendChild(elem);
    }
    elem.setAttribute('href', href);
};

// Az oldal címe, leírása és a keresőknek / Facebooknak szóló adatok beállítása.
// (A Facebook nem futtat JavaScriptet, neki a backend /megosztas oldala adja ugyanezt.)
export const useSeo = ({ cim, leiras, kep, utvonal, tipus = 'website', jsonLd, noindex = false } = {}) => {
    // a JSON-LD-t szövegként adjuk át a useEffect-nek, hogy ne fusson le minden rendereléskor
    let jsonLdSzoveg = '';
    if (jsonLd) {
        jsonLdSzoveg = JSON.stringify(jsonLd);
    }

    useEffect(() => {
        let teljesCim = ALAP_CIM;
        if (cim) {
            teljesCim = cim + ' | ' + CEG.nev;
        }
        let url = null;
        if (utvonal !== undefined) {
            url = window.location.origin + utvonal;
        }

        document.title = teljesCim;
        metaBeallitasa('name', 'description', leiras || ALAP_LEIRAS);
        metaBeallitasa('name', 'robots', noindex ? 'noindex, nofollow' : null);
        metaBeallitasa('property', 'og:title', teljesCim);
        metaBeallitasa('property', 'og:description', leiras || ALAP_LEIRAS);
        metaBeallitasa('property', 'og:type', tipus);
        metaBeallitasa('property', 'og:image', kep || null);
        metaBeallitasa('property', 'og:url', url);
        linkBeallitasa('canonical', url);

        // strukturált adat a Google-nek (pl. termék ára)
        let script = null;
        if (jsonLdSzoveg) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = jsonLdSzoveg;
            script.dataset.seo = 'oldal';
            document.head.appendChild(script);
        }

        return () => {
            if (script) {
                script.remove();
            }
        };
    }, [cim, leiras, kep, utvonal, tipus, jsonLdSzoveg, noindex]);
};
