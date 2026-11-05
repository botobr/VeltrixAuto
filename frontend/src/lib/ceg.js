/*
 * A kereskedés adatai egy helyen.
 * FONTOS: az alábbi jogi és elérhetőségi adatok MINTAÉRTÉKEK – élesítés előtt
 * cserélni kell őket a valós cégadatokra. A telephelyek (cím, nyitvatartás,
 * telefon) az admin felületen, az adatbázisban kezelhetők.
 */
export const CEG = {
    nev: 'Veltrix Autók',
    jogiNev: 'Veltrix Autó Kft.',
    szekhely: '1000 Budapest, Minta utca 1.',
    cegjegyzekszam: '01-09-000000',
    adoszam: '00000000-0-00',
    email: 'info@veltrix.hu',
    telefon: '+36 1 000 0000',
    adatvedelmiEmail: 'adatvedelem@veltrix.hu',
    tarhelySzolgaltato: 'a tárhelyszolgáltató neve és címe',
    // A hitelkalkulátor alapértelmezett, tájékoztató jellegű THM-je (%).
    thm: 9.9,
    // Facebook Messenger asztali megosztáshoz (opcionális): https://developers.facebook.com/apps
    facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
    // A jogi dokumentumok hatálybalépése.
    jogiDatum: '2026. november 5.',
};
