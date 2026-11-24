/**
 * ARCANUM · serverless private room coordinator (host-authoritative, UNRANKED).
 * The host knows the full deck and always projects a recipient-specific view.
 * No lobby backend, account, TURN relay, or permanent storage.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('../core/game-state.js') : root.ArcanumGameState,
    typeof module === 'object' && module.exports ? require('../core/game-commands.js') : root.ArcanumGameCommands,
    typeof module === 'object' && module.exports ? require('../core/game-reducer.js') : root.ArcanumGameReducer,
    typeof module === 'object' && module.exports ? require('./webrtc.js') : root.ArcanumRTC,
    root
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumPrivateRoom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (stateApi, commands, reducer, rtcDefault, root) {
  'use strict';

  const ACTIONS = Object.freeze([
    commands.TYPES.SUBMIT_BID, commands.TYPES.PLAY_CARD, commands.TYPES.CHOOSE_PRIESTESS
  ]);

  function assert(value, message) { if (!value) throw new Error(message); }
  function cleanName(value) {
    return String(value || 'Gast').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Gast';
  }
  function randomHex(n) {
    const crypto = root.crypto;
    if (!crypto || !crypto.getRandomValues) throw new Error('HTTPS oder localhost für sichere Zufalls-IDs erforderlich');
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  function copy(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }

  function createHost({ rules, cards, seats = 2, mode = 'raw', name = 'Host',
    rtc = rtcDefault, useStun = true, stunUrls, turnUrl, turnUsername, turnCredential,
    idFactory = randomHex, onChange, onError, onDiagnostic } = {}) {
    assert(rules && cards && rules.MODES && rules.MODES[mode], 'Ungültiger Spielmodus');
    assert(Number.isInteger(seats) && seats >= 2 && seats <= 6, 'Spielerzahl muss 2–6 sein');
    const roomId = idFactory(12);
    const host = { id: 'host', name: cleanName(name), ready: true, connected: true };
    const peers = new Map();
    let game = null;
    let matchId = null;
    let stopped = false;
    let ended = false;

    function report(reason) { if (onError) onError(String(reason)); }
    function roster() {
      return [host, ...Array.from(peers.values()).map(p => ({
        id: p.id, name: p.name || 'Verbindung ausstehend',
        ready: p.ready, connected: p.connected
      }))];
    }
    function status() {
      return { role: 'host', roomId, playerId: 'host', mode, seats,
        roster: roster(), started: Boolean(game), ended,
        view: game ? stateApi.snapshotFor(game, 'host') : null };
    }
    function notify() { if (onChange) onChange(status()); }
    function send(peer, data) {
      if (!peer.link || !peer.link.isOpen) return;
      try { peer.link.send(data); } catch (error) { report(error.message); }
    }
    function rosterBroadcast() {
      const msg = { type: 'roster', roomId, mode, seats, players: roster() };
      peers.forEach(p => { if (p.connected) send(p, msg); });
      notify();
    }
    function broadcastState() {
      if (!game) return;
      peers.forEach(p => {
        if (p.connected) send(p, {
          type: 'state', matchId,
          view: stateApi.snapshotFor(game, p.id)
        });
      });
      notify();
    }
    function run(command, actorId) {
      assert(game && !ended, 'Keine laufende Partie');
      const candidate = {
        type: command.type, bid: command.bid, cardUid: command.cardUid,
        delta: command.delta, actorId,
        sequence: game.sequence + 1, protocolVersion: commands.PROTOCOL_VERSION
      };
      commands.validateNetworkCommand(candidate);
      const result = reducer.apply(game, candidate, { rules, cards });
      game = result.state;
      broadcastState();
      return result.events;
    }
    function incoming(peer, msg) {
      if (stopped) return;
      try {
        if (msg.type === 'hello') {
          assert(!game && !peer.connected, 'Anmeldung nicht möglich');
          assert(msg.ruleset === rules.RULESET_VERSION, 'Regelwerksversion inkompatibel');
          peer.name = cleanName(msg.name);
          peer.connected = true;
          peer.ready = false;
          send(peer, { type: 'welcome', roomId, playerId: peer.id,
            ruleset: rules.RULESET_VERSION, mode, seats });
          rosterBroadcast();
          return;
        }
        assert(peer.connected, 'Bitte zuerst anmelden');
        if (msg.type === 'ready') {
          assert(!game && typeof msg.ready === 'boolean', 'Ready außerhalb der Lobby');
          peer.ready = msg.ready;
          rosterBroadcast();
        } else if (msg.type === 'action') {
          assert(game && !ended && msg.matchId === matchId, 'Ungültige Partie');
          assert(Number.isSafeInteger(msg.requestNo) && msg.requestNo === peer.lastRequestNo + 1, 'Ungültige Befehlsfolge');
          peer.lastRequestNo = msg.requestNo;
          assert(msg.command && ACTIONS.includes(msg.command.type), 'Unerlaubter Befehl');
          // Never accept actorId, sequence or authority from the remote client.
          run(msg.command, peer.id);
        } else throw new Error('Unbekannter Nachrichtentyp');
      } catch (error) { send(peer, { type: 'error', message: String(error.message).slice(0,160) }); report(error.message); }
    }
    function peerStatus(peer, value) {
      if (stopped) return;
      if (value === 'lost' || value === 'closed' || value === 'error') {
        peer.connected = false;
        peer.ready = false;
        if (game) { ended = true; report('Verbindung verloren: Partie angehalten, keine Host-Migration im MVP'); }
        else { peers.delete(peer.slotId); peer.link && peer.link.close(); }
        rosterBroadcast();
      } else if (value === 'bad-message') report('Ungültige Netzwerknachricht verworfen');
    }
    const api = {
      roomId,
      getInfo: status,
      async invite() {
        assert(!stopped && !game, 'Einladung nur in offener Lobby');
        assert(peers.size < seats - 1, 'Alle Plätze sind bereits reserviert');
        const slotId = idFactory(8);
        assert(!peers.has(slotId), 'Doppelte Einladungs-ID');
        const peer = { id: 'p-' + slotId, slotId, name: null, connected: false,
          ready: false, lastRequestNo: 0, link: null };
        peers.set(slotId, peer);
        notify();
        try {
          peer.link = await rtc.createHostLink({
            roomId, slotId, useStun, stunUrls, turnUrl, turnUsername, turnCredential,
            onDiagnostic: data => { if (onDiagnostic) onDiagnostic({ peerId: peer.id, ...data }); },
            onMessage: msg => incoming(peer, msg),
            onStatus: value => peerStatus(peer, value)
          });
          return peer.link.offerCode;
        } catch (error) {
          peers.delete(slotId);
          notify();
          throw error;
        }
      },
      async acceptAnswer(code) {
        const answer = rtc.signal(code, 'answer');
        assert(answer.roomId === roomId, 'Antwort gehört zu einem anderen Raum');
        const peer = peers.get(answer.slotId);
        assert(peer && peer.link && !peer.connected, 'Keine offene Einladung für diese Antwort');
        await peer.link.acceptAnswer(code);
        notify();
      },
      start() {
        assert(!stopped && !game, 'Partie wurde bereits gestartet');
        assert(peers.size === seats - 1 &&
          Array.from(peers.values()).every(p => p.connected && p.ready && p.link && p.link.isOpen),
          'Es müssen alle Spieler verbunden und bereit sein');
        matchId = idFactory(12);
        const seedHex = idFactory(4);
        const seed = Number.parseInt(seedHex, 16) >>> 0;
        game = stateApi.createGame({
          rules, cards, mode,
          playerIds: roster().map(p => p.id), seed
        });
        run({ type: commands.TYPES.START_ROUND }, 'host');
        return matchId;
      },
      action(command) {
        assert(game && !ended && ACTIONS.includes(command && command.type), 'Unerlaubter Spielbefehl');
        return run(command, 'host');
      },
      nextRound() {
        assert(game && !ended && game.phase === stateApi.PHASE.ROUND_OVER, 'Runde nicht abgeschlossen');
        return run({ type: commands.TYPES.NEXT_ROUND }, 'host');
      },
      close() {
        if (stopped) return;
        stopped = true; ended = true;
        peers.forEach(p => {
          send(p, { type: 'end' });
          if (p.link) p.link.close();
        });
        peers.clear();
        notify();
      }
    };
    notify();
    return api;
  }

  async function join({ code, name = 'Gast', rules, cards, rtc = rtcDefault, useStun = true,
    onChange, onError, onDiagnostic, stunUrls, turnUrl, turnUsername, turnCredential } = {}) {
    assert(rules && cards, 'Regelwerk fehlt');
    let id = null, roomId = null, mode = null, seats = 0, matchId = null;
    let roster = [], view = null, requestNo = 0, ended = false, stopped = false;
    let link = null;
    function report(error) { if (onError) onError(String(error)); }
    function info() {
      return { role: 'guest', roomId, playerId: id, mode, seats,
        roster: copy(roster), view: copy(view), started: Boolean(matchId), ended };
    }
    function notify() { if (onChange) onChange(info()); }
    function incoming(msg) {
      if (stopped) return;
      try {
        if (msg.type === 'welcome') {
          assert(!id && msg.roomId === roomId &&
            msg.ruleset === rules.RULESET_VERSION &&
            typeof msg.playerId === 'string' && /^p-[a-f0-9]{16}$/.test(msg.playerId),
            'Ungültige Beitrittsbestätigung');
          id = msg.playerId; mode = msg.mode; seats = msg.seats;
        } else if (msg.type === 'roster') {
          assert(msg.roomId === roomId && Array.isArray(msg.players) &&
            msg.players.length <= 6 && msg.players.length >= 1, 'Ungültige Spielerliste');
          roster = msg.players.map(p => ({
            id: String(p.id).slice(0,40),
            name: cleanName(p.name), ready: p.ready === true, connected: p.connected === true
          }));
          mode = msg.mode; seats = msg.seats;
        } else if (msg.type === 'state') {
          const next = msg.view;
          assert(id && next && next.schema === stateApi.VERSION &&
            next.protocolVersion === commands.PROTOCOL_VERSION &&
            next.ruleset === rules.RULESET_VERSION && Array.isArray(next.players) &&
            next.players.length >= 2 && next.players.length <= 6 &&
            next.players.some(p => p.id === id && Array.isArray(p.hand)) &&
            next.players.every(p => p.id === id || !Object.prototype.hasOwnProperty.call(p, 'hand')) &&
            !Object.prototype.hasOwnProperty.call(next, 'seed') &&
            !Object.prototype.hasOwnProperty.call(next, 'rngState'), 'Ungültiger oder unsicherer Snapshot');
          assert(!matchId || matchId === msg.matchId, 'Partie-ID hat sich geändert');
          assert(Number.isSafeInteger(next.sequence) && (!view || next.sequence > view.sequence), 'Snapshot-Sequenz veraltet');
          matchId = msg.matchId; view = copy(next);
        } else if (msg.type === 'error') report(String(msg.message).slice(0,160));
        else if (msg.type === 'end') { ended = true; report('Host hat die Partie beendet'); }
        else throw new Error('Unbekannter Nachrichtentyp');
        notify();
      } catch (error) { report(error.message); }
    }
    function connectionStatus(value) {
      if (stopped) return;
      if (value === 'open') {
        link.send({ type: 'hello', name: cleanName(name), ruleset: rules.RULESET_VERSION });
      } else if (value === 'lost' || value === 'closed' || value === 'error') {
        ended = true; report('Verbindung zum Host abgebrochen'); notify();
      } else if (value === 'bad-message') report('Beschädigte Netzwerknachricht verworfen');
    }
    link = await rtc.joinOffer(code, {
      useStun, stunUrls, turnUrl, turnUsername, turnCredential,
      onDiagnostic: data => { if (onDiagnostic) onDiagnostic({ peerId: 'host', ...data }); },
      onMessage: incoming, onStatus: connectionStatus
    });
    roomId = link.roomId;
    notify();
    return {
      answerCode: link.answerCode,
      getInfo: info,
      ready(value) {
        assert(!stopped && !ended && id && !matchId, 'Ready ist noch nicht verfügbar');
        link.send({ type: 'ready', ready: value === true });
      },
      action(command) {
        assert(!stopped && !ended && matchId && ACTIONS.includes(command && command.type), 'Partie nicht verfügbar');
        link.send({ type: 'action', matchId, requestNo: ++requestNo,
          command: { type: command.type, cardUid: command.cardUid, bid: command.bid, delta: command.delta } });
      },
      close() {
        if (stopped) return;
        stopped = true; ended = true;
        link.close(); notify();
      }
    };
  }

  return Object.freeze({ createHost, join, cleanName });
});
