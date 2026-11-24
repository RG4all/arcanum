const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/cards.js');
require('../js/rules.js');
const Cards = global.ArcanumCards;
const Rules = global.ArcanumRules;
const { createGame, snapshotFor } = require('../js/core/game-state.js');
const { apply, publicEvents } = require('../js/core/game-reducer.js');
const { TYPES, PROTOCOL_VERSION } = require('../js/core/game-commands.js');
const Presenter = require('../js/net/match-presentation.js');
const card = uid => {
  const value = Cards.DECK_BY_UID[uid];
  assert.ok(value, 'Card does not exist: ' + uid);
  return value;
};
function evaluate(uids, opts = {}) {
  return Rules.resolveTrick(
    uids.map((uid, playerIdx) => ({ playerIdx, card: card(uid) })),
    { mode: 'standard', playerCount: uids.length, ...opts }
  );
}

test('rule explanation uses real card values, never internal comparison sentinels', () => {
  const cups = Rules.describeTrickCard(card('minor-Kelche-4'),
    { mode: 'standard', leadSuit: 'Kelche' });
  const swords = Rules.describeTrickCard(card('minor-Schwerter-6'),
    { mode: 'standard', leadSuit: 'Kelche' });
  const king = Rules.describeTrickCard(card('minor-Stäbe-14'),
    { mode: 'standard', leadSuit: 'Stäbe' });
  const hierophant = Rules.describeTrickCard(card('major-5'), { mode: 'standard' });
  const strength = Rules.describeTrickCard(card('major-11'), { mode: 'standard' });
  const devil = Rules.describeTrickCard(card('major-15'), { mode: 'standard' });
  assert.match(cups, /Wert 4/);
  assert.match(swords, /Fremdfarbe.*Wert 6/);
  assert.match(king, /Wert 14/);
  assert.match(hierophant, /Trumpf 5/);
  assert.match(strength, /Sonderregel/);
  assert.match(devil, /Trumpf 15/);
  for (const line of [cups, swords, king, hierophant, strength, devil]) {
    assert.doesNotMatch(line, /Stichrang|−494|-494|5000|200 \+|205/);
  }
});

test('Standard compares real ranking per trick, including strength suppression by Hierophant', () => {
  const winning = evaluate(['minor-Stäbe-14', 'major-5', 'major-11'],
    { leadSuit: 'Stäbe' });
  assert.equal(winning.cancelled, true);
  assert.equal(winning.winnerIdx, 2, 'XI is highest regular trump of the three');
  assert.equal(winning.ranks[2].rank, 211, 'strength no longer gets 5000 under Hierophant');
  assert.equal(winning.won, 1);
  const regular = evaluate(['major-15','major-11'], {});
  assert.equal(regular.winnerIdx, 1, 'XI gets its special 5000 boost without Hierophant');
  assert.equal(regular.ranks[1].rank, 5000);
  assert.equal(evaluate(['minor-Kelche-4','minor-Schwerter-6'],
    { leadSuit: 'Kelche' }).winnerIdx, 0);
});

test('Oracle Lovers shares tricks despite a Hierophant in Standard round', () => {
  const result = evaluate(['major-20','major-5','major-8','major-12'],
    { oracleUid: 'major-6' });
  assert.equal(result.cancelled, true);
  assert.equal(result.winnerIdx, 0);
  assert.equal(result.loversPartner, 1);
  assert.equal(result.won, 1);
});

test('Reducer awards Lovers partner under Hierophant, and snapshots show public lead suit', () => {
  let state = createGame({ rules: Rules, cards: Cards, mode: 'standard',
    playerIds: ['a', 'b'], seed: 123 });
  state = apply(state, { type: TYPES.START_ROUND, sequence: 1 },
    { rules: Rules, cards: Cards }).state;
  state.phase = 'playing';
  state.players[0].hand = ['minor-Stäbe-14'];
  state.players[1].hand = ['major-5'];
  state.oracleUid = 'major-6';
  state.activePlayerIdx = 0;
  for (let i = 0; i < 2; i++) {
    const player = state.players[state.activePlayerIdx];
    state = apply(state, { type: TYPES.PLAY_CARD, cardUid: player.hand[0],
      actorId: player.id, sequence: state.sequence + 1 }, { rules: Rules, cards: Cards }).state;
  }
  assert.equal(state.lastTrick.winnerIdx, 1, 'Hierophant beats a King on trump rank');
  assert.equal(state.lastTrick.leadSuit, 'Stäbe');
  assert.deepEqual(state.players.map(p => p.won), [1, 1],
    'Lovers shares the trick with the adjacent seat');
  assert.equal(snapshotFor(state, 'a').lastTrick.leadSuit, 'Stäbe');
  assert.equal(snapshotFor(state, 'a').lastTrick.cards.length, 2);
});

