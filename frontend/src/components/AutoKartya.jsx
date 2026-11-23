import { Link } from 'react-router-dom';
import { STATUSZOK, autoNev, autoUrl, formatAr, formatSzam, kepMeret } from '../lib/auto';
import { KedvencGomb, OsszehasonlitasGomb } from './AutoMuveletek';
import Ikon from './Ikon';
import './AutoKartya.css';

// egy autó kártyája a listákban
const AutoKartya = ({ auto, kesleltetes = 0, muveletek = true, link = true, lablec = null }) => {
    let kep = auto.kep;
    if (!kep && auto.kepek && auto.kepek.length > 0) {
        kep = auto.kepek[0].url;
    }

    let osztaly = 'auto-kartya beuszas';
    if (auto.kiemelt) {
        osztaly += ' auto-kartya-kiemelt';
    }
    if (auto.statusz === 'elkelt') {
        osztaly += ' auto-kartya-elkelt';
    }

    // a kártyák egymás után úsznak be (max 8 kártyáig késleltetünk)
    const kesleltetesMs = Math.min(kesleltetes, 8) * 60;

    let futas = '—';
    if (auto.kmora_allas !== null && auto.kmora_allas !== undefined) {
        futas = formatSzam(auto.kmora_allas) + ' km';
    }
    let teljesitmeny = '—';
    if (auto.teljesitmeny !== null && auto.teljesitmeny !== undefined) {
        teljesitmeny = formatSzam(auto.teljesitmeny) + ' LE';
    }

    // a modell neve link legyen (az előnézetben nem az)
    let cim = auto.modell || 'Modell nincs megadva';
    if (link && auto._id) {
        cim = <Link to={autoUrl(auto)} className="auto-link">{cim}</Link>;
    } else {
        cim = <span>{cim}</span>;
    }

    const varos = auto.telephely ? auto.telephely.varos : null;

    return (
        <article className={osztaly} style={{ animationDelay: kesleltetesMs + 'ms' }}>
            <div className="auto-kep-tarto">
                {kep ? (
                    <img
                        className="auto-kep"
                        src={kepMeret(kep, 720)}
                        alt={autoNev(auto)}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="auto-kep-hiany" role="img" aria-label="Nincs kép az autóról">VELTRIX</div>
                )}
                <div className="auto-cimkek">
                    {auto.kiemelt && <span className="auto-cimke auto-cimke-kiemelt"><Ikon nev="csillag" meret={12} kitoltes /> Kiemelt</span>}
                    {auto.statusz && auto.statusz !== 'elerheto' && (
                        <span className={'auto-cimke auto-cimke-' + auto.statusz}>{STATUSZOK[auto.statusz]}</span>
                    )}
                    {auto.uj && auto.statusz === 'elerheto' && <span className="auto-cimke auto-cimke-uj">Új</span>}
                    {auto.evjarat && <span className="auto-cimke">{auto.evjarat}</span>}
                </div>
                {muveletek && auto._id && (
                    <div className="auto-kartya-muveletek">
                        <KedvencGomb auto={auto} />
                        <OsszehasonlitasGomb auto={auto} />
                    </div>
                )}
                <p className="auto-ar"><span>{formatAr(auto.vetel_ar)}</span></p>
            </div>

            <div className="auto-kartya-tartalom">
                <p className="auto-marka">{auto.marka || 'Autó'}</p>
                <h3 className="auto-nev">{cim}</h3>

                <dl className="auto-adatok">
                    <div>
                        <dt>Futás</dt>
                        <dd>{futas}</dd>
                    </div>
                    <div>
                        <dt>Teljesítmény</dt>
                        <dd>{teljesitmeny}</dd>
                    </div>
                    <div>
                        <dt>Üzemanyag</dt>
                        <dd>{auto.uzemanyag || '—'}</dd>
                    </div>
                </dl>

                <div className="auto-reszletek">
                    {auto.valto && <span>{auto.valto}</span>}
                    {auto.kivitel && <span>{auto.kivitel}</span>}
                    {auto.garancia_honap > 0 && <span className="auto-reszlet-kiemelt"><Ikon nev="pajzs" meret={13} /> {auto.garancia_honap} hó garancia</span>}
                </div>

                <div className="auto-kitolto" />

                {(varos || lablec) && (
                    <div className="auto-kartya-lablec">
                        {varos && (
                            <span className="auto-telephely"><Ikon nev="terkep" meret={14} /> {varos}</span>
                        )}
                        {lablec}
                    </div>
                )}
            </div>
        </article>
    );
};

export const AutoKartyaVaz = () => <div className="auto-kartya auto-vaz" aria-hidden="true" />;

export default AutoKartya;
