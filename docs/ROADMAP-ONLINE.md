# ARCANUM Online – Fahrplan ab 0.7.2-beta.1

Stand: 24. November 2026. Produktentscheidungen: **Hybrid-Multiplayer, PWA zuerst, kosmetische Monetarisierung, Multiplayer als erstes Ziel**.

## Leitplanken und Kosten

ARCANUM besitzt heute ein Browser-Spiel mit privaten, ungewerteten WebRTC-Partien für 2 bis 6 Menschen. Ein vollwertiges MMO nach Vorbild großer Spieleplattformen erfordert später eine eigene autoritative Infrastruktur. Diese Infrastruktur wird **nicht vorzeitig** eingeführt.

- Anfangs keine verpflichtenden laufenden Serverkosten: statisches Webhosting (Freikontingent und Bedingungen prüfen), direkter P2P-Spielverkehr, optional öffentlicher STUN.
- STUN garantiert keine Erreichbarkeit. Bei restriktiven NATs ist TURN nötig; TURN kostet gegebenenfalls Geld, bleibt optional. Ein kostenloses Serverless-Signaling wäre eine Komfortfunktion und ebenfalls quotenabhängig.
- Der Host kennt alle Karten. **P2P-Ergebnisse dürfen keine zentrale Ranked- oder Geldrelevanz erhalten.**
- Vor kosmetischem Shop oder proprietären Erweiterungen müssen die Rechte an Code und sämtlichen Assets sowie die GPL-2.0-/ISC-Inkonsistenz dokumentiert geklärt sein.
- Monetarisierung nur für Skins, Kartenrücken, Avatare, Räume und Tische – niemals bessere Karten oder höhere Gewinnwahrscheinlichkeit.

## Priorisierter Entwicklungsplan

| Priorität | Liefergegenstand | Akzeptanzkriterium |
| --- | --- | --- |
| **P0: Beta stabilisieren** | Standard-Regeltests, Kartenwert-Erklärungen, Synchron-Log, HUD, reale Endgeräte | CI grün, 2/3/6 Sitzplätze und Effekte geprüft, kein Leak verdeckter Karten |
| **P1: Reconnect** | Host hält die Partie im Arbeitsspeicher; kryptographisches Token je Sitzplatz; neuer DataChannel, Snapshot/Events erneut beziehen | Wiedereintritt nach Abbruch ohne doppelte Spielzüge; falsche Tokens abgelehnt; kein eigener Server |
| **P2: Einladungen** | QR/Deep-Link für manuelle SDP-Codes; optional kleine kurzlebige Signalisierung über Freikontingent | Copy/Paste bleibt Fallback, keine URL mit IP- oder TURN-Geheimnissen, Spam-/Ratelimits |
| **P3: PWA** | Manifest, Service Worker, Version-Cache, Offline-Bots, Installation auf Desktop/Android/iOS | Offline-Bot-Partie, kontrollierte Aktualisierung ohne veraltete Regel-Assets, installierbare Oberfläche |
| **P4: Zugänglichkeit** | Touch-Bedienung, Tastatur-/Screenreader-Flows, Animationen abschaltbar, öffentlicher Spielbericht | Reale Smartphone-Tests, Fokus sichtbar, Log exportiert ausschließlich öffentliche Events |
| **P5: Community** | Optionale Profile und private Statistiken, später Turnierorganisation ohne zentralen Wettkampfrang | DSGVO-/Löschkonzept, Nachfrage überprüft, keine Pflichtregistrierung für private P2P-Partien |
| **P6: Ranked** | Serverautoritatives Spiel mit verifizierten Commands, Replay, Matchmaking, Rating | Ergebnis ist ohne Vertrauen in Browser-Host prüfbar; Sicherheits- und Kostenfreigabe |
| **P7: Kosmetik** | Asset-Rechte klären, Shop, Besitznachweis, Zahlungspartner, Rechnungsprozesse | Lizenzfreigabe, kein Pay-to-win, Transparenz bei Preisen und Rückgaben |
| **P8: Skalierung** | Multi-Region-Relay, Betriebsmetriken, Moderation, optional native App-Wrapper | Gemessene Nachfrage und festgelegtes Budget rechtfertigen Infrastruktur |

## Die nächsten drei Sprints – Orientierung für eine Person

### Sprint A · Qualitäts- und Realgeräte-Gate (1–2 Wochen, Richtwert)

