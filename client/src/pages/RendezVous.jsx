import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDateTime, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';

const STATUS = { a_venir: 'À venir', termine: 'Terminé', annule: 'Annulé' };
const emptyForm = () => ({
  title: '', doctor: '', specialty: '', location: '',
  starts_at: nowLocal(true), status: 'a_venir', notes: '',
});

export default function RendezVous() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('tous');
  const [error, setError] = useState(null);

  const load = () => api.list('appointments').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm()); setEditId(null); setOpen(true); };
  const openEdit = (a) => { setForm({ ...a }); setEditId(a.id); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.update('appointments', editId, form);
      else await api.create('appointments', form);
      setOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    await api.remove('appointments', id);
    load();
  };

  const setStatus = async (a, status) => {
    await api.update('appointments', a.id, { ...a, status });
    load();
  };

  const filtered = (filter === 'tous' ? items : items.filter((a) => a.status === filter))
    .slice()
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>📅 Rendez-vous</h2>
          <p className="muted">Vos consultations passées et à venir</p>
        </div>
        <button className="btn" onClick={openNew}>+ Nouveau rendez-vous</button>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="filters">
        {['tous', 'a_venir', 'termine', 'annule'].map((f) => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'tous' ? 'Tous' : STATUS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted">Aucun rendez-vous.</p>
      ) : (
        <div className="card-list">
          {filtered.map((a) => (
            <article key={a.id} className={`record-card status-${a.status}`}>
              <div className="record-head">
                <div>
                  <span className={`tag tag-${a.status}`}>{STATUS[a.status]}</span>
                  <h3>{a.title}</h3>
                  <p className="muted">
                    {a.specialty && `${a.specialty} · `}{formatDateTime(a.starts_at)}
                  </p>
                  {a.doctor && <p className="muted">👨‍⚕️ Dr {a.doctor}</p>}
                  {a.location && <p className="muted">📍 {a.location}</p>}
                </div>
                <div className="record-actions">
                  <button className="icon-btn" onClick={() => openEdit(a)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => remove(a.id)}>🗑</button>
                </div>
              </div>
              {a.notes && <p>{a.notes}</p>}
              {a.status === 'a_venir' && (
                <div className="record-actions">
                  <button className="btn small ghost" onClick={() => setStatus(a, 'termine')}>Marquer terminé</button>
                  <button className="btn small ghost" onClick={() => setStatus(a, 'annule')}>Annuler</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Motif / Titre
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <div className="form-row">
              <label>
                Médecin
                <input value={form.doctor || ''} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
              </label>
              <label>
                Spécialité
                <input value={form.specialty || ''} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
              </label>
            </div>
            <label>
              Lieu
              <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <div className="form-row">
              <label>
                Date et heure
                <input type="datetime-local" required value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </label>
              <label>
                Statut
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
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
