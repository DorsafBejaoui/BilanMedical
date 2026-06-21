// Base de connaissances : recommandations (insights) par marqueur, selon que la
// valeur soit « élevée » (eleve) ou « basse » (bas).
//
// IMPORTANT : ces messages sont éducatifs et ne constituent en aucun cas un
// diagnostic ni un avis médical. Ils invitent systématiquement à consulter un
// professionnel de santé. Contenu curé manuellement (pas de génération
// automatique) afin d'en garantir la fiabilité.
//
// level : 'info' | 'warn' | 'urgent' — pilote l'affichage (couleur / priorité).

const INSIGHTS = {
  // --- Foie ---------------------------------------------------------------
  'ASAT (TGO)': {
    eleve: { level: 'warn', message: "Transaminases élevées : possible souffrance du foie ou du muscle (effort intense, médicaments, alcool, foie gras). Évitez l'alcool et l'automédication, et recontrôlez à distance avec les ALAT et GGT." },
  },
  'ALAT (TGP)': {
    eleve: { level: 'warn', message: "ALAT élevées : marqueur assez spécifique d'une atteinte du foie (stéatose, hépatite virale ou médicamenteuse, alcool). Un bilan hépatique complet et un avis médical sont recommandés." },
  },
  'Gamma-GT (GGT)': {
    eleve: { level: 'warn', message: "GGT élevées : souvent liées à l'alcool, au foie gras ou à certains médicaments. Réduisez l'alcool et recontrôlez ; avis médical si l'élévation persiste." },
  },
  'Phosphatases alcalines': {
    eleve: { level: 'warn', message: "Élévation pouvant être d'origine hépatique (obstacle biliaire) ou osseuse. À corréler aux GGT ; avis médical." },
  },
  'Bilirubine totale': {
    eleve: { level: 'warn', message: "Bilirubine élevée : trouble hépatique ou biliaire, ou hémolyse ; parfois bénin (syndrome de Gilbert). Avis médical si d'autres anomalies sont associées." },
  },

  // --- Lipides ------------------------------------------------------------
  'Cholestérol total': {
    eleve: { level: 'warn', message: "Cholestérol total élevé : facteur de risque cardiovasculaire. Privilégiez une alimentation pauvre en graisses saturées et l'activité physique ; le LDL guide la décision avec votre médecin." },
  },
  'LDL': {
    eleve: { level: 'warn', message: "LDL (« mauvais cholestérol ») élevé : principal facteur de risque cardiovasculaire modifiable. Réduisez les graisses saturées, bougez, perdez du poids si besoin ; discutez d'un éventuel traitement selon votre risque global." },
  },
  'HDL': {
    bas: { level: 'info', message: "HDL (« bon cholestérol ») bas : associé à un risque cardiovasculaire accru. Activité physique régulière, arrêt du tabac et alimentation équilibrée l'améliorent." },
  },
  'Triglycérides': {
    eleve: { level: 'warn', message: "Triglycérides élevés : liés au sucre, à l'alcool et au surpoids. Limitez sucres rapides et alcool, perdez du poids et pratiquez une activité physique." },
  },

  // --- Thyroïde -----------------------------------------------------------
  'TSH': {
    eleve: { level: 'warn', message: "TSH élevée : évoque une hypothyroïdie (thyroïde peu active) — fatigue, frilosité, prise de poids. Faites doser la T4 libre et consultez pour décider d'un traitement." },
    bas: { level: 'warn', message: "TSH basse : évoque une hyperthyroïdie (thyroïde trop active) — palpitations, nervosité, amaigrissement. Faites doser T4/T3 libres et consultez." },
  },
  'T4 libre (FT4)': {
    eleve: { level: 'warn', message: "T4 libre élevée : compatible avec une hyperthyroïdie. Un avis endocrinologique est conseillé." },
    bas: { level: 'warn', message: "T4 libre basse : compatible avec une hypothyroïdie. Avis médical conseillé." },
  },

  // --- Diabète ------------------------------------------------------------
  'Glycémie à jeun': {
    eleve: { level: 'warn', message: "Glycémie à jeun élevée : prédiabète ou diabète possible. Confirmez par une HbA1c et une 2ᵉ glycémie, réduisez les sucres rapides et bougez. Consultez votre médecin." },
    bas: { level: 'urgent', message: "Hypoglycémie : peut provoquer malaises, sueurs, tremblements. Resucrez-vous en cas de symptômes et parlez-en à votre médecin, surtout si vous prenez un traitement antidiabétique." },
  },
  'HbA1c': {
    eleve: { level: 'warn', message: "HbA1c élevée : reflète une glycémie moyenne élevée sur ~3 mois (déséquilibre / diabète). Adaptation hygiéno-diététique et suivi médical recommandés." },
  },

  // --- NFS ----------------------------------------------------------------
  'Hémoglobine': {
    bas: { level: 'warn', message: "Hémoglobine basse (anémie) : fatigue, pâleur, essoufflement possibles. Il faut en rechercher la cause (carence en fer, B12/folates, saignement) ; avis médical." },
    eleve: { level: 'info', message: "Hémoglobine élevée : souvent déshydratation ou tabac, plus rarement une polyglobulie. Avis médical si elle persiste." },
  },
  'Globules blancs (GB)': {
    eleve: { level: 'info', message: "Leucocytes élevés : souvent une infection ou une inflammation, parfois le stress ou le tabac. Interprétation selon le contexte clinique." },
    bas: { level: 'warn', message: "Leucocytes bas : sensibilité accrue aux infections (causes virales, médicamenteuses…). Avis médical conseillé." },
  },
  'Plaquettes': {
    bas: { level: 'urgent', message: "Plaquettes basses : risque de saignement si le taux est très bas. Évitez aspirine et anti-inflammatoires (AINS) et demandez rapidement un avis médical." },
    eleve: { level: 'info', message: "Plaquettes élevées : inflammation, carence en fer ou cause hématologique. Avis médical si persistant." },
  },

  // --- Ionogramme ---------------------------------------------------------
  'Potassium': {
    eleve: { level: 'urgent', message: "Hyperkaliémie : peut perturber le rythme cardiaque. Vérifiez vos médicaments (IEC, diurétiques) et votre fonction rénale ; une valeur franchement élevée est une urgence médicale." },
    bas: { level: 'urgent', message: "Hypokaliémie : crampes, fatigue, troubles du rythme possibles. Avis médical pour en rechercher la cause (pertes digestives, diurétiques)." },
  },
  'Sodium': {
    eleve: { level: 'warn', message: "Hypernatrémie : souvent liée à une déshydratation. Réhydratez-vous et demandez un avis médical." },
    bas: { level: 'warn', message: "Hyponatrémie : maux de tête, voire confusion si marquée. Avis médical (évitez de boire en excès)." },
  },
  'Calcium': {
    eleve: { level: 'warn', message: "Hypercalcémie : excès de parathormone ou de vitamine D, entre autres. Avis médical pour en préciser la cause." },
    bas: { level: 'warn', message: "Hypocalcémie : fourmillements, crampes possibles. Avis médical conseillé." },
  },

  // --- Rein ---------------------------------------------------------------
  'Créatinine': {
    eleve: { level: 'warn', message: "Créatinine élevée : possible baisse de la fonction rénale (à interpréter via le DFG). Hydratez-vous bien, soyez prudent avec les AINS et consultez." },
  },
  'DFG (eGFR)': {
    bas: { level: 'warn', message: "DFG abaissé : fonction rénale diminuée. Évitez les médicaments néphrotoxiques (AINS) et demandez un avis médical pour bilan et suivi." },
  },
  'Urée': {
    eleve: { level: 'info', message: "Urée élevée : déshydratation, alimentation très riche en protéines ou atteinte rénale. À corréler à la créatinine." },
  },
  'Acide urique': {
    eleve: { level: 'warn', message: "Hyperuricémie : risque de crise de goutte et de calculs. Limitez alcool, sodas sucrés, abats et charcuterie, et hydratez-vous bien." },
  },

  // --- Fer ----------------------------------------------------------------
  'Ferritine': {
    bas: { level: 'warn', message: "Ferritine basse : carence en fer (réserves épuisées), cause fréquente de fatigue et d'anémie. Recherchez la cause des pertes ; alimentation riche en fer ± supplémentation sur avis médical." },
    eleve: { level: 'warn', message: "Ferritine élevée : inflammation, surcharge en fer, foie ou alcool. À interpréter avec la CRP et le coefficient de saturation ; avis médical." },
  },
  'Fer sérique': {
    bas: { level: 'info', message: "Fer sérique bas : compatible avec une carence martiale. À interpréter avec la ferritine, plus fiable." },
  },
  'Coefficient de saturation': {
    eleve: { level: 'warn', message: "Saturation de la transferrine élevée : évoquer une surcharge en fer (hémochromatose). Avis médical conseillé." },
  },

  // --- Vitamines ----------------------------------------------------------
  'Vitamine D (25-OH)': {
    bas: { level: 'info', message: "Carence en vitamine D : fréquente, surtout en hiver ; impacte l'os et la fatigue. Exposition solaire raisonnable, apports alimentaires ± supplémentation selon avis médical." },
  },
  'Vitamine B12': {
    bas: { level: 'warn', message: "Carence en B12 : fatigue, anémie et troubles neurologiques possibles. Recherchez la cause (alimentation, absorption) ; supplémentation sur avis médical." },
  },
  'Folates (B9)': {
    bas: { level: 'info', message: "Carence en folates : anémie possible ; apport important avant et pendant une grossesse. Alimentation (légumes verts) ± supplémentation sur avis médical." },
  },

  // --- Inflammation -------------------------------------------------------
  'CRP': {
    eleve: { level: 'warn', message: "CRP élevée : marqueur d'inflammation ou d'infection. À interpréter selon le contexte ; une CRP très élevée justifie un avis médical rapide." },
  },
  'Vitesse de sédimentation (VS)': {
    eleve: { level: 'info', message: "Vitesse de sédimentation élevée : signe d'inflammation, peu spécifique. Avis médical selon le contexte." },
  },
  'Fibrinogène': {
    eleve: { level: 'info', message: "Fibrinogène élevé : marqueur d'inflammation. À interpréter avec la CRP." },
  },

  // --- Protéines ----------------------------------------------------------
  'Albumine': {
    bas: { level: 'warn', message: "Albumine basse : dénutrition, inflammation ou pertes (rénales/digestives). Avis médical conseillé." },
  },

  // --- Pancréas -----------------------------------------------------------
  'Lipase': {
    eleve: { level: 'urgent', message: "Lipase élevée : si elle dépasse ~3× la normale avec des douleurs abdominales, une pancréatite doit être évoquée — avis médical urgent." },
  },
  'Amylase': {
    eleve: { level: 'warn', message: "Amylase élevée : atteinte pancréatique ou salivaire possible. Avis médical conseillé." },
  },

  // --- Coagulation --------------------------------------------------------
  'Taux de prothrombine (TP)': {
    bas: { level: 'warn', message: "Taux de prothrombine bas : trouble de la coagulation (foie, vitamine K, anticoagulants). Avis médical conseillé." },
  },
  'INR': {
    eleve: { level: 'urgent', message: "INR élevé : sang trop « fluide », risque de saignement (souvent sous AVK). Demandez rapidement un avis médical pour adapter le traitement." },
  },

  // --- Cœur / Muscle ------------------------------------------------------
  'CPK': {
    eleve: { level: 'warn', message: "CPK élevées : souffrance musculaire (effort intense, traumatisme, certains médicaments comme les statines). Évitez l'effort avant recontrôle et consultez." },
  },
  'Troponine': {
    eleve: { level: 'urgent', message: "Troponine élevée : marqueur de souffrance du muscle cardiaque. Une élévation aiguë avec douleur thoracique est une urgence — appelez les secours (15 / 112)." },
  },
  'NT-proBNP': {
    eleve: { level: 'warn', message: "NT-proBNP élevé : peut évoquer une insuffisance cardiaque. Avis médical conseillé." },
  },
};

const FALLBACK = {
  eleve: { level: 'info', message: "Valeur au-dessus de la normale. À interpréter dans son contexte avec votre médecin ; un simple recontrôle peut suffire." },
  bas: { level: 'info', message: "Valeur en dessous de la normale. À interpréter dans son contexte avec votre médecin ; un simple recontrôle peut suffire." },
};

// Renvoie la recommandation pour un marqueur et un statut ('eleve' | 'bas').
export function getInsight(marker, status) {
  if (status !== 'eleve' && status !== 'bas') return null;
  const entry = INSIGHTS[marker]?.[status];
  return entry || FALLBACK[status];
}
