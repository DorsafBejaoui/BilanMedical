# 🩺 BilanMedical

Application web de **suivi de santé personnel** : suivez vos constantes, conservez
vos bilans médicaux, gérez vos rendez-vous et regroupez vos résumés médicaux —
le tout dans une interface simple et stockée localement.

> Application mono-utilisateur : aucune authentification, vos données restent sur votre machine.

## ✨ Fonctionnalités

- **📈 Suivi de santé** — enregistrement des constantes (poids, tension, glycémie,
  fréquence cardiaque, température, saturation…) avec graphique d'évolution.
- **📊 Bilans sanguins** — saisie de rapports de prises de sang à différentes dates, marqueur par
  marqueur (catalogue prédéfini par thème qui pré-remplit unité et valeurs de référence), avec
  **résumé par thème** (14 thèmes : foie, lipides, thyroïde, diabète, NFS, ionogramme, rein, fer,
  vitamines, inflammation, protéines, pancréas, coagulation, cœur/muscle — 60+ marqueurs) : dernière
  valeur, statut normal/bas/élevé et évolution dans le temps. Comprend :
  - **Import PDF** de comptes-rendus de laboratoire avec extraction automatique des valeurs **et des
    intervalles de référence imprimés sur le bilan** (formats `0,40 - 4,00`, `< 5`, `> 0,4`, `30 à 300`…) ;
    le catalogue ne sert que de repli quand le PDF n'indique pas de référence. Valeurs à valider avant enregistrement.
  - **Filtres** du résumé par thème et par marqueur, et **export PDF** du résumé (impression navigateur).
  - **Graphique** d'évolution avec **zone de référence ombrée** (points hors plage en rouge).
  - Mise en avant des **marqueurs hors plage** sur le tableau de bord.
- **🧪 Bilans & examens** — analyses, imagerie et examens en texte libre avec résultats et conclusions.
- **📅 Rendez-vous** — consultations à venir / passées, avec statut et filtres.
- **📋 Résumés médicaux** — synthèses, antécédents et traitements, avec mots-clés et recherche.
- **🏠 Tableau de bord** — vue d'ensemble : compteurs, prochain rendez-vous, dernier bilan, mesures récentes.

## 🏗️ Architecture

```
BilanMedical/
├── server/          API REST Node.js + Express + SQLite (better-sqlite3)
│   └── src/
│       ├── index.js   points d'entrée et routes
│       ├── db.js      connexion + schéma de la base
│       └── crud.js    fabrique de routes CRUD générique
├── client/          Frontend React (Vite) + React Router
│   └── src/
│       ├── pages/     Tableau de bord, Suivi, Bilans, Rendez-vous, Résumés
│       └── components/ Modale, graphique SVG
└── scripts/dev.js   lance l'API et le frontend ensemble
```

La base SQLite est créée automatiquement dans `data/bilanmedical.db` au premier lancement.

## 🚀 Démarrage

Prérequis : **Node.js ≥ 18**.

```bash
# 1. Installer les dépendances (serveur + client)
npm run install:all

# 2. Lancer l'application (API + frontend)
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3001

Le frontend redirige automatiquement les appels `/api` vers le serveur.

### Lancer séparément

```bash
npm run server   # API seule (port 3001)
npm run client   # Frontend seul (port 5173)
```

## 🔌 API REST

Chaque ressource expose un CRUD standard :

| Méthode | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/{resource}` | Liste |
| `GET` | `/api/{resource}/:id` | Détail |
| `POST` | `/api/{resource}` | Création |
| `PUT` | `/api/{resource}/:id` | Mise à jour |
| `DELETE` | `/api/{resource}/:id` | Suppression |

Ressources : `measurements`, `bilans`, `appointments`, `summaries`.

Routes supplémentaires :

- `GET /api/stats` — données du tableau de bord
- `GET /api/measurements/series/:type` — série temporelle d'un type de mesure (graphique)

Bilans sanguins (`/api/blood`) :

| Méthode | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/blood/catalog` | Catalogue des marqueurs par thème (unités + références) |
| `GET` | `/api/blood/tests` | Liste des rapports avec leurs résultats |
| `POST` | `/api/blood/tests` | Crée un rapport et ses résultats |
| `PUT` | `/api/blood/tests/:id` | Met à jour un rapport (remplace les résultats) |
| `DELETE` | `/api/blood/tests/:id` | Supprime un rapport |
| `GET` | `/api/blood/summary` | Résumé par thème : évolution, dernière valeur, statut |
| `POST` | `/api/blood/import` | Import d'un PDF de labo (multipart `file`) → brouillon détecté |

## 🛠️ Stack technique

- **Backend** : Node.js, Express, better-sqlite3
- **Frontend** : React 18, React Router, Vite (CSS sans dépendance UI externe)
