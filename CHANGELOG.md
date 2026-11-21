# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert. Die Beta-Versionslinie beginnt auf ausdrücklichen Wunsch wieder bei `0.x.x`; ältere 1.x-Einträge bleiben als Historie erhalten.

## 0.6.0-beta.2 – 2026-11-21

Korrektur des Regelwerks **RAW – Die Nackte Zahl**: komplettes Deck statt nur Große Arkana.

### Geändert
- **RAW spielt jetzt mit dem kompletten 78-Karten-Deck** – Große und Kleine Arkana – statt nur mit den 22 Großen Arkana. Es gibt weiterhin keine Orakel und keine Sonderkarten.
- **Eindeutige Wertigkeit.** Jede Große Arkana schlägt jede Kleine Arkana (auch der Narr schlägt ein Ass). Unter Großen Arkana zählt allein die Zahl 0–XXI; unter Kleinen Arkana gewinnt die höchste Karte der angespielten Farbe (Ass 14,5 > König … > 2), andere Farben sind wertlos. Kein Welt-Narr-Trick, kein Magier, keine Kraft, kein Turm, kein Tod, kein Hierophant, kein Hofkarten-Segen.
- **Bedienpflicht in RAW** wie im Turbo: angespielte Farbe bedienen, sofern möglich; Große Arkana dürfen jederzeit gelegt werden. Kraftverbot, Teufelszwang und Herrscher-Freiheit werden in RAW ignoriert.
- **Geben.** Weiterhin `2 + Rundennummer` Karten (3–7); der frühere Deckel `⌊22 / Spieler:innen⌋` entfällt, da das Volldeck die Hände immer hergibt.
- **Regelkern (`js/rules.js`).** `createDeck` liefert in allen Modi das 78-Karten-Deck (`createRawDeck` ist ein Alias), `createRanker` nutzt in RAW `200 + trumpNum` für Trümpfe und den Farbwert für bediente Kleine Arkana, `legalCardIndices` kennt in RAW nur die Bedienpflicht. `RULESET_VERSION` auf `0.6.0` erhöht.
- **Engine und Oberfläche.** Bot-Gebotsheuristik für gemischte RAW-Hände (hohe Trümpfe voll, niedrige halb, Asse/Könige anteilig), Regelwerk-Reiter, HUD-Texte, Hinweiskarten und Stochastik-Diagramm (78 Karten, 22 Trümpfe) angepasst.
- **Dokumentation und Tests.** `README.md`, `docs/RULES.md` (Abschnitt 10 mit Beispielstichen, FAQ) und `docs/ARCHITECTURE.md` aktualisiert; RAW-Tests auf Volldeck, Trumpf-über-Farbe-Hierarchie und Bedienpflicht umgestellt (79 Tests insgesamt).
- Version auf `0.6.0-beta.2` angehoben (Meta-Tag, README, Changelog, `package.json`, Footer).

## 0.6.0-beta.1 – 2026-11-21

Schwerpunkt dieser Version ist das dritte Regelwerk: **RAW – Die Nackte Zahl**.

