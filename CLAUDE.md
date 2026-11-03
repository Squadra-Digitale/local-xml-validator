# XML-Validator – Hinweise für LLMs / Agenten

## Zweck & harte Anforderungen
Lokaler XML-Validator (XSD + Schematron), angelehnt an github.com/ISAITB/xml-validator. Prüft **kundensensible** XMLs.
Endnutzerin ist **technisch unerfahren** → UI-Texte deutsch, einfach, mit `title`-Tooltips.

Nicht verhandelbar:
1. **Eine einzige HTML-Datei** (`XML-Validator.html`), per Doppelklick über `file://` in Chrome lauffähig. Kein Server, keine Installation.
2. **Kein Netzwerk.** Die CSP in `src/template.html` (`default-src 'none'; connect-src 'none'` …) bleibt unverändert. Keine CDNs, keine externen Fonts, kein fetch nach außen. Neue Bibliotheken werden inline eingebettet.
3. **Prüfdokumente nie persistieren** (kein localStorage/IndexedDB/Download ohne Klick). Gespeichert werden nur Profile (Schemadateien) in IndexedDB.
4. Wenn etwas nicht ausgewertet werden kann, erscheint es als sichtbare Warnung „nicht auswertbar“. **Nie still als gültig durchwinken.**

## Aufbau
```
src/template.html   Markup + CSS + CSP; Platzhalter %%XMLLINT%% %%WASM%% %%SAXON%% %%ENGINE%% %%APP%% %%LICENSES%%
src/engine.js       Prüflogik, exportiert window.XVEngine
src/app.js          UI (Profile, Drag&Drop, Bericht), exportiert window.XV (für Tests)
vendor/             SaxonJS2.js 2.7 (Browser-Build von saxonica.com), xmllint-browser.mjs + xmllint.wasm (npm xmllint-wasm 5.3.0), Lizenzen
build.mjs           setzt alles inline zusammen → XML-Validator.html (~3,4 MB)
testdaten/          EN16931-UBL 1.3.13 (schematron/ + examples/) + TEST_absichtlich_fehlerhaft.xml
```
**`XML-Validator.html` ist generiert. Ändern Sie nur `src/` und führen Sie danach `node build.mjs` aus.**

## Prüfablauf (`validateDocument` in engine.js)
1. SHA-256 berechnen, Encoding erkennen (BOM / XML-Deklaration).
2. **xmllint (libxml2 WASM) im Blob-Worker:** Wohlgeformtheit, und wenn ein passendes XSD da ist, auch XSD. Argumente: `--noout --nonet`; die Dateien liegen im virtuellen FS unter `dokument.xml` und `schema/<pfad>`.
   - Welches XSD verwendet wird, folgt aus den Einstiegs-XSDs, deren `targetNamespace` und globales Element zum Wurzelelement passen.
   - `schemaLocation="http…/x.xsd"` wird auf eine gleichnamige Profildatei umgeschrieben.
   - Die Ausgabe auf stderr wertet `parseXmllintOutput` aus.
