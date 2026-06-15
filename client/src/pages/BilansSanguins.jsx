import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';
import Sparkline from '../components/Sparkline.jsx';

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
  const [view, setView] = useState('resume'); // resume | rapports
  const [tests, setTests] = useState([]);
  const [summary, setSummary] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    api.blood.tests().then(setTests).catch((e) => setError(e.message));
    api.blood.summary().then(setSummary).catch((e) => setError(e.message));
  };
  useEffect(() => {
    api.blood.catalog().then(setCatalog).catch(() => setCatalog([]));
    load();
  }, []);

  // Index marqueur -> {theme, unit, min, max} pour l'auto-remplissage
  const markerIndex = useMemo(() => {
    const idx = {};
    for (const t of catalog) for (const m of t.markers) idx[m.name] = { theme: t.theme, ...m };
    return idx;
  }, [catalog]);

  const openNew = () => { setForm(emptyForm()); setEditId(null); setError(null); setOpen(true); };
  const openEdit = (t) => {
    setForm({
      date: t.date,
      lab: t.lab || '', doctor: t.doctor || '', notes: t.notes || '',
      results: t.results.length
        ? t.results.map((r) => ({
            theme: r.theme, marker: r.marker, value: r.value,
            unit: r.unit || '', ref_min: r.ref_min ?? '', ref_max: r.ref_max ?? '',
          }))
        : [emptyRow()],
    });
    setEditId(t.id);
    setError(null);
    setOpen(true);
  };

  const setRow = (i, patch) =>
    setForm((f) => ({ ...f, results: f.results.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const onPickMarker = (i, name) => {
    const def = markerIndex[name];
    if (def) {
      setRow(i, {
        marker: name, theme: def.theme, unit: def.unit,
        ref_min: def.min ?? '', ref_max: def.max ?? '',
      });
    } else {
      setRow(i, { marker: name });
    }
  };

  const addRow = () => setForm((f) => ({ ...f, results: [...f.results, emptyRow()] }));
  const removeRow = (i) => setForm((f) => ({ ...f, results: f.results.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      results: form.results.filter((r) => r.marker && r.value !== ''),
    };
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>📊 Bilans sanguins</h2>
          <p className="muted">Saisissez vos prises de sang et suivez chaque marqueur par thème</p>
        </div>
        <button className="btn" onClick={openNew}>+ Nouveau rapport</button>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="filters">
        <button className={`chip ${view === 'resume' ? 'active' : ''}`} onClick={() => setView('resume')}>
          Résumé par thème
        </button>
        <button className={`chip ${view === 'rapports' ? 'active' : ''}`} onClick={() => setView('rapports')}>
          Rapports ({tests.length})
        </button>
      </div>

      {view === 'resume' && (
        summary.length === 0 ? (
          <p className="muted">Aucun résultat. Ajoutez un rapport de bilan sanguin pour générer le résumé.</p>
        ) : (
          summary.map((group) => (
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
                      <td style={{ minWidth: 160 }}>
                        <Sparkline data={m.history.map((h, i) => ({ id: i, value: h.value, measured_at: h.date, unit: m.unit }))}
                          width={200} height={56} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )
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
