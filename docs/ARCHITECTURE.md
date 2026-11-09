# Architektur und Spielstand

## Aufbau und Verantwortlichkeiten

Die Oberfläche ist als statische Browser-Beta ohne Build-Schritt organisiert. HTML und Darstellung sind getrennt; JavaScript-Dateien werden als klassische Skripte in fester Reihenfolge geladen, damit die Browser-Beta weiterhin direkt von einem einfachen Webserver lauffähig bleibt.

- `js/cards.js`: Kartenregister und gemeinsame Darstellungshilfen.
- `js/game-engine.js`: Deck, Rundenablauf, Wertung, Bot-Züge und Spielzustand.
- `js/scene3d.js`: Three.js-Renderer, Ortsmanifest, zehn individuelle Raumarchitekturen, prozedurale Materialien/Avatare und Freigabe temporärer Ressourcen.
- `js/app.js`: DOM-Updates, mobile Navigation, viewport-begrenzte Tooltips, responsives Kartenlayout, Kodex, Moduswechsel, Diagramm und Initialisierung.
- `css/arcanum.css`: visuelle Tokens, Kartenstile, responsive Darstellung, Reduced-Motion-Regeln und Touch-Zielgrößen.
- `arcanum_tarot_browsergame_codex.html`: semantische Oberfläche, zugängliche Steuerelemente und Ortsauswahl.

`ALL_CARDS` enthält die Einträge des Kodex (nicht das komplette Spieldeck). Three.js r128 und Chart.js 4.4.8 sowie Tailwind Play CDN werden extern geladen; für vollständig reproduzierbare Builds sollten Abhängigkeiten und ein kompiliertes CSS-Bundle lokal festgeschrieben werden.

### Responsives Verhalten

Die Oberfläche verwendet fluide Abstände, Typografie und Bühnenhöhe (`clamp()`), ein kleines Navigationsmenü für schmale Displays und umfließende Steuerleisten. Statusinformationen, Kodex, Diagramm und Rechner brechen in einspaltige Layouts um; die Gebotsbuttons behalten große Touch-Ziele. Die Spielerhand überlappt Karten dynamisch, garantiert eine sichtbare, antippbare Kartenkante und bleibt horizontal scrollbar. Stichkarten verwenden kleinere, umfließende Karten statt die 3D-Bühne mit sechs großen Karten zu verdecken. Das Siegerpodium ist ein viewport-festes Dialogfenster, das auch in kurzen Querformaten scrollt.

Die 3D-Kamera berechnet bei jeder Größenänderung das Seitenverhältnis neu und hält Tisch sowie Sitzkreis auch im Hochformat im Bild. Räume dürfen an den Rändern beschnitten werden, damit der Spielbereich im Mittelpunkt bleibt. Eine ResizeObserver-Überwachung ergänzt die Fenster-Resize-Behandlung. Auf Geräten mit niedriger Leistung werden Schatten und Partikelauflösung reduziert; die Renderer-Pixeldichte ist auf 1,6 begrenzt (1,25 auf leistungsschwachen Geräten).

### Zehn individuelle 3D-Orte

`GameEngine3D.environments` ist die alleinige Datenquelle für Kennungen, Namen, Kurzbeschreibungen, Materialfamilien, Beleuchtungsfarben und je einen unterschiedlichen Architekturbauer. `buildEnvironment()` verwirft die Ressourcen des alten Szenen-Wurzelknotens, setzt Atmosphäre und Grundfläche neu auf und ruft genau einen dieser eigenständigen Räume auf:

| Kennung | Architekturbauer | Kompositorischer Schwerpunkt |
| --- | --- | --- |
| `temple` | `buildSanctum()` | Marmor-Apsis, Säulenarkaden, Treppen und Sternrosette |
| `druid` | `buildGrove()` | Baumchronik, verästelte Stämme, Wurzelkreis und Runensteine |
| `mountain` | `buildPeak()` | offene Gipfelkulisse, Armillarsphäre, Fernrohr und Cairns |
| `library` | `buildLibrary()` | Bücherwände, Galerien, Leitern, Spitzbögen und farbige Buchrücken |
| `undersea` | `buildUndersea()` | Korallenpfeiler, Glasfenster, Kelp und Meereslichtstrahlen |
| `desert` | `buildDesert()` | Hufeisenarkaden, Gitter, Sonnenrosette, Palmen und Wasserbecken |
| `moon` | `buildMoon()` | Mondtor, Torii, Kiesgarten, Laternen und Spiegelfläche |
| `forge` | `buildForge()` | Glutofen, Basaltrippen, Ketten, Ambosse und Lavaadern |
| `ice` | `buildIce()` | Eisnave, prismatische Stützen, Spitzbögen und Nordlichtbänder |
| `sky` | `buildSky()` | schwebendes Felsbett, Seiteninseln, Hängebrücken, Pergola und Wolken |