### Hinzugefügt
- **RAW – Die Nackte Zahl** als dritte Spielvariante neben Turbo und Standard. Es werden ausschließlich die 22 Großen Arkana (Trümpfe 0–XXI) verwendet; es gibt keine Orakel und keine Sonderkarten, und der Stich wird **ausschließlich über den Zahlenwert** entschieden – aufsteigend von 0 bis XXI, die höhere Karte sticht die niedrigere (z. B. IV schlägt II). Es gibt keine weiteren Kartenfunktionen; weder Narr/Welt-Sonderregel noch Turm, Tod, Kraft, Magier noch Hierophant wirken in RAW. **Ein Trumpf darf jederzeit gelegt werden** und umgeht damit die Bedienpflicht – da jede Karte ein Trumpf ist, ist grundsätzlich jede Karte jederzeit zulässig.
- **Geben und Deckelung.** `2 + Rundennummer` Karten (3–7), gedeckelt auf `⌊22 / Spieler:innen⌋`, damit das reine Trumpfdeck die Hände immer hergibt (bei 3 Spielenden 3–7 Karten, bei 4 maximal 5, bei 6 maximal 3). Fünf Runden; die Wertung entspricht dem Turbo (`+20 + 10 · Stiche` bei exakter Vision, Null `±50`, Abweichung `−10` je gerundetem Schritt).
- **Oberfläche.** Dritter Modusknopf `✧ RAW` in der Arena-Umschaltung, eigener Header-Badge (`data-mode="raw"`), HUD-Texte für das Regelwerk, dritter Reiter im Regelwerk-Abschnitt mit eigener Rangordnungs- und Kartenerklärung, Hinweiskarte `mode-raw` sowie ein Stochastik-Diagramm, das im RAW-Modus mit dem 22-Karten-Deck rechnet.
- **Regelkern (`js/rules.js`).** `CONFIG.modes.raw`, `createRawDeck()` (22 gemischte Große Arkana), `cardsPerPlayer(mode, round, playerCount)` mit RAW-Deckel (in Turbo/Standard ohne Wirkung), RAW-Pfade in `createRanker` (Rang = `trumpNum`), `legalCardIndices` (alle Karten legal) und `resolveTrick` (alle Sonderfälle und Hofkarten-Segen deaktiviert). `maxBid` reicht die Spielerzahl durch.
- **Engine (`js/engine.js`).** Modusdurchgereicht (`createDeck(rng, mode)`, `cardsPerPlayer` mit Spielerzahl, `mode` im Constraint-Kontext), Orakel-Hinweis "Kein Orakel" nennt im RAW-Modus die reinen Zahlregeln, Bot-Gebotsheuristik für reine Trumpfhände (`trumpNum ≥ 11`).
- **Dokumentation.** `docs/RULES.md` (eigener RAW-Abschnitt, Modi-Vergleich, Wertungstabelle, FAQ, Bedienpflicht-Regel) und `docs/ARCHITECTURE.md` (RAW-Abschnitt im Regelkern, Rangtabelle, Bot-Heuristik, Testliste) um die Variante ergänzt; README mit Modus-Vergleichstabelle und Versionshinweis.
- Tests für RAW: 22-Karten-Trumpfdeck und Seed-Determinismus, Rundengrößen mit ⌊22/Spieler:innen⌋-Deckel, Stichermittlung rein nach Zahlenwert (inkl. Reihenfolge-Unabhängigkeit und Gleichstandsregel), Abschaltung aller Kartenfunktionen (Narr/Welt, Turm, Tod, Kraft, Magier, Hierophant, Hofkarten-Segen), Trumpf-Ausnahme von der Bedienpflicht (auch unter Kraftverbot/Teufelszwang), Turbo-hafte Wertung (−10 je Abweichung, Null ±50) sowie eine komplette RAW-Runde in der Engine ohne Orakel (77 Tests insgesamt).

### Geändert
- Version auf `0.6.0-beta.1` angehoben (Meta-Tag, README, Changelog, `package.json`, Footer); der Regelkern steht auf `0.5.0`, da sich die Regeln mit dem neuen Regelwerk erweitert haben (bestehende Regeln unverändert).
- Turbo- und Standard-Pfade im Regelkern bleiben funktionsgleich; der RAW-Modus ist additiv über `mode: 'raw'` bzw. `raw: true` im Kontext erreichbar.

## 0.5.0-beta.1 – 2026-11-09

Schwerpunkt dieser Version ist die Bühne: Räume, Figuren, Licht und die Erklärung der Oberfläche beim Darüberfahren.

