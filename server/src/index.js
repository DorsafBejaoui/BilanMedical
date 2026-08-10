import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import db from './db.js';
import { crudRouter } from './crud.js';
import bloodRouter, { outOfRangeMarkers } from './blood.js';
import { buildSynthesis } from './synthesis.js';
import { buildContext } from './context.js';
import { annotateReport, annotateReports } from './reportSummary.js';
import { ocrPdf } from './ocr.js';

// En dessous de ce nombre de caractères utiles, un PDF est considéré comme un
// scan (image) sans couche de texte exploitable → on bascule sur l'OCR.
const MIN_NATIVE_TEXT_LENGTH = 20;

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const app = express();
if (!isProd) app.use(cors());   // CORS inutile en prod (même origine localhost)
// Limite relevée : le texte extrait d'un PDF de rapport médical peut dépasser
// la limite par défaut d'Express (100 Ko), ce qui ferait échouer silencieusement
// l'enregistrement d'un rapport un peu long.
app.use(express.json({ limit: '15mb' }));

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
  const lastRadiology = db
    .prepare(`SELECT * FROM radiology_reports ORDER BY date DESC LIMIT 1`)
    .get();
  res.json({
    counts: {
      blood_tests: count('blood_tests'),
      radiology: count('radiology_reports'),
      appointments: count('appointments'),
      summaries: count('summaries'),
    },
    nextAppointment: nextAppointment || null,
    lastRadiology: lastRadiology || null,
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
const PROFILE_FIELDS = [
  'sex', 'birth_date', 'height_cm', 'weight_kg', 'smoker', 'family_history', 'notes',
  'last_mammography', 'last_cervical', 'last_colorectal',
  'activity_type', 'activity_frequency', 'activity_duration',
];

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
  if (!profile.weight_kg) {
    const w = db.prepare(`SELECT value FROM measurements WHERE type = 'poids' ORDER BY measured_at DESC LIMIT 1`).get();
    if (w) profile.weight_kg = w.value;
  }
  profile.activities = db.prepare('SELECT * FROM profile_activities ORDER BY created_at ASC').all();
  const summaries = db.prepare('SELECT title, content, tags, date FROM summaries').all();
  const context = buildContext(summaries);
  res.json(buildSynthesis(profile, outOfRangeMarkers(), context));
});

// Activités physiques (liste, ajout, suppression)
app.get('/api/profile/activities', (req, res) => {
  res.json(db.prepare('SELECT * FROM profile_activities ORDER BY created_at ASC').all());
});

app.post('/api/profile/activities', (req, res) => {
  const { activity_type, frequency, duration } = req.body;
  if (!activity_type) return res.status(400).json({ error: 'Type requis' });
  const r = db.prepare(
    'INSERT INTO profile_activities (activity_type, frequency, duration) VALUES (?, ?, ?)'
  ).run(activity_type, frequency || null, duration || null);
  res.status(201).json(db.prepare('SELECT * FROM profile_activities WHERE id = ?').get(r.lastInsertRowid));
});

app.delete('/api/profile/activities/:id', (req, res) => {
  db.prepare('DELETE FROM profile_activities WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Rapports de radiologie
const radioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const RADIO_FIELDS = ['date', 'exam_type', 'body_part', 'doctor', 'facility', 'conclusion', 'notes', 'pdf_text', 'filename'];

app.get('/api/radiology', (req, res) => {
  const rows = db.prepare('SELECT * FROM radiology_reports ORDER BY date DESC').all();
  res.json(annotateReports(rows));
});

app.get('/api/radiology/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM radiology_reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Rapport introuvable' });
  res.json(annotateReport(row));
});

app.post('/api/radiology', (req, res) => {
  const data = {};
  for (const f of RADIO_FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f] || null;
  if (!data.date) return res.status(400).json({ error: 'La date est requise' });
  const cols = Object.keys(data);
  const row = db.prepare(
    `INSERT INTO radiology_reports (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).run(...cols.map((c) => data[c]));
  res.status(201).json(annotateReport(db.prepare('SELECT * FROM radiology_reports WHERE id = ?').get(row.lastInsertRowid)));
});

app.put('/api/radiology/:id', (req, res) => {
  const data = {};
  for (const f of RADIO_FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f] || null;
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: 'Rien à mettre à jour' });
  db.prepare(`UPDATE radiology_reports SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .run(...cols.map((c) => data[c]), req.params.id);
  const row = db.prepare('SELECT * FROM radiology_reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Rapport introuvable' });
  res.json(annotateReport(row));
});

app.delete('/api/radiology/:id', (req, res) => {
  db.prepare('DELETE FROM radiology_reports WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.post('/api/radiology/import', radioUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  let text = '';
  try {
    const parsed = await pdfParse(req.file.buffer);
    text = (parsed.text || '').trim();
  } catch {
    // Structure PDF non conforme pour pdf-parse : on retente via l'OCR ci-dessous
    // (le rendu image + Tesseract est plus tolérant que l'extraction de texte natif).
  }

  let ocr = false;
  let ocrInfo = null;

  // Aucun texte natif exploitable détecté : le PDF est probablement un scan
  // papier (ou illisible par pdf-parse) → on tente une reconnaissance de
  // caractères (OCR) sur chaque page.
  if (text.replace(/\s+/g, '').length < MIN_NATIVE_TEXT_LENGTH) {
    try {
      const result = await ocrPdf(req.file.buffer);
      if (result.text) {
        text = result.text;
        ocr = true;
        ocrInfo = { pageCount: result.pageCount, pagesProcessed: result.pagesProcessed, truncated: result.truncated };
      }
    } catch (e) {
      if (!text) return res.status(422).json({ error: `Impossible de lire le PDF : ${e.message}` });
    }
  }

  if (!text) return res.status(422).json({ error: 'Impossible de lire le PDF : aucun texte détecté (même après OCR)' });

  res.json({ pdf_text: text, filename: req.file.originalname, ocr, ocrInfo });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// En production (Electron), servir les fichiers statiques du client React.
// client/dist/ se trouve deux niveaux au-dessus de server/src/
if (isProd) {
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // Toute route non-API renvoie index.html (React Router côté client)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(join(clientDist, 'index.html'));
      }
    });
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API BilanMedical sur http://localhost:${PORT}`));