Die Räume teilen nur Bühne, Ritualtisch, Sitzkreis und Avatar-Grundmodell – nicht ihre architektonische Silhouette. Der Tisch erhält je Ort andere Oberflächen und Formen; sechs passende, mehrteilige Stühle sind radial auf den Spielerkreis ausgerichtet. Säulen, Rahmen, Regale, Fenster, Gartenstrukturen und Werkbänke folgen jeweils einem erkennbaren Raumplan. Canvas-Texturen werden pro Szene wiederverwendet; `clearEnvironment()` entsorgt Geometrien, Materialien und Texturen beim Ortswechsel. Partikel, Feuer, Meeresleben und ausgewählte Zentralobjekte werden nur dann animiert, wenn reduzierte Bewegung nicht aktiviert ist.

### MMO- und Plattform-Zielbild

Die aktuelle Version ist **kein MMO-Client**: Spielregeln laufen im Browser, Bot-Timer und UI sind klientenseitig, es gibt keine Accounts, Transportebene, Serverautorität oder Persistenz. Die jetzt getrennten Dateien sind ein Wartbarkeitsschritt, nicht die Behauptung eines fertigen Multiplayer-Fundaments.

Vor Netzwerkbetrieb ist die Spiellogik in einen plattformneutralen Domänenkern ohne DOM/Three.js zu extrahieren. Eine serverautoritär ausgeführte Zustandsmaschine sollte validierte, versionierte Spielerbefehle annehmen und unveränderliche Ereignisse (z. B. `CardPlayed`, `TrickResolved`, `RoundScored`) publizieren. Clients für Web, Desktop und Mobilgeräte rendern diese Ereignisse; sie entscheiden nicht über Kartengültigkeit oder Wertung. Dazu gehören außerdem deterministische Zufallsquellen mit serverseitigem Seed, Reconnect-Snapshots, Schema-Migrationen, Missbrauchsschutz, Tests mit reproduzierbaren Partien und eine klar versionierte Transport-/Nachrichten-API. Keine dieser Netzwerkfunktionen ist in der Beta implementiert.

Neue UI- und Renderfunktionen sollen die Regeln nicht duplizieren. Für Plattformausbau die Domänenregeln zuerst aus `game-engine.js` herauslösen, nicht vom Browser aus in einen Server-Transport hineinwachsen lassen.

## Daten und Ablauf

Das Deck enthält 56 Kleine Arkana (vier Farben, Werte 1–14) und 22 Große Arkana. Karten besitzen `uid`, `name`, `icon`, `desc`, `value`, `isTrump` und je nach Art `suit` oder `trumpNum`. Das Ass hat den Vergleichswert 14,5. Das Deck wird mit Fisher-Yates gemischt und pro Runde neu ausgeteilt. Ein Spielerobjekt enthält `id`, `name`, `isBot`, `hand`, `bid`, `won` und `score`. Der Stich ist eine Liste aus `{playerIdx, card}`.

Eine Runde beginnt mit Geboten, gefolgt von Stichen und Wertung. Die erste gespielte Nicht-Trumpfkarte legt die zu bedienende Farbe fest; Trümpfe dürfen jederzeit gespielt werden. Bots wählen die erste passende Farbkarte oder ansonsten die erste Karte. Höchster Trumpf gewinnt, sonst die höchste Karte der angespielten Farbe. Der Narr verliert gegen andere Karten, außer unmittelbar nach der Welt; der Turm zerstört den Stich. Der rechnerische Gewinner eröffnet auch einen zerstörten Stich. Bei Neustart oder Moduswechsel werden ausstehende Bot- und Rundentimer verworfen.

Nullgebot: +50 bei null Stichen, sonst -50. Anderes exaktes Gebot: +20 und +10 je Stich. Abweichung: -10 je Stich, im Standard bei zu wenigen Stichen -15. Der Stern gibt im Standard bei einem exakten Nicht-Nullgebot zusätzlich 30 Punkte. Der Rechner kann einen Turmstich von einer eingegebenen Zahl abziehen; die Engine zählt zerstörte Stiche bereits nicht mit.

## Spezialeffekte und Festlegungen

