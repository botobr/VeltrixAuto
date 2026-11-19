import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKosar } from '../context/kosar';
import { kepMeret } from '../lib/auto';
import { alkatreszUrl, ft, keszletSzoveg } from '../lib/webshop';
import Ikon from './Ikon';
import './AutoKartya.css';
import './AlkatreszKartya.css';

/** „Kosárba” gomb rövid visszajelzéssel; elfogyott terméknél letiltva, a készletnél többet nem enged. */
export const KosarbaGomb = ({ alkatresz, mennyiseg = 1, nagy = false }) => {
    const { hozzaadas, mennyiseg: kosarban } = useKosar();
    const [jelzes, setJelzes] = useState(false);
    const id = alkatresz._id;
    const maradek = alkatresz.keszlet - kosarban(id);
    const tilt = maradek < mennyiseg;

    return (
        <button
            type="button"
            className={`gomb ${nagy ? 'gomb-fo' : 'gomb-uveg gomb-kicsi'} kosarba-gomb`}
            disabled={tilt}
            onClick={() => {
                hozzaadas(id, mennyiseg);
                setJelzes(true);
                setTimeout(() => setJelzes(false), 1600);
            }}
            title={tilt && alkatresz.keszlet > 0 ? 'A teljes készlet már a kosaradban van' : undefined}
        >
            <Ikon nev={jelzes ? 'pipa' : 'kosar'} meret={nagy ? 18 : 15} />
            {alkatresz.keszlet <= 0 ? 'Elfogyott' : jelzes ? 'Kosárban' : 'Kosárba'}
        </button>
    );
};

export const ArKijelzes = ({ alkatresz }) => (
    <span className="alkatresz-ar">
        {alkatresz.akcios && <s>{ft(alkatresz.ar)}</s>}
        <strong>{ft(alkatresz.akcios ? alkatresz.akciosAr : alkatresz.ar)}</strong>
    </span>
);

const AlkatreszKartya = ({ alkatresz, kesleltetes = 0 }) => {
    const keszlet = keszletSzoveg(alkatresz.keszlet);
    const kep = alkatresz.kep || alkatresz.kepek?.[0]?.url;

    return (
        <article
            className={`auto-kartya alkatresz-kartya beuszas ${alkatresz.kiemelt ? 'auto-kartya-kiemelt' : ''} ${alkatresz.keszlet <= 0 ? 'alkatresz-elfogyott' : ''}`}
            style={{ animationDelay: `${Math.min(kesleltetes, 8) * 60}ms` }}
        >
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
                        <span className={`alkatresz-keszlet keszlet-${keszlet.tipus}`}>{keszlet.szoveg}</span>
                    </div>
                    <KosarbaGomb alkatresz={alkatresz} />
                </div>
            </div>
        </article>
    );
};

export default AlkatreszKartya;
