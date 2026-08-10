import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import db from './db.js';
import { CATALOG } from './catalog.js';
import { getInsight } from './insights.js';
import { ocrPdf } from './ocr.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
});

// En dessous de ce nombre de caractères utiles, un PDF est considéré comme un
// scan (image) sans couche de texte exploitable → on bascule sur l'OCR.
const MIN_NATIVE_TEXT_LENGTH = 20;

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

// Charge les valeurs usuelles personnalisées (priorité maximale)
function getUserRefs() {
  const map = new Map();
  for (const r of db.prepare('SELECT * FROM marker_references').all()) map.set(r.marker, r);
  return map;
}

// Construit le résumé par thème (réutilisé par /summary et le tableau de bord)
export function getSummary() {
  const userRefs = getUserRefs();
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
    // ref du bilan (PDF/saisie) uniquement si pas de valeur personnalisée
    if (!userRefs.has(r.marker)) {
      m.unit = r.unit;
      m.ref_min = r.ref_min;
      m.ref_max = r.ref_max;
    }
  }

  return [...themes.entries()].map(([theme, markers]) => ({
    theme,
    markers: [...markers.values()].map((m) => {
      const uRef = userRefs.get(m.marker);
      const ref_min = uRef ? uRef.ref_min : m.ref_min;
      const ref_max = uRef ? uRef.ref_max : m.ref_max;
      const unit = (uRef && uRef.unit) ? uRef.unit : m.unit;
      const last = m.history[m.history.length - 1];
      const prev = m.history.length > 1 ? m.history[m.history.length - 2] : null;
      return {
        ...m,
        ref_min, ref_max, unit,
        userDefinedRef: !!uRef,
        last,
        status: statusOf(last.value, ref_min, ref_max),
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
        insight: getInsight(m.marker, m.status),
      }))
  );
}

// --- Extraction depuis un PDF de laboratoire -------------------------------

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Génère des variantes de nom : "ASAT (TGO)" -> ["ASAT (TGO)", "ASAT", "TGO"]
function aliasesFor(marker) {
  const name = marker.name;
  const set = new Set([name]);
  const before = name.split('(')[0].trim();
  if (before.length >= 2) set.add(before);
  const inside = name.match(/\(([^)]+)\)/);
  if (inside && inside[1].trim().length >= 2) set.add(inside[1].trim());
  for (const a of marker.aliases || []) if (a && a.trim().length >= 2) set.add(a.trim());
  // Alias les plus longs d'abord : on privilégie une correspondance précise
  return [...set].sort((a, b) => b.length - a.length);
}

const toNum = (s) => parseFloat(s.replace(',', '.'));

// Un nombre « autonome » : non collé à une lettre ou un autre chiffre,
// pour ne pas confondre le « 1 » de HbA1c, le « 4 » de T4, etc. avec une valeur.
const NUM = '(?<![\\p{L}\\d])(\\d+(?:[.,]\\d+)?)(?![\\p{L}\\d])';
const RANGE_RE = new RegExp(`${NUM}\\s*(?:-|–|a|à)\\s*(\\d+(?:[.,]\\d+)?)`, 'u');
const LT_RE = new RegExp(`(?:<|inf(?:erieur)?\\.?\\s*a?)\\s*${NUM}`, 'u');
const GT_RE = new RegExp(`(?:>|sup(?:erieur)?\\.?\\s*a?)\\s*${NUM}`, 'u');
const FIRST_NUM_RE = new RegExp(NUM, 'u');

// Lit un intervalle de référence dans un fragment de texte (normalisé).
// Gère : "0.40 - 4.00", "0,40 à 4,00", "< 5", "inf à 5", "> 0.4", "sup à 0.4".
function parseRange(seg) {
  let m = seg.match(RANGE_RE);
  if (m) return { ref_min: toNum(m[1]), ref_max: toNum(m[2]) };
  m = seg.match(LT_RE);
  if (m) return { ref_min: null, ref_max: toNum(m[1]) };
  m = seg.match(GT_RE);
  if (m) return { ref_min: toNum(m[1]), ref_max: null };
  return null;
}

