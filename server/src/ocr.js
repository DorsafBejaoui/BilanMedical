// Reconnaissance de caractères (OCR) pour les PDF scannés (photocopies/scans papier
// sans couche de texte numérique — pdf-parse ne peut alors rien en extraire).
//
// Principe : chaque page du PDF est d'abord rendue en image (via pdfjs-dist + un
// canvas natif, sans dépendance système type Cairo/Pango), puis Tesseract (français)
// lit le texte sur cette image.
//
// Les données de langue française sont fournies localement (package
// @tesseract.js-data/fra) : aucun accès réseau n'est nécessaire à l'exécution, ce
// qui est indispensable pour l'application packagée (usage hors-ligne).

import { createWorker } from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
import { createRequire } from 'module';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);

// Résout le dossier contenant fra.traineddata.gz quelle que soit la profondeur
// à laquelle npm a installé le paquet (racine du projet ou server/node_modules).
const FRA_LANG_PATH = join(dirname(require.resolve('@tesseract.js-data/fra/package.json')), '4.0.0');

// Sécurité : borne le nombre de pages OCRisées pour éviter un import trop long
// sur un très gros document scanné.
const MAX_OCR_PAGES = 15;

// Échelle de rendu des pages : un rendu plus grand améliore nettement la
// précision de l'OCR, au prix d'un traitement un peu plus long.
const RENDER_SCALE = 2.2;

async function renderPageToPng(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toBuffer('image/png');
}

// Lance l'OCR sur un buffer PDF et renvoie le texte reconnu (français).
// { text, pageCount, pagesProcessed, truncated }
export async function ocrPdf(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;

  const pageCount = doc.numPages;
  const pagesToRead = Math.min(pageCount, MAX_OCR_PAGES);

  const worker = await createWorker('fra', 1, { langPath: FRA_LANG_PATH, gzip: true });

  try {
    const texts = [];
    for (let i = 1; i <= pagesToRead; i++) {
      const png = await renderPageToPng(doc, i);
      const { data } = await worker.recognize(png);
      if (data.text?.trim()) texts.push(data.text.trim());
    }
    return {
      text: texts.join('\n\n').trim(),
      pageCount,
      pagesProcessed: pagesToRead,
      truncated: pagesToRead < pageCount,
    };
  } finally {
    await worker.terminate();
  }
}
