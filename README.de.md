# XML-Validator: offline, eine einzige HTML-Datei

[English](README.md) · **Deutsch**

Prüft XML-Dokumente gegen **XSD** und **Schematron**, komplett im Browser. Es gibt keinen Server, keine Installation und keinen Netzwerkzugriff. Damit eignet sich das Werkzeug für Dokumente, die den Rechner nicht verlassen dürfen (Kundendaten, E-Rechnungen und Ähnliches).

Angelehnt an den [ITB XML Validator](https://github.com/ISAITB/xml-validator): Prüfprofile kombinieren XSD und Schematron, Berichte lassen sich im GITB-TAR-Format exportieren. Anders als beim ITB läuft alles clientseitig aus einer einzigen, eigenständigen Datei.

> Die Oberfläche gibt es auf Deutsch und Englisch, jeweils mit hellem und dunklem Modus. Umschalten lässt sich beides oben rechts.

## Schnellstart
1. **`XML-Validator.html`** herunterladen.
2. In Chrome, Edge oder Firefox öffnen (Doppelklick oder *Öffnen mit …*).
3. Ein Profil anlegen (*Neues Profil*) und XSD- und/oder `.sch`-Dateien hinzufügen. Am besten ganze Ordner, damit `include`/`import` funktionieren. Alternativ ein erhaltenes Profil importieren (*Importieren*, `*.xvprofile.json`).
4. XML-Dateien hineinziehen und auf **Prüfen** klicken.

## Datenschutz & Sicherheit
- **Netzwerk technisch gesperrt.** Eine Content-Security-Policy (`default-src 'none'; connect-src 'none'`) verhindert jede ausgehende Verbindung. Eine Plakette im Kopfbereich bestätigt das per Selbsttest.
- Geprüfte Dokumente werden **nur im Arbeitsspeicher** verarbeitet. Sie werden nie gespeichert und nie übertragen. Schließen des Tabs verwirft sie.
- Gespeichert werden nur Profile (Schemadateien), in der IndexedDB des Browsers.
- Externe Entitäten und DTDs werden nicht nachgeladen (`--nonet`, kein Entity-Expand).

## Funktionen
- **Wohlgeformtheit und XSD 1.0** über libxml2 (xmllint als WebAssembly) in einem Web Worker.
- **Automatische XSD-Auswahl:** Für jedes Dokument wird das Einstiegs-Schema gewählt, das zum Wurzelelement passt (Namensraum und Elementname). Ein kompletter UBL-Schema-Ordner funktioniert daher direkt.
- Remote-`schemaLocation`-URLs werden auf gleichnamige Dateien im Profil umgeleitet.
- **ISO-Schematron (`.sch`)** mit eigener Engine auf Basis von **XPath 3.1** (SaxonJS). Unterstützt:
  - `include`, abstrakte Patterns, `is-a` mit `param`
  - abstrakte Regeln mit `extends`
  - `let` auf Schema-, Phasen-, Pattern- und Regelebene
  - Phasen
  - `value-of`, `name`, diagnostics
  - Schweregrad aus `flag`/`role`
  - Funktioniert mit den offiziellen [EN-16931](https://github.com/ConnectingEurope/eInvoicing-EN16931)-Regeln, der Grundlage von XRechnung.
- **Vorkompiliertes Schematron-XSLT 1.0** über den nativen `XSLTProcessor` des Browsers.
- **Berichte:**
  - Befunde zeigen Schweregrad, Regel-ID, Zeilennummer, XPath, einen Quelltextausschnitt und den SHA-256-Hash des Dokuments.
  - Befunde lassen sich filtern und durchsuchen.
  - Export als GITB-TAR-XML oder CSV, Drucken bzw. Speichern als PDF.
- **Stapelprüfung** mehrerer Dateien.
- **Profil-Export/-Import**, um Regelwerke mit Kolleg:innen zu teilen.

## Einschränkungen
- In `.sch` nicht unterstützt:
  - `xsl:function` (z. B. in Peppol BIS)
  - `xsl:key`
  - `document()`
- Vorkompiliertes Schematron in XSLT 2.0/3.0 wird nicht unterstützt, weil SaxonJS im Browser keine Stylesheets zur Laufzeit kompilieren kann. Stattdessen die `.sch`-Quelle verwenden.
- Prüfungen, die nicht ausgewertet werden können, erscheinen als Warnung „nicht auswertbar“, und der Bericht wird als unvollständig markiert. Sie gelten nie stillschweigend als bestanden.

## Bauen
```sh
node build.mjs   # setzt src/ + vendor/ inline zu XML-Validator.html zusammen
```
| Pfad | Inhalt |
|---|---|
| `src/template.html` | Markup, CSS, CSP und Platzhalter für die eingebetteten Teile |
| `src/engine.js` | Prüflogik (xmllint-Worker, Schematron-Compiler/-Auswertung, Berichtsexport) und Übersetzungen (`t()`) |
| `src/app.js` | Oberfläche: Profile, Dateieingabe, Berichtsdarstellung, Sprache/Theme |
| `vendor/` | SaxonJS 2.7 (Browser-Build), xmllint-wasm 5.3.0 (`xmllint-browser.mjs`, `xmllint.wasm`), Lizenzen |
| `testdaten/` | EN-16931-UBL-1.3.13-Regeln und Beispiele, dazu `TEST_absichtlich_fehlerhaft.xml` (absichtlich ungültig) |

`XML-Validator.html` wird erzeugt. Bearbeitet wird `src/`, danach neu bauen.

### Testen
1. Ein Profil aus `testdaten/schematron` anlegen.
2. `testdaten/examples/ubl-tc434-example1.xml` prüfen. Erwartetes Ergebnis: gültig.
3. `testdaten/examples/TEST_absichtlich_fehlerhaft.xml` prüfen. Erwartetes Ergebnis: ungültig, mit BR-03, BR-CL-14, BR-CO-10 und BR-CO-13.

Hinweis: `BIS3_Invoice_negativ.XML` ist *gültig*. „negativ“ bezieht sich auf negative Beträge, nicht auf ein fehlerhaftes Beispiel.

## Komponenten von Drittanbietern & Lizenzen
- **SaxonJS 2.7** © Saxonica Ltd. Weitergegeben in unveränderter Binärform unter der [Saxonica-Lizenz](vendor/LICENSE-SaxonJS.txt).
- **xmllint-wasm / libxml2**: MIT, siehe [Lizenz](vendor/LICENSE-xmllint-wasm.txt).
- **EN-16931-Validierungsartefakte** (in `testdaten/`): © Europäische Kommission, EUPL 1.2.

Die Lizenztexte sind auch in der HTML-Datei eingebettet, unter *Über dieses Werkzeug*.
