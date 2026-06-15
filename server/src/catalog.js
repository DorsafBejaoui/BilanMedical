// Catalogue de marqueurs biologiques courants, regroupés par thème.
// Les valeurs de référence sont indicatives (adulte) et peuvent être ajustées
// par l'utilisateur lors de la saisie selon le laboratoire.
export const CATALOG = [
  {
    theme: 'Foie (hépatique)',
    markers: [
      { name: 'ASAT (TGO)', unit: 'UI/L', min: 10, max: 40 },
      { name: 'ALAT (TGP)', unit: 'UI/L', min: 7, max: 56 },
      { name: 'Gamma-GT (GGT)', unit: 'UI/L', min: 8, max: 61 },
      { name: 'Phosphatases alcalines', unit: 'UI/L', min: 44, max: 147 },
      { name: 'Bilirubine totale', unit: 'mg/L', min: 3, max: 12 },
    ],
  },
  {
    theme: 'Cholestérol / Lipides',
    markers: [
      { name: 'Cholestérol total', unit: 'g/L', min: null, max: 2.0 },
      { name: 'LDL', unit: 'g/L', min: null, max: 1.6 },
      { name: 'HDL', unit: 'g/L', min: 0.4, max: null },
      { name: 'Triglycérides', unit: 'g/L', min: null, max: 1.5 },
    ],
  },
  {
    theme: 'Thyroïde',
    markers: [
      { name: 'TSH', unit: 'mUI/L', min: 0.4, max: 4.0 },
      { name: 'T4 libre (FT4)', unit: 'pmol/L', min: 9, max: 19 },
      { name: 'T3 libre (FT3)', unit: 'pmol/L', min: 3.1, max: 6.8 },
    ],
  },
  {
    theme: 'Glycémie / Diabète',
    markers: [
      { name: 'Glycémie à jeun', unit: 'g/L', min: 0.7, max: 1.1 },
      { name: 'HbA1c', unit: '%', min: 4, max: 6 },
    ],
  },
  {
    theme: 'Hématologie (NFS)',
    markers: [
      { name: 'Hémoglobine', unit: 'g/dL', min: 12, max: 16 },
      { name: 'Globules blancs', unit: '10⁹/L', min: 4, max: 10 },
      { name: 'Plaquettes', unit: '10⁹/L', min: 150, max: 400 },
      { name: 'Hématocrite', unit: '%', min: 37, max: 47 },
    ],
  },
  {
    theme: 'Rein',
    markers: [
      { name: 'Créatinine', unit: 'mg/L', min: 6, max: 12 },
      { name: 'Urée', unit: 'g/L', min: 0.15, max: 0.45 },
      { name: 'DFG (eGFR)', unit: 'mL/min', min: 90, max: null },
    ],
  },
  {
    theme: 'Fer',
    markers: [
      { name: 'Ferritine', unit: 'µg/L', min: 30, max: 300 },
      { name: 'Fer sérique', unit: 'µmol/L', min: 11, max: 30 },
    ],
  },
  {
    theme: 'Vitamines',
    markers: [
      { name: 'Vitamine D (25-OH)', unit: 'ng/mL', min: 30, max: 100 },
      { name: 'Vitamine B12', unit: 'pg/mL', min: 200, max: 900 },
      { name: 'Folates (B9)', unit: 'ng/mL', min: 3, max: 17 },
    ],
  },
];
