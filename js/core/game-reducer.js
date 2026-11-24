/** Deterministic, DOM-free multiplayer game reducer; uses existing ArcanumRules. */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./game-commands.js') : root.ArcanumGameCommands,
    typeof module === 'object' && module.exports ? require('./game-state.js') : root.ArcanumGameState
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumGameReducer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (commands, stateApi) {
  'use strict';
  const { TYPES, validateCommand } = commands;
  const { PHASE } = stateApi;
  function requireState(test, reason) { if (!test) throw new Error(reason); }
  function nextRandom(state) {
    // Exactly mulberry32 from js/rules.js, with explicit persisted internal RNG state.
    state.rngState = (state.rngState + 0x6D2B79F5) >>> 0;
    let t = state.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function startRound(state, rules, cards) {
    const rng = { next: () => nextRandom(state) };
    const count = rules.cardsPerPlayer(state.mode, state.round, state.players.length);
    const dealt = rules.deal({ deck: rules.createDeck(rng, state.mode), playerCount: state.players.length, cardsEach: count });
    state.players.forEach((p, i) => {
      p.hand = cards.sortHand(dealt.hands[i]).map(card => card.uid);
      p.bid = null; p.won = 0; p.courtKarma = 0; p.bonus = 0;
    });
    state.phase = PHASE.BIDDING;
    state.currentTrick = []; state.leadSuit = null;
    state.oracleUid = rules.MODES[state.mode].oracle ? rules.pickOracle(rng).uid : null;
    state.forcedPlayer = null; state.trumpBan = null; state.lastTrick = null;
    state.pendingPriestess = null; state.roundSummary = [];
    state.activePlayerIdx = 0;
    return { type: 'RoundStarted', round: state.round, oracleUid: state.oracleUid };
  }
  function roundScore(state, rules) {
    state.roundSummary = state.players.map(p => {
      const result = rules.scoreRound({ mode: state.mode, bid: p.bid, won: p.won, oracleUid: state.oracleUid, courtKarma: p.courtKarma });
      p.score += result.points;
      p.roundPoints = result.points;
      return { playerId: p.id, points: result.points, score: p.score, exact: result.exact,
        breakdown: [...(result.breakdown || [])], deviation: result.deviation == null ? Math.abs(p.bid - p.won) : result.deviation };
    });
    state.phase = state.round === state.maxRounds ? PHASE.GAME_OVER : PHASE.ROUND_OVER;
    return { type: 'RoundScored', round: state.round, summary: state.roundSummary.map(x => ({ ...x })) };
  }
  function finishTrick(state, rules, cards, events) {
    const result = rules.resolveTrick(
      state.currentTrick.map(x => ({ playerIdx: x.playerIdx, card: cards.DECK_BY_UID[x.uid], hidden: x.hidden })),
      { leadSuit: state.leadSuit, oracleUid: state.oracleUid, mode: state.mode, playerCount: state.players.length }
    );
    state.lastTrick = {
      winnerIdx: result.winnerIdx, won: result.won,
      cards: state.currentTrick.map(x => ({ ...x })),
      leadSuit: state.leadSuit,
      ranks: (result.ranks || []).map(x => ({ ...x })),
      destroyed: result.destroyed, cancelled: result.cancelled,
      deathHalf: result.deathHalf, foolBeatWorld: result.foolBeatWorld
    };
    // The Hierophant cancels effects, NOT the winning trick itself.
    state.players[result.winnerIdx].won += result.won;
    // Lovers is a round Oracle, unaffected by Hierophant's suppression of trick effects.
    if (result.loversPartner != null) state.players[result.loversPartner].won += result.won;
    if (!result.cancelled) {
      for (const idx of result.justiceTargets) { state.players[idx].score += 5; state.players[idx].bonus += 5; }
      state.players[result.winnerIdx].courtKarma += result.courtKarma;
      if (result.loversPartner != null && result.partnerCourtKarma)
        state.players[result.loversPartner].courtKarma += result.partnerCourtKarma;
      if (result.strengthPlayer != null) state.trumpBan = result.strengthPlayer;
    }
    // Existing engine does not credit destroyed trick points, and retains that behavior.
    state.activePlayerIdx = result.winnerIdx;
    state.currentTrick = []; state.leadSuit = null; state.forcedPlayer = null;
    events.push({ type: 'TrickResolved', winnerIdx: result.winnerIdx, won: result.won,
      destroyed: result.destroyed, cancelled: result.cancelled,
      deathHalf: result.deathHalf, foolBeatWorld: result.foolBeatWorld,
      loversPartner: result.loversPartner,
      moonRevealed: result.moonRevealed,
      // Complete tricks are public; Moon is revealed only after resolution.
      cards: state.lastTrick.cards.map(item => ({ playerIdx: item.playerIdx, uid: item.uid })) });
    if (!result.cancelled && result.priestess) {
      state.phase = PHASE.PRIESTESS;
      state.pendingPriestess = { playerIdx: result.winnerIdx };
      events.push({ type: 'PriestessChoiceRequired', actorId: state.players[result.winnerIdx].id });
    } else if (state.players.every(p => p.hand.length === 0)) {
      events.push(roundScore(state, rules));
    }
  }
  function apply(state, command, { rules, cards }) {
    validateCommand(command);
    requireState(state && state.schema === stateApi.VERSION, 'Falsche Zustandsversion');
    requireState(state.protocolVersion === commands.PROTOCOL_VERSION, 'Falsche State-Protokollversion');
    requireState(command.sequence === state.sequence + 1, 'Sequenz muss exakt nächste Nummer sein');
    requireState(rules.RULESET_VERSION === state.ruleset, 'Regelwerksversion abweichend');
    const next = structuredClone(state);
    const events = [];
    const idx = next.players.findIndex(player => player.id === command.actorId);
    switch (command.type) {
      case TYPES.START_ROUND:
        requireState(state.sequence === 0 && next.phase === PHASE.BIDDING && next.players.every(p => !p.hand.length), 'Partie bereits gestartet');
        events.push(startRound(next, rules, cards));
        break;
      case TYPES.SUBMIT_BID: {
        requireState(next.phase === PHASE.BIDDING, 'Nicht in Gebotsphase');
        requireState(idx === next.activePlayerIdx, 'Falscher Spieler am Zug');
        requireState(command.bid <= rules.cardsPerPlayer(next.mode, next.round, next.players.length), 'Gebot zu hoch');
        requireState(next.players[idx].bid === null, 'Gebot bereits gesetzt');
        next.players[idx].bid = command.bid;
        events.push({ type: 'BidSubmitted', actorId: command.actorId, bid: command.bid });
        if (next.players.every(p => p.bid !== null)) {
          next.phase = PHASE.PLAYING;
          next.activePlayerIdx = (next.round - 1) % next.players.length;
          events.push({ type: 'PlayingStarted', activePlayerIdx: next.activePlayerIdx });
        } else next.activePlayerIdx = (idx + 1) % next.players.length;
        break;
      }
      case TYPES.PLAY_CARD: {
        requireState(next.phase === PHASE.PLAYING, 'Nicht in Spielphase');
        requireState(idx === next.activePlayerIdx, 'Falscher Spieler am Zug');
        const player = next.players[idx];
        const cardIdx = player.hand.indexOf(command.cardUid);
        requireState(cardIdx >= 0, 'Karte nicht auf eigener Hand');
        const hand = player.hand.map(uid => cards.DECK_BY_UID[uid]);
        requireState(hand.every(Boolean), 'Ungültige Karten-UID im Zustand');
        const legal = rules.legalCardIndices(hand, {
          leadSuit: next.leadSuit, freeLead: next.oracleUid === 'major-4',
          trumpBan: next.trumpBan === idx, mustPlayHighest: next.forcedPlayer === idx,
          mode: next.mode
        });
        requireState(legal.includes(cardIdx), 'Regelwidriger Kartenzug');
        const card = cards.DECK_BY_UID[command.cardUid];
        player.hand.splice(cardIdx, 1);
        if (!next.currentTrick.length && !card.isTrump) next.leadSuit = card.suit;
        if (next.forcedPlayer === idx) next.forcedPlayer = null;
        if (next.trumpBan === idx) next.trumpBan = null;
        const hidden = next.mode === 'standard' && card.isTrump && card.trumpNum === 18;
        next.currentTrick.push({ playerIdx: idx, uid: card.uid, hidden });
        events.push({ type: 'CardPlayed', actorId: command.actorId, playerIdx: idx, uid: card.uid, hidden });
        if (next.mode === 'standard' && card.isTrump && card.trumpNum === 15 &&
            !next.currentTrick.some(item => cards.DECK_BY_UID[item.uid].trumpNum === 5 && cards.DECK_BY_UID[item.uid].isTrump) &&
            next.currentTrick.length < next.players.length) {
          next.forcedPlayer = (idx + 1) % next.players.length;
        }
        if (next.currentTrick.length === next.players.length) finishTrick(next, rules, cards, events);
        else next.activePlayerIdx = (idx + 1) % next.players.length;
        break;
      }
      case TYPES.CHOOSE_PRIESTESS: {
        requireState(next.phase === PHASE.PRIESTESS && next.pendingPriestess, 'Keine Priesterin-Korrektur offen');
        requireState(idx === next.pendingPriestess.playerIdx, 'Nur Stichsieger darf wählen');
        const player = next.players[idx];
        const bid = player.bid + command.delta;
        requireState(bid >= 0 && bid <= rules.cardsPerPlayer(next.mode, next.round, next.players.length), 'Gebot außerhalb der Grenzen');
        player.bid = bid;
        next.pendingPriestess = null;
        next.phase = PHASE.PLAYING;
        events.push({ type: 'PriestessChoiceApplied', actorId: command.actorId, bid });
        if (next.players.every(p => p.hand.length === 0)) events.push(roundScore(next, rules));
        break;
      }
      case TYPES.NEXT_ROUND:
        requireState(next.phase === PHASE.ROUND_OVER && next.round < next.maxRounds, 'Nächste Runde nicht verfügbar');
        next.round++;
        events.push(startRound(next, rules, cards));
        break;
      default: throw new Error('Nicht unterstützter Command');
    }
    next.sequence++;
    return { state: next, events: events.map((e, offset) => ({ ...e, sequence: next.sequence, eventIndex: offset })) };
  }
  /** Projection for untrusted clients. Internal events may contain concealed Moon UID. */
  function publicEvents(events) {
    return events.map(event => event.type === 'CardPlayed' && event.hidden
      ? { type: event.type, actorId: event.actorId, playerIdx: event.playerIdx,
          hidden: true, sequence: event.sequence, eventIndex: event.eventIndex }
      : { ...event });
  }
  return Object.freeze({ apply, publicEvents });
});
