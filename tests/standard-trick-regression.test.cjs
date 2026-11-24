const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/cards.js');
require('../js/rules.js');
const Cards = global.ArcanumCards;
const Rules = global.ArcanumRules;
const { createGame } = require('../js/core/game-state.js');
const { apply } = require('../js/core/game-reducer.js');
const { TYPES } = require('../js/core/game-commands.js');
const card = uid => {
  const found = Cards.DECK_BY_UID[uid];
  assert.ok(found, 'missing card: ' + uid);
  return found;
};
function trick(uids) { return uids.map((uid, playerIdx) => ({ playerIdx, card: card(uid) })); }
function winner(uids, oracleUid = null, leadSuit = null) {
  return Rules.resolveTrick(trick(uids), {
    mode: 'standard', playerCount: uids.length, oracleUid, leadSuit
  });
}

test('Standard ranks by card strength, not who played last: high trump wins from every seat', () => {
  const base = ['major-20', 'major-6', 'major-9'];
  for (let i = 0; i < base.length; i++) {
    const cards = [...base.slice(i), ...base.slice(0, i)];
    const result = winner(cards);
    assert.equal(result.winnerCard.uid, 'major-20');
    assert.equal(result.winnerIdx, cards.indexOf('major-20'));
    assert.ok(result.ranks.find(item => item.playerIdx === result.winnerIdx).rank >
      result.ranks.find(item => item.playerIdx === cards.length - 1).rank ||
      result.winnerIdx === cards.length - 1);
  }
});

test('Standard: leading suit and value determine the highest nontrump', () => {
  const cards = ['minor-Kelche-14', 'minor-Schwerter-14', 'minor-Kelche-10'];
  const result = winner(cards, null, 'Kelche');
  assert.equal(result.winnerIdx, 0, 'off-suit card must not take the trick');
  assert.equal(result.winnerCard.uid, 'minor-Kelche-14');
});

test('Standard: strength outranks a higher-number trump unless Hierophant cancels', () => {
  assert.equal(winner(['major-11','major-20','major-6']).winnerIdx, 0);
  const cancelled = winner(['major-11','major-20','major-5']);
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.winnerIdx, 1);
});

test('Standard reducer allocates trick to actual strongest card, not last actor', () => {
  const mode = 'standard';
  let state = createGame({ rules: Rules, cards: Cards, mode,
    playerIds: ['first','middle','last'], seed: 101 });
  state = apply(state, { type: TYPES.START_ROUND, sequence: 1 }, { rules: Rules, cards: Cards }).state;
  state.players.forEach((player, i) => {
    player.hand = [ ['major-20', 'major-9'][i] || 'major-6' ];
    player.bid = 0;
  });
  state.phase = 'playing'; state.activePlayerIdx = 0;
  state.oracleUid = null;
  for (let i = 0; i < 3; i++) {
    const player = state.players[state.activePlayerIdx];
    state = apply(state, { type: TYPES.PLAY_CARD, actorId: player.id,
      cardUid: player.hand[0], sequence: state.sequence + 1 }, { rules: Rules, cards: Cards }).state;
  }
  assert.equal(state.lastTrick.winnerIdx, 0);
  assert.deepEqual(state.players.map(p => p.won), [1,0,0]);
  assert.equal(state.roundSummary[0].playerId, 'first');
});