function extractFromText(text) {
  const flat = text.replace(/ /g, ' ');
  // Date du prélèvement (premier format jj/mm/aaaa rencontré)
  let date = null;
  const dm = flat.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/);
  if (dm) date = `${dm[3]}-${dm[2]}-${dm[1]}`;

  // Liste à plat des marqueurs, triés par longueur d'alias décroissante :
  // les noms les plus spécifiques (ex : « hémoglobine glyquée ») sont traités
  // avant les plus courts (ex : « hémoglobine ») pour éviter les collisions.
  const all = [];
  for (const theme of CATALOG) {
    for (const marker of theme.markers) {
      const aliases = aliasesFor(marker);
      all.push({ theme: theme.theme, marker, aliases, maxLen: aliases[0]?.length || 0 });
    }
  }
  all.sort((a, b) => b.maxLen - a.maxLen);

  // Texte de travail : chaque correspondance trouvée est « masquée » pour
  // qu'un marqueur au nom plus court ne réutilise pas la même valeur.
  let work = normalize(flat);
  const found = new Map();
  for (const { theme, marker, aliases } of all) {
    let done = false;
    for (const alias of aliases) {
      if (done) break;
      const esc = normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRe = new RegExp(`\\b${esc}\\b`);
      const nm = work.match(nameRe);
      if (!nm) continue;

      // On raisonne sur la ligne entière contenant le marqueur
      const start = nm.index;
      const lineStart = work.lastIndexOf('\n', start) + 1;
      const nl = work.indexOf('\n', start);
      const lineEnd = nl === -1 ? work.length : nl;
      const afterName = work.slice(start + nm[0].length, lineEnd);

      // La valeur usuelle est étiquetée "N:" → on sépare valeur (avant) et référence (après)
      const nIdx = afterName.search(/\bn\s*:/);
      const valuePart = nIdx >= 0 ? afterName.slice(0, nIdx) : afterName;
      const refPart = nIdx >= 0 ? afterName.slice(nIdx) : afterName;

      const vm = valuePart.match(FIRST_NUM_RE); // 1ère valeur autonome après le nom
      if (!vm) continue; // nom trouvé mais pas de valeur exploitable → alias suivant

      const ref = parseRange(refPart); // référence "N:" si présente, sinon plage de la ligne
      found.set(marker.name, {
        theme, marker: marker.name, value: toNum(vm[1]),
        unit: marker.unit,
        // Référence lue sur le bilan, sinon repli sur le catalogue
        ref_min: ref ? ref.ref_min : marker.min,
        ref_max: ref ? ref.ref_max : marker.max,
      });
      // Masque toute la ligne pour qu'un autre marqueur n'y repioche pas de nombre
      work = work.slice(0, lineStart) + ' '.repeat(lineEnd - lineStart) + work.slice(lineEnd);
      done = true;
    }
  }

  // Restitue les résultats dans l'ordre du catalogue
  const results = [];
  for (const theme of CATALOG) {
    for (const marker of theme.markers) {
      if (found.has(marker.name)) results.push(found.get(marker.name));
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

// --- Valeurs usuelles personnalisées ---------------------------------------

// Renvoie la liste fusionnée catalogue + overrides utilisateur
router.get('/references', (req, res) => {
  const userRefs = getUserRefs();
  const merged = [];
  for (const theme of CATALOG) {
    for (const m of theme.markers) {
      const u = userRefs.get(m.name);
      merged.push({
        marker: m.name,
        theme: theme.theme,
        unit: u ? (u.unit ?? m.unit) : m.unit,
        ref_min: u ? u.ref_min : m.min,
        ref_max: u ? u.ref_max : m.max,
        catalog_min: m.min,
        catalog_max: m.max,
        catalog_unit: m.unit,
        source: u ? 'user' : 'catalog',
      });
    }
  }
  res.json(merged);
});

router.put('/references/:marker', (req, res) => {
  const marker = decodeURIComponent(req.params.marker);
  const { unit, ref_min, ref_max, theme } = req.body;
  db.prepare(`
    INSERT INTO marker_references (marker, theme, unit, ref_min, ref_max, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(marker) DO UPDATE SET
      theme = excluded.theme, unit = excluded.unit,
      ref_min = excluded.ref_min, ref_max = excluded.ref_max,
      updated_at = excluded.updated_at
  `).run(
    marker,
    theme || null,
    unit || null,
    ref_min === '' || ref_min == null ? null : Number(ref_min),
    ref_max === '' || ref_max == null ? null : Number(ref_max)
  );
  res.json({ ok: true });
});

router.delete('/references/:marker', (req, res) => {
  db.prepare('DELETE FROM marker_references WHERE marker = ?').run(decodeURIComponent(req.params.marker));
  res.status(204).end();
});

// Import CSV : Marqueur;Min;Max;Unité  (en-tête requis, séparateur ; ou ,)
router.post('/references/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const text = req.file.buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(422).json({ error: 'Fichier vide ou sans en-tête' });

  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const iMarker = header.findIndex(h => h.includes('marqueur') || h.includes('marker'));
  const iMin    = header.findIndex(h => h === 'min');
  const iMax    = header.findIndex(h => h === 'max');
  const iUnit   = header.findIndex(h => h.includes('unit'));
  if (iMarker < 0) return res.status(422).json({ error: "Colonne 'Marqueur' introuvable dans l'en-tête" });

  // Index catalogue pour retrouver thème et valeurs par défaut
  const catIndex = new Map();
  for (const theme of CATALOG) for (const m of theme.markers) catIndex.set(m.name, { theme: theme.theme, ...m });

  const toNum = (s) => { if (!s) return null; const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? null : n; };

  const upsert = db.prepare(`
    INSERT INTO marker_references (marker, theme, unit, ref_min, ref_max, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(marker) DO UPDATE SET
      theme = excluded.theme, unit = excluded.unit,
      ref_min = excluded.ref_min, ref_max = excluded.ref_max,
      updated_at = excluded.updated_at
  `);

  let count = 0;
  const errors = [];
  const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim());
      const marker = cols[iMarker];
      if (!marker) continue;
      const cat = catIndex.get(marker);
      const ref_min = iMin >= 0 ? toNum(cols[iMin]) : null;
      const ref_max = iMax >= 0 ? toNum(cols[iMax]) : null;
      const unit    = iUnit >= 0 ? (cols[iUnit] || null) : (cat ? cat.unit : null);
      if (ref_min === null && ref_max === null) { errors.push(`Ligne ${i + 1} (${marker}) : aucune valeur min/max`); continue; }
      upsert.run(marker, cat ? cat.theme : null, unit, ref_min, ref_max);
      count++;
    }
  });
  tx();
  res.json({ imported: count, errors });
});

// Import d'un PDF de laboratoire : renvoie un brouillon (date + résultats détectés)
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  let text = '';
  try {
    const data = await pdfParse(req.file.buffer);
    text = (data.text || '').trim();
  } catch {
    // Structure PDF non conforme pour pdf-parse : on retente via l'OCR ci-dessous.
  }

  let ocr = false;

  // Aucun texte natif exploitable détecté : le PDF est probablement un scan
  // papier (ou illisible par pdf-parse) → on tente une reconnaissance de
  // caractères (OCR) sur chaque page.
  if (text.replace(/\s+/g, '').length < MIN_NATIVE_TEXT_LENGTH) {
    try {
      const result = await ocrPdf(req.file.buffer);
      if (result.text) { text = result.text; ocr = true; }
    } catch { /* on retombe sur le texte natif (éventuellement vide) si l'OCR échoue */ }
  }

  if (!text) return res.status(400).json({ error: 'PDF illisible ou protégé (même après OCR)' });

  const draft = extractFromText(text);
  res.json({ ...draft, source: req.file.originalname, ocr });
});

export default router;
