# Arcanum

**Version 0.2.0-beta.1** · Browser-Beta

Ein atmosphärisches Tarot-Stichspiel im Browser: Biete auf deine Stiche, spiele gegen Bots und erkunde den Karten-Kodex am virtuellen Ritualtisch.

## Funktionen

- Zwei bis sechs Spieler (eine Person und Bots), fünf Turbo- oder sieben Standardrunden
- Drei atmosphärische 3D-Umgebungen mit beleuchteter Ritualarchitektur, schwebenden Kristallen und Staubpartikeln
- Individuell gestaltete Tarotkarten und prozedurale, charaktervolle 3D-Avatare
- Wechselbare 3D-Umgebungen und animierte Karten
- Karten-Kodex mit Suche und Filter, Wahrscheinlichkeitsdiagramm und Wertungsrechner
- Tastaturbedienbare Handkarten und Unterstützung für reduzierte Bewegung

**Stand:** Lokale Browser-Beta, kein Online-Multiplayer und noch keine MMO-Serverarchitektur. Die im Kodex aufgeführten Spezialeffekte sind implementiert; für mehrdeutige Fälle gelten die Festlegungen in [der Dokumentation](docs/ARCHITECTURE.md).

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
arcanum_tarot_browsergame_codex.html  Einstieg und HTML-Oberfläche
css/arcanum.css                      Designsystem und responsive Darstellung
js/cards.js                          Kartenregister und gemeinsame Kartendarstellung
js/game-engine.js                    Rundenablauf, Regeln und Bot-Spiel
js/scene3d.js                        Three.js-Szene und prozedurale Avatare
js/app.js                            UI, Kodex, Rechner und Initialisierung
README.md                            Einstieg und Entwicklungsablauf
CHANGELOG.md                         Versionshistorie
docs/ARCHITECTURE.md                 Architektur und Regeln
tests/game.test.cjs                  Tests der Spiellogik (Node.js)
LICENSE                             GPL-2.0-Lizenztext
```

## Mitwirken und Versionierung

Änderungen klein halten, Verantwortlichkeiten der getrennten Dateien beibehalten, Tests ausführen und sichtbare Änderungen im Changelog dokumentieren. Versionen folgen [Semantic Versioning](https://semver.org/lang/de/): MAJOR für inkompatible Änderungen, MINOR für kompatible Funktionen, PATCH für kompatible Fehlerkorrekturen. Die Beta-Versionslinie beginnt wieder bei `0.x.x`; die laufende Version steht im `version`-Meta-Tag der HTML-Datei. Der Code ist in Stylesheet, Kartendaten, 3D-Ansicht, Spiel-Engine und UI aufgeteilt. Für einen MMO-Betrieb muss die Spiellogik künftig zusätzlich als plattformneutraler, serverautoritärer Domänenkern mit versioniertem Netzwerkprotokoll herausgelöst werden; Clients dürfen dann nur Eingaben senden und bestätigte Spielereignisse darstellen. Lizenz: siehe [LICENSE](LICENSE).
