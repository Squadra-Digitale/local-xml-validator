/* =====================================================================
 * XML-Validator – Prüf-Engine
 * - Wohlgeformtheit + XSD: libxml2 (xmllint, WebAssembly, im Worker)
 * - Schematron (.sch, ISO): eigene Engine, XPath 3.1 via SaxonJS
 * - Schematron als XSLT 1.0 (.xsl/.xslt): nativer XSLTProcessor
 * Alles läuft lokal im Browser; Netzwerkzugriffe sind per CSP gesperrt.
 * ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
 * Übersetzung: deutscher Text ist der Schlüssel, {0},{1} … sind Platzhalter.
 * Fehlt ein Eintrag, bleibt der deutsche Text stehen.
 * ------------------------------------------------------------------- */
const I18N = { lang: 'de', en: {
  // Engine
  'Das XSD konnte nicht kompiliert werden (siehe Meldungen zum Schema). Prüfen Sie, ob alle eingebundenen Dateien (include/import) im Profil enthalten sind.': 'The XSD could not be compiled (see schema messages). Check that all included/imported files are part of the profile.',
  'Element {0}': 'Element {0}',
  'XML nicht wohlgeformt': 'XML not well-formed',
  'Zu tief verschachtelte sch:include': 'sch:include nested too deeply',
  '{0}: kein ISO-Schematron (Wurzel muss sch:schema im Namensraum {1} sein)': '{0}: not ISO Schematron (root must be sch:schema in namespace {1})',
  'sch:include "{0}" (aus {1}) nicht im Profil gefunden – Regeln daraus fehlen.': 'sch:include "{0}" (from {1}) not found in profile – its rules are missing.',
  'sch:include "{0}": id nicht gefunden.': 'sch:include "{0}": id not found.',
  'Das Schematron enthält {0} xsl:function-Definition(en) (z. B. {1}). Diese werden im Browser nicht unterstützt; betroffene Regeln werden als „nicht auswertbar“ gemeldet.': 'The Schematron contains {0} xsl:function definition(s) (e.g. {1}). These are not supported in the browser; affected rules are reported as “not evaluable”.',
  'Das Schematron verwendet xsl:key – key()-Aufrufe sind nicht auswertbar.': 'The Schematron uses xsl:key – key() calls cannot be evaluated.',
  'sch:let "{0}" ohne @value wird nicht unterstützt.': 'sch:let "{0}" without @value is not supported.',
  'sch:extends rule="{0}" nicht gefunden.': 'sch:extends rule="{0}" not found.',
  'Pattern "{0}": abstraktes Pattern "{1}" nicht gefunden.': 'Pattern "{0}": abstract pattern "{1}" not found.',
  '{0} nicht auswertbar: {1}': '{0} not evaluable: {1}',
  ' (bei {0} Knoten)': ' ({0} nodes)',
  'Regel-Kontext „{0}“': 'Rule context “{0}”',
  'Prüfung {0}': 'Check {0}',
  'Assertion verletzt': 'Assertion failed',
  'Report ausgelöst': 'Report triggered',
  '{0}: XSLT {1} wird im Browser nicht unterstützt (nur XSLT 1.0). Bitte die Schematron-Quelle (.sch) ins Profil aufnehmen – sie wird mit XPath 3.1 direkt ausgewertet.': '{0}: XSLT {1} is not supported in the browser (XSLT 1.0 only). Please add the Schematron source (.sch) to the profile – it is evaluated directly with XPath 3.1.',
  '{0}: XSLT-Transformation lieferte kein Ergebnis': '{0}: XSLT transformation returned no result',
  'Nur Wohlgeformtheit': 'Well-formedness only',
  'ohne Namensraum': 'no namespace',
  'Kein XSD im Profil passt zum Wurzelelement {{0}}{1}. Vorhandene Einstiegs-XSDs: {2}': 'No XSD in the profile matches the root element {{0}}{1}. Available entry XSDs: {2}',
  'XSD-Prüfung ({0}) …': 'XSD validation ({0}) …',
  'Wohlgeformtheit …': 'Well-formedness …',
  'xmllint beendet mit Code {0}: {1}': 'xmllint exited with code {0}: {1}',
  'ohne Meldung': 'no message',
  'Wohlgeformtheit': 'Well-formedness',
  'Das Dokument konnte vom Browser nicht als DOM geladen werden – Schematron-Prüfung übersprungen.': 'The browser could not load the document as DOM – Schematron validation skipped.',
  'Zeilennummern der Schematron-Befunde sind näherungsweise (Entitäten im Dokument).': 'Line numbers of Schematron findings are approximate (entities in document).',
  'Schematron ({0}) …': 'Schematron ({0}) …',
  '{0}: {1} Prüfung(en) konnten nicht ausgewertet werden – das Ergebnis ist unvollständig (siehe Warnungen „nicht auswertbar“).': '{0}: {1} check(s) could not be evaluated – the result is incomplete (see “not evaluable” warnings).',
  'Schematron-Prüfung übersprungen, da das Dokument nicht wohlgeformt ist.': 'Schematron validation skipped because the document is not well-formed.',
  'Datei': 'File', 'Schwere': 'Severity', 'Quelle': 'Source', 'Regel-ID': 'Rule ID', 'Zeile': 'Line', 'Position': 'Location', 'Meldung': 'Message', 'Test': 'Test', 'Schema': 'Schema',
  // UI
  'Fehler': 'Error', 'Warnung': 'Warning', 'Info': 'Info',
  'Gültig': 'Valid', 'Gültig mit Warnungen': 'Valid with warnings', 'Ungültig': 'Invalid',
  'Muss behoben werden – sonst ist das Dokument ungültig.': 'Must be fixed – otherwise the document is invalid.',
  'Sollte geprüft werden, macht das Dokument aber nicht ungültig.': 'Should be reviewed, but does not make the document invalid.',
  'Nur ein Hinweis, kein Handlungsbedarf.': 'Just a note, no action needed.',
  'Alle Prüfungen bestanden.': 'All checks passed.',
  'Keine Fehler, aber Hinweise, die man sich ansehen sollte.': 'No errors, but notes worth looking at.',
  'Mindestens ein Fehler – die Datei entspricht nicht den Regeln. Klicken für Details.': 'At least one error – the file does not comply with the rules. Click for details.',
  'Offline-Modus aktiv · Netzwerk gesperrt': 'Offline mode active · network blocked',
  'Prüfe Netzwerksperre …': 'Checking network lock …',
  'Netzwerksperre nicht bestätigt': 'Network lock not confirmed',
  'Selbsttest bestanden: Die Content-Security-Policy dieser Datei blockiert jede Netzwerkverbindung (connect-src \'none\'). Dokumente verlassen den Rechner nicht.': 'Self-test passed: this file\'s Content Security Policy blocks every network connection (connect-src \'none\'). Documents never leave the computer.',
  'Der Browser hat keine CSP-Verletzung gemeldet. Bitte die Datei lokal (file://) in einem aktuellen Chrome, Edge oder Firefox öffnen.': 'The browser reported no CSP violation. Please open the file locally (file://) in a current Chrome, Edge or Firefox.',
  'Nur Wohlgeformtheit (kein Schema)': 'Well-formedness only (no schema)',
  'Es wird nur geprüft, ob die Dokumente wohlgeformtes XML sind. Legen Sie ein Profil mit XSD und/oder Schematron an, um gegen Regeln zu prüfen.': 'Only checks whether the documents are well-formed XML. Create a profile with XSD and/or Schematron to validate against rules.',
  '{0} XSD-Datei(en)': '{0} XSD file(s)', '{0} Schematron-Datei(en)': '{0} Schematron file(s)',
  'Profil bearbeiten': 'Edit profile', 'Neues Prüfprofil': 'New validation profile',
  '{0} Datei(en) übernommen': '{0} file(s) added', ', {0} ignoriert (nur .xsd, .sch, .xsl, .xslt, .xml)': ', {0} ignored (only .xsd, .sch, .xsl, .xslt, .xml)',
  'Schematron (XSLT)': 'Schematron (XSLT)', 'Hilfsdatei': 'Helper file',
  'Einstiegspunkt: wird direkt zur Prüfung verwendet': 'Entry point: used directly for validation',
  '(ohne Ziel-Namensraum)': '(no target namespace)', 'Entfernen': 'Remove',
  'Noch keine Dateien. Ziehen Sie Dateien oder ganze Ordner hierher.': 'No files yet. Drag files or whole folders here.',
  '{0} Einstiegspunkt(e) gewählt. Weitere Dateien werden über include/import eingebunden.': '{0} entry point(s) selected. Other files are pulled in via include/import.',
  'Bitte einen Namen vergeben.': 'Please enter a name.',
  'Bitte mindestens eine Datei als Einstiegspunkt markieren.': 'Please mark at least one file as entry point.',
  'Fehler: {0}': 'Error: {0}',
  '{0}: {1} Patterns, {2} Regeln, {3} Prüfungen': '{0}: {1} patterns, {2} rules, {3} checks',
  'Profil „{0}“ gespeichert': 'Profile “{0}” saved',
  ' (nur für diese Sitzung – Browser-Speicher nicht verfügbar)': ' (this session only – browser storage unavailable)',
  'Keine Profildatei': 'Not a profile file', ' (Import)': ' (import)',
  'Profil „{0}“ importiert.': 'Profile “{0}” imported.', 'Import fehlgeschlagen: {0}': 'Import failed: {0}',
  'Profil „{0}“ gelöscht.': 'Profile “{0}” deleted.', 'Löschen': 'Delete', 'Wirklich löschen?': 'Really delete?',
  'Eingefügter Text': 'Pasted text', 'Starte …': 'Starting …',
  'Fertig: {0} Dokument(e) geprüft.': 'Done: {0} document(s) validated.', 'Prüfung abgebrochen: {0}': 'Validation aborted: {0}',
  'Zeile {0}': 'Line {0}', 'Details': 'Details', 'Test: ': 'Test: ', 'Regelwerk: ': 'Rule set: ', 'Kontext: ': 'Context: ',
  '… {0} weitere Befunde – vollständige Liste im Export.': '… {0} more findings – full list in the export.',
  '{0} Fehler': '{0} errors', '{0} Warnungen': '{0} warnings', '{0} Infos': '{0} infos',
  'Profil': 'Profile', 'Geprüft': 'Validated', 'Größe': 'Size', '{0} · {1} Zeilen · {2} ms': '{0} · {1} lines · {2} ms',
  'Bericht als XML (TAR)': 'Report as XML (TAR)', 'Als CSV': 'As CSV',
  'Keine Befunde. Das Dokument erfüllt alle Prüfungen des Profils.': 'No findings. The document passes all checks of the profile.',
  '{0} Dokumente · {1} gültig · {2} ungültig · {3} Fehler · {4} Warnungen': '{0} documents · {1} valid · {2} invalid · {3} errors · {4} warnings',
  'Ordner können in diesem Browser per Drag & Drop nicht gelesen werden (Einschränkung für lokal geöffnete Dateien). Bitte den Button „Ordner …“ verwenden.': 'This browser cannot read folders via drag & drop (restriction for locally opened files). Please use the “Folder …” button.',
  'Es konnten keine Dateien gelesen werden. Bitte die Auswahl-Buttons verwenden.': 'No files could be read. Please use the file picker buttons.',
  'Dateien konnten nicht gelesen werden: {0}\nBitte die Buttons „Dateien …“ / „Ordner …“ verwenden.': 'Files could not be read: {0}\nPlease use the “Files …” / “Folder …” buttons.',
  'Alle Dokumente und Berichte wurden aus dem Speicher entfernt.': 'All documents and reports were removed from memory.',
  'Hinweis: Browser-Speicher nicht verfügbar – Profile gelten nur für diese Sitzung. Nutzen Sie Export/Import.': 'Note: browser storage unavailable – profiles only last for this session. Use export/import.',
  'Start fehlgeschlagen: {0}': 'Startup failed: {0}',
  'Hell/Dunkel umschalten': 'Toggle light/dark mode',
} };
function t(s, ...a) {
  const tpl = (I18N.lang === 'en' && I18N.en[s]) || s;
  return tpl.replace(/\{(\d)\}/g, (_, i) => String(a[i] ?? ''));
}

