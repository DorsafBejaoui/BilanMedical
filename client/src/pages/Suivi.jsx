import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, nowLocal } from '../helpers.js';
import Modal from '../components/Modal.jsx';
import Sparkline from '../components/Sparkline.jsx';

// Types de mesures prédéfinis avec leur unité
const TYPES = [
  { value: 'poids', label: 'Poids', unit: 'kg', dual: false },
  { value: 'tension', label: 'Tension artérielle', unit: 'mmHg', dual: true },
  { value: 'frequence_cardiaque', label: 'Fréquence cardiaque', unit: 'bpm', dual: false },
  { value: 'glycemie', label: 'Glycémie', unit: 'g/L', dual: false },
  { value: 'temperature', label: 'Température', unit: '°C', dual: false },
  { value: 'saturation', label: 'Saturation O₂', unit: '%', dual: false },
];

const labelOf = (v) => TYPES.find((t) => t.value === v)?.label || v;
const emptyForm = () => ({ type: 'poids', value: '', value2: '', unit: 'kg', measured_at: nowLocal(true), notes: '' });

export default function Suivi() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [chartType, setChartType] = useState('poids');
  const [series, setSeries] = useState([]);
  const [error, setError] = useState(null);

  const load = () => api.list('measurements').then(setItems).catch((e) => setError(e.message));
  const loadSeries = (t) => api.series(t).then(setSeries).catch(() => setSeries([]));

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSeries(chartType); }, [chartType, items]);

  const onTypeChange = (type) => {
    const def = TYPES.find((t) => t.value === type);
    setForm((f) => ({ ...f, type, unit: def?.unit || '', value2: def?.dual ? f.value2 : '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.create('measurements', {
        ...form,
        value: Number(form.value),
        value2: form.value2 === '' ? null : Number(form.value2),
      });
      setOpen(false);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer cette mesure ?')) return;
    await api.remove('measurements', id);
    load();
  };

  const isDual = TYPES.find((t) => t.value === form.type)?.dual;
  const chartData = series.map((s) => ({ ...s, value: s.value }));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>📈 Suivi de santé</h2>
          <p className="muted">Suivez vos constantes au fil du temps</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>+ Nouvelle mesure</button>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <div className="panel-header">
          <h3>Évolution — {labelOf(chartType)}</h3>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Sparkline data={chartData} />
      </section>

      <section className="panel">
        <h3>Historique des mesures</h3>
        {items.length === 0 ? (
          <p className="muted">Aucune mesure. Ajoutez-en une pour commencer.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Valeur</th><th>Date</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>{labelOf(m.type)}</td>
                  <td><span className="badge">{m.value}{m.value2 ? `/${m.value2}` : ''} {m.unit || ''}</span></td>
                  <td>{formatDate(m.measured_at)}</td>
                  <td className="muted">{m.notes || '—'}</td>
                  <td><button className="icon-btn danger" onClick={() => remove(m.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <Modal title="Nouvelle mesure" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Type
              <select value={form.type} onChange={(e) => onTypeChange(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>
                {isDual ? 'Systolique' : 'Valeur'}
                <input type="number" step="any" required value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </label>
              {isDual && (
                <label>
                  Diastolique
                  <input type="number" step="any" value={form.value2}
                    onChange={(e) => setForm({ ...form, value2: e.target.value })} />
                </label>
              )}
              <label>
                Unité
                <input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </label>
            </div>
            <label>
              Date et heure
              <input type="datetime-local" required value={form.measured_at}
                onChange={(e) => setForm({ ...form, measured_at: e.target.value })} />
            </label>
            <label>
              Notes
              <textarea rows="2" value={form.notes || ''}
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
