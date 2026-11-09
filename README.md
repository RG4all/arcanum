# Arcanum

Ein atmosphärisches Tarot-Stichspiel im Browser: Biete auf deine Stiche, spiele gegen Bots und erkunde den Karten-Kodex am virtuellen Ritualtisch.

## Funktionen

- Zwei bis sechs Spieler (eine Person und Bots), fünf Turbo- oder sieben Standardrunden
- Drei wechselbare 3D-Umgebungen, prozedurale Avatare und animierte Karten
- Karten-Kodex mit Suche und Filter, Wahrscheinlichkeitsdiagramm und Wertungsrechner
- Tastaturbedienbare Handkarten und Unterstützung für reduzierte Bewegung

**Stand:** Ein lokaler Prototyp, kein Online-Multiplayer. Die im Kodex aufgeführten Spezialeffekte sind implementiert; für mehrdeutige Fälle gelten die Festlegungen in [der Dokumentation](docs/ARCHITECTURE.md).

## Start

Voraussetzung: ein moderner Browser mit JavaScript und Internetzugang für die CDN-Abhängigkeiten. WebGL wird für die 3D-Ansicht benötigt; ohne WebGL bleibt das Kartenspiel bedienbar.

```sh
python3 -m http.server 8000
```

Dann `http://localhost:8000/arcanum_tarot_browsergame_codex.html` öffnen. Die HTML-Datei kann auch direkt geöffnet werden. Es gibt keinen Build-Schritt, Paketmanager oder lokale Asset-Pipeline. Tailwind CSS, Chart.js und Three.js werden zur Laufzeit über CDNs geladen. Ohne Tailwind ist die Darstellung beeinträchtigt; ohne Chart.js entfällt das Diagramm.

## Prüfen

```sh
node --test tests/*.test.cjs
```

Zusätzlich im Browser ein Ritual starten, bieten, Karten spielen, Umgebung und Modus wechseln und einen Neustart während eines Bot-Zugs ausprobieren.

## Projektstruktur

```text
arcanum_tarot_browsergame_codex.html  Oberfläche, Styles, Daten und Engines
README.md                           Einstieg
CHANGELOG.md                        Versionshistorie
 docs/ARCHITECTURE.md               Architektur und Regeln
 tests/game.test.cjs                 Tests der Spiellogik (Node.js)
LICENSE                             GPL-2.0-Lizenztext
```

## Mitwirken und Versionierung

Änderungen klein halten, bestehende Regeln und die Einzeldatei-Architektur berücksichtigen, Tests ausführen und sichtbare Änderungen im Changelog dokumentieren. Versionen folgen [Semantic Versioning](https://semver.org/lang/de/): MAJOR für inkompatible Änderungen, MINOR für kompatible Funktionen, PATCH für kompatible Fehlerkorrekturen. Die maßgebliche Version steht im `version`-Meta-Tag der HTML-Datei. Lizenz: siehe [LICENSE](LICENSE).