const SCH_NS = 'http://purl.oclc.org/dsdl/schematron';
const SVRL_NS = 'http://purl.oclc.org/dsdl/svrl';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema';
const DEFAULT_NS = {
  xs: XSD_NS,
  fn: 'http://www.w3.org/2005/xpath-functions',
  math: 'http://www.w3.org/2005/xpath-functions/math',
  map: 'http://www.w3.org/2005/xpath-functions/map',
  array: 'http://www.w3.org/2005/xpath-functions/array',
};

/* ---------------------------------------------------------------------
 * Hilfsfunktionen: Pfade, Encoding
 * ------------------------------------------------------------------- */
const Paths = {
  dirname(p) { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); },
  basename(p) { return p.slice(p.lastIndexOf('/') + 1); },
  normalize(p) {
    const out = [];
    for (const seg of p.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') out.pop(); else out.push(seg);
    }
    return out.join('/');
  },
  resolve(base, href) {
    href = href.replace(/^file:\/\/\/?/, '');
    if (href.startsWith('/')) return Paths.normalize(href);
    const d = Paths.dirname(base);
    return Paths.normalize(d ? d + '/' + href : href);
  },
  relative(fromFile, toFile) {
    const a = Paths.dirname(fromFile).split('/').filter(Boolean);
    const b = toFile.split('/');
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  },
};

