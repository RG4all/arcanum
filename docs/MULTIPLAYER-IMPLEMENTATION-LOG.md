# Implementierungs- und Prüfprotokoll — Multiplayer-Core

**Datum:** 2026-11-24  
**Repository:** https://github.com/RG4all/arcanum  
**Pull Request:** https://github.com/RG4all/arcanum/pull/9  
**Tickets:** [#10](https://github.com/RG4all/arcanum/issues/10) (ADR/Architektur), [#11](https://github.com/RG4all/arcanum/issues/11) (Engine-Integration)  
**Branch:** `feat/multiplayer-core` → `main`  
**Release-Kandidat:** `0.6.0-beta.3`  
**Ausgangsbasis:** `aa5045b06b6d39071fbf252d02b24016f27cf560` (`0.6.0-beta.2`)

## Nachvollziehbarer Umfang

1. ADR 0001: verbindliche Hybrid-P2P-Entscheidung, private ungewertete Partien, später serverautoritative Wettbewerbe, Kosten- und Sicherheitsmodell.
2. ADR 0002: Vertrag für DOM-freien Reducer, Kommandos, Engine-Adapter und Migrationsstrategie.
3. `game-state.js`: deterministischer Seed, private und öffentliche Zustandsprojektion, verdeckter Mond bis zur abgeschlossenen Stichauflösung, Schema-/Protokollversion.
4. `game-commands.js`: Command-Typen, Validierung und strengere Protokollgrenze für spätere Netzwerkbefehle.
5. `game-reducer.js`: `START_ROUND`, `SUBMIT_BID`, `PLAY_CARD`, `CHOOSE_PRIESTESS`, `NEXT_ROUND`; reine Zustandsübergänge und Event-Ausgabe.
6. `legacy-adapter.js`: bestehende GameEngine-/UI-Schnittstellen, Darstellung, Bot-Heuristik und Timer bleiben; menschliche und Bot-Aktionen gehen über den Reducer.
7. HTML-Skriptreihenfolge ergänzt, Version auf `0.6.0-beta.3` in README, HTML, `package.json`, `package-lock.json` und Changelog angehoben. `RULESET_VERSION=0.6.0` unverändert.
8. GitHub Actions Node-Workflow ergänzt, der `npm ci`, `npm test` und `node --check` ausführt.
9. Vorläufiger Lizenz-/Asset-Audit angelegt; keine eigenmächtige Lizenzänderung.

## Verifizierungsumfang

- Unveränderte Node-Spiel-/Regeltests für Karten, Wertung, Sonderregeln, 3D-Daten, HTML-/CSS-Integrität.
- Isolierte Unit-Tests für deterministischen Reducer, Sequenzen, Zugrecht, Snapshot-Vertraulichkeit, Mond-Aufdeckung und Protokollversion.
- Node-VM-Browserintegration für 2, 3 und 6 Sitze in Turbo, Standard und RAW.
- Deterministische Vergleichstests Legacy/Core mit identischen Seeds, Händen, Geboten, Zugfolgen und Rundenscores für dieselben 9 Modus-/Sitzkombinationen mit je 16 Seeds (144 Szenarien).
- JavaScript-Syntaxcheck aller `js/*.js` und `js/core/*.js`.
- GitHub Actions: **243/243 Node-Tests erfolgreich** und **Chromium-Smoke-Test erfolgreich** auf Desktop (1280×800) und Mobile-Viewport (390×844): jeweils eine RAW-Runde, neun Spielzüge, Zustand `roundOver`, gerenderte Hand/HUD, keine ungefangenen Browserfehler.

**Verifizierungsnachweis:** GitHub Actions [CI-Verlauf](https://github.com/RG4all/arcanum/actions/workflows/node-tests.yml). Nachweis: [Node- und Chromium-CI-Lauf](https://github.com/RG4all/arcanum/actions/runs/45396010932) (beide Jobs grün). Ein grüner Workflow ersetzt keine manuelle Prüfung auf realen Mobilgeräten.

## Fehlersuche und Korrekturen

1. **Lockfile:** Ein initialer globaler Versionsersatz änderte fälschlich die Version einer Drittbibliothek; korrigiert durch gezielte Aktualisierung ausschließlich der Root-Metadaten. `npm ci` danach erfolgreich.
2. **Node-VM:** `structuredClone` war nicht im simulierten globalen Browserkontext vorhanden; Testkontext entsprechend ergänzt.
3. **Cross-Realm-Vergleich:** Node-Virtual-Machines besitzen unterschiedliche Array-Prototypen; Paritätstests normalisieren die serialisierbaren Zustände vor dem Vergleich.
4. **HUD-Wertung:** Rundenwertungsprojektion um `breakdown`, `roundPoints` und Abweichung ergänzt.
5. **Trick-Feedback:** Stichauflösungsereignisse um Turm-/Tod-/Narr-/Mond-Metadaten erweitert; vollständige Karten-UIDs erst nach Auflösung öffentlich.
6. **Protokollversion:** explizit in Core-State, Host-Commands und öffentlichen Snapshots; die spätere Transportgrenze muss `validateNetworkCommand` aufrufen.

## Risiken und bewusste Nicht-Ziele

- **Noch kein WebRTC:** Der PR enthält eine Netzwerk-fähige Domäne, aber keine Lobby, Signalisierung, WebRTC-DataChannels oder Reconnect-Implementierung.
- **Noch kein echtes E2E im Browser:** Node-VM-Tests beweisen Spielablauf und API-Kompatibilität, nicht 3D-Rendering, Touch-Interaktion, Browser-Animation oder verschiedene Geräte.
- **Private Daten:** `snapshotFor` ist eine Projektion, keine Authentifizierung. Der künftige Host muss Clientidentitäten verbindlich zuordnen und nur empfänger-spezifische Projektionen senden.
- **Keine Ranked-Sicherheit:** P2P-Hosts können Spielzustand und Zufallsfolge manipulieren; gewertete Partien brauchen später Serverautorität.
- **Lizenz:** GPL-2.0-Lizenzdatei widerspricht ISC-Paketmetadatum. Siehe [Lizenz-Audit](LICENSING-AUDIT.md). Vor kommerzieller Verwertung sind alle Rechte und Pflichten zu klären.
- **Kosten:** Core und Tests benötigen keinen laufenden eigenen Spielserver; TURN, zentraler Matchmaker und Produktion sind gesondert zu budgetieren.

## Freigabekriterien

- [x] Architektur und Migration dokumentiert
- [x] Der bestehende Browser-Einstieg lädt Core und Adapter
- [x] Legacy-/Core-Parität durch automatisierte Tests
- [x] Version und Changelog aktualisiert
- [x] CI mit kompletter Node-Suite und Syntaxcheck
- [x] Automatisierter Desktop-/Mobile-Viewport-Smoke-Test im echten Chromium
- [ ] Manuelle visuelle Abnahme von 3D, Animation und echten Mobilgeräten
- [ ] Menschliches PR-Review und Merge nach `main`
- [ ] Lizenz-/Asset-Rechtefreigabe **vor kommerzieller Veröffentlichung**
