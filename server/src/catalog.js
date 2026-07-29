// Catalogue de marqueurs biologiques, regroupés par thème.
// - unit / min / max : unité et valeurs de référence indicatives (adulte),
//   ajustables par l'utilisateur lors de la saisie selon le laboratoire.
// - aliases : variantes de nom / abréviations / synonymes utilisés pour
//   reconnaître automatiquement le marqueur lors de l'import d'un PDF.
//   (la casse et les accents sont ignorés ; inutile de répéter le nom principal,
//    ni le contenu entre parenthèses, déjà gérés automatiquement)
export const CATALOG = [
  {
    theme: 'Foie (hépatique)',
    markers: [
      { name: 'ASAT (TGO)', unit: 'UI/L', min: 10, max: 40, aliases: ['AST', 'SGOT', 'aspartate aminotransferase'] },
      { name: 'ALAT (TGP)', unit: 'UI/L', min: 7, max: 56, aliases: ['ALT', 'SGPT', 'alanine aminotransferase'] },
      { name: 'Gamma-GT (GGT)', unit: 'UI/L', min: 8, max: 61, aliases: ['gamma gt', 'gamma-glutamyl transferase', 'g-gt'] },
      { name: 'Phosphatases alcalines', unit: 'UI/L', min: 44, max: 147, aliases: ['PAL', 'phosphatase alcaline', 'ALP'] },
      { name: 'Bilirubine totale', unit: 'mg/L', min: 3, max: 12, aliases: ['bilirubine'] },
      { name: 'Bilirubine conjuguée', unit: 'mg/L', min: null, max: 3, aliases: ['bilirubine directe'] },
    ],
  },
  {
    theme: 'Cholestérol / Lipides',
    markers: [
      { name: 'Cholestérol total', unit: 'g/L', min: null, max: 2.0, aliases: ['cholesterol total'] },
      { name: 'LDL', unit: 'g/L', min: null, max: 1.6, aliases: ['ldl cholesterol', 'cholesterol ldl', 'ldl-c'] },
      { name: 'HDL', unit: 'g/L', min: 0.4, max: null, aliases: ['hdl cholesterol', 'cholesterol hdl', 'hdl-c'] },
      { name: 'Triglycérides', unit: 'g/L', min: null, max: 1.5, aliases: ['triglyceride', 'TG'] },
      { name: 'Cholestérol non-HDL', unit: 'g/L', min: null, max: 1.3, aliases: ['non hdl', 'cholesterol non hdl'] },
    ],
  },
  {
    theme: 'Thyroïde',
    markers: [
      { name: 'TSH', unit: 'mUI/L', min: 0.4, max: 4.0, aliases: ['tsh us', 'thyreostimuline', 'tsh ultrasensible'] },
      { name: 'T4 libre (FT4)', unit: 'pmol/L', min: 9, max: 19, aliases: ['T4L', 'thyroxine libre', 't4 libre'] },
      { name: 'T3 libre (FT3)', unit: 'pmol/L', min: 3.1, max: 6.8, aliases: ['T3L', 't3 libre'] },
      { name: 'Anticorps anti-TPO', unit: 'UI/mL', min: null, max: 34, aliases: ['anti tpo', 'anti-tpo', 'anticorps anti thyroperoxydase', 'ATPO'] },
    ],
  },
  {
    theme: 'Glycémie / Diabète',
    markers: [
      { name: 'Glycémie à jeun', unit: 'g/L', min: 0.7, max: 1.1, aliases: ['glycemie', 'glucose', 'glucose a jeun'] },
      { name: 'HbA1c', unit: '%', min: 4, max: 6, aliases: ['hemoglobine glyquee', 'hb glyquee', 'hemoglobine a1c'] },
      { name: 'Insuline', unit: 'mUI/L', min: 2.6, max: 24.9, aliases: ['insulinemie'] },
    ],
  },
  {
    theme: 'Hématologie (NFS)',
    markers: [
      { name: 'Hémoglobine', unit: 'g/dL', min: 12, max: 16, aliases: ['HGB', 'hb'] },
      { name: 'Hématocrite', unit: '%', min: 37, max: 47, aliases: ['HCT'] },
      { name: 'Hématies (GR)', unit: '10¹²/L', min: 4.2, max: 5.7, aliases: ['globules rouges', 'erythrocytes', 'RBC', 'hematies'] },
      { name: 'VGM', unit: 'fL', min: 80, max: 100, aliases: ['volume globulaire moyen', 'MCV'] },
      { name: 'TCMH', unit: 'pg', min: 27, max: 32, aliases: ['MCH', 'teneur corpusculaire moyenne'] },
      { name: 'CCMH', unit: 'g/dL', min: 32, max: 36, aliases: ['MCHC', 'concentration corpusculaire moyenne'] },
      { name: 'Globules blancs (GB)', unit: '10⁹/L', min: 4, max: 10, aliases: ['leucocytes', 'WBC'] },
      { name: 'Plaquettes', unit: '10⁹/L', min: 150, max: 400, aliases: ['thrombocytes', 'PLT'] },
      { name: 'Neutrophiles', unit: '10⁹/L', min: 1.5, max: 7, aliases: ['polynucleaires neutrophiles', 'PNN'] },
      { name: 'Lymphocytes', unit: '10⁹/L', min: 1, max: 4, aliases: [] },
      { name: 'Monocytes', unit: '10⁹/L', min: 0.2, max: 1, aliases: [] },
      { name: 'Éosinophiles', unit: '10⁹/L', min: 0.02, max: 0.5, aliases: ['polynucleaires eosinophiles', 'PNE', 'eosinophiles'] },
      { name: 'Basophiles', unit: '10⁹/L', min: 0, max: 0.1, aliases: ['polynucleaires basophiles'] },
    ],
  },
  {
    theme: 'Ionogramme / Électrolytes',
    markers: [
      { name: 'Sodium', unit: 'mmol/L', min: 136, max: 145, aliases: ['natremie'] },
      { name: 'Potassium', unit: 'mmol/L', min: 3.5, max: 5.1, aliases: ['kaliemie'] },
      { name: 'Chlore', unit: 'mmol/L', min: 98, max: 107, aliases: ['chloremie', 'chlorures'] },
      { name: 'Bicarbonates', unit: 'mmol/L', min: 22, max: 29, aliases: ['co2 total', 'reserve alcaline', 'HCO3'] },
      { name: 'Calcium', unit: 'mmol/L', min: 2.2, max: 2.6, aliases: ['calcemie'] },
      { name: 'Phosphore', unit: 'mmol/L', min: 0.8, max: 1.5, aliases: ['phosphoremie', 'phosphate'] },
      { name: 'Magnésium', unit: 'mmol/L', min: 0.7, max: 1.0, aliases: ['magnesemie'] },
    ],
  },
  {
    theme: 'Rein',
    markers: [
      { name: 'Créatinine', unit: 'mg/L', min: 6, max: 12, aliases: ['creatininemie'] },
      { name: 'Urée', unit: 'g/L', min: 0.15, max: 0.45, aliases: ['uree sanguine'] },
      { name: 'DFG (eGFR)', unit: 'mL/min', min: 90, max: null, aliases: ['debit de filtration glomerulaire', 'clairance', 'MDRD', 'CKD-EPI'] },
      { name: 'Acide urique', unit: 'mg/L', min: 25, max: 70, aliases: ['uricemie', 'urate'] },
    ],
  },
  {
    theme: 'Fer',
    markers: [
      { name: 'Ferritine', unit: 'µg/L', min: 30, max: 300, aliases: [] },
      { name: 'Fer sérique', unit: 'µmol/L', min: 11, max: 30, aliases: ['sideremie'] },
      { name: 'Transferrine', unit: 'g/L', min: 2.0, max: 4.0, aliases: [] },
      { name: 'Coefficient de saturation', unit: '%', min: 20, max: 40, aliases: ['saturation de la transferrine', 'CST', 'saturation transferrine'] },
      { name: 'Capacité totale de fixation', unit: 'µmol/L', min: 45, max: 80, aliases: ['CTF', 'TIBC'] },
    ],
  },
  {
    theme: 'Vitamines',
    markers: [
      { name: 'Vitamine D (25-OH)', unit: 'ng/mL', min: 30, max: 100, aliases: ['25 oh vitamine d', '25-hydroxyvitamine d', 'vit d', 'vitamine d3'] },
      { name: 'Vitamine B12', unit: 'pg/mL', min: 200, max: 900, aliases: ['b12', 'cobalamine', 'vit b12'] },
      { name: 'Folates (B9)', unit: 'ng/mL', min: 3, max: 17, aliases: ['vitamine b9', 'acide folique', 'folate'] },
    ],
  },
  {
    theme: 'Inflammation',
    markers: [
      { name: 'CRP', unit: 'mg/L', min: null, max: 5, aliases: ['proteine c reactive', 'c-reactive protein', 'crp ultrasensible'] },
      { name: 'Vitesse de sédimentation (VS)', unit: 'mm/h', min: null, max: 20, aliases: ['vitesse de sedimentation', 'VS'] },
      { name: 'Fibrinogène', unit: 'g/L', min: 2, max: 4, aliases: ['fibrinogene'] },
    ],
  },
  {
    theme: 'Protéines',
    markers: [
      { name: 'Protéines totales', unit: 'g/L', min: 64, max: 83, aliases: ['protidemie', 'proteines totales'] },
      { name: 'Albumine', unit: 'g/L', min: 35, max: 52, aliases: ['albuminemie'] },
    ],
  },
  {
    theme: 'Pancréas',
    markers: [
      { name: 'Lipase', unit: 'UI/L', min: 13, max: 60, aliases: ['lipasemie'] },
      { name: 'Amylase', unit: 'UI/L', min: 28, max: 100, aliases: ['amylasemie'] },
    ],
  },
  {
    theme: 'Coagulation',
    markers: [
      { name: 'Taux de prothrombine (TP)', unit: '%', min: 70, max: 100, aliases: ['taux de prothrombine', 'prothrombine'] },
      { name: 'INR', unit: '', min: 0.8, max: 1.2, aliases: ['international normalized ratio'] },
      { name: 'TCA', unit: '', min: 0.8, max: 1.2, aliases: ['temps de cephaline activee', 'APTT'] },
    ],
  },
  {
    theme: 'Cœur / Muscle',
    markers: [
      { name: 'CPK', unit: 'UI/L', min: 30, max: 200, aliases: ['creatine kinase', 'CK', 'cpk total'] },
      { name: 'Troponine', unit: 'ng/L', min: null, max: 14, aliases: ['troponine t', 'troponine i', 'troponine hs'] },
      { name: 'NT-proBNP', unit: 'pg/mL', min: null, max: 125, aliases: ['nt probnp', 'pro bnp', 'bnp'] },
    ],
  },
  {
    theme: 'Composition corporelle',
    markers: [
      { name: 'Masse grasse (%)', unit: '%', min: null, max: null, aliases: ['taux de graisse', 'masse grasse pct', '% masse grasse', 'fat mass', 'body fat'] },
      { name: 'Masse grasse (kg)', unit: 'kg', min: null, max: null, aliases: ['graisse corporelle kg', 'fat mass kg'] },
      { name: 'Masse musculaire (kg)', unit: 'kg', min: null, max: null, aliases: ['masse maigre', 'muscle mass', 'lean mass', 'masse musculaire squelettique'] },
      { name: 'Masse osseuse (kg)', unit: 'kg', min: null, max: null, aliases: ['masse osseuse', 'bone mass', 'bone mineral content'] },
      { name: 'Eau corporelle (%)', unit: '%', min: 45, max: 65, aliases: ['eau totale', 'taux eau', 'total body water', 'hydratation'] },
      { name: 'Graisse viscérale (niveau)', unit: '', min: null, max: 12, aliases: ['graisse viscerale', 'visceral fat', 'indice graisse viscerale', 'niveau graisse viscerale'] },
      { name: 'Âge métabolique', unit: 'ans', min: null, max: null, aliases: ['age metabolique', 'metabolic age'] },
      { name: 'Masse corporelle maigre (kg)', unit: 'kg', min: null, max: null, aliases: ['poids maigre', 'free fat mass', 'ffm'] },
    ],
  },
];