/** Bytes -> String unter Beachtung von BOM und XML-Deklaration */
function decodeXml(bytes) {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 300));
  const m = /^\s*<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(head);
  let label = m ? m[1] : 'utf-8';
  try { return new TextDecoder(label).decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}

/** Setzt die Encoding-Angabe der XML-Deklaration auf UTF-8 (für Strings, die als UTF-8 weitergegeben werden) */
function forceUtf8Decl(text) {
  return text.replace(/^(﻿?\s*<\?xml[^>]*?encoding\s*=\s*)(["'])[^"']*\2/, '$1$2UTF-8$2');
}

/* ---------------------------------------------------------------------
 * Zeilennummern: n-tes Start-Tag im Quelltext <-> n-tes Element im DOM
 * ------------------------------------------------------------------- */
function startTagLines(text) {
  const lines = [];
  const n = text.length;
  let line = 1, i = 0;
  const nl = (from, to) => { let c = 0; for (let k = from; k < to; k++) if (text.charCodeAt(k) === 10) c++; return c; };
  const skipQuoted = (k, endCh) => { // bis zum Tag-Ende unter Beachtung von Quotes
    let q = 0;
    for (; k < n; k++) {
      const ch = text[k];
      if (q) { if (ch === q) q = 0; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === endCh) return k + 1;
    }
    return n;
  };
  while (i < n) {
    const j = text.indexOf('<', i);
    if (j < 0) break;
    line += nl(i, j);
    let k;
    if (text.startsWith('<!--', j)) { k = text.indexOf('-->', j + 4); k = k < 0 ? n : k + 3; }
    else if (text.startsWith('<![CDATA[', j)) { k = text.indexOf(']]>', j + 9); k = k < 0 ? n : k + 3; }
    else if (text.startsWith('<?', j)) { k = text.indexOf('?>', j + 2); k = k < 0 ? n : k + 2; }
    else if (text.startsWith('<!', j)) { // DOCTYPE inkl. internem Subset
      let depth = 0, q = 0; k = j + 2;
      for (; k < n; k++) {
        const ch = text[k];
        if (q) { if (ch === q) q = 0; continue; }
        if (ch === '"' || ch === "'") q = ch;
        else if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === '>' && depth <= 0) { k++; break; }
      }
    }
    else if (text[j + 1] === '/') { k = text.indexOf('>', j); k = k < 0 ? n : k + 1; }
    else { lines.push(line); k = skipQuoted(j + 1, '>'); }
    line += nl(j, k);
    i = k;
  }
  return lines;
}

class SourceIndex {
  constructor(doc, text) {
    this.doc = doc;
    this.lineOf = new Map();
    const lines = startTagLines(text);
    const w = doc.createTreeWalker(doc, 1 /* SHOW_ELEMENT */);
    let idx = 0, el;
    while ((el = w.nextNode())) { this.lineOf.set(el, lines[idx++] ?? null); }
    this.exact = idx === lines.length;
  }
  line(node) {
    if (!node) return null;
    if (node.nodeType === 9) return 1;
    if (node.nodeType === 2) node = node.ownerElement;
    else if (node.nodeType !== 1) node = node.parentNode;
    return node ? (this.lineOf.get(node) ?? null) : null;
  }
}

function nodePath(node) {
  if (!node) return '';
  if (node.nodeType === 9) return '/';
  let tail = '';
  if (node.nodeType === 2) { tail = '/@' + node.name; node = node.ownerElement; }
  else if (node.nodeType === 3 || node.nodeType === 4) { tail = '/text()'; node = node.parentNode; }
  else if (node.nodeType === 8) { tail = '/comment()'; node = node.parentNode; }
  else if (node.nodeType === 7) { tail = '/processing-instruction()'; node = node.parentNode; }
  const parts = [];
  while (node && node.nodeType === 1) {
    let i = 1;
    for (let s = node.previousElementSibling; s; s = s.previousElementSibling)
      if (s.localName === node.localName && s.namespaceURI === node.namespaceURI) i++;
    parts.unshift(`${node.nodeName}[${i}]`);
    node = node.parentNode;
  }
  return '/' + parts.join('/') + tail;
}

/* ---------------------------------------------------------------------
 * xmllint (libxml2 als WebAssembly) im Worker
 * ------------------------------------------------------------------- */
const Xmllint = {
  _url: null, _wasm: null,
  init() {
    if (this._url) return;
    let src = document.getElementById('xmllint-src').textContent;
    // wasm-Binary direkt übergeben statt per fetch nachzuladen
    src = src.replace(/wasmMemory,\s*\n/, 'wasmMemory, wasmBinary: data.wasmBinary,\n')
             .replace("new URL('./xmllint.wasm', import.meta.url).href", 'path');
    this._url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const b64 = document.getElementById('xmllint-wasm').textContent.trim();
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    this._wasm = bytes;
  },
  /** inputFiles: [{fileName, contents: string|Uint8Array}], args: string[] */
  run(inputFiles, args, totalBytes) {
    this.init();
    const maxPages = Math.min(65536, Math.max(2048, Math.ceil((totalBytes * 12) / 65536) + 1024));
    return new Promise((resolve, reject) => {
      const worker = new Worker(this._url);
      const done = (fn, v) => { worker.terminate(); fn(v); };
      worker.addEventListener('message', (ev) => {
        const d = ev.data;
        if (!d || d['xmllint-wasm'] !== true) return;
        done(resolve, d);
      });
      worker.addEventListener('error', (e) => done(reject, new Error(e.message || 'Worker-Fehler')));
      worker.postMessage({
        'xmllint-wasm': true, inputFiles, args,
        initialMemory: 256, maxMemory: maxPages,
        wasmBinary: this._wasm,
      });
    });
  },
};

/** Parst die stderr-Ausgabe von xmllint in Befunde */
function parseXmllintOutput(stderr, docName, schemaPrefix) {
  const items = [];
  const lines = stderr.split('\n');
  let last = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line) continue;
    if (/ validates$/.test(line) || / fails to validate$/.test(line)) continue;
    const m = /^(.+?):(\d+):(?:(\d+):)? (.*)$/.exec(line);
    if (m && (m[1] === docName || m[1].startsWith(schemaPrefix))) {
      const file = m[1];
      let msg = m[4];
      const isSchema = file !== docName;
      let severity = /\bwarning\b\s*:/i.test(msg) ? 'warning' : 'error';
      let source = isSchema ? 'Schema' : 'XSD';
      if (/parser (error|warning)|namespace (error|warning)|\bIO error|validity error\b(?!.*Schemas)/i.test(msg) && !isSchema && !/Schemas/.test(msg)) source = 'Wohlgeformtheit';
      // Präfixe wie "element b: Schemas validity error : " lesbarer machen
      const mm = /^(?:element ([^:]+): )?(?:Schemas |)(?:validity|parser|namespace)? ?(error|warning) : (.*)$/i.exec(msg);
      let element = null;
      if (mm) { element = mm[1] || null; msg = mm[3]; }
      last = {
        severity, source, message: msg, line: parseInt(m[2], 10),
        column: m[3] ? parseInt(m[3], 10) : null,
        location: element ? t('Element {0}', element) : '',
        file: isSchema ? file.slice(schemaPrefix.length) : null,
        id: '', test: '',
      };
      items.push(last);
    } else if (/^\s*\^\s*$/.test(line)) {
      // Caret-Zeile -> ignorieren
    } else if (/^WXS schema (.+) failed to compile$/.test(line)) {
      items.push({ severity: 'error', source: 'Schema', message: t('Das XSD konnte nicht kompiliert werden (siehe Meldungen zum Schema). Prüfen Sie, ob alle eingebundenen Dateien (include/import) im Profil enthalten sind.'), line: null, location: '', file: line.replace(/^WXS schema (.+) failed to compile$/, '$1').slice(schemaPrefix.length), id: '', test: '' });
    } else if (last && last.source === 'Wohlgeformtheit' && !last.context) {
      last.context = line; // Kontextzeile nach Parserfehler
    } else if (!m) {
      items.push({ severity: 'error', source: 'System', message: line, line: null, location: '', id: '', test: '' });
    }
  }
  return items;
}

