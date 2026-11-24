# ADR 0002 — Engine-Migration und Kompatibilitätsvertrag

- Status: Angenommen; Browser-Core-Migration implementiert und über Node-CI geprüft
- Datum: 2026-11-24

## Ziel

Die bestehende Browser-Engine (`js/engine.js`) wird schrittweise als Adapter des DOM-freien Spielkerns betrieben. `js/rules.js` bleibt Single Source of Truth. Die bisherigen Modi Turbo, Standard und RAW, Bot-Partien und UI bleiben während der Migration benutzbar.

## Sicherheitsinvarianten

- Commands tragen Spieleridentität und monoton wachsende Sequenz; die Transportebene authentifiziert die Identität.
- Der Reducer validiert Spielphase, Zugreihenfolge, Kartenbesitz und Spielregel.
- Öffentliche Snapshots enthalten niemals gegnerische Hände, Deck, Seed oder RNG-Interna.
- Das Ergebnis einer P2P-Partie ist nicht ranked-tauglich.
- RNG, Timer, Dialoge und DOM-Zugriffe dürfen nicht Teil des Reducers sein.

## Migration

1. Bestehende Engine-Funktionen weiter als stabile UI-Schnittstelle anbieten.
2. Command-Adapter implementieren; Spieler- und Botaktionen durch denselben Reducer routen.
3. UI ausschließlich aus dem Zustand projizieren; Identitäten und Aussehen bleiben Darstellungssache.
4. Legacy- und Core-Wertungen für alle Sonderregeln und Modi mit Paritätstests vergleichen.
5. Browser-Smoketests und vollständige Node-Tests vor dem Merge nachweisen.

## Grenze

WebRTC-Transport, Lobby, Accounts, Reconnect und PWA-Installation sind nicht Teil dieses ADR.

## Implementierungsnachweis (2026-11-24)

- Der DOM-freie Reducer ist über `js/core/legacy-adapter.js` in die bestehende Browser-Engine integriert; Bot- und menschliche Commands teilen sich dieselbe Validierung.
- Die bisherigen 3 Spielmodi und 2/3/6 Spieler wurden mit realen Kartendaten und Regeln per Node-VM getestet.
- Legacy/Core-Parität: identische Seeds und Zugfolgen in 144 Konfigurationen; vollständige Suite 115/115 grün (GitHub Actions Lauf [45395085369](https://github.com/RG4all/arcanum/actions/runs/45395085369)).
- Automatisierter Chromium-Smoke-Test auf Desktop- und Mobile-Viewport grün (GitHub Actions Lauf [45396010932](https://github.com/RG4all/arcanum/actions/runs/45396010932)). Visuelle Tests auf echten Mobilgeräten bleiben vor dem Produktionsrelease empfohlen. Der neue Core stellt noch keinen Netzwerktransport dar.
- Die Prüfung sämtlicher denkbarer Kombinationen von Sonderkarten ist durch deterministische Stichproben und vorhandene Regel-Unit-Tests gestützt, aber nicht mathematisch erschöpfend.