- Release-PR für 0.7.2 reviewen und nur nach grüner CI mergen.
- Standard-Regelkombinationen durchtesten: alle fünf Orakel und Narr, Magier, Hierophant, Kraft, Hohepriesterin, Teufel, Mond, Tod, Turm. Besonders: Liebende + Hierophant.
- 2-, 3- und 6-Spieler-Test am selben Tisch und über verschiedene Internetanschlüsse. Desktop/Smartphone und Smartphone/Smartphone. Einmal mit STUN und bei Bedarf mit optionalem TURN.
- Keine IP-Adressen oder SDP-Klartexte in Fehlerberichten speichern. Nur ICE-Kandidatentypen und anonymisierte Fehlercodes.
- Dokumentieren: Verbindungsquote nach Netztyp, Spielabbrüche und Anzahl nicht nachvollziehbarer Stiche.

### Sprint B · Reconnect und Synchronisierung (1–2 Wochen, Richtwert)

- Pro Sitz ein zufälliges, begrenzt gültiges Wiedereintrittstoken; Token nicht in öffentliche Lognachrichten geben.
- Host hält Spielstand bei kurzzeitigem Disconnect an und ermöglicht die Bindung eines neuen Kanals an denselben Sitz.
- Host überträgt Snapshot und seit der letzten bestätigten Event-Sequenz fehlende öffentliche Ereignisse.
- Tests für verzögerte/duplizierte Commands, falsche Tokens, Host-Tab geschlossen und Timeout. **Host-Wechsel und Neustart des Host-Browsers bleiben ausdrücklich außerhalb dieses Sprints.**
- Keine verpflichtende Backend-Infrastruktur.

### Sprint C · PWA und Einladungs-UX (1–2 Wochen, Richtwert)

- Manifest mit Icons, Service Worker mit atomarem Cache-Versionwechsel und expliziter Trennung von statischen Assets gegenüber privaten Sitzungsdaten.
- Offline-Botmodus testen, während WebRTC für echte Online-Partien verfügbar bleiben muss.
- QR-/Link-Einladungen für manuelles Signaling einführen und die Möglichkeit eines späteren optionalen flüchtigen Signaling-Endpunkts architektonisch vorsehen.
- Browser-/Touch-/A11y-Prüfung; keine automatische Weitergabe von TURN-Passwörtern.

## Kosten- und Freigabe-Gates

| Gate | Bedingung | Investition |
| --- | --- | --- |
| G0 (jetzt) | Funktionierende private Beta und reproduzierbare Testfälle | Nur kostenlose statische Auslieferung, P2P und optionales STUN |
| G1 | Messbar hohe Abbruchquote beim manuellen Signaling | Kleiner optionaler Signaling-Dienst in Freikontingent, Quoten-/Missbrauchsmonitoring |
| G2 | Hohe P2P-Fehlerquote zwischen realen Netzen | Begrenztes optionales TURN-Budget oder selbst bereitgestellte Relays |
| G3 | Aktive Spielerbasis und Bedarf an fairen Ranglisten | Autoritative Matcher, Datenbank, Replay und Anti-Cheat |
| G4 | Nachgewiesene Zahlungsbereitschaft **und** abgeschlossener Lizenz-Audit | Kosmetik-Katalog, Entitlements und Zahlungspartner |

Wichtige Kennzahlen (noch keine erfundenen Schwellenwerte): Anteil erfolgreicher Verbindungen, abgeschlossene Partien, mediane Einladungsdauer, Regel-/Sync-Fehler pro Partie, mobile Nutzung, freiwillige Wiederkehr, Kosten pro erfolgreich abgeschlossener Partie. Erst wenn reale Daten vorliegen, werden feste Gates und Budgets festgelegt.

## Technische Epics / GitHub-Backlog

**Epic A – Regeln und Fairness:** parametrische Standard-Matrix, dokumentierte Stich-Wirkungsreihenfolge, öffentliches und vollständiges privates Test-Replay strikt trennen; für Ranked später nur serverseitig verifizierte Zustandsänderungen.

**Epic B – Multiplayer-Stabilität:** Reconnect, Event-Offsets, zuverlässige Ack-/Duplikaterkennung, eine optionale sichere Signalisierung sowie TURN-Fallback für benötigte Netztypen.

**Epic C – PWA/Design:** installierbarer Client, Cache-Migration, verifizierte Medienauflösung, mobile UI-Prüfungen und barrierearme Steuerung.

**Epic D – Monetarisierung und Recht:** Rechtekette aller Assets, GPL-/ISC-Klärung, Zahlungs- und Datenschutzkonzept, kosmetischer Shop erst nach Freigabe.

**Produktions-Gate:** Ein lokaler Chromium-WebRTC-Test beweist keine öffentliche NAT-Erreichbarkeit und keine Betrugssicherheit. Reale Cross-NAT- und Endgeräteprüfungen bleiben vor öffentlicher Freigabe zwingend.