/* ---------------------------------------------------------------------
 * XSD-Hilfen: Metadaten, URL-Mapping
 * ------------------------------------------------------------------- */
function xsdMeta(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.namespaceURI !== XSD_NS || root.localName !== 'schema') return null;
  const refs = [];
  const elements = [];
  for (const c of root.children) {
    if (c.namespaceURI !== XSD_NS) continue;
    if (['include', 'import', 'redefine', 'override'].includes(c.localName) && c.getAttribute('schemaLocation'))
      refs.push(c.getAttribute('schemaLocation'));
    if (c.localName === 'element' && c.getAttribute('name')) elements.push(c.getAttribute('name'));
  }
  return { targetNamespace: root.getAttribute('targetNamespace') || '', elements, refs };
}

/** schemaLocation="http://.../x.xsd" auf gleichnamige Profildatei umbiegen (--nonet) */
function rewriteRemoteSchemaLocations(path, text, byBase) {
  return text.replace(/(schemaLocation\s*=\s*)(["'])(https?:\/\/[^"']+)\2/g, (all, pre, q, url) => {
    const base = Paths.basename(url.split(/[?#]/)[0]);
    const target = byBase.get(base);
    return target ? `${pre}${q}${Paths.relative(path, target)}${q}` : all;
  });
}

/* ---------------------------------------------------------------------
 * Schematron-Compiler (ISO Schematron -> interne Struktur)
 * ------------------------------------------------------------------- */
function parseXmlText(text, name) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pe = doc.getElementsByTagName('parsererror')[0];
  if (pe && (!doc.documentElement || doc.documentElement.localName === 'parsererror' || pe.namespaceURI))
    throw new Error(`${name}: ${t('XML nicht wohlgeformt')} – ${pe.textContent.trim().split('\n')[0]}`);
  return doc;
}

function schChildren(el, name) {
  const r = [];
  for (const c of el.children) if (c.namespaceURI === SCH_NS && (!name || c.localName === name)) r.push(c);
  return r;
}

function compileSchematron(entryPath, files /* Map path -> text */) {
  const warnings = [];
  const entryText = files.get(entryPath);
  const doc = parseXmlText(entryText, entryPath);
  const root = doc.documentElement;
  if (root.namespaceURI !== SCH_NS || root.localName !== 'schema')
    throw new Error(t('{0}: kein ISO-Schematron (Wurzel muss sch:schema im Namensraum {1} sein)', entryPath, SCH_NS));

  // --- includes auflösen (rekursiv) ---
  const resolveIncludes = (el, basePath, depth) => {
    if (depth > 30) throw new Error(t('Zu tief verschachtelte sch:include'));
    for (const inc of [...el.getElementsByTagNameNS(SCH_NS, 'include')]) {
      if (!inc.parentNode) continue;
      const href = inc.getAttribute('href') || '';
      const [file, frag] = href.split('#');
      const target = Paths.resolve(basePath, file);
      const txt = files.get(target);
      if (txt == null) {
        warnings.push(t('sch:include "{0}" (aus {1}) nicht im Profil gefunden – Regeln daraus fehlen.', href, basePath));
        inc.remove();
        continue;
      }
      const idoc = parseXmlText(txt, target);
      let node = idoc.documentElement;
      if (frag) {
        node = [...idoc.getElementsByTagName('*')].find((e) => e.getAttribute('id') === frag) || null;
        if (!node) { warnings.push(t('sch:include "{0}": id nicht gefunden.', href)); inc.remove(); continue; }
      }
      resolveIncludes(node, target, depth + 1);
      const imported = doc.importNode(node, true);
      if (imported.namespaceURI === SCH_NS && imported.localName === 'schema') {
        const frag2 = doc.createDocumentFragment();
        for (const c of [...imported.childNodes]) frag2.appendChild(c);
        inc.replaceWith(frag2);
      } else inc.replaceWith(imported);
    }
  };
  resolveIncludes(root, entryPath, 0);

  // --- Namensräume ---
  const ns = { ...DEFAULT_NS };
  for (const n of root.getElementsByTagNameNS(SCH_NS, 'ns')) ns[n.getAttribute('prefix')] = n.getAttribute('uri');

  const queryBinding = (root.getAttribute('queryBinding') || 'xslt').toLowerCase();

  // xsl:function / xsl:key können nicht ausgewertet werden
  const XSL = 'http://www.w3.org/1999/XSL/Transform';
  const xslFns = root.getElementsByTagNameNS(XSL, 'function');
  if (xslFns.length) warnings.push(t('Das Schematron enthält {0} xsl:function-Definition(en) (z. B. {1}). Diese werden im Browser nicht unterstützt; betroffene Regeln werden als „nicht auswertbar“ gemeldet.', xslFns.length, xslFns[0].getAttribute('name')));
  if (root.getElementsByTagNameNS(XSL, 'key').length) warnings.push(t('Das Schematron verwendet xsl:key – key()-Aufrufe sind nicht auswertbar.'));

  const readLets = (el) => schChildren(el, 'let').map((l) => {
    if (!l.hasAttribute('value')) warnings.push(t('sch:let "{0}" ohne @value wird nicht unterstützt.', l.getAttribute('name')));
    return { name: l.getAttribute('name'), value: l.getAttribute('value') || '()' };
  });
  const globalLets = readLets(root);

  // --- Diagnostics ---
  const diagnostics = new Map();
  for (const d of root.getElementsByTagNameNS(SCH_NS, 'diagnostic')) diagnostics.set(d.getAttribute('id'), d);

  // --- Phasen ---
  const phases = schChildren(root, 'phase').map((p) => ({ id: p.getAttribute('id'), active: schChildren(p, 'active').map((a) => a.getAttribute('pattern')), lets: readLets(p) }));
  const defaultPhase = root.getAttribute('defaultPhase') || '#ALL';

  // --- Patterns ---
  const allPatterns = [...root.getElementsByTagNameNS(SCH_NS, 'pattern')];
  const abstractPatterns = new Map();
  for (const p of allPatterns) if (p.getAttribute('abstract') === 'true') abstractPatterns.set(p.getAttribute('id'), p);
  const abstractRules = new Map();
  for (const r of root.getElementsByTagNameNS(SCH_NS, 'rule')) if (r.getAttribute('abstract') === 'true' && r.getAttribute('id')) abstractRules.set(r.getAttribute('id'), r);

  const makeSubst = (params) => {
    if (!params.length) return (s) => s;
    const sorted = [...params].sort((a, b) => b.name.length - a.name.length);
    return (s) => {
      if (s == null) return s;
      let out = '', i = 0;
      while (i < s.length) {
        if (s[i] === '$') {
          const hit = sorted.find((p) => s.startsWith(p.name, i + 1) && !/[\w.\-·À-￿]/.test(s[i + 1 + p.name.length] || ''));
          if (hit) { out += hit.value; i += 1 + hit.name.length; continue; }
        }
        out += s[i++];
      }
      return out;
    };
  };

  const compileMessage = (el, subst) => {
    const parts = [];
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3 || c.nodeType === 4) parts.push({ t: 'text', v: c.nodeValue });
        else if (c.nodeType === 1) {
          if (c.namespaceURI === SCH_NS && c.localName === 'value-of') parts.push({ t: 'value', select: subst(c.getAttribute('select')) });
          else if (c.namespaceURI === SCH_NS && c.localName === 'name') parts.push({ t: 'name', path: subst(c.getAttribute('path')) || null });
          else walk(c); // emph, dir, span, fremde Elemente -> Text
        }
      }
    };
    walk(el);
    return parts;
  };

  const compileAssertions = (ruleEl, subst, ruleFlag, ruleRole, depth = 0) => {
    const items = [];
    const lets = [];
    for (const c of ruleEl.children) {
      if (c.namespaceURI !== SCH_NS) continue;
      if (c.localName === 'let') lets.push({ name: c.getAttribute('name'), value: subst(c.getAttribute('value') || '()') });
      else if (c.localName === 'assert' || c.localName === 'report') {
        const diags = (c.getAttribute('diagnostics') || '').split(/\s+/).filter(Boolean).map((id) => diagnostics.get(id)).filter(Boolean);
        items.push({
          kind: c.localName,
          test: subst(c.getAttribute('test') || 'true()'),
          id: c.getAttribute('id') || '',
          flag: c.getAttribute('flag') || ruleFlag || '',
          role: c.getAttribute('role') || ruleRole || '',
          message: compileMessage(c, subst),
          diagnostics: diags.map((d) => compileMessage(d, subst)),
        });
      } else if (c.localName === 'extends') {
        const ref = c.getAttribute('rule');
        const ar = abstractRules.get(ref);
        if (!ar) { warnings.push(t('sch:extends rule="{0}" nicht gefunden.', ref)); continue; }
        if (depth > 20) continue;
        const sub = compileAssertions(ar, subst, ruleFlag, ruleRole, depth + 1);
        lets.push(...sub.lets);
        items.push(...sub.items);
      }
    }
    return { lets, items };
  };

  const compilePattern = (p) => {
    let src = p, params = [];
    const isA = p.getAttribute('is-a');
    if (isA) {
      src = abstractPatterns.get(isA);
      if (!src) { warnings.push(t('Pattern "{0}": abstraktes Pattern "{1}" nicht gefunden.', p.getAttribute('id'), isA)); return null; }
      params = schChildren(p, 'param').map((x) => ({ name: x.getAttribute('name'), value: x.getAttribute('value') || '' }));
    }
    const subst = makeSubst(params);
    const lets = [...readLets(p), ...(src !== p ? readLets(src) : [])].map((l) => ({ name: l.name, value: subst(l.value) }));
    const rules = [];
    for (const r of schChildren(src, 'rule')) {
      if (r.getAttribute('abstract') === 'true') continue;
      const ctx = subst(r.getAttribute('context'));
      if (!ctx) continue;
      const { lets: rlets, items } = compileAssertions(r, subst, r.getAttribute('flag'), r.getAttribute('role'));
      rules.push({ context: ctx.trim(), lets: rlets, items });
    }
    return { id: p.getAttribute('id') || '', name: (schChildren(p, 'title')[0]?.textContent || '').trim(), lets, rules };
  };

  const concrete = allPatterns.filter((p) => p.getAttribute('abstract') !== 'true');
  const compiledPatterns = concrete.map(compilePattern).filter(Boolean);

  return {
    title: (schChildren(root, 'title')[0]?.textContent || '').trim(),
    queryBinding, ns, globalLets, phases, defaultPhase, patterns: compiledPatterns, warnings,
    stats: { patterns: compiledPatterns.length, rules: compiledPatterns.reduce((a, p) => a + p.rules.length, 0), asserts: compiledPatterns.reduce((a, p) => a + p.rules.reduce((b, r) => b + r.items.length, 0), 0) },
  };
}

