import { Router } from 'express';
import db from './db.js';
import { CATALOG } from './catalog.js';

const router = Router();

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

// Catalogue des marqueurs prédéfinis
router.get('/catalog', (req, res) => res.json(CATALOG));

// Liste des rapports (avec leurs résultats), du plus récent au plus ancien
router.get('/tests', (req, res) => {
  const tests = db.prepare('SELECT * FROM blood_tests ORDER BY date DESC').all();
  for (const t of tests) {
    t.results = db
      .prepare('SELECT * FROM blood_results WHERE blood_test_id = ? ORDER BY theme, marker')
      .all(t.id);
  }
  res.json(tests);
});

// Création d'un rapport avec ses résultats
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
  const id = tx();
  res.status(201).json(getTest(id));
});

// Mise à jour d'un rapport (remplace l'ensemble des résultats)
router.put('/tests/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM blood_tests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const { date, lab, doctor, notes, results } = req.body;
  const tx = db.transaction(() => {
    db.prepare('UPDATE blood_tests SET date = ?, lab = ?, doctor = ?, notes = ? WHERE id = ?').run(
      date,
      lab || null,
      doctor || null,
      notes || null,
      req.params.id
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

// Résumé par thème : pour chaque marqueur, l'évolution dans le temps,
// la dernière valeur, son statut et les valeurs de référence.
router.get('/summary', (req, res) => {
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
      markers.set(r.marker, {
        marker: r.marker,
        unit: r.unit,
        ref_min: r.ref_min,
        ref_max: r.ref_max,
        history: [],
      });
    }
    const m = markers.get(r.marker);
    m.history.push({ date: r.date, value: r.value });
    // La dernière référence connue prévaut
    m.unit = r.unit;
    m.ref_min = r.ref_min;
    m.ref_max = r.ref_max;
  }

  const status = (value, min, max) => {
    if (min != null && value < min) return 'bas';
    if (max != null && value > max) return 'eleve';
    return 'normal';
  };

  const result = [...themes.entries()].map(([theme, markers]) => ({
    theme,
    markers: [...markers.values()].map((m) => {
      const last = m.history[m.history.length - 1];
      const prev = m.history.length > 1 ? m.history[m.history.length - 2] : null;
      return {
        ...m,
        last,
        status: status(last.value, m.ref_min, m.ref_max),
        trend: prev ? Math.sign(last.value - prev.value) : 0, // -1, 0, +1
      };
    }),
  }));

  res.json(result);
});

export default router;
