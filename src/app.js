/* =====================================================================
 * XML-Validator – Oberfläche
 * ===================================================================== */
'use strict';
(() => {
  const E = window.XVEngine;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  };
  const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const SEV = { error: 'Fehler', warning: 'Warnung', info: 'Info' };
  const RESULT = { SUCCESS: 'Gültig', WARNING: 'Gültig mit Warnungen', FAILURE: 'Ungültig' };
  const SEV_HELP = { error: 'Muss behoben werden – sonst ist das Dokument ungültig.', warning: 'Sollte geprüft werden, macht das Dokument aber nicht ungültig.', info: 'Nur ein Hinweis, kein Handlungsbedarf.' };
  const RESULT_HELP = { SUCCESS: 'Alle Prüfungen bestanden.', WARNING: 'Keine Fehler, aber Hinweise, die man sich ansehen sollte.', FAILURE: 'Mindestens ein Fehler – die Datei entspricht nicht den Regeln. Klicken für Details.' };

  /* -------------------------------------------------------------------
   * Sicherheits-Selbsttest: Netzwerk muss per CSP blockiert sein
   * ----------------------------------------------------------------- */
  const net = { blocked: false };
  document.addEventListener('securitypolicyviolation', (e) => {
    if (e.violatedDirective.startsWith('connect-src')) { net.blocked = true; renderNetBadge(); }
  });
  function renderNetBadge() {
    const b = $('#net-badge');
    const st = net.blocked ? 'ok' : net.warn ? 'warn' : 'pending';
    b.className = 'badge ' + st;
    b.textContent = t({ ok: 'Offline-Modus aktiv · Netzwerk gesperrt', warn: 'Netzwerksperre nicht bestätigt', pending: 'Prüfe Netzwerksperre …' }[st]);
    b.title = st === 'ok' ? t('Selbsttest bestanden: Die Content-Security-Policy dieser Datei blockiert jede Netzwerkverbindung (connect-src \'none\'). Dokumente verlassen den Rechner nicht.')
      : st === 'warn' ? t('Der Browser hat keine CSP-Verletzung gemeldet. Bitte die Datei lokal (file://) in einem aktuellen Chrome, Edge oder Firefox öffnen.') : '';
  }
  setTimeout(() => { fetch('https://selbsttest.invalid/').catch(() => {}); }, 50);
  setTimeout(() => { net.warn = true; renderNetBadge(); }, 2500);

  /* -------------------------------------------------------------------
   * Profil-Speicher (IndexedDB, nur Schemadateien – niemals Prüfdokumente)
   * ----------------------------------------------------------------- */
  const Store = {
    db: null, mem: new Map(), persistent: false,
    async open() {
      try {
        this.db = await new Promise((res, rej) => {
          const r = indexedDB.open('xml-validator-profiles', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('profiles', { keyPath: 'id' });
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        this.persistent = true;
      } catch { this.db = null; this.persistent = false; }
    },
    tx(mode) { return this.db.transaction('profiles', mode).objectStore('profiles'); },
    async all() {
      if (!this.db) return [...this.mem.values()];
      return new Promise((res, rej) => { const r = this.tx('readonly').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    },
    async put(p) {
      if (!this.db) { this.mem.set(p.id, p); return; }
      return new Promise((res, rej) => { const r = this.tx('readwrite').put(p); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
    },
    async del(id) {
      if (!this.db) { this.mem.delete(id); return; }
      return new Promise((res, rej) => { const r = this.tx('readwrite').delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
    },
  };

  const state = {
    profiles: [], profileId: '', docs: [], reports: [], compiled: new Map(),
    filter: { error: true, warning: true, info: true, q: '' },
  };
  const currentProfile = () => state.profiles.find((p) => p.id === state.profileId) || null;

  /* -------------------------------------------------------------------
   * Dateien einlesen (inkl. Ordner per Drag&Drop)
   * ----------------------------------------------------------------- */
  /**
   * Liest fallengelassene Dateien/Ordner. Chrome erlaubt auf file://-Seiten je nach Version
   * nicht alle Wege, daher drei Varianten mit Rückfall:
   * 1) File System Access Handles, 2) webkitGetAsEntry, 3) nur flache Dateien (dt.files).
   * Alles, was synchron im drop-Event abgefragt werden muss, wird sofort gesammelt.
   */
  function captureDrop(dt) {
    const items = dt.items ? [...dt.items].filter((i) => i.kind === 'file') : [];
    return {
      files: [...(dt.files || [])],
      handles: items.map((i) => (i.getAsFileSystemHandle ? i.getAsFileSystemHandle().catch(() => null) : null)),
      entries: items.map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)),
    };
  }
  async function readDrop(cap) {
    // 1) Handles
    try {
      if (cap.handles.length && cap.handles.every(Boolean)) {
        const hs = await Promise.all(cap.handles);
        if (hs.every(Boolean)) {
          const out = [];
          const walkH = async (hd, prefix) => {
            if (hd.kind === 'file') out.push({ path: prefix + hd.name, file: await hd.getFile() });
            else for await (const c of hd.values()) await walkH(c, prefix + hd.name + '/');
          };
          for (const hd of hs) await walkH(hd, '');
          return out;
        }
      }
    } catch (e) { console.warn('Handle-Zugriff fehlgeschlagen', e); }
    // 2) Entries
    try {
      if (cap.entries.length && cap.entries.every(Boolean)) return await readEntries(cap.entries);
    } catch (e) { console.warn('Entry-Zugriff fehlgeschlagen', e); }
    // 3) Nur flache Dateien; Ordner erscheinen hier als leere Pseudo-Dateien
    const out = [];
    let dirs = 0;
    for (const f of cap.files) {
      if (!f.type && f.size % 4096 === 0) {
        try { await f.slice(0, 1).arrayBuffer(); } catch { dirs++; continue; }
      }
      out.push({ path: f.name, file: f });
    }
    if (dirs) toast(t('Ordner können in diesem Browser per Drag & Drop nicht gelesen werden (Einschränkung für lokal geöffnete Dateien). Bitte den Button „Ordner …“ verwenden.'), true);
    return out;
  }
  async function readEntries(entries) {
    const out = [];
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise((res, rej) => entry.file(res, rej));
        out.push({ path: prefix + entry.name, file });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        let batch;
        do {
          batch = await new Promise((res, rej) => reader.readEntries(res, rej));
          for (const e of batch) await walk(e, prefix + entry.name + '/');
        } while (batch.length);
      }
    };
    for (const e of entries) await walk(e, '');
    return out;
  }
  const fromInput = (input) => [...input.files].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
  const readBytes = async (f) => new Uint8Array(await f.arrayBuffer());

  function setupDrop(zone, onFiles) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault(); e.stopPropagation(); zone.classList.remove('over');
      const cap = captureDrop(e.dataTransfer);
      try {
        const list = await readDrop(cap);
        if (!list.length) { toast(t('Es konnten keine Dateien gelesen werden. Bitte die Auswahl-Buttons verwenden.'), true); return; }
        await onFiles(list);
      } catch (err) {
        console.error(err);
        toast(t('Dateien konnten nicht gelesen werden: {0}\nBitte die Buttons „Dateien …“ / „Ordner …“ verwenden.', err.message || err), true);
      }
    });
  }
  // Versehentliches Öffnen fallengelassener Dateien im Tab verhindern
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  /* -------------------------------------------------------------------
   * Profile
   * ----------------------------------------------------------------- */
  function kindOf(path, text) {
    const ext = path.toLowerCase().split('.').pop();
    if (ext === 'xsd') return 'xsd';
    if (ext === 'sch') return 'sch';
    if (ext === 'xsl' || ext === 'xslt') return 'xslt';
    if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<([\w-]+:)?schema[^>]+purl\.oclc\.org\/dsdl\/schematron/.test(text.slice(0, 4000))) return 'sch';
    if (/XMLSchema"/.test(text.slice(0, 2000)) && /<([\w-]+:)?schema\b/.test(text.slice(0, 2000))) return 'xsd';
    return 'other';
  }

  /** Einstiegspunkte automatisch erkennen: nicht von anderen Dateien referenziert */
  function detectEntries(files) {
    const referenced = new Set();
    for (const f of files) {
      if (f.kind === 'xsd' && f.meta) for (const r of f.meta.refs) {
        if (/^https?:/.test(r)) { const b = E.Paths.basename(r); files.filter((x) => E.Paths.basename(x.path) === b).forEach((x) => referenced.add(x.path)); }
        else referenced.add(E.Paths.resolve(f.path, r));
      }
      if (f.kind === 'sch') for (const m of f.content.matchAll(/<(?:[\w-]+:)?include\s[^>]*href\s*=\s*["']([^"'#]+)/g)) referenced.add(E.Paths.resolve(f.path, m[1]));
    }
    for (const f of files) {
      if (f.entryManual) continue;
      if (f.kind === 'xsd') f.entry = !referenced.has(f.path) && !!f.meta;
      else if (f.kind === 'sch') f.entry = !referenced.has(f.path) && /<(?:[\w-]+:)?schema[\s>]/.test(f.content.slice(0, 5000)) && !/preprocessed/i.test(f.path);
      else if (f.kind === 'xslt') f.entry = !files.some((x) => x.kind === 'sch');
      else f.entry = false;
    }
  }

  async function filesToProfileFiles(list) {
    const out = [];
    for (const { path, file } of list) {
      if (/(^|\/)\./.test(path)) continue; // versteckte Dateien
      const ext = path.toLowerCase().split('.').pop();
      if (!['xsd', 'sch', 'xsl', 'xslt', 'xml'].includes(ext)) continue;
      const bytes = await readBytes(file);
      const content = E.decodeXml(bytes);
      const kind = kindOf(path, content);
      if (kind === 'other' && ext !== 'xml') continue;
      out.push({ path: path.replace(/\\/g, '/'), kind, content, size: bytes.length, meta: kind === 'xsd' ? E.xsdMeta(content) : null, entry: false });
    }
    return out;
  }

  function stripCommonRoot(files) {
    if (files.length < 2) return;
    const first = files[0].path.split('/');
    if (first.length < 2) return;
    const root = first[0] + '/';
    if (files.every((f) => f.path.startsWith(root))) files.forEach((f) => (f.path = f.path.slice(root.length)));
  }

  async function loadProfiles() {
    state.profiles = (await Store.all()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!state.profiles.find((p) => p.id === state.profileId)) {
      let last = '';
      try { last = localStorage.getItem('xv.lastProfile') || ''; } catch {}
      state.profileId = state.profiles.find((p) => p.id === last) ? last : (state.profiles[0]?.id || '');
    }
    renderProfiles();
  }

  function renderProfiles() {
    const sel = $('#profile-select');
    sel.replaceChildren(h('option', { value: '' }, t('Nur Wohlgeformtheit (kein Schema)')), ...state.profiles.map((p) => h('option', { value: p.id }, p.name)));
    sel.value = state.profileId;
    const p = currentProfile();
    $('#btn-edit').disabled = !p; $('#btn-export').disabled = !p; $('#btn-delete').disabled = !p;
    const info = $('#profile-info');
    if (!p) { info.replaceChildren(h('span', { class: 'muted' }, t('Es wird nur geprüft, ob die Dokumente wohlgeformtes XML sind. Legen Sie ein Profil mit XSD und/oder Schematron an, um gegen Regeln zu prüfen.'))); return; }
    const xsd = p.files.filter((f) => f.kind === 'xsd'), sch = p.files.filter((f) => f.kind === 'sch' || f.kind === 'xslt');
    info.replaceChildren(
      p.description ? h('p', { class: 'desc' }, p.description) : null,
      h('div', { class: 'chips' },
        h('span', { class: 'chip' }, t('{0} XSD-Datei(en)', xsd.length)),
        ...xsd.filter((f) => f.entry).map((f) => h('span', { class: 'chip entry', title: f.meta?.targetNamespace || '' }, '⟶ ', f.path)),
        h('span', { class: 'chip' }, t('{0} Schematron-Datei(en)', sch.length)),
        ...sch.filter((f) => f.entry).map((f) => h('span', { class: 'chip entry' }, '⟶ ', f.path)),
      ),
    );
    try { localStorage.setItem('xv.lastProfile', p.id); } catch {}
  }

  /* ---------- Profil-Editor ---------- */
  let draft = null;
  function openEditor(p) {
    draft = p ? JSON.parse(JSON.stringify(p)) : { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: '', description: '', files: [], created: new Date().toISOString() };
    $('#pe-title').textContent = t(p ? 'Profil bearbeiten' : 'Neues Prüfprofil');
    $('#pe-name').value = draft.name;
    $('#pe-desc').value = draft.description || '';
    $('#pe-msg').textContent = '';
    renderDraftFiles();
    $('#profile-dialog').showModal();
    $('#pe-name').focus();
  }
  async function addDraftFiles(list) {
    const nf = await filesToProfileFiles(list);
    stripCommonRoot(nf);
    const skipped = list.length - nf.length;
    for (const f of nf) {
      const i = draft.files.findIndex((x) => x.path === f.path);
      if (i >= 0) draft.files[i] = f; else draft.files.push(f);
    }
    detectEntries(draft.files);
    $('#pe-msg').textContent = t('{0} Datei(en) übernommen', nf.length) + (skipped > 0 ? t(', {0} ignoriert (nur .xsd, .sch, .xsl, .xslt, .xml)', skipped) : '') + '.';
    renderDraftFiles();
  }
  function renderDraftFiles() {
    const tb = $('#pe-files');
    const files = [...draft.files].sort((a, b) => (b.entry - a.entry) || a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
    const label = { xsd: 'XSD', sch: 'Schematron', xslt: 'Schematron (XSLT)', other: t('Hilfsdatei') };
    tb.replaceChildren(...(files.length ? files.map((f) => h('tr', {},
      h('td', {}, h('input', { type: 'checkbox', checked: f.entry, disabled: f.kind === 'other', title: t('Einstiegspunkt: wird direkt zur Prüfung verwendet'), onchange: (e) => { f.entry = e.target.checked; f.entryManual = true; renderDraftFiles(); } })),
      h('td', { class: 'path' }, f.path, f.kind === 'xsd' && f.meta ? h('div', { class: 'muted small' }, f.meta.targetNamespace || t('(ohne Ziel-Namensraum)')) : null),
      h('td', {}, h('span', { class: `kind k-${f.kind}` }, label[f.kind])),
      h('td', { class: 'num' }, fmtBytes(f.size || f.content.length)),
      h('td', {}, h('button', { class: 'icon-btn', title: t('Entfernen'), onclick: () => { draft.files = draft.files.filter((x) => x !== f); detectEntries(draft.files); renderDraftFiles(); } }, '✕')),
    )) : [h('tr', {}, h('td', { colspan: 5, class: 'muted center' }, t('Noch keine Dateien. Ziehen Sie Dateien oder ganze Ordner hierher.')))]));
    const n = draft.files.filter((f) => f.entry).length;
    $('#pe-entries').textContent = t('{0} Einstiegspunkt(e) gewählt. Weitere Dateien werden über include/import eingebunden.', n);
  }
  async function saveDraft() {
    draft.name = $('#pe-name').value.trim();
    draft.description = $('#pe-desc').value.trim();
    if (!draft.name) { $('#pe-msg').textContent = t('Bitte einen Namen vergeben.'); $('#pe-name').focus(); return false; }
    if (!draft.files.some((f) => f.entry)) { $('#pe-msg').textContent = t('Bitte mindestens eine Datei als Einstiegspunkt markieren.'); return false; }
    // Schematron vorab kompilieren, um Fehler sofort zu zeigen
    const fm = new Map(draft.files.map((f) => [f.path, f.content]));
    const notes = [];
    for (const f of draft.files.filter((x) => x.kind === 'sch' && x.entry)) {
      try {
        const c = E.compileSchematron(f.path, fm);
        notes.push(t('{0}: {1} Patterns, {2} Regeln, {3} Prüfungen', f.path, c.stats.patterns, c.stats.rules, c.stats.asserts) + `${c.queryBinding !== 'xslt' && c.queryBinding !== 'xslt2' && c.queryBinding !== 'xslt3' && c.queryBinding !== 'xpath2' && c.queryBinding !== 'xpath31' ? ` (queryBinding „${c.queryBinding}“)` : ''}`);
        c.warnings.forEach((w) => notes.push('⚠ ' + w));
      } catch (e) { $('#pe-msg').textContent = t('Fehler: {0}', e.message); return false; }
    }
    draft.updated = new Date().toISOString();
    await Store.put(draft);
    state.profileId = draft.id;
    state.compiled.clear();
    await loadProfiles();
    toast(t('Profil „{0}“ gespeichert', draft.name) + (Store.persistent ? '' : t(' (nur für diese Sitzung – Browser-Speicher nicht verfügbar)')) + '.' + (notes.length ? '\n' + notes.join('\n') : ''));
    return true;
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const safeName = (s) => s.replace(/[^\w.\-äöüÄÖÜß]+/g, '_').replace(/^_+|_+$/g, '') || 'datei';

  function exportProfile() {
    const p = currentProfile(); if (!p) return;
    download(`${safeName(p.name)}.xvprofile.json`, JSON.stringify({ format: 'xml-validator-profile', version: 1, ...p }, null, 1), 'application/json');
  }
  async function importProfile(file) {
    try {
      const j = JSON.parse(await file.text());
      if (j.format !== 'xml-validator-profile' || !Array.isArray(j.files)) throw new Error(t('Keine Profildatei'));
      const p = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: j.name, description: j.description || '', files: j.files.map((f) => ({ path: f.path, kind: f.kind, content: f.content, size: f.size, meta: f.kind === 'xsd' ? E.xsdMeta(f.content) : null, entry: !!f.entry, entryManual: !!f.entryManual })), created: j.created, updated: new Date().toISOString() };
      if (state.profiles.some((x) => x.name === p.name)) p.name += t(' (Import)');
      await Store.put(p); state.profileId = p.id; await loadProfiles();
      toast(t('Profil „{0}“ importiert.', p.name));
    } catch (e) { toast(t('Import fehlgeschlagen: {0}', e.message), true); }
  }

  /* -------------------------------------------------------------------
   * Prüfdokumente
   * ----------------------------------------------------------------- */
  async function addDocs(list) {
    for (const { path, file } of list) {
      if (/(^|\/)\./.test(path)) continue;
      state.docs.push({ name: path, bytes: await readBytes(file) });
    }
    renderDocs();
  }
  function renderDocs() {
    const ul = $('#doc-list');
    ul.replaceChildren(...state.docs.map((d, i) => h('li', {},
      h('span', { class: 'doc-name' }, d.name), h('span', { class: 'muted small' }, fmtBytes(d.bytes.length)),
      h('button', { class: 'icon-btn', title: t('Entfernen'), onclick: () => { state.docs.splice(i, 1); renderDocs(); } }, '✕'))));
    $('#doc-empty').hidden = state.docs.length > 0;
    updateRunButton();
  }
  function updateRunButton() {
    const pasted = $('#paste').value.trim();
    const mode = $('.tab.active').dataset.tab;
    $('#btn-run').disabled = mode === 'files' ? !state.docs.length : !pasted;
  }

  /* -------------------------------------------------------------------
   * Validierung
   * ----------------------------------------------------------------- */
  async function run() {
    const mode = $('.tab.active').dataset.tab;
    const inputs = mode === 'files' ? state.docs : [{ name: t('Eingefügter Text'), bytes: new TextEncoder().encode($('#paste').value), fromText: true }];
    if (!inputs.length) return;
    const profile = currentProfile();
    const btn = $('#btn-run');
    btn.disabled = true;
    const status = $('#run-status');
    state.reports = [];
    renderReports();
    try {
      for (let i = 0; i < inputs.length; i++) {
        const pre = inputs.length > 1 ? `[${i + 1}/${inputs.length}] ${inputs[i].name}: ` : '';
        status.textContent = pre + t('Starte …');
        const r = await E.validateDocument(inputs[i], profile, { compiledCache: state.compiled, onProgress: (m) => (status.textContent = pre + m) });
        state.reports.push(r);
        renderReports();
      }
      status.textContent = t('Fertig: {0} Dokument(e) geprüft.', inputs.length);
    } catch (e) {
      console.error(e);
      status.textContent = '';
      toast(t('Prüfung abgebrochen: {0}', e.message || e), true);
    } finally {
      btn.disabled = false; updateRunButton();
    }
    $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* -------------------------------------------------------------------
   * Bericht
   * ----------------------------------------------------------------- */
  function excerpt(r, line) {
    if (!line || !r.lines) return null;
    const from = Math.max(1, line - 3), to = Math.min(r.lines.length, line + 3);
    const rows = [];
    for (let n = from; n <= to; n++) {
      let t = r.lines[n - 1];
      if (t.length > 400) t = t.slice(0, 400) + ' …';
      rows.push(h('div', { class: 'src-line' + (n === line ? ' hit' : '') }, h('span', { class: 'ln' }, n), h('span', { class: 'code' }, t || ' ')));
    }
    return h('div', { class: 'src' }, rows);
  }

  function renderReports() {
    const box = $('#results');
    $('#results-head').hidden = !state.reports.length;
    const total = state.reports.reduce((a, r) => ({ e: a.e + r.counts.error, w: a.w + r.counts.warning, i: a.i + r.counts.info, f: a.f + (r.result === 'FAILURE') }), { e: 0, w: 0, i: 0, f: 0 });
    $('#summary-all').textContent = state.reports.length > 1 ? t('{0} Dokumente · {1} gültig · {2} ungültig · {3} Fehler · {4} Warnungen', state.reports.length, state.reports.length - total.f, total.f, total.e, total.w) : '';
    box.replaceChildren(...state.reports.map((r, idx) => renderReport(r, idx, state.reports.length === 1 || r.result === 'FAILURE')));
  }

  function renderReport(r, idx, open) {
    const f = state.filter;
    const q = f.q.toLowerCase();
    const visible = r.items.filter((i) => f[i.severity] && (!q || `${i.message} ${i.id} ${i.location} ${i.test}`.toLowerCase().includes(q)));
    const list = h('ol', { class: 'items' }, visible.slice(0, 2000).map((i) => {
      const li = h('li', { class: `item sev-${i.severity}` },
        h('div', { class: 'item-head' },
          h('span', { class: `sev ${i.severity}`, title: t(SEV_HELP[i.severity]) }, t(SEV[i.severity])),
          h('span', { class: 'src-tag' }, t(i.source)),
          i.id ? h('code', { class: 'rule-id' }, i.id) : null,
          i.line ? h('span', { class: 'line' }, t('Zeile {0}', i.line + (i.column ? `:${i.column}` : ''))) : null,
        ),
        h('div', { class: 'msg' }, i.message),
        i.location ? h('div', { class: 'loc' }, i.location) : null,
      );
      const det = h('details', { class: 'more' }, h('summary', {}, t('Details')),
        i.test ? h('div', {}, h('b', {}, t('Test: ')), h('code', {}, i.test)) : null,
        i.schema || i.file ? h('div', {}, h('b', {}, t('Regelwerk: ')), i.file || i.schema) : null,
        i.context ? h('div', {}, h('b', {}, t('Kontext: ')), h('code', {}, i.context)) : null,
      );
      det.addEventListener('toggle', () => { if (det.open && !det.dataset.done) { det.dataset.done = 1; const x = excerpt(r, i.line); if (x) det.append(x); } }, { once: false });
      if (i.line || i.test || i.schema) li.append(det);
      return li;
    }));
    const more = visible.length > 2000 ? h('p', { class: 'muted' }, t('… {0} weitere Befunde – vollständige Liste im Export.', visible.length - 2000)) : null;
    const stepChips = r.steps.map((s) => h('span', { class: 'step ' + (s.ok ? 'ok' : 'bad') }, s.ok ? '✓ ' : '✗ ', s.name));
    const details = h('details', { class: `report res-${r.result}`, open },
      h('summary', {},
        h('span', { class: `result r-${r.result}`, title: t(RESULT_HELP[r.result]) }, t(RESULT[r.result])),
        h('span', { class: 'rep-name' }, r.fileName),
        h('span', { class: 'counts' },
          h('span', { class: 'c error' }, t('{0} Fehler', r.counts.error)),
          h('span', { class: 'c warning' }, t('{0} Warnungen', r.counts.warning)),
          h('span', { class: 'c info' }, t('{0} Infos', r.counts.info))),
      ),
      h('div', { class: 'rep-body' },
        h('dl', { class: 'meta' },
          h('dt', {}, t('Profil')), h('dd', {}, r.profile),
          h('dt', {}, t('Geprüft')), h('dd', {}, r.date.toLocaleString(I18N.lang === 'en' ? 'en-GB' : 'de-DE')),
          h('dt', {}, t('Größe')), h('dd', {}, t('{0} · {1} Zeilen · {2} ms', fmtBytes(r.size), r.lines.length, r.durationMs)),
          r.sha256 ? h('dt', {}, 'SHA-256') : null, r.sha256 ? h('dd', { class: 'hash' }, r.sha256) : null,
        ),
        h('div', { class: 'steps' }, stepChips),
        r.notes.length ? h('ul', { class: 'notes' }, r.notes.map((n) => h('li', {}, n))) : null,
        h('div', { class: 'rep-actions no-print' },
          h('button', { class: 'btn small', onclick: () => download(`${safeName(r.fileName)}.report.xml`, E.toTarXml(r), 'application/xml') }, t('Bericht als XML (TAR)')),
          h('button', { class: 'btn small', onclick: () => download(`${safeName(r.fileName)}.report.csv`, E.toCsv(r), 'text/csv') }, t('Als CSV')),
        ),
        r.items.length ? list : h('p', { class: 'all-good' }, t('Keine Befunde. Das Dokument erfüllt alle Prüfungen des Profils.')),
        more,
      ),
    );
    return details;
  }

  /* -------------------------------------------------------------------
   * Toast
   * ----------------------------------------------------------------- */
  let toastTimer;
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), isErr ? 9000 : 6000);
  }

  /* -------------------------------------------------------------------
   * Verdrahtung
   * ----------------------------------------------------------------- */
  /* ---------- Sprache & Theme (nur Komfort-Einstellungen in localStorage) ---------- */
  const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
  function applyLang(lang) {
    I18N.lang = lang;
    document.documentElement.lang = lang;
    for (const a of ['title', 'placeholder']) for (const el of $$(`[data-en-${a}]`)) {
      if (el.dataset['de' + a] === undefined) el.dataset['de' + a] = el.getAttribute(a) || '';
      el.setAttribute(a, lang === 'en' ? el.getAttribute(`data-en-${a}`) : el.dataset['de' + a]);
    }
    $('#btn-delete').textContent = t('Löschen');
    if (draft) $('#pe-title').textContent = t(state.profiles.some((p) => p.id === draft.id) ? 'Profil bearbeiten' : 'Neues Prüfprofil');
    if ($('#store-note').textContent) $('#store-note').textContent = t('Hinweis: Browser-Speicher nicht verfügbar – Profile gelten nur für diese Sitzung. Nutzen Sie Export/Import.');
    renderNetBadge(); renderProfiles(); renderDocs(); renderReports(); // ponytail: Befundtexte aus der Engine bleiben in der Sprache zum Prüfzeitpunkt
  }
  function applyTheme(theme) {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
  }
  const effectiveTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  async function init() {
    applyTheme(pref('xv.theme'));
    applyLang(pref('xv.lang') || (/^de/i.test(navigator.language || 'de') ? 'de' : 'en'));
    $('#btn-lang').addEventListener('click', () => { const l = I18N.lang === 'de' ? 'en' : 'de'; pref('xv.lang', l); applyLang(l); });
    $('#btn-theme').addEventListener('click', () => { const th = effectiveTheme() === 'dark' ? 'light' : 'dark'; pref('xv.theme', th); applyTheme(th); });
    // Speicher öffnen, aber nie länger als 3 s auf ihn warten (sonst wäre die Oberfläche tot)
    await Promise.race([Store.open(), new Promise((r) => setTimeout(r, 3000))]);
    if (!Store.persistent) $('#store-note').textContent = t('Hinweis: Browser-Speicher nicht verfügbar – Profile gelten nur für diese Sitzung. Nutzen Sie Export/Import.');
    await loadProfiles();

    $('#profile-select').addEventListener('change', (e) => { state.profileId = e.target.value; renderProfiles(); });
    $('#btn-new').addEventListener('click', () => openEditor(null));
    $('#btn-edit').addEventListener('click', () => openEditor(currentProfile()));
    $('#btn-export').addEventListener('click', exportProfile);
    $('#btn-import').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) importProfile(e.target.files[0]); e.target.value = ''; });
    $('#btn-delete').addEventListener('click', () => {
      const p = currentProfile(); if (!p) return;
      const b = $('#btn-delete');
      if (b.dataset.confirm) { Store.del(p.id).then(() => { state.profileId = ''; loadProfiles(); toast(t('Profil „{0}“ gelöscht.', p.name)); }); delete b.dataset.confirm; b.textContent = t('Löschen'); return; }
      b.dataset.confirm = 1; b.textContent = t('Wirklich löschen?');
      setTimeout(() => { delete b.dataset.confirm; b.textContent = t('Löschen'); }, 4000);
    });

    // Editor
    setupDrop($('#pe-drop'), addDraftFiles);
    $('#pe-pick-files').addEventListener('click', () => $('#pe-files-input').click());
    $('#pe-pick-dir').addEventListener('click', () => $('#pe-dir-input').click());
    $('#pe-files-input').addEventListener('change', (e) => { addDraftFiles(fromInput(e.target)); e.target.value = ''; });
    $('#pe-dir-input').addEventListener('change', (e) => { addDraftFiles(fromInput(e.target)); e.target.value = ''; });
    $('#pe-save').addEventListener('click', async () => { if (await saveDraft()) $('#profile-dialog').close(); });
    $('#pe-cancel').addEventListener('click', () => $('#profile-dialog').close());

    // Dokumente
    setupDrop($('#doc-drop'), addDocs);
    $('#doc-pick').addEventListener('click', () => $('#doc-input').click());
    $('#doc-input').addEventListener('change', (e) => { addDocs(fromInput(e.target)); e.target.value = ''; });
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      $$('.tab').forEach((x) => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
      $$('.tab-panel').forEach((p) => (p.hidden = p.id !== 'panel-' + t.dataset.tab));
      updateRunButton();
    }));
    $('#paste').addEventListener('input', updateRunButton);
    $('#btn-run').addEventListener('click', run);
    $('#btn-clear').addEventListener('click', () => {
      state.docs = []; state.reports = []; $('#paste').value = ''; $('#run-status').textContent = '';
      renderDocs(); renderReports(); toast(t('Alle Dokumente und Berichte wurden aus dem Speicher entfernt.'));
    });

    // Filter
    $$('.flt').forEach((c) => c.addEventListener('change', () => { state.filter[c.value] = c.checked; renderReports(); }));
    let qt; $('#flt-q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { state.filter.q = e.target.value; renderReports(); }, 200); });
    $('#btn-print').addEventListener('click', () => { $$('#results details.report').forEach((d) => (d.open = true)); window.print(); });

    renderDocs();
  }

  // Für automatisierte Tests
  window.XV = { state, Store, validate: (doc, profile) => E.validateDocument(doc, profile, { compiledCache: new Map() }), detectEntries, filesToProfileFiles };
  window.addEventListener('unhandledrejection', (e) => toast(t('Fehler: {0}', e.reason?.message || e.reason), true));
  window.addEventListener('error', (e) => toast(t('Fehler: {0}', e.message), true));
  init().catch((e) => toast(t('Start fehlgeschlagen: {0}', e.message || e), true));
})();
