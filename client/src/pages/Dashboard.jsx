import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatDateTime } from '../helpers.js';

const cards = [
  { key: 'measurements', label: 'Mesures', icon: '📈', to: '/suivi', color: '#3b82f6' },
  { key: 'blood_tests', label: 'Bilans sanguins', icon: '📊', to: '/bilans-sanguins', color: '#ec4899' },
  { key: 'bilans', label: 'Bilans & examens', icon: '🧪', to: '/bilans', color: '#10b981' },
  { key: 'appointments', label: 'Rendez-vous', icon: '📅', to: '/rendez-vous', color: '#f59e0b' },
  { key: 'summaries', label: 'Résumés', icon: '📋', to: '/resumes', color: '#8b5cf6' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!stats) return <div className="page"><p className="muted">Chargement…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h2>Tableau de bord</h2>
        <p className="muted">Vue d'ensemble de votre santé</p>
      </header>

      <div className="stat-grid">
        {cards.map((c) => (
          <Link key={c.key} to={c.to} className="stat-card" style={{ '--accent': c.color }}>
            <span className="stat-icon">{c.icon}</span>
            <span className="stat-number">{stats.counts[c.key]}</span>
            <span className="stat-label">{c.label}</span>
          </Link>
        ))}
      </div>

      {stats.outOfRange?.length > 0 && (
        <section className="panel alert-panel">
          <h3>⚠️ Marqueurs hors plage ({stats.outOfRange.length})</h3>
          <div className="alert-grid">
            {stats.outOfRange.map((m) => (
              <Link key={`${m.theme}-${m.marker}`} to="/bilans-sanguins" className={`alert-item status-${m.status}`}>
                {m.insight && (
                  <span className={`insight insight-${m.insight.level}`}>
                    <span className="insight-icon">{m.insight.level === 'urgent' ? '🚨' : '💡'}</span>
                    {m.insight.message}
                  </span>
                )}
                <span className="alert-marker">{m.marker}</span>
                <span className="alert-value">{m.value} {m.unit || ''}</span>
                <span className="alert-meta">
                  {m.status === 'eleve' ? 'Élevé' : 'Bas'} · réf. {m.ref_min ?? '—'}–{m.ref_max ?? '—'} · {m.theme}
                </span>
              </Link>
            ))}
          </div>
          <p className="disclaimer">
            ℹ️ Recommandations à titre informatif, fondées sur des repères médicaux généraux.
            Elles ne remplacent pas l'avis de votre médecin.
          </p>
        </section>
      )}

      <div className="dash-columns">
        <section className="panel">
          <h3>📅 Prochain rendez-vous</h3>
          {stats.nextAppointment ? (
            <div className="dash-item">
              <strong>{stats.nextAppointment.title}</strong>
              <p className="muted">
                {stats.nextAppointment.specialty && `${stats.nextAppointment.specialty} · `}
                {formatDateTime(stats.nextAppointment.starts_at)}
              </p>
              {stats.nextAppointment.location && <p className="muted">📍 {stats.nextAppointment.location}</p>}
            </div>
          ) : (
            <p className="muted">Aucun rendez-vous à venir.</p>
          )}
        </section>

        <section className="panel">
          <h3>🧪 Dernier bilan</h3>
          {stats.lastBilan ? (
            <div className="dash-item">
              <strong>{stats.lastBilan.title}</strong>
              <p className="muted">{formatDate(stats.lastBilan.date)}</p>
              {stats.lastBilan.conclusion && <p>{stats.lastBilan.conclusion}</p>}
            </div>
          ) : (
            <p className="muted">Aucun bilan enregistré.</p>
          )}
        </section>

        <section className="panel">
          <h3>📈 Mesures récentes</h3>
          {stats.recentMeasurements.length ? (
            <ul className="dash-list">
              {stats.recentMeasurements.map((m) => (
                <li key={m.id}>
                  <span>{m.type}</span>
                  <span className="badge">
                    {m.value}{m.value2 ? `/${m.value2}` : ''} {m.unit || ''}
                  </span>
                  <span className="muted">{formatDate(m.measured_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucune mesure enregistrée.</p>
          )}
        </section>
      </div>
    </div>
  );
}
