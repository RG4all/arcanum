# Regeln & Kartenkunde

Das Nachschlagewerk zur Partie. Für Architektur und Formeln siehe [ARCHITECTURE.md](ARCHITECTURE.md).

## 1 · Ziel des Spiels

Über alle Runden das meiste **Karma** sammeln. Karma entsteht, indem du deine **Vision** (angesagte Stichzahl) möglichst exakt erfüllst. Es gibt keinen festen Kartenstich-Sieger – nur die Summe über alle Runden zählt.

## 2 · Rundenablauf

1. **Geben.** Jede:r erhält gleich viele Karten: Turbo `4 + Rundennummer` (5–9), Standard `6 + Rundennummer` (7–13), RAW – Die Nackte Zahl `2 + Rundennummer` (3–7).
2. **Weltgesetz.** Im Standard wird ein Orakel gezogen und gilt für die ganze Runde (Turbo und RAW kennen keine Orakel).
3. **Vision.** Alle sagen gleichzeitig an, wie viele Stiche sie gewinnen. Erlaubt ist `0 … Kartenzahl`.
4. **Stiche.** Die/der erste Spielende spielt aus. Wer anspielt, legt die zu bedienende Farbe fest; ein Trumpf als erste Karte lässt die Farbe offen.
5. **Auswertung.** Nach der letzten Karte wird der Stich entschieden, Effekte werden angewandt, der Gewinner eröffnet den nächsten Stich.
6. **Rundenwertung.** Nach dem letzten Stich wird abgerechnet; danach beginnt die nächste Runde beim Geben.

## 3 · Rangordnung

- **Trumpf schlägt Farbe.** Höchste Große Arkana gewinnt gegen jede Kleine Arkana.
- **Innerhalb der Trümpfe** gewinnt die höhere Nummer (0 < I < … < XXI), sofern keine Sondereffekte greifen.
- **Innerhalb der angespielten Farbe** gewinnt der höhere Rang: Ass (14,5) > König (14) > Königin (13) > Ritter (12) > Bube (11) > 10 … 2.
- **Andere Farben** sind wertlos, außer sie werden durch ein Orakel aufgewertet (Herrscherin, Rad).

### Sonderfälle der Rangordnung

| Karte | Wirkung |
| --- | --- |
| **Der Narr (0)** | Verliert gegen jede andere Karte. Gewinnt nur, wenn er **unmittelbar nach der Welt (XXI)** fällt – und keine Kraft im Stich liegt. |
| **Der Magier (I)** | Zählt 0,5 über der höchsten Kleinen Arkana im Stich, unabhängig von der Farbe. Ohne Kleine Arkana zählt er 0,5. Unter dem Rad gilt die Regel in der invertierten Skala. |
| **Die Kraft (XI)** | Schlägt alle anderen Karten (außer dem Welt-Narr-Trick) und gewinnt den Stich. |
| **Die Welt (XXI)** | Höchster reiner Trumpf. |
| **Der Turm (XVI)** | Zerstört den Stich: Niemand erhält ihn (`0` Stiche). |
| **Der Tod (XIII)** | Der rechnerische Sieger erhält nur `0,5` Stiche. Der Turm hat Vorrang. |

## 4 · Bedienpflicht und Zugbeschränkungen

- Wer eine Farbe anspielt, muss bedient werden, sofern möglich. Trumps dürfen **jederzeit** gelegt werden.
- **RAW – Die Nackte Zahl:** Dieselbe Bedienpflicht wie im Turbo – Große Arkana dürfen jederzeit gelegt werden; Kraft, Teufel und Herrscher wirken nicht.
- Hat man die Farbe nicht, ist jede Karte erlaubt.
- **Der Herrscher (IV, Orakel)** hebt die Bedienpflicht für die ganze Runde auf.
- **Die Kraft (XI)** verbietet ihrem Spieler im **nächsten** Stich Trumpf, solange eine andere Karte vorhanden ist (genau ein Zug).
- **Der Teufel (XV)** zwingt den nächsten Spieler im selben Stich zur **höchsten zulässigen** Karte. Als letzte Karte gespielt bleibt er wirkungslos.
- **Der Mond (XVIII)** liegt verdeckt, bis der Stich vollständig ist; die Chronik verrät ihn vorher nicht.