### Hinzugefügt
- **Drei Himmelswelten, zehn Ritualorte.** Jeder Ort ist jetzt eine eigene Architektur statt einer Farbvariante: Sanktuarium mit Apsis, Arkaden und Sternrosette (Sanctum der Sieben Siegel), Wurzelkreis und Baumkrone (Hain der Wurzelchronik), Armillarsphäre und Fernrohr auf offenem Gipfel (Observatorium am Himmelsgrat), mehrstöckige Galerien mit Buchregalen und Leitern (Bibliothek der Nachtflügel), Korallenpfeiler und Lichtstrahlen (Abtei der Tiefenströmung), Hufeisenarkaden mit Mosaik und Wasserbecken (Sonnenpalast der Glasdünen), Mondtor, Torii und Kiesgarten (Mondkloster der stillen Gezeiten), Basaltgewölbe mit Glutofen und Lavaadern (Schmiede des Phönix), Eisprismen mit Spitzbögen und Nordlicht (Kristallhalle des Nordlichts) sowie schwebende Terrassen mit Brücken (Hängende Gärten der Äonen).
- **Materialien und Atmosphäre prozedural.** Marmor, Moos, Sand, Eis und Wasser entstehen als Canvas-Texturen zur Laufzeit – keine Bilddateien. Dazu passt sich der Nebel, das Sternenfeld und die Lichtfarbe dem Ort an; Partikel (Staub, Glut, Schnee, Blüten) bewegen sich in drei Tiefenebenen.
- **Weltenwechsel live.** Über die Reiter **Sternendom**, **Schwebeinseln** und **Sternenorbit** wechselt die Umgebung ohne Neuladen: Himmel, Horizont, Sternendichte und Kameraweg werden umgebaut, der aktuelle Ort wandert in die passende Welt.
- **Eigene Kamera mit Rücksetzknopf.** Ziehen dreht, Scrollen zoomt, Doppelklick zentriert; ein Knopf stellt die vom Ort empfohlene Ansicht wieder her. Der Abstand richtet sich nach dem Seitenverhältnis, damit die Bühne im Hochformat nicht abschneidet.
- **Zwölf Charaktere in `js/avatars.js`.** Gesicht mit Iris, Brauen, Nase und Mund, Robe mit Kragen, Borte und Stickerei, sechs Frisuren, zwei Draperien (Kapuze, Schleier), sechs Kopfbedeckungen (Diadem, Krone, Helm, Lorbeer, Hörner, keins) und zwölf Sigille – vollständig deterministisch als SVG. Die Farben leitet `paletteOf()` aus dem Farbklang der jeweiligen Figur ab und normalisiert dabei auch numerische WebGL-Werte zu CSS-Hex.
- **Figuren in der Szene.** An jedem Ort stehen sechs Figuren aus Grundkörpern (Kopf, Hals, Schultern, Robe, Kapuze, Kopfbedeckung, Sigill-Anhänger); der aktive Spieler wird hervorgehoben, Gegner tragen ihre eigenen Gesichter. Porträts erscheinen zusätzlich im HUD, in der Gegnerliste, in den Bot-Chips und auf dem Podium.
- **Hinweiskarte mit Kurzbeschreibung und Funktion.** Fährt man über Kacheln, Orte, Welten, Karten oder Bedienelemente, zeigt ein Overlay Titel, Kurzbeschreibung (`short`) und Funktion (`action`) – gespeist aus `HOVER_HINTS`, `roomHint()` und `cardHint()` in `js/worlds.js`. Funktioniert per Tastaturfokus, mit `aria-describedby` und ohne Überlappung am Bildschirmrand.
- **Offline-Bibliotheken.** `vendor/three/three.min.js` (r128) und `vendor/chart/chart.umd.js` (4.4.8) liegen im Projekt; die Seite lädt sie lokal statt vom CDN und bleibt damit ohne Netz spielbar.
- Tests für Orts- und Weltmanifest, Avatar-Identitäten und Sitzordnung, alle zwölf Porträt-SVGs, die Palettenauflösung, die Sigille, die Hinweistexte, die 3D-Manifeste und das Kartenhand-Layout (69 Tests).

