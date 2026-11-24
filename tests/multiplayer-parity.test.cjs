/**
 * Regression parity: the new browser adapter must reach the same outcomes
 * as the pre-migration GameEngine with identical seeds and player choices.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const base = [
  'js/cards.js', 'js/card-art.js', 'js/rules.js', 'js/worlds.js',
  'js/avatars.js', 'js/animations.js', 'js/scene3d.js'
];
const core = [
  'js/core/game-state.js', 'js/core/game-commands.js',
  'js/core/game-reducer.js'
];

function build(mode, seed, migrated) {
  const document = {
    addEventListener() {}, dispatchEvent() {},
    getElementById() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { classList: { add() {}, remove() {} }, style: {} }; },
    body: { classList: { add() {}, remove() {}, toggle() {} }, style: {} },
    documentElement: { dataset: {} }
  };
  const env = {
    document, currentActiveMode: mode, structuredClone,
    setTimeout, clearTimeout, console, Math,
    confirm: () => true, performance: { now: () => Date.now() },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame() {}, cancelAnimationFrame() {},
    addEventListener() {}, removeEventListener() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1
  };
  vm.createContext(env);
  const files = [...base, ...(migrated ? core : []), 'js/engine.js',
    ...(migrated ? ['js/core/legacy-adapter.js'] : [])];
  vm.runInContext(files.map(file => fs.readFileSync(file, 'utf8')).join('\n'), env);
  const game = env.GameEngine;
  game.schedule = () => {};
  game.log = () => {};
  game.renderUI = () => {};
  game.renderHud = () => {};
  game.hidePodium = () => {};
  game.showPodium = () => {};
  game.emit = () => {};
  game.rng = env.ArcanumRules.createRng(seed);
  game.seed = seed;
  return game;
}

function equivalent(actual, expected, message) {
  // Different vm contexts have different Array prototypes.
  assert.deepEqual(JSON.parse(JSON.stringify(actual)),
    JSON.parse(JSON.stringify(expected)), message);
}

function view(game) {
  return {
    phase: game.phase, active: game.activePlayerIdx,
    leadSuit: game.leadSuit, forcedPlayer: game.forcedPlayer,
    trumpBan: game.trumpBan,
    players: game.players.map(p => ({
      hand: p.hand.map(card => card.uid), bid: p.bid, won: p.won,
      score: p.score, courtKarma: p.courtKarma || 0
    })),
    trick: game.currentTrick.map(item => ({ playerIdx: item.playerIdx, uid: item.card.uid }))
  };
}

for (const mode of ['turbo', 'standard', 'raw']) {
  for (const count of [2, 3, 6]) {
    for (const seed of [7, 1024]) {
      test(`legacy/core parity: ${mode}, ${count} seats, seed ${seed}`, () => {
        const legacy = build(mode, seed, false);
        const migrated = build(mode, seed, true);
        legacy.initGame(count);
        migrated.initGame(count);
        equivalent(view(migrated).players.map(p => p.hand),
          view(legacy).players.map(p => p.hand), 'dealt hands must match');
        assert.equal(migrated.activeOracle?.uid || null,
          legacy.activeOracle?.uid || null, 'oracle must match');
        legacy.submitHumanBid(1);
        migrated.submitHumanBid(1);
        equivalent(view(migrated), view(legacy), 'bids and opening must match');
        let turns = 0;
        while (legacy.phase === 'playing' && turns < 120) {
          const idx = legacy.activePlayerIdx;
          const legal = legacy.legalCardIndices(idx);
          assert.ok(legal.length > 0);
          const uid = legacy.players[idx].hand[legal[0]].uid;
          legacy.playCard(idx, legal[0]);
          const newIdx = migrated.players[idx].hand.findIndex(card => card.uid === uid);
          assert.ok(newIdx >= 0, 'same card must be available');
          migrated.playCard(idx, newIdx);
          if (legacy.currentTrick.length === legacy.players.length) {
            legacy.evaluateTrick();
          }
          equivalent(view(migrated), view(legacy), `divergence at turn ${turns}`);
          turns++;
        }
        assert.ok(turns > 0 && turns < 120);
        assert.equal(migrated.phase, legacy.phase);
        assert.equal(migrated.phase, 'roundOver');
        equivalent(migrated.players.map(p => p.score), legacy.players.map(p => p.score));
      });
    }
  }
}