Die Oberfläche sperrt unzulässige Karten und nennt den Grund (`Bedienpflicht`, `Kraft`, `Teufel`). Bots folgen exakt denselben Regeln.

## 5 · Die 22 Großen Arkana

| Nr. | Karte | Symbolik | Effekt |
| --- | --- | --- | --- |
| 0 | Der Narr | Aufbruch, Vertrauen | Verliert immer; stiehlt nur direkt nach XXI den Stich |
| I | Der Magier | Wille, Anpassung | 0,5 über der höchsten Kleinen Arkana |
| II | Die Hohepriesterin | Intuition, Korrektur | Sieger korrigiert sein Gebot um ±1 |
| III | Die Herrscherin | Fülle, Wasser | Orakel: Kelche werden niedere Trümpfe |
| IV | Der Herrscher | Ordnung, Freiheit | Orakel: Bedienpflicht aufgehoben |
| V | Der Hierophant | Lehre, Stille | Annulliert alle Karteneffekte des Stichs |
| VI | Die Liebenden | Bund, Partnerschaft | Orakel: benachbarte Sitze teilen Stiche |
| VII | Der Wagen | Eroberung, Führung | Sieger eröffnet den nächsten Stich |
| VIII | Die Gerechtigkeit | Ausgleich, Karma | Alle anderen erhalten +5 Karma |
| IX | Der Eremit | Innenschau, Geduld | reine Zahlenkarte |
| X | Das Rad des Schicksals | Wende, Umkehr | Orakel: Hierarchie vollständig umgekehrt |
| XI | Die Kraft | Mut, Verzicht | Gewinnt; danach Trumpfverbot für einen Zug |
| XII | Der Gehängte | Perspektive, Pause | reine Zahlenkarte |
| XIII | Der Tod | Übergang, Halbierung | Sieger erhält 0,5 Stiche |
| XIV | Die Mäßigkeit | Balance, Mischung | reine Zahlenkarte |
| XV | Der Teufel | Zwang, Kette | Nächster Zug muss die höchste zulässige Karte sein |
| XVI | Der Turm | Einsturz | Zerstört den Stich vollständig |
| XVII | Der Stern | Hoffnung, Segen | Orakel: +30 bei exaktem Gebot |
| XVIII | Der Mond | Schleier, Enthüllung | Bis zum Stichende verdeckt |
| XIX | Die Sonne | Klarheit, Sieg | reine Zahlenkarte |
| XX | Das Gericht | Erwachen, Ruf | reine Zahlenkarte |
| XXI | Die Welt | Vollendung | Höchster Trumpf des Spiels |

**Orakel** wirken nur im Standard und gelten für die gesamte Runde. Ein Orakel wird pro Runde zufällig aus den fünf Karten III, IV, VI, X und XVII gezogen.

**Der Hierophant** schaltet beim Auswerten alle Karteneffekte ab – Narr, Turm, Tod, Kraft, Magier, Gerechtigkeit und Hohepriesterin. **Der Stich selbst bleibt gültig und wird nach der regulären Kartenrangfolge dem Sieger gutgeschrieben.** Orakel bleiben aktiv (inklusive Rad und Herrscherin). Der Teufel wirkt bereits beim Legen und kann deshalb nicht rückwirkend annulliert werden. Der Teufel wirkt bereits beim Legen und kann deshalb nicht rückwirkend annulliert werden; liegt der Hierophant schon, wird der Zwang unterdrückt.

## 6 · Hofkarten und Hofkarten-Segen

Die vier Hofkarten jeder Farbe – **Bube (11), Ritter (12), Königin (13), König (14)** – sind normale Rangkarten mit einem Zusatz im Standard:

> Wer eine Hofkarte über den Stich gewinnt, erhält **+1 (Bube), +2 (Ritter), +3 (Königin) oder +4 (König) Karma**.

Der Segen zählt nur im Standard, nur für den Stichsieger und nur bei gewonnenen Stichen (nicht bei zerstörten oder halben Stichen des Turms). Bei den Liebenden erhält auch die Partnerin bzw. der Partner den Segen seiner eigenen Hofkarten.

## 7 · Wertung

