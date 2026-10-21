import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, useAuth } from '../context/auth';
import { autoValasztasiLehetosegek } from './autoValasztasiLehetosegek';
import './Autok.css';

const arFormatter = new Intl.NumberFormat('hu-HU');
const szamFormatter = new Intl.NumberFormat('hu-HU');
const szamMezok = ['evjarat', 'vetel_ar', 'teljesitmeny', 'hengerur_tartalom', 'kmora_allas'];
const szerkeszthetoMezok = [
	['elado_nev', 'Eladó neve', 'text'],
	['elado_telefonszam', 'Eladó telefonszáma', 'tel'],
	['marka', 'Márka', 'text'],
	['modell', 'Modell', 'text'],
	['szin', 'Szín', 'select'],
	['kivitel', 'Kivitel', 'select'],
	['uzemanyag', 'Üzemanyag', 'select'],
	['szarmazasi_hely', 'Származási hely', 'select'],
	['evjarat', 'Évjárat', 'number'],
	['vetel_ar', 'Vételár (Ft)', 'number'],
	['teljesitmeny', 'Teljesítmény (LE)', 'number'],
	['hengerur_tartalom', 'Hengerűrtartalom (cm³)', 'number'],
	['kmora_allas', 'Kilométeróra állása (km)', 'number'],
	['leiras', 'Leírás', 'textarea'],
];

