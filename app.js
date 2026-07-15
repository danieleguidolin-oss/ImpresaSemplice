const { useState, useEffect, useMemo } = React;

// ---------- Dati fiscali di riferimento (regime forfettario 2026) ----------
const CATEGORIE = [
  { id: "commercio", label: "Commercio all'ingrosso e al dettaglio", coeff: 40 },
  { id: "alimentari", label: "Industrie alimentari e bevande", coeff: 40 },
  { id: "ambulante_alim", label: "Commercio ambulante di alimentari", coeff: 40 },
  { id: "ambulante_altri", label: "Commercio ambulante altri prodotti", coeff: 54 },
  { id: "costruzioni", label: "Costruzioni e attività immobiliari", coeff: 86 },
  { id: "intermediari", label: "Intermediari del commercio", coeff: 62 },
  { id: "ristorazione", label: "Alloggio e ristorazione", coeff: 40 },
  { id: "professionale", label: "Attività professionali, tecniche, sanitarie", coeff: 78 },
  { id: "altre", label: "Altre attività economiche", coeff: 67 },
  { id: "custom", label: "Coefficiente personalizzato", coeff: null },
];

const GESTIONI = [
  { id: "separata", label: "Gestione Separata INPS", aliquota: 26.07, fisso: 0 },
  { id: "artigiani", label: "Artigiani INPS", aliquota: 24, fisso: 4208 },
  { id: "commercianti", label: "Commercianti INPS", aliquota: 24.48, fisso: 4208 },
  { id: "cassa", label: "Cassa professionale (nessun INPS aggiuntivo)", aliquota: 0, fisso: 0 },
];

const SOGLIA = 85000;
const STORAGE_KEY = "netto-forfettario-data";
const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function euro(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n || 0));
}
function euroPrecise(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
}

const defaultSettings = {
  anno: new Date().getFullYear(),
  categoriaId: "professionale",
  coeffCustom: 78,
  aliquotaImposta: 15,
  gestioneId: "separata",
  riduzione35: false,
};

function calcolaMovimento(importo, settings) {
  const cat = CATEGORIE.find((c) => c.id === settings.categoriaId);
  const coeff = settings.categoriaId === "custom" ? settings.coeffCustom : cat.coeff;
  const gestione = GESTIONI.find((g) => g.id === settings.gestioneId);
  let aliquotaInps = gestione.aliquota;
  if (settings.riduzione35 && (settings.gestioneId === "artigiani" || settings.gestioneId === "commercianti")) {
    aliquotaInps = aliquotaInps * 0.65;
  }
  const redditoLordo = importo * (coeff / 100);
  const contributiInps = redditoLordo * (aliquotaInps / 100);
  const redditoNetto = redditoLordo - contributiInps;
  const imposta = redditoNetto * (settings.aliquotaImposta / 100);
  const accantonamento = contributiInps + imposta;
  return { redditoLordo, contributiInps, redditoNetto, imposta, accantonamento, netto: importo - accantonamento };
}

function fissoAnnuoEffettivo(settings) {
  const gestione = GESTIONI.find((g) => g.id === settings.gestioneId);
  let fisso = gestione.fisso;
  if (settings.riduzione35 && (settings.gestioneId === "artigiani" || settings.gestioneId === "commercianti")) fisso *= 0.65;
  return fisso;
}

// ---------- Icone SVG (nessuna libreria esterna) ----------
const Icon = {
  plus: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  stamp: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 22h14"/><path d="M8 4a4 4 0 118 0v3a1 1 0 001 1h1a1 1 0 011 1v4H6v-4a1 1 0 011-1h1a1 1 0 001-1z"/><path d="M4 22l2-6h12l2 6"/></svg>,
  x: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  sliders: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

function Timbro({ visibile, importo }) {
  if (!visibile) return null;
  return (
    <div className="stamp-overlay">
      <div className="stamp-mark">
        <Icon.stamp width="30" height="30" />
        <div className="stamp-title">ACCANTONATO</div>
        <div className="stamp-amount">{euro(importo)}</div>
      </div>
    </div>
  );
}

function RingGauge({ pct, colore }) {
  const r = 70, c = 2 * Math.PI * r, dash = Math.min(pct, 1) * c;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} fill="none" stroke="#DDD6C4" strokeWidth="14" />
      <circle cx="90" cy="90" r={r} fill="none" stroke={colore} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 90 90)"
        style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }} />
      <text x="90" y="86" textAnchor="middle" className="ring-value">{Math.round(pct * 100)}%</text>
      <text x="90" y="106" textAnchor="middle" className="ring-label">della soglia</text>
    </svg>
  );
}

function SimpleBarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.incassi, d.accantonamento)));
  return (
    <div className="bars-wrap">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-pair">
            <div className="bar bar-a" style={{ height: `${(d.incassi / max) * 100}%` }} title={euro(d.incassi)} />
            <div className="bar bar-b" style={{ height: `${(d.accantonamento / max) * 100}%` }} title={euro(d.accantonamento)} />
          </div>
          <div className="bar-label">{d.mese}</div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const [entries, setEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const [simExtra, setSimExtra] = useState(2000);
  const [stamp, setStamp] = useState({ visible: false, amount: 0 });
  const [form, setForm] = useState({ importo: "", data: new Date().toISOString().slice(0, 10), causale: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.entries) setEntries(parsed.entries);
        if (!parsed.setupDone) setShowSetup(true);
      } else {
        setShowSetup(true);
      }
    } catch (e) {
      setShowSetup(true);
    }
  }, []);

  function persist(nextSettings, nextEntries, setupDone) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: nextSettings, entries: nextEntries, setupDone: setupDone !== false }));
    } catch (e) {}
  }

  const stats = useMemo(() => {
    const yearEntries = entries.filter((e) => new Date(e.data).getFullYear() === settings.anno);
    let totaleIncassi = 0, totaleInps = 0, totaleImposta = 0;
    const perMese = Array.from({ length: 12 }, (_, i) => ({ mese: MESI[i], incassi: 0, accantonamento: 0 }));
    yearEntries.forEach((e) => {
      const calc = calcolaMovimento(e.importo, settings);
      totaleIncassi += e.importo;
      totaleInps += calc.contributiInps;
      totaleImposta += calc.imposta;
      const m = new Date(e.data).getMonth();
      perMese[m].incassi += e.importo;
      perMese[m].accantonamento += calc.accantonamento;
    });
    const fisso = fissoAnnuoEffettivo(settings);
    const totaleAccantonare = totaleInps + totaleImposta + fisso;
    const netto = totaleIncassi - totaleAccantonare;
    const mesiConDati = new Set(yearEntries.map((e) => new Date(e.data).getMonth())).size;
    const oggi = new Date();
    const mesiTrascorsi = settings.anno === oggi.getFullYear() ? Math.max(oggi.getMonth() + 1, mesiConDati, 1) : Math.max(mesiConDati, 1);
    const proiezione = (totaleIncassi / mesiTrascorsi) * 12;
    return { yearEntries, totaleIncassi, totaleInps, totaleImposta, fisso, totaleAccantonare, netto, perMese, proiezione };
  }, [entries, settings]);

  const pctSoglia = stats.totaleIncassi / SOGLIA;
  let ringColor = "#2F6E4F";
  if (pctSoglia > 0.9) ringColor = "#B23A2E"; else if (pctSoglia > 0.7) ringColor = "#A9782E";
  const proiezioneSupera = stats.proiezione > SOGLIA;

  function handleAdd() {
    const importo = parseFloat(form.importo.replace(",", "."));
    if (!importo || importo <= 0) return;
    const entry = { id: Date.now().toString(), importo, data: form.data, causale: form.causale };
    const next = [entry, ...entries];
    setEntries(next);
    persist(settings, next);
    const calc = calcolaMovimento(importo, settings);
    setShowAdd(false);
    setForm({ importo: "", data: new Date().toISOString().slice(0, 10), causale: "" });
    setStamp({ visible: true, amount: calc.accantonamento });
    setTimeout(() => setStamp({ visible: false, amount: 0 }), 1400);
  }
  function saveSetup(next) { setSettings(next); persist(next, entries, true); setShowSetup(false); }
  function saveSettings(next) { setSettings(next); persist(next, entries, true); setShowSettings(false); }
  function deleteEntry(id) { const next = entries.filter((e) => e.id !== id); setEntries(next); persist(settings, next); }

  return (
    <div className="app-root">
      <Timbro visibile={stamp.visible} importo={stamp.amount} />
      {showSetup && <SetupModal settings={settings} onSave={saveSetup} />}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {showAdd && <AddModal form={form} setForm={setForm} onSave={handleAdd} onClose={() => setShowAdd(false)} settings={settings} />}
      {showSim && <SimModal settings={settings} extra={simExtra} setExtra={setSimExtra} onClose={() => setShowSim(false)} stats={stats} />}

      <header className="header">
        <div>
          <div className="wordmark">Netto Forfettario</div>
          <div className="subtitle">Anno {settings.anno} · {GESTIONI.find((g) => g.id === settings.gestioneId).label}</div>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Impostazioni"><Icon.settings width="20" height="20" /></button>
      </header>

      <main className="main">
        <section className="hero-card">
          <RingGauge pct={pctSoglia} colore={ringColor} />
          <div className="hero-numbers">
            <div className="hero-figure">{euro(stats.totaleIncassi)}</div>
            <div className="hero-caption">incassati su {euro(SOGLIA)} di soglia forfettario</div>
            {proiezioneSupera && (
              <div className="alert-pill"><Icon.alert width="14" height="14" /> Proiezione annua {euro(stats.proiezione)} — rischio di superare la soglia</div>
            )}
          </div>
        </section>

        <section className="grid-cards">
          <div className="mini-card"><div className="mini-label">Da accantonare</div><div className="mini-value">{euro(stats.totaleAccantonare)}</div></div>
          <div className="mini-card"><div className="mini-label">Contributi INPS</div><div className="mini-value">{euro(stats.totaleInps + stats.fisso)}</div></div>
          <div className="mini-card"><div className="mini-label">Imposta sostitutiva</div><div className="mini-value">{euro(stats.totaleImposta)}</div></div>
          <div className="mini-card highlight"><div className="mini-label">Netto stimato</div><div className="mini-value">{euro(stats.netto)}</div></div>
        </section>

        <section className="chart-card">
          <div className="section-title">Andamento mensile</div>
          <SimpleBarChart data={stats.perMese} />
        </section>

        <button className="sim-banner" onClick={() => setShowSim(true)}>
          <Icon.sliders width="16" height="16" /><span>Simula un incasso extra</span><Icon.chevron width="16" height="16" />
        </button>

        <section className="ledger">
          <div className="section-title">Registro incassi</div>
          {stats.yearEntries.length === 0 && <div className="empty">Nessun incasso registrato per il {settings.anno}. Aggiungine uno per iniziare.</div>}
          {stats.yearEntries.map((e) => {
            const calc = calcolaMovimento(e.importo, settings);
            return (
              <div className="ledger-row" key={e.id}>
                <div className="ledger-main">
                  <div className="ledger-causale">{e.causale || "Incasso"}</div>
                  <div className="ledger-date">{new Date(e.data).toLocaleDateString("it-IT")}</div>
                </div>
                <div className="ledger-amounts">
                  <div className="ledger-importo">{euroPrecise(e.importo)}</div>
                  <div className="ledger-accantona">accantona {euroPrecise(calc.accantonamento)}</div>
                </div>
                <button className="ledger-del" onClick={() => deleteEntry(e.id)} aria-label="Elimina"><Icon.x width="14" height="14" /></button>
              </div>
            );
          })}
        </section>

        <div className="disclaimer">Stime basate sulle regole 2026 del regime forfettario (coefficienti ATECO, aliquote INPS, imposta sostitutiva). Le aliquote cambiano ogni anno: verifica i valori con il tuo commercialista prima di versare.</div>
      </main>

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Aggiungi incasso"><Icon.plus width="24" height="24" /></button>
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function SetupModal({ settings, onSave }) {
  const [local, setLocal] = useState(settings);
  return (
    <div className="modal-overlay">
      <div className="modal setup-modal">
        <div className="modal-title">Impostiamo il tuo profilo</div>
        <div className="modal-sub">Bastano tre risposte per calcolare accantonamenti precisi.</div>
        <FieldSelect label="Categoria attività (coefficiente ATECO)" value={local.categoriaId}
          onChange={(v) => setLocal({ ...local, categoriaId: v })}
          options={CATEGORIE.map((c) => ({ value: c.id, label: c.coeff ? `${c.label} — ${c.coeff}%` : c.label }))} />
        {local.categoriaId === "custom" && (
          <label className="field"><span className="field-label">Coefficiente personalizzato (%)</span>
            <input className="field-input" type="number" value={local.coeffCustom}
              onChange={(e) => setLocal({ ...local, coeffCustom: parseFloat(e.target.value) || 0 })} /></label>
        )}
        <FieldSelect label="Gestione contributiva" value={local.gestioneId}
          onChange={(v) => setLocal({ ...local, gestioneId: v })}
          options={GESTIONI.map((g) => ({ value: g.id, label: g.label }))} />
        {(local.gestioneId === "artigiani" || local.gestioneId === "commercianti") && (
          <label className="checkbox-row"><input type="checkbox" checked={local.riduzione35}
            onChange={(e) => setLocal({ ...local, riduzione35: e.target.checked })} /><span>Ho richiesto la riduzione contributiva del 35%</span></label>
        )}
        <label className="checkbox-row"><input type="checkbox" checked={local.aliquotaImposta === 5}
          onChange={(e) => setLocal({ ...local, aliquotaImposta: e.target.checked ? 5 : 15 })} /><span>Sono in una delle prime 5 annualità di attività (aliquota 5%)</span></label>
        <button className="primary-btn" onClick={() => onSave(local)}>Inizia a usare l'app</button>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [local, setLocal] = useState(settings);
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><div className="modal-title">Impostazioni</div>
          <button className="icon-btn" onClick={onClose}><Icon.x width="18" height="18" /></button></div>
        <label className="field"><span className="field-label">Anno fiscale</span>
          <input className="field-input" type="number" value={local.anno}
            onChange={(e) => setLocal({ ...local, anno: parseInt(e.target.value) || local.anno })} /></label>
        <FieldSelect label="Categoria attività" value={local.categoriaId}
          onChange={(v) => setLocal({ ...local, categoriaId: v })}
          options={CATEGORIE.map((c) => ({ value: c.id, label: c.coeff ? `${c.label} — ${c.coeff}%` : c.label }))} />
        {local.categoriaId === "custom" && (
          <label className="field"><span className="field-label">Coefficiente personalizzato (%)</span>
            <input className="field-input" type="number" value={local.coeffCustom}
              onChange={(e) => setLocal({ ...local, coeffCustom: parseFloat(e.target.value) || 0 })} /></label>
        )}
        <FieldSelect label="Gestione contributiva" value={local.gestioneId}
          onChange={(v) => setLocal({ ...local, gestioneId: v })}
          options={GESTIONI.map((g) => ({ value: g.id, label: g.label }))} />
        {(local.gestioneId === "artigiani" || local.gestioneId === "commercianti") && (
          <label className="checkbox-row"><input type="checkbox" checked={local.riduzione35}
            onChange={(e) => setLocal({ ...local, riduzione35: e.target.checked })} /><span>Riduzione contributiva del 35%</span></label>
        )}
        <label className="checkbox-row"><input type="checkbox" checked={local.aliquotaImposta === 5}
          onChange={(e) => setLocal({ ...local, aliquotaImposta: e.target.checked ? 5 : 15 })} /><span>Aliquota start-up 5% (primi 5 anni)</span></label>
        <button className="primary-btn" onClick={() => onSave(local)}>Salva</button>
      </div>
    </div>
  );
}

function AddModal({ form, setForm, onSave, onClose, settings }) {
  const importoNum = parseFloat((form.importo || "0").replace(",", ".")) || 0;
  const preview = importoNum > 0 ? calcolaMovimento(importoNum, settings) : null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><div className="modal-title">Nuovo incasso</div>
          <button className="icon-btn" onClick={onClose}><Icon.x width="18" height="18" /></button></div>
        <label className="field"><span className="field-label">Importo incassato (€)</span>
          <input className="field-input mono" type="text" inputMode="decimal" placeholder="0,00" value={form.importo}
            onChange={(e) => setForm({ ...form, importo: e.target.value })} autoFocus /></label>
        <label className="field"><span className="field-label">Data</span>
          <input className="field-input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
        <label className="field"><span className="field-label">Causale (opzionale)</span>
          <input className="field-input" type="text" placeholder="Es. Fattura cliente X" value={form.causale}
            onChange={(e) => setForm({ ...form, causale: e.target.value })} /></label>
        {preview && (
          <div className="preview-box">
            <div className="preview-row"><span>Da accantonare</span><strong>{euroPrecise(preview.accantonamento)}</strong></div>
            <div className="preview-row muted"><span>Netto in tasca</span><span>{euroPrecise(preview.netto)}</span></div>
          </div>
        )}
        <button className="primary-btn" onClick={onSave} disabled={importoNum <= 0}>Registra e accantona</button>
      </div>
    </div>
  );
}

function SimModal({ settings, extra, setExtra, onClose, stats }) {
  const calc = calcolaMovimento(extra, settings);
  const nuovaProiezione = stats.proiezione + extra;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><div className="modal-title">Simulatore incasso extra</div>
          <button className="icon-btn" onClick={onClose}><Icon.x width="18" height="18" /></button></div>
        <div className="modal-sub">Cosa succederebbe se incassassi {euro(extra)} in più quest'anno?</div>
        <input className="range" type="range" min="0" max="30000" step="500" value={extra} onChange={(e) => setExtra(parseInt(e.target.value))} />
        <div className="range-value">{euro(extra)}</div>
        <div className="preview-box">
          <div className="preview-row"><span>Accantonamento aggiuntivo</span><strong>{euroPrecise(calc.accantonamento)}</strong></div>
          <div className="preview-row muted"><span>Netto aggiuntivo in tasca</span><span>{euroPrecise(calc.netto)}</span></div>
          <div className={"preview-row " + (nuovaProiezione > SOGLIA ? "warn" : "muted")}>
            <span>Nuova proiezione annua</span><span>{euro(nuovaProiezione)} {nuovaProiezione > SOGLIA ? "— supera la soglia" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