Beide Modi verwenden alle 22 Großen Arkana. Der Standardmodus zieht eines der fünf im Kodex aufgeführten Orakel. Die speziell beschriebenen Standard-Karten wirken nur in Standard; Narr und Turm gelten weiterhin in beiden Modi. Nicht im Kodex aufgeführte Große Arkana haben keinen Spezialeffekt. Es gibt keine weiteren Orakel oder versteckten 12-Karten-Satz.

- **Magier:** Wert 0,5 über der höchsten Kleinen Arkana im Stich, unabhängig von deren Farbe; ohne Kleine Arkana Wert 0,5.
- **Hohepriesterin:** Der rechnerische Gewinner korrigiert sein Gebot um genau eins. Menschen wählen per Dialog, Bots erhöhen; an den Grenzen 0 und Kartenanzahl ist nur die jeweils andere Richtung möglich.
- **Hierophant:** Annulliert die Karteneffekte bei der Stichwertung, einschließlich Narr, Turm, Tod, Kraft, Magier, Gerechtigkeit und Hohepriesterin. Orakel bleiben aktiv. Der Teufel wirkt schon beim nächsten Zug und kann daher nicht rückwirkend annulliert werden; liegt der Hierophant bereits, wird der Zwang unterdrückt.
- **Wagen:** Der rechnerische Gewinner eröffnet den nächsten Stich; das ist bereits die allgemeine Eröffnungsregel, auch bei zerstörten Stichen.
- **Gerechtigkeit:** Alle anderen Spieler erhalten sofort je 5 Punkte, auch wenn der Turm den Stich zerstört.
- **Kraft:** Die Karte gewinnt gegen andere Karten; ihr Spieler darf im nächsten Stich keinen Trumpf spielen, sofern eine andere Karte vorhanden ist. Die Einschränkung gilt für genau einen Zug und endet spätestens mit der Runde.
- **Tod:** Der rechnerische Gewinner erhält einen halben statt eines ganzen Stichs. Der Turm hat Vorrang und verhindert auch den halben Stich. Halbe Stiche fließen unverändert in die Wertung ein.
- **Teufel:** Der nächste Spieler im selben Stich muss die höchste nach Bedienpflicht und Kraft-Einschränkung zulässige Karte spielen. Ein als letzte Karte gespielter Teufel hat keine Wirkung auf den nächsten Stich. Bei gleichem Wert sind alle höchsten Karten zulässig.
- **Mond:** Die Karte erscheint bis zur vollständigen Auslage verdeckt und wird anschließend aufgedeckt; die Chronik verrät sie vorher nicht.
- **Herrscherin:** Kelche sind niedrige Trümpfe, über normalen Farben und unter Großen Arkana. Die ursprüngliche Bedienpflicht bleibt bestehen.
- **Herrscher:** Hebt die Bedienpflicht auf.
- **Liebende:** Sitznachbarn 0/1, 2/3 und 4/5 bilden Paare; jeder Partner erhält auch die Stiche des anderen. Bei ungerader Spielerzahl spielt der letzte allein. Gebote und Punkte bleiben individuell.
- **Rad:** Umgekehrte globale Hierarchie: Kleine Arkana 2 bis König, dann Ass, anschließend Große Arkana 0 bis XXI. Alle Farben zählen bei der Rangfolge, die Bedienpflicht bleibt bestehen. Narr, Kraft und Magier behalten ihre Spezialwirkung; der Hierophant schaltet diese ab.
- **Stern:** +30 bei exaktem Nicht-Nullgebot, wie im Rechner. Nullgebote behalten ihre separate ±50-Wertung.

Das Diagramm berechnet die Chance auf mindestens einen Trumpf aus dem tatsächlichen 78-Karten-Deck ohne Zurücklegen.

## Persistenz und Betrieb

Es gibt weder `localStorage` noch serverseitige Speicherung oder ein Spielstandsformat. Ein Neuladen verwirft die Partie. Die vorhandenen Zustandsfelder und Karten-IDs bleiben erhalten; eine künftige Persistenz benötigt ein versioniertes Schema und Migrationen. Externe CDN-Ressourcen sind für den Betrieb nötig, siehe README. Die Renderauflösung ist auf 1,6-fache Pixeldichte begrenzt (auf leistungsschwachen Geräten 1,25); prozedurale Oberflächen, abgestimmte Lichtquellen, Raumarchitektur und ortsspezifische Partikel tragen die Darstellung. Animationen berücksichtigen die Systemeinstellung für reduzierte Bewegung.
