/**
 * Chromium smoke for ARCANUM's four-panel responsive workspace.
 * Starts the existing static HTTP server on 127.0.0.1:8765.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const URL = 'http://127.0.0.1:8765/arcanum_tarot_browsergame_codex.html';
const tabs = ['bot', 'multiplayer', 'codex', 'scoring'];

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader']
  });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.ArcanumWorkspace && window.ArcanumModeHints);
      assert.equal(await page.evaluate(() => window.ArcanumWorkspace.current()), 'bot');
      for (const name of tabs) {
        if (viewport.width < 900) {
          await page.locator('#mobile-nav-toggle').click();
          await page.locator('#primary-nav.is-open').waitFor();
        }
        await page.locator('#tab-nav-' + name).click();
        await page.locator('#tab-' + name).waitFor({ state: 'visible' });
        for (const other of tabs.filter(other => other !== name)) {
          assert.equal(await page.locator('#tab-' + other).isVisible(), false,
            'only one workspace panel is visible');
        }
        const htmlOverflow = await page.evaluate(() => document.documentElement.scrollWidth -
          document.documentElement.clientWidth);
        assert.ok(htmlOverflow <= 6, name + ': unexpected horizontal overflow ' + htmlOverflow);
        if (name === 'multiplayer') {
          assert.equal(await page.locator('#online-lobby').count(), 1);
          assert.equal(await page.locator('#tab-multiplayer #online-lobby').count(), 1);
          await page.locator('.online-ice-settings summary').click();
          assert.ok(await page.locator('#online-stun-urls').isVisible());
        }
        if (name === 'codex') {
          assert.ok(await page.locator('#kodex').isVisible());
          assert.ok(await page.locator('#math').isVisible());
          assert.ok(await page.locator('#rules-view').isVisible());
          await page.waitForTimeout(120);
          const graph = await page.locator('#probChart').evaluate(canvas =>
            ({ width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height }));
          assert.ok(graph.width > 150 && graph.height > 100, 'chart must resize after tab activation');
        }
        if (name === 'scoring') {
          assert.ok(await page.locator('#calculator').isVisible());
          await page.locator('#calc-bid').fill('2');
          await page.locator('#calc-won').fill('2');
          assert.match(await page.locator('#calc-result').innerText(), /Karma/);
        }
      }
      assert.deepEqual(pageErrors, [], 'uncaught browser errors');
      console.log('Workspace responsive ' + viewport.width + 'x' + viewport.height +
        ': all four tabs functional, no overflow');
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
