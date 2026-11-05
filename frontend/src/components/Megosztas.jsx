import { useState } from 'react';
import { CEG } from '../lib/ceg';
import Ikon from './Ikon';

const mobil = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Megosztás Facebookon, Messengerben, natív megosztással vagy linkmásolással.
 * A közösségi oldalaknak a backend /megosztas oldalát adjuk át, mert csak az
 * tartalmaz szerveroldali Open Graph címkéket (kép, cím, ár).
 */
const Megosztas = ({ auto }) => {
    const [masolva, setMasolva] = useState(false);
    const oldalUrl = `${window.location.origin}/autok/${auto.slug}`;
    const megosztoUrl = `${window.location.origin}/megosztas/autok/${auto.slug}`;
    const cim = `${auto.marka} ${auto.modell} (${auto.evjarat})`;
    const kodolt = encodeURIComponent(megosztoUrl);

    const messengerUrl = mobil()
        ? `fb-messenger://share/?link=${kodolt}`
        : CEG.facebookAppId
            ? `https://www.facebook.com/dialog/send?app_id=${CEG.facebookAppId}&link=${kodolt}&redirect_uri=${encodeURIComponent(oldalUrl)}`
            : null;

    const nativ = async () => {
        try {
            await navigator.share({ title: cim, url: megosztoUrl });
        } catch {
            // A felhasználó megszakította a megosztást.
        }
    };

    const masolas = async () => {
        try {
            await navigator.clipboard.writeText(oldalUrl);
            setMasolva(true);
            setTimeout(() => setMasolva(false), 2000);
        } catch {
            window.prompt('Másold ki a linket:', oldalUrl);
        }
    };

    return (
        <div className="megosztas" aria-label="Megosztás">
            {typeof navigator.share === 'function' && (
                <button className="ikon-gomb" type="button" onClick={nativ} title="Megosztás">
                    <Ikon nev="megosztas" /> <span>Megosztás</span>
                </button>
            )}
            <a className="ikon-gomb" href={`https://www.facebook.com/sharer/sharer.php?u=${kodolt}`} target="_blank" rel="noopener noreferrer" title="Megosztás Facebookon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.2H7.7v3.7h2.7V22h3.6v-9.8h2.8l.4-3.7z" />
                </svg>
                <span className="sr-only">Facebook</span>
            </a>
            {messengerUrl && (
                <a className="ikon-gomb" href={messengerUrl} target="_blank" rel="noopener noreferrer" title="Küldés Messengeren">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.1 7.1v3.3l3-1.7c.9.3 1.9.4 2.9.4 5.6 0 10-4.1 10-9.6S17.6 2 12 2zm1 12.9l-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8z" />
                    </svg>
                    <span className="sr-only">Messenger</span>
                </a>
            )}
            <button className="ikon-gomb" type="button" onClick={masolas} title="Link másolása">
                <Ikon nev={masolva ? 'pipa' : 'link'} /> <span className="sr-only">{masolva ? 'Link kimásolva' : 'Link másolása'}</span>
            </button>
            <button className="ikon-gomb" type="button" onClick={() => window.print()} title="Adatlap nyomtatása">
                <Ikon nev="nyomtat" /> <span className="sr-only">Nyomtatás</span>
            </button>
            <span className="sr-only" aria-live="polite">{masolva ? 'Link kimásolva' : ''}</span>
        </div>
    );
};

export default Megosztas;
