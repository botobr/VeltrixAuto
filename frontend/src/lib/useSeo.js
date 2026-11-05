import { useEffect } from 'react';
import { CEG } from './ceg';

const ALAP_CIM = 'Veltrix Autók – válogatott használt autók';
const ALAP_LEIRAS = 'Válogatott használt és prémium autók részletes adatlappal, átlátható árakkal, finanszírozással és garanciával.';

const metaBeallitasa = (attributum, kulcs, ertek) => {
    let elem = document.head.querySelector(`meta[${attributum}="${kulcs}"]`);
    if (!ertek) {
        elem?.remove();
        return;
    }
    if (!elem) {
        elem = document.createElement('meta');
        elem.setAttribute(attributum, kulcs);
        document.head.appendChild(elem);
    }
    elem.setAttribute('content', ertek);
};

const linkBeallitasa = (rel, href) => {
    let elem = document.head.querySelector(`link[rel="${rel}"]`);
    if (!href) {
        elem?.remove();
        return;
    }
    if (!elem) {
        elem = document.createElement('link');
        elem.setAttribute('rel', rel);
        document.head.appendChild(elem);
    }
    elem.setAttribute('href', href);
};

/**
 * Oldalankénti cím, leírás, canonical URL, Open Graph adatok és strukturált adat (JSON-LD).
 * A közösségi oldalak robotjai nem futtatnak JavaScriptet – nekik a backend
 * /megosztas útvonala adja ki ugyanezeket az adatokat.
 */
export const useSeo = ({ cim, leiras, kep, utvonal, tipus = 'website', jsonLd, noindex = false } = {}) => {
    const jsonLdSzoveg = jsonLd ? JSON.stringify(jsonLd) : '';

    useEffect(() => {
        const teljesCim = cim ? `${cim} | ${CEG.nev}` : ALAP_CIM;
        const url = utvonal !== undefined ? `${window.location.origin}${utvonal}` : null;

        document.title = teljesCim;
        metaBeallitasa('name', 'description', leiras || ALAP_LEIRAS);
        metaBeallitasa('name', 'robots', noindex ? 'noindex, nofollow' : null);
        metaBeallitasa('property', 'og:title', teljesCim);
        metaBeallitasa('property', 'og:description', leiras || ALAP_LEIRAS);
        metaBeallitasa('property', 'og:type', tipus);
        metaBeallitasa('property', 'og:image', kep || null);
        metaBeallitasa('property', 'og:url', url);
        linkBeallitasa('canonical', url);

        let script = null;
        if (jsonLdSzoveg) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = jsonLdSzoveg;
            script.dataset.seo = 'oldal';
            document.head.appendChild(script);
        }
        return () => script?.remove();
    }, [cim, leiras, kep, utvonal, tipus, jsonLdSzoveg, noindex]);
};
