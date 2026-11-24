const { test } = require('node:test');
const assert = require('node:assert/strict');
const RTC = require('../js/net/webrtc.js');
const Room = require('../js/net/private-room.js');
require('../js/cards.js');
require('../js/rules.js');
const cards = global.ArcanumCards;
const rules = global.ArcanumRules;

function mockNetwork() {
  const waiting = new Map();
  const transmitted = [];
  const rtc = {
    signal(text, kind) {
      const parsed = JSON.parse(text);
      if (parsed.kind !== kind) throw new Error('wrong signal kind');
      return parsed;
    },
    async createHostLink({ roomId, slotId, onMessage, onStatus }) {
      const connection = { roomId, slotId, hostStatus: onStatus, hostMessage: onMessage,
        guestStatus: null, guestMessage: null, open: false };
      waiting.set(slotId, connection);
      const link = {
        get isOpen() { return connection.open; },
        offerCode: JSON.stringify({ kind: 'offer', roomId, slotId }),
        async acceptAnswer(code) {
          const answer = JSON.parse(code);
          if (answer.roomId !== roomId || answer.slotId !== slotId || answer.kind !== 'answer')
            throw new Error('mismatched answer');
          if (!connection.guestStatus) throw new Error('guest is missing');
          connection.open = true;
          queueMicrotask(() => {
            connection.hostStatus('open');
            connection.guestStatus('open');
          });
        },
        send(value) {
          transmitted.push({ direction: 'host-to-guest', roomId, slotId, value });
          queueMicrotask(() => connection.open && connection.guestMessage(structuredClone(value)));
        },
        close() { connection.open = false; }
      };
      connection.hostLink = link;
      return link;
    },
    async joinOffer(code, { onMessage, onStatus }) {
      const offer = JSON.parse(code);
      const connection = waiting.get(offer.slotId);
      if (!connection) throw new Error('unknown offer');
      connection.guestStatus = onStatus;
      connection.guestMessage = onMessage;
      return {
        get isOpen() { return connection.open; },
        roomId: offer.roomId, slotId: offer.slotId,
        answerCode: JSON.stringify({ kind: 'answer', roomId: offer.roomId, slotId: offer.slotId }),
        send(value) {
          transmitted.push({ direction: 'guest-to-host', roomId: offer.roomId, slotId: offer.slotId, value });
          queueMicrotask(() => connection.open && connection.hostMessage(structuredClone(value)));
        },
        close() { connection.open = false; }
      };
    }
  };
  return { rtc, transmitted };
}
const tick = async () => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};
function ids() {
  let i = 0;
  return bytes => String(++i).padStart(bytes * 2, '0');
}

test('signal parser validates version, type and session identity', () => {
  const code = JSON.stringify({
    v: 1, kind: 'offer', roomId: 'a'.repeat(24), slotId: 'b'.repeat(16),
    description: { type: 'offer', sdp: 'v=0\r\n' }
  });
  assert.equal(RTC.signal(code, 'offer').description.type, 'offer');
  assert.throws(() => RTC.signal(code, 'answer'), /Signaltyp/);
  assert.throws(() => RTC.signal(code.replace('"v":1', '"v":99'), 'offer'), /Signaltyp/);
  assert.throws(() => RTC.signal('{bad', 'offer'), /JSON/);
  assert.throws(() => RTC.signal('x'.repeat(60001), 'offer'), /Signal/);
});

test('host and guest complete an entire RAW round with private snapshots', async () => {
  const { rtc, transmitted } = mockNetwork();
  const rand = ids();
  const host = Room.createHost({ rules, cards, seats: 2, mode: 'raw', name: 'Host',
    rtc, idFactory: rand });
  const offer = await host.invite();
  const guest = await Room.join({ code: offer, rules, cards, rtc, name: '<Gast>' });
  assert.ok(guest.answerCode);
  await host.acceptAnswer(guest.answerCode);
  await tick();
  assert.equal(host.getInfo().roster.length, 2);
  assert.equal(guest.getInfo().playerId, host.getInfo().roster[1].id);
  guest.ready(true);
  await tick();
  assert.equal(host.getInfo().roster[1].ready, true);
  host.start();
  await tick();
  const guestView = guest.getInfo().view;
  const hostView = host.getInfo().view;
  assert.ok(Array.isArray(guestView.players[1].hand));
  assert.equal(Object.hasOwn(guestView.players[0], 'hand'), false);
  assert.equal(Object.hasOwn(hostView.players[1], 'hand'), false);
  assert.equal(Object.hasOwn(guestView, 'seed'), false);

  let steps = 0;
  while (host.getInfo().view.phase !== 'roundOver' && steps < 50) {
    const view = host.getInfo().view;
    const actor = view.players[view.activePlayerIdx].id;
    const command = view.phase === 'bidding'
      ? { type: 'SUBMIT_BID', bid: 0 }
      : { type: 'PLAY_CARD', cardUid: actor === 'host'
        ? host.getInfo().view.players[0].hand[0]
        : guest.getInfo().view.players[1].hand[0] };
    if (actor === 'host') host.action(command);
    else guest.action(command);
    await tick();
    steps++;
  }
  assert.equal(host.getInfo().view.phase, 'roundOver');
  assert.equal(guest.getInfo().view.phase, 'roundOver');
  assert.equal(host.getInfo().view.sequence, guest.getInfo().view.sequence);
  assert.ok(steps >= 8);
  for (const packet of transmitted.filter(x => x.direction === 'host-to-guest' && x.value.type === 'state')) {
    const view = packet.value.view;
    assert.ok(view.players.every(p => p.id === guest.getInfo().playerId || !Object.hasOwn(p, 'hand')));
    assert.ok(!Object.hasOwn(view, 'rngState'));
  }
  host.nextRound();
  await tick();
  assert.equal(guest.getInfo().view.round, 2);
  host.close();
  guest.close();
});

