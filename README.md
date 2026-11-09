# Arcanum

**Version 0.3.0-beta.1** · Browser-Beta

Ein atmosphärisches Tarot-Stichspiel im Browser: Biete auf deine Stiche, spiele gegen Bots und erkunde den Karten-Kodex an einem von zehn eigens komponierten Ritualorten.

## Funktionen

- Zwei bis sechs Spielende, fünf Turbo- oder sieben Standardrunden
- **Zehn eigenständige 3D-Orte** statt Farbvarianten: Marmorsanktuarium, Baumhain, Gipfelsternwarte, gotische Bibliothek, versunkene Abtei, Wüstenpalast, Mondkloster, Vulkan-Schmiede, Eiskathedrale und Himmelsgärten
- Prozedurale Oberflächen, PBR-Materialien, mehrschichtige Beleuchtung, atmosphärische Effekte und eigens komponierte Architektur je Ort
- Ritualtisch mit Intarsien, abgestimmter Bestuhlung und individuellen Details; charaktervolle Avatare
- Vollständig responsive Navigation, Lobby, Bühne, Stichkarten, Hand, Gebote, Podium, Kodex, Diagramm und Rechner – einschließlich Hoch- und Querformat
- Karten-Kodex mit Suche und Filter, Wahrscheinlichkeitsdiagramm und Wertungsrechner
- Tastaturbedienbare Karten, Touch-optimierte Steuerelemente, viewport-begrenzte Tooltips und Unterstützung für reduzierte Bewegung

**Stand:** Lokale Browser-Beta, kein Online-Multiplayer und noch keine MMO-Serverarchitektur. Die im Kodex aufgeführten Spezialeffekte sind implementiert; für mehrdeutige Fälle gelten die Festlegungen in [der Dokumentation](docs/ARCHITECTURE.md).

## Die zehn Orte

1. **Sanctum der Sieben Siegel** – Marmorsanktuarium mit Apsis, Arkaden und Sternrosette.
2. **Hain der Wurzelchronik** – uralter Baum, Wurzelkreis, Moossteine und Samenlicht.
3. **Observatorium am Himmelsgrat** – offene Gipfelsternwarte mit Armillarsphäre und Fernrohr.
4. **Bibliothek der Nachtflügel** – mehrstöckige Galerien, Buchregale, Leitern und Spitzbögen.
5. **Abtei der Tiefenströmung** – versunkene Abtei mit Korallenpfeilern, Glasfenster und Lichtstrahlen.
6. **Sonnenpalast der Glasdünen** – Sandsteinhof mit Hufeisenarkaden, Mosaiken, Palmen und Wasserbecken.
7. **Mondkloster der stillen Gezeiten** – Mondtor, Torii, Kiesgarten und spiegelnder Teich.
8. **Schmiede des Phönix** – Basaltgewölbe, Glutofen, Ambosse, Ketten und Lavaadern.
9. **Kristallhalle des Nordlichts** – Kathedralraum aus Eisprismen, Spitzbögen und Nordlichtern.
10. **Hängende Gärten der Äonen** – schwebende Terrassen, Brücken, Pergola und Wolkenmeer.

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

Zusätzlich im Browser auf schmalem Hochformat, Tablet, Desktop und breitem Monitor prüfen: Navigation öffnen, Hand horizontal durchsehen, bieten und Karten spielen, alle zehn Orte wechseln, Modus wechseln und einen Neustart während eines Bot-Zugs ausprobieren.

## Projektstruktur

```text
arcanum_tarot_browsergame_codex.html  Einstieg, responsive Oberfläche und Ortsauswahl
css/arcanum.css                      Designsystem und responsive Darstellung
js/cards.js                          Kartenregister und gemeinsame Kartendarstellung
js/game-engine.js                    Rundenablauf, Regeln und Bot-Spiel
js/scene3d.js                        zehn 3D-Architekturen, Materialien, Licht und Avatare
js/app.js                            UI, Navigation, Tooltips, Kodex, Rechner und Initialisierung
README.md                            Einstieg und Entwicklungsablauf
CHANGELOG.md                         Versionshistorie
docs/ARCHITECTURE.md                 Architektur und Regeln
tests/game.test.cjs                  Spiellogik, Ortsmanifest und Responsive-Helper
LICENSE                             GPL-2.0-Lizenztext
```

## Mitwirken und Versionierung

Änderungen klein halten, Verantwortlichkeiten der getrennten Dateien beibehalten, Tests ausführen und sichtbare Änderungen im Changelog dokumentieren. Versionen folgen [Semantic Versioning](https://semver.org/lang/de/): MAJOR für inkompatible Änderungen, MINOR für kompatible Funktionen, PATCH für kompatible Fehlerkorrekturen. Die Beta-Versionslinie beginnt wieder bei `0.x.x`; die laufende Version steht im `version`-Meta-Tag der HTML-Datei. Der Code ist in Stylesheet, Kartendaten, 3D-Ansicht, Spiel-Engine und UI aufgeteilt. Für einen MMO-Betrieb muss die Spiellogik künftig zusätzlich als plattformneutraler, serverautoritärer Domänenkern mit versioniertem Netzwerkprotokoll herausgelöst werden; Clients dürfen dann nur Eingaben senden und bestätigte Spielereignisse darstellen. Lizenz: siehe [LICENSE](LICENSE).
