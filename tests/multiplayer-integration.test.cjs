/**
 * Integration tests: the real card deck/rule core, real browser GameEngine and
 * compatibility adapter share the same deterministic state machine.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sources = [
  'js/cards.js', 'js/card-art.js', 'js/rules.js', 'js/worlds.js',
  'js/avatars.js', 'js/animations.js', 'js/scene3d.js',
  'js/core/game-state.js', 'js/core/game-commands.js',
  'js/core/game-reducer.js', 'js/engine.js', 'js/core/legacy-adapter.js'
].map(path => fs.readFileSync(path, 'utf8')).join('\n');

function createBrowser(mode, seed) {
  const document = {
    addEventListener() {}, dispatchEvent() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { dataset: {} },
    body: { style: {}, classList: { add() {}, remove() {}, toggle() {} } },
    createElement() { return { classList: { add() {}, remove() {} }, appendChild() {}, style: {} }; }
  };
  const context = {
    document, console, Math, setTimeout, clearTimeout,
    currentActiveMode: mode, confirm: () => true,
    performance: { now: () => Date.now() },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    addEventListener() {}, removeEventListener() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1
  };
  vm.createContext(context);
  vm.runInContext(sources, context);
  const game = context.GameEngine;
  game.schedule = () => {};
  game.log = () => {};
  game.renderUI = () => {};
  game.renderHud = () => {};
  game.hidePodium = () => {};
  game.showPodium = () => {};
  game.emit = () => {};
  game.seed = seed;
  return { game, context };
}

for (const mode of ['turbo', 'standard', 'raw']) {
  for (const count of [2, 3, 6]) {
    test(`Browser adapter plays a full ${mode} round with ${count} seats`, () => {
      const { game } = createBrowser(mode, 1000 + count);
      game.initGame(count);
      assert.equal(game.phase, 'bidding');
      assert.equal(game.players.length, count);
      game.submitHumanBid(1);
      assert.equal(game.phase, 'playing');
      let turns = 0;
      while (game.phase === 'playing' && turns < 200) {
        const playerIdx = game.activePlayerIdx;
        const legal = game.legalCardIndices(playerIdx);
        assert.ok(legal.length > 0);
        game.playCard(playerIdx, legal[0]);
        assert.equal(game.coreState.players.length, count);
        turns++;
      }
      assert.ok(turns > 0 && turns < 200, 'game must terminate');
      assert.equal(game.phase, 'roundOver');
      assert.equal(game.roundSummary.length, count);
      assert.ok(game.players.every(p => p.hand.length === 0));
      assert.ok(game.roundSummary.every(row => Array.isArray(row.breakdown)));
      const view = game.serialize();
      assert.equal(view.players.length, count);
      assert.ok(view.players[0].hand);
      assert.ok(view.players.slice(1).every(player => !('hand' in player)));
      assert.ok(!('rngState' in view));
    });
  }
}

test('the reducer rejects out-of-turn commands without mutating state', () => {
  const { game, context } = createBrowser('raw', 404);
  game.initGame(2);
  game.submitHumanBid(1);
  const state = game.coreState;
  const before = JSON.stringify(state);
  const other = state.players[(state.activePlayerIdx + 1) % 2];
  assert.throws(() => context.ArcanumGameReducer.apply(state, {
    type: 'PLAY_CARD', sequence: state.sequence + 1,
    actorId: other.id, cardUid: other.hand[0]
  }, { rules: context.ArcanumRules, cards: context.ArcanumCards }), /Falscher Spieler/);
  assert.equal(JSON.stringify(state), before);
});

test('the new browser adapter is loaded after reducer and engine but before app', () => {
  const html = fs.readFileSync('arcanum_tarot_browsergame_codex.html', 'utf8');
  const paths = [
    'js/core/game-state.js', 'js/core/game-commands.js', 'js/core/game-reducer.js',
    'js/engine.js', 'js/core/legacy-adapter.js', 'js/app.js'
  ];
  const positions = paths.map(path => html.indexOf('src="' + path + '"'));
  assert.ok(positions.every(n => n >= 0), 'all core/adapter scripts are included');
  assert.ok(positions.every((n, index) => index === 0 || n > positions[index - 1]), 'script ordering is stable');
});
