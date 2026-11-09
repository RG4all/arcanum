/**
 * Arcanum · Spiel-Engine (Browser-Zustandsmaschine)
 * =================================================================
 * Diese Datei verbindet den reinen Regelkern (`js/rules.js`) mit dem
 * Browser: Timer, Bot-Züge, Spielerzustand und Darstellung.
 *
 * Schichten:
 *   1. Zustand          – Spieler, Runde, Stich, offene Modifikatoren
 *   2. Ablauf           – initGame → startRound → Bieten → Stiche → Wertung
 *   3. Effekte          – Hohepriesterin, Teufel, Kraft, Hofkarten-Segen …
 *   4. Darstellung      – renderUI() schreibt in bekannte DOM-Knoten
 *   5. HUD              – renderHud() schreibt in die Anzeigen der Arena
 *
 * Alle Regeln liegen in `ArcanumRules`; hier steht nur Orchestrierung.
 */
(function (global) {
  'use strict';

  const RULES = global.ArcanumRules;
  const CARDS = global.ArcanumCards;
  const FX = global.ArcanumFx;

  const PHASE = Object.freeze({
    LOBBY: 'lobby',
    BIDDING: 'bidding',
    PLAYING: 'playing',
    ROUND_OVER: 'roundOver',
    GAME_OVER: 'gameOver'
  });

  /**
   * Avatar-Identitäten aus `js/worlds.js`. Die Engine kennt nur IDs;
   * Porträt (2D) und Figur (3D) lesen dieselbe Palette.
   */
  function avatarIdentity(index, isBot) {
    const worlds = global.ArcanumWorlds;
    if (!worlds || !worlds.avatarForPlayer) return null;
    return worlds.avatarForPlayer(index, isBot);
  }

  /** Porträt-Markup für HUD, Gegnerliste und Podium. */
  function avatarMarkup(identity, suffix, size) {
    const avatars = global.ArcanumAvatars;
    if (!identity || !avatars) return '';
    const tone = identity.ui.accent;
    return `<span class="avatar-frame" style="--avatar-accent:${tone};--avatar-glow:${identity.ui.glow}">${avatars.portrait(identity, { suffix, size: size || 64 })}</span>`;
  }

  const BOT_DELAY = 620;
  const TRICK_DELAY = 900;
  const ROUND_DELAY = 2400;

  const GameEngine = {
    /* -------------------------------------------------------------- */
    /* Zustand                                                        */
    /* -------------------------------------------------------------- */
    numPlayers: 3,
    currentRound: 1,
    maxRounds: 5,
    phase: PHASE.BIDDING,
    players: [],
    currentTrick: [],
    leadSuit: null,
    activePlayerIdx: 0,
    activeOracle: null,
    timers: [],
    forcedPlayer: null,
    trumpBan: null,
    lastTrick: null,
    rng: RULES.createRng(null),
    seed: null,
    /** Letzte Zusammenfassung je Spieler:in für HUD und Chronik. */
    roundSummary: [],

    /* -------------------------------------------------------------- */
    /* Timer                                                          */
    /* -------------------------------------------------------------- */

    schedule(callback, delay) {
      const id = setTimeout(() => {
        this.timers = this.timers.filter(timer => timer !== id);
        callback();
      }, delay);
      this.timers.push(id);
      return id;
    },

    clearTimers() {
      this.timers.forEach(clearTimeout);
      this.timers = [];
    },

    /* -------------------------------------------------------------- */
    /* Setup                                                          */
    /* -------------------------------------------------------------- */

    get mode() {
      return global.currentActiveMode || 'turbo';
    },

    get playerCount() {
      return this.players.length || this.numPlayers;
    },

    cardsPerPlayer() {
      return RULES.cardsPerPlayer(this.mode, this.currentRound);
    },

    /** Baut ein frisches 78-Karten-Deck (gemischt, optional mit Seed). */
    generateUniqueDeck() {
      return RULES.createDeck(this.rng);
    },

    initGame(numPlayers = 3) {
      this.clearTimers();
      this.numPlayers = Math.min(RULES.CONFIG.players.max, Math.max(RULES.CONFIG.players.min, parseInt(numPlayers, 10) || 3));
      this.currentRound = 1;
      this.maxRounds = RULES.maxRounds(this.mode);
      const hero = avatarIdentity(0, false);
      this.players = [{
        id: 0, name: hero ? `Du (${hero.label} 1)` : 'Du (Adept 1)',
        isBot: false, hand: [], bid: 0, won: 0, score: 0,
        avatar: hero ? hero.id : 'adept'
      }];
      for (let i = 1; i < this.numPlayers; i++) {
        const identity = avatarIdentity(i, true);
        this.players.push({
          id: i,
          name: identity ? `${identity.label} ${i}` : `Bot ${i}`,
          isBot: true, hand: [], bid: 0, won: 0, score: 0,
          avatar: identity ? identity.id : null
        });
      }
      this.lastTrick = null;
      this.roundSummary = [];
      this.hidePodium();

      if (global.GameEngine3D && global.GameEngine3D.scene) {
        global.GameEngine3D.spawnHumanoidAvatars(this.numPlayers);
      }
      this.clearLog();
      this.log('🔮 Das Ritual beginnt. Wähle deine Vision.');
      this.startRound();
    },

    /** Startet eine neue Runde: geben, Orakel ziehen, Bieten eröffnen. */
    startRound() {
      this.phase = PHASE.BIDDING;
      this.currentTrick = [];
      this.leadSuit = null;
      this.forcedPlayer = null;
      this.trumpBan = null;
      this.lastTrick = null;

      const cardsEach = this.cardsPerPlayer();
      this.players.forEach(player => {
        player.hand = [];
        player.bid = 0;
        player.won = 0;
        player.roundPoints = 0;
        player.courtKarma = 0;
      });

      const deal = RULES.deal({
        deck: RULES.createDeck(this.rng),
        playerCount: this.players.length,
        cardsEach
      });
      this.players.forEach((player, index) => {
        player.hand = CARDS.sortHand(deal.hands[index]);
      });
      this.deckRemainder = deal.remainder.length;

      this.activeOracle = RULES.MODES[this.mode].oracle ? RULES.pickOracle(this.rng) : null;

      this.log(`🔮 Runde ${this.currentRound} · ${cardsEach} Karten · ${this.players.length} Spielende.`);
      if (this.activeOracle) this.log(`🌌 Weltgesetz: ${this.activeOracle.title}`);
      this.renderUI();
      this.renderHud();
      this.emit('round-started', { round: this.currentRound });
    },

    /* -------------------------------------------------------------- */
    /* Bieten                                                         */
    /* -------------------------------------------------------------- */

    submitHumanBid(bid) {
      if (this.phase !== PHASE.BIDDING) return;
      this.players[0].bid = Math.max(0, Math.min(this.cardsPerPlayer(), parseInt(bid, 10) || 0));
      this.bidForBots();
      this.beginPlaying();
    },

    /**
     * Bot-Heuristik: Trümpfe, halbe Hofkarten und hohe Farbkarten.
     * Eine Null-Ansage geben Bots nur mit wirklich schwacher Hand ab
     * (kein Trumpf, keine Karte ab Rang 12) – sonst verschenken sie Karma.
     */
    estimateBotBid(hand) {
      const trumps = hand.filter(card => card.isTrump).length;
      const courts = hand.filter(card => Boolean(card.court)).length;
      const highMinor = hand.filter(card => !card.isTrump && card.value >= 12).length;
      const raw = trumps + Math.round(courts * 0.35) + Math.round(highMinor * 0.3);
      const weak = trumps === 0 && highMinor === 0;
      const minimum = weak ? 0 : 1;
      return Math.max(minimum, Math.min(hand.length, raw));
    },

    bidForBots() {
      this.players.slice(1).forEach(bot => {
        bot.bid = this.estimateBotBid(bot.hand);
      });
      this.log(`🎯 Visionen: ${this.players.map(player => `${player.name} ${player.bid}`).join(' · ')}`);
    },

    beginPlaying() {
      this.phase = PHASE.PLAYING;
      this.activePlayerIdx = (this.currentRound - 1) % this.players.length;
      this.log(`⚔️ Anspiel: ${this.players[this.activePlayerIdx].name}`);
      this.renderUI();
      this.renderHud();
      if (this.players[this.activePlayerIdx].isBot) {
        this.schedule(() => this.playBotTurn(), BOT_DELAY);
      }
    },

    /* -------------------------------------------------------------- */
    /* Züge                                                           */
    /* -------------------------------------------------------------- */

    /** Kontext für Bedienpflicht, Kraftverbot und Teufel. */
    constraintContext(playerIdx) {
      return {
        leadSuit: this.leadSuit,
        freeLead: this.activeOracle?.uid === 'major-4',
        trumpBan: this.trumpBan === playerIdx,
        mustPlayHighest: this.forcedPlayer === playerIdx
      };
    },

    legalCardIndices(playerIdx) {
      const player = this.players[playerIdx];
      if (!player) return [];
      return RULES.legalCardIndices(player.hand, this.constraintContext(playerIdx));
    },

    playCard(playerIdx, cardIdx) {
      if (this.phase !== PHASE.PLAYING) return;
      if (this.currentTrick.length >= this.players.length) return;
      if (playerIdx !== this.activePlayerIdx) return;
      const player = this.players[playerIdx];
      const card = player.hand[cardIdx];
      if (!card) return;
      if (!this.legalCardIndices(playerIdx).includes(cardIdx)) {
        if (!player.isBot) {
          this.log(`⚠️ ${RULES.describeConstraint(player.hand, this.constraintContext(playerIdx))}`);
          this.pulseStatus('Diese Karte ist wegen Bedienpflicht oder eines Spezialeffekts nicht zulässig.', 'warn');
        }
        return;
      }

      if (this.forcedPlayer === playerIdx) this.forcedPlayer = null;
      if (this.trumpBan === playerIdx) this.trumpBan = null;

      player.hand.splice(cardIdx, 1);
      if (this.currentTrick.length === 0 && !card.isTrump) this.leadSuit = card.suit;

      const hidden = this.mode === 'standard' && card.isTrump && card.trumpNum === 18;
      this.currentTrick.push({ playerIdx, card, hidden });
      this.log(`🃏 ${player.name}: ${hidden ? 'verdeckte Karte (Mond)' : card.name}`);

      // Der Teufel wirkt sofort; ein bereits liegender Hierophant hebt ihn auf.
      if (this.mode === 'standard' && card.isTrump && card.trumpNum === 15 &&
          !this.currentTrick.some(item => item.card.isTrump && item.card.trumpNum === 5) &&
          this.currentTrick.length < this.players.length) {
        this.forcedPlayer = (playerIdx + 1) % this.players.length;
        this.log('🔥 Der Teufel zwingt zur höchsten zulässigen Karte.');
      }

      if (this.currentTrick.length === this.players.length) {
        this.renderUI();
        this.renderHud();
        this.schedule(() => this.evaluateTrick(), TRICK_DELAY);
      } else {
        this.activePlayerIdx = (this.activePlayerIdx + 1) % this.players.length;
        this.renderUI();
        this.renderHud();
        this.emit('card-played', { playerIdx, card });
        if (this.players[this.activePlayerIdx].isBot) this.schedule(() => this.playBotTurn(), BOT_DELAY);
      }
    },

    /** Bots wählen die höchste zulässige Karte, die nicht unnötig Trumpf verbrennt. */
    playBotTurn() {
      const botIdx = this.activePlayerIdx;
      const bot = this.players[botIdx];
      if (!bot || !bot.isBot || this.phase !== PHASE.PLAYING) return;
      const legal = this.legalCardIndices(botIdx);
      if (!legal.length) return;
      const cards = legal.map(index => bot.hand[index]);
      const nonTrumps = legal.filter((index, position) => !cards[position].isTrump);
      const pool = nonTrumps.length ? nonTrumps : legal;
      // Höchster Wert im Pool: gewinnt den Stich, ohne unnötig Trümpfe zu opfern.
      let bestIdx = pool[0];
      pool.forEach(index => {
        if (bot.hand[index].value > bot.hand[bestIdx].value) bestIdx = index;
      });
      this.playCard(botIdx, bestIdx);
    },

    /* -------------------------------------------------------------- */
    /* Stichauswertung                                                */
    /* -------------------------------------------------------------- */

    evaluateTrick() {
      if (this.currentTrick.length !== this.players.length) return;
      const result = RULES.resolveTrick(this.currentTrick, {
        leadSuit: this.leadSuit,
        oracleUid: this.activeOracle?.uid || null,
        mode: this.mode,
        playerCount: this.players.length
      });
      this.lastTrick = { ...result, cards: this.currentTrick.slice() };

      this.announceTrick(result);
      if (!result.cancelled) this.applyTrickEffects(result);

      this.currentTrick = [];
      this.leadSuit = null;
      this.forcedPlayer = null;
      this.activePlayerIdx = result.winnerIdx;

      if (this.players[0].hand.length === 0) {
        this.evaluateRoundScores();
        return;
      }
      this.renderUI();
      this.renderHud();
      this.emit('trick-won', result);
      if (this.players[this.activePlayerIdx].isBot) this.schedule(() => this.playBotTurn(), BOT_DELAY);
    },

    announceTrick(result) {
      const winner = this.players[result.winnerIdx];
      if (result.moonRevealed) this.log('🌙 Der Mond wird aufgedeckt.');
      if (result.cancelled) this.log('📜 Der Hierophant annulliert die Karteneffekte dieses Stichs.');
      if (result.foolBeatWorld) this.log('✨ Der Narr entthront die Welt!');
      if (result.destroyed) this.log('💥 Der Turm vernichtet den Stich.');
      else if (result.deathHalf) this.log(`💀 Der Tod halbiert den Stich: ${winner.name} erhält 0,5 Stiche.`);
      else this.log(`🏆 ${winner.name} gewinnt den Stich.`);
      if (result.loversPartner != null) {
        this.log(`💖 ${this.players[result.loversPartner].name} teilt den Stich als Partner:in.`);
      }
    },

    /** Wendet Stichwahrscheinlichkeits-Effekte auf den Spielzustand an. */
    applyTrickEffects(result) {
      const winner = this.players[result.winnerIdx];
      winner.won += result.won;
      if (result.loversPartner != null) this.players[result.loversPartner].won += result.won;

      if (result.justiceTargets.length) {
        result.justiceTargets.forEach(playerIdx => {
          this.players[playerIdx].score += 5;
          this.players[playerIdx].bonus = (this.players[playerIdx].bonus || 0) + 5;
          this.log(`⚖️ ${this.players[playerIdx].name} erhält 5 Bonuspunkte (Gerechtigkeit).`);
        });
      }

      if (result.courtKarma) {
        winner.courtKarma = (winner.courtKarma || 0) + result.courtKarma;
        this.log(`👑 Hofkarten-Segen: +${result.courtKarma} Karma für ${winner.name}.`);
      }

      if (result.priestess) this.resolvePriestess(winner);
      if (result.strengthPlayer != null) {
        this.trumpBan = result.strengthPlayer;
        this.log(`🦁 ${this.players[result.strengthPlayer].name} darf im nächsten Stich keinen Trumpf legen.`);
      }
    },

    /**
     * Hohepriesterin: Gebot des Siegers um genau eins korrigieren.
     * An den Grenzen 0 und Kartenanzahl ist nur die Gegenrichtung möglich.
     */
    resolvePriestess(player) {
      const limit = this.cardsPerPlayer();
      let delta;
      if (player.bid >= limit) delta = -1;
      else if (player.bid <= 0) delta = 1;
      else if (player.isBot) delta = 1;
      else {
        const increase = global.confirm
          ? global.confirm('Hohepriesterin: OK erhöht dein Gebot um 1, Abbrechen senkt es um 1.')
          : true;
        delta = increase ? 1 : -1;
      }
      player.bid = Math.max(0, Math.min(limit, player.bid + delta));
      this.log(`🌙 ${player.name} korrigiert das Gebot auf ${player.bid}.`);
    },

    /* -------------------------------------------------------------- */
    /* Runden- und Spielwertung                                       */
    /* -------------------------------------------------------------- */

    evaluateRoundScores() {
      this.phase = PHASE.ROUND_OVER;
      this.log(`🏁 Runde ${this.currentRound} beendet.`);
      this.roundSummary = [];

      this.players.forEach(player => {
        const score = RULES.scoreRound({
          mode: this.mode,
          bid: player.bid,
          won: player.won,
          oracleUid: this.activeOracle?.uid || null,
          courtKarma: player.courtKarma || 0
        });
        player.roundPoints = score.points;
        player.score += score.points;
        player.bonus = 0;
        this.roundSummary.push({ id: player.id, name: player.name, ...score });
        this.log(`📊 ${player.name}: Gebot ${player.bid} · ${RULES.formatNumber(player.won)} Stiche → ${score.points >= 0 ? '+' : ''}${score.points} (Gesamt ${player.score})`);
      });

      this.renderUI();
      this.renderHud();
      this.emit('round-scored', { round: this.currentRound, summary: this.roundSummary });

      if (this.currentRound < this.maxRounds) {
        this.currentRound++;
        this.schedule(() => this.startRound(), ROUND_DELAY);
      } else {
        this.phase = PHASE.GAME_OVER;
        this.log('👑 Das Ritual ist vollendet. Der Endstand steht.');
        this.showPodium();
      }
    },

    ranking() {
      return [...this.players].sort((a, b) => b.score - a.score || a.id - b.id);
    },

    /* -------------------------------------------------------------- */
    /* Podium                                                         */
    /* -------------------------------------------------------------- */

    showPodium() {
      const ranking = this.ranking();
      [1, 2, 3].forEach(place => {
        const player = ranking[place - 1];
        const avatarEl = document.getElementById(`podium-${place}-avatar`);
        if (avatarEl) {
          if (player && typeof player.id === 'number') {
            const identity = avatarIdentity(player.id, Boolean(player.isBot));
            avatarEl.innerHTML = identity ? avatarMarkup(identity, `podium-${place}`, 78) : '';
          } else {
            avatarEl.innerHTML = '';
          }
        }
        const nameEl = document.getElementById(`podium-${place}-name`);
        const scoreEl = document.getElementById(`podium-${place}-score`);
        if (nameEl) nameEl.textContent = player ? player.name : '–';
        if (scoreEl) scoreEl.textContent = player ? `${player.score} Karma` : '0 Karma';
        const card = document.getElementById(`podium-${place}`);
        if (card) {
          card.classList.remove('animate-podium-1', 'animate-podium-2', 'animate-podium-3');
          void card.offsetWidth;
          card.classList.add(`animate-podium-${place}`);
        }
      });

      const overlay = document.getElementById('game-podium-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.focus();
        if (document.body) document.body.style.overflow = 'hidden';
        const canvas = document.getElementById('podium-confetti');
        if (canvas && FX) {
          if (this.confettiStop) this.confettiStop();
          this.confettiStop = FX.confetti(canvas, { count: 110 });
        }
      }
      this.renderHud();
    },

    hidePodium() {
      const overlay = document.getElementById('game-podium-overlay');
      if (!overlay) return;
      const wasOpen = overlay.getAttribute('aria-hidden') === 'false';
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      if (wasOpen && document.body) document.body.style.removeProperty('overflow');
      if (this.confettiStop) {
        this.confettiStop();
        this.confettiStop = null;
      }
    },

    /* -------------------------------------------------------------- */
    /* Chronik & Statusmeldungen                                      */
    /* -------------------------------------------------------------- */

    log(message) {
      const logBox = document.getElementById('game-log');
      if (!logBox) return;
      const line = document.createElement('div');
      line.className = 'log-line';
      line.textContent = message;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
      while (logBox.children.length > 120) logBox.removeChild(logBox.firstChild);
    },

    clearLog() {
      const logBox = document.getElementById('game-log');
      if (logBox) logBox.innerHTML = '';
    },

    pulseStatus(message, tone) {
      const region = document.getElementById('game-toast');
      if (!region) return;
      region.textContent = message;
      region.dataset.tone = tone || 'info';
      region.classList.add('is-visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => region.classList.remove('is-visible'), 3200);
    },

    emit(name, detail) {
      if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
      document.dispatchEvent(new CustomEvent(`arcanum:${name}`, { detail }));
    },

    /* -------------------------------------------------------------- */
    /* Darstellung                                                    */
    /* -------------------------------------------------------------- */

    /**
     * Platzhalterkarte für den verdeckten Mond. Sie ist eine reguläre
     * Kartenbeschreibung, damit Kartenkunst und Markup ohne Sonderpfad
     * funktionieren; das Motiv bleibt die Rückseite.
     */
    concealedCard() {
      return CARDS.CONCEALED_CARD;
    },

    renderUI() {
      const cardsCount = this.cardsPerPlayer();
      const human = this.players[0] || { hand: [], bid: 0, won: 0, score: 0 };

      if (global.GameEngine3D && typeof global.GameEngine3D.setActivePlayer === 'function') {
        global.GameEngine3D.setActivePlayer(this.phase === PHASE.PLAYING ? this.activePlayerIdx : -1);
      }

      // Gegnerleiste
      const botStatusBox = document.getElementById('game-bots-status');
      if (botStatusBox) {
        botStatusBox.innerHTML = this.players.slice(1).map(bot => {
          const active = this.activePlayerIdx === bot.id && this.phase === PHASE.PLAYING;
          const identity = avatarIdentity(bot.id, true);
          return `
            <div class="bot-chip${active ? ' is-active' : ''}" role="listitem">
              ${identity ? avatarMarkup(identity, `chip-${bot.id}`, 34) : ''}
              <span class="bot-chip__body">
                <span class="bot-chip__name">${bot.name}</span>
                <span class="bot-chip__row"><span>Gebot</span><b>${bot.bid}</b><span>Stiche</span><b>${RULES.formatNumber(bot.won)}</b></span>
                <span class="bot-chip__karma" data-value="${bot.score}">${bot.score} Karma</span>
              </span>
            </div>`;
        }).join('');
      }

      // Stichkarten
      const trickContainer = document.getElementById('trick-cards-container');
      if (trickContainer) {
        trickContainer.innerHTML = this.currentTrick.map((item, index) => {
          const concealed = item.hidden && this.currentTrick.length < this.players.length;
          const shown = concealed ? this.concealedCard() : item.card;
          return this.cardMarkup(shown, {
            owner: this.players[item.playerIdx].name,
            extraClass: `card-on-table card-stacked card-enter stagger-${Math.min(index, 5)}`,
            ownerLabel: true
          });
        }).join('');
      }

      // Eigene Hand
      const handContainer = document.getElementById('game-human-hand');
      if (handContainer) {
        const isMyTurn = this.activePlayerIdx === 0 && this.phase === PHASE.PLAYING;
        const legal = isMyTurn ? this.legalCardIndices(0) : [];
        handContainer.innerHTML = human.hand.map((card, index) => {
          const playable = isMyTurn && legal.includes(index);
          const blocked = isMyTurn && !playable;
          return card.isTrump || card.court || card.rank
            ? this.cardMarkup(card, {
              tag: 'button',
              attributes: playable ? `type="button" data-card-index="${index}"` : `type="button" disabled data-card-index="${index}"`,
              extraClass: `hand-card${playable ? ' is-playable' : ''}${blocked ? ' is-blocked' : ''}`
            })
            : '';
        }).join('');
        if (typeof global.updateHandLayout === 'function') global.updateHandLayout();
      }

      // Bieten
      const bidControls = document.getElementById('game-bidding-controls');
      if (bidControls) {
        bidControls.classList.toggle('hidden', this.phase !== PHASE.BIDDING);
        const bidButtons = document.getElementById('game-bid-buttons');
        if (bidButtons && this.phase === PHASE.BIDDING) {
          bidButtons.innerHTML = Array.from({ length: cardsCount + 1 }, (_, value) => `
            <button type="button" class="bid-button" data-bid="${value}" aria-label="Vision ${value} ansagen">
              <span class="bid-button__value">${value}</span>
            </button>`).join('');
        }
      }

      // Gebotshinweis in der Spielerzeile
      const bidInfo = document.getElementById('game-human-bids-info');
      if (bidInfo) {
        bidInfo.textContent = this.phase === PHASE.BIDDING
          ? 'Wähle deine Vision'
          : `Vision ${human.bid} · ${RULES.formatNumber(human.won)} von ${this.cardsPerPlayer()} Stichen`;
      }

      const hint = document.getElementById('game-constraint-info');
      if (hint) {
        const message = this.phase === PHASE.PLAYING ? RULES.describeConstraint(human.hand, this.constraintContext(0)) : '';
        hint.textContent = message;
        hint.classList.toggle('is-visible', Boolean(message));
      }
    },

    /**
     * Einheitliches Kartenmarkup für Hand und Stich.
     * Die Kunst kommt aus `ArcanumCardArt`, die Daten aus `ArcanumCards`.
     */
    cardMarkup(card, options) {
      const opts = options || {};
      const tag = opts.tag || 'div';
      const faceSvg = global.ArcanumCardArt ? global.ArcanumCardArt.face(card) : '';
      const classes = ['arc-card', CARDS.cardArtClass(card), opts.extraClass || ''].filter(Boolean).join(' ');
      const label = `${opts.owner ? `${opts.owner}: ` : ''}${card.name}. ${card.desc || ''}`;
      const attrs = opts.attributes ? ` ${opts.attributes}` : '';
      const owner = opts.ownerLabel ? `<span class="arc-card__owner">${opts.owner}</span>` : '';
      const tooltip = (card.desc || '').replace(/"/g, '&quot;');
      // Der Mondschleier ist ein gezeichnetes Sigill, kein Emoji.
      const veilSigil = global.ArcanumAvatars
        ? global.ArcanumAvatars.sigil('moon', { size: 26, color: '#f3e6bd' })
        : '';
      const hiddenBadge = card.concealed
        ? `<span class="arc-card__veil" aria-hidden="true">${veilSigil}</span>`
        : '';
      return `<${tag}${attrs} class="${classes}" data-tooltip="${tooltip}" data-hint="card" data-uid="${card.uid}" aria-label="${label.replace(/"/g, '&quot;')}">
        ${owner}
        <span class="arc-card__frame" aria-hidden="true">${faceSvg}</span>
        ${hiddenBadge}
      </${tag}>`;
    },

    /* -------------------------------------------------------------- */
    /* HUD                                                            */
    /* -------------------------------------------------------------- */

    renderHud() {
      const human = this.players[0];
      const activePlayer = this.players[this.activePlayerIdx];
      const cardsCount = this.cardsPerPlayer();

      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      // Runde / Fortschritt
      setText('hud-round', `${this.currentRound}`);
      setText('hud-round-total', `/ ${this.maxRounds}`);
      setText('hud-round-cards', `${cardsCount} Karten · ${this.players.length} Spielende`);
      const progress = document.getElementById('hud-round-progress');
      if (progress) {
        const pct = Math.max(0, Math.min(100, (this.currentRound / this.maxRounds) * 100));
        progress.style.setProperty('--progress', `${pct}%`);
      }

      // Phase
      const phaseLabel = {
        [PHASE.BIDDING]: 'Vision (Bieten)',
        [PHASE.PLAYING]: activePlayer ? `Am Zug: ${activePlayer.name}` : 'Am Zug',
        [PHASE.ROUND_OVER]: 'Auswertung',
        [PHASE.GAME_OVER]: 'Vollendet'
      }[this.phase] || this.phase;
      setText('hud-phase', phaseLabel);
      setText('hud-phase-detail', this.phase === PHASE.PLAYING && activePlayer ? `Stich ${this.cardsPerPlayer() - (human.hand.length || 0) + 1}` : '');
      const phaseTile = document.getElementById('hud-phase-tile');
      if (phaseTile) phaseTile.dataset.phase = this.phase;
      setText('hud-round-info', `Runde ${this.currentRound} · ${cardsCount} Karten`);

      // Orakel
      const oracleBox = document.getElementById('hud-oracle');
      if (oracleBox) {
        if (this.activeOracle) {
          oracleBox.innerHTML = `<span class="hud-oracle__icon" aria-hidden="true">✦</span>
            <span class="hud-oracle__text"><b>${this.activeOracle.title}</b><small>${this.activeOracle.short}</small></span>`;
          oracleBox.dataset.active = 'true';
        } else {
          oracleBox.innerHTML = `<span class="hud-oracle__icon" aria-hidden="true">◌</span>
            <span class="hud-oracle__text"><b>Kein Orakel</b><small>Turbo-Modus: reine Zahlenhierarchie</small></span>`;
          oracleBox.dataset.active = 'false';
        }
      }

      // Porträt der Spieler:in neben dem Karmawert
      const hudAvatar = document.getElementById('hud-avatar');
      if (hudAvatar && human) {
        const identity = avatarIdentity(0, false);
        if (identity && hudAvatar.dataset.avatar !== identity.id) {
          hudAvatar.dataset.avatar = identity.id;
          hudAvatar.innerHTML = avatarMarkup(identity, 'hud', 62);
          hudAvatar.dataset.hint = 'karma';
          hudAvatar.setAttribute('data-hint-title', `Dein Avatar: ${identity.label}`);
        }
      }
      const panelAvatar = document.getElementById('user-avatar-badge');
      if (panelAvatar && human) {
        const identity = avatarIdentity(0, false);
        if (identity && panelAvatar.dataset.avatar !== identity.id) {
          panelAvatar.dataset.avatar = identity.id;
          panelAvatar.innerHTML = avatarMarkup(identity, 'panel', 58);
        }
      }

      // Spielerwerte
      if (human) {
        this.setKarma('hud-karma', human.score);
        const panelScore = document.querySelector('#game-human-score b');
        if (panelScore) panelScore.textContent = String(human.score);
        setText('hud-bid', `${human.bid}`);
        setText('hud-won', RULES.formatNumber(human.won));
        setText('hud-cards-left', `${human.hand.length}`);
        setText('hud-name', human.name);
        const targetEl = document.getElementById('hud-target');
        if (targetEl) {
          const remaining = RULES.maxBid(this.mode, this.currentRound) - human.won;
          targetEl.textContent = human.bid === 0
            ? (human.won === 0 ? 'Null-Ansage gehalten' : 'Null-Ansage gefährdet')
            : human.won === human.bid
              ? 'Vision erfüllt'
              : `noch ${RULES.formatNumber(Math.abs(human.bid - human.won))} ${human.won > human.bid ? 'zu viel' : 'nötig'}`;
        }
      }

      // Gegnerkarma
      const opponentList = document.getElementById('hud-opponents');
      if (opponentList) {
        opponentList.innerHTML = this.players.slice(1).map(bot => {
          const active = this.activePlayerIdx === bot.id && this.phase === PHASE.PLAYING;
          const identity = avatarIdentity(bot.id, true);
          const scoreSide = active ? 'is-active' : bot.won === bot.bid && bot.bid > 0 ? 'is-met' : bot.won > bot.bid ? 'is-over' : '';
          return `<li class="hud-opponent${active ? ' is-active' : ''}">
            ${identity ? avatarMarkup(identity, `opp-${bot.id}`, 44) : ''}
            <span class="hud-opponent__body">
              <span class="hud-opponent__name">${bot.name}</span>
              <span class="hud-opponent__meta">Gebot ${bot.bid} · ${RULES.formatNumber(bot.won)} Stiche</span>
            </span>
            <span class="hud-opponent__karma ${scoreSide}" data-value="${bot.score}">${bot.score}</span>
          </li>`;
        }).join('');
      }

      // Rundenbilanz
      const summaryEl = document.getElementById('hud-round-summary');
      if (summaryEl) {
        const rows = this.roundSummary.length
          ? this.roundSummary.map(row => `
              <li class="hud-summary-row">
                <span class="hud-summary-row__name">${row.name}</span>
                <span class="hud-summary-row__delta ${row.points >= 0 ? 'is-positive' : 'is-negative'}">${row.points >= 0 ? '+' : ''}${row.points}</span>
                <span class="hud-summary-row__detail">${row.breakdown[0] || ''}</span>
              </li>`).join('')
          : `<li class="hud-summary-row is-empty">Die Bilanz erscheint nach der ersten Runde.</li>`;
        summaryEl.innerHTML = rows;
      }

      const tally = document.getElementById('hud-trick-tally');
      if (tally) {
        tally.innerHTML = this.players.map(player => `
          <li class="hud-tally__item${player.id === this.activePlayerIdx && this.phase === PHASE.PLAYING ? ' is-active' : ''}">
            <span class="hud-tally__name">${player.name}</span>
            <span class="hud-tally__bar"><i style="--fill:${Math.min(100, (player.won / Math.max(1, this.cardsPerPlayer())) * 100)}%"></i></span>
            <span class="hud-tally__value">${RULES.formatNumber(player.won)}/${player.bid}</span>
          </li>`).join('');
      }
    },

    setKarma(id, value) {
      const element = document.getElementById(id);
      if (!element) return;
      if (FX && FX.scoreCounter) {
        FX.scoreCounter(element, value, { format: current => `${Math.round(current)}` });
      } else {
        element.textContent = String(value);
        element.dataset.value = String(value);
      }
    },

    /* -------------------------------------------------------------- */
    /* Serialisierung (Grundlage für Persistenz/Server)                */
    /* -------------------------------------------------------------- */

    /** Kompakter, versionierter Spielstand – ohne DOM-Abhängigkeiten. */
    serialize() {
      return {
        schema: RULES.STATE_SCHEMA_VERSION,
        ruleset: RULES.RULESET_VERSION,
        mode: this.mode,
        numPlayers: this.players.length,
        round: this.currentRound,
        maxRounds: this.maxRounds,
        phase: this.phase,
        activePlayerIdx: this.activePlayerIdx,
        leadSuit: this.leadSuit,
        oracle: this.activeOracle ? this.activeOracle.uid : null,
        trick: this.currentTrick.map(item => ({ playerIdx: item.playerIdx, uid: item.card.uid, hidden: Boolean(item.hidden) }))
      };
    }
  };

  GameEngine.PHASE = PHASE;
  global.GameEngine = GameEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