| Situation | Karma |
| --- | --- |
| Vision `n > 0` exakt erfüllt | `+20 + 10 · n` |
| Vision `0`, keine Stiche | `+50` |
| Vision `0`, Stiche gewonnen | `−50` |
| Überbieten (mehr Stiche als angesagt) | `−10` je gerundetem Schritt |
| Unterbieten im Standard | `−15` je gerundetem Schritt |
| Unterbieten im Turbo | `−10` je gerundetem Schritt |
| Unterbieten im RAW – Die Nackte Zahl | `−10` je gerundetem Schritt |
| Orakel **Stern** aktiv und exakt | `+30` zusätzlich |
| Hofkarten-Segen (Standard) | `+1 … +4` je gewonnener Hofkarte |

**Halbe Stiche:** Der Tod kann einem Stich 0,5 Stiche geben. Ein Treffer liegt nur bei genau gleicher Zahl vor. Abweichungen zählen gerundet: 0,5 → 1 Schritt, 1,5 → 2 Schritte. So bleiben alle Karmawerte ganzzahlig.

**Beispiele**

| Vision | Stiche | Modus | Karma |
| --- | --- | --- | --- |
| 2 | 2 | beide | +40 |
| 0 | 0 | beide | +50 |
| 0 | 1 | beide | −50 |
| 3 | 1 | Turbo | −20 |
| 3 | 1 | Standard | −30 |
| 3 | 1 | RAW | −20 |
| 1 | 2 | Standard | −10 |
| 1 | 0,5 (Tod) | Standard | −15 |
| 2 | 2 | Standard + Stern | +70 |
| 2 | 2 | Standard + König gewonnen | +44 |

## 8 · Die vier Farben

| Farbe | Element | Symbolik | Jahreszeit |
| --- | --- | --- | --- |
| **Stäbe** | Feuer | Wille, Tatkraft, Entfachung | Frühling |
| **Kelche** | Wasser | Gefühl, Hingabe, Strömung | Sommer |
| **Schwerter** | Luft | Gedanke, Klarheit, Schnitt | Herbst |
| **Münzen** | Erde | Gestalt, Werk, Bestand | Winter |

Jede Farbe umfasst Ass bis König. Hofkarten tragen zusätzlich den Hofkarten-Segen.

## 9 · Modi im Vergleich

| | Turbo | Standard | RAW – Die Nackte Zahl |
| --- | --- | --- | --- |
| Runden | 5 | 7 | 5 |
| Karten | 5, 6, 7, 8, 9 | 7, 8, 9, 10, 11, 12, 13 | 3, 4, 5, 6, 7 |
| Deck | 78 Karten | 78 Karten | 78 Karten (Große und Kleine Arkana) |
| Orakel | keine | 5, eines pro Runde | keine |
| Schicksalskarten | nur Narr, Turm, Welt | alle neun | keine – es gibt keine Kartenfunktionen |
| Bedienpflicht | Trumpf immer erlaubt | wie Turbo | wie Turbo |
| Unterbieten | −10 | −15 | −10 |
| Hofkarten-Segen | – | aktiv | – |
| Spieldauer | kompakt | ausführlich | kompakt, puristisches Stichspiel |

## 10 · RAW – Die Nackte Zahl

RAW (**„Die Nackte Zahl“**) ist die puristische Variante neben Turbo und Standard – für alle, die die Arkana ohne Beiwerk lesen wollen.

### Deck und Geben

- Gespielt wird das **komplette 78-Karten-Deck**: die 22 Großen Arkana (Trümpfe 0–XXI) und die 56 Kleinen Arkana in vier Farben (Ass bis König). Pro Runde wird das volle Deck gemischt und ausgeteilt.
- Geben: `2 + Rundennummer` Karten (3 bis 7). Es gibt 5 Runden. Der Reststapel bleibt liegen.

### Stichermittlung – die Wertigkeit

Die Rangordnung ist dreistufig und ohne Ausnahme:

