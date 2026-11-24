/**
 * Display-only descriptions of PUBLIC multiplayer events.
 * No DOM, no mutable game state, no network side effects.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumMatchPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EVENT_TYPES = Object.freeze([
    'RoundStarted', 'BidSubmitted', 'PlayingStarted', 'CardPlayed',
    'TrickResolved', 'PriestessChoiceRequired', 'PriestessChoiceApplied', 'RoundScored'
  ]);

  function number(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '–';
    return Number.isInteger(num) ? String(num) : String(num).replace('.', ',');
  }
  function nameFor(roster, playerId) {
    const player = (roster || []).find(p => p.id === playerId);
    return player ? player.name : 'Spieler';
  }
  function cardFor(cards, uid) {
    return cards && cards.DECK_BY_UID && cards.DECK_BY_UID[uid] || null;
  }
  function cardName(cards, uid) {
    const card = cardFor(cards, uid);
    return card ? card.name : 'unbekannte Karte';
  }

  function formatEvent(event, { roster = [], view = null, cards } = {}) {
    if (!event || !EVENT_TYPES.includes(event.type)) return null;
    const players = view && view.players || [];
    const nameAt = index => {
      const player = players[index];
      return player ? nameFor(roster, player.id) : 'Spieler';
    };
    const name = id => nameFor(roster, id);
    switch (event.type) {
      case 'RoundStarted':
        return { tone: 'round', title: 'Runde ' + event.round + ' beginnt',
          detail: event.oracleUid ? 'Weltgesetz: ' + cardName(cards, event.oracleUid) : 'Ohne Orakel' };
      case 'BidSubmitted':
        return { tone: 'bid', title: name(event.actorId) + ' sagt ' + number(event.bid) + ' Stiche an',
          detail: 'Vision abgegeben' };
      case 'PlayingStarted':
        return { tone: 'turn', title: 'Stichphase beginnt',
          detail: nameAt(event.activePlayerIdx) + ' spielt an' };
      case 'CardPlayed':
        return { tone: 'card', title: name(event.actorId) + ' spielt ' +
          (event.hidden ? 'eine verdeckte Karte' : cardName(cards, event.uid)),
          detail: event.hidden ? 'Kartenidentität bleibt bis zur Stichauflösung verborgen' : 'Karte gelegt' };
      case 'TrickResolved': {
        const card = (event.cards || []).find(c => c.playerIdx === event.winnerIdx);
        let detail = card ? cardName(cards, card.uid) : 'Stich aufgelöst';
        if (event.destroyed) detail = 'Turm: kein Stichpunkt · höchste Karte: ' + detail;
        if (event.cancelled) detail += ' · Hierophant hebt Karten-Sondereffekte auf';
        if (event.foolBeatWorld) detail += ' · Narr entthront die Welt';
        if (event.deathHalf) detail += ' · Tod halbiert den Stich';
        if (Number.isInteger(event.loversPartner)) detail += ' · Liebende teilen mit ' + nameAt(event.loversPartner);
        if (event.moonRevealed) detail += ' · Mond aufgedeckt';
        return { tone: event.destroyed ? 'effect' : 'trick',
          title: event.destroyed ? 'Stich zerstört' : nameAt(event.winnerIdx) +
            ' gewinnt ' + number(event.won) + (event.won === 1 ? ' Stich' : ' Stiche'),
          detail };
      }
      case 'PriestessChoiceRequired':
        return { tone: 'effect', title: 'Hohepriesterin',
          detail: name(event.actorId) + ' darf die Vision um 1 ändern' };
      case 'PriestessChoiceApplied':
        return { tone: 'effect', title: name(event.actorId) + ' ändert das Gebot',
          detail: 'Neue Vision: ' + number(event.bid) };
      case 'RoundScored':
        return { tone: 'score', title: 'Runde ' + event.round + ' gewertet',
          detail: (event.summary || []).map(x => name(x.playerId) + ': ' +
            (x.points >= 0 ? '+' : '') + number(x.points) + ' Karma').join(' · ') };
      default:
        return null;
    }
  }

  return Object.freeze({ EVENT_TYPES, formatEvent, number });
});