test('public match event formatter keeps Moon hidden until completed trick', () => {
  const raw = [
    { type:'CardPlayed', actorId:'a', playerIdx:0, uid:'major-18', hidden:true,
      sequence:1, eventIndex:0 },
    { type:'TrickResolved', winnerIdx:0, won:1, moonRevealed:true,
      cards:[{ playerIdx:0, uid:'major-18' }, { playerIdx:1, uid:'major-1' }],
      sequence:2, eventIndex:0 }
  ];
  const [played, resolved] = publicEvents(raw);
  assert.equal(Object.hasOwn(played,'uid'),false);
  assert.equal(JSON.stringify(played).includes('major-18'),false);
  const ctx={ cards:Cards, roster:[{id:'a',name:'Adept'},{id:'b',name:'Gast'}],
    view:{players:[{id:'a'},{id:'b'}]} };
  const before=Presenter.formatEvent(played,ctx);
  assert.match(before.title,/verdeckte Karte/);
  assert.doesNotMatch(JSON.stringify(before),/Mond|major-18/);
  const after=Presenter.formatEvent(resolved,ctx);
  assert.match(after.detail,/Mond aufgedeckt/);
  assert.match(after.title,/Adept/);
});

test('public event formatting includes bid, round score, actor and secret-safe card names', () => {
  const ctx={ cards:Cards, roster:[{id:'a',name:'Adept'},{id:'b',name:'Gast'}],
    view:{players:[{id:'a'},{id:'b'}]} };
  assert.match(Presenter.formatEvent({type:'BidSubmitted',actorId:'a',bid:3},ctx).title,/Adept sagt 3/);
  assert.match(Presenter.formatEvent({type:'CardPlayed',actorId:'a',uid:'major-11'},ctx).title,/Kraft/);
  assert.match(Presenter.formatEvent({type:'RoundScored',round:2,
    summary:[{playerId:'a',points:40},{playerId:'b',points:-15}]},ctx).detail,
    /Adept: \+40 Karma.*Gast: -15 Karma/);
  assert.equal(Presenter.formatEvent({type:'Bogus'},ctx),null);
});


test('Lovers: each player earns karma for their own court cards, not the trick winner', () => {
  const cardsInTrick = [
    { playerIdx: 0, card: card('minor-Stäbe-14') },  // King: +4
    { playerIdx: 1, card: card('minor-Kelche-13') }  // Queen: +3
  ];
  const result = Rules.resolveTrick(cardsInTrick, {
    mode: 'standard', oracleUid: 'major-6', leadSuit: 'Stäbe', playerCount: 2
  });
  assert.equal(result.winnerIdx, 0);
  assert.equal(result.loversPartner, 1);
  assert.equal(result.courtKarma, 4, 'winner receives own King bonus');
  assert.equal(result.partnerCourtKarma, 3, 'partner receives own Queen bonus');

  let state = createGame({ rules: Rules, cards: Cards, mode: 'standard',
    playerIds: ['a', 'b'], seed: 777 });
  state = apply(state, { type: TYPES.START_ROUND, sequence: 1 }, {
    rules: Rules, cards: Cards
  }).state;
  state.phase = 'playing'; state.oracleUid = 'major-6'; state.activePlayerIdx = 0;
  state.players[0].hand = ['minor-Stäbe-14'];
  state.players[1].hand = ['minor-Kelche-13'];
  state.players[0].bid = state.players[1].bid = 1;
  for (let i = 0; i < 2; i++) {
    const player = state.players[state.activePlayerIdx];
    state = apply(state, { type: TYPES.PLAY_CARD, actorId: player.id,
      cardUid: player.hand[0], sequence: state.sequence + 1 },
    { rules: Rules, cards: Cards }).state;
  }
  assert.equal(state.lastTrick.winnerIdx, 0);
  assert.deepEqual(state.players.map(p => p.won), [1,1]);
  assert.deepEqual(state.players.map(p => p.courtKarma), [4,3]);
  assert.deepEqual(state.players.map(p => p.score), [34,33]);
});
