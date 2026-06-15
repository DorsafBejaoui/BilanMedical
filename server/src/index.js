import express from 'express';
import cors from 'cors';
import db from './db.js';
import { crudRouter } from './crud.js';
import bloodRouter from './blood.js';

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
  });
});

// Série temporelle d'un type de mesure (pour les graphiques)
app.get('/api/measurements/series/:type', (req, res) => {
  const rows = db
    .prepare(`SELECT id, value, value2, unit, measured_at FROM measurements WHERE type = ? ORDER BY measured_at ASC`)
    .all(req.params.type);
  res.json(rows);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API BilanMedical sur http://localhost:${PORT}`));
