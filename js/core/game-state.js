/** ARCANUM multiplayer core: state factory. No DOM, timers or network I/O. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumGameState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const PHASE = Object.freeze({ BIDDING: 'bidding', PLAYING: 'playing', ROUND_OVER: 'roundOver', GAME_OVER: 'gameOver', PRIESTESS: 'priestess' });
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function createGame({ rules, cards, mode = 'turbo', playerIds, seed }) {
    assert(rules && cards && cards.TAROT_DECK && cards.DECK_BY_UID, 'Regeln/Karten erforderlich');
    assert(Object.prototype.hasOwnProperty.call(rules.MODES, mode), 'Unbekannter Modus');
    assert(Array.isArray(playerIds) && playerIds.length >= 2 && playerIds.length <= 6, '2–6 Spieler erforderlich');
    assert(playerIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64), 'Ungültige Spieler-ID');
    assert(new Set(playerIds).size === playerIds.length, 'Spieler-IDs nicht eindeutig');
    assert(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, '32-Bit-Seed erforderlich');
    const state = {
      schema: VERSION, protocolVersion: 1, ruleset: rules.RULESET_VERSION, mode, seed, rngState: seed || 1,
      round: 1, maxRounds: rules.maxRounds(mode), phase: PHASE.BIDDING, sequence: 0,
      players: playerIds.map(id => ({ id, hand: [], bid: null, won: 0, score: 0, courtKarma: 0, bonus: 0 })),
      activePlayerIdx: 0, currentTrick: [], leadSuit: null, oracleUid: null,
      forcedPlayer: null, trumpBan: null, lastTrick: null, roundSummary: [], pendingPriestess: null
    };
    return state;
  }
  /** A snapshot for one recipient; an opponent's hand is NEVER transmitted. */
  function snapshotFor(state, recipientId) {
    return {
      schema: state.schema, protocolVersion: state.protocolVersion,
      ruleset: state.ruleset, mode: state.mode,
      round: state.round, maxRounds: state.maxRounds, phase: state.phase, sequence: state.sequence,
      activePlayerIdx: state.activePlayerIdx, leadSuit: state.leadSuit, oracleUid: state.oracleUid,
      currentTrick: state.currentTrick.map(item => item.hidden ? { playerIdx: item.playerIdx, hidden: true } : { ...item }),
      players: state.players.map(player => ({
        id: player.id, bid: player.bid, won: player.won, score: player.score,
        cardsRemaining: player.hand.length,
        ...(player.id === recipientId ? { hand: [...player.hand] } : {})
      })),
      pendingPriestess: state.pendingPriestess ? { playerId: state.players[state.pendingPriestess.playerIdx].id } : null
    };
  }
  return Object.freeze({ VERSION, PHASE, createGame, snapshotFor });
});
