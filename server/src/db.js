import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'bilanmedical.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schéma de la base de données
db.exec(`
  -- Suivi de santé : mesures (poids, tension, glycémie, etc.)
  CREATE TABLE IF NOT EXISTS measurements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,          -- poids, tension, frequence_cardiaque, glycemie, temperature, saturation, ...
    value       REAL NOT NULL,          -- valeur principale
    value2      REAL,                   -- valeur secondaire (ex : tension diastolique)
    unit        TEXT,                   -- kg, mmHg, bpm, mg/dL, °C, %
    measured_at TEXT NOT NULL,          -- ISO date/heure de la mesure
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bilans médicaux (analyses, imagerie, examens)
  CREATE TABLE IF NOT EXISTS bilans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    category    TEXT,                   -- analyse_sang, imagerie, cardiologie, ...
    date        TEXT NOT NULL,
    doctor      TEXT,
    results     TEXT,                   -- résultats / valeurs
    conclusion  TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Rendez-vous médicaux
  CREATE TABLE IF NOT EXISTS appointments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    doctor      TEXT,
    specialty   TEXT,
    location    TEXT,
    starts_at   TEXT NOT NULL,          -- ISO date/heure
    status      TEXT NOT NULL DEFAULT 'a_venir',  -- a_venir, termine, annule
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Résumés médicaux (synthèses, antécédents, traitements)
  CREATE TABLE IF NOT EXISTS summaries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    date        TEXT NOT NULL,
    content     TEXT,
    tags        TEXT,                   -- mots-clés séparés par des virgules
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Rapports de bilans sanguins (un rapport = une prise de sang à une date)
  CREATE TABLE IF NOT EXISTS blood_tests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    lab         TEXT,                   -- laboratoire
    doctor      TEXT,                   -- médecin prescripteur
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Résultats individuels d'un bilan sanguin (un marqueur = une ligne)
  CREATE TABLE IF NOT EXISTS blood_results (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    blood_test_id INTEGER NOT NULL REFERENCES blood_tests(id) ON DELETE CASCADE,
    theme         TEXT NOT NULL,        -- foie, cholesterol, thyroide, ...
    marker        TEXT NOT NULL,        -- ASAT, LDL, TSH, ...
    value         REAL NOT NULL,
    unit          TEXT,
    ref_min       REAL,                 -- borne basse de référence (optionnelle)
    ref_max       REAL                  -- borne haute de référence (optionnelle)
  );

  CREATE INDEX IF NOT EXISTS idx_blood_results_test ON blood_results(blood_test_id);

  -- Profil de l'utilisateur (une seule ligne, id = 1)
  CREATE TABLE IF NOT EXISTS profile (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    sex              TEXT,                 -- F | M
    birth_date       TEXT,                 -- AAAA-MM-JJ
    height_cm        REAL,
    weight_kg        REAL,
    smoker           INTEGER DEFAULT 0,    -- 0 | 1
    family_history   TEXT,                 -- antécédents familiaux (texte libre)
    notes            TEXT,
    last_mammography TEXT,                 -- date du dernier dépistage du sein
    last_cervical    TEXT,                 -- date du dernier frottis / test HPV
    last_colorectal  TEXT                  -- date du dernier dépistage colorectal
  );
  INSERT OR IGNORE INTO profile (id) VALUES (1);
`);

export default db;
