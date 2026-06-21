// Moteur de synthèse santé.
//
// IMPORTANT : recommandations éducatives, fondées sur des repères de dépistage
// français généraux (HAS / dépistages organisés). Elles sont indicatives et ne
// remplacent pas l'avis d'un médecin, qui adapte selon les facteurs de risque.

export function ageFromBirth(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b)) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Statut d'un dépistage périodique selon la date du dernier examen
function periodicStatus(lastDate, intervalMonths) {
  if (!lastDate) {
    return { status: 'a_prevoir', nextDate: null, note: "Aucune date enregistrée — à programmer." };
  }
  const nextDate = addMonths(lastDate, intervalMonths);
  const overdue = new Date() > new Date(nextDate);
  return {
    status: overdue ? 'a_prevoir' : 'a_jour',
    nextDate,
    note: overdue ? "En retard — à reprogrammer." : `À jour. Prochain examen vers le ${frDate(nextDate)}.`,
  };
}

function frDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function bmiInfo(height_cm, weight_kg) {
  if (!height_cm || !weight_kg) return null;
  const h = height_cm / 100;
  const bmi = +(weight_kg / (h * h)).toFixed(1);
  let category, advice;
  if (bmi < 18.5) { category = 'Insuffisance pondérale'; advice = "Un avis médical/nutritionnel peut être utile."; }
  else if (bmi < 25) { category = 'Corpulence normale'; advice = "Poursuivez une bonne hygiène de vie."; }
  else if (bmi < 30) { category = 'Surpoids'; advice = "Activité physique régulière et alimentation équilibrée recommandées."; }
  else { category = 'Obésité'; advice = "Une prise en charge avec votre médecin est recommandée."; }
  return { bmi, category, advice };
}

// Construit les dépistages applicables selon âge / sexe / antécédents
function buildScreenings(profile, age) {
  const sex = profile.sex;
  const hasFamilyHistory = !!(profile.family_history && profile.family_history.trim());
  const out = [];

  // Cancer du sein — mammographie (femmes)
  if (sex === 'F') {
    if (age != null && age >= 50 && age <= 74) {
      const s = periodicStatus(profile.last_mammography, 24);
      out.push({ key: 'mammographie', title: 'Mammographie (dépistage du cancer du sein)', icon: '🎀',
        recommendation: 'Recommandée tous les 2 ans entre 50 et 74 ans (dépistage organisé).', ...s });
    } else if (age != null && age >= 40 && age < 50) {
      out.push({ key: 'mammographie', title: 'Mammographie (dépistage du cancer du sein)', icon: '🎀',
        status: 'a_discuter', nextDate: null,
        recommendation: 'Entre 40 et 49 ans, à discuter avec votre médecin selon vos facteurs de risque.',
        note: hasFamilyHistory ? "Antécédents familiaux notés : un suivi plus précoce est souvent proposé." : '' });
    } else if (age != null && age > 74) {
      out.push({ key: 'mammographie', title: 'Mammographie (dépistage du cancer du sein)', icon: '🎀',
        status: 'a_discuter', nextDate: null,
        recommendation: 'Après 74 ans, la poursuite du dépistage est à évaluer avec votre médecin.', note: '' });
    }
  }

  // Cancer du col de l'utérus — frottis / test HPV (femmes 25–65)
  if (sex === 'F' && age != null && age >= 25 && age <= 65) {
    const interval = age < 30 ? 36 : 60; // cytologie 3 ans (25-29) puis HPV 5 ans (30-65)
    const s = periodicStatus(profile.last_cervical, interval);
    out.push({ key: 'cervical', title: 'Dépistage du cancer du col de l’utérus', icon: '🧫',
      recommendation: age < 30
        ? 'Frottis (cytologie) tous les 3 ans entre 25 et 29 ans.'
        : 'Test HPV tous les 5 ans entre 30 et 65 ans.', ...s });
  }

  // Cancer colorectal — test immunologique (50–74, hommes et femmes)
  if (age != null && age >= 50 && age <= 74) {
    const s = periodicStatus(profile.last_colorectal, 24);
    out.push({ key: 'colorectal', title: 'Dépistage du cancer colorectal', icon: '🩹',
      recommendation: 'Test immunologique (à faire chez soi) tous les 2 ans entre 50 et 74 ans.', ...s });
  } else if (age != null && age >= 45 && age < 50 && hasFamilyHistory) {
    out.push({ key: 'colorectal', title: 'Dépistage du cancer colorectal', icon: '🩹',
      status: 'a_discuter', nextDate: null,
      recommendation: 'Antécédents familiaux : un dépistage plus précoce (coloscopie) est souvent proposé. À discuter.', note: '' });
  }

  // Anévrisme de l'aorte abdominale (hommes 65–75, fumeurs ou ex-fumeurs)
  if (sex === 'M' && age != null && age >= 65 && age <= 75 && profile.smoker) {
    out.push({ key: 'aaa', title: 'Échographie de l’aorte abdominale', icon: '🫀',
      status: 'a_discuter', nextDate: null,
      recommendation: 'Une échographie de dépistage (une fois) est conseillée chez l’homme fumeur/ex-fumeur de 65 à 75 ans.', note: '' });
  }

  return out;
}

