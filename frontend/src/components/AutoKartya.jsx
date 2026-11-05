import { formatAr, formatSzam } from '../lib/auto';
import './AutoKartya.css';

const AutoKartya = ({ auto, admin = false, onSzerkesztes, onTorles, torlesFolyamatban = false, kesleltetes = 0 }) => (
    <article className="auto-kartya beuszas" style={{ animationDelay: `${Math.min(kesleltetes, 8) * 60}ms` }}>
        <div className="auto-kep-tarto">
            {auto.kep ? (
                <img className="auto-kep" src={auto.kep} alt={`${auto.marka} ${auto.modell}`} loading="lazy" />
            ) : (
                <div className="auto-kep-hiany" role="img" aria-label="Nincs kép az autóról">VELTRIX</div>
            )}
            <div className="auto-cimkek">
                {auto.evjarat && <span className="auto-cimke">{auto.evjarat}</span>}
                {auto.kivitel && <span className="auto-cimke">{auto.kivitel}</span>}
            </div>
            <p className="auto-ar"><span>{formatAr(auto.vetel_ar)}</span></p>
        </div>

        <div className="auto-kartya-tartalom">
            <p className="auto-marka">{auto.marka || 'Autó'}</p>
            <h3 className="auto-nev">{auto.modell || 'Modell nincs megadva'}</h3>

            <dl className="auto-adatok">
                <div>
                    <dt>Futás</dt>
                    <dd>{auto.kmora_allas != null ? `${formatSzam(auto.kmora_allas)} km` : '—'}</dd>
                </div>
                <div>
                    <dt>Teljesítmény</dt>
                    <dd>{auto.teljesitmeny != null ? `${formatSzam(auto.teljesitmeny)} LE` : '—'}</dd>
                </div>
                <div>
                    <dt>Üzemanyag</dt>
                    <dd>{auto.uzemanyag || '—'}</dd>
                </div>
            </dl>

            <div className="auto-reszletek">
                {auto.szin && <span><i className="auto-szin-pont" aria-hidden="true" />{auto.szin}</span>}
                {auto.hengerur_tartalom != null && <span>{formatSzam(auto.hengerur_tartalom)} cm³</span>}
                {auto.szarmazasi_hely && <span>{auto.szarmazasi_hely}</span>}
            </div>

            {auto.leiras && <p className="auto-leiras">{auto.leiras}</p>}

            <div className="auto-kitolto" />

            {(auto.elado_nev || auto.elado_telefonszam) && (
                <div className="auto-elado">
                    <span>
                        <small>Eladó</small>
                        <strong>{auto.elado_nev || '—'}</strong>
                    </span>
                    {auto.elado_telefonszam && (
                        <a className="gomb gomb-uveg gomb-kicsi" href={`tel:${auto.elado_telefonszam.replace(/[^\d+]/g, '')}`}>
                            ☎ {auto.elado_telefonszam}
                        </a>
                    )}
                </div>
            )}

            {admin && (
                <div className="auto-admin">
                    <button className="gomb gomb-uveg gomb-kicsi" type="button" onClick={() => onSzerkesztes?.(auto)}>
                        Módosítás
                    </button>
                    <button
                        className="gomb gomb-veszely gomb-kicsi"
                        type="button"
                        onClick={() => onTorles?.(auto)}
                        disabled={torlesFolyamatban}
                    >
                        {torlesFolyamatban ? 'Törlés…' : 'Törlés'}
                    </button>
                </div>
            )}
        </div>
    </article>
);

export const AutoKartyaVaz = () => <div className="auto-kartya auto-vaz" aria-hidden="true" />;

export default AutoKartya;
