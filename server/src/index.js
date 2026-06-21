import express from 'express';
import cors from 'cors';
import db from './db.js';
import { crudRouter } from './crud.js';
import bloodRouter, { outOfRangeMarkers } from './blood.js';
import { buildSynthesis } from './synthesis.js';

const app = express();
app.use(cors());
app.use(express.json());

// Modules CRUD
app.use(
  '/api/measurements',
  crudRouter('measurements', ['type', 'value', 'value2', 'unit', 'measured_at', 'notes'], 'measured_at DESC')
);
app.use(
  '/api/bilans',
  crudRouter('bilans', ['title', 'category', 'date', 'doctor', 'results', 'conclusion', 'notes'], 'date DESC')
);
app.use(
  '/api/appointments',
  crudRouter('appointments', ['title', 'doctor', 'specialty', 'location', 'starts_at', 'status', 'notes'], 'starts_at DESC')
);
app.use(
  '/api/summaries',
  crudRouter('summaries', ['title', 'date', 'content', 'tags'], 'date DESC')
);
app.use('/api/blood', bloodRouter);

// Statistiques pour le tableau de bord
app.get('/api/stats', (req, res) => {
  const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  const nextAppointment = db
    .prepare(`SELECT * FROM appointments WHERE starts_at >= datetime('now') AND status = 'a_venir' ORDER BY starts_at ASC LIMIT 1`)
    .get();
  const lastBilan = db.prepare(`SELECT * FROM bilans ORDER BY date DESC LIMIT 1`).get();
  const recentMeasurements = db
    .prepare(`SELECT * FROM measurements ORDER BY measured_at DESC LIMIT 5`)
    .all();
  res.json({
    counts: {
      measurements: count('measurements'),
      bilans: count('bilans'),
      appointments: count('appointments'),
      summaries: count('summaries'),
      blood_tests: count('blood_tests'),
    },
    nextAppointment: nextAppointment || null,
    lastBilan: lastBilan || null,
    recentMeasurements,
    outOfRange: outOfRangeMarkers(),
  });
});

// Série temporelle d'un type de mesure (pour les graphiques)
app.get('/api/measurements/series/:type', (req, res) => {
  const rows = db
    .prepare(`SELECT id, value, value2, unit, measured_at FROM measurements WHERE type = ? ORDER BY measured_at ASC`)
    .all(req.params.type);
  res.json(rows);
});

// Profil de l'utilisateur (ligne unique)
const PROFILE_FIELDS = ['sex', 'birth_date', 'height_cm', 'weight_kg', 'smoker', 'family_history', 'notes', 'last_mammography', 'last_cervical', 'last_colorectal'];

app.get('/api/profile', (req, res) => {
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get());
});

app.put('/api/profile', (req, res) => {
  const data = {};
  for (const f of PROFILE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f] === '' ? null : req.body[f];
  }
  if (data.smoker !== undefined) data.smoker = data.smoker ? 1 : 0;
  const cols = Object.keys(data);
  if (cols.length) {
    db.prepare(`UPDATE profile SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`)
      .run(...cols.map((c) => data[c]));
  }
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get());
});

// Synthèse santé : profil + dépistages + marqueurs hors plage
app.get('/api/synthesis', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  // Complète le poids depuis la dernière mesure si non renseigné dans le profil
  if (!profile.weight_kg) {
    const w = db.prepare(`SELECT value FROM measurements WHERE type = 'poids' ORDER BY measured_at DESC LIMIT 1`).get();
    if (w) profile.weight_kg = w.value;
  }
  res.json(buildSynthesis(profile, outOfRangeMarkers()));
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API BilanMedical sur http://localhost:${PORT}`));
