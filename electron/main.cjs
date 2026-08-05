'use strict';

/**
 * Point d'entrée Electron — démarre le serveur Express intégré, puis ouvre la fenêtre.
 *
 * Architecture :
 *   • Le serveur Express (server/src/index.js) est importé dynamiquement (ESM).
 *   • La base de données SQLite est stockée dans le dossier userData de l'OS
 *     (ex. %APPDATA%\Suivi Ma Santé sur Windows), ce qui la préserve entre les mises à jour.
 *   • En mode packagé, le client React (client/dist) est servi directement par Express.
 */

const { app, BrowserWindow, dialog } = require('electron');
const path  = require('path');
const { pathToFileURL } = require('url');
const http  = require('http');

const API_PORT = 3001;
let mainWindow = null;

// ---------------------------------------------------------------------------
// Démarrage du serveur Express (import ESM depuis un contexte CJS)
// ---------------------------------------------------------------------------
async function startServer() {
  // userData = dossier persistant propre à l'utilisateur (AppData/Roaming, ~/.config, ~/Library…)
  process.env.DB_PATH  = path.join(app.getPath('userData'), 'bilanmedical.db');
  process.env.NODE_ENV = 'production';
  process.env.PORT     = String(API_PORT);

  // Le chemin vers index.js est identique en dev et dans l'asar packagé
  // (__dirname == .../electron/ → ../server/src/index.js)
  const serverEntry = path.join(__dirname, '..', 'server', 'src', 'index.js');
  await import(pathToFileURL(serverEntry).href);
}

// ---------------------------------------------------------------------------
// Attente que le serveur réponde sur /api/health (max 20 s)
// ---------------------------------------------------------------------------
function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://localhost:${API_PORT}/api/health`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('Le serveur interne n\'a pas démarré à temps.'));
        } else {
          setTimeout(attempt, 300);
        }
      });
      req.setTimeout(800, () => req.destroy());
    }
    attempt();
  });
}

// ---------------------------------------------------------------------------
// Création de la fenêtre principale
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1300,
    height:   820,
    minWidth: 920,
    minHeight: 620,
    title: 'Suivi Ma Santé',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${API_PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------------------------------------------------------------------------
// Cycle de vie Electron
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    await startServer();
    await waitForServer();
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Erreur de démarrage',
      `L'application n'a pas pu démarrer.\n\n${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
