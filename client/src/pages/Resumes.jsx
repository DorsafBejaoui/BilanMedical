import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';

const emptyForm = () => ({ title: '', date: nowLocal(), content: '', tags: '' });

export default function Resumes() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = () => api.list('summaries').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm()); setEditId(null); setOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.update('summaries', editId, form);
      else await api.create('summaries', form);
      setOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce résumé ?')) return;
    await api.remove('summaries', id);
    load();
  };

  const q = query.toLowerCase();
  const filtered = items.filter(
    (s) => !q || s.title.toLowerCase().includes(q) ||
      (s.content || '').toLowerCase().includes(q) ||
      (s.tags || '').toLowerCase().includes(q)
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>📋 Résumés médicaux</h2>
          <p className="muted">Synthèses, antécédents et traitements</p>
        </div>
        <button className="btn" onClick={openNew}>+ Nouveau résumé</button>
      </header>

      {error && <p className="error">{error}</p>}

      <input className="search" placeholder="🔍 Rechercher…" value={query}
        onChange={(e) => setQuery(e.target.value)} />

      {filtered.length === 0 ? (
        <p className="muted">Aucun résumé{query ? ' correspondant' : ''}.</p>
      ) : (
        <div className="card-list">
          {filtered.map((s) => (
            <article key={s.id} className="record-card">
              <div className="record-head">
                <div>
                  <h3>{s.title}</h3>
                  <p className="muted">{formatDate(s.date)}</p>
                </div>
                <div className="record-actions">
                  <button className="icon-btn" onClick={() => openEdit(s)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => remove(s.id)}>🗑</button>
                </div>
              </div>
              {s.content && <p className="content-text">{s.content}</p>}
              {s.tags && (
                <div className="tags">
                  {s.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editId ? 'Modifier le résumé' : 'Nouveau résumé'} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Titre
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              Date
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>
              Contenu
              <textarea rows="5" value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
            <label>
              Mots-clés (séparés par des virgules)
              <input value={form.tags || ''} placeholder="diabète, hypertension…"
                onChange={(e) => setForm({ ...form, tags: e.target.value })} />
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