### Geändert
- `js/scene3d.js` neu geschrieben: Manifest-Hydrierung, Kamera- und Layoutmathematik, Texturen, Weltbau, Raumgeneratoren und Figuren sind getrennte, testbare Funktionen statt eines monolithischen Blocks. Nicht mehr benötigte Geometrie wird freigegeben.
- Die Bühne respektiert `prefers-reduced-motion`: Partikel und Schwankungen ruhen dann.
- Version auf `0.5.0-beta.1` angehoben (Meta-Tag, README, Changelog, `package.json`); der Regelkern bleibt bei `0.4.0`, da sich keine Regel geändert hat.
- Fehlerkorrektur: Der Weltenwechsel rief `GameEngine.log` ohne Namensraum auf und brach in strikt getrennten Kontexten ab.

## 0.4.0-beta.1 – 2026-11-09

### Hinzugefügt
- **Vollständiges Spieldeck mit eigener Kartenkunst:** `js/card-art.js` rendert alle 78 Karten prozedural als geschichtetes SVG – 22 individuelle Motive für die Großen Arkana, 16 Hofkarten-Figuren mit Farbemblem, Punktbilder von Ass bis Zehn, deterministischer Sternenstaub, doppelter Goldrahmen und gestaltete Rückseite. Keine Bilddateien, keine Emoji, offline nutzbar.
- **Karten-Kodex, sinnvoll sortiert:** Große Arkana 0–XXI vor Stäbe, Kelche, Schwerter und Münzen (je Ass → König), gruppiert mit Überschriften. Suche über Name, Symbolik und Regeltext, elf Filter, drei Sortierungen und ein Detaildialog mit großem Motiv, Rangwert, Hofkarten-Segen, Symbolik und Effekt.
- **Vollständiges Kartenregister:** `js/cards.js` enthält jetzt alle 78 Karten mit `rank`, `court`, `element`, `keywords`, englischem Namen, römischer Ziffer und Hofkarten-Karma; das Effektregister umfasst 17 Karten mit Kurz- und Langtext.
- **Getrennter Regelkern:** `js/rules.js` bündelt Rangordnung, Zulässigkeit, Stichauflösung, Wertung, Stochastik und Deckvalidierung als reine, DOM-freie Funktionen. Wertungskonstanten liegen zentral in `CONFIG.scoring`; `RULESET_VERSION` und `STATE_SCHEMA_VERSION` sind eingeführt.
- **Großes, besser lesbares HUD:** Karmawert in `clamp(52px, 6,4vw, 86px)` mit Tabellenziffern, Kennzahlen für Vision, Stiche und Hand, Zielhinweis, Gegnerkarma, Stichbilanzen mit Balken, Kachelband für Runde/ Weltgesetz/Regelwerk und ein farbcodiertes Phasenband.
- **Gerenderte Animationen:** `js/animations.js` liefert Federphysik, Bézier-Kartenflug mit Geisterkarte, gestaffelte Stichauslage, Treffer-Effekt beim Stichentscheid, zählende Karmawerte und Konfettiregen auf dem Podium – ohne Bibliothek und mit `prefers-reduced-motion`-Fallback.
- **Hofkarten-Segen (Standard):** Gewonnene Hofkarten zahlen zusätzlich 1–4 Karma; die Regel ist an der Karte, im Regelkern, im Rechner und in der Dokumentation identisch.
- **Dokumentation:** neue [Regeln & Kartenkunde](docs/RULES.md) mit allen Sonderfällen und Wertungsbeispielen; [ARCHITECTURE.md](docs/ARCHITECTURE.md) beschreibt Schichten, Datenmodell, Regelkern, HUD, Animationen und Spielstandsschema.
- Tests für Kartenkunst (78 einmalige, gültige SVG-Motive), Kodex-Reihenfolge und -Filter, jede Regel und jeden Sonderfall, Wertung gegen den Engine-Pfad, Determinismus, Handsortierung, Animationsmathematik sowie HTML-ID-, ARIA-, CSS- und Versionskonsistenz (58 Tests).

