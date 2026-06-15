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
`);

export default db;
