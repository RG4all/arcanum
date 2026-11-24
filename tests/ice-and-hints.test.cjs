const { test } = require('node:test');
const assert = require('node:assert/strict');
const hints = require('../js/mode-hints.js');
const rtc = require('../js/net/webrtc.js');
require('../js/cards.js');
const Cards = global.ArcanumCards;

test('RAW card hints explicitly suppress all special card effects', () => {
  for (const uid of ['major-16', 'major-11', 'major-0']) {
    const note = hints.cardHint(Cards.DECK_BY_UID[uid], 'raw');
    assert.match(note.action, /Kein Spezialeffekt/);
    assert.doesNotMatch(note.action, /zerstört|entthronen|gewinnt gegen alle/);
  }
});
test('Standard and Turbo guidance reflect their actual oracle and effect rules', () => {
  const tower = Cards.DECK_BY_UID['major-16'];
  assert.match(hints.cardHint(tower, 'turbo').action, /zerstört den Stich/);
  assert.match(hints.describe('oracle-tile', 'raw').short, /keine Orakel/);
  assert.match(hints.describe('oracle-tile', 'standard').action, /Hierophant/);
  assert.match(hints.describe('trick', 'standard').action, /nicht anhand der Zugposition/);
  assert.match(hints.describe('nav', 'raw').short, /Multiplayer/);
});
test('STUN alone is optional and TURN is opt-in with credentials', () => {
  assert.deepEqual(rtc.configFor({ useStun: false }), {
    iceServers: [], iceTransportPolicy: 'all'
  });
  const config = rtc.configFor({ useStun: true });
  assert.equal(config.iceServers.length, 2);
  assert.ok(config.iceServers.every(x => x.urls.startsWith('stun:')));
  const turn = rtc.configFor({ useStun: false, turnUrl: 'turn:relay.example:3478',
    turnUsername: 'test-user', turnCredential: 'secret' });
  assert.deepEqual(turn.iceServers, [{ urls: 'turn:relay.example:3478',
    username: 'test-user', credential: 'secret' }]);
  assert.throws(() => rtc.configFor({ useStun: true,
    stunUrls: 'https://evil.example' }), /STUN/);
  assert.throws(() => rtc.configFor({ turnUrl: 'turn:relay.example:3478' }), /TURN benötigt/);
});
test('ICE diagnostic counts gathered host, reflexive and TURN relay candidates', () => {
  const sdp = [
    'v=0',
    'a=candidate:1 1 udp 100 192.0.2.1 5000 typ host',
    'a=candidate:2 1 udp 200 198.51.100.2 4000 typ srflx raddr 192.0.2.1 rport 5000',
    'a=candidate:3 1 udp 300 203.0.113.3 6000 typ relay raddr 0.0.0.0 rport 0'
  ].join('\r\n');
  assert.deepEqual(rtc.candidateSummary(sdp), { host: 1, srflx: 1, relay: 1, prflx: 0 });
});