### Geändert
- Version auf `0.4.0-beta.1` angehoben (Meta-Tag, README, Changelog, Footer testgestützt konsistent).
- `js/game-engine.js` heißt jetzt `js/engine.js` und nutzt den Regelkern, statt Regeln zu duplizieren; Bot-Züge und Bots-Gebote sind neu begründet (Trümpfe, Hofkarten, hohe Farbkarten).
- Die Bietknöpfe, Handkarten und Stichkarten werden vollständig neu aufgebaut; Karten sind echte `<button>`-Elemente mit Tooltip und Beschriftung, Zahlen in Tabellenziffern.
- Das Rundenende zeigt eine Rundenbilanz mit Punktdelta und Begründung; die Chronik ist auf 120 Zeilen begrenzt.
- CSS in vierzehn dokumentierte Abschnitte gegliedert (Tokens, HUD, Kartenkunst, Kodex, Dialog, Podium, Responsive, reduzierte Bewegung) mit neuen Breakpoints 1180/900/700/430 px.
- `ArcanumCardArt` ersetzt die Emoji-Symbole der Karten durch gezeichnete Motive; Karten tragen kein Emoji mehr.

### Behoben
- **Der verdeckte Mond brach die Darstellung.** Die verdeckte Karte war ein Ad-hoc-Objekt ohne `uid` und ließ den SVG-Renderer mit `undefined` scheitern; sie ist jetzt als `CONCEALED_CARD` vollständig beschrieben und zeigt die Kartenrückseite (Regressionstest).
- **Wertungsrechner und Partie rechneten unterschiedlich**, sobald Hofkarten oder halbe Stiche ins Spiel kamen; beide nutzen jetzt `ArcanumRules.scoreRound`.
- **Halbe Stiche rundeten inkonsistent**. Jetzt gilt: Treffer nur bei exakter Gleichheit, Abweichungen werden auf ganze Schritte gerundet, alle Karmawerte bleiben ganzzahlig. Die Regel ist dokumentiert und getestet.
- **Hofkarten hatten einen Effektverweis ohne Effekt** und wurden im Kodex teils falsch gefiltert; der Filter `schicksal` lieferte das ganze Deck.
- **Narr und Rad:** Der Narr hat nun den niedrigsten Rangwert (0) und verliert damit auch in der invertierten Hierarchie gegen alle anderen Karten.
- **Bot-Züge** wählten blind die erste zulässige Karte und konnten hohe Trümpfe verbrennen; sie spielen jetzt die höchste zulässige Nicht-Trumpf-Karte.
- **Doppelte bzw. fehlende HTML-IDs** und tote CSS-Regeln (`canvas-fallback`, Podium-Selektoren) wurden beseitigt; ein Test verhindert Rückfälle.
- **Die Handkarten-Warnung** nutzte `alert()`; Hinweise erscheinen jetzt in der Oberfläche.
- Sprungmarke, Fokusfalle für beide Dialoge, `Escape`-Verhalten und sichtbarer Fokus wurden ergänzt bzw. korrigiert.

## 0.3.0-beta.1 – 2026-11-09

### Hinzugefügt
- Vollständig responsive Oberflächen für Smartphone-Hoch-/Querformat, Tablet, Desktop und breite Displays; inklusive mobiler Hauptnavigation, flüssiger Lobby-Steuerung, adaptiver 3D-Bühne, kompakter Stichkarten, dynamisch überlappender Handkarten und scrollbarem Podium.
- Zehn individuell komponierte Spielorte mit eigenen Architekturbauern: Marmorsanktuarium, Baumhain, Gipfelsternwarte, gotische Bibliothek, versunkene Abtei, Wüstenpalast, Mondkloster, Vulkan-Schmiede, Eiskathedrale und Himmelsgärten.
- Prozedurale Canvas-Oberflächen, raumspezifische Materialfamilien, abgestimmte Lichtstimmungen, Architekturdetails und Atmosphäreneffekte; wiederverwendbare Szenentexturen sowie vollständige Freigabe der Ressourcen beim Ortswechsel.
- Mehrteilige Ritualsessel im Spielerkreis, detaillierterer Ritualtisch, passende raumprägende Objekte und dezente Zugmarkierung an den Avataren.
- Zugängliche Navigation, Statusregionen, Kartenbeschriftungen, Touch-Ziele und am Viewport gehaltene Tooltips.
- Tests für das Ortsmanifest, die Kamerarahmung, das dynamische Kartenhand-Layout und die Übereinstimmung der zehn Ortsoptionen.

