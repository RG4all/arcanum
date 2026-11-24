/**
 * Chromium end-to-end, no signaling server: two independent browser pages
 * exchange Offer/Answer text and complete a private RAW round via DataChannel.
 * Run with local static server listening on port 8765 and playwright installed.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const URL = 'http://127.0.0.1:8765/arcanum_tarot_browsergame_codex.html';

const info = page => page.evaluate(() => window.ArcanumOnline.getInfo());
async function waitInfo(page, predicate) {
  await page.waitForFunction(code => {
    const state = window.ArcanumOnline && window.ArcanumOnline.getInfo();
    if (!state) return false;
    if (code === 'joined') return !!state.playerId;
    if (code === 'ready') return state.roster.length === 2 && state.roster.every(p => p.ready && p.connected);
    if (code === 'started') return !!(state.view && state.view.phase === 'bidding');
    if (code === 'roundOver') return !!(state.view && state.view.phase === 'roundOver');
    return false;
  }, predicate, { timeout: 30000 });
}
async function run() {
  const browser = await chromium.launch({
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  for (const page of [host, guest]) page.on('pageerror', e => errors.push(e.message));
  try {
    await Promise.all([host.goto(URL, { waitUntil: 'domcontentloaded' }),
      guest.goto(URL, { waitUntil: 'domcontentloaded' })]);
    await Promise.all([host.waitForFunction(() => window.ArcanumOnline && window.GameEngine),
      guest.waitForFunction(() => window.ArcanumOnline && window.GameEngine)]);
    await host.locator('#tab-nav-multiplayer').click();
    await guest.locator('#mobile-nav-toggle').click();
    await guest.locator('#tab-nav-multiplayer').click();
    await Promise.all([
      host.locator('#tab-multiplayer').waitFor({ state: 'visible' }),
      guest.locator('#tab-multiplayer').waitFor({ state: 'visible' })
    ]);
    await host.locator('#online-stun').uncheck();
    await guest.locator('#online-stun').uncheck();
    await host.locator('#online-name').fill('Host');
    await guest.locator('#online-name').fill('Gast');
    await host.locator('#online-create').click();
    await host.locator('#online-invite').click();
    await host.waitForFunction(() => document.getElementById('online-output').value.includes('"kind":"offer"'), null, { timeout: 25000 });
    const offer = await host.locator('#online-output').inputValue();
    assert.ok(offer.includes('"offer"'));
    await guest.locator('#online-input').fill(offer);
    await guest.locator('#online-join').click();
    await guest.waitForFunction(() => document.getElementById('online-output').value.includes('"kind":"answer"'), null, { timeout: 25000 });
    const answer = await guest.locator('#online-output').inputValue();
    await host.locator('#online-input').fill(answer);
    await host.locator('#online-accept').click();
    await waitInfo(guest, 'joined');
    await guest.locator('#online-ready').click();
    await waitInfo(host, 'ready');
    await host.locator('#online-start').click();
    await Promise.all([waitInfo(host, 'started'), waitInfo(guest, 'started')]);
    const h = (await info(host)).view;
    const g = (await info(guest)).view;
    assert.equal(h.players.length, 2);
    assert.equal(g.players.length, 2);
    assert.equal(h.players.filter(p => 'hand' in p).length, 1);
    assert.equal(g.players.filter(p => 'hand' in p).length, 1);
    assert.ok(!('seed' in g) && !('rngState' in g));
    assert.ok(!('hand' in g.players[0]));

    let steps = 0;
    while ((await info(host)).view.phase !== 'roundOver' && steps < 40) {
      const before = (await info(host)).view;
      const current = before.players[before.activePlayerIdx].id;
      const target = current === 'host' ? host : guest;
      await target.waitForFunction(({ current, sequence }) => {
        const snapshot = window.ArcanumOnline.getInfo();
        return snapshot && snapshot.view && snapshot.view.sequence === sequence &&
          snapshot.view.players[snapshot.view.activePlayerIdx].id === current;
      }, { current, sequence: before.sequence }, { timeout: 15000 });
      const selector = before.phase === 'bidding'
        ? '#online-bids [data-online-bid="0"]:not([disabled])'
        : '#online-hand [data-online-play]:not([disabled])';
      await target.locator(selector).first().evaluate(element => element.click());
      await host.waitForFunction(sequence => {
        const snapshot = window.ArcanumOnline.getInfo();
        return snapshot.view && snapshot.view.sequence > sequence;
      }, before.sequence, { timeout: 15000 });
      steps++;
    }
    await waitInfo(guest, 'roundOver');
    const endedHost = (await info(host)).view;
    const endedGuest = (await info(guest)).view;
    assert.equal(endedHost.sequence, endedGuest.sequence);
    assert.equal(endedHost.phase, 'roundOver');
    assert.ok(steps >= 8);
    // The online HUD and public event log must agree across both peers.
    const hostHistory = (await info(host)).history;
    const guestHistory = (await info(guest)).history;
    assert.deepEqual(guestHistory, hostHistory, 'Host/guest public event log is identical');
    assert.ok(hostHistory.some(e => e.type === 'RoundStarted'));
    assert.ok(hostHistory.some(e => e.type === 'BidSubmitted'));
    assert.ok(hostHistory.some(e => e.type === 'CardPlayed'));
    assert.ok(hostHistory.some(e => e.type === 'TrickResolved'));
    assert.ok(hostHistory.some(e => e.type === 'RoundScored'));
    assert.equal(await host.locator('#online-players .online-scorecard').count(), 2);
    assert.equal(await guest.locator('#online-players .online-scorecard').count(), 2);
    assert.equal(await host.locator('#online-log .online-log-entry').count(), hostHistory.length);
    assert.equal(await guest.locator('#online-log .online-log-entry').count(), guestHistory.length);
    for (const page of [host, guest]) {
      const hud = await page.locator('#online-players').innerText();
      assert.match(hud, /Vision/);
      assert.match(hud, /Stiche/);
      assert.match(hud, /Karma/);
      assert.doesNotMatch(await page.locator('#online-trick').innerText(), /Stichrang:\s*[-\d]/);
      assert.ok(await page.locator('#online-trick .online-trick-explanation').count() > 0);
    }
    assert.deepEqual(errors, []);
    console.log('P2P Chromium 1280x800 ↔ 390x844: ' + steps + ' actions, private RAW round completed');
  } finally {
    await host.close();
    await guest.close();
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