// Conseils généraux selon profil + IMC + activité physique
function buildGeneralAdvice(profile, age, bmi) {
  const advice = [];
  if (profile.smoker) {
    advice.push({ level: 'warn', icon: '🚭', text: "Tabac : l'arrêt est le geste le plus bénéfique pour votre santé. Un accompagnement (tabac info service, médecin) augmente les chances de réussite." });
  }
  if (bmi && bmi.bmi >= 25) {
    advice.push({ level: 'info', icon: '⚖️', text: `IMC ${bmi.bmi} (${bmi.category}). ${bmi.advice}` });
  }
  // Conseil activité physique (personnalisé si renseigné)
  const acts = Array.isArray(profile.activities) ? profile.activities : [];
  if (acts.length > 0) {
    const summary = acts.map((a) => {
      const parts = [a.activity_type];
      if (a.frequency) parts.push(a.frequency);
      if (a.duration) parts.push(`${a.duration}/séance`);
      return parts.join(' · ');
    }).join(' ; ');
    advice.push({ level: 'info', icon: '🏃', text: `Activités déclarées : ${summary}. Continuez sur cette lancée — l'OMS recommande 150 min/semaine d'activité modérée.` });
  } else {
    advice.push({ level: 'info', icon: '🏃', text: "Visez au moins 150 min d'activité physique modérée par semaine (marche rapide, vélo, natation…). Renseignez vos activités dans le profil pour un suivi personnalisé." });
  }
  // Bilan lipidique selon âge/sexe
  if ((profile.sex === 'M' && age != null && age >= 40) || (profile.sex === 'F' && age != null && age >= 50)) {
    advice.push({ level: 'info', icon: '🫀', text: "Pensez à un bilan lipidique (cholestérol) régulier pour évaluer votre risque cardiovasculaire." });
  }
  // Dépistage du diabète
  if (age != null && age >= 45) {
    advice.push({ level: 'info', icon: '🩸', text: "Un dépistage du diabète (glycémie à jeun ou HbA1c) est conseillé après 45 ans, ou plus tôt en cas de surpoids/antécédents." });
  }
  return advice;
}

export function buildSynthesis(profile, bloodFindings) {
  const age = ageFromBirth(profile.birth_date);
  const bmi = bmiInfo(profile.height_cm, profile.weight_kg);
  const hasProfile = !!(profile.sex && profile.birth_date);

  return {
    hasProfile,
    profile: {
      sex: profile.sex || null,
      age,
      height_cm: profile.height_cm || null,
      weight_kg: profile.weight_kg || null,
      smoker: !!profile.smoker,
      bmi: bmi ? bmi.bmi : null,
      bmiCategory: bmi ? bmi.category : null,
    },
    screenings: hasProfile ? buildScreenings(profile, age) : [],
    generalAdvice: hasProfile ? buildGeneralAdvice(profile, age, bmi) : [],
    bloodFindings: bloodFindings || [],
  };
}
