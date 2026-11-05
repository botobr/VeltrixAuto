import { CEG } from './ceg';

/** Annuitásos törlesztőrészlet; a THM-et éves effektív kamatként kezeljük. */
export const haviReszlet = (hitelosszeg, honap, thm) => {
    if (hitelosszeg <= 0) return 0;
    const r = (1 + thm / 100) ** (1 / 12) - 1;
    if (r === 0) return hitelosszeg / honap;
    return (hitelosszeg * r) / (1 - (1 + r) ** -honap);
};

/** „Havi X Ft-tól” – 30% önerő, 96 hónap, alapértelmezett THM. */
export const legkisebbHaviReszlet = (ar) => Math.round(haviReszlet(ar * 0.7, 96, CEG.thm));
