import { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';

const EXAM_TYPES = [
  'Radiographie (RX)', 'Échographie', 'IRM', 'Scanner (TDM)', 'Mammographie',
  'Scintigraphie', 'TEP-scan', 'Doppler', 'Ostéodensitométrie', 'Autre',
];

const emptyForm = () => ({
  date: nowLocal(), exam_type: '', body_part: '',
  doctor: '', facility: '', conclusion: '', notes: '', pdf_text: '', filename: '',
});

export default function Radiologie() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const load = () => api.radiology.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(emptyForm()); setEditId(null); setOpen(true); };
  const openEdit = (r) => { setForm({ ...emptyForm(), ...r }); setEditId(r.id); setOpen(true); };

  const handlePdfImport = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await api.radiology.importPdf(file);
      setForm((f) => ({ ...f, pdf_text: result.pdf_text || '', filename: result.filename || file.name }));
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form };
      if (editId) await api.radiology.update(editId, body);
      else await api.radiology.create(body);
      setOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    await api.radiology.remove(id);
    load();
  };

  const toggleExpand = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>🩻 Rapports Médicaux</h2>
          <p className="muted">Radiographies, échographies, IRM, scanners et autres examens d'imagerie</p>
        </div>
        <button className="btn" onClick={openNew}>+ Nouveau rapport</button>
      </header>

      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">Aucun rapport enregistré.</p>
      ) : (
        <div className="card-list">
          {items.map((r) => (
            <article key={r.id} className="record-card">
              <div className="record-head">
                <div>
                  {r.exam_type && <span className="tag">{r.exam_type}</span>}
                  {r.body_part && <span className="tag" style={{ background: 'var(--bg-hover)' }}>{r.body_part}</span>}
                  <h3>{r.exam_type || "Examen d'imagerie"}{r.body_part ? ` — ${r.body_part}` : ''}</h3>
                  <p className="muted">
                    {formatDate(r.date)}
                    {r.doctor && ` · Dr ${r.doctor}`}
                    {r.facility && ` · ${r.facility}`}
                  </p>
                </div>
                <div className="record-actions">
                  <button className="icon-btn" onClick={() => openEdit(r)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => remove(r.id)}>🗑</button>
                </div>
              </div>
              {r.conclusion && (
                <div className="record-field">
                  <strong>Conclusion</strong>
                  <p>{r.conclusion}</p>
                </div>
              )}
              {r.notes && <p className="muted">{r.notes}</p>}
              {r.pdf_text && (
                <div className="record-field">
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ fontSize: 12, padding: '2px 10px', marginTop: 4 }}
                    onClick={() => toggleExpand(r.id)}
                  >
                    {expanded[r.id] ? '▲ Masquer le texte PDF' : '▼ Afficher le texte PDF extrait'}
                  </button>
                  {expanded[r.id] && (
                    <pre className="pdf-text-preview">{r.pdf_text}</pre>
                  )}
                </div>
              )}
              {r.filename && (
                <p className="muted" style={{ fontSize: 12 }}>📄 {r.filename}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title={editId ? 'Modifier le rapport' : "Nouveau rapport d'imagerie"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit} className="form">
            {/* Import PDF */}
            <div className="import-zone" style={{ marginBottom: 12 }}>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => handlePdfImport(e.target.files[0])}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => fileRef.current.click()}
                disabled={importing}
              >
                {importing ? 'Extraction en cours…' : '📄 Importer un PDF'}
              </button>
              {form.filename && (
                <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
                  {form.filename}
                </span>
              )}
            </div>

            <div className="form-row">
              <label>
                Type d'examen
                <select value={form.exam_type} onChange={(e) => set('exam_type', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>
                Date
                <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
              </label>
            </div>

            <label>
              Partie du corps / région anatomique
              <input
                placeholder="ex : genou gauche, abdomen, thorax…"
                value={form.body_part}
                onChange={(e) => set('body_part', e.target.value)}
              />
            </label>

            <div className="form-row">
              <label>
                Médecin prescripteur / Radiologue
                <input value={form.doctor} onChange={(e) => set('doctor', e.target.value)} />
              </label>
              <label>
                Établissement / Cabinet
                <input value={form.facility} onChange={(e) => set('facility', e.target.value)} />
              </label>
            </div>

            <label>
              Conclusion / Résultat
              <textarea
                rows="3"
                placeholder="Résumé de la conclusion du rapport…"
                value={form.conclusion}
                onChange={(e) => set('conclusion', e.target.value)}
              />
            </label>

            <label>
              Notes
              <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>

            {form.pdf_text && (
              <label>
                Texte extrait du PDF
                <textarea
                  rows="6"
                  style={{ fontSize: 12, fontFamily: 'monospace' }}
                  value={form.pdf_text}
                  onChange={(e) => set('pdf_text', e.target.value)}
                />
              </label>
            )}

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