3. **Schematron `.sch`:** `compileSchematron` macht daraus eine interne Struktur, `runSchematron` wertet sie über `SaxonJS.XPath.evaluate` aus (XPath 3.1).
   - Unterstützt: `include` (auch mit #id), abstrakte Patterns/`is-a`/`param` (Textersetzung längster Name zuerst, wie im ISO-Skeleton), abstrakte Regeln/`extends`, `let` (global/Phase/Pattern/Regel → XPath-`let`-Klausel; globale über `root(.) ! (…)`), Phasen (defaultPhase), `value-of`, `name`, diagnostics, flag/role → Schweregrad.
   - Regel-Kontext: `//(ctx)`; pro Pattern feuert jeder Knoten nur in der ersten passenden Regel.
   - Schnellpfad: ein XPath-Aufruf pro Regel für alle Knoten. Im Fehlerfall wird pro Knoten einzeln ausgewertet. Statische Fehler (XPST…) markieren die betroffene Prüfung als „broken“.
4. **Schematron `.xsl/.xslt`:** nur XSLT 1.0 über den nativen `XSLTProcessor`, das Ergebnis (SVRL) wird ausgewertet. Für XSLT ≥ 2 kommt eine Fehlermeldung.
5. Ergebnis: `SUCCESS` / `WARNING` / `FAILURE`. Export als GITB-TAR-XML (`toTarXml`) und CSV.

## Sprache (DE/EN) & Dark Mode
- **Statische Texte im Template:** doppelt als `<span lang="de">…</span><span lang="en">…</span>`. CSS (`:root[lang=..] [lang=..]`) blendet die andere Sprache aus. Tooltips und Platzhalter: `title`/`placeholder` deutsch, englisch in `data-en-title`/`data-en-placeholder`; `applyLang` tauscht sie.
- **Dynamische Texte:** `t('Deutscher Text {0}', x)`. Das Wörterbuch `I18N.en` steht oben in `engine.js`, der deutsche Text ist der Schlüssel. **Jeder neue UI-Text braucht einen Eintrag**, sonst bleibt er deutsch.
- `i.source` und `step.name` bleiben intern deutsch, weil die Logik damit vergleicht. Übersetzt wird erst bei der Anzeige mit `t(i.source)`.
- Befundtexte der Engine bleiben in der Sprache, die beim Prüfen aktiv war.
- **Theme:** `data-theme="light|dark"` auf `<html>`, sonst gilt `prefers-color-scheme`. Die Dark-Tokens stehen doppelt im CSS (Media-Query + `[data-theme=dark]`).
- Sprache und Theme liegen in `localStorage` (`xv.lang`, `xv.theme`); das sind reine Komfort-Einstellungen.

## Fallstricke (bereits gelöst – nicht wieder einbauen)
- **xmllint-Glue wird beim Laden gepatcht** (`Xmllint.init`): `wasmBinary` wird direkt übergeben, `import.meta.url` entfernt. Beim Aktualisieren von xmllint-wasm prüfen, ob die Patch-Stellen noch existieren; `build.mjs` bricht sonst ab.
- **Drag & Drop auf `file://`:** Chrome blockiert dort teils das Auslesen von Ordnern. `captureDrop` muss `dt.items`/Handles **synchron** im drop-Event abgreifen. Danach gibt es drei Fallbacks: Handles → webkitGetAsEntry → flache Dateien. Der Button „Ordner …“ (`webkitdirectory`) funktioniert immer.
- **SaxonJS-Parameter:** JS-Arrays können als XDM-Array ankommen. Daher `if ($__nodes instance of array(*)) then $__nodes?* else $__nodes`.
- Inline-Skripte dürfen kein `</script` enthalten (`build.mjs` prüft das).
- SaxonJS im Browser kann **kein XSLT zur Laufzeit kompilieren**. Deshalb gibt es die eigene Schematron-Engine statt Skeleton-XSLT.
- `BIS3_Invoice_negativ.XML` ist **gültig** („negativ“ = negative Beträge). Es taugt nicht als Fehlertest.

## Testen
- Logik ohne Browser: `node --check src/*.js`. Reine Funktionen (`startTagLines`, `Paths`, `parseXmllintOutput`) lassen sich in Node mit `globalThis.window={}` laden und testen.
- **Headless Chrome und das Ausführen der Vendor-Bibliotheken in Node waren in der Claude-Code-Sandbox blockiert.** Deshalb testet die Nutzerin bzw. der Nutzer im echten Chrome. Ablauf: Profil aus `testdaten/schematron` anlegen, dann prüfen.
  - `ubl-tc434-example1.xml` → Gültig.
  - `TEST_absichtlich_fehlerhaft.xml` → Ungültig mit BR-03, BR-CL-14, BR-CO-10, BR-CO-13 (bestätigt am 2026-11-03).
- In der Seite gibt es `window.XV.validate({name, bytes}, profile)` für automatisierte Tests.

## Bekannte Grenzen / mögliche nächste Schritte
- Nicht unterstützt in `.sch`: `xsl:function` (z. B. Peppol BIS: `u:mod11` …), `xsl:key`, `document()`. Eine Idee wäre, einfache `xsl:function`s in XPath-Inline-Funktionen zu übersetzen, als `let $u:f := function(...){...}`. Rekursion wäre dabei schwierig.
- Vorkompiliertes Schematron-XSLT 2/3 wird nicht unterstützt. Die Lösung ist, die `.sch`-Quelle zu nutzen.
- Kein ZIP-Import für Profile; Ordner werden per Button gewählt.
- Kandidaten zum Entfernen, falls Vereinfachung gewünscht ist: der XSLT-1.0-Pfad und der CSV-Export.

## Arbeitsstil (Wunsch der Nutzerin bzw. des Nutzers)
- Minimal-Lösungen bevorzugen (Plattform-Features vor Code, keine neuen Abhängigkeiten). Antworten auf Deutsch.
- Nach jeder Änderung: `node build.mjs`. Dann ehrlich sagen, was im Browser getestet ist und was nicht.
