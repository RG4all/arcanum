# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert. Die neue Beta-Versionslinie beginnt auf ausdrücklichen Wunsch wieder bei `0.x.x`; ältere 1.x-Einträge bleiben als Historie erhalten.

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
