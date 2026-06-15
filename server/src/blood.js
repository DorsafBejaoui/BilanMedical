import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import db from './db.js';
import { CATALOG } from './catalog.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
});

// Récupère un rapport complet avec ses résultats
function getTest(id) {
  const test = db.prepare('SELECT * FROM blood_tests WHERE id = ?').get(id);
  if (!test) return null;
  test.results = db
    .prepare('SELECT * FROM blood_results WHERE blood_test_id = ? ORDER BY theme, marker')
    .all(id);
  return test;
}

// Insère les résultats d'un rapport (validés)
function insertResults(testId, results = []) {
  const stmt = db.prepare(
    `INSERT INTO blood_results (blood_test_id, theme, marker, value, unit, ref_min, ref_max)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const r of results) {
    if (!r || r.marker == null || r.value === '' || r.value == null) continue;
    stmt.run(
      testId,
      r.theme || 'Autre',
      r.marker,
      Number(r.value),
      r.unit || null,
      r.ref_min === '' || r.ref_min == null ? null : Number(r.ref_min),
      r.ref_max === '' || r.ref_max == null ? null : Number(r.ref_max)
    );
  }
}

export function statusOf(value, min, max) {
  if (min != null && value < min) return 'bas';
  if (max != null && value > max) return 'eleve';
  return 'normal';
}

// Construit le résumé par thème (réutilisé par /summary et le tableau de bord)
export function getSummary() {
  const rows = db
    .prepare(
      `SELECT br.theme, br.marker, br.unit, br.ref_min, br.ref_max, br.value, bt.date
       FROM blood_results br
       JOIN blood_tests bt ON bt.id = br.blood_test_id
       ORDER BY br.theme, br.marker, bt.date ASC`
    )
    .all();

  const themes = new Map();
  for (const r of rows) {
    if (!themes.has(r.theme)) themes.set(r.theme, new Map());
    const markers = themes.get(r.theme);
    if (!markers.has(r.marker)) {
      markers.set(r.marker, { marker: r.marker, unit: r.unit, ref_min: r.ref_min, ref_max: r.ref_max, history: [] });
    }
    const m = markers.get(r.marker);
    m.history.push({ date: r.date, value: r.value });
    m.unit = r.unit;
    m.ref_min = r.ref_min;
    m.ref_max = r.ref_max;
  }

  return [...themes.entries()].map(([theme, markers]) => ({
    theme,
    markers: [...markers.values()].map((m) => {
      const last = m.history[m.history.length - 1];
      const prev = m.history.length > 1 ? m.history[m.history.length - 2] : null;
      return {
        ...m,
        last,
        status: statusOf(last.value, m.ref_min, m.ref_max),
        trend: prev ? Math.sign(last.value - prev.value) : 0,
      };
    }),
  }));
}

// Liste à plat des marqueurs hors plage (dernière valeur), pour le tableau de bord
export function outOfRangeMarkers() {
  return getSummary().flatMap((g) =>
    g.markers
      .filter((m) => m.status !== 'normal')
      .map((m) => ({
        theme: g.theme,
        marker: m.marker,
        value: m.last.value,
        date: m.last.date,
        unit: m.unit,
        status: m.status,
        ref_min: m.ref_min,
        ref_max: m.ref_max,
      }))
  );
}

// --- Extraction depuis un PDF de laboratoire -------------------------------

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Génère des variantes de nom : "ASAT (TGO)" -> ["ASAT (TGO)", "ASAT", "TGO"]
function aliasesFor(name) {
  const set = new Set([name]);
  const before = name.split('(')[0].trim();
  if (before.length >= 2) set.add(before);
  const inside = name.match(/\(([^)]+)\)/);
  if (inside && inside[1].trim().length >= 2) set.add(inside[1].trim());
  return [...set];
}

function extractFromText(text) {
  const flat = text.replace(/ /g, ' ');
  const norm = normalize(flat);

  // Date du prélèvement (premier format jj/mm/aaaa rencontré)
  let date = null;
  const dm = flat.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/);
  if (dm) date = `${dm[3]}-${dm[2]}-${dm[1]}`;

  const results = [];
  for (const theme of CATALOG) {
    for (const marker of theme.markers) {
      let value = null;
      for (const alias of aliasesFor(marker.name)) {
        const esc = normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // alias (en mot entier) suivi d'un peu de texte puis d'un nombre
        const re = new RegExp(`\\b${esc}\\b[^\\n\\d]{0,40}?(\\d+(?:[.,]\\d+)?)`);
        const mm = norm.match(re);
        if (mm) { value = parseFloat(mm[1].replace(',', '.')); break; }
      }
      if (value != null) {
        results.push({
          theme: theme.theme, marker: marker.name, value,
          unit: marker.unit, ref_min: marker.min, ref_max: marker.max,
        });
      }
    }
  }
  return { date, results };
}

// --- Routes ----------------------------------------------------------------

router.get('/catalog', (req, res) => res.json(CATALOG));

router.get('/tests', (req, res) => {
  const tests = db.prepare('SELECT * FROM blood_tests ORDER BY date DESC').all();
  for (const t of tests) {
    t.results = db
      .prepare('SELECT * FROM blood_results WHERE blood_test_id = ? ORDER BY theme, marker')
      .all(t.id);
  }
  res.json(tests);
});

router.post('/tests', (req, res) => {
  const { date, lab, doctor, notes, results } = req.body;
  if (!date) return res.status(400).json({ error: 'La date est obligatoire' });
  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO blood_tests (date, lab, doctor, notes) VALUES (?, ?, ?, ?)')
      .run(date, lab || null, doctor || null, notes || null);
    insertResults(info.lastInsertRowid, results);
    return info.lastInsertRowid;
  });
  res.status(201).json(getTest(tx()));
});

router.put('/tests/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM blood_tests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const { date, lab, doctor, notes, results } = req.body;
  const tx = db.transaction(() => {
    db.prepare('UPDATE blood_tests SET date = ?, lab = ?, doctor = ?, notes = ? WHERE id = ?').run(
      date, lab || null, doctor || null, notes || null, req.params.id
    );
    db.prepare('DELETE FROM blood_results WHERE blood_test_id = ?').run(req.params.id);
    insertResults(req.params.id, results);
  });
  tx();
  res.json(getTest(req.params.id));
});

router.delete('/tests/:id', (req, res) => {
  const info = db.prepare('DELETE FROM blood_tests WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).end();
});

router.get('/summary', (req, res) => res.json(getSummary()));

// Import d'un PDF de laboratoire : renvoie un brouillon (date + résultats détectés)
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  let text;
  try {
    const data = await pdfParse(req.file.buffer);
    text = data.text || '';
  } catch {
    return res.status(400).json({ error: 'PDF illisible ou protégé' });
  }
  const draft = extractFromText(text);
  res.json({ ...draft, source: req.file.originalname });
});

export default router;
