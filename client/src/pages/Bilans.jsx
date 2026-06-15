import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';

const CATEGORIES = ['Analyse de sang', 'Imagerie', 'Cardiologie', 'Ophtalmologie', 'Dentaire', 'Autre'];
const emptyForm = () => ({
  title: '', category: 'Analyse de sang', date: nowLocal(), doctor: '',
  results: '', conclusion: '', notes: '',
});

export default function Bilans() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.list('bilans').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm()); setEditId(null); setOpen(true); };
  const openEdit = (b) => { setForm({ ...b }); setEditId(b.id); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.update('bilans', editId, form);
      else await api.create('bilans', form);
      setOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce bilan ?')) return;
    await api.remove('bilans', id);
    load();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>🧪 Bilans médicaux</h2>
          <p className="muted">Analyses, examens et résultats</p>
        </div>
        <button className="btn" onClick={openNew}>+ Nouveau bilan</button>
      </header>

      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">Aucun bilan enregistré.</p>
      ) : (
        <div className="card-list">
          {items.map((b) => (
            <article key={b.id} className="record-card">
              <div className="record-head">
                <div>
                  <span className="tag">{b.category || 'Autre'}</span>
                  <h3>{b.title}</h3>
                  <p className="muted">{formatDate(b.date)}{b.doctor && ` · Dr ${b.doctor}`}</p>
                </div>
                <div className="record-actions">
                  <button className="icon-btn" onClick={() => openEdit(b)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => remove(b.id)}>🗑</button>
                </div>
              </div>
              {b.results && <div className="record-field"><strong>Résultats</strong><p>{b.results}</p></div>}
              {b.conclusion && <div className="record-field"><strong>Conclusion</strong><p>{b.conclusion}</p></div>}
              {b.notes && <p className="muted">{b.notes}</p>}
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editId ? 'Modifier le bilan' : 'Nouveau bilan'} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Titre
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <div className="form-row">
              <label>
                Catégorie
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Date
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
            </div>
            <label>
              Médecin / Laboratoire
              <input value={form.doctor || ''} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
            </label>
            <label>
              Résultats
              <textarea rows="3" value={form.results || ''} onChange={(e) => setForm({ ...form, results: e.target.value })} />
            </label>
            <label>
              Conclusion
              <textarea rows="2" value={form.conclusion || ''} onChange={(e) => setForm({ ...form, conclusion: e.target.value })} />
            </label>
            <label>
              Notes
              <textarea rows="2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
