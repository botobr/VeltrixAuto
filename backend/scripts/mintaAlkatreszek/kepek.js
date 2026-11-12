/*
 * Generált termékillusztrációk (SVG, 800×600) a minta-alkatrészekhez.
 * Minden rajz egyszerű vektorgrafika; a gyártó színével és nevével.
 * A Cloudinary feltöltéskor PNG-vé alakítja (lásd alkatreszekFeltoltese.js).
 */

const esc = (szoveg) => String(szoveg).replace(/[&<>"']/g, (k) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k]));

const SOTET = '#23262b';
const ACEL = '#8d949c';
const ACEL_V = '#c3c8ce';

/** Fémes függőleges / vízszintes színátmenetek. */
const defs = (szin) => `
<defs>
  <radialGradient id="hatter" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ece7da"/></radialGradient>
  <linearGradient id="fem" x1="0" x2="1"><stop offset="0" stop-color="#6d737a"/><stop offset=".35" stop-color="#e3e6e9"/><stop offset=".6" stop-color="#9aa1a8"/><stop offset="1" stop-color="#5d6268"/></linearGradient>
  <linearGradient id="femV" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e3e6e9"/><stop offset=".5" stop-color="#9aa1a8"/><stop offset="1" stop-color="#5d6268"/></linearGradient>
  <linearGradient id="szin" x1="0" x2="1"><stop offset="0" stop-color="${szin}" stop-opacity=".75"/><stop offset=".4" stop-color="${szin}"/><stop offset="1" stop-color="${szin}" stop-opacity=".7"/></linearGradient>
  <linearGradient id="szinV" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${szin}"/><stop offset="1" stop-color="${szin}" stop-opacity=".72"/></linearGradient>
  <linearGradient id="fekete" x1="0" x2="1"><stop offset="0" stop-color="#15171a"/><stop offset=".45" stop-color="#3a3e44"/><stop offset="1" stop-color="#121417"/></linearGradient>
  <linearGradient id="titan" x1="0" x2="1"><stop offset="0" stop-color="#5a4a7a"/><stop offset=".3" stop-color="#c9b8e8"/><stop offset=".55" stop-color="#7fa6d6"/><stop offset=".8" stop-color="#d9b77a"/><stop offset="1" stop-color="#5a4a7a"/></linearGradient>
  <filter id="arnyek" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".22"/></filter>
</defs>`;

const rugo = (x, y, szel, mag, menet, szin, vastag = 13) => {
    let ut = '';
    const lepes = mag / menet;
    for (let i = 0; i <= menet; i += 1) ut += `<ellipse cx="${x}" cy="${y + i * lepes}" rx="${szel / 2}" ry="${lepes * 0.32}" fill="none" stroke="${szin}" stroke-width="${vastag}" transform="rotate(-6 ${x} ${y + i * lepes})"/>`;
    return ut;
};

const RAJZOK = {
    futomu: () => `
      <rect x="352" y="70" width="96" height="18" rx="6" fill="url(#femV)"/>
      <rect x="372" y="88" width="56" height="22" rx="4" fill="${SOTET}"/>
      <rect x="388" y="105" width="24" height="120" fill="url(#fem)"/>
      <rect x="346" y="120" width="108" height="16" rx="5" fill="url(#szin)"/>
      ${rugo(400, 148, 112, 190, 6, 'url(#szin)')}
      <rect x="368" y="214" width="64" height="232" rx="10" fill="url(#fem)"/>
      <rect x="360" y="330" width="80" height="26" rx="6" fill="url(#szin)"/>
      <path d="M368 360h64l2 12h-68z" fill="${SOTET}" opacity=".5"/>
      <rect x="372" y="446" width="56" height="34" rx="6" fill="url(#femV)"/>
      <path d="M354 478h92v40c0 8-6 12-14 12h-64c-8 0-14-4-14-12z" fill="url(#fem)"/>
      <circle cx="378" cy="506" r="9" fill="#e9e5da"/><circle cx="422" cy="506" r="9" fill="#e9e5da"/>`,
    rugok: () => `
      <g>${rugo(300, 140, 120, 300, 7, 'url(#szin)', 15)}</g>
      <g>${rugo(500, 170, 108, 260, 6, 'url(#szin)', 14)}</g>`,
    stabilizator: () => `
      <path d="M150 380 C150 250 230 210 330 210 L470 210 C570 210 650 250 650 380" fill="none" stroke="url(#szinV)" stroke-width="30" stroke-linecap="round"/>
      <path d="M150 380 L120 470 M650 380 L680 470" stroke="url(#szinV)" stroke-width="30" stroke-linecap="round"/>
      <rect x="280" y="188" width="44" height="46" rx="8" fill="${SOTET}"/><rect x="476" y="188" width="44" height="46" rx="8" fill="${SOTET}"/>
      <circle cx="120" cy="472" r="20" fill="url(#fem)"/><circle cx="680" cy="472" r="20" fill="url(#fem)"/>`,
    szilent: () => `
      ${[0, 1, 2, 3].map((i) => `<g transform="translate(${210 + (i % 2) * 220} ${150 + Math.floor(i / 2) * 200})">
        <circle r="78" fill="url(#szinV)"/><circle r="44" fill="url(#fem)"/><circle r="22" fill="#e9e5da"/></g>`).join('')}`,
    merevito: () => `
      <rect x="140" y="270" width="520" height="34" rx="17" fill="url(#szinV)"/>
      <path d="M110 240h90l20 60-20 60h-90z" fill="url(#fem)"/><path d="M690 240h-90l-20 60 20 60h90z" fill="url(#fem)"/>
      <circle cx="140" cy="270" r="9" fill="${SOTET}"/><circle cx="140" cy="330" r="9" fill="${SOTET}"/><circle cx="660" cy="270" r="9" fill="${SOTET}"/><circle cx="660" cy="330" r="9" fill="${SOTET}"/>`,
    kuposSzuro: () => `
      <path d="M270 150 L530 150 L490 440 L310 440 Z" fill="url(#szin)"/>
      ${Array.from({ length: 13 }, (_, i) => { const t = i / 12; return `<line x1="${270 + t * 260}" y1="150" x2="${310 + t * 180}" y2="440" stroke="#000" stroke-opacity=".22" stroke-width="5"/>`; }).join('')}
      <ellipse cx="400" cy="150" rx="132" ry="26" fill="url(#fem)"/><ellipse cx="400" cy="150" rx="70" ry="12" fill="${SOTET}" opacity=".35"/>
      <rect x="300" y="436" width="200" height="26" rx="6" fill="url(#fem)"/>
      <rect x="348" y="460" width="104" height="74" rx="10" fill="url(#fekete)"/><rect x="340" y="490" width="120" height="14" rx="4" fill="url(#fem)"/>`,
    panelSzuro: () => `
      <g transform="rotate(-8 400 300)">
      <rect x="170" y="150" width="460" height="300" rx="22" fill="url(#fekete)"/>
      <rect x="198" y="176" width="404" height="248" rx="10" fill="url(#szin)"/>
      ${Array.from({ length: 16 }, (_, i) => `<path d="M${212 + i * 25} 180 l12 120 l-12 120" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="6"/>`).join('')}
      <rect x="198" y="292" width="404" height="16" fill="#ffffff" opacity=".35"/></g>`,
    szivokit: () => `
      <path d="M160 470 C160 330 250 260 380 260 L520 260" fill="none" stroke="url(#szinV)" stroke-width="70" stroke-linecap="round"/>
      <rect x="128" y="440" width="64" height="70" rx="10" fill="url(#fekete)"/>
      <g transform="translate(150 -40)">
        <path d="M370 210 L560 170 L560 430 L370 390 Z" fill="url(#fem)"/>
        ${Array.from({ length: 10 }, (_, i) => `<line x1="${380 + i * 19}" y1="${208 - i * 4}" x2="${380 + i * 19}" y2="${392 + i * 4}" stroke="#000" stroke-opacity=".2" stroke-width="5"/>`).join('')}
        <ellipse cx="560" cy="300" rx="22" ry="130" fill="url(#femV)"/>
      </g>`,
    hovedo: () => `
      <path d="M190 210 L520 170 L620 230 L620 450 L290 490 L190 430 Z" fill="url(#fekete)"/>
      <path d="M190 210 L520 170 L620 230 L290 270 Z" fill="#3a3e44"/>
      <path d="M290 270 L620 230 L620 450 L290 490 Z" fill="url(#szinV)" opacity=".85"/>
      <circle cx="455" cy="360" r="62" fill="${SOTET}"/><circle cx="455" cy="360" r="40" fill="url(#fem)"/>`,
    kipufogo: () => `
      <rect x="150" y="200" width="420" height="190" rx="95" fill="url(#femV)"/>
      <ellipse cx="160" cy="295" rx="26" ry="95" fill="url(#fem)"/>
      <rect x="60" y="275" width="110" height="40" rx="20" fill="url(#fem)"/>
      <rect x="560" y="226" width="150" height="58" rx="29" fill="url(#fem)"/><rect x="560" y="306" width="150" height="58" rx="29" fill="url(#fem)"/>
      <ellipse cx="710" cy="255" rx="16" ry="29" fill="url(#fekete)"/><ellipse cx="710" cy="335" rx="16" ry="29" fill="url(#fekete)"/>
      <rect x="250" y="270" width="220" height="50" rx="10" fill="url(#szin)" opacity=".85"/>`,
    titanKipufogo: () => `
      <rect x="150" y="200" width="420" height="190" rx="95" fill="url(#titan)"/>
      <ellipse cx="160" cy="295" rx="26" ry="95" fill="url(#fem)"/>
      <rect x="60" y="275" width="110" height="40" rx="20" fill="url(#titan)"/>
      <rect x="560" y="236" width="170" height="118" rx="59" fill="url(#fekete)"/>
      <ellipse cx="730" cy="295" rx="26" ry="59" fill="#0b0c0e"/><ellipse cx="730" cy="295" rx="16" ry="44" fill="url(#titan)"/>`,
    vegcso: () => `
      <g transform="rotate(-14 400 300)">
      <rect x="170" y="230" width="420" height="140" rx="20" fill="url(#femV)"/>
      <ellipse cx="590" cy="300" rx="44" ry="70" fill="url(#fem)"/><ellipse cx="590" cy="300" rx="30" ry="54" fill="url(#fekete)"/>
      <rect x="120" y="262" width="80" height="76" rx="12" fill="url(#fem)"/>
      <rect x="300" y="240" width="160" height="120" rx="14" fill="url(#szin)" opacity=".55"/></g>`,
    downpipe: () => `
      <path d="M200 150 C200 330 300 420 600 420" fill="none" stroke="url(#fem)" stroke-width="80" stroke-linecap="butt"/>
      <rect x="140" y="120" width="120" height="30" rx="8" fill="url(#femV)"/>
      <rect x="590" y="370" width="30" height="100" rx="8" fill="url(#femV)"/>
      <ellipse cx="410" cy="388" rx="70" ry="44" fill="url(#szin)" opacity=".8"/>`,
    chipbox: () => `
      <rect x="230" y="190" width="340" height="210" rx="26" fill="url(#fekete)" filter="url(#arnyek)"/>
      <rect x="260" y="220" width="280" height="12" rx="6" fill="url(#szin)"/>
      ${[0, 1, 2, 3].map((i) => `<circle cx="${300 + i * 34}" cy="360" r="9" fill="${i < 3 ? 'url(#szin)' : '#555'}"/>`).join('')}
      <path d="M230 300 C150 300 160 420 100 430" fill="none" stroke="${SOTET}" stroke-width="14"/>
      <path d="M570 300 C660 300 640 430 710 440" fill="none" stroke="${SOTET}" stroke-width="14"/>
      <rect x="82" y="420" width="40" height="30" rx="5" fill="#555"/><rect x="694" y="428" width="40" height="30" rx="5" fill="#555"/>`,
    intercooler: () => `
      <rect x="200" y="170" width="400" height="260" rx="10" fill="url(#fem)"/>
      ${Array.from({ length: 26 }, (_, i) => `<line x1="200" y1="${180 + i * 9.6}" x2="600" y2="${180 + i * 9.6}" stroke="#4d5359" stroke-width="3"/>`).join('')}
      <path d="M140 160 h60 v280 h-60 l-20 -40 v-200z" fill="url(#szinV)"/>
      <path d="M660 160 h-60 v280 h60 l20 -40 v-200z" fill="url(#szinV)"/>
      <rect x="92" y="186" width="50" height="60" rx="14" fill="url(#femV)"/><rect x="658" y="354" width="50" height="60" rx="14" fill="url(#femV)"/>`,
    tomlo: () => `
      <path d="M170 180 C330 180 300 420 470 420" fill="none" stroke="url(#szinV)" stroke-width="64" stroke-linecap="round"/>
      <path d="M430 170 C610 170 600 330 650 430" fill="none" stroke="url(#szinV)" stroke-width="54" stroke-linecap="round"/>
      <rect x="150" y="140" width="22" height="80" rx="6" fill="url(#fem)"/><rect x="456" y="380" width="22" height="80" rx="6" fill="url(#fem)"/>`,
    szelep: () => `
      <rect x="300" y="140" width="200" height="200" rx="30" fill="url(#szinV)" filter="url(#arnyek)"/>
      <circle cx="400" cy="240" r="62" fill="url(#fem)"/><circle cx="400" cy="240" r="24" fill="${SOTET}"/>
      <rect x="350" y="336" width="100" height="120" rx="12" fill="url(#fem)"/>
      <rect x="250" y="250" width="60" height="50" rx="10" fill="url(#fem)"/>`,
    gyertya: () => `
      ${[0, 1, 2, 3].map((i) => `<g transform="translate(${190 + i * 140} 120) rotate(${i % 2 ? 5 : -5})">
        <rect x="-26" y="0" width="52" height="120" rx="20" fill="#f2f2f2" stroke="#cfcfcf" stroke-width="3"/>
        <rect x="-22" y="20" width="44" height="8" fill="url(#szin)"/>
        <path d="M-40 120h80l-10 40h-60z" fill="url(#fem)"/>
        <rect x="-16" y="160" width="32" height="110" fill="url(#fem)"/>
        ${[0, 1, 2, 3, 4, 5].map((j) => `<line x1="-16" y1="${172 + j * 16}" x2="16" y2="${180 + j * 16}" stroke="#555" stroke-width="3"/>`).join('')}
        <rect x="-4" y="270" width="8" height="26" fill="#777"/></g>`).join('')}`,
    huto: () => `
      <rect x="180" y="150" width="440" height="300" rx="12" fill="url(#fem)"/>
      ${Array.from({ length: 30 }, (_, i) => `<line x1="${200 + i * 13.8}" y1="160" x2="${200 + i * 13.8}" y2="440" stroke="#5b6167" stroke-width="3"/>`).join('')}
      <rect x="170" y="130" width="460" height="34" rx="8" fill="url(#szinV)"/><rect x="170" y="436" width="460" height="34" rx="8" fill="url(#szinV)"/>
      <rect x="560" y="100" width="40" height="40" rx="8" fill="url(#femV)"/>`,
    tartaly: () => `
      <rect x="300" y="160" width="200" height="300" rx="30" fill="url(#fem)"/>
      <rect x="300" y="250" width="200" height="90" fill="url(#szin)" opacity=".85"/>
      <rect x="330" y="120" width="140" height="46" rx="12" fill="url(#fekete)"/>
      <rect x="250" y="170" width="56" height="30" rx="10" fill="url(#femV)"/><rect x="494" y="170" width="56" height="30" rx="10" fill="url(#femV)"/>`,
    ora: () => `
      <circle cx="400" cy="290" r="190" fill="url(#fekete)" filter="url(#arnyek)"/>
      <circle cx="400" cy="290" r="166" fill="#101215"/>
      ${Array.from({ length: 11 }, (_, i) => { const a = (-210 + i * 24) * Math.PI / 180; return `<line x1="${400 + Math.cos(a) * 140}" y1="${290 + Math.sin(a) * 140}" x2="${400 + Math.cos(a) * 160}" y2="${290 + Math.sin(a) * 160}" stroke="${i > 7 ? 'url(#szin)' : '#e8e8e8'}" stroke-width="6"/>`; }).join('')}
      <line x1="400" y1="290" x2="${400 + Math.cos(-0.5) * 130}" y2="${290 + Math.sin(-0.5) * 130}" stroke="url(#szin)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="400" cy="290" r="18" fill="url(#fem)"/>`,
    fektarcsa: () => `
      <circle cx="380" cy="300" r="210" fill="url(#fem)" filter="url(#arnyek)"/>
      <circle cx="380" cy="300" r="96" fill="url(#femV)"/><circle cx="380" cy="300" r="40" fill="#e9e5da"/>
      ${Array.from({ length: 5 }, (_, i) => { const a = i * 72 * Math.PI / 180; return `<circle cx="${380 + Math.cos(a) * 66}" cy="${300 + Math.sin(a) * 66}" r="9" fill="#e9e5da"/>`; }).join('')}
      ${Array.from({ length: 24 }, (_, i) => { const a = i * 15 * Math.PI / 180; const r = 130 + (i % 3) * 22; return `<circle cx="${380 + Math.cos(a) * r}" cy="${300 + Math.sin(a) * r}" r="7" fill="#4d5359"/>`; }).join('')}
      <path d="M520 130 C640 190 650 410 520 470 L490 430 C580 380 580 220 490 170 Z" fill="url(#szinV)"/>`,
    fekbetet: () => `
      <g transform="rotate(-10 400 300)">
      ${[0, 1].map((i) => `<g transform="translate(0 ${i * 170})">
        <path d="M190 170 Q400 100 610 170 L590 250 Q400 200 210 250 Z" fill="url(#fem)"/>
        <path d="M210 190 Q400 130 590 190 L578 236 Q400 192 222 236 Z" fill="url(#szinV)"/>
        <line x1="400" y1="150" x2="400" y2="222" stroke="#000" stroke-opacity=".35" stroke-width="5"/></g>`).join('')}</g>`,
    fekkit: () => `
      <circle cx="350" cy="300" r="200" fill="url(#fem)" filter="url(#arnyek)"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<path d="M${350 + Math.cos(a) * 110} ${300 + Math.sin(a) * 110} L${350 + Math.cos(a + 0.35) * 185} ${300 + Math.sin(a + 0.35) * 185}" stroke="#4d5359" stroke-width="6"/>`; }).join('')}
      <circle cx="350" cy="300" r="92" fill="url(#szinV)"/><circle cx="350" cy="300" r="36" fill="#e9e5da"/>
      <path d="M470 110 C640 170 660 430 470 490 L430 440 C560 380 560 220 430 160 Z" fill="url(#szinV)"/>
      <text x="548" y="306" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#fff" transform="rotate(80 548 300)" text-anchor="middle">GT</text>`,
    fekcso: () => `
      ${[0, 1, 2, 3].map((i) => `<path d="M${170 + i * 30} ${150 + i * 70} C ${360} ${110 + i * 70}, ${420} ${300 + i * 40}, ${630 - i * 20} ${180 + i * 75}" fill="none" stroke="url(#szinV)" stroke-width="16" stroke-linecap="round"/>
        <rect x="${150 + i * 30}" y="${136 + i * 70}" width="34" height="28" rx="5" fill="url(#fem)"/>`).join('')}`,
    folyadek: () => `
      <path d="M320 170 h160 v40 c40 20 50 60 50 100 v170 c0 20-14 30-30 30 h-200 c-16 0-30-10-30-30 v-170 c0-40 10-80 50-100 z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <rect x="350" y="120" width="100" height="56" rx="10" fill="url(#szinV)"/>
      <rect x="290" y="300" width="220" height="140" rx="10" fill="url(#szinV)"/>
      <rect x="306" y="330" width="188" height="16" rx="4" fill="#fff" opacity=".85"/><rect x="306" y="360" width="140" height="10" rx="4" fill="#fff" opacity=".6"/>`,
    felni: (k) => `
      <circle cx="400" cy="300" r="240" fill="url(#fekete)" filter="url(#arnyek)"/>
      <circle cx="400" cy="300" r="180" fill="${k.felniSzin || 'url(#fem)'}"/>
      <circle cx="400" cy="300" r="164" fill="#1d1f23"/>
      ${Array.from({ length: k.kullok || 10 }, (_, i) => { const a = i * (360 / (k.kullok || 10)); return `<path d="M400 300 L392 ${300 - 50} L384 ${300 - 158} L416 ${300 - 158} L408 ${300 - 50} Z" fill="${k.felniSzin || 'url(#fem)'}" transform="rotate(${a} 400 300)"/>`; }).join('')}
      <circle cx="400" cy="300" r="58" fill="${k.felniSzin || 'url(#fem)'}"/><circle cx="400" cy="300" r="22" fill="url(#szinV)"/>
      ${Array.from({ length: 5 }, (_, i) => { const a = (i * 72 - 90) * Math.PI / 180; return `<circle cx="${400 + Math.cos(a) * 38}" cy="${300 + Math.sin(a) * 38}" r="6" fill="#1d1f23"/>`; }).join('')}`,
    gumi: () => `
      <circle cx="400" cy="300" r="240" fill="url(#fekete)" filter="url(#arnyek)"/>
      ${Array.from({ length: 48 }, (_, i) => `<rect x="396" y="62" width="8" height="34" fill="#4a4e54" transform="rotate(${i * 7.5} 400 300)"/>`).join('')}
      <circle cx="400" cy="300" r="160" fill="#2b2e33"/><circle cx="400" cy="300" r="120" fill="url(#hatter)"/>
      <path d="M260 230 A160 160 0 0 1 540 230" fill="none" stroke="url(#szin)" stroke-width="10"/>`,
    tavtarto: () => `
      ${[0, 1].map((i) => `<g transform="translate(${260 + i * 280} 300)">
        <circle r="150" fill="url(#fem)" filter="url(#arnyek)"/><circle r="56" fill="#e9e5da"/>
        ${Array.from({ length: 5 }, (_, j) => { const a = (j * 72 - 90) * Math.PI / 180; return `<circle cx="${Math.cos(a) * 100}" cy="${Math.sin(a) * 100}" r="13" fill="url(#szinV)"/>`; }).join('')}</g>`).join('')}`,
    csavar: () => `
      ${Array.from({ length: 10 }, (_, i) => `<g transform="translate(${170 + (i % 5) * 115} ${170 + Math.floor(i / 5) * 210})">
        <path d="M-34 0 h68 l10 30 -10 30 h-68 l-10 -30z" fill="url(#szinV)"/>
        <rect x="-18" y="58" width="36" height="110" fill="url(#fem)"/>
        ${[0, 1, 2, 3, 4, 5].map((j) => `<line x1="-18" y1="${70 + j * 16}" x2="18" y2="${78 + j * 16}" stroke="#555" stroke-width="3"/>`).join('')}</g>`).join('')}`,
    splitter: () => `
      <path d="M90 330 C200 300 600 300 710 330 L690 380 C580 360 220 360 110 380 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <path d="M110 380 C220 360 580 360 690 380 L700 396 C580 380 220 380 100 396 Z" fill="url(#szinV)"/>
      <path d="M90 330 L60 300 L70 360 Z M710 330 L740 300 L730 360 Z" fill="url(#fekete)"/>`,
    diffuzor: () => `
      <path d="M120 250 L680 250 L640 420 L160 420 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${230 + i * 85} 250 L${230 + i * 85} 430 L${240 + i * 85} 430 L${240 + i * 85} 250 Z" fill="#3a3e44"/>`).join('')}
      <rect x="150" y="410" width="500" height="12" rx="4" fill="url(#szin)"/>`,
    kuszob: () => `
      <path d="M80 280 L720 260 L720 320 L80 350 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <path d="M80 350 L720 320 L716 334 L80 366 Z" fill="url(#szinV)"/>`,
    szarny: () => `
      <path d="M110 190 C300 150 500 150 690 190 L690 232 C500 210 300 210 110 232 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <rect x="96" y="160" width="22" height="120" rx="6" fill="url(#szinV)"/><rect x="682" y="160" width="22" height="120" rx="6" fill="url(#szinV)"/>
      <path d="M290 226 L270 420 L310 420 L320 224 Z M510 226 L530 420 L490 420 L480 224 Z" fill="url(#fem)"/>
      <rect x="240" y="410" width="110" height="18" rx="6" fill="${SOTET}"/><rect x="450" y="410" width="110" height="18" rx="6" fill="${SOTET}"/>`,
    tukor: () => `
      ${[0, 1].map((i) => `<g transform="translate(${260 + i * 280} 300) scale(${i ? -1 : 1} 1)">
        <path d="M-150 -60 C-120 -120 110 -120 140 -40 C150 20 120 90 40 100 L-120 100 C-160 80 -170 0 -150 -60 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
        ${Array.from({ length: 8 }, (_, j) => `<line x1="${-140 + j * 34}" y1="-90" x2="${-110 + j * 34}" y2="95" stroke="#fff" stroke-opacity=".08" stroke-width="12"/>`).join('')}</g>`).join('')}`,
    vonoszem: () => `
      <path d="M240 220 L540 220 L600 300 L540 380 L240 380 Z" fill="url(#szinV)" filter="url(#arnyek)"/>
      <circle cx="320" cy="300" r="44" fill="url(#hatter)"/>
      <rect x="560" y="276" width="160" height="48" rx="8" fill="url(#fem)"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((j) => `<line x1="${600 + j * 18}" y1="276" x2="${610 + j * 18}" y2="324" stroke="#555" stroke-width="4"/>`).join('')}`,
    ules: () => `
      <path d="M290 90 C250 90 240 130 240 170 L250 420 C250 470 300 500 360 500 L470 500 C540 500 570 470 570 420 L580 170 C580 120 560 90 520 90 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <path d="M300 130 L520 130 L510 300 L310 300 Z" fill="#2c3036"/>
      <path d="M330 140 L360 140 L340 420 L310 420 Z M460 140 L490 140 L500 420 L470 420 Z" fill="url(#szinV)"/>
      <rect x="370" y="110" width="80" height="44" rx="14" fill="#0e1012"/>
      <rect x="350" y="200" width="20" height="40" rx="6" fill="#0e1012"/><rect x="450" y="200" width="20" height="40" rx="6" fill="#0e1012"/>`,
    ov: () => `
      <path d="M220 80 L300 300 L500 300 L580 80" fill="none" stroke="url(#szinV)" stroke-width="50"/>
      <path d="M300 300 L250 520 M500 300 L550 520" stroke="url(#szinV)" stroke-width="50"/>
      <circle cx="400" cy="320" r="60" fill="url(#fem)" filter="url(#arnyek)"/><circle cx="400" cy="320" r="26" fill="${SOTET}"/>`,
    kormany: () => `
      <circle cx="400" cy="300" r="210" fill="none" stroke="url(#fekete)" stroke-width="56" filter="url(#arnyek)"/>
      <rect x="388" y="72" width="24" height="40" rx="6" fill="url(#szinV)"/>
      <path d="M200 290 L330 300 L360 340 L440 340 L470 300 L600 290 L600 330 L470 360 L440 420 L360 420 L330 360 L200 330 Z" fill="url(#fem)"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${370 + (i % 3) * 30}" cy="${360 + Math.floor(i / 3) * 30}" r="6" fill="${SOTET}"/>`).join('')}`,
    agy: () => `
      <path d="M300 150 L500 150 L540 300 L500 450 L300 450 L260 300 Z" fill="url(#fem)" filter="url(#arnyek)"/>
      <circle cx="400" cy="300" r="90" fill="url(#szinV)"/><circle cx="400" cy="300" r="36" fill="${SOTET}"/>
      ${Array.from({ length: 6 }, (_, i) => { const a = i * 60 * Math.PI / 180; return `<circle cx="${400 + Math.cos(a) * 125}" cy="${300 + Math.sin(a) * 125}" r="10" fill="${SOTET}"/>`; }).join('')}`,
    valto: () => `
      <circle cx="400" cy="180" r="90" fill="url(#szinV)" filter="url(#arnyek)"/>
      <text x="400" y="200" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">1·3·5</text>
      <rect x="380" y="260" width="40" height="200" rx="12" fill="url(#fem)"/>
      <path d="M300 470 C300 430 500 430 500 470 L500 520 L300 520 Z" fill="url(#fekete)"/>`,
    pedal: () => `
      ${[0, 1, 2].map((i) => `<g transform="translate(${240 + i * 160} ${160 + (i === 1 ? 40 : 0)})">
        <rect x="-60" y="0" width="120" height="${i === 2 ? 240 : 200}" rx="18" fill="url(#fem)" filter="url(#arnyek)"/>
        ${[0, 1, 2, 3, 4, 5].map((j) => `<rect x="-44" y="${22 + j * 30}" width="88" height="12" rx="6" fill="${SOTET}"/>`).join('')}
        <rect x="-60" y="0" width="120" height="14" rx="7" fill="url(#szinV)"/></g>`).join('')}`,
    izzo: () => `
      ${[0, 1].map((i) => `<g transform="translate(${290 + i * 220} 300) rotate(${i ? 8 : -8})">
        <rect x="-56" y="-180" width="112" height="190" rx="18" fill="url(#fem)" filter="url(#arnyek)"/>
        ${[0, 1, 2].map((j) => `<rect x="-36" y="${-160 + j * 54}" width="72" height="36" rx="6" fill="#fff8d0" stroke="url(#szin)" stroke-width="5"/>`).join('')}
        <rect x="-70" y="10" width="140" height="22" rx="6" fill="${SOTET}"/>
        <path d="M-40 32 h80 v100 c0 20 -80 20 -80 0 z" fill="url(#fekete)"/>
        ${[0, 1, 2, 3, 4].map((j) => `<rect x="-40" y="${44 + j * 18}" width="80" height="6" fill="#55595f"/>`).join('')}</g>`).join('')}`,
    lampa: () => `
      <path d="M100 220 C200 170 360 170 420 210 L420 370 C330 400 200 400 110 360 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <path d="M140 250 C230 215 340 215 390 240 L390 340 C320 360 220 360 150 330 Z" fill="url(#szinV)" opacity=".9"/>
      <path d="M380 210 C480 170 620 170 700 220 L690 360 C600 400 470 400 380 370 Z" fill="url(#fekete)" filter="url(#arnyek)"/>
      <path d="M410 240 C490 215 600 215 660 250 L652 330 C580 360 480 360 410 340 Z" fill="url(#szinV)" opacity=".9"/>
      ${[0, 1, 2, 3, 4].map((j) => `<line x1="${180 + j * 40}" y1="${242 - (j % 2) * 4}" x2="${180 + j * 40}" y2="${340 + (j % 2) * 4}" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>`).join('')}`,
    index: () => `
      ${[0, 1].map((i) => `<g transform="translate(${250 + i * 300} 300)">
        <rect x="-140" y="-60" width="280" height="120" rx="40" fill="url(#fekete)" filter="url(#arnyek)"/>
        ${Array.from({ length: 9 }, (_, j) => `<rect x="${-120 + j * 26}" y="-36" width="18" height="72" rx="5" fill="url(#szinV)" opacity="${0.35 + j * 0.08}"/>`).join('')}</g>`).join('')}`,
    rendszam: () => `
      ${[0, 1].map((i) => `<g transform="translate(${260 + i * 280} 300)">
        <rect x="-110" y="-56" width="220" height="112" rx="16" fill="url(#fekete)" filter="url(#arnyek)"/>
        <rect x="-86" y="-28" width="172" height="56" rx="8" fill="#ffffff"/>
        ${Array.from({ length: 6 }, (_, j) => `<circle cx="${-60 + j * 24}" cy="0" r="8" fill="url(#szin)"/>`).join('')}</g>`).join('')}`,
    olaj: () => `
      <path d="M270 170 h220 c30 0 50 20 50 50 v240 c0 30-20 50-50 50 h-220 c-30 0-50-20-50-50 v-240 c0-30 20-50 50-50 z" fill="url(#szinV)" filter="url(#arnyek)"/>
      <rect x="320" y="110" width="90" height="66" rx="12" fill="url(#fekete)"/>
      <path d="M490 190 c60 0 70 60 70 110 l-30 0 c0-40-10-70-40-70 z" fill="url(#szinV)"/>
      <rect x="250" y="270" width="270" height="150" rx="10" fill="#fff" opacity=".92"/>
      <rect x="276" y="300" width="160" height="20" rx="5" fill="${SOTET}"/><rect x="276" y="336" width="210" height="12" rx="5" fill="#9aa1a8"/><rect x="276" y="362" width="120" height="12" rx="5" fill="#9aa1a8"/>`,
    heveder: () => `
      <ellipse cx="400" cy="300" rx="220" ry="150" fill="none" stroke="url(#szinV)" stroke-width="56" filter="url(#arnyek)"/>
      <ellipse cx="400" cy="300" rx="220" ry="150" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="4" stroke-dasharray="14 10"/>
      <rect x="140" y="250" width="70" height="100" rx="14" fill="url(#fem)"/><rect x="590" y="250" width="70" height="100" rx="14" fill="url(#fem)"/>`,
    emelo: () => `
      <rect x="150" y="380" width="520" height="70" rx="20" fill="url(#szinV)" filter="url(#arnyek)"/>
      <path d="M220 380 L420 230 L470 260 L300 390 Z" fill="url(#fem)"/>
      <rect x="410" y="210" width="110" height="40" rx="10" fill="url(#fekete)"/>
      <rect x="560" y="300" width="200" height="22" rx="11" fill="url(#fem)" transform="rotate(-25 560 310)"/>
      <circle cx="210" cy="455" r="28" fill="url(#fekete)"/><circle cx="610" cy="455" r="28" fill="url(#fekete)"/>`,
    matrica: () => `
      <rect x="170" y="190" width="460" height="220" rx="20" fill="#fff" filter="url(#arnyek)" transform="rotate(-4 400 300)"/>
      <rect x="200" y="230" width="400" height="140" rx="12" fill="url(#szinV)" transform="rotate(-4 400 300)"/>
      <text x="400" y="320" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#fff" text-anchor="middle" transform="rotate(-4 400 300)">VELTRIX</text>`,
};

/**
 * Egy termék képe SVG-ként.
 * @param {{ rajz: string, szin: string, gyarto: string, cimke: string, felniSzin?: string, kullok?: number }} k
 */
const termekKep = (k) => {
    const rajz = RAJZOK[k.rajz] || RAJZOK.chipbox;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
${defs(k.szin)}
<rect width="800" height="600" fill="url(#hatter)"/>
<ellipse cx="400" cy="548" rx="300" ry="22" fill="#000" opacity=".08"/>
<g filter="url(#arnyek)">${rajz(k)}</g>
<rect x="36" y="36" width="8" height="40" rx="4" fill="${k.szin}"/>
<text x="56" y="66" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="32" font-weight="900" fill="#1c1d20" letter-spacing="1">${esc(k.gyarto.toUpperCase())}</text>
<text x="764" y="566" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#7b7f86" text-anchor="end">${esc(k.cimke)}</text>
</svg>`;
};

module.exports = { termekKep, RAJZOK };