1. **Jede Große Arkana schlägt jede Kleine Arkana.** Selbst der Narr (0) gewinnt gegen ein Ass.
2. **Unter Großen Arkana** zählt allein der Zahlenwert, aufsteigend von 0 bis XXI: die höhere Karte sticht die niedrigere (z. B. **IV schlägt II**, XXI schlägt XX, I schlägt 0). Der Narr ist schlicht die niedrigste Große Arkana.
3. **Unter Kleinen Arkana** gewinnt die höchste Karte der **angespielten Farbe**: Ass (14,5) > König (14) > Königin (13) > Ritter (12) > Bube (11) > 10 … 2. Karten anderer Farben sind wertlos.

Es gibt **keine Sonderkarten und keine Kartenfunktionen**. Narr, Magier, Kraft, Hierophant, Turm, Tod, Gerechtigkeit, Hohepriesterin, Liebende, Mond, Teufel – keine dieser Karten wirkt in RAW. Die Wertung kennt keinen Hofkarten-Segen und keinen Stern-Segen – es gibt keine Orakel.

**Beispiele**

| Stich (in Spielreihenfolge) | Sieger | Warum |
| --- | --- | --- |
| Ass der Stäbe, Der Narr (0) | Der Narr | Große Arkana schlägt jede Kleine Arkana |
| II, IV | IV | höhere Zahl |
| Die Welt (XXI), Der Narr (0) | Die Welt | kein Welt-Narr-Trick in RAW |
| König der Kelche, Ass der Kelche | Ass der Kelche | Ass ist die höchste Farbkarte |
| 7 der Schwerter, König der Münzen | 7 der Schwerter | Münzen bedienen nicht die angespielte Farbe |
| 5 der Stäbe, Der Turm (XVI), Der Magier (I) | Der Turm | XVI > I; der Turm zerstört in RAW nichts |

### Bedienpflicht

Wie im Turbo: Wer eine Farbe anspielt, muss bedient werden, sofern möglich. Eine **Große Arkana darf jederzeit gelegt werden** und umgeht damit die Bedienpflicht. Hat man die Farbe nicht, ist jede Karte erlaubt. Es gibt keine weiteren Zugbeschränkungen (keine Kraft, kein Teufel, keine Herrscher-Option).

### Wertung

Identisch zum Turbo: Vision `n > 0` exakt erfüllt `+20 + 10 · n`; Vision `0` gehalten `+50`, gescheitert `−50`; Abweichung `−10` je gerundetem Schritt; halbe Stiche existieren nicht (kein Tod), eine Abweichung zählt ganzzahlig.

**Beispiel**

| Vision | Stiche | Modus | Karma |
| --- | --- | --- | --- |
| 2 | 2 | RAW | +40 |
| 0 | 0 | RAW | +50 |
| 1 | 3 | RAW | −20 |

## 11 · Häufige Fragen

**Darf ich einen Trumpf legen, obwohl ich bedienen könnte?** Ja. Trumps sind immer erlaubt, außer die Kraft verbietet es dir.

**Gewinnt der Magier gegen die Welt?** Nein. Der Magier vergleicht sich nur mit den Kleinen Arkana; jede Große Arkana außer dem Narr schlägt ihn.

**Was passiert, wenn Turm und Tod gemeinsam im Stich liegen?** Der Turm gewinnt: `0` Stiche, kein halber Stich.

**Zählt der Mond als Trumpf?** Ja, XVIII ist ein normaler Trumpf – nur eben bis zum Stichende verdeckt.

**Kann ich mit Vision 0 und einem halben Stich (Tod) die Null-Ansage halten?** Nein. Die Null-Ansage verlangt exakt `0` Stiche.

**Wirken Orakel auch im Turbo?** Nein, sie werden dort nicht gezogen und nicht ausgewertet.

**Darf ich in RAW frei legen?** Nein. Auch in RAW gilt die Bedienpflicht – nur Große Arkana dürfen jederzeit gelegt werden.

**Wirken die Karteneffekte der Großen Arkana in RAW?** Nein. RAW kennt keine Kartenfunktionen: Jede Große Arkana schlägt jede Kleine Arkana, unter Trümpfen entscheidet allein die Zahl 0–XXI, unter Farbkarten die angespielte Farbe.

**Schlägt in RAW der Narr ein Ass?** Ja. Der Narr ist eine Große Arkana und schlägt damit jede Kleine Arkana – er verliert nur gegen höhere Große Arkana.
