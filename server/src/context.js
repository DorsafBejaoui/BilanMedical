// Détection du contexte personnel à partir des résumés médicaux (texte libre) :
// traitements en cours et examens mentionnés par la personne.
//
// IMPORTANT : détection par mots-clés curés manuellement (pas d'IA), afin de
// rester fiable et explicable. Sert à personnaliser les recommandations de la
// synthèse pour qu'elles tiennent compte de la situation réelle de la personne
// plutôt que de rester théoriques.

// Traitements fréquents → marqueurs biologiques qu'ils concernent.
const MEDICATIONS = [
  {
    label: 'traitement de la thyroïde (lévothyroxine)',
    keywords: ['levothyrox', 'lévothyrox', 'levothyroxine', 'lévothyroxine', 'l-thyroxine', 'euthyral', 'tcaps', 'thyrofix'],
    markers: ['TSH', 'T4 libre (FT4)'],
  },
  {
    label: 'statine (cholestérol)',
    keywords: ['statine', 'atorvastatine', 'tahor', 'rosuvastatine', 'crestor', 'simvastatine', 'pravastatine', 'elisor', 'vasten', 'fluvastatine'],
    markers: ['LDL', 'Cholestérol total', 'Triglycérides', 'CPK'],
  },
  {
    label: 'antidiabétique (metformine, insuline…)',
    keywords: ['metformine', 'metformin', 'glucophage', 'stagid', 'insuline', 'januvia', 'forxiga', 'jardiance', 'ozempic', 'diamicron', 'gliclazide'],
    markers: ['Glycémie à jeun', 'HbA1c'],
  },
  {
    label: 'anticoagulant AVK',
    keywords: ['previscan', 'préviscan', 'coumadine', 'sintrom', 'warfarine', 'fluindione', 'acénocoumarol', 'avk'],
    markers: ['INR', 'Taux de prothrombine (TP)'],
  },
  {
    label: 'anticoagulant oral direct',
    keywords: ['xarelto', 'rivaroxaban', 'eliquis', 'apixaban', 'pradaxa', 'dabigatran', 'lixiana', 'edoxaban'],
    markers: ['Plaquettes', 'Hémoglobine'],
  },
  {
    label: 'antiagrégant plaquettaire (aspirine, clopidogrel…)',
    keywords: ['kardegic', 'aspirine', 'aspégic', 'plavix', 'clopidogrel', 'efient', 'brilique'],
    markers: ['Plaquettes', 'Hémoglobine'],
  },
  {
    label: 'traitement de la tension (IEC / sartan)',
    keywords: ['ramipril', 'triatec', 'enalapril', 'lisinopril', 'périndopril', 'perindopril', 'coversyl', 'losartan', 'cozaar', 'valsartan', 'candesartan', 'irbesartan', 'sartan'],
    markers: ['Potassium', 'Créatinine', 'DFG (eGFR)'],
  },
  {
    label: 'diurétique',
    keywords: ['furosemide', 'furosémide', 'lasilix', 'hydrochlorothiazide', 'indapamide', 'fludex', 'spironolactone', 'aldactone', 'diurétique', 'diuretique'],
    markers: ['Potassium', 'Sodium', 'Créatinine'],
  },
  {
    label: 'supplémentation en fer',
    keywords: ['tardyferon', 'ferrograd', 'fumafer', 'timoferol', 'ferrostrane'],
    markers: ['Ferritine', 'Fer sérique', 'Hémoglobine'],
  },
  {
    label: 'supplémentation en vitamine D',
    keywords: ['uvedose', 'zymad', 'zymaduo', 'dedrogyl', 'cholécalciférol', 'cholecalciferol', 'vitamine d'],
    markers: ['Vitamine D (25-OH)'],
  },
  {
    label: 'supplémentation en vitamine B12',
    keywords: ['cyanocobalamine', 'vitamine b12'],
    markers: ['Vitamine B12'],
  },
  {
    label: 'traitement de la goutte',
    keywords: ['allopurinol', 'zyloric', 'fébuxostat', 'febuxostat', 'adenuric', 'colchicine'],
    markers: ['Acide urique'],
  },
  {
    label: 'analyse de composition corporelle (InBody, Tanita…)',
    keywords: ['inbody', 'tanita', 'composition corporelle', 'masse grasse', 'masse musculaire', 'graisse viscerale', 'impedancemetrie', 'impedancemétrie', 'bioimpedance'],
    markers: ['Masse grasse (%)', 'Masse musculaire (kg)', 'Graisse viscérale (niveau)', 'Eau corporelle (%)'],
  },
];

// Examens / dépistages reconnus dans le texte, rattachés aux clés de dépistage.
const EXAMS = [
  { key: 'mammographie', label: 'mammographie', keywords: ['mammographie', 'mammo'] },
  { key: 'cervical', label: 'frottis / test HPV', keywords: ['frottis', 'test hpv', 'hpv', 'col de l’utérus', "col de l'utérus"] },
  { key: 'colorectal', label: 'dépistage colorectal', keywords: ['coloscopie', 'colorectal', 'hémoccult', 'hemoccult', 'test immunologique'] },
  { key: 'aaa', label: "échographie de l'aorte", keywords: ['aorte', 'anévrisme', 'anevrisme'] },
];

function normalize(s) {
  return (s || '').toLowerCase();
}

// Analyse les résumés et renvoie traitements + examens détectés.
export function buildContext(summaries = []) {
  const blob = summaries
    .map((s) => `${s.title || ''}\n${s.content || ''}\n${s.tags || ''}`)
    .join('\n');
  const text = normalize(blob);

  const medications = [];
  for (const med of MEDICATIONS) {
    const hit = med.keywords.find((k) => text.includes(normalize(k)));
    if (hit) medications.push({ label: med.label, mention: hit, markers: med.markers });
  }

  // Examens mentionnés : on rattache le résumé le plus récent qui en parle.
  const examMentions = {};
  for (const exam of EXAMS) {
    let best = null;
    for (const s of summaries) {
      const hay = normalize(`${s.title || ''} ${s.content || ''} ${s.tags || ''}`);
      if (exam.keywords.some((k) => hay.includes(normalize(k)))) {
        if (!best || (s.date && best.date && s.date > best.date) || !best.date) best = s;
      }
    }
    if (best) examMentions[exam.key] = { label: exam.label, date: best.date, title: best.title };
  }

  return { medications, examMentions, hasSummaries: summaries.length > 0 };
}

// Note contextuelle pour un marqueur biologique donné, selon les traitements détectés.
export function medContextForMarker(context, marker) {
  if (!context || !context.medications) return null;
  const meds = context.medications.filter((m) => m.markers.includes(marker));
  if (!meds.length) return null;
  const labels = [...new Set(meds.map((m) => m.label))].join(', ');
  return `Vos résumés médicaux mentionnent un ${labels}. Cette valeur reflète peut-être le suivi de ce traitement : interprétez-la avec votre médecin (efficacité, dosage), plutôt que comme une anomalie isolée.`;
}
