import { autoValasztasiLehetosegek } from './autoValasztasiLehetosegek';

export { autoValasztasiLehetosegek };

export const szamMezok = ['evjarat', 'vetel_ar', 'teljesitmeny', 'hengerur_tartalom', 'kmora_allas'];

// [mező, címke, placeholder, típus]
export const autoMezok = [
    ['marka', 'Márka', 'pl. BMW', 'text'],
    ['modell', 'Modell', 'pl. 320d', 'text'],
    ['szin', 'Szín', 'Válassz színt', 'select'],
    ['kivitel', 'Kivitel', 'Válassz kivitelt', 'select'],
    ['uzemanyag', 'Üzemanyag', 'Válassz üzemanyagot', 'select'],
    ['szarmazasi_hely', 'Származási hely', 'Válassz származási helyet', 'select'],
    ['evjarat', 'Évjárat', 'pl. 2020', 'number'],
    ['vetel_ar', 'Vételár (Ft)', 'pl. 8990000', 'number'],
    ['teljesitmeny', 'Teljesítmény (LE)', 'pl. 190', 'number'],
    ['hengerur_tartalom', 'Hengerűrtartalom (cm³)', 'pl. 1995', 'number'],
    ['kmora_allas', 'Kilométeróra állása (km)', 'pl. 85000', 'number'],
    ['elado_nev', 'Eladó neve', 'pl. Kovács Péter', 'text', { opcionalis: true }],
    ['elado_telefonszam', 'Eladó telefonszáma', 'pl. +36 30 123 4567', 'tel', { opcionalis: true }],
    ['leiras', 'Leírás', 'Írj az autó állapotáról, felszereltségéről vagy előéletéről…', 'textarea', { opcionalis: true }],
];

export const uresAutoAdatok = Object.fromEntries(autoMezok.map(([mezo]) => [mezo, '']));

export const autoAdatokbol = (auto) => (
    Object.fromEntries(autoMezok.map(([mezo]) => [mezo, auto[mezo] ?? '']))
);

export const egyediMezokAdatokbol = (adatok) => Object.fromEntries(
    autoMezok
        .filter(([, , , tipus]) => tipus === 'select')
        .map(([mezo]) => [mezo, Boolean(adatok[mezo]) && !autoValasztasiLehetosegek[mezo].includes(adatok[mezo])]),
);

export const kuldhetoAdatok = (adatok) => {
    const payload = { ...adatok };
    for (const mezo of szamMezok) payload[mezo] = Number(payload[mezo]);
    return payload;
};

const szamFormatter = new Intl.NumberFormat('hu-HU');
export const formatSzam = (ertek) => szamFormatter.format(ertek);
export const formatAr = (ertek) => (ertek ? `${szamFormatter.format(ertek)} Ft` : 'Érdeklődj');

export const MAX_KEP_MERET = 4 * 1024 * 1024;

export const kepBeolvasasa = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        reject(new Error('Kérlek, képfájlt válassz.'));
        return;
    }
    if (file.size > MAX_KEP_MERET) {
        reject(new Error('A kép mérete legfeljebb 4 MB lehet.'));
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('A kép beolvasása nem sikerült.'));
    reader.readAsDataURL(file);
});
