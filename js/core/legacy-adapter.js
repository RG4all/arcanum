/**
 * ARCANUM · browser compatibility adapter for the deterministic multiplayer core.
 * This is a UI/timer adapter only; the DOM-free reducer owns all state transitions.
 * Install after engine.js and before app.js.
 */
(function (global) {
  'use strict';
  const engine = global.GameEngine;
  const stateApi = global.ArcanumGameState;
  const reducer = global.ArcanumGameReducer;
  const commands = global.ArcanumGameCommands;
  const rules = global.ArcanumRules;
  const cards = global.ArcanumCards;
  if (!engine || !stateApi || !reducer || !commands || !rules || !cards) {
    throw new Error('ARCANUM multiplayer core: fehlende Module oder falsche Script-Reihenfolge');
  }
  const previousInit = engine.initGame;
  const env = { rules, cards };

  function newSeed(engineInstance) {
    if (Number.isInteger(engineInstance.seed) && engineInstance.seed >= 0 &&
        engineInstance.seed <= 0xffffffff) return engineInstance.seed;
    const cryptoApi = global.crypto;
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const random = new Uint32Array(1);
      cryptoApi.getRandomValues(random);
      return random[0];
    }
    // Private/unranked offline games only; cryptographic randomness is not implied.
    return (Math.random() * 0x100000000) >>> 0;
  }

  function sync(engineInstance) {
    const state = engineInstance.coreState;
    const previous = new Map(engineInstance.players.map(p => [String(p.id), p]));
    engineInstance.players = state.players.map((player, index) => {
      const old = previous.get(player.id) || {};
      return {
        ...old,
        id: index,
        name: old.name || `Spieler ${index + 1}`,
        isBot: Boolean(old.isBot),
        hand: player.hand.map(uid => {
          const card = cards.DECK_BY_UID[uid];
          if (!card) throw new Error('Unbekannte Karte im Core-Zustand: ' + uid);
          return card;
        }),
        bid: player.bid == null ? 0 : player.bid,
        won: player.won,
        score: player.score,
        courtKarma: player.courtKarma,
        bonus: player.bonus,
        roundPoints: player.roundPoints || 0
      };
    });
    engineInstance.currentRound = state.round;
    engineInstance.maxRounds = state.maxRounds;
    engineInstance.phase = state.phase;
    engineInstance.activePlayerIdx = state.activePlayerIdx;
    engineInstance.leadSuit = state.leadSuit;
    engineInstance.activeOracle = state.oracleUid ? cards.EFFECTS[state.oracleUid] : null;
    engineInstance.forcedPlayer = state.forcedPlayer;
    engineInstance.trumpBan = state.trumpBan;
    engineInstance.currentTrick = state.currentTrick.map(item => ({
      playerIdx: item.playerIdx, card: cards.DECK_BY_UID[item.uid], hidden: item.hidden
    }));
    engineInstance.lastTrick = state.lastTrick ? {
      winnerIdx: state.lastTrick.winnerIdx,
      won: state.lastTrick.won,
      cards: state.lastTrick.cards.map(item => ({
        playerIdx: item.playerIdx, card: cards.DECK_BY_UID[item.uid], hidden: item.hidden
      }))
    } : null;
    engineInstance.roundSummary = state.roundSummary.map(item => ({
      id: engineInstance.players.findIndex(p => String(p.id) === item.playerId),
      name: engineInstance.players.find(p => String(p.id) === item.playerId)?.name || item.playerId,
      ...item
    }));
  }

  function dispatch(engineInstance, command) {
    const result = reducer.apply(engineInstance.coreState, {
      ...command,
      protocolVersion: commands.PROTOCOL_VERSION,
      sequence: engineInstance.coreState.sequence + 1
    }, env);
    engineInstance.coreState = result.state;
    sync(engineInstance);
    return result.events;
  }

  function render(engineInstance) {
    engineInstance.renderUI();
    engineInstance.renderHud();
  }

  function finish(engineInstance, events) {
    const scored = events.find(event => event.type === 'RoundScored');
    if (scored) {
      engineInstance.emit('round-scored', { round: engineInstance.currentRound, summary: engineInstance.roundSummary });
      if (engineInstance.phase === stateApi.PHASE.ROUND_OVER) {
        engineInstance.schedule(() => engineInstance.startRound(), 2400);
      } else if (engineInstance.phase === stateApi.PHASE.GAME_OVER) {
        engineInstance.showPodium();
      }
      return;
    }
    if (events.some(event => event.type === 'TrickResolved')) {
      engineInstance.emit('trick-won', events.find(event => event.type === 'TrickResolved'));
      if (engineInstance.phase === stateApi.PHASE.PLAYING &&
          engineInstance.players[engineInstance.activePlayerIdx]?.isBot) {
        engineInstance.schedule(() => engineInstance.playBotTurn(), 620);
      }
    }
  }

  engine.initGame = function (numPlayers) {
    this.coreState = null;
    this.clearTimers();
    // The old initializer sets names, avatars and UI scaffolding, then calls
    // this.startRound(), which is overridden below and uses the reducer.
    return previousInit.call(this, numPlayers);
  };

  engine.startRound = function () {
    if (!this.coreState) {
      this.coreState = stateApi.createGame({
        rules, cards, mode: this.mode,
        playerIds: this.players.map(p => String(p.id)),
        seed: newSeed(this)
      });
      dispatch(this, { type: commands.TYPES.START_ROUND });
    } else if (this.coreState.phase === stateApi.PHASE.ROUND_OVER) {
      dispatch(this, { type: commands.TYPES.NEXT_ROUND });
    } else {
      return; // prevents a double deal on stale round timers
    }
    this.log(`🔮 Runde ${this.currentRound} · ${this.cardsPerPlayer()} Karten · ${this.players.length} Spielende.`);
    if (this.activeOracle) this.log(`🌌 Weltgesetz: ${this.activeOracle.title}`);
    render(this);
    this.emit('round-started', { round: this.currentRound });
  };

  engine.submitHumanBid = function (bid) {
    if (!this.coreState || this.phase !== stateApi.PHASE.BIDDING) return;
    if (!Number.isInteger(Number(bid)) || Number(bid) < 0) return;
    const humanId = this.coreState.players[0].id;
    dispatch(this, { type: commands.TYPES.SUBMIT_BID, actorId: humanId, bid: Number(bid) });
    // All players use the same authoritative command API, including bots.
    while (this.coreState.phase === stateApi.PHASE.BIDDING) {
      const current = this.coreState.players[this.coreState.activePlayerIdx];
      const local = this.players[this.coreState.activePlayerIdx];
      if (!local.isBot) break;
      dispatch(this, { type: commands.TYPES.SUBMIT_BID,
        actorId: current.id, bid: this.estimateBotBid(local.hand) });
    }
    this.log(`🎯 Visionen: ${this.players.map(p => `${p.name} ${p.bid}`).join(' · ')}`);
    render(this);
    if (this.coreState.phase === stateApi.PHASE.PLAYING &&
        this.players[this.activePlayerIdx]?.isBot) {
      this.schedule(() => this.playBotTurn(), 620);
    }
  };

  engine.playCard = function (playerIdx, cardIdx) {
    if (!this.coreState || this.coreState.phase !== stateApi.PHASE.PLAYING) return;
    const player = this.players[playerIdx];
    const card = player?.hand[cardIdx];
    if (!card || this.activePlayerIdx !== playerIdx) return;
    const actorId = this.coreState.players[playerIdx].id;
    let events;
    try {
      events = dispatch(this, { type: commands.TYPES.PLAY_CARD, actorId, cardUid: card.uid });
    } catch (error) {
      if (!player.isBot) {
        this.log(`⚠️ ${error.message}`);
        this.pulseStatus('Dieser Spielzug ist nicht zulässig.', 'warn');
      }
      return;
    }
    this.log(`🃏 ${player.name}: ${card.name}`);
    const played = events.find(event => event.type === 'CardPlayed');
    if (played) this.emit('card-played', { playerIdx, card });

    if (this.coreState.phase === stateApi.PHASE.PRIESTESS) {
      const index = this.coreState.pendingPriestess.playerIdx;
      const chosen = this.players[index];
      const limit = this.cardsPerPlayer();
      let delta = chosen.bid >= limit ? -1 : 1;
      if (!chosen.isBot && chosen.bid > 0 && chosen.bid < limit &&
          typeof global.confirm === 'function') {
        delta = global.confirm('Hohepriesterin: OK erhöht dein Gebot um 1, Abbrechen senkt es um 1.') ? 1 : -1;
      }
      events = events.concat(dispatch(this, {
        type: commands.TYPES.CHOOSE_PRIESTESS,
        actorId: this.coreState.players[index].id, delta
      }));
    }
    render(this);
    finish(this, events);
    if (this.coreState.phase === stateApi.PHASE.PLAYING &&
        !events.some(event => event.type === 'TrickResolved') &&
        this.players[this.activePlayerIdx]?.isBot) {
      this.schedule(() => this.playBotTurn(), 620);
    }
  };

  // The reducer resolves a complete trick atomically with the final PLAY_CARD.
  engine.evaluateTrick = function () { return this.lastTrick; };
  engine.evaluateRoundScores = function () { return this.roundSummary; };

  engine.dispatchCore = function (command) {
    if (!this.coreState) throw new Error('Partie nicht gestartet');
    const events = dispatch(this, command);
    render(this);
    finish(this, events);
    return events;
  };

  engine.serialize = function () {
    if (!this.coreState) return null;
    return stateApi.snapshotFor(this.coreState, this.coreState.players[0].id);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
