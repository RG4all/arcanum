const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, snapshotFor, PHASE } = require('../js/core/game-state.js');
const { apply, publicEvents } = require('../js/core/game-reducer.js');
const { TYPES, PROTOCOL_VERSION, validateNetworkCommand } = require('../js/core/game-commands.js');

// Small deterministic fixture for isolated reducer tests. Repository integration
// must additionally run the actual js/cards.js + js/rules.js suite.
const deck = Array.from({ length: 78 }, (_, n) => Object.freeze({
  uid: `card-${n}`, isTrump: n < 22, trumpNum: n < 22 ? n : undefined,
  suit: n < 22 ? null : ['Stäbe', 'Kelche', 'Schwerter', 'Münzen'][(n - 22) % 4],
  value: n < 22 ? 100 + n : 2 + Math.floor((n - 22) / 4), courtKarma: 0
}));
const cards = { TAROT_DECK: deck, DECK_BY_UID: Object.fromEntries(deck.map(card => [card.uid, card])), sortHand: hand => [...hand] };
const rules = {
  RULESET_VERSION: 'test-1', MODES: { raw: { oracle: false } }, maxRounds: () => 2,
  cardsPerPlayer: (_, round) => round + 2,
  createDeck: rng => { const clone = [...deck]; for (let i = clone.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [clone[i], clone[j]] = [clone[j], clone[i]]; } return clone; },
  deal: ({ deck, playerCount, cardsEach }) => ({ hands: Array.from({ length: playerCount }, (_, i) => Array.from({ length: cardsEach }, (_, j) => deck[j * playerCount + i])) }),
  legalCardIndices: hand => hand.map((_, idx) => idx),
  resolveTrick: trick => ({ winnerIdx: trick[0].playerIdx, won: 1, cancelled: false, loversPartner: null, justiceTargets: [], courtKarma: 0, strengthPlayer: null, priestess: false, destroyed: false }),
  scoreRound: ({ bid, won }) => ({ points: bid === won ? 10 : -10, exact: bid === won })
};
const env = { cards, rules };
function newMatch(seed = 42) {
  let state = createGame({ cards, rules, mode: 'raw', playerIds: ['alice', 'bob'], seed });
  state = apply(state, { type: TYPES.START_ROUND, sequence: 1 }, env).state;
  return state;
}
function bidBoth(state) {
  state = apply(state, { type: TYPES.SUBMIT_BID, sequence: state.sequence + 1, actorId: 'alice', bid: 1 }, env).state;
  return apply(state, { type: TYPES.SUBMIT_BID, sequence: state.sequence + 1, actorId: 'bob', bid: 1 }, env).state;
}
test('createGame validates players and seed', () => {
  assert.throws(() => createGame({ cards, rules, mode: 'raw', playerIds: ['x', 'x'], seed: 7 }));
  assert.throws(() => createGame({ cards, rules, mode: 'raw', playerIds: ['x', 'y'], seed: -1 }));
});
test('identical seed and commands yield identical state', () => {
  const a = bidBoth(newMatch(101));
  const b = bidBoth(newMatch(101));
  assert.deepEqual(a, b);
  assert.equal(a.phase, PHASE.PLAYING);
});
test('opponent hands never leak through snapshots', () => {
  const state = newMatch();
  const view = snapshotFor(state, 'alice');
  assert.equal(view.players[0].hand.length, 3);
  assert.equal(Object.hasOwn(view.players[1], 'hand'), false);
  assert.equal(JSON.stringify(view).includes(state.players[1].hand[0]), false);
  assert.equal(Object.hasOwn(view, 'seed'), false);
});
test('sequencing, wrong player and invalid card are rejected without mutation', () => {
  const state = bidBoth(newMatch());
  const before = structuredClone(state);
  assert.throws(() => apply(state, { type: TYPES.PLAY_CARD, sequence: state.sequence, actorId: 'alice', cardUid: state.players[0].hand[0] }, env), /Sequenz/);
  assert.throws(() => apply(state, { type: TYPES.PLAY_CARD, sequence: state.sequence + 1, actorId: 'bob', cardUid: state.players[1].hand[0] }, env), /Falscher Spieler/);
  assert.throws(() => apply(state, { type: TYPES.PLAY_CARD, sequence: state.sequence + 1, actorId: 'alice', cardUid: 'card-not-owned' }, env), /Karte nicht/);
  assert.deepEqual(state, before);
});
test('full round plays and scores without DOM or timers', () => {
  let state = bidBoth(newMatch());
  for (let trick = 0; trick < 3; trick++) {
    for (let p = 0; p < 2; p++) {
      const current = state.activePlayerIdx;
      const player = state.players[current];
      const res = apply(state, { type: TYPES.PLAY_CARD, sequence: state.sequence + 1, actorId: player.id, cardUid: player.hand[0] }, env);
      assert.equal(res.events[0].type, 'CardPlayed');
      state = res.state;
    }
  }
  assert.equal(state.phase, PHASE.ROUND_OVER);
  assert.equal(state.roundSummary.length, 2);
  state = apply(state, { type: TYPES.NEXT_ROUND, sequence: state.sequence + 1 }, env).state;
  assert.equal(state.round, 2);
  assert.equal(state.phase, PHASE.BIDDING);
});
test('version mismatches are rejected', () => {
  const state = newMatch();
  assert.throws(() => apply({ ...state, ruleset: 'other' }, { type: TYPES.SUBMIT_BID, sequence: 2, actorId: 'alice', bid: 1 }, env), /Regelwerksversion/);
});

test('hidden Moon card UID is never public', () => {
  const state = newMatch();
  state.currentTrick = [{ playerIdx: 0, uid: 'card-18', hidden: true }];
  assert.equal(Object.hasOwn(snapshotFor(state, 'bob').currentTrick[0], 'uid'), false);
  assert.equal(Object.hasOwn(publicEvents([{ type: 'CardPlayed', uid: 'card-18', hidden: true, sequence: 9 }])[0], 'uid'), false);
});

test('network commands require the correct protocol version', () => {
  assert.equal(PROTOCOL_VERSION, 1);
  assert.throws(() => validateNetworkCommand({
    type: TYPES.PLAY_CARD, sequence: 1, actorId: 'alice', cardUid: 'card-1'
  }), /Protokollversion/);
  assert.throws(() => validateNetworkCommand({
    type: TYPES.PLAY_CARD, protocolVersion: 999,
    sequence: 1, actorId: 'alice', cardUid: 'card-1'
  }), /Protokollversion/);
  assert.equal(validateNetworkCommand({
    type: TYPES.PLAY_CARD, protocolVersion: 1,
    sequence: 1, actorId: 'alice', cardUid: 'card-1'
  }), true);
  const view = snapshotFor(newMatch(), 'alice');
  assert.equal(view.protocolVersion, PROTOCOL_VERSION);
});
