/**
 * WebRTC DataChannel transport with non-trickle SDP exchange.
 * STUN discovers candidates; TURN is an opt-in relay for restrictive NATs.
 * No signaling service or TURN account is provided by ARCANUM.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumRTC = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const VERSION = 1;
  const MAX_SIGNAL = 60000;
  const MAX_WIRE = 14000;
  const STUN = Object.freeze([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]);
  const DEFAULT_STUN_URLS = STUN.map(item => item.urls);

  function signal(code, kind) {
    if (typeof code !== 'string' || code.length > MAX_SIGNAL) throw new Error('Signal zu groß oder ungültig');
    let data;
    try { data = JSON.parse(code); } catch (_) { throw new Error('Signal ist kein gültiges JSON'); }
    if (!data || data.v !== VERSION || data.kind !== kind ||
        !/^[a-f0-9]{24}$/.test(data.roomId || '') ||
        !/^[a-f0-9]{16}$/.test(data.slotId || '') ||
        !data.description || data.description.type !== (kind === 'offer' ? 'offer' : 'answer') ||
        typeof data.description.sdp !== 'string' || !data.description.sdp.length ||
        data.description.sdp.length > 50000) throw new Error('Signaltyp, Version oder SDP ungültig');
    return data;
  }

  function candidateSummary(sdp) {
    const counts = { host: 0, srflx: 0, relay: 0, prflx: 0 };
    if (typeof sdp !== 'string') return counts;
    for (const line of sdp.split(/\r?\n/)) {
      if (!/^a=candidate:/i.test(line)) continue;
      const match = line.match(/\btyp\s+(host|srflx|relay|prflx)\b/i);
      if (match) counts[match[1].toLowerCase()]++;
    }
    return counts;
  }

  function configFor({ useStun = false, stunUrls, turnUrl, turnUsername, turnCredential } = {}) {
    let servers = [];
    if (useStun) {
      const urls = stunUrls == null ? DEFAULT_STUN_URLS
        : Array.isArray(stunUrls) ? stunUrls : String(stunUrls).split(/[\s,;]+/);
      const clean = urls.map(x => String(x).trim()).filter(Boolean);
      if (!clean.length || clean.length > 4 ||
          clean.some(x => !/^stuns?:[a-z0-9._\-[\]:]+(?::\d{1,5})?$/i.test(x))) {
        throw new Error('STUN-Adressen ungültig (stun:server:port)');
      }
      servers = clean.map(url => ({ urls: url }));
    }
    if (turnUrl && String(turnUrl).trim()) {
      const value = String(turnUrl).trim();
      if (!/^turns?:[a-z0-9._\-[\]:]+(?::\d{1,5})?(?:\?transport=(?:udp|tcp))?$/i.test(value)) {
        throw new Error('TURN-Adresse ungültig (turn:server:port)');
      }
      const username = String(turnUsername || '');
      const credential = String(turnCredential || '');
      if (!username || !credential || username.length > 256 || credential.length > 512) {
        throw new Error('TURN benötigt Benutzername und Passwort');
      }
      servers.push({ urls: value, username, credential });
    }
    return { iceServers: servers, iceTransportPolicy: 'all' };
  }

  function waitForIce(pc, timeoutMs) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve(true);
    return new Promise(resolve => {
      const timer = setTimeout(() => done(false), timeoutMs || 25000);
      function done(completed) {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', changed);
        resolve(completed);
      }
      function changed() { if (pc.iceGatheringState === 'complete') done(true); }
      pc.addEventListener('icegatheringstatechange', changed);
      changed();
    });
  }

  function link(pc, callbacks) {
    let channel = null;
    let closed = false;
    let reconnectTimer = null;
    const cb = callbacks || {};
    function status(state) { if (!closed && cb.onStatus) cb.onStatus(state); }
    function diagnostic(data) { if (!closed && cb.onDiagnostic) cb.onDiagnostic(data); }
    function attach(dc) {
      channel = dc;
      channel.onopen = () => { status('open'); reportPair(); };
      channel.onclose = () => status('closed');
      channel.onerror = () => status('error');
      channel.onmessage = event => {
        if (typeof event.data !== 'string' || event.data.length > MAX_WIRE) return status('bad-message');
        try {
          const message = JSON.parse(event.data);
          if (!message || typeof message !== 'object' || Array.isArray(message) ||
              message.v !== VERSION || typeof message.type !== 'string') return status('bad-message');
          if (cb.onMessage) cb.onMessage(message);
        } catch (_) { status('bad-message'); }
      };
    }
    async function reportPair() {
      if (!pc.getStats || closed) return;
      try {
        const stats = await pc.getStats();
        let pair = null, local = null, remote = null;
        stats.forEach(value => {
          if (value.type === 'transport' && value.selectedCandidatePairId) pair = stats.get(value.selectedCandidatePairId);
        });
        if (!pair) stats.forEach(value => {
          if (value.type === 'candidate-pair' && (value.selected || (value.nominated && value.state === 'succeeded'))) pair = value;
        });
        if (pair) { local = stats.get(pair.localCandidateId); remote = stats.get(pair.remoteCandidateId); }
        diagnostic({ stage: 'selected-pair', local: local?.candidateType || null,
          remote: remote?.candidateType || null, protocol: local?.protocol || null });
      } catch (_) { /* Browser-specific stats are optional. */ }
    }
    pc.oniceconnectionstatechange = () => {
      diagnostic({ stage: 'ice-state', state: pc.iceConnectionState });
      if (pc.iceConnectionState === 'failed') status('lost');
      if (pc.iceConnectionState === 'disconnected') {
        status('degraded');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') status('lost');
        }, 12000);
      } else clearTimeout(reconnectTimer);
    };
    pc.onicecandidateerror = event => diagnostic({
      stage: 'stun-error', code: event.errorCode || null,
      message: 'ICE-Server nicht erreichbar oder durch Netzwerk gesperrt'
    });
    pc.onconnectionstatechange = () => {
      diagnostic({ stage: 'connection-state', state: pc.connectionState });
      if (pc.connectionState === 'failed') status('lost');
      if (pc.connectionState === 'closed') status('closed');
    };
    return {
      pc, attach, diagnostic,
      get isOpen() { return !closed && channel && channel.readyState === 'open'; },
      send(payload) {
        if (!this.isOpen) throw new Error('DataChannel ist nicht verbunden');
        const serialized = JSON.stringify({ v: VERSION, ...payload });
        if (serialized.length > MAX_WIRE) throw new Error('Netzwerknachricht zu groß');
        channel.send(serialized);
      },
      close() {
        if (closed) return;
        closed = true;
        clearTimeout(reconnectTimer);
        if (channel) channel.close();
        pc.close();
      }
    };
  }

  function pcFor(options) {
    const ctor = options && options.rtcCtor || root.RTCPeerConnection;
    if (typeof ctor !== 'function') throw new Error('WebRTC wird in diesem Browser nicht unterstützt');
    return new ctor(configFor(options || {}));
  }
  function localSignal(pc, kind, roomId, slotId) {
    const description = pc.localDescription;
    const counts = candidateSummary(description?.sdp);
    if (Object.values(counts).every(value => value === 0)) {
      throw new Error('Keine ICE-Kandidaten vorhanden: WebRTC/Firewall prüfen');
    }
    return {
      code: JSON.stringify({
        v: VERSION, kind, roomId, slotId,
        description: { type: kind, sdp: description.sdp }
      }),
      counts
    };
  }
  function optionsOf(input) {
    const o = input || {};
    return {
      useStun: o.useStun, stunUrls: o.stunUrls, turnUrl: o.turnUrl,
      turnUsername: o.turnUsername, turnCredential: o.turnCredential,
      rtcCtor: o.rtcCtor
    };
  }

  async function createHostLink(args) {
    const { roomId, slotId, onMessage, onStatus, onDiagnostic } = args;
    if (!/^[a-f0-9]{24}$/.test(roomId) || !/^[a-f0-9]{16}$/.test(slotId)) throw new Error('Ungültige Sitzung');
    const pc = pcFor(optionsOf(args));
    const peer = link(pc, { onMessage, onStatus, onDiagnostic });
    try {
      peer.attach(pc.createDataChannel('arcanum', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      const complete = await waitForIce(pc);
      const output = localSignal(pc, 'offer', roomId, slotId);
      peer.diagnostic({ stage: 'gathered', complete, counts: output.counts });
      return Object.assign(peer, {
        offerCode: output.code,
        async acceptAnswer(code) {
          const answer = signal(code, 'answer');
          if (answer.roomId !== roomId || answer.slotId !== slotId) throw new Error('Antwort gehört zu einer anderen Einladung');
          if (pc.remoteDescription) throw new Error('Antwort wurde bereits übernommen');
          await pc.setRemoteDescription(answer.description);
          peer.diagnostic({ stage: 'remote-candidates', counts: candidateSummary(answer.description.sdp) });
        }
      });
    } catch (error) { peer.close(); throw error; }
  }

  async function joinOffer(code, args = {}) {
    const offer = signal(code, 'offer');
    const pc = pcFor(optionsOf(args));
    const peer = link(pc, { onMessage: args.onMessage, onStatus: args.onStatus, onDiagnostic: args.onDiagnostic });
    pc.ondatachannel = event => peer.attach(event.channel);
    try {
      await pc.setRemoteDescription(offer.description);
      peer.diagnostic({ stage: 'remote-candidates', counts: candidateSummary(offer.description.sdp) });
      await pc.setLocalDescription(await pc.createAnswer());
      const complete = await waitForIce(pc);
      const output = localSignal(pc, 'answer', offer.roomId, offer.slotId);
      peer.diagnostic({ stage: 'gathered', complete, counts: output.counts });
      return Object.assign(peer, {
        roomId: offer.roomId, slotId: offer.slotId, answerCode: output.code
      });
    } catch (error) { peer.close(); throw error; }
  }

  return Object.freeze({ VERSION, STUN, signal, candidateSummary, configFor, createHostLink, joinOffer });
});
