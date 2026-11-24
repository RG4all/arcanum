# ADR 0002 — Engine-Migration und Kompatibilitätsvertrag

- Status: Entwurf
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
