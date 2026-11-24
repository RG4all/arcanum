# WebRTC-MVP – Verifikation und Betrieb

Stand: 2026-11-24 · Version: 0.7.0-beta.1  
Branch: feat/webrtc-private-lobby · PR: https://github.com/RG4all/arcanum/pull/13

## Ziel

Bis zu sechs Menschen spielen privat und ungewertet über direkte WebRTC-DataChannels, ohne dass ein eigener Signalisierungs- oder Spielserver erforderlich ist. Host koordiniert die Partie und kennt alle Karten. Das ist **nicht betrugssicher** und daher nicht für Ranked geeignet. Offline-Bot-Partien bleiben unverändert.

## Verbindungsprotokoll

1. Host wählt RAW/Turbo/Standard, 2–6 Plätze und erstellt einen Raum.
2. Für jeden Gast generiert der Host ein eigenes, kryptografisch zufälliges Slot und ein vollständiges SDP-Offer einschließlich gesammelter ICE-Kandidaten.
3. Der Gast importiert das Offer und erzeugt ein Answer. Der Host überprüft beim Import Raum- und Slot-ID.
4. Nach Verbindungsaufbau sendet der Gast HELLO mit Regelwerksversion. Der Host bindet die Spieleridentität an **genau diesen DataChannel** und antwortet mit WELCOME/ROSTER.
5. Gäste melden READY; nur bei vollständig besetzter, verbundener und bereiter Lobby startet der Host.
6. Host erzeugt den deterministischen Spielzustand und sendet jedem Teilnehmer einen **empfängerspezifischen Snapshot**.
7. Aktionen SUBMIT_BID, PLAY_CARD und CHOOSE_PRIESTESS werden vom Host um Spieler-ID und globale Sequenz ergänzt und durch den bestehenden Reducer validiert. Der Host allein kann NEXT_ROUND auslösen.
8. Nach jeder gültigen Aktion erhalten Gäste neue eigene Snapshots. Disconnect beendet die laufende Partie; Reconnect und Host-Migration existieren noch nicht.

## Sicherheits- und Datenschutzgrenzen

- Kein vollständiger Game-State, keine fremden Hände, kein Seed, keine RNG-Interna oder unverteilten Karten an Gäste.
- Im offenen Stich wird die Mond-UID verborgen, erst nach dessen Auflösung veröffentlicht.
- Der Host vertraut keiner vom Gast behaupteten actorId/sequence; er bindet die Identität an den Kanal und verwendet eigene Sequenznummern.
- Datentransport über geordneten WebRTC-DataChannel, versioniertes JSON, Längenbegrenzung und Nachrichtenvalidierung.
- Der Host ist trotzdem nicht vertrauenswürdig; P2P bietet **keine** Gewähr für faire Ranglisten oder monetarisierbare Ergebnisse.
- SDP- und ICE-Texte können IP-Informationen enthalten; nur an beabsichtigte Personen weitergeben.
- Optionaler STUN-Dienst: stun.l.google.com:19302 (externer Drittanbieter, mögliche Übermittlung von IP-Metadaten).
- Kein TURN: Verbindungen zwischen bestimmten NAT/Firewall-Konfigurationen können scheitern.

## Kostenmodell

- Kein verpflichtender eigener Backend- oder Signalisierungsserver.
- Keine Registrierung, kein laufender Matchmaker und keine persistente Datenbank.
- Statische Auslieferung ist über GitHub Pages oder andere kostenlose statische Hosting-Lösungen möglich; HTTPS ist für WebRTC auf fremden Geräten erforderlich.
- Öffentlicher STUN ist optional, Verfügbarkeit und Nutzungsbedingungen werden nicht garantiert.
- TURN, Reconnect-Service und Ranked-Server würden bei späterer Einführung eigene Kosten- und Datenschutzprüfungen benötigen.

## Automatische Verifikation

- Node: Vollständige Spiel- und Core-Tests sowie private-room.test.cjs mit Zwei- und Sechserlobby, Zustandsvertraulichkeit und Befehlsautorisierung.
- Syntaxprüfung aller JavaScript-Module einschließlich js/net.
- Chromium Desktop (1280x800) und Mobile-Viewport (390x844): bestehender Offline-Smoke.
- P2P-Chromium: zwei voneinander unabhängige Browser-Kontexte tauschen reale WebRTC-Offer/Answer-Codes aus, verbinden sich und spielen eine vollständige RAW-Runde ohne STUN, TURN oder Signalisierungsbackend.

Erster nachgewiesener grüner Lauf: https://github.com/RG4all/arcanum/actions/runs/45401898659 — 247/247 Node-Tests und private RAW-Runde über zwei Chromium-Peers erfolgreich.

## Manuelle Abnahme vor öffentlichem Einsatz

- Verbindungen zwischen zwei echten Geräten im LAN und über unterschiedliche Internetanschlüsse (STUN an/aus).
- Touch- und Layoutprüfung auf tatsächlichen Mobilgeräten.
- Einladungen und Bereitschaftsstatus mit vier bis sechs echten Mitspielern.
- Alle drei Spielmodi einschließlich Sonderfällen (Mond, Hohepriesterin, Hierophant).
- Disconnect/Reset vor und während einer Partie.
- Langzeitstabilität und unterschiedliche NAT/Firewall-Typen.

Diese Fälle sind **nicht** durch den lokalen Chromium-Test vollständig bewiesen.

## Spätere Schritte

Komfortable Einladung über optionalen Serverless-Signalisierungsdienst, Reconnect mit begrenzt gespeicherten Sitzungsinformationen, später serverautoritative Ranked-Partien. Lizenz-/Asset-Freigabe bleibt Voraussetzung vor kommerziellem Shop.


## ICE-Verbindungsdiagnose (0.7.1-beta.1)

Die Lobby zeigt beim Generieren/Importieren des Offer/Answer-Codes die ermittelten ICE-Kandidaten nach **host** (LAN), **srflx** (mittels STUN ermittelte öffentliche Adresse) und **relay** (TURN-Relay) sowie die Connection-/ICE-Zustände. Eine fehlende srflx-Adresse weist auf STUN-/Firewallprobleme hin; auch bei erfolgreichem STUN sind symmetrische NATs ohne TURN ggf. nicht erreichbar. Die Eingabemaske akzeptiert bis zu vier benutzerdefinierte STUN-URLs und optional einen TURN-Server mit Benutzername/Passwort. Die TURN-Eingaben bleiben lokal im Speicher, werden nicht im Signalcode oder im Repository hinterlegt.

**Prüfgrenze:** CI verifiziert Konfiguration, Diagnoseformat und direkte WebRTC-Verbindungen im lokalen Chromium. Öffentliche Verbindungen über unterschiedliche reale Provider/NATs können nicht durch den CI-Test garantiert werden; gegebenenfalls ist ein nutzerbetriebener TURN-Relay notwendig.
