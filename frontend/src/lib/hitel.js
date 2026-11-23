import { CEG } from './ceg';

// Havi törlesztőrészlet kiszámítása (annuitásos hitel).
// A THM-et éves kamatként vesszük, ebből számoljuk ki a havi kamatot.
export const haviReszlet = (hitelosszeg, honap, thm) => {
    if (hitelosszeg <= 0) {
        return 0;
    }
    const haviKamat = Math.pow(1 + thm / 100, 1 / 12) - 1;
    if (haviKamat === 0) {
        return hitelosszeg / honap;
    }
    return (hitelosszeg * haviKamat) / (1 - Math.pow(1 + haviKamat, -honap));
};

// "Havi X Ft-tól": 30% önerővel, 96 hónapra
export const legkisebbHaviReszlet = (ar) => {
    return Math.round(haviReszlet(ar * 0.7, 96, CEG.thm));
};
