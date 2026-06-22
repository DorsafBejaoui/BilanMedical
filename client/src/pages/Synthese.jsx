import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate } from '../helpers.js';

const SCREEN_STATUS = {
  a_jour: { label: 'À jour', cls: 'status-normal' },
  a_prevoir: { label: 'À prévoir', cls: 'status-eleve' },
  a_discuter: { label: 'À discuter', cls: 'status-bas' },
};

export default function Synthese() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.synthesis().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Chargement…</p></div>;

  if (!data.hasProfile) {
    return (
      <div className="page">
        <header className="page-header"><h2>🧠 Synthèse santé</h2></header>
        <section className="panel">
          <p>Pour générer une synthèse personnalisée (dépistages, IMC, recommandations), renseignez d'abord votre profil.</p>
          <Link to="/profil" className="btn" style={{ display: 'inline-block', marginTop: 8 }}>Compléter mon profil</Link>
        </section>
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>🧠 Synthèse santé</h2>
          <p className="muted">Analyse personnalisée à partir de votre profil et de vos bilans</p>
        </div>
        <Link to="/profil" className="btn ghost">Modifier le profil</Link>
      </header>

      {/* Carte profil */}
      <section className="panel">
        <div className="profile-summary">
          <span>{p.sex === 'F' ? '♀ Femme' : p.sex === 'M' ? '♂ Homme' : '—'}</span>
          {p.age != null && <span><strong>{p.age}</strong> ans</span>}
          {p.bmi && <span>IMC <strong>{p.bmi}</strong> ({p.bmiCategory})</span>}
          {p.smoker && <span className="tag status-eleve">Tabac</span>}
        </div>
      </section>

      {/* Dépistages */}
      <section className="panel">
        <h3>🗓️ Dépistages recommandés</h3>
        {data.screenings.length === 0 ? (
          <p className="muted">Aucun dépistage organisé spécifique à votre tranche d'âge pour le moment.</p>
        ) : (
          <div className="card-list">
            {data.screenings.map((s) => {
              const st = SCREEN_STATUS[s.status] || SCREEN_STATUS.a_discuter;
              return (
                <div key={s.key} className="screening-item">
                  <div className="screening-head">
                    <span>{s.icon} <strong>{s.title}</strong></span>
                    <span className={`tag ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="muted">{s.recommendation}</p>
                  {s.nextDate && (
                    <p className="screening-next">📌 Prochain examen conseillé : <strong>{formatDate(s.nextDate)}</strong></p>
                  )}
                  {s.note && <p className="muted" style={{ fontSize: 13 }}>{s.note}</p>}
                  {s.mentionNote && <p className="context-note">📝 {s.mentionNote}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Marqueurs hors plage */}
      {data.bloodFindings.length > 0 && (
        <section className="panel">
          <h3>🩸 Points d'attention biologiques</h3>
          <div className="card-list">
            {data.bloodFindings.map((m) => (
              <div key={`${m.theme}-${m.marker}`} className={`finding status-${m.status}`}>
                <div className="finding-head">
                  <strong>{m.marker}</strong>
                  <span>{m.value} {m.unit || ''} <span className="muted">({m.status === 'eleve' ? 'élevé' : 'bas'}, réf. {m.ref_min ?? '—'}–{m.ref_max ?? '—'})</span></span>
                </div>
                {m.insight && <p className="finding-insight">{m.insight.level === 'urgent' ? '🚨 ' : '💡 '}{m.insight.message}</p>}
                {m.medContext && <p className="context-note">💊 {m.medContext}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conseils généraux */}
      {data.generalAdvice.length > 0 && (
        <section className="panel">
          <h3>✅ Conseils personnalisés</h3>
          <ul className="advice-list">
            {data.generalAdvice.map((a, i) => (
              <li key={i}><span className="advice-icon">{a.icon}</span> {a.text}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="disclaimer">
        ℹ️ Synthèse à titre informatif, fondée sur des repères de dépistage généraux (HAS).
        Elle ne remplace pas une consultation : votre médecin adapte ces recommandations à votre situation.
      </p>
    </div>
  );
}
