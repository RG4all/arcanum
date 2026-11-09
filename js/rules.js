/**
 * Arcanum · Regelkern (Domänenlogik, DOM-frei)
 * =================================================================
 * Dieser Kern enthält ausschließlich reine Funktionen: kein DOM, kein
 * Three.js, keine Timer. Er ist damit in Node testbar und kann später
 * unverändert in einen serverautoritären Spielserver wandern.
 *
 * Aufrufer (Browser-Engine oder Tests) reichen einen Kartenstich und
 * einen Kontext herein und erhalten ein Ergebnisobjekt zurück.
 *
 * Öffentliche API: siehe `ArcanumRules` am Dateiende.
 */
(function (global) {
  'use strict';

  const CARDS = global.ArcanumCards;

  /** Version des Regelwerks – erhöhen, wenn sich Spielregeln ändern. */
  const RULESET_VERSION = '0.4.0';
  /** Version des serialisierbaren Spielstandformats. */
  const STATE_SCHEMA_VERSION = 1;

  /**
   * Zentrale Regelparameter. Alle Wertungskonstanten liegen hier,
   * damit UI, Rechner und Tests dieselbe Quelle nutzen.
   */
  const CONFIG = Object.freeze({
    players: { min: 2, max: 6 },
    modes: {
      turbo: Object.freeze({ label: 'Turbo', maxRounds: 5, baseCards: 4, oracle: false }),
      standard: Object.freeze({ label: 'Standard', maxRounds: 7, baseCards: 6, oracle: true })
    },
    scoring: Object.freeze({
      exactBase: 20,
      exactPerTrick: 10,
      nullBonus: 50,
      nullPenalty: -50,
      missPerTrick: 10,
      underbidRateStandard: 15,
      starBonus: 30,
      courtBlessing: true,
      courtBlessingModes: Object.freeze(['standard'])
    }),
    /** Rangordnung der Karten, siehe docs/ARCHITECTURE.md. */
    ranking: Object.freeze({
      foolAlwaysLoses: true,
      strengthWins: true,
      towerDestroys: true,
      deathHalves: true
    })
  });

  const MODES = CONFIG.modes;
  const SCORING = CONFIG.scoring;

  /* ---------------------------------------------------------------- */
  /* Deck und Verteilung                                               */
  /* ---------------------------------------------------------------- */

  /** Anzahl Karten pro Spieler:in in einer Runde. */
  function cardsPerPlayer(mode, round) {
    const config = MODES[mode] || MODES.turbo;
    return config.baseCards + Math.max(1, Math.min(config.maxRounds, Number(round) || 1));
  }

  function maxRounds(mode) {
    return (MODES[mode] || MODES.turbo).maxRounds;
  }

  /**
   * Deterministische Zufallsquelle (mulberry32). Ohne Seed wird
   * Math.random verwendet; mit Seed sind Partien reproduzierbar.
   */
  function createRng(seed) {
    if (seed == null) return { next: () => Math.random(), seed: null };
    let state = (Number(seed) >>> 0) || 1;
    return {
      seed: state,
      next() {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
    };
  }

  /** Fisher-Yates-Mischung; mutiert nicht, gibt eine neue Liste zurück. */
  function shuffle(cards, rng) {
    const random = (rng && rng.next) || Math.random;
    const result = [...cards];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function createDeck(rng) {
    return shuffle(CARDS.TAROT_DECK, rng);
  }

  /**
   * Teilt Karten reihum aus. Gibt Hände und den Reststapel zurück.
   * Karten sind unveränderliche Objekte (Object.freeze), daher genügt
   * das Kopieren der Listen.
   */
  function deal({ deck, playerCount, cardsEach }) {
    const count = Math.max(1, Math.min(CONFIG.players.max, Number(playerCount) || 3));
    const each = Math.max(1, Math.min(cardsEach, Math.floor(deck.length / count)));
    const hands = Array.from({ length: count }, () => []);
    let cursor = 0;
    for (let round = 0; round < each; round++) {
      for (let player = 0; player < count; player++) {
        hands[player].push(deck[cursor++]);
      }
    }
    return { hands, remainder: deck.slice(cursor), dealt: each };
  }

  /** Wählt ein Orakel für die Runde (nur Standard). */
  function pickOracle(rng) {
    const random = (rng && rng.next) || Math.random;
    const list = CARDS.ORACLE_UIDS.map(uid => CARDS.EFFECTS[uid]);
    return list[Math.floor(random() * list.length)];
  }

  /* ---------------------------------------------------------------- */
  /* Rangordnung                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Erzeugt die Rangfunktion eines Stichs.
   *
   * @param {object} context
   *   leadSuit   angespielte Farbe (null wenn Trumpf eröffnet hat)
   *   oracleUid  aktives Orakel (nur Standard) oder null
   *   cancelled  Hierophant liegt im Stich → reine Zahlenwerte
   * @returns {(card: object) => number} höherer Wert gewinnt
   */
  function createRanker(context) {
    const ctx = context || {};
    const leadSuit = ctx.leadSuit || null;
    const oracleUid = ctx.oracleUid || null;
    const cancelled = Boolean(ctx.cancelled);
    const maxMinor = Number.isFinite(ctx.maxMinor) ? ctx.maxMinor : 0;
    const wheel = oracleUid === 'major-10' && !cancelled;
    const empress = oracleUid === 'major-3' && !cancelled;

    return function rank(card) {
      if (!card) return -Infinity;

      // 1. Der Narr verliert immer gegen jede andere Karte – außer der
      //    Welt-Sonderfall greift (wird separat in resolveTrick geprüft).
      if (!cancelled && card.isTrump && card.trumpNum === 0) return -1000;

      // 2. Die Kraft gewinnt gegen alles (außer der Narr-Regel oben).
      if (!cancelled && card.isTrump && card.trumpNum === 11) return 5000;

      // 3. Der Magier zählt 0,5 über der höchsten Kleinen Arkana.
      //    Unter dem Rad gilt dieselbe Regel in der invertierten Skala.
      if (!cancelled && card.isTrump && card.trumpNum === 1) {
        return wheel ? 100 + (15 - maxMinor) + 0.5 : maxMinor + 0.5;
      }

      // 4. Rad des Schicksals: vollständig umgekehrte Hierarchie.
      if (wheel) {
        if (card.isTrump) return 22 - card.trumpNum;
        // Zwei ist die Krone, dann 3 … König, danach das Ass (14,5).
        return 100 + (15 - card.value);
      }

      // 5. Große Arkana schlagen Kleine Arkana.
      if (card.isTrump) return 200 + card.trumpNum;

      // 6. Herrscherin: Kelche werden zu niederen Trümpfen.
      if (empress && card.suit === 'Kelche') return 100 + card.value;

      // 7. Kleine Arkana: Farbe muss bedient werden, sonst wertlos.
      if (leadSuit && card.suit !== leadSuit) return -500 + card.value;
      return card.value;
    };
  }

  /* ---------------------------------------------------------------- */
  /* Zulässige Züge                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Zulässige Kartenindizes nach Bedienpflicht, Kraftverbot und Teufel.
   * Reine Funktion – identisch für Mensch und Bot.
   */
  function legalCardIndices(hand, context) {
    const ctx = context || {};
    if (!hand || !hand.length) return [];
    let indices = hand.map((_, index) => index);

    if (ctx.trumpBan) {
      const nonTrumps = indices.filter(i => !hand[i].isTrump);
      if (nonTrumps.length) indices = nonTrumps;
    }

    if (ctx.leadSuit && !ctx.freeLead) {
      const following = indices.filter(i => !hand[i].isTrump && hand[i].suit === ctx.leadSuit);
      if (following.length) {
        indices = indices.filter(i => hand[i].isTrump || hand[i].suit === ctx.leadSuit);
      }
    }

    if (ctx.mustPlayHighest && indices.length) {
      const highest = Math.max(...indices.map(i => hand[i].value));
      indices = indices.filter(i => hand[i].value === highest);
    }

    return indices;
  }

  /** Hinweise für die Oberfläche, warum Karten gesperrt sind. */
  function describeConstraint(hand, context) {
    if (!hand || !hand.length) return '';
    const ctx = context || {};
    const all = hand.length;
    const legal = legalCardIndices(hand, ctx).length;
    if (legal === all) return '';
    if (ctx.mustPlayHighest) return 'Der Teufel: höchste zulässige Karte ist Pflicht.';
    if (ctx.trumpBan) return 'Die Kraft: in diesem Zug darf kein Trumpf gelegt werden.';
    if (ctx.leadSuit) return `Bedienpflicht: ${ctx.leadSuit} muss bedient werden.`;
    return '';
  }

  /* ---------------------------------------------------------------- */
  /* Stichauflösung                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Wertet einen vollständigen Stich aus.
   *
   * @param {Array<{playerIdx:number, card:object, hidden?:boolean}>} trick
   * @param {object} context leadSuit, oracleUid, mode, playerCount
   * @returns {object} Ergebnis mit Sieger, Effekten und Stichwert
   */
  function resolveTrick(trick, context) {
    const ctx = context || {};
    const mode = ctx.mode || 'turbo';
    const standard = mode === 'standard';
    const oracleUid = standard ? (ctx.oracleUid || null) : null;
    const playerCount = ctx.playerCount || trick.length;

    const has = num => trick.some(item => item.card.isTrump && item.card.trumpNum === num);
    const find = num => trick.find(item => item.card.isTrump && item.card.trumpNum === num);
    const cancelled = standard && has(5);

    const minorValues = trick.filter(item => !item.card.isTrump).map(item => item.card.value);
    const maxMinor = minorValues.length ? Math.max(...minorValues) : 0;
    const rank = createRanker({ leadSuit: ctx.leadSuit || null, oracleUid, cancelled, maxMinor });

    let winner = trick[0];
    for (const item of trick.slice(1)) {
      if (rank(item.card) > rank(winner.card)) winner = item;
    }

    // Der Narr entthront die Welt, wenn er unmittelbar nach ihr fällt.
    const worldIdx = trick.findIndex(item => item.card.isTrump && item.card.trumpNum === 21);
    const foolIdx = trick.findIndex(item => item.card.isTrump && item.card.trumpNum === 0);
    const foolBeatWorld = !cancelled && worldIdx !== -1 && foolIdx === worldIdx + 1 && !(standard && has(11));
    if (foolBeatWorld) winner = trick[foolIdx];

    const destroyed = !cancelled && has(16);
    const deathHalf = !cancelled && standard && has(13);
    const won = destroyed ? 0 : deathHalf ? 0.5 : 1;

    // Paarung der Liebenden: 0/1, 2/3, 4/5 – bei ungerader Zahl allein.
    const loversPartner = (() => {
      if (cancelled || oracleUid !== 'major-6' || !won) return null;
      const partner = winner.playerIdx % 2 === 0 ? winner.playerIdx + 1 : winner.playerIdx - 1;
      return partner >= 0 && partner < playerCount ? partner : null;
    })();

    const justiceTargets = (!cancelled && standard && has(8))
      ? trick.filter(item => item.playerIdx !== winner.playerIdx).map(item => item.playerIdx)
      : [];

    const strengthPlayer = (!cancelled && standard && has(11)) ? find(11).playerIdx : null;
    const priestess = !cancelled && standard && has(2);
    const moonRevealed = trick.some(item => item.hidden);

    return {
      winnerIdx: winner.playerIdx,
      winnerCard: winner.card,
      won,
      destroyed,
      deathHalf,
      cancelled,
      foolBeatWorld,
      moonRevealed,
      loversPartner,
      justiceTargets,
      strengthPlayer,
      priestess,
      courtKarma: won ? courtKarmaOf(trick, winner.playerIdx, mode, loversPartner) : 0,
      ranks: trick.map(item => ({ playerIdx: item.playerIdx, rank: rank(item.card) }))
    };
  }

  /**
   * Hofkarten-Segen: gewonnene Hofkarten eines Stichs zahlen im Standard
   * zusätzliches Karma (Bube 1, Ritter 2, Königin 3, König 4).
   */
  function courtKarmaOf(trick, winnerIdx, mode, extraPlayerIdx) {
    if (!SCORING.courtBlessing || !SCORING.courtBlessingModes.includes(mode)) return 0;
    const owners = [winnerIdx];
    if (Number.isInteger(extraPlayerIdx)) owners.push(extraPlayerIdx);
    return trick
      .filter(item => owners.includes(item.playerIdx))
      .reduce((sum, item) => sum + (item.card.courtKarma || 0), 0);
  }

  /* ---------------------------------------------------------------- */
  /* Wertung                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Rundenwertung nach Kodex.
   *
   * Halbe Stiche (Tod) sind zulässig. Ein Treffer liegt nur bei exakter
   * Gleichheit vor. Abweichungen werden auf ganze Stiche gerundet
   * (halbe Stiche zählen halb), damit Punktzahlen ganzzahlig bleiben:
   *   Gebot 1, erzielt 1,5 → Abweichung 0,5 → gerundet 1 Schritt.
   *   Gebot 1, erzielt 2,5 → Abweichung 1,5 → gerundet 2 Schritte.
   */
  function scoreRound(options) {
    const opts = options || {};
    const mode = opts.mode || 'turbo';
    const bid = Number(opts.bid) || 0;
    const won = Number(opts.won) || 0;
    const oracleUid = opts.oracleUid || null;
    const courts = Number(opts.courtKarma) || 0;

    const breakdown = [];
    let points = 0;
    let exact = false;

    if (bid === 0) {
      if (won === 0) {
        points += SCORING.nullBonus;
        breakdown.push(`Null-Ansage gehalten (+${SCORING.nullBonus})`);
        exact = true;
      } else {
        points += SCORING.nullPenalty;
        breakdown.push(`Null-Ansage gescheitert (${SCORING.nullPenalty})`);
      }
    } else if (bid === won) {
      exact = true;
      points += SCORING.exactBase + won * SCORING.exactPerTrick;
      breakdown.push(`Exakt getroffen (+${SCORING.exactBase} Basis + ${won * SCORING.exactPerTrick} Stiche)`);
      if (oracleUid === 'major-17') {
        points += SCORING.starBonus;
        breakdown.push(`Stern-Segen (+${SCORING.starBonus})`);
      }
    } else {
      const deviation = Math.abs(bid - won);
      // Halbe Stiche (Tod) zählen als halber Abweichungsschritt; das Ergebnis
      // wird gerundet, damit alle Karmawerte ganzzahlig bleiben.
      const steps = Math.round(deviation);
      const rate = mode === 'standard' && won < bid ? SCORING.underbidRateStandard : SCORING.missPerTrick;
      const penalty = steps * rate;
      points -= penalty;
      breakdown.push(`Abweichung ${formatNumber(deviation)} Stiche → −${penalty}`);
    }

    if (courts) {
      points += courts;
      breakdown.push(`Hofkarten-Segen (+${courts})`);
    }

    return { points, breakdown, exact, deviation: Math.abs(bid - won) };
  }

  function formatNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  }

  /** Maximales Gebot einer Runde. */
  function maxBid(mode, round) {
    return cardsPerPlayer(mode, round);
  }

  /* ---------------------------------------------------------------- */
  /* Stochastik                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Wahrscheinlichkeit, mit `handSize` Karten mindestens einen Trumpf zu
   * ziehen – hypergeometrisch, ohne Zurücklegen.
   */
  function chanceOfAtLeastOneTrump(handSize, deckSize, trumpCount) {
    const n = Math.max(0, Math.floor(Number(handSize) || 0));
    const total = Math.max(1, Math.floor(Number(deckSize) || CARDS.TAROT_DECK.length));
    const trumps = Math.max(0, Math.min(total, Math.floor(Number(trumpCount) || 0)));
    if (n <= 0) return 0;
    if (n > total - trumps) return 100;
    let none = 1;
    for (let i = 0; i < n; i++) none *= (total - trumps - i) / (total - i);
    // Auf Hundertstelprozent runden – so bleiben feine Unterschiede sichtbar,
    // ohne dass unmögliche Hände 100 % erreichen.
    return Math.round(Math.min(1, 1 - none) * 10000) / 100;
  }

  /** Erwartete Trumpfanzahl einer Hand. */
  function expectedTrumps(handSize, deckSize, trumpCount) {
    const total = Math.max(1, Number(deckSize) || CARDS.TAROT_DECK.length);
    return (Number(handSize) || 0) * (Number(trumpCount) || 0) / total;
  }

  /* ---------------------------------------------------------------- */
  /* Selbstprüfung                                                     */
  /* ---------------------------------------------------------------- */

  /** Prüft die Datenintegrität des Decks (für Tests und Startdiagnose). */
  function validateDeck() {
    const problems = [];
    const deck = CARDS.TAROT_DECK;
    if (deck.length !== 78) problems.push(`Decklänge ${deck.length} statt 78`);
    if (new Set(deck.map(card => card.uid)).size !== deck.length) problems.push('Uid nicht eindeutig');
    if (deck.filter(card => card.isTrump).length !== 22) problems.push('Nicht 22 Große Arkana');
    if (deck.filter(card => card.court).length !== 16) problems.push('Nicht 16 Hofkarten');
    CARDS.SUITS.forEach(suit => {
      const suitCards = deck.filter(card => card.suit === suit.name);
      if (suitCards.length !== 14) problems.push(`${suit.name}: ${suitCards.length} statt 14 Karten`);
      const values = new Set(suitCards.map(card => card.value));
      if (values.size !== 14) problems.push(`${suit.name}: Rangwerte nicht eindeutig`);
    });
    CARDS.EFFECT_LIST.forEach(effect => {
      if (!CARDS.DECK_BY_UID[effect.uid]) problems.push(`Effekt ohne Karte: ${effect.uid}`);
    });
    return problems;
  }

  global.ArcanumRules = Object.freeze({
    RULESET_VERSION,
    STATE_SCHEMA_VERSION,
    CONFIG,
    MODES,
    SCORING,
    cardsPerPlayer,
    maxRounds,
    maxBid,
    createRng,
    shuffle,
    createDeck,
    deal,
    pickOracle,
    createRanker,
    legalCardIndices,
    describeConstraint,
    resolveTrick,
    courtKarmaOf,
    scoreRound,
    formatNumber,
    chanceOfAtLeastOneTrump,
    expectedTrumps,
    validateDeck
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
