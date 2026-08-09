// Résumé automatique et messages clés pour les rapports médicaux (radiologie, biologie…).
//
// IMPORTANT : détection par mots-clés curés manuellement (pas d'IA), afin de
// rester fiable, explicable et cohérente avec le reste de l'application
// (voir context.js, insights.js). Le but est d'aider à repérer rapidement
// l'essentiel d'un rapport (conclusion, texte PDF) sans avoir à tout relire.
//
// Ces messages sont informatifs et ne remplacent jamais la lecture complète
// du rapport ni l'avis du médecin.

// Mots-clés « rassurants » (résultat normal / sans anomalie).
const NORMAL_KEYWORDS = [
  'sans anomalie', 'pas d\'anomalie', 'absence d\'anomalie', 'aspect normal',
  'examen normal', 'sans particularité', 'rien à signaler', 'rien de particulier',
  'aspect satisfaisant', 'aucune anomalie', 'normal pour l\'âge', 'bilan normal',
];

// Mots-clés évoquant une anomalie à surveiller / discuter avec le médecin.
const WARNING_KEYWORDS = [
  'anomalie', 'lésion', 'nodule', 'kyste', 'suspect', 'suspicion', 'fracture',
  'hernie', 'sténose', 'épanchement', 'infiltrat', 'masse', 'tumeur',
  'métastase', 'thrombose', 'compression', 'protrusion', 'calcification',
  'hématome', 'dilatation', 'irrégularité', 'asymétrie', 'inflammation',
  'dégénératif', 'arthrose', 'discopathie', 'polype', 'adénopathie',
];

// Mots-clés évoquant une situation nécessitant une attention rapide.
const URGENT_KEYWORDS = [
  'urgence', 'urgent', 'critique', 'hémorragie', 'perforation', 'rupture',
  'avc', 'ischémie', 'occlusion', 'infarctus', 'embolie',
];

function normalize(s) {
  return (s || '').toLowerCase();
}

// Découpe un texte libre en phrases exploitables.
function splitSentences(text) {
  return (text || '')
    .split(/[\n\r]+|(?<=[.;:])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 8 && s.length <= 320);
}

// Mots de négation pouvant précéder un mot-clé d'alerte (ex : « pas d'anomalie »,
// « sans lésion »…) — évite de classer ces tournures rassurantes en alerte.
const NEGATIONS = ['sans', 'pas de', "pas d'", 'aucune', 'aucun', 'absence de', "absence d'", 'non '];

function isNegatedWarning(sentenceNorm) {
  for (const kw of WARNING_KEYWORDS) {
    const idx = sentenceNorm.indexOf(kw);
    if (idx === -1) continue;
    const before = sentenceNorm.slice(Math.max(0, idx - 25), idx);
    if (NEGATIONS.some((n) => before.includes(n))) return true;
  }
  return false;
}

function findLevel(sentenceNorm) {
  if (URGENT_KEYWORDS.some((k) => sentenceNorm.includes(k))) return 'urgent';
  if (isNegatedWarning(sentenceNorm)) return 'info';
  if (WARNING_KEYWORDS.some((k) => sentenceNorm.includes(k))) return 'warn';
  if (NORMAL_KEYWORDS.some((k) => sentenceNorm.includes(k))) return 'info';
  return null;
}

const LEVEL_ICON = { urgent: '🚨', warn: '⚠️', info: '✅' };
const LEVEL_RANK = { urgent: 0, warn: 1, info: 2 };

// Génère un court résumé du rapport, en priorité depuis la conclusion,
// sinon depuis le texte extrait du PDF (paragraphe suivant « conclusion »,
// ou à défaut le début du texte).
function buildSummary(report) {
  const conclusion = (report.conclusion || '').trim();
  if (conclusion) {
    return conclusion.length > 320 ? `${conclusion.slice(0, 317).trim()}…` : conclusion;
  }

  const pdfText = (report.pdf_text || '').trim();
  if (!pdfText) return null;

  // Cherche un paragraphe introduit par « conclusion » / « impression » / « avis »
  const match = pdfText.match(/(conclusion|impression|avis)\s*[:\-]?\s*([\s\S]{20,320}?)(?:\n\s*\n|$)/i);
  const excerpt = (match ? match[2] : pdfText).replace(/\s+/g, ' ').trim();
  if (!excerpt) return null;
  return excerpt.length > 320 ? `${excerpt.slice(0, 317).trim()}…` : excerpt;
}

// Extrait les messages clés (phrases signalant une anomalie, une urgence ou
// un résultat rassurant) à partir de la conclusion + du texte PDF.
function buildKeyMessages(report) {
  const combined = `${report.conclusion || ''}\n${report.pdf_text || ''}`;
  const sentences = splitSentences(combined);

  const seen = new Set();
  const messages = [];
  for (const sentence of sentences) {
    const norm = normalize(sentence);
    const level = findLevel(norm);
    if (!level) continue;
    const key = norm.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    messages.push({ level, icon: LEVEL_ICON[level], text: sentence });
  }

  messages.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  return messages.slice(0, 6);
}

// Enrichit un rapport avec { summary, keyMessages } sans modifier les champs d'origine.
export function annotateReport(report) {
  return {
    ...report,
    summary: buildSummary(report),
    keyMessages: buildKeyMessages(report),
  };
}

export function annotateReports(reports) {
  return reports.map(annotateReport);
}
