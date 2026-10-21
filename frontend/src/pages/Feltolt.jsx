import { useState } from 'react';
import { API_URL } from '../context/auth';
import { autoValasztasiLehetosegek } from './autoValasztasiLehetosegek';
import './Feltolt.css';

const kezdoAdatok = {
    marka: '',
    modell: '',
    szin: '',
    kivitel: '',
    uzemanyag: '',
    szarmazasi_hely: '',
    elado_nev: '',
    elado_telefonszam: '',
    leiras: '',
    evjarat: '',
    vetel_ar: '',
    teljesitmeny: '',
    hengerur_tartalom: '',
    kmora_allas: '',
};

const mezok = [
    ['elado_nev', 'Eladó neve', 'pl. Kovács Péter', 'text'],
    ['elado_telefonszam', 'Eladó telefonszáma', 'pl. +36 30 123 4567', 'tel'],
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
    ['leiras', 'Leírás', 'Írj az autó állapotáról, felszereltségéről vagy előéletéről…', 'textarea'],
];

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('A kép beolvasása nem sikerült.'));
    reader.readAsDataURL(file);
});

const Feltolt = () => {
    const [adatok, setAdatok] = useState(kezdoAdatok);
    const [egyediMezok, setEgyediMezok] = useState({});
    const [kep, setKep] = useState('');
    const [kepNev, setKepNev] = useState('');
    const [uzenet, setUzenet] = useState(null);
    const [folyamatban, setFolyamatban] = useState(false);

    const handleChange = (event) => {
        setAdatok((elozo) => ({ ...elozo, [event.target.name]: event.target.value }));
    };

    const handleImage = async (event) => {
        const file = event.target.files?.[0];
        setUzenet(null);
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setUzenet({ tipus: 'hiba', szoveg: 'Kérlek, képfájlt válassz.' });
            event.target.value = '';
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            setUzenet({ tipus: 'hiba', szoveg: 'A kép mérete legfeljebb 4 MB lehet.' });
            event.target.value = '';
            return;
        }
        try {
            setKep(await fileToDataUrl(file));
            setKepNev(file.name);
        } catch (error) {
            setUzenet({ tipus: 'hiba', szoveg: error.message });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setUzenet(null);
        if (!kep) {
            setUzenet({ tipus: 'hiba', szoveg: 'A feltöltéshez válassz egy képet az autóról.' });
            return;
        }
        setFolyamatban(true);
        const payload = { ...adatok, kep };
        for (const key of ['evjarat', 'vetel_ar', 'teljesitmeny', 'hengerur_tartalom', 'kmora_allas']) {
            payload[key] = Number(payload[key]);
        }
        try {
            const response = await fetch(`${API_URL}/new-auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Az autó feltöltése nem sikerült.');
            setAdatok(kezdoAdatok);
            setEgyediMezok({});
            setKep('');
            setKepNev('');
            event.target.reset();
            setUzenet({ tipus: 'siker', szoveg: data.message || 'Az autó sikeresen feltöltve.' });
        } catch (error) {
            setUzenet({ tipus: 'hiba', szoveg: error.message });
        } finally {
            setFolyamatban(false);
        }
    };

    return (
        <main className="feltolt-oldal">
            <header className="feltolt-fejlec">
                <p className="felirat">VELTRIX GARÁZS</p>
                <h1>Új autó feltöltése</h1>
                <p>Add meg a jármű adatait, és tölts fel róla egy jó minőségű képet.</p>
            </header>
            <form className="feltolt-kartya" onSubmit={handleSubmit}>
                <div className="feltolt-urlap-grid">
                    {mezok.map(([name, label, placeholder, type]) => (
                        <label className={`feltolt-mezo ${name === 'leiras' ? 'feltolt-mezo-leiras' : ''}`} key={name} htmlFor={name}>
                            <span>{label}</span>
                            {type === 'textarea' ? (
                                <textarea
                                    id={name}
                                    name={name}
                                    value={adatok[name]}
                                    onChange={handleChange}
                                    placeholder={placeholder}
                                    maxLength={2000}
                                    rows={5}
                                />
                            ) : type === 'select' ? (
                                <>
                                    <select
                                        id={name}
                                        name={name}
                                        value={egyediMezok[name] ? '__egyedi__' : adatok[name]}
                                        onChange={(event) => {
                                            const egyedi = event.target.value === '__egyedi__';
                                            setEgyediMezok((elozo) => ({ ...elozo, [name]: egyedi }));
                                            setAdatok((elozo) => ({ ...elozo, [name]: egyedi ? '' : event.target.value }));
                                        }}
                                        required
                                    >
                                        <option value="" disabled>{placeholder}</option>
                                        {autoValasztasiLehetosegek[name].map((lehetoseg) => <option key={lehetoseg} value={lehetoseg}>{lehetoseg}</option>)}
                                        <option value="__egyedi__">Egyéb – saját megadás</option>
                                    </select>
                                    {egyediMezok[name] && (
                                        <input
                                            aria-label={`${label} megadása`}
                                            name={name}
                                            type="text"
                                            value={adatok[name]}
                                            onChange={handleChange}
                                            placeholder={`Írd be: ${label.toLocaleLowerCase('hu')}`}
                                            required
                                        />
                                    )}
                                </>
                            ) : (
                                <input
                                    id={name}
                                    name={name}
                                    type={type}
                                    value={adatok[name]}
                                    onChange={handleChange}
                                    placeholder={placeholder}
                                    min={type === 'number' ? 0 : undefined}
                                    max={name === 'evjarat' ? new Date().getFullYear() + 1 : undefined}
                                    step={type === 'number' ? 'any' : undefined}
                                    required
                                />
                            )}
                        </label>
                    ))}
                </div>
                <div className="feltolt-kep-sor">
                    <label className="feltolt-mezo kep-valaszto" htmlFor="kep">
                        <span>Autó képe</span>
                        <input id="kep" name="kep" type="file" accept="image/*" onChange={handleImage} />
                        <small>{kepNev || 'JPG, PNG vagy WebP · legfeljebb 4 MB'}</small>
                    </label>
                    {kep && <img className="feltolt-elo-nezet" src={kep} alt="A kiválasztott autó képe" />}
                </div>
                {uzenet && <p className={`feltolt-uzenet ${uzenet.tipus}`} role="status">{uzenet.szoveg}</p>}
                <button className="gomb gomb-arany feltolt-kuldes" type="submit" disabled={folyamatban}>
                    {folyamatban ? 'Feltöltés…' : 'Autó feltöltése'}
                </button>
            </form>
        </main>
    );
};

export default Feltolt;