const Autok = () => {
	const { user } = useAuth();
	const [autok, setAutok] = useState([]);
	const [kereses, setKereses] = useState('');
	const [rendezes, setRendezes] = useState('ujak');
	const [betoltes, setBetoltes] = useState(true);
	const [hiba, setHiba] = useState('');
	const [szerkesztettAuto, setSzerkesztettAuto] = useState(null);
	const [szerkesztesAdatok, setSzerkesztesAdatok] = useState(null);
	const [szerkesztesEgyediMezok, setSzerkesztesEgyediMezok] = useState({});
	const [muveletHiba, setMuveletHiba] = useState('');
	const [mentesFolyamatban, setMentesFolyamatban] = useState(false);
	const [torlesFolyamatban, setTorlesFolyamatban] = useState('');

	useEffect(() => {
		const controller = new AbortController();

		const autokBetoltese = async () => {
			setBetoltes(true);
			setHiba('');
			try {
				const response = await fetch(`${API_URL}/autok`, { signal: controller.signal });
				const data = await response.json().catch(() => ({}));
				if (!response.ok) throw new Error(data.error || 'Az autók betöltése nem sikerült.');
				setAutok(Array.isArray(data.autok) ? data.autok : []);
			} catch (error) {
				if (error.name !== 'AbortError') setHiba(error.message || 'Nem sikerült kapcsolódni a szerverhez.');
			} finally {
				if (!controller.signal.aborted) setBetoltes(false);
			}
		};

		autokBetoltese();
		return () => controller.abort();
	}, []);

	const szurtAutok = useMemo(() => {
		const keresesiSzoveg = kereses.trim().toLocaleLowerCase('hu');
		const eredmeny = autok.filter((auto) => {
			const cim = `${auto.marka || ''} ${auto.modell || ''} ${auto.evjarat || ''} ${auto.uzemanyag || ''} ${auto.kivitel || ''}`;
			return cim.toLocaleLowerCase('hu').includes(keresesiSzoveg);
		});

		return eredmeny.sort((elso, masodik) => {
			if (rendezes === 'ar-novekvo') return Number(elso.vetel_ar) - Number(masodik.vetel_ar);
			if (rendezes === 'ar-csokkeno') return Number(masodik.vetel_ar) - Number(elso.vetel_ar);
			if (rendezes === 'evjarat') return Number(masodik.evjarat) - Number(elso.evjarat);
			return new Date(masodik.createdAt || 0) - new Date(elso.createdAt || 0);
		});
	}, [autok, kereses, rendezes]);

	const szerkesztesMegnyitasa = (auto) => {
		setSzerkesztettAuto(auto);
		const adatok = Object.fromEntries(szerkeszthetoMezok.map(([mezo]) => [mezo, auto[mezo] ?? '']));
		setSzerkesztesAdatok(adatok);
		setSzerkesztesEgyediMezok(Object.fromEntries(szerkeszthetoMezok
			.filter(([, , tipus]) => tipus === 'select')
			.map(([mezo]) => [mezo, !autoValasztasiLehetosegek[mezo].includes(adatok[mezo])])));
		setMuveletHiba('');
	};

	const szerkesztesMentese = async (event) => {
		event.preventDefault();
		if (!szerkesztettAuto || !szerkesztesAdatok) return;

		setMentesFolyamatban(true);
		setMuveletHiba('');
		const payload = { ...szerkesztesAdatok, kep: szerkesztettAuto.kep };
		for (const mezo of szamMezok) payload[mezo] = Number(payload[mezo]);

		try {
			const response = await fetch(`${API_URL}/update-auto/${szerkesztettAuto._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Az autó mentése nem sikerült.');
			setAutok((elozo) => elozo.map((auto) => auto._id === szerkesztettAuto._id ? data.updatedAuto : auto));
			setSzerkesztettAuto(null);
			setSzerkesztesAdatok(null);
		} catch (error) {
			setMuveletHiba(error.message || 'Az autó mentése nem sikerült.');
		} finally {
			setMentesFolyamatban(false);
		}
	};

	const autoTorlese = async (auto) => {
		if (!window.confirm(`Biztosan törlöd ezt az autót: ${auto.marka} ${auto.modell}?`)) return;
		setTorlesFolyamatban(auto._id);
		setMuveletHiba('');
		try {
			const response = await fetch(`${API_URL}/delete-auto/${auto._id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Az autó törlése nem sikerült.');
			setAutok((elozo) => elozo.filter((elem) => elem._id !== auto._id));
		} catch (error) {
			setMuveletHiba(error.message || 'Az autó törlése nem sikerült.');
		} finally {
			setTorlesFolyamatban('');
		}
	};

	return (
		<main className="autok-oldal">
			<section className="autok-bemutato">
				<div className="autok-bemutato-szoveg">
					<p className="felirat">VELTRIX GARÁZS · VÁLOGATOTT JÁRMŰVEK</p>
					<h1>Találd meg a<br /><span>neked valót.</span></h1>
					<p className="autok-bevezeto">Fedezd fel aktuális kínálatunkat, és találd meg a következő autót, amely minden úton társad lesz.</p>
				</div>
				<div className="autok-kiemelt-adat" aria-label={`${autok.length} elérhető autó`}>
					<span className="autok-kiemelt-szam">{autok.length.toString().padStart(2, '0')}</span>
					<span>elérhető<br />jármű</span>
				</div>
			</section>

			<section className="autok-kinalat" aria-labelledby="autok-cim">
				<div className="autok-szekcio-fejlec">
					<div>
						<p className="felirat">GONDOSAN VÁLOGATVA</p>
						<h2 id="autok-cim">Aktuális kínálat</h2>
					</div>
					<p className="autok-talalat" aria-live="polite">
						{betoltes ? 'Autók betöltése…' : `${szurtAutok.length} ${szurtAutok.length === 1 ? 'találat' : 'találat'}`}
					</p>
				</div>

				<div className="autok-szurok">
					<label className="autok-kereso" htmlFor="auto-kereses">
						<span aria-hidden="true">⌕</span>
						<input
							id="auto-kereses"
							type="search"
							placeholder="Márka, modell vagy üzemanyag…"
							value={kereses}
							onChange={(event) => setKereses(event.target.value)}
						/>
					</label>
					<label className="autok-rendezes" htmlFor="auto-rendezes">
						<span>Rendezés</span>
						<select id="auto-rendezes" value={rendezes} onChange={(event) => setRendezes(event.target.value)}>
							<option value="ujak">Legújabb elöl</option>
							<option value="ar-novekvo">Ár szerint növekvő</option>
							<option value="ar-csokkeno">Ár szerint csökkenő</option>
							<option value="evjarat">Legújabb évjárat</option>
						</select>
					</label>
				</div>

				{hiba && (
					<div className="autok-allapot autok-hiba" role="alert">
						<span className="autok-allapot-ikon" aria-hidden="true">!</span>
						<h3>Most nem érjük el a kínálatot</h3>
						<p>{hiba}</p>
						<button className="gomb gomb-atlatszo" type="button" onClick={() => window.location.reload()}>Újrapróbálom</button>
					</div>
				)}

				{betoltes && !hiba && (
					<div className="autok-kartyak" aria-label="Autók betöltése">
						{[0, 1, 2].map((elem) => <div className="auto-skeleton" key={elem} />)}
					</div>
				)}

				{!betoltes && !hiba && szurtAutok.length > 0 && (
					<div className="autok-kartyak">
						{szurtAutok.map((auto) => (
							<article className="auto-kartya" key={auto._id}>
								<div className="auto-kep-tarto">
									{auto.kep ? (
										<img className="auto-kep" src={auto.kep} alt={`${auto.marka} ${auto.modell}`} loading="lazy" />
									) : (
										<div className="auto-kep-hiany" aria-label="Nincs kép az autóról">VELTRIX</div>
									)}
									<span className="auto-evjarat">{auto.evjarat || '—'}</span>
								</div>
								<div className="auto-kartya-tartalom">
									<div className="auto-nev-sor">
										<div>
											<p className="auto-marka">{auto.marka || 'Autó'}</p>
											<h3>{auto.modell || 'Modell nincs megadva'}</h3>
										</div>
										<p className="auto-ar">{auto.vetel_ar ? `${arFormatter.format(auto.vetel_ar)} Ft` : 'Érdeklődj'}</p>
									</div>
									<div className="auto-adatok">
										<span><i aria-hidden="true">↗</i>{auto.kmora_allas != null ? `${szamFormatter.format(auto.kmora_allas)} km` : '— km'}</span>
										<span><i aria-hidden="true">◈</i>{auto.uzemanyag || '—'}</span>
										<span><i aria-hidden="true">⚙</i>{auto.teljesitmeny != null ? `${szamFormatter.format(auto.teljesitmeny)} LE` : '— LE'}</span>
									</div>
									<div className="auto-reszletek">
										<span>{auto.kivitel || 'Kivitel nincs megadva'}</span>
										<span>{auto.szin || ''}</span>
									</div>
									{auto.leiras && <p className="auto-leiras">{auto.leiras}</p>}
									{(auto.elado_nev || auto.elado_telefonszam) && (
										<div className="auto-elado-adatok">
											<span>Eladó: <strong>{auto.elado_nev || '—'}</strong></span>
											{auto.elado_telefonszam && <a href={`tel:${auto.elado_telefonszam.replace(/[^\d+]/g, '')}`}>{auto.elado_telefonszam}</a>}
										</div>
									)}
									{user?.statusz === 'admin' && (
										<div className="auto-admin-muveletek">
											<button className="auto-szerkesztes-gomb" type="button" onClick={() => szerkesztesMegnyitasa(auto)}>Módosítás</button>
											<button className="auto-torles-gomb" type="button" onClick={() => autoTorlese(auto)} disabled={torlesFolyamatban === auto._id}>
												{torlesFolyamatban === auto._id ? 'Törlés…' : 'Törlés'}
											</button>
										</div>
									)}
								</div>
							</article>
						))}
					</div>
				)}

				{!betoltes && !hiba && szurtAutok.length === 0 && (
					<div className="autok-allapot">
						<span className="autok-allapot-ikon" aria-hidden="true">⌕</span>
						<h3>{autok.length ? 'Nincs ilyen találat' : 'Hamarosan érkeznek az autók'}</h3>
						<p>{autok.length ? 'Próbálj másik keresési kifejezést.' : 'Jelenleg még nincs feltöltött autó a kínálatban.'}</p>
						{kereses && <button className="gomb gomb-atlatszo" type="button" onClick={() => setKereses('')}>Keresés törlése</button>}
					</div>
				)}
			</section>

			<section className="autok-cta">
				<div><p className="felirat">VAN EGY ELADÓ AUTÓD?</p><h2>Kerüljön be a kínálatba.</h2></div>
				<Link className="gomb gomb-arany" to="/feltolt">Autó feltöltése <span aria-hidden="true">↗</span></Link>
			</section>

			{user?.statusz === 'admin' && muveletHiba && !szerkesztettAuto && <p className="auto-muvelet-hiba" role="alert">{muveletHiba}</p>}

			{szerkesztettAuto && szerkesztesAdatok && (
				<div className="auto-modal-hatter" onMouseDown={(event) => { if (event.target === event.currentTarget && !mentesFolyamatban) setSzerkesztettAuto(null); }}>
					<section className="auto-szerkeszto-modal" role="dialog" aria-modal="true" aria-labelledby="auto-szerkeszto-cim">
						<div className="auto-modal-fejlec">
							<div><p className="felirat">HIRDETÉS ADATAI</p><h2 id="auto-szerkeszto-cim">Autó módosítása</h2></div>
							<button className="auto-modal-bezaras" type="button" aria-label="Bezárás" onClick={() => setSzerkesztettAuto(null)} disabled={mentesFolyamatban}>×</button>
						</div>
						<form onSubmit={szerkesztesMentese}>
							<div className="auto-szerkeszto-grid">
								{szerkeszthetoMezok.map(([mezo, cimke, tipus]) => (
									<label className={`auto-szerkeszto-mezo ${mezo === 'leiras' ? 'auto-szerkeszto-mezo-leiras' : ''}`} htmlFor={`auto-${mezo}`} key={mezo}>
										<span>{cimke}</span>
										{tipus === 'textarea' ? (
											<textarea
												id={`auto-${mezo}`}
												name={mezo}
												rows={5}
												maxLength={2000}
												value={szerkesztesAdatok[mezo]}
												onChange={(event) => setSzerkesztesAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }))}
											/>
										) : tipus === 'select' ? (
											<>
												<select
													id={`auto-${mezo}`}
													name={mezo}
													required
													value={szerkesztesEgyediMezok[mezo] ? '__egyedi__' : szerkesztesAdatok[mezo]}
													onChange={(event) => {
														const egyedi = event.target.value === '__egyedi__';
														setSzerkesztesEgyediMezok((elozo) => ({ ...elozo, [mezo]: egyedi }));
														setSzerkesztesAdatok((elozo) => ({ ...elozo, [mezo]: egyedi ? '' : event.target.value }));
													}}
												>
													{autoValasztasiLehetosegek[mezo].map((lehetoseg) => <option key={lehetoseg} value={lehetoseg}>{lehetoseg}</option>)}
													<option value="__egyedi__">Egyéb – saját megadás</option>
												</select>
												{szerkesztesEgyediMezok[mezo] && (
													<input
														aria-label={`${cimke} egyéni értéke`}
														name={mezo}
														type="text"
														required
														placeholder={`Írd be: ${cimke.toLocaleLowerCase('hu')}`}
														value={szerkesztesAdatok[mezo]}
														onChange={(event) => setSzerkesztesAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }))}
													/>
												)}
											</>
										) : (
											<input
												id={`auto-${mezo}`}
												name={mezo}
												type={tipus}
												min={tipus === 'number' ? 0 : undefined}
												max={mezo === 'evjarat' ? new Date().getFullYear() + 1 : undefined}
												step={tipus === 'number' ? 'any' : undefined}
												required
												value={szerkesztesAdatok[mezo]}
												onChange={(event) => setSzerkesztesAdatok((elozo) => ({ ...elozo, [mezo]: event.target.value }))}
											/>
										)}
									</label>
								))}
							</div>
							{muveletHiba && <p className="auto-muvelet-hiba" role="alert">{muveletHiba}</p>}
							<div className="auto-modal-akciok">
								<button className="gomb gomb-atlatszo" type="button" onClick={() => setSzerkesztettAuto(null)} disabled={mentesFolyamatban}>Mégse</button>
								<button className="gomb gomb-arany" type="submit" disabled={mentesFolyamatban}>{mentesFolyamatban ? 'Mentés…' : 'Változtatások mentése'}</button>
							</div>
						</form>
					</section>
				</div>
			)}
		</main>
	);
};

export default Autok;
