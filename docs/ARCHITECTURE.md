# Architektur und Spielstand

## Aufbau

Die Anwendung besteht aus einer HTML-Datei mit Inline-CSS und JavaScript. Tailwind (Browser-CDN) erzeugt Utility-CSS, Chart.js zeichnet das Diagramm, Three.js r128 rendert die Szene. Es gibt keinen Bundler, kein Backend und keine externen Bilddateien. Kartenmaterial entsteht durch CSS, Tisch und Avatare aus Three.js-Geometrien; diese Stellen können später durch eigene, lokal bereitgestellte Texturen oder Modelle ersetzt werden. Bei neuen Assets Pfade relativ zur HTML-Datei angeben und Lizenz sowie Dateigröße prüfen.

`ALL_CARDS` enthält die Einträge des Kodex (nicht das komplette Spieldeck). `GameEngine3D` verwaltet Szene, Kamera, Renderer, Umgebungen und Avatare; beim Umbau werden Geometrien und Materialien freigegeben. `GameEngine` verwaltet Runden und UI. Weitere Funktionen behandeln Moduswechsel, Kodex, Diagramm und Rechner. Initialisierung erfolgt bei `DOMContentLoaded`.

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

Es gibt weder `localStorage` noch serverseitige Speicherung oder ein Spielstandsformat. Ein Neuladen verwirft die Partie. Die vorhandenen Zustandsfelder und Karten-IDs bleiben erhalten; eine künftige Persistenz benötigt ein versioniertes Schema und Migrationen. Externe CDN-Ressourcen sind für den Betrieb nötig, siehe README. Die Renderauflösung ist auf zweifache Pixeldichte begrenzt; Partikel sind einfache Punkte. Animationen berücksichtigen die Systemeinstellung für reduzierte Bewegung.
