// Minimal RFC 4180 CSV reader. Handles quoted fields, embedded commas,
// embedded newlines and doubled quotes. Returns an array of objects keyed
// by the header row. No dependencies.
import { readFileSync } from 'node:fs';

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQ = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map(r => Object.fromEntries(header.map((h, k) => [h, (r[k] ?? '').trim()])));
}

export function readCsv(path) {
  return parseCsv(readFileSync(path, 'utf8'));
}
