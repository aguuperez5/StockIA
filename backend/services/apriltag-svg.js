import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tagDictionary = null;

function loadTagDictionary() {
  if (!tagDictionary) {
    const jsonPath = path.join(__dirname, 'tag36h11_data.json');
    tagDictionary = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
  return tagDictionary;
}

/**
 * Genera el SVG matemático real y exacto del AprilTag de la familia tag36h11.
 * Cuadrícula de 10x10 (borde blanco de 1 bit + borde negro de 1 bit + 6x6 datos).
 *
 * @param {number} tagId - ID entre 0 y 586
 * @param {number} [size=300] - Tamaño en píxeles
 * @param {boolean} [withQuietZone=true] - Si incluye zona silenciosa blanca alrededor
 * @returns {string} Código SVG
 */
export function generateAprilTagSvg(tagId, size = 300, withQuietZone = true) {
  const dict = loadTagDictionary();
  const rows = dict[tagId];
  if (!rows) {
    return null;
  }

  const offset = withQuietZone ? 1 : 0;
  const viewBoxDim = withQuietZone ? 10 : 8;

  let whiteRects = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (rows[r][c] === '1') {
        whiteRects += `<rect x="${c + offset}" y="${r + offset}" width="1" height="1" fill="#FFFFFF"/>`;
      }
    }
  }

  if (withQuietZone) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="10" height="10" fill="#FFFFFF"/>
  <rect x="1" y="1" width="8" height="8" fill="#000000"/>
  ${whiteRects}
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="8" height="8" fill="#000000"/>
  ${whiteRects}
</svg>`;
}
