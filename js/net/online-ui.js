/**
 * ARCANUM · private online lobby and accessible client-side table.
 * Separate from the legacy offline GameEngine; never mutates offline state.
 */
(function (root) {
  'use strict';
  const Room = root.ArcanumPrivateRoom;
  const Cards = root.ArcanumCards;
  const Rules = root.ArcanumRules;
  const Core = root.ArcanumGameCommands;
  const Game = root.GameEngine;
  let session = null;
  let info = null;
  let pending = false;
  let lastSequence = -1;

  const el = id => document.getElementById(id);
  function show(id, value) { if (el(id)) el(id).hidden = !value; }
  function text(id, value) { if (el(id)) el(id).textContent = String(value == null ? '' : value); }
  function message(value) {
    text('online-message', value);
    pending = false;
  }
  function clear(id) { const target = el(id); if (target) target.replaceChildren(); }
  function item(id, content) {
    const li = document.createElement('li');
    li.textContent = content;
    el(id).appendChild(li);
  }
  function rosterName(id) {
    const player = info && info.roster.find(p => p.id === id);
    return player ? player.name : 'Spieler';
  }
  function active() {
    const view = info && info.view;
    return view && view.players[view.activePlayerIdx] &&
      view.players[view.activePlayerIdx].id === info.playerId;
  }
  function myHand() {
    const player = info && info.view && info.view.players.find(p => p.id === info.playerId);
    return player && Array.isArray(player.hand) ? player.hand : [];
  }
  function legalIndices() {
    if (!active() || info.view.phase !== 'playing') return [];
    const view = info.view;
    const hand = myHand().map(uid => Cards.DECK_BY_UID[uid]);
    if (hand.some(card => !card)) return [];
    return Rules.legalCardIndices(hand, {
      mode: view.mode, leadSuit: view.leadSuit,
      freeLead: view.oracleUid === 'major-4',
      trumpBan: view.trumpBan === view.activePlayerIdx,
      mustPlayHighest: view.forcedPlayer === view.activePlayerIdx
    });
  }
  function button(label, attr, value, disabled) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'ghost-button';
    control.textContent = label;
    control.dataset[attr] = String(value);
    control.disabled = Boolean(disabled);
    return control;
  }
  function renderTable() {
    const view = info && info.view;
    show('online-table', Boolean(view));
    if (!view) return;
    text('online-round', 'Runde ' + view.round + '/' + view.maxRounds + ' · ' + view.mode.toUpperCase());
    text('online-turn', view.phase === 'bidding' ? 'Vision: ' + rosterName(view.players[view.activePlayerIdx].id)
      : view.phase === 'playing' ? 'Am Zug: ' + rosterName(view.players[view.activePlayerIdx].id)
      : view.phase === 'priestess' ? 'Hohepriesterin: ' + rosterName(view.pendingPriestess.playerId)
      : view.phase === 'roundOver' ? 'Runde abgeschlossen' : 'Partie beendet');
    clear('online-players');
    view.players.forEach((p, index) => item('online-players',
      (p.id === info.playerId ? 'Du (' + rosterName(p.id) + ')' : rosterName(p.id)) +
      (index === view.activePlayerIdx && (view.phase === 'playing' || view.phase === 'bidding') ? ' ◀' : '') +
      ' · Vision ' + (p.bid == null ? '–' : p.bid) +
      ' · Stiche ' + p.won + ' · Karma ' + p.score + ' · Karten ' + p.cardsRemaining
    ));
    const trick = view.currentTrick.length
      ? view.currentTrick
      : view.lastTrick ? view.lastTrick.cards : [];
    text('online-trick-label', view.currentTrick.length ? 'Aktueller Stich'
      : view.lastTrick ? 'Letzter Stich (aufgedeckt)' : 'Noch keine Karte gespielt');
    const resolved = view.lastTrick;
    if (resolved) {
      const winningCard = resolved.cards.find(p => p.playerIdx === resolved.winnerIdx);
      const displayName = rosterName(view.players[resolved.winnerIdx].id);
      const card = winningCard && Cards.DECK_BY_UID[winningCard.uid];
      const detail = resolved.destroyed ? 'Turm zerstört den Stich – keine Punkte'
        : resolved.foolBeatWorld ? 'Narr entthront die Welt'
        : resolved.cancelled ? 'Hierophant: Effekte aus, Kartenwert entscheidet'
        : resolved.deathHalf ? 'Tod: halber Stich' : 'höchster gültiger Kartenrang';
      text('online-trick-winner', resolved.won === 0
        ? 'Kein Stichpunkt · ' + detail + ' · rechnerisch: ' + displayName
        : 'Stich gewonnen: ' + displayName + (card ? ' · ' + card.name : '') +
          ' · ' + detail);
    } else text('online-trick-winner', 'Noch kein Stich entschieden.');
    clear('online-trick');
    trick.forEach(entry => {
      const block = document.createElement('div');
      block.className = 'online-trick-card';
      if (!view.currentTrick.length && resolved &&
          resolved.won > 0 && entry.playerIdx === resolved.winnerIdx) {
        block.classList.add('is-winner');
      }
      const caption = document.createElement('small');
      caption.textContent = rosterName(view.players[entry.playerIdx].id);
      block.appendChild(caption);
      if (!view.currentTrick.length && resolved && resolved.ranks) {
        const rank = resolved.ranks.find(p => p.playerIdx === entry.playerIdx);
        if (rank) {
          const label = document.createElement('small');
          label.textContent = 'Stichrang: ' + rank.rank;
          block.appendChild(label);
        }
      }
      const card = entry.uid ? Cards.DECK_BY_UID[entry.uid] : Cards.CONCEALED_CARD;
      if (card) {
        const artwork = document.createElement('div');
        artwork.innerHTML = Game.cardMarkup(card);
        block.appendChild(artwork);
      }
      el('online-trick').appendChild(block);
    });
    clear('online-bids');
    const myTurn = active() && !info.ended;
    show('online-bid-panel', view.phase === 'bidding');
    if (view.phase === 'bidding') {
      const max = Rules.cardsPerPlayer(view.mode, view.round, view.players.length);
      for (let i = 0; i <= max; i++) el('online-bids').appendChild(
        button(String(i), 'onlineBid', i, !myTurn || pending));
    }
    clear('online-hand');
    const legal = legalIndices();
    myHand().forEach((uid, index) => {
      const card = Cards.DECK_BY_UID[uid];
      if (!card) return;
      const holder = document.createElement('div');
      holder.className = 'online-hand-card';
      holder.innerHTML = Game.cardMarkup(card, {
        tag: 'button',
        attributes: 'type="button" data-online-play="' + uid + '"' +
          (myTurn && view.phase === 'playing' && legal.includes(index) && !pending ? '' : ' disabled'),
        extraClass: 'hand-card'
      });
      el('online-hand').appendChild(holder);
    });
    show('online-priestess', view.phase === 'priestess');
    if (view.phase === 'priestess') {
      const chosen = view.players.find(p => p.id === info.playerId);
      const isChoosing = !info.ended && chosen && view.pendingPriestess &&
        view.pendingPriestess.playerId === info.playerId;
      const max = Rules.cardsPerPlayer(view.mode, view.round, view.players.length);
      el('online-priestess-minus').disabled = !isChoosing || chosen.bid <= 0;
      el('online-priestess-plus').disabled = !isChoosing || chosen.bid >= max;
    }
    clear('online-scores');
    (view.roundSummary || []).forEach(p => item('online-scores',
      rosterName(p.playerId) + ': ' + (p.points >= 0 ? '+' : '') + p.points +
      ' · Gesamt ' + p.score));
    show('online-score-panel', view.phase === 'roundOver' || view.phase === 'gameOver');
    show('online-next', info.role === 'host' && view.phase === 'roundOver' && !info.ended);
  }
  function render() {
    const isHost = info && info.role === 'host';
    const isGuest = info && info.role === 'guest';
    show('online-host-actions', Boolean(isHost && !info.started && !info.ended));
    show('online-guest-actions', Boolean(isGuest && !info.started && !info.ended));
    el('online-start').disabled = !isHost || info.started || info.ended ||
      info.roster.length !== info.seats || !info.roster.every(p => p.ready && p.connected);
    el('online-invite').disabled = !isHost || info.started || info.ended ||
      info.roster.length >= info.seats;
    el('online-ready').disabled = !isGuest || !info.playerId || info.ended;
    const ready = isGuest && info.roster.find(p => p.id === info.playerId)?.ready;
    text('online-ready', ready ? 'Nicht bereit' : 'Bereit');
    text('online-connection', !info ? 'Noch keine Verbindung' :
      info.ended ? 'Verbindung beendet' : info.started ? 'Partie aktiv' :
      (isHost ? 'Raum ' + info.roomId.slice(0, 8) : 'Mit Host verbinden') +
      ' · ' + info.roster.filter(p => p.connected).length + '/' + info.seats + ' verbunden');
    clear('online-roster');
    if (info) info.roster.forEach(p => item('online-roster',
      p.name + (p.id === info.playerId ? ' (du)' : '') +
      ' · ' + (p.connected ? p.ready ? 'bereit' : 'verbunden' : 'ausstehend')));
    if (info && info.view && info.view.sequence !== lastSequence) {
      pending = false;
      lastSequence = info.view.sequence;
    }
    renderTable();
  }
  function changed(value) {
    info = value;
    render();
  }
  function fault(error) { message(typeof error === 'string' ? error : error.message); render(); }
  async function guarded(fn) {
    try { await fn(); } catch (error) { fault(error); }
  }
  function iceDiagnostic(data) {
    const counts = data.counts || {};
    if (data.stage === 'gathered') {
      const via = Number(counts.relay) ? 'TURN-Relay vorhanden'
        : Number(counts.srflx) ? 'Öffentliche STUN-Adresse erkannt'
        : 'Nur lokale Host-Adressen erkannt';
      text('online-ice-diagnostics', via + ' · ICE: lokal ' + (counts.host || 0) +
        ', STUN ' + (counts.srflx || 0) + ', TURN ' + (counts.relay || 0) +
        (data.complete ? '' : '. Zeitlimit: Server ggf. nicht erreichbar.'));
    } else if (data.stage === 'selected-pair') {
      text('online-ice-diagnostics', 'P2P-Verbindung aktiv: lokal ' +
        (data.local || 'unbekannt') + ', Gegenstelle ' + (data.remote || 'unbekannt') +
        (data.protocol ? ' · ' + data.protocol.toUpperCase() : ''));
    } else if (data.stage === 'stun-error') {
      text('online-ice-diagnostics', 'ICE-Server meldet ein Problem (Code ' +
        (data.code || '?') + '). Prüfe UDP/Firewall, STUN-Adressen oder einen optionalen TURN-Relay.');
    } else if (data.stage === 'ice-state' && data.state === 'failed') {
      text('online-ice-diagnostics', 'ICE fehlgeschlagen: STUN allein kann restriktive NATs nicht verbinden. Optional TURN konfigurieren.');
    } else if (data.stage === 'connection-state' && data.state === 'failed') {
      text('online-ice-diagnostics', 'Keine direkte Verbindung möglich. TURN-Relay oder Netzwerkkonfiguration erforderlich.');
    }
  }
  function options() {
    return { rules: Rules, cards: Cards, name: el('online-name').value,
      useStun: el('online-stun').checked,
      stunUrls: el('online-stun-urls').value,
      turnUrl: el('online-turn-url').value.trim(),
      turnUsername: el('online-turn-user').value,
      turnCredential: el('online-turn-password').value,
      onChange: changed, onError: fault, onDiagnostic: iceDiagnostic };
  }
  function act(command) {
    if (!session || !info || !info.view || info.ended || pending) return;
    try {
      pending = true;
      session.action(command);
      if (info.role === 'host') pending = false;
      render();
    } catch (error) { fault(error); }
  }
  function install() {
    if (!el('online-lobby')) return;
    el('online-create').addEventListener('click', () => guarded(async () => {
      if (session) session.close();
      lastSequence = -1;
      session = Room.createHost({
        ...options(), mode: el('online-mode').value, seats: Number(el('online-seats').value)
      });
      el('online-output').value = '';
      message('Raum erstellt. Erzeuge eine Einladung und sende sie einem Gast.');
      render();
    }));
    el('online-invite').addEventListener('click', () => guarded(async () => {
      if (!session) throw new Error('Raum fehlt');
      el('online-invite').disabled = true;
      const code = await session.invite();
      el('online-output').value = code;
      message('Einladung kopieren. Gast erzeugt daraus seine Antwort.');
      render();
    }));
    el('online-join').addEventListener('click', () => guarded(async () => {
      if (session) session.close();
      lastSequence = -1;
      session = await Room.join({ ...options(), code: el('online-input').value });
      el('online-output').value = session.answerCode;
      message('Antwort kopieren und an den Host senden. Dort „Antwort übernehmen“ wählen.');
      render();
    }));
    el('online-accept').addEventListener('click', () => guarded(async () => {
      if (!session || !info || info.role !== 'host') throw new Error('Zuerst Host-Raum erstellen');
      await session.acceptAnswer(el('online-input').value);
      message('Antwort übernommen. Verbindung wird aufgebaut.');
    }));
    el('online-ready').addEventListener('click', () => guarded(async () => {
      if (!session || !info) return;
      const ready = info.roster.find(p => p.id === info.playerId)?.ready;
      session.ready(!ready);
    }));
    el('online-start').addEventListener('click', () => guarded(async () => {
      if (!session) return;
      session.start();
      message('Private Partie gestartet. Alle Züge laufen über den Host.');
    }));
    el('online-next').addEventListener('click', () => guarded(async () => session.nextRound()));
    el('online-priestess-minus').addEventListener('click', () => act({ type: Core.TYPES.CHOOSE_PRIESTESS, delta: -1 }));
    el('online-priestess-plus').addEventListener('click', () => act({ type: Core.TYPES.CHOOSE_PRIESTESS, delta: 1 }));
    el('online-bids').addEventListener('click', event => {
      const target = event.target.closest('[data-online-bid]');
      if (target && !target.disabled) act({ type: Core.TYPES.SUBMIT_BID, bid: Number(target.dataset.onlineBid) });
    });
    el('online-hand').addEventListener('click', event => {
      const target = event.target.closest('[data-online-play]');
      if (target && !target.disabled) act({ type: Core.TYPES.PLAY_CARD, cardUid: target.dataset.onlinePlay });
    });
    el('online-copy').addEventListener('click', () => guarded(async () => {
      const code = el('online-output').value;
      if (!code) throw new Error('Noch kein Signal vorhanden');
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard nicht verfügbar: Code manuell kopieren');
      await navigator.clipboard.writeText(code);
      message('Signal kopiert.');
    }));
    el('online-reset').addEventListener('click', () => {
      if (session) session.close();
      session = null; info = null; pending = false; lastSequence = -1;
      el('online-output').value = '';
      el('online-input').value = '';
      text('online-ice-diagnostics', 'ICE-Diagnose erscheint nach dem Verbindungstest.');
      message('Verbindung geschlossen.');
      render();
    });
    render();
  }
  root.ArcanumOnline = Object.freeze({ getInfo: () => info ? JSON.parse(JSON.stringify(info)) : null });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof globalThis !== 'undefined' ? globalThis : this);
