# Lizenz- und Asset-Audit — ARCANUM

Stand: 2026-11-24 · Status: **OFFEN / keine Freigabe zur kommerziellen Veröffentlichung**

## Festgestellte Belege

| Bereich | Befund im Repository | Einordnung / To-do |
| --- | --- | --- |
| `LICENSE` | GNU General Public License, Version 2, June 1991 | Klären, ob die Rechteinhaber den gesamten eigenen Code tatsächlich unter GPL-2.0-only oder einer anderen Variante freigegeben haben. Der bloße Lizenztext definiert die Urheberangaben nicht automatisch. |
| `package.json` | `"license": "ISC"` | Widerspruch zur Lizenzdatei: bis zur Klärung **nicht** als ISC-freigegeben behandeln. |
| `vendor/three/three.min.js` | Three.js r128; Dateikopf SPDX-License-Identifier: MIT, Copyright Three.js Authors | Weitergabe- und Attribution-Pflichten prüfen; vollständigen Lizenztext/NOTICE der verwendeten Version beilegen. |
| `vendor/chart/chart.umd.js` | Chart.js v4.4.8; Dateikopf „Released under the MIT License“ | Weitergabe- und Attribution-Pflichten prüfen; Lizenztext/NOTICE beilegen. |
| Tailwind CSS | `tailwindcss: ^3.4.19` im Entwicklungswerkzeug | Paketlizenz der tatsächlich installierten Version dokumentieren; `package-lock.json` prüfen. |
| `js/cards.js`, `js/card-art.js`, `js/avatars.js`, `js/worlds.js`, `js/scene3d.js`, `css/`, HTML | Eigene Karten, SVG- und 3D-Assets laut Projektdokumentation prozedural | Urheberkette, Beitragende, Quellen, Lizenzkennzeichnungen und Marken-/Designrechte **nicht verifiziert**. |
| `docs/deck-preview.jpg` | Vorschaubild im Repository | Rechteinhaberschaft und Erzeugung aus dem eigenen Renderer dokumentieren. |
| Schriftarten, Audiomaterial, sonstige externe Assets | Keine positive Feststellung auf Grundlage dieser Stichprobe | Vollständige Inventur des Repositories erforderlich; auch nicht offensichtliche externe Ressourcen kontrollieren. |

## Verbindliche Freigabeschritte

1. **Rechtekette:** Datei-/Asset-Urheber, Mitwirkende, Entstehung, Fremdmaterial, Lizenzeinwilligungen und eventuelle Code-Generierung dokumentieren.
2. **Eigene Projektlizenz:** GPL-v2-vs.-ISC-Kollision schriftlich auflösen; alle erforderlichen Rechteinhaber einbeziehen. Keine eigenmächtige Umdeklaration per Paketmetadatum.
3. **Fremdkomponenten:** Exakte Version, SPDX-Kennung, Copyright- und NOTICE-Anforderungen, verwendete Distributionsform sowie Quellenlinks erfassen. Bei MIT-Komponenten die erforderlichen Lizenztexte erhalten.
4. **Kommerzielle Nutzung:** Shop, Bezahlfunktionen, proprietäre Erweiterungen und App-Store-Distribution erst nach Lizenz- und Rechtefreigabe.
5. **Zusätzlich erforderlich:** Datenschutz/DSGVO, Nutzungsbedingungen, Verbraucherschutz und ggf. Jugendschutz separat prüfen.

## Abgrenzung

GPL erlaubt grundsätzlich kommerzielle Nutzung und Verkauf. Bestimmte Distributionsformen führen jedoch zu Pflichten insbesondere zur Weitergabe des Quellcodes. Die konkrete Beurteilung hängt vom tatsächlich geltenden Lizenztext und Rechteinhaberschaften ab.

Die Multiplayer-Entwicklung, lokale Tests und die ungewertete P2P-Architektur werden durch diesen offenen Audit nicht automatisch blockiert.

## Auditprotokoll

- 2026-11-24: Die oben genannten Dateiköpfe und Projektmetadaten über GitHub gesichtet.
- Status: **Teil-Inventur**, keine juristische Freigabe, keine Änderung an `LICENSE` oder `package.json#license`.
