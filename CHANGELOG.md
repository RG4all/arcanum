# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert. Versionierung nach Semantic Versioning.

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
