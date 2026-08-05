# Créer l'installeur Windows – Suivi Ma Santé V1

## Prérequis

- **Node.js 18+** (20 ou 22 recommandé)
- **npm 9+**
- **Windows** (ou cross-compilation depuis macOS/Linux, moins recommandé pour un .exe)

---

## Étapes

### 1. Installer toutes les dépendances

```bash
# Depuis la racine du projet
npm run install:all
```

> Cette commande installe les dépendances de la racine (Electron, express, better-sqlite3…)
> **et** celles du client React.  
> Elle déclenche aussi `electron-builder install-app-deps` qui recompile
> `better-sqlite3` pour la version Node embarquée dans Electron.

### 2. Construire l'installeur Windows

```bash
npm run electron:build
```

Ce script :
1. Compile le frontend React → `client/dist/`
2. Lance **electron-builder** qui assemble `dist-electron/Suivi Ma Sante Setup x.x.x.exe`

### 3. Distribuer

Copiez le fichier `dist-electron/Suivi Ma Sante Setup 1.0.0.exe` sur le PC cible et lancez-le.

---

## Ce que fait l'installeur

- Installe l'application dans `%LOCALAPPDATA%\Programs\Suivi Ma Santé` (sans droits admin)
- Crée un raccourci sur le bureau et dans le menu Démarrer
- La **base de données** est stockée dans `%APPDATA%\Suivi Ma Santé\bilanmedical.db`
  → elle **survit aux mises à jour** de l'application
- Chaque PC a sa propre base de données vide au premier lancement

---

## Architecture technique

```
Electron main (electron/main.cjs)
  │
  ├─ Définit DB_PATH → %APPDATA%\Suivi Ma Santé\bilanmedical.db
  ├─ Démarre le serveur Express (server/src/index.js) via import() dynamique
  ├─ Attend que /api/health réponde
  └─ Ouvre une BrowserWindow → http://localhost:3001

Serveur Express (server/src/)
  ├─ Sert l'API sur /api/...
  └─ En production, sert client/dist/ comme fichiers statiques
     (React Router côté client gère les routes)
```

---

## Icône personnalisée (optionnel)

Placez un fichier `electron/icon.ico` (256×256 px minimum) et décommentez
la ligne `# icon: electron/icon.ico` dans `electron-builder.yml`.

---

## Mode développement (inchangé)

```bash
npm run dev          # Lance serveur API (port 3001) + client Vite (port 5173)
```
