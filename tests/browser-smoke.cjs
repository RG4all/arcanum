/**
 * Real Chromium smoke test. Run:
 *   npm install --no-save --package-lock=false playwright
 *   npx playwright install chromium
 *   python3 -m http.server 8765 --bind 127.0.0.1 &
 *   node tests/browser-smoke.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const URL = 'http://127.0.0.1:8765/arcanum_tarot_browsergame_codex.html';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader']
  });
  try {
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => Boolean(window.GameEngine && window.ArcanumGameReducer &&
        window.ArcanumGameState && window.ArcanumGameCommands), null, { timeout: 20000 });

      const result = await page.evaluate(() => {
        const game = window.GameEngine;
        window.currentActiveMode = 'raw';
        game.seed = 1729;
        game.initGame(3);
        const handHtml = document.getElementById('game-human-hand')?.children.length || 0;
        const hudPresent = Boolean(document.getElementById('hud-round'));
        game.submitHumanBid(1);
        let turns = 0;
        while (game.phase === 'playing' && turns < 120) {
          const idx = game.activePlayerIdx;
          const legal = game.legalCardIndices(idx);
          if (!legal.length) throw new Error('No legal card for active player');
          game.playCard(idx, legal[0]);
          turns++;
        }
        game.clearTimers();
        return {
          phase: game.phase, playerCount: game.players.length,
          played: turns, handHtml, hudPresent,
          scores: game.players.map(player => player.score),
          schema: game.coreState.schema,
          privateCardsVisible: game.serialize().players.slice(1).some(player => 'hand' in player)
        };
      });
      assert.equal(result.phase, 'roundOver', JSON.stringify(result));
      assert.equal(result.playerCount, 3);
      assert.ok(result.played >= 9);
      assert.ok(result.handHtml > 0, 'hand cards must be rendered');
      assert.ok(result.hudPresent, 'HUD exists');
      assert.equal(result.schema, 1);
      assert.equal(result.privateCardsVisible, false);
      assert.deepEqual(errors, [], 'uncaught browser errors: ' + errors.join('; '));
      console.log(`Chromium smoke ${width}x${height}: ${result.played} moves, ${result.phase}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