/* ---------------------------------------------------------------------
 * Schematron-Auswertung
 * ------------------------------------------------------------------- */
function severityOf(flag, role) {
  const v = `${role || ''} ${flag || ''}`.toLowerCase();
  if (/\b(warn|warning)\b/.test(v)) return 'warning';
  if (/\b(info|information|informational|hint)\b/.test(v)) return 'info';
  return 'error';
}

function isStaticError(e) {
  const s = `${e && e.code || ''} ${e && e.message || ''}`;
  return /XPST\d{4}|XQST\d{4}|XPDY0002|Unknown function|Cannot find a \d+-argument function|Variable .* has not been declared|Undeclared variable|Namespace prefix .* has not been declared|syntax error|Unexpected token|XPath syntax/i.test(s);
}

function errText(e) {
  return String((e && (e.message || e.toString())) || e).replace(/\s+/g, ' ').trim();
}

async function runSchematron(compiled, doc, index, opts = {}) {
  const SX = window.SaxonJS;
  if (!SX) throw new Error('SaxonJS nicht geladen');
  const ns = compiled.ns;
  const findings = [];
  const unevaluable = new Map(); // key -> finding
  const phaseId = opts.phase || compiled.defaultPhase;
  let active = compiled.patterns;
  let phaseLets = [];
  if (phaseId && phaseId !== '#ALL') {
    const ph = compiled.phases.find((p) => p.id === phaseId);
    if (ph) { active = compiled.patterns.filter((p) => ph.active.includes(p.id)); phaseLets = ph.lets; }
  }
  const globals = [...compiled.globalLets, ...phaseLets];
  const globalPrefix = globals.map((l) => `$${l.name} := root(.) ! (${l.value})`);
  const letClause = (extra) => {
    const all = [...globalPrefix, ...extra.map((l) => `$${l.name} := (${l.value})`)];
    return all.length ? `let ${all.join(', ')} return ` : '';
  };
  const ev = (expr, ctx, form = 'array', params) =>
    SX.XPath.evaluate(expr, ctx, { namespaceContext: ns, resultForm: form, params });

  const noteUnevaluable = (key, what, e, node, item) => {
    let f = unevaluable.get(key);
    if (!f) {
      f = {
        severity: 'warning', source: 'Schematron', unevaluable: true,
        message: t('{0} nicht auswertbar: {1}', what, errText(e)),
        id: item ? item.id : '', test: item ? item.test : '',
        line: index.line(node), location: node ? nodePath(node) : '', count: 0,
      };
      unevaluable.set(key, f);
    }
    f.count++;
  };

  const buildMessage = (parts, node, lets, item) => {
    let s = '';
    for (const p of parts) {
      if (p.t === 'text') s += p.v;
      else if (p.t === 'value') {
        try {
          const r = ev(`${letClause(lets)}string-join(for $v in (${p.select}) return string($v), ' ')`, node, 'default');
          s += r == null ? '' : String(r);
        } catch (e) { s += `[value-of: ${errText(e)}]`; }
      } else if (p.t === 'name') {
        try { s += String(ev(`name(${p.path || '.'})`, node, 'default') ?? ''); } catch { s += node.nodeName || ''; }
      }
    }
    return s.replace(/\s+/g, ' ').trim();
  };

  const broken = new Set(); // Items mit statischem Fehler
  let evaluatedRules = 0, firedNodes = 0, tick = performance.now();

  for (const pattern of active) {
    const fired = new Set();
    for (let ri = 0; ri < pattern.rules.length; ri++) {
      const rule = pattern.rules[ri];
      const lets = [...pattern.lets, ...rule.lets];
      const ruleKey = `${pattern.id}#${ri}`;
      // Kontext-Knoten bestimmen
      let nodes;
      try {
        const ctx = rule.context.startsWith('/') && !rule.context.includes('|') ? rule.context : `//(${rule.context})`;
        nodes = ev(`${globals.length ? `let ${globals.map((l) => `$${l.name} := (${l.value})`).join(', ')} return ` : ''}${ctx}`, doc, 'array');
      } catch (e) {
        noteUnevaluable(ruleKey + ':ctx', t('Regel-Kontext „{0}“', rule.context), e, null, null);
        continue;
      }
      nodes = (Array.isArray(nodes) ? nodes : [nodes]).filter((n) => n && typeof n === 'object' && 'nodeType' in n && !fired.has(n));
      if (!nodes.length) continue;
      nodes.forEach((n) => fired.add(n));
      evaluatedRules++;
      firedNodes += nodes.length;

      const live = rule.items.map((it, k) => ({ it, k })).filter(({ k }) => !broken.has(`${ruleKey}:${k}`));
      if (!live.length) continue;

      // Schnellpfad: alle Tests für alle Knoten in einem Ausdruck
      let results = null;
      try {
        const expr = `for $__n in (if ($__nodes instance of array(*)) then $__nodes?* else $__nodes) return $__n ! (${letClause(lets)}(${live.map(({ it }) => `boolean((${it.test}))`).join(', ')}))`;
        results = ev(expr, doc, 'array', { __nodes: nodes });
        if (!Array.isArray(results) || results.length !== nodes.length * live.length) results = null;
      } catch { results = null; }

      for (let ni = 0; ni < nodes.length; ni++) {
        const node = nodes[ni];
        for (let li = 0; li < live.length; li++) {
          const { it, k } = live[li];
          const bkey = `${ruleKey}:${k}`;
          if (broken.has(bkey)) continue;
          let val;
          if (results) val = results[ni * live.length + li] === true;
          else {
            try { val = ev(`${letClause(lets)}boolean((${it.test}))`, node, 'default') === true; }
            catch (e) {
              if (isStaticError(e)) broken.add(bkey);
              noteUnevaluable(bkey, t('Prüfung {0}', it.id || `„${it.test.slice(0, 80)}“`), e, node, it);
              continue;
            }
          }
          const fails = it.kind === 'assert' ? !val : val;
          if (!fails) continue;
          let msg = buildMessage(it.message, node, lets, it);
          for (const d of it.diagnostics) { const dm = buildMessage(d, node, lets, it); if (dm) msg += ` — ${dm}`; }
          findings.push({
            severity: severityOf(it.flag, it.role), source: 'Schematron',
            message: msg || `${t(it.kind === 'assert' ? 'Assertion verletzt' : 'Report ausgelöst')}: ${it.test}`,
            id: it.id, test: it.test, line: index.line(node), location: nodePath(node),
            kind: it.kind,
          });
        }
      }
      // UI nicht einfrieren
      if (performance.now() - tick > 60) { await new Promise((r) => setTimeout(r, 0)); tick = performance.now(); if (opts.onProgress) opts.onProgress(); }
    }
  }
  for (const f of unevaluable.values()) {
    if (f.count > 1) f.message += t(' (bei {0} Knoten)', f.count);
    findings.push(f);
  }
  return { findings, stats: { evaluatedRules, firedNodes, unevaluable: unevaluable.size } };
}

