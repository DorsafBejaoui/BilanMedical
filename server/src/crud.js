import { Router } from 'express';
import db from './db.js';

/**
 * Fabrique de routeur CRUD générique pour une table.
 * @param {string} table  - nom de la table
 * @param {string[]} fields - colonnes modifiables par l'utilisateur
 * @param {string} orderBy - clause ORDER BY (sans le mot-clé)
 */
export function crudRouter(table, fields, orderBy = 'id DESC') {
  const router = Router();

  const pick = (body) => {
    const data = {};
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f] === '' ? null : body[f];
    }
    return data;
  };

  // Liste
  router.get('/', (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
    res.json(rows);
  });

  // Détail
  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Introuvable' });
    res.json(row);
  });

  // Création
  router.post('/', (req, res) => {
    const data = pick(req.body);
    const cols = Object.keys(data);
    if (cols.length === 0) return res.status(400).json({ error: 'Aucune donnée fournie' });
    const placeholders = cols.map(() => '?').join(', ');
    const info = db
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
      .run(...cols.map((c) => data[c]));
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  // Mise à jour
  router.put('/:id', (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    const data = pick(req.body);
    const cols = Object.keys(data);
    if (cols.length === 0) return res.json(existing);
    const assignments = cols.map((c) => `${c} = ?`).join(', ');
    db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(
      ...cols.map((c) => data[c]),
      req.params.id
    );
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    res.json(row);
  });

  // Suppression
  router.delete('/:id', (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Introuvable' });
    res.status(204).end();
  });

  return router;
}
