# XML Validator: offline, single HTML file

**English** · [Deutsch](README.de.md)

Validate XML documents against **XSD** and **Schematron** entirely in your browser. There is no server, nothing to install, and no network access, so it is built for documents that must not leave the machine (customer data, e-invoices, and similar).

Inspired by the [ITB XML Validator](https://github.com/ISAITB/xml-validator): validation profiles combine XSD and Schematron, and reports can be exported in GITB TAR format. Unlike ITB, everything runs client-side from one self-contained file.

> The interface is available in German and English, with light and dark mode. Use the toggles in the header.

## Quick start
1. Download **`XML-Validator.html`**.
2. Open it in Chrome, Edge or Firefox (double-click, or *Open with…*).
3. Create a profile (*Neues Profil*) by adding your XSD and/or `.sch` files. Adding whole folders works best because it keeps `include`/`import` working. You can also import a shared profile (*Importieren*, `*.xvprofile.json`).
4. Drop XML files and click **Prüfen** (validate).

## Privacy & security
- **Network is technically blocked.** A Content Security Policy (`default-src 'none'; connect-src 'none'`) prevents all outgoing connections. A self-test badge in the header confirms it at runtime.
- Documents under validation are processed **in memory only**. They are never stored or sent anywhere. Closing the tab discards them.
- Only profiles (schema files) are persisted, in the browser's IndexedDB.
- External entities and DTDs are not loaded (`--nonet`, no entity expansion).

## Features
- **Well-formedness and XSD 1.0** via libxml2 (xmllint compiled to WebAssembly) running in a Web Worker.
- **Automatic XSD selection:** for each document, the profile's entry schema matching the root element (namespace and element name) is used. A full UBL schema folder therefore works out of the box.
- Remote `schemaLocation` URLs are mapped to files of the same name inside the profile.
- **ISO Schematron (`.sch`)** with a custom engine on top of **XPath 3.1** (SaxonJS). Supported:
  - `include`, abstract patterns, `is-a` with `param`
  - abstract rules with `extends`
  - `let` at schema, phase, pattern and rule level
  - phases
  - `value-of`, `name`, diagnostics
  - severity derived from `flag`/`role`
  - Works with the official [EN 16931](https://github.com/ConnectingEurope/eInvoicing-EN16931) rules, which are the basis of XRechnung.
- **Precompiled Schematron XSLT 1.0** via the browser's native `XSLTProcessor`.
- **Reports:**
  - Results show severity, rule ID, line number, XPath, a source excerpt and the document's SHA-256 hash.
  - Filter and search the findings.
  - Export as GITB TAR XML or CSV, or print / save as PDF.
- **Batch validation** of multiple files.
- **Profile export/import** for sharing rule sets with colleagues.

## Limitations
- Not supported inside `.sch`:
  - `xsl:function` (e.g. used by Peppol BIS)
  - `xsl:key`
  - `document()`
- Precompiled Schematron in XSLT 2.0/3.0 is not supported, because SaxonJS cannot compile stylesheets at runtime in the browser. Use the `.sch` source instead.
- Checks that cannot be evaluated are reported as a warning ("nicht auswertbar") and the report is flagged as incomplete. They are never silently treated as passed.

## Building
```sh
node build.mjs   # inlines src/ + vendor/ into XML-Validator.html
```
| Path | Content |
|---|---|
| `src/template.html` | Markup, CSS, CSP, and placeholders for the inlined parts |
| `src/engine.js` | Validation logic: xmllint worker, Schematron compiler/evaluator, report export |
| `src/app.js` | User interface: profiles, file input, report rendering |
| `vendor/` | SaxonJS 2.7 (browser build), xmllint-wasm 5.3.0 (`xmllint-browser.mjs`, `xmllint.wasm`), licenses |
| `testdaten/` | EN 16931 UBL 1.3.13 rules and examples, plus `TEST_absichtlich_fehlerhaft.xml` (deliberately invalid) |

`XML-Validator.html` is a build artifact. Edit `src/` and rebuild.

### Testing
1. Create a profile from `testdaten/schematron`.
2. Validate `testdaten/examples/ubl-tc434-example1.xml`. Expected result: valid.
3. Validate `testdaten/examples/TEST_absichtlich_fehlerhaft.xml`. Expected result: invalid, with BR-03, BR-CL-14, BR-CO-10 and BR-CO-13.

Note: `BIS3_Invoice_negativ.XML` is *valid*. "negativ" refers to negative amounts, not to an invalid sample.

## Third-party components & licenses
- **SaxonJS 2.7** © Saxonica Ltd. Redistributed in unmodified binary form under the [Saxonica license](vendor/LICENSE-SaxonJS.txt).
- **xmllint-wasm / libxml2**: MIT, see [license](vendor/LICENSE-xmllint-wasm.txt).
- **EN 16931 validation artefacts** (in `testdaten/`): © European Commission, EUPL 1.2.

The license texts are also embedded in the HTML file, under *Über dieses Werkzeug*.
