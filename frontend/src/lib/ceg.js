// A cég adatai.
// FONTOS: ezek csak minta adatok, élesítés előtt ki kell cserélni a valódiakra!
// A telephelyeket (cím, nyitvatartás, telefon) az admin felületen lehet szerkeszteni.
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
    // a hitelkalkulátor THM-je (%)
    thm: 9.9,
    // Messenger megosztáshoz kell (nem kötelező)
    facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
    // mikortól érvényesek a jogi dokumentumok
    jogiDatum: '2026. november 20.',
};