### Geändert
- Version auf `0.3.0-beta.1` angehoben; README und Architektur dokumentieren die zehn Räume, responsive Regeln und Renderergrenzen.
- Bibliotheksbuchrücken werden instanziert statt als hunderte einzelne Draw Calls aufgebaut; niedrige Geräteleistung reduziert Schatten und Partikel.

## 0.2.0-beta.1 – 2026-11-09

### Hinzugefügt
- Eigenständiges responsives Stylesheet und aufgeteilte JavaScript-Verantwortlichkeiten für Kartenregister, Spielregeln, 3D-Szene und UI.
- Neu gestaltete Tarotkarten mit individuellen Arkana-Farbstimmungen, Suiten, ornamentierten Rahmen, illustrativen Mittelfeldern und optimierter mobiler Hand.
- Ritualraum mit architektonischen Säulen und Bögen, goldenen Intarsien, mehreren Lichtquellen, weichen Schatten, Nebel, schwebenden Kristallen und farbigem Sternenstaub.
- Prozedural differenzierte Avatare mit Gesichtszügen, Haaren, Gewändern, individuellen Farbpaletten und sanfter Idle-Animation.
- Explizitere Architektur- und MMO-Roadmap: klare Abgrenzung zwischen Browser-Beta und künftigem plattformneutralem, serverautoritärem Spielkern.

### Geändert
- Versionslinie bewusst von 1.x auf `0.2.0-beta.1` zurückgesetzt.
- Three.js-Ressourcen werden beim Umgebungswechsel freigegeben; die 3D-Auflösung ist auf 1,75-fache Pixeldichte begrenzt.
- Alle 22 Großen Arkana besitzen jetzt eigene Symbole auf den Spielkarten.

## 1.1.0 – 2026-11-09

### Hinzugefügt
- Die im Kodex aufgeführten Standard-Karten- und Orakeleffekte einschließlich Partnerstichen, verdecktem Mond und Zugbeschränkungen; mehrdeutige Kombinationen sind in der Architektur dokumentiert.
- Tests für Effekte, Wechselwirkungen und zulässige Züge.

## 1.0.0 – 2026-11-09

### Hinzugefügt
- Erste dokumentierte Version mit README, Architektur-, Regel- und Datenbeschreibung sowie Tests für kritische Spiellogik.
- Prozedurale Kartenmaterialien, detailliertere Avatare, Licht und Sternenstaub; kein zusätzlicher Asset-Download.

### Geändert
- Chart.js auf 4.4.8 festgelegt; die anderen bestehenden Browser-CDNs und die Einzeldatei-Architektur bleiben erhalten.
- Standardwertung und Stern-Bonus an den vorhandenen Rechner angeglichen. Die tatsächlichen Grenzen der Standardregeln sind dokumentiert.
- Wahrscheinlichkeiten werden für das tatsächliche Deck berechnet statt aus widersprüchlichen Tabellen abgelesen.
- Handkarten sind echte Buttons; reduzierte Bewegung und WebGL-Ausfall werden berücksichtigt.

### Behoben
- Ausstehende Spieltimer werden bei Neustart und Moduswechsel aufgehoben; ein voller Stich kann nicht mehrfach gespielt werden.
- Der Narr verliert gegen andere Karten, außer unmittelbar nach der Welt. Ungültige Kartenindizes werden abgefangen.
- Beim Umgebungswechsel werden auch Zierringe sowie entfernte 3D-Ressourcen freigegeben.