/* ---------------------------------------------------------------------
 * Schematron als XSLT 1.0 (vorkompiliert, SVRL-Ausgabe)
 * ------------------------------------------------------------------- */
function runXsltSchematron(xslText, xslPath, doc, index) {
  const xsl = parseXmlText(xslText, xslPath);
  const version = xsl.documentElement.getAttribute('version') || '1.0';
  if (parseFloat(version) >= 2) {
    return [{ severity: 'error', source: 'System', message: t('{0}: XSLT {1} wird im Browser nicht unterstützt (nur XSLT 1.0). Bitte die Schematron-Quelle (.sch) ins Profil aufnehmen – sie wird mit XPath 3.1 direkt ausgewertet.', xslPath, version), line: null, location: '', id: '', test: '' }];
  }
  const proc = new XSLTProcessor();
  proc.importStylesheet(xsl);
  const out = proc.transformToDocument(doc);
  if (!out || !out.documentElement) throw new Error(t('{0}: XSLT-Transformation lieferte kein Ergebnis', xslPath));
  const findings = [];
  const svrl = [...out.getElementsByTagNameNS(SVRL_NS, 'failed-assert'), ...out.getElementsByTagNameNS(SVRL_NS, 'successful-report')];
  for (const f of svrl) {
    const loc = f.getAttribute('location') || '';
    let node = null;
    try { node = loc ? SaxonJS.XPath.evaluate(loc.replace(/\*:([\w.-]+)\[namespace-uri\(\)='([^']*)'\]/g, "Q{$2}$1"), doc, { resultForm: 'default' }) : null; } catch { node = null; }
    const text = [...f.getElementsByTagNameNS(SVRL_NS, 'text')].map((t) => t.textContent).join(' ').replace(/\s+/g, ' ').trim();
    findings.push({
      severity: severityOf(f.getAttribute('flag'), f.getAttribute('role')), source: 'Schematron',
      message: text, id: f.getAttribute('id') || '', test: f.getAttribute('test') || '',
      line: node && node.nodeType ? index.line(node) : null, location: loc,
    });
  }
  return findings;
}

/* ---------------------------------------------------------------------
 * Gesamtvalidierung eines Dokuments
 * ------------------------------------------------------------------- */
async function validateDocument(input, profile, opts = {}) {
  const t0 = performance.now();
  const report = {
    fileName: input.name, size: input.bytes.length, date: new Date(),
    profile: profile ? profile.name : t('Nur Wohlgeformtheit'), items: [], notes: [], steps: [],
  };
  const text = decodeXml(input.bytes);
  report.lines = text.split(/\r\n|\r|\n/);
  try {
    const h = await crypto.subtle.digest('SHA-256', input.bytes);
    report.sha256 = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { report.sha256 = null; }

  const progress = opts.onProgress || (() => {});
  const DOC = 'dokument.xml', SP = 'schema/';
  const xmlBytes = input.fromText ? new TextEncoder().encode(forceUtf8Decl(text)) : input.bytes;

  // ---- 1) Wohlgeformtheit + XSD via xmllint ----
  const files = profile ? new Map(profile.files.map((f) => [f.path, f.content])) : new Map();
  const xsdEntries = profile ? profile.files.filter((f) => f.kind === 'xsd' && f.entry) : [];
  let rootNs = null, rootLocal = null;
  {
    const m = /<([A-Za-z_][\w.\-]*:)?([A-Za-z_][\w.\-]*)[\s>\/]/.exec(text.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^\[>]*(\[[\s\S]*?\])?\s*>/g, ''));
    if (m) rootLocal = m[2];
  }
  let selected = [];
  let doc = null;
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml');
    const pe = doc.getElementsByTagName('parsererror');
    if (pe.length && (!doc.documentElement || doc.documentElement.localName === 'parsererror' || pe[0].namespaceURI === 'http://www.mozilla.org/newlayout/xml/parsererror.xml' || doc.documentElement.getElementsByTagName('parsererror').length)) doc = null;
  } catch { doc = null; }
  if (doc) { rootNs = doc.documentElement.namespaceURI || ''; rootLocal = doc.documentElement.localName; }

  if (xsdEntries.length) {
    selected = xsdEntries.filter((f) => f.meta && f.meta.targetNamespace === (rootNs ?? '') && (!f.meta.elements.length || f.meta.elements.includes(rootLocal)));
    if (!selected.length && rootNs !== null) {
      report.items.push({ severity: 'error', source: 'XSD', message: t('Kein XSD im Profil passt zum Wurzelelement {{0}}{1}. Vorhandene Einstiegs-XSDs: {2}', rootNs, rootLocal, xsdEntries.map((f) => `${f.path} (${f.meta?.targetNamespace || t('ohne Namensraum')})`).join(', ')), line: 1, location: '/', id: '', test: '' });
    }
  }

  const byBase = new Map();
  if (profile) for (const f of profile.files) if (f.kind === 'xsd' && !byBase.has(Paths.basename(f.path))) byBase.set(Paths.basename(f.path), f.path);
  const schemaFiles = profile ? profile.files.filter((f) => f.kind === 'xsd').map((f) => ({ fileName: SP + f.path, contents: forceUtf8Decl(rewriteRemoteSchemaLocations(f.path, f.content, byBase)) })) : [];
  const schemaBytes = schemaFiles.reduce((a, f) => a + f.contents.length, 0);

  const runs = selected.length ? selected.map((f) => SP + f.path) : [null];
  let wellFormed = true;
  for (const schemaPath of runs) {
    progress(schemaPath ? t('XSD-Prüfung ({0}) …', schemaPath.slice(SP.length)) : t('Wohlgeformtheit …'));
    const args = [];
    if (schemaPath) args.push('--schema', schemaPath);
    args.push('--noout', '--nonet', DOC);
    const res = await Xmllint.run([{ fileName: DOC, contents: xmlBytes }, ...(schemaPath ? schemaFiles : [])], args, xmlBytes.length + schemaBytes);
    let items = parseXmllintOutput(res.stderr || '', DOC, SP);
    if (res.exitCode !== 0 && !items.length) items.push({ severity: 'error', source: 'System', message: t('xmllint beendet mit Code {0}: {1}', res.exitCode, (res.stderr || '').trim() || t('ohne Meldung')), line: null, location: '', id: '', test: '' });
    if (res.exitCode === 1 || items.some((i) => i.source === 'Wohlgeformtheit' && i.severity === 'error')) {
      wellFormed = false;
      items = items.map((i) => (i.source === 'XSD' ? { ...i, source: 'Wohlgeformtheit' } : i));
    }
    if (schemaPath) report.steps.push({ name: `XSD ${schemaPath.slice(SP.length)}`, ok: res.exitCode === 0 });
    report.items.push(...items.map((i) => ({ ...i, schema: schemaPath ? schemaPath.slice(SP.length) : '' })));
    if (!wellFormed) break;
  }
  report.steps.unshift({ name: t('Wohlgeformtheit'), ok: wellFormed });

  // ---- 2) Schematron ----
  const schEntries = profile ? profile.files.filter((f) => (f.kind === 'sch' || f.kind === 'xslt') && f.entry) : [];
  if (schEntries.length && wellFormed) {
    if (!doc) {
      report.items.push({ severity: 'error', source: 'System', message: t('Das Dokument konnte vom Browser nicht als DOM geladen werden – Schematron-Prüfung übersprungen.'), line: null, location: '', id: '', test: '' });
    } else {
      const index = new SourceIndex(doc, text);
      if (!index.exact) report.notes.push(t('Zeilennummern der Schematron-Befunde sind näherungsweise (Entitäten im Dokument).'));
      for (const f of schEntries) {
        progress(t('Schematron ({0}) …', f.path));
        await new Promise((r) => setTimeout(r, 0));
        try {
          let found;
          if (f.kind === 'xslt') found = runXsltSchematron(f.content, f.path, doc, index);
          else {
            const compiled = opts.compiledCache?.get(f.path) || compileSchematron(f.path, files);
            opts.compiledCache?.set(f.path, compiled);
            for (const w of compiled.warnings) report.notes.push(`${f.path}: ${w}`);
            const r = await runSchematron(compiled, doc, index, { phase: f.phase, onProgress: () => progress(t('Schematron ({0}) …', f.path)) });
            found = r.findings;
            if (r.stats.unevaluable) report.notes.push(t('{0}: {1} Prüfung(en) konnten nicht ausgewertet werden – das Ergebnis ist unvollständig (siehe Warnungen „nicht auswertbar“).', f.path, r.stats.unevaluable));
          }
          found.forEach((x) => (x.schema = f.path));
          report.items.push(...found);
          report.steps.push({ name: `Schematron ${f.path}`, ok: !found.some((x) => x.severity === 'error') });
        } catch (e) {
          report.items.push({ severity: 'error', source: 'System', message: `Schematron ${f.path}: ${errText(e)}`, line: null, location: '', id: '', test: '', schema: f.path });
          report.steps.push({ name: `Schematron ${f.path}`, ok: false });
        }
      }
    }
  } else if (schEntries.length && !wellFormed) {
    report.notes.push(t('Schematron-Prüfung übersprungen, da das Dokument nicht wohlgeformt ist.'));
  }

  const sevRank = { error: 0, warning: 1, info: 2 };
  report.items.sort((a, b) => (a.line ?? 1e12) - (b.line ?? 1e12) || sevRank[a.severity] - sevRank[b.severity]);
  report.counts = { error: 0, warning: 0, info: 0 };
  for (const i of report.items) report.counts[i.severity]++;
  report.result = report.counts.error ? 'FAILURE' : report.counts.warning ? 'WARNING' : 'SUCCESS';
  report.durationMs = Math.round(performance.now() - t0);
  return report;
}

/* ---------------------------------------------------------------------
 * Berichte exportieren
 * ------------------------------------------------------------------- */
function xmlEsc(s) { return String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

/** Bericht im GITB-TAR-Format (wie der ITB-Validator) */
function toTarXml(r) {
  const items = r.items.map((i) => {
    const tag = i.severity === 'info' ? 'info' : i.severity;
    const loc = i.line ? `Line:${i.line}${i.column ? `,Column:${i.column}` : ''}` : (i.location || '');
    return `    <${tag} xsi:type="BAR">\n      <description>${xmlEsc(i.message)}</description>\n      <location>${xmlEsc(loc)}</location>${i.test ? `\n      <test>${xmlEsc(i.test)}</test>` : ''}${i.id ? `\n      <assertionID>${xmlEsc(i.id)}</assertionID>` : ''}\n    </${tag}>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<TestStepReport xmlns="http://www.gitb.com/tr/v1/" xmlns:gitb="http://www.gitb.com/core/v1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="TAR">
  <date>${r.date.toISOString()}</date>
  <result>${r.result}</result>
  <overview>
    <profileID>${xmlEsc(r.profile)}</profileID>
    <validationServiceName>Lokaler XML-Validator (Browser)</validationServiceName>
  </overview>
  <counters>
    <nrOfAssertions>${r.counts.info}</nrOfAssertions>
    <nrOfErrors>${r.counts.error}</nrOfErrors>
    <nrOfWarnings>${r.counts.warning}</nrOfWarnings>
  </counters>
  <context>
    <gitb:item name="fileName" type="string"><gitb:value>${xmlEsc(r.fileName)}</gitb:value></gitb:item>
    <gitb:item name="sha256" type="string"><gitb:value>${xmlEsc(r.sha256 || '')}</gitb:value></gitb:item>
  </context>
  <reports>
${items}
  </reports>
</TestStepReport>
`;
}

function toCsv(r) {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const head = ['Datei', 'Schwere', 'Quelle', 'Regel-ID', 'Zeile', 'Position', 'Meldung', 'Test', 'Schema'].map((x) => t(x));
  const rows = r.items.map((i) => [r.fileName, t({ error: 'Fehler', warning: 'Warnung', info: 'Info' }[i.severity]), t(i.source), i.id, i.line ?? '', i.location, i.message, i.test, i.schema || i.file || ''].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...rows].join('\r\n');
}

window.t = t; window.I18N = I18N;
window.XVEngine = { validateDocument, compileSchematron, xsdMeta, decodeXml, toTarXml, toCsv, Paths, startTagLines, parseXmllintOutput };
