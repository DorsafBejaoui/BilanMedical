import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ageFrom } from '../helpers.js';

const ACTIVITY_TYPES = [
  'Marche rapide', 'Course à pied', 'Vélo', 'Natation', 'Musculation', 'Yoga / Pilates',
  'Randonnée', 'Danse', 'Sports collectifs', 'Autre',
];
const FREQUENCIES = [
  '1 fois/semaine', '2 fois/semaine', '3 fois/semaine', '4 fois/semaine',
  '5 fois/semaine ou plus', 'Occasionnellement', "Pas d'activité régulière",
];
const DURATIONS = ['Moins de 30 min', '30 min', '45 min', '1 h', '1 h 30', '2 h ou plus'];

const emptyActivity = () => ({ activity_type: '', frequency: '', duration: '' });

const empty = {
  sex: '', birth_date: '', height_cm: '', weight_kg: '', smoker: 0,
  family_history: '', notes: '', last_mammography: '', last_cervical: '', last_colorectal: '',
};

function ActivitySection() {
  const [activities, setActivities] = useState([]);
  const [newAct, setNewAct] = useState(emptyActivity());
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => api.profile.activities.list().then(setActivities).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const setField = (k, v) => setNewAct((a) => ({ ...a, [k]: v }));

  const add = async () => {
    if (!newAct.activity_type) return;
    try {
      await api.profile.activities.add(newAct);
      setNewAct(emptyActivity());
      setAdding(false);
      load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    await api.profile.activities.remove(id);
    load();
  };

  return (
    <fieldset className="fieldset">
      <legend>Activité physique</legend>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Renseignez vos activités pour personnaliser les conseils dans la synthèse santé.
      </p>
      {err && <p className="error">{err}</p>}

      {activities.length > 0 && (
        <ul className="activity-list">
          {activities.map((a) => (
            <li key={a.id} className="activity-item">
              <span className="activity-icon">🏃</span>
              <span className="activity-name">{a.activity_type}</span>
              {a.frequency && <span className="tag">{a.frequency}</span>}
              {a.duration && <span className="tag">{a.duration}</span>}
              <button type="button" className="icon-btn danger" onClick={() => remove(a.id)}>🗑</button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="activity-add-form">
          <div className="form-row">
            <label>
              Type
              <select value={newAct.activity_type} onChange={(e) => setField('activity_type', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>
              Fréquence
              <select value={newAct.frequency} onChange={(e) => setField('frequency', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label>
              Durée/séance
              <select value={newAct.duration} onChange={(e) => setField('duration', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {DURATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" className="btn" onClick={add} disabled={!newAct.activity_type}>
              Ajouter
            </button>
            <button type="button" className="btn ghost" onClick={() => { setAdding(false); setNewAct(emptyActivity()); }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn ghost" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
          + Ajouter une activité
        </button>
      )}
    </fieldset>
  );
}

export default function Profil() {
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.profile.get().then((p) => setForm({ ...empty, ...clean(p) })).catch((e) => setError(e.message));
  }, []);

  const clean = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? '']));
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.profile.update({ ...form, smoker: form.smoker ? 1 : 0 });
      setSaved(true);
    } catch (err) { setError(err.message); }
  };

  const age = ageFrom(form.birth_date);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>👤 Mon profil</h2>
          <p className="muted">Ces informations permettent de personnaliser la synthèse et les dépistages</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <form onSubmit={submit} className="form panel" style={{ maxWidth: 640 }}>
        <div className="form-row">
          <label>
            Sexe
            <select value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="">—</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
            </select>
          </label>
          <label>
            Date de naissance
            <input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            {age != null && <small className="muted">{age} ans</small>}
          </label>
        </div>

        <div className="form-row">
          <label>
            Taille (cm)
            <input type="number" step="any" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
          </label>
          <label>
            Poids (kg)
            <input type="number" step="any" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
          </label>
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={!!form.smoker} onChange={(e) => set('smoker', e.target.checked ? 1 : 0)} />
          Fumeur / fumeuse (ou ex-fumeur)
        </label>

        <label>
          Antécédents familiaux ou personnels
          <textarea rows="2" placeholder="ex : mère cancer du sein, diabète…"
            value={form.family_history} onChange={(e) => set('family_history', e.target.value)} />
        </label>

        <ActivitySection />

        <fieldset className="fieldset">
          <legend>Derniers dépistages (facultatif)</legend>
          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
            Permet de calculer la date du prochain examen.
          </p>
          <div className="form-row">
            <label>
              Mammographie
              <input type="date" value={form.last_mammography} onChange={(e) => set('last_mammography', e.target.value)} />
            </label>
            <label>
              Frottis / test HPV
              <input type="date" value={form.last_cervical} onChange={(e) => set('last_cervical', e.target.value)} />
            </label>
            <label>
              Dépistage colorectal
              <input type="date" value={form.last_colorectal} onChange={(e) => set('last_colorectal', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <label>
          Notes
          <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="form-actions">
          {saved && <span className="saved-badge">✓ Enregistré</span>}
          <button type="submit" className="btn">Enregistrer le profil</button>
        </div>
      </form>
    </div>
  );
}
