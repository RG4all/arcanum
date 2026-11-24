/**
 * ARCANUM · direct peer transport. No signaling server and no TURN dependency.
 * Copies complete SDP + ICE candidates in user-visible offer/answer JSON.
 * STUN is optional and configured by the caller.
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
  const STUN = Object.freeze([{ urls: 'stun:stun.l.google.com:19302' }]);

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

  function waitForIce(pc, timeoutMs) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('ICE-Ermittlung hat zu lange gedauert')), timeoutMs || 18000);
      function done(error) {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', changed);
        if (error) reject(error); else resolve();
      }
      function changed() {
        if (pc.iceGatheringState === 'complete') done();
      }
      pc.addEventListener('icegatheringstatechange', changed);
      changed();
    });
  }

  function link(pc, callbacks) {
    let channel = null;
    let closed = false;
    const cb = callbacks || {};
    function status(state) { if (cb.onStatus) cb.onStatus(state); }
    function attach(dc) {
      channel = dc;
      channel.onopen = () => status('open');
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
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected') status('lost');
    };
    return {
      pc, attach,
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
        if (channel) channel.close();
        pc.close();
      }
    };
  }

  function pcFor(options) {
    const ctor = options && options.rtcCtor || root.RTCPeerConnection;
    if (typeof ctor !== 'function') throw new Error('WebRTC wird in diesem Browser nicht unterstützt');
    return new ctor({ iceServers: options && options.useStun ? STUN : [] });
  }

  async function createHostLink({ roomId, slotId, onMessage, onStatus, useStun, rtcCtor }) {
    if (!/^[a-f0-9]{24}$/.test(roomId) || !/^[a-f0-9]{16}$/.test(slotId)) throw new Error('Ungültige Sitzung');
    const pc = pcFor({ useStun, rtcCtor });
    const peer = link(pc, { onMessage, onStatus });
    try {
      peer.attach(pc.createDataChannel('arcanum', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIce(pc);
      const offerCode = JSON.stringify({
        v: VERSION, kind: 'offer', roomId, slotId,
        description: { type: 'offer', sdp: pc.localDescription.sdp }
      });
      return Object.assign(peer, { offerCode,
        async acceptAnswer(code) {
          const answer = signal(code, 'answer');
          if (answer.roomId !== roomId || answer.slotId !== slotId) throw new Error('Antwort gehört zu einer anderen Einladung');
          if (pc.remoteDescription) throw new Error('Antwort wurde bereits übernommen');
          await pc.setRemoteDescription(answer.description);
        }
      });
    } catch (error) { peer.close(); throw error; }
  }

  async function joinOffer(code, { onMessage, onStatus, useStun, rtcCtor } = {}) {
    const offer = signal(code, 'offer');
    const pc = pcFor({ useStun, rtcCtor });
    const peer = link(pc, { onMessage, onStatus });
    pc.ondatachannel = event => peer.attach(event.channel);
    try {
      await pc.setRemoteDescription(offer.description);
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIce(pc);
      return Object.assign(peer, { roomId: offer.roomId, slotId: offer.slotId,
        answerCode: JSON.stringify({
          v: VERSION, kind: 'answer', roomId: offer.roomId, slotId: offer.slotId,
          description: { type: 'answer', sdp: pc.localDescription.sdp }
        })
      });
    } catch (error) { peer.close(); throw error; }
  }

  return Object.freeze({ VERSION, STUN, signal, createHostLink, joinOffer });
});
