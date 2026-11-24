/**
 * Mode-sensitive help for active card and gameplay context.
 * This module deliberately does not read DOM or mutate game state.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumModeHints = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const META = Object.freeze({
    turbo: { title: 'Turbo', rounds: 5,
      short: '5 Runden · Trumpf-Hierarchie, Narr/Welt und einzelne Stich-Sonderregeln. Kein Orakel.',
      action: 'Schnelle Bot-Partien: Stiche durch Kartenwerte und die aktiven Turbo-Sonderregeln entscheiden.' },
    standard: { title: 'Standard', rounds: 7,
      short: '7 Runden · Orakel, Schicksalskarten, Bedienpflicht und Hofkarten-Karma.',
      action: 'Stichrang, angespielte Farbe, aktive Orakel und Sonderkarten entscheiden gemeinsam.' },
    raw: { title: 'RAW – Die Nackte Zahl', rounds: 5,
      short: '5 Runden · nur Kartenrang und Bedienfarbe. Keine Orakel, keine Karteneffekte.',
      action: 'Jede Große Arkana schlägt jede Kleine; unter Großen Arkana gewinnt die höhere Zahl.' }
  });
  function valid(mode) { return Object.prototype.hasOwnProperty.call(META, mode) ? mode : 'turbo'; }
  function cardHint(card, mode, effect) {
    if (!card) return null;
    mode = valid(mode);
    const title = card.shortName || card.name || 'Karte';
    const rank = card.isTrump
      ? 'Große Arkana ' + card.trumpNum + ' (Trumpf)'
      : (card.rankName || card.name) + ' der ' + card.suit + ' · Wert ' + card.value;
    if (mode === 'raw') {
      return { title, short: rank,
        action: 'RAW: Kein Spezialeffekt. ' + (card.isTrump
          ? 'Höhere Trumpfnummer gewinnt; Trümpfe sind jederzeit spielbar.'
          : 'Nur die angespielte Farbe zählt. Innerhalb der Farbe gewinnt der höchste Wert.') };
    }
    if (mode === 'turbo') {
      const special = {
        'major-0': 'Narr verliert normalerweise; unmittelbar nach der Welt kann er sie entthronen.',
        'major-1': 'Magier: 0,5 über der höchsten Kleinen Arkana im Stich.',
        'major-11': 'Die Kraft gewinnt gegen alle regulären Karten.',
        'major-16': 'Der Turm zerstört den Stich: niemand erhält einen Stichpunkt.',
        'major-21': 'Die Welt ist der höchste normale Trumpf, außer der Narr fällt direkt nach ihr.'
      };
      return { title, short: rank,
        action: special[card.uid] || (card.isTrump
          ? 'Turbo: Zahlenrang der Großen Arkana. Orakel und Standard-Sonderwirkungen sind inaktiv.'
          : 'Turbo: Nur angespielte Farbe zählt, sofern kein Trumpf ausgespielt wird.') };
    }
    return { title, short: (effect && effect.short ? effect.short + ' · ' : '') + rank,
      action: effect ? (effect.type === 'orakel'
        ? 'Standard: Wirkt als Orakel, wenn für die Runde gezogen. Als Handkarte zählt ihre Stichstärke.'
        : 'Standard: Schicksalswirkung beim passenden Stich; Hierophant kann sie annullieren.')
        : (card.court
          ? 'Standard: Hofkarte; ein gewonnener Stich kann zusätzliches Karma bringen.'
          : 'Standard: Zahlenwert im Kontext von Anspielfarbe, Trumpf und Orakel entscheidet.') };
  }
  function describe(key, mode, card, effect) {
    mode = valid(mode);
    if (key === 'card' || key === 'codex-card') return cardHint(card, mode, effect);
    const active = META[mode];
    if (key === 'mode-turbo' || key === 'mode-standard' || key === 'mode-raw') {
      const selected = META[key.substring(5)];
      return { title: 'Regelwerk · ' + selected.title, short: selected.short,
        action: 'Wählt diesen Modus. Die lokale Bot-Partie wird neu gegeben.' };
    }
    const common = {
      'mode-tile': { title: 'Aktives Regelwerk', short: active.short, action: active.action },
      'trick': { title: 'Stichentscheidung · ' + active.title, short: active.short,
        action: 'Der Sieger wird nach dem vollständigen Stich anhand des Regelkerns bestimmt – nicht anhand der Zugposition.' },
      'hand': { title: 'Deine Karten · ' + active.title,
        short: 'Spielbare Handkarten werden hervorgehoben, unzulässige Züge gesperrt.',
        action: mode === 'raw' ? 'Bedienpflicht; Trümpfe dürfen jederzeit gespielt werden.'
          : 'Berücksichtige Bedienpflicht, Kartenwerte und aktive Sonderregeln.' },
      'oracle-tile': { title: 'Weltgesetz · ' + active.title,
        short: mode === 'standard' ? 'Aktives Orakel kann die Runde und ihre Rangordnung verändern.' : 'Dieser Modus verwendet keine Orakel.',
        action: mode === 'standard' ? 'Orakel gelten für die ganze Runde, auch wenn der Hierophant Stich-Effekte ausschaltet.' : 'Für Orakel und Hofkarten-Boni Standard wählen.' },
      'chart': { title: 'Stochastik · ' + active.title,
        short: 'Hypergeometrische Trumpfwahrscheinlichkeit im 78-Karten-Deck.',
        action: 'Die Handgröße richtet sich nach dem gewählten Regelmodus; alle Modi verwenden das vollständige Deck.' },
      'calc': { title: 'Wertung · ' + active.title,
        short: mode === 'standard' ? 'Mit Halb-Stichen, Orakelsegen und Hofkarten-Karma.' : 'Ohne Orakelsegen und Hofkarten-Karma.',
        action: 'Eingaben ändern die Punktberechnung ohne laufende Partie zu beeinflussen.' },
      'nav': { title: 'Bereiche', short: 'Lokal/Bots · Multiplayer · Kodex & Stochastik · Wertung.',
        action: 'Wähle einen Bereich in der Hauptnavigation; der andere Spielmodus bleibt erhalten.' },
      'bid-button': { title: 'Vision · ' + active.title, short: 'Deine angesagte Stichzahl für die laufende Runde.',
        action: 'Exakte Vorhersagen erhalten Karma; Abweichungen führen zu Abzügen.' }
    };
    return common[key] || null;
  }
  return Object.freeze({ META, valid, cardHint, describe });
});