test('six-seat lobby supports five simultaneous guest channels and rejects a seventh', async () => {
  const { rtc } = mockNetwork();
  const host = Room.createHost({ rules, cards, mode: 'raw', seats: 6, rtc, idFactory: ids() });
  const guests = [];
  for (let i = 0; i < 5; i++) {
    const offer = await host.invite();
    const guest = await Room.join({ code: offer, rules, cards, rtc, name: 'Guest ' + i });
    guests.push(guest);
    await host.acceptAnswer(guest.answerCode);
    await tick();
    guest.ready(true);
    await tick();
  }
  assert.equal(host.getInfo().roster.length, 6);
  await assert.rejects(() => host.invite(), /Plätze/);
  assert.doesNotThrow(() => host.start());
  await tick();
  assert.equal(host.getInfo().view.players.length, 6);
  guests.forEach(g => {
    const view = g.getInfo().view;
    assert.equal(view.players.filter(p => Object.hasOwn(p, 'hand')).length, 1);
  });
  host.close();
  guests.forEach(g => g.close());
});

test('guest cannot impersonate host or play out of turn', async () => {
  const { rtc, transmitted } = mockNetwork();
  const host = Room.createHost({ rules, cards, mode: 'raw', seats: 2, rtc, idFactory: ids() });
  const guest = await Room.join({ code: await host.invite(), rules, cards, rtc });
  await host.acceptAnswer(guest.answerCode);
  await tick();
  guest.ready(true);
  await tick();
  host.start();
  await tick();
  const original = host.getInfo().view.sequence;
  // First bid belongs to host; guest's command is bound to peer ID and rejected.
  guest.action({ type: 'SUBMIT_BID', bid: 0, actorId: 'host', sequence: original + 1 });
  await tick();
  assert.equal(host.getInfo().view.sequence, original);
  assert.ok(transmitted.some(x => x.value.type === 'error'));
  host.close();
  guest.close();
});


test('Standard 2/3/6-seat rounds synchronize scores, public history and private cards', async () => {
  for (const seats of [2, 3, 6]) {
    const { rtc, transmitted } = mockNetwork();
    const host = Room.createHost({ rules, cards, mode: 'standard', seats,
      rtc, idFactory: ids(), name: 'Host' });
    const guests = [];
    for (let i = 1; i < seats; i++) {
      const offer = await host.invite();
      const guest = await Room.join({
        code: offer, name: 'Guest ' + i, rules, cards, rtc
      });
      guests.push(guest);
      await host.acceptAnswer(guest.answerCode);
      await tick();
      guest.ready(true);
      await tick();
    }
    host.start();
    await tick();
    let turns = 0;
    while (host.getInfo().view.phase !== 'roundOver' &&
           host.getInfo().view.phase !== 'gameOver' && turns < 115) {
      const view = host.getInfo().view;
      const playerIdx = view.phase === 'priestess'
        ? view.players.findIndex(p => p.id === view.pendingPriestess.playerId)
        : view.activePlayerIdx;
      const player = view.players[playerIdx];
      const session = playerIdx === 0 ? host : guests[playerIdx - 1];
      const myView = session.getInfo().view;
      const mine = myView.players[playerIdx];
      let command;
      if (view.phase === 'bidding') {
        command = { type: 'SUBMIT_BID', bid: 0 };
      } else if (view.phase === 'priestess') {
        const max = rules.cardsPerPlayer(view.mode, view.round, seats);
        command = { type: 'CHOOSE_PRIESTESS', delta: mine.bid < max ? 1 : -1 };
      } else {
        const hand = mine.hand.map(uid => cards.DECK_BY_UID[uid]);
        const indices = rules.legalCardIndices(hand, {
          mode: view.mode, leadSuit: view.leadSuit,
          freeLead: view.oracleUid === 'major-4',
          trumpBan: view.trumpBan === playerIdx,
          mustPlayHighest: view.forcedPlayer === playerIdx
        });
        assert.ok(indices.length, 'no legal move in Standard for ' + seats + ' players');
        command = { type: 'PLAY_CARD', cardUid: mine.hand[indices[0]] };
      }
      session.action(command);
      await tick();
      turns++;
    }
    assert.equal(host.getInfo().view.phase, 'roundOver', 'round must finish: seats=' + seats);
    const hostInfo = host.getInfo();
    assert.ok(hostInfo.history.length > seats, 'host event history was recorded');
    assert.ok(hostInfo.history.some(e => e.type === 'RoundScored'));
    assert.ok(hostInfo.history.some(e => e.type === 'TrickResolved'));
    for (let i = 0; i < guests.length; i++) {
      const guestInfo = guests[i].getInfo();
      assert.deepEqual(guestInfo.history, hostInfo.history, 'same history for all participants');
      assert.deepEqual(guestInfo.view.roundSummary, hostInfo.view.roundSummary);
      assert.equal(guestInfo.view.players.filter(p => Object.hasOwn(p, 'hand')).length, 1);
      assert.equal(guestInfo.view.players[i + 1].hand.length, 0, 'guest finished own hand');
    }
    for (const packet of transmitted.filter(x => x.direction === 'host-to-guest' && x.value.type === 'state')) {
      assert.ok(Array.isArray(packet.value.events));
      assert.ok(packet.value.events.every(e => e.sequence === packet.value.view.sequence));
      assert.ok(packet.value.events.every(e => !(e.type === 'CardPlayed' && e.hidden && Object.hasOwn(e,'uid'))),
        'Moon identity must not leak via public event');
    }
    host.close();
    guests.forEach(g => g.close());
  }
});
