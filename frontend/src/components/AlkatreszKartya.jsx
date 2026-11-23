import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKosar } from '../context/kosar';
import { kepMeret } from '../lib/auto';
import { alkatreszUrl, ft, keszletSzoveg } from '../lib/webshop';
import Ikon from './Ikon';
import './AutoKartya.css';
import './AlkatreszKartya.css';

// "Kosárba" gomb. Ha elfogyott, vagy már az összes darab a kosárban van, nem lehet megnyomni.
export const KosarbaGomb = ({ alkatresz, mennyiseg = 1, nagy = false }) => {
    const { hozzaadas, mennyiseg: kosarban } = useKosar();
    const [jelzes, setJelzes] = useState(false);
    const id = alkatresz._id;

    // még ennyit lehet a kosárba tenni
    const maradek = alkatresz.keszlet - kosarban(id);
    const tilt = maradek < mennyiseg;

    const kattintas = () => {
        hozzaadas(id, mennyiseg);
        // pár másodpercig kiírjuk, hogy "Kosárban"
        setJelzes(true);
        setTimeout(() => setJelzes(false), 1600);
    };

    let felirat = 'Kosárba';
    if (alkatresz.keszlet <= 0) {
        felirat = 'Elfogyott';
    } else if (jelzes) {
        felirat = 'Kosárban';
    }

    let cim;
    if (tilt && alkatresz.keszlet > 0) {
        cim = 'A teljes készlet már a kosaradban van';
    }

    let osztaly = 'gomb gomb-uveg gomb-kicsi kosarba-gomb';
    if (nagy) {
        osztaly = 'gomb gomb-fo kosarba-gomb';
    }

    return (
        <button type="button" className={osztaly} disabled={tilt} onClick={kattintas} title={cim}>
            <Ikon nev={jelzes ? 'pipa' : 'kosar'} meret={nagy ? 18 : 15} />
            {felirat}
        </button>
    );
};

// ár kiírása (akciónál az eredeti áthúzva)
export const ArKijelzes = ({ alkatresz }) => {
    let ar = alkatresz.ar;
    if (alkatresz.akcios) {
        ar = alkatresz.akciosAr;
    }
    return (
        <span className="alkatresz-ar">
            {alkatresz.akcios && <s>{ft(alkatresz.ar)}</s>}
            <strong>{ft(ar)}</strong>
        </span>
    );
};

// egy termék kártyája a webshop listában
const AlkatreszKartya = ({ alkatresz, kesleltetes = 0 }) => {
    const keszlet = keszletSzoveg(alkatresz.keszlet);

    let kep = alkatresz.kep;
    if (!kep && alkatresz.kepek && alkatresz.kepek.length > 0) {
        kep = alkatresz.kepek[0].url;
    }

    let osztaly = 'auto-kartya alkatresz-kartya beuszas';
    if (alkatresz.kiemelt) {
        osztaly += ' auto-kartya-kiemelt';
    }
    if (alkatresz.keszlet <= 0) {
        osztaly += ' alkatresz-elfogyott';
    }

    const kesleltetesMs = Math.min(kesleltetes, 8) * 60;

    return (
        <article className={osztaly} style={{ animationDelay: kesleltetesMs + 'ms' }}>
            <div className="auto-kep-tarto alkatresz-kep-tarto">
                {kep ? (
                    <img className="auto-kep" src={kepMeret(kep, 600)} alt={alkatresz.nev} loading="lazy" decoding="async" />
                ) : (
                    <div className="auto-kep-hiany" role="img" aria-label="Nincs kép a termékről">VELTRIX</div>
                )}
                <div className="auto-cimkek">
                    {alkatresz.akcios && <span className="auto-cimke alkatresz-cimke-akcio">Akció</span>}
                    {alkatresz.kiemelt && <span className="auto-cimke auto-cimke-kiemelt"><Ikon nev="csillag" meret={12} kitoltes /> Kiemelt</span>}
                    {alkatresz.univerzalis && <span className="auto-cimke">Univerzális</span>}
                </div>
            </div>

            <div className="auto-kartya-tartalom">
                <p className="auto-marka">{alkatresz.gyarto} · {alkatresz.kategoriaNev}</p>
                <h3 className="auto-nev alkatresz-nev">
                    <Link className="auto-link" to={alkatreszUrl(alkatresz)}>{alkatresz.nev}</Link>
                </h3>
                {alkatresz.rovidLeiras && <p className="alkatresz-rovid">{alkatresz.rovidLeiras}</p>}
                <div className="auto-kitolto" />
                <div className="alkatresz-kartya-lablec">
                    <div>
                        <ArKijelzes alkatresz={alkatresz} />
                        <span className={'alkatresz-keszlet keszlet-' + keszlet.tipus}>{keszlet.szoveg}</span>
                    </div>
                    <KosarbaGomb alkatresz={alkatresz} />
                </div>
            </div>
        </article>
    );
};

export default AlkatreszKartya;
