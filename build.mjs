// Baut die eigenständige Datei XML-Validator.html (alles inline, keine externen Ressourcen).
// Aufruf: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const r = (p) => readFileSync(new URL(p, import.meta.url));
const t = (p) => r(p).toString('utf8');
const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const parts = {
  XMLLINT: t('./vendor/xmllint-browser.mjs'),
  WASM: r('./vendor/xmllint.wasm').toString('base64'),
  SAXON: t('./vendor/SaxonJS2.js'),
  ENGINE: t('./src/engine.js'),
  APP: t('./src/app.js'),
  LICENSES: esc(
    '— SaxonJS 2.7 (Saxonica Ltd) —\n' + t('./vendor/LICENSE-SaxonJS.txt') +
    '\n\n— xmllint-wasm / libxml2 —\n' + t('./vendor/LICENSE-xmllint-wasm.txt')),
};

for (const [k, v] of Object.entries(parts)) {
  if (k !== 'LICENSES' && /<\/script/i.test(v)) throw new Error(`${k} enthält "</script" – Inline-Einbettung nicht möglich`);
}
if (!/wasmMemory,\s*\n/.test(parts.XMLLINT)) throw new Error('xmllint-Glue: Patch-Stelle "wasmMemory," nicht gefunden');

let html = t('./src/template.html');
for (const [k, v] of Object.entries(parts)) html = html.split(`%%${k}%%`).join(v);
writeFileSync(new URL('./XML-Validator.html', import.meta.url), html);
console.log(`XML-Validator.html: ${(html.length / 1048576).toFixed(2)} MB, sha256 ${createHash('sha256').update(html).digest('hex').slice(0, 16)}…`);
