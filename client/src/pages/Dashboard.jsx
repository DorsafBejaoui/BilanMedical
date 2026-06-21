import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatDateTime } from '../helpers.js';

const cards = [
  { key: 'blood_tests', label: 'Bilans sanguins', icon: '📊', to: '/bilans-sanguins', color: '#ec4899' },
  { key: 'radiology', label: 'Radiologie', icon: '🩻', to: '/radiologie', color: '#10b981' },
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
          <h3>🩻 Dernier rapport radiologie</h3>
          {stats.lastRadiology ? (
            <div className="dash-item">
              <strong>{stats.lastRadiology.exam_type || 'Examen d'imagerie'}</strong>
              {stats.lastRadiology.body_part && (
                <span className="tag" style={{ marginLeft: 6 }}>{stats.lastRadiology.body_part}</span>
              )}
              <p className="muted">{formatDate(stats.lastRadiology.date)}{stats.lastRadiology.doctor && ` · Dr ${stats.lastRadiology.doctor}`}</p>
              {stats.lastRadiology.conclusion && <p>{stats.lastRadiology.conclusion}</p>}
            </div>
          ) : (
            <p className="muted">Aucun rapport enregistré.</p>
          )}
        </section>
      </div>
    </div>
  );
}
