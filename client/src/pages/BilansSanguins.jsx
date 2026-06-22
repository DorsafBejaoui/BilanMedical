import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';
import RefChart from '../components/RefChart.jsx';

const STATUS_LABEL = { normal: 'Normal', bas: 'Bas', eleve: 'Élevé' };
const TREND_ICON = { '-1': '↓', 1: '↑', 0: '→' };

const emptyRow = () => ({ theme: '', marker: '', value: '', unit: '', ref_min: '', ref_max: '' });
const emptyForm = () => ({ date: nowLocal(), lab: '', doctor: '', notes: '', results: [emptyRow()] });

function refLabel(min, max) {
  if (min != null && max != null) return `${min} – ${max}`;
  if (max != null) return `< ${max}`;
  if (min != null) return `> ${min}`;
  return '—';
}

export default function BilansSanguins() {
  const [view, setView] = useState('resume'); // resume | rapports | references
  const [tests, setTests] = useState([]);
  const [summary, setSummary] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [references, setReferences] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [editRef, setEditRef] = useState(null); // { marker, ref_min, ref_max, unit, theme }
  // Filtres du résumé
  const [themeFilter, setThemeFilter] = useState('tous');
  const [markerQuery, setMarkerQuery] = useState('');
  const [refQuery, setRefQuery] = useState('');
  const fileRef = useRef(null);
  const csvRef = useRef(null);

  const loadRefs = () => api.blood.references.list().then(setReferences).catch(() => {});
  const load = () => {
    api.blood.tests().then(setTests).catch((e) => setError(e.message));
    api.blood.summary().then(setSummary).catch((e) => setError(e.message));
    loadRefs();
  };
  useEffect(() => {
    api.blood.catalog().then(setCatalog).catch(() => setCatalog([]));
    load();
  }, []);

  const markerIndex = useMemo(() => {
    const idx = {};
    for (const t of catalog) for (const m of t.markers) idx[m.name] = { theme: t.theme, ...m };
    return idx;
  }, [catalog]);

  const openNew = () => { setForm(emptyForm()); setEditId(null); setError(null); setInfo(null); setOpen(true); };
  const openEdit = (t) => {
    setForm({
      date: t.date, lab: t.lab || '', doctor: t.doctor || '', notes: t.notes || '',
      results: t.results.length
        ? t.results.map((r) => ({
            theme: r.theme, marker: r.marker, value: r.value,
            unit: r.unit || '', ref_min: r.ref_min ?? '', ref_max: r.ref_max ?? '',
          }))
        : [emptyRow()],
    });
    setEditId(t.id); setError(null); setInfo(null); setOpen(true);
  };

  const setRow = (i, patch) =>
    setForm((f) => ({ ...f, results: f.results.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const onPickMarker = (i, name) => {
    const def = markerIndex[name];
    if (def) setRow(i, { marker: name, theme: def.theme, unit: def.unit, ref_min: def.min ?? '', ref_max: def.max ?? '' });
    else setRow(i, { marker: name });
  };

  const addRow = () => setForm((f) => ({ ...f, results: [...f.results, emptyRow()] }));
  const removeRow = (i) => setForm((f) => ({ ...f, results: f.results.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, results: form.results.filter((r) => r.marker && r.value !== '') };
    try {
      if (editId) await api.blood.update(editId, payload);
      else await api.blood.create(payload);
      setOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce rapport et tous ses résultats ?')) return;
    await api.blood.remove(id);
    load();
  };

  // Import d'un PDF de laboratoire
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de réimporter le même fichier
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const draft = await api.blood.importPdf(file);
      setForm({
        date: draft.date || nowLocal(), lab: '', doctor: '',
        notes: `Importé depuis ${draft.source || 'PDF'}`,
        results: draft.results.length
          ? draft.results.map((r) => ({
              theme: r.theme, marker: r.marker, value: r.value,
              unit: r.unit || '', ref_min: r.ref_min ?? '', ref_max: r.ref_max ?? '',
            }))
          : [emptyRow()],
      });
      setEditId(null);
      setInfo(
        draft.results.length
          ? `${draft.results.length} marqueur(s) détecté(s). Vérifiez les valeurs avant d'enregistrer.`
          : "Aucun marqueur reconnu automatiquement. Saisissez-les manuellement."
      );
      setOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Import CSV de valeurs usuelles
  const onImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportingCsv(true);
    setError(null);
    try {
      const result = await api.blood.references.importCsv(file);
      setInfo(`${result.imported} valeur(s) importée(s).${result.errors?.length ? ` Avertissements : ${result.errors.join(' | ')}` : ''}`);
      loadRefs();
      load();
    } catch (err) { setError(err.message); }
    finally { setImportingCsv(false); }
  };

  // Téléchargement du modèle CSV (généré côté client depuis le catalogue)
  const downloadTemplate = () => {
    const rows = ['Marqueur;Thème;Unité;Min;Max'];
    for (const t of catalog) {
      for (const m of t.markers) {
        rows.push(`${m.name};${t.theme};${m.unit ?? ''};${m.min ?? ''};${m.max ?? ''}`);
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modele_valeurs_usuelles.csv';
    a.click();
  };

  // Sauvegarde d'une édition inline de référence
  const saveRef = async () => {
    if (!editRef) return;
    try {
      await api.blood.references.update(editRef.marker, editRef);
      setEditRef(null);
      loadRefs();
      load();
    } catch (err) { setError(err.message); }
  };

  const resetRef = async (marker) => {
    if (!confirm(`Remettre les valeurs usuelles du catalogue pour "${marker}" ?`)) return;
    await api.blood.references.remove(marker);
    loadRefs();
    load();
  };

  // Références filtrées
  const filteredRefs = useMemo(() => {
    const q = refQuery.trim().toLowerCase();
    return q ? references.filter((r) => r.marker.toLowerCase().includes(q) || r.theme.toLowerCase().includes(q)) : references;
  }, [references, refQuery]);

  // Résumé filtré
  const filteredSummary = useMemo(() => {
    const q = markerQuery.trim().toLowerCase();
    return summary
      .filter((g) => themeFilter === 'tous' || g.theme === themeFilter)
      .map((g) => ({ ...g, markers: g.markers.filter((m) => !q || m.marker.toLowerCase().includes(q)) }))
      .filter((g) => g.markers.length > 0);
  }, [summary, themeFilter, markerQuery]);

  return (
    <div className="page">
      <header className="page-header no-print">
        <div>
          <h2>📊 Bilans sanguins</h2>
          <p className="muted">Saisissez vos prises de sang et suivez chaque marqueur par thème</p>
        </div>
        <div className="header-actions">
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={onImportFile} />
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={onImportCsv} />
          <button className="btn ghost" disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? '⏳ Lecture…' : '📄 Importer un PDF'}
          </button>
          <button className="btn" onClick={openNew}>+ Nouveau rapport</button>
        </div>
      </header>

      {error && <p className="error no-print">{error}</p>}

      {info && <p className="info-banner no-print">{info}</p>}

      <div className="filters no-print">
        <button className={`chip ${view === 'resume' ? 'active' : ''}`} onClick={() => setView('resume')}>
          Résumé par thème
        </button>
        <button className={`chip ${view === 'rapports' ? 'active' : ''}`} onClick={() => setView('rapports')}>
          Rapports ({tests.length})
        </button>
        <button className={`chip ${view === 'references' ? 'active' : ''}`} onClick={() => setView('references')}>
          Valeurs usuelles {references.filter(r => r.source === 'user').length > 0 && `(${references.filter(r => r.source === 'user').length} personnalisées)`}
        </button>
      </div>

      {view === 'resume' && (
        <>
          <div className="summary-toolbar no-print">
            <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
              <option value="tous">Tous les thèmes</option>
              {summary.map((g) => <option key={g.theme} value={g.theme}>{g.theme}</option>)}
            </select>
            <input className="search inline" placeholder="🔍 Filtrer un marqueur…" value={markerQuery}
              onChange={(e) => setMarkerQuery(e.target.value)} />
            <button className="btn ghost" onClick={() => window.print()} disabled={filteredSummary.length === 0}>
              ⬇️ Exporter en PDF
            </button>
          </div>

          <div className="printable">
            <h2 className="print-only print-title">Résumé des bilans sanguins</h2>
            {filteredSummary.length === 0 ? (
              <p className="muted">Aucun résultat à afficher. Importez un PDF ou ajoutez un rapport.</p>
            ) : (
              filteredSummary.map((group) => (
                <section key={group.theme} className="panel">
                  <h3>{group.theme}</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Marqueur</th><th>Dernière valeur</th><th>Statut</th>
                        <th>Référence</th><th>Évolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.markers.map((m) => (
                        <tr key={m.marker}>
                          <td>{m.marker}</td>
                          <td>
                            <strong>{m.last.value}</strong> {m.unit || ''}{' '}
                            <span className="muted">{TREND_ICON[m.trend]}</span>
                            <div className="muted" style={{ fontSize: 12 }}>{formatDate(m.last.date)}</div>
                          </td>
                          <td><span className={`tag status-${m.status}`}>{STATUS_LABEL[m.status]}</span></td>
                          <td className="muted">{refLabel(m.ref_min, m.ref_max)} {m.unit || ''}</td>
                          <td style={{ minWidth: 180 }}>
                            <RefChart data={m.history} refMin={m.ref_min} refMax={m.ref_max} unit={m.unit} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {view === 'rapports' && (
        tests.length === 0 ? (
          <p className="muted">Aucun rapport enregistré.</p>
        ) : (
          <div className="card-list">
            {tests.map((t) => (
              <article key={t.id} className="record-card">
                <div className="record-head">
                  <div>
                    <h3>Bilan du {formatDate(t.date)}</h3>
                    <p className="muted">
                      {t.lab && `🏥 ${t.lab}`}{t.lab && t.doctor && ' · '}{t.doctor && `Dr ${t.doctor}`}
                      {' · '}{t.results.length} marqueur{t.results.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="record-actions">
                    <button className="icon-btn" onClick={() => openEdit(t)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => remove(t.id)}>🗑</button>
                  </div>
                </div>
                {t.results.length > 0 && (
                  <table className="table" style={{ marginTop: 10 }}>
                    <thead>
                      <tr><th>Thème</th><th>Marqueur</th><th>Valeur</th><th>Référence</th></tr>
                    </thead>
                    <tbody>
                      {t.results.map((r) => {
                        const st = r.ref_min != null && r.value < r.ref_min ? 'bas'
                          : r.ref_max != null && r.value > r.ref_max ? 'eleve' : 'normal';
                        return (
                          <tr key={r.id}>
                            <td className="muted">{r.theme}</td>
                            <td>{r.marker}</td>
                            <td><span className={`badge status-${st}`}>{r.value} {r.unit || ''}</span></td>
                            <td className="muted">{refLabel(r.ref_min, r.ref_max)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {t.notes && <p className="muted" style={{ marginTop: 8 }}>{t.notes}</p>}
              </article>
            ))}
          </div>
        )
      )}

      {view === 'references' && (
        <>
          <div className="summary-toolbar no-print" style={{ alignItems: 'center' }}>
            <input className="search inline" placeholder="🔍 Filtrer un marqueur ou thème…"
              value={refQuery} onChange={(e) => setRefQuery(e.target.value)} />
            <button className="btn ghost" onClick={downloadTemplate}>⬇ Modèle CSV</button>
            <button className="btn" disabled={importingCsv} onClick={() => csvRef.current?.click()}>
              {importingCsv ? '⏳ Import…' : '📥 Importer CSV'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Importez un fichier CSV (<code>Marqueur;Min;Max;Unité</code>) pour définir vos valeurs usuelles personnelles.
            Ces valeurs sont prioritaires sur le catalogue et sur les PDF importés.
          </p>
          <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Marqueur</th>
                  <th>Thème</th>
                  <th>Unité</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Source</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefs.map((r) => (
                  <tr key={r.marker} className={r.source === 'user' ? 'ref-row-user' : ''}>
                    {editRef?.marker === r.marker ? (
                      <>
                        <td><strong>{r.marker}</strong></td>
                        <td className="muted">{r.theme}</td>
                        <td>
                          <input style={{ width: 70 }} value={editRef.unit ?? ''} onChange={(e) => setEditRef({ ...editRef, unit: e.target.value })} />
                        </td>
                        <td>
                          <input type="number" step="any" style={{ width: 70 }} value={editRef.ref_min ?? ''} onChange={(e) => setEditRef({ ...editRef, ref_min: e.target.value })} />
                        </td>
                        <td>
                          <input type="number" step="any" style={{ width: 70 }} value={editRef.ref_max ?? ''} onChange={(e) => setEditRef({ ...editRef, ref_max: e.target.value })} />
                        </td>
                        <td />
                        <td className="no-print" style={{ display: 'flex', gap: 6 }}>
                          <button className="btn small" onClick={saveRef}>✓</button>
                          <button className="btn small ghost" onClick={() => setEditRef(null)}>✕</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><strong>{r.marker}</strong></td>
                        <td className="muted">{r.theme}</td>
                        <td>{r.unit || '—'}</td>
                        <td>{r.ref_min ?? '—'}</td>
                        <td>{r.ref_max ?? '—'}</td>
                        <td>
                          {r.source === 'user'
                            ? <span className="tag status-normal">Personnalisé</span>
                            : <span className="tag" style={{ color: 'var(--muted)' }}>Catalogue</span>}
                        </td>
                        <td className="no-print" style={{ display: 'flex', gap: 6 }}>
                          <button className="icon-btn" title="Modifier"
                            onClick={() => setEditRef({ marker: r.marker, theme: r.theme, unit: r.unit ?? '', ref_min: r.ref_min ?? '', ref_max: r.ref_max ?? '' })}>
                            ✏️
                          </button>
                          {r.source === 'user' && (
                            <button className="icon-btn danger" title="Remettre valeur catalogue" onClick={() => resetRef(r.marker)}>↩</button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open && (
        <Modal title={editId ? 'Modifier le rapport' : 'Nouveau rapport de bilan sanguin'} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <div className="form-row">
              <label>
                Date du prélèvement
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label>
                Laboratoire
                <input value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} />
              </label>
            </div>
            <label>
              Médecin prescripteur
              <input value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
            </label>

            <div className="results-editor">
              <div className="panel-header">
                <strong>Résultats</strong>
                <button type="button" className="btn small ghost" onClick={addRow}>+ Ajouter un marqueur</button>
              </div>
              <datalist id="marker-list">
                {catalog.flatMap((t) => t.markers.map((m) => <option key={m.name} value={m.name} />))}
              </datalist>
              {form.results.map((r, i) => (
                <div key={i} className="result-row">
                  <input list="marker-list" placeholder="Marqueur (ex : TSH)" value={r.marker}
                    onChange={(e) => onPickMarker(i, e.target.value)} />
                  <input type="number" step="any" placeholder="Valeur" value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })} style={{ maxWidth: 90 }} />
                  <input placeholder="Unité" value={r.unit}
                    onChange={(e) => setRow(i, { unit: e.target.value })} style={{ maxWidth: 80 }} />
                  <input type="number" step="any" placeholder="Réf min" value={r.ref_min}
                    onChange={(e) => setRow(i, { ref_min: e.target.value })} style={{ maxWidth: 80 }} />
                  <input type="number" step="any" placeholder="Réf max" value={r.ref_max}
                    onChange={(e) => setRow(i, { ref_max: e.target.value })} style={{ maxWidth: 80 }} />
                  <button type="button" className="icon-btn danger" onClick={() => removeRow(i)}>✕</button>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 12 }}>
                Choisissez un marqueur dans la liste pour pré-remplir l'unité et les valeurs de référence.
              </p>
            </div>

            <label>
              Notes
              <textarea rows="2" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Annuler</button>
              <button type="submit" className="btn">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
