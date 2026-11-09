/**
 * Arcanum · Oberfläche und Interaktion
 * =================================================================
 * Bindet Daten (`cards.js`), Regeln (`rules.js`), Kunst (`card-art.js`)
 * und Effekte (`animations.js`) an das DOM.
 *
 * Verantwortlichkeiten:
 *   – Moduswechsel (Turbo / Standard)
 *   – Regelwerk-Ansicht
 *   – Karten-Kodex: Gruppen, Suche, Filter, Sortierung, Detaildialog
 *   – Stochastik-Diagramm (hypergeometrisch, echte Deckdaten)
 *   – Wertungsrechner (nutzt `ArcanumRules.scoreRound`)
 *   – Tooltips, Navigation, Fokusführung, Tastaturbedienung
 *   – Initialisierung von 3D-Bühne und Spiel-Engine
 */
(function (global) {
  'use strict';

  const CARDS = global.ArcanumCards;
  const RULES = global.ArcanumRules;
  const ART = global.ArcanumCardArt;
  const FX = global.ArcanumFx;

  const app = {
    mode: 'turbo',
    chart: null,
    codexFilter: 'all',
    codexSort: 'canonical',
    codexSearch: '',
    lastFocused: null
  };

  /* ---------------------------------------------------------------- */
  /* Hilfen                                                            */
  /* ---------------------------------------------------------------- */

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  /* ---------------------------------------------------------------- */
  /* Modus                                                             */
  /* ---------------------------------------------------------------- */

  function applyMode(mode) {
    const next = mode === 'standard' ? 'standard' : 'turbo';
    app.mode = next;
    global.currentActiveMode = next;

    const buttons = { turbo: document.getElementById('btn-mode-turbo'), standard: document.getElementById('btn-mode-standard') };
    Object.entries(buttons).forEach(([key, button]) => {
      if (!button) return;
      const active = key === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const badge = document.getElementById('header-mode-badge');
    if (badge) {
      badge.textContent = next === 'turbo' ? '⚡ Turbo Edition' : '📜 Standard Edition';
      badge.dataset.mode = next;
    }

    setText('hud-mode-name', next === 'turbo' ? 'Turbo' : 'Standard');
    setText('hud-mode-detail', next === 'turbo'
      ? `${RULES.maxRounds('turbo')} Runden · reine Zahlenhierarchie`
      : `${RULES.maxRounds('standard')} Runden · Orakel & Schicksal`);

    renderRules();
    renderCodex();
    updateChart();
    calculateScore();
  }

  function switchRulesetMode(mode) {
    if (app.mode === mode) return;
    applyMode(mode);
    // Ein Moduswechsel startet ein frisches Ritual mit gültigen Rundenzahlen.
    global.GameEngine.initGame(Number(document.getElementById('game-player-count')?.value) || 3);
  }

  /* ---------------------------------------------------------------- */
  /* Regelwerk                                                         */
  /* ---------------------------------------------------------------- */

  function scoringTable() {
    const s = RULES.SCORING;
    return [
      ['Exaktes Gebot (> 0)', `+${s.exactBase} + ${s.exactPerTrick} pro Stich`],
      ['Null-Ansage gehalten', `+${s.nullBonus}`],
      ['Null-Ansage gescheitert', `${s.nullPenalty}`],
      ['Abweichung (Turbo, Über-/Unterbieten)', `−${s.missPerTrick} je Stich`],
      ['Unterbieten (Standard)', `−${s.underbidRateStandard} je Stich`],
      ['Überbieten (Standard)', `−${s.missPerTrick} je Stich`],
      ['Stern-Orakel aktiv', `+${s.starBonus} bei exaktem Gebot`],
      ['Hofkarten-Segen (Standard)', 'Bube 1 · Ritter 2 · Königin 3 · König 4 Karma je gewonnener Hofkarte']
    ];
  }

  function renderRules() {
    const container = document.getElementById('rules-view');
    if (!container) return;
    const standard = app.mode === 'standard';
    const cardsRange = RULES.MODES[app.mode];
    const table = scoringTable().map(([label, value]) =>
      `<tr><th scope="row">${label}</th><td>${value}</td></tr>`).join('');

    container.innerHTML = `
      <div class="section-head">
        <div>
          <span class="section-eyebrow">${standard ? 'Strategisch & tiefgründig' : 'Schnell & kompromisslos'}</span>
          <h2 id="rules-title">${standard ? '📜 Arcanum Standard (Kodex-Regeln)' : '⚡ Arcanum Turbo'}</h2>
          <p class="section-lede">${standard
            ? `${cardsRange.maxRounds} Runden · ${cardsRange.baseCards + 1}–${cardsRange.baseCards + cardsRange.maxRounds} Karten · ein Orakel pro Runde`
            : `${cardsRange.maxRounds} Runden · ${cardsRange.baseCards + 1}–${cardsRange.baseCards + cardsRange.maxRounds} Karten · keine Orakel`}</p>
        </div>
        <button type="button" class="ghost-button" id="rules-open-codex">Zum Karten-Kodex →</button>
      </div>
      <div class="rules-grid">
        <article class="rules-card">
          <h3>1 · Ablauf</h3>
          <ol class="rules-list">
            <li><b>Vision:</b> Alle sagen gleichzeitig voraus, wie viele Stiche sie gewinnen.</li>
            <li><b>Stiche:</b> Wer anspielt, setzt die zu bedienende Farbe. Trumpf ist immer erlaubt.</li>
            <li><b>Wertung:</b> Treffer zahlen, Abweichungen kosten – Karma wird über alle Runden summiert.</li>
          </ol>
        </article>
        <article class="rules-card">
          <h3>2 · Rangordnung</h3>
          <ol class="rules-list">
            <li>Höchster Trumpf gewinnt, sonst höchste Karte der angespielten Farbe.</li>
            <li>Ass zählt <b>14,5</b> und schlägt den König; Hofkarten bleiben Bube 11 bis König 14.</li>
            <li>Der Narr (0) verliert immer – außer er fällt direkt nach der Welt (XXI).</li>
            <li>Der Turm (XVI) vernichtet den Stich; der Tod (XIII) halbiert ihn.</li>
          </ol>
        </article>
        <article class="rules-card">
          <h3>3 · ${standard ? 'Orakel & Schicksal' : 'Schlüsselkarten'}</h3>
          <ol class="rules-list">
            ${standard ? `
              <li>Fünf Orakel verändern das Weltgesetz einer Runde: Kelche als Trümpfe, freie Wahl, Partnerstiche, das Rad oder der Stern.</li>
              <li>Schicksalskarten wirken beim Auswerten eines Stichs – der Hierophant annulliert sie alle.</li>
              <li>Jede gewonnene Hofkarte zahlt zusätzlich Karma (Hofkarten-Segen).</li>` : `
              <li>Die Welt (XXI) ist der höchste Trumpf des Spiels.</li>
              <li>Der Narr (0) verliert gegen alles.</li>
              <li>Der Turm (XVI) nimmt allen den Stich.</li>`}
          </ol>
        </article>
        <article class="rules-card rules-card--wide">
          <h3>4 · Wertung im Detail</h3>
          <table class="rules-table"><tbody>${table}</tbody></table>
          <p class="rules-note">Halbe Stiche (Tod) sind zulässig; eine Abweichung wird auf ganze Stiche aufgerundet, damit alle Punktzahlen ganzzahlig bleiben.</p>
        </article>
      </div>`;

    const openCodex = document.getElementById('rules-open-codex');
    if (openCodex) openCodex.addEventListener('click', () => document.getElementById('kodex')?.scrollIntoView({ behavior: 'smooth' }));
  }

  /* ---------------------------------------------------------------- */
  /* Karten-Kodex                                                      */
  /* ---------------------------------------------------------------- */

  function codexCardMarkup(card) {
    const effect = card.effectUid ? CARDS.EFFECTS[card.effectUid] : null;
    const badge = effect ? `<span class="codex-card__badge" data-type="${effect.type}">${effect.type}</span>` : '';
    return `<button type="button" class="codex-card" data-uid="${card.uid}" aria-label="${escapeHtml(card.name)} öffnen">
      <span class="codex-card__art" aria-hidden="true">${ART.face(card, { suffix: 'codex' })}</span>
      <span class="codex-card__meta">
        <span class="codex-card__name">${escapeHtml(card.isTrump ? card.shortName : card.name)}</span>
        <span class="codex-card__sub">${card.isTrump ? `Große Arkana ${card.numeral}` : `${card.suit} · Rang ${card.rank}`}</span>
        ${effect ? `<span class="codex-card__effect">${escapeHtml(effect.short)}</span>` : '<span class="codex-card__effect is-muted">Reine Zahlenkarte</span>'}
        ${badge}
      </span>
    </button>`;
  }

  function renderCodex() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;
    const cards = CARDS.filterCodexCards({ search: app.codexSearch, filter: app.codexFilter, sort: app.codexSort });

    setText('codex-count', `${cards.length} von ${CARDS.TAROT_DECK.length} Karten`);
    setText('codex-effects-count', `${CARDS.EFFECT_LIST.length} Spezialeffekte`);

    if (!cards.length) {
      grid.innerHTML = `<p class="codex-empty">Keine Karte passt zu dieser Suche. <button type="button" class="link-button" data-codex-reset>Filter zurücksetzen</button></p>`;
      return;
    }

    // Gruppierung: Große Arkana, dann die vier Farben – in Kodex-Reihenfolge.
    const groups = new Map();
    cards.forEach(card => {
      const key = card.group;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(card);
    });

    const orderedKeys = CARDS.CODEX_GROUPS.map(group => group.key).filter(key => groups.has(key));
    grid.innerHTML = orderedKeys.map(key => {
      const group = CARDS.CODEX_GROUPS.find(entry => entry.key === key);
      const groupCards = groups.get(key);
      return `<section class="codex-group" aria-labelledby="codex-group-${key}">
        <header class="codex-group__head">
          <h3 id="codex-group-${key}"><span aria-hidden="true">${group.icon}</span> ${group.label}</h3>
          <p>${group.hint} · ${groupCards.length} Karten</p>
        </header>
        <div class="codex-group__grid">${groupCards.map(codexCardMarkup).join('')}</div>
      </section>`;
    }).join('');
  }

  /** Detaildialog einer Karte – großes Motiv, Symbolik, Regeltext. */
  function openCardDialog(uid) {
    const card = CARDS.DECK_BY_UID[uid];
    if (!card) return;
    const dialog = document.getElementById('card-dialog');
    if (!dialog) return;
    const effect = card.effectUid ? CARDS.EFFECTS[card.effectUid] : null;
    const keywords = (card.keywords || []).map(word => `<li>${escapeHtml(word)}</li>`).join('');
    const value = card.isTrump ? `Trumpf ${card.trumpNum}` : `Rangwert ${card.rank === 1 ? '14,5' : card.rank}`;

    dialog.innerHTML = `
      <div class="card-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="card-dialog-title">
        <button type="button" class="card-dialog__close" data-close-dialog aria-label="Dialog schließen">✕</button>
        <div class="card-dialog__art">${ART.face(card, { suffix: 'dialog' })}</div>
        <div class="card-dialog__body">
          <span class="section-eyebrow">${card.isTrump ? 'Große Arkana' : `Kleine Arkana · ${card.suit} · ${card.element}`}</span>
          <h3 id="card-dialog-title">${escapeHtml(card.name)}</h3>
          <p class="card-dialog__english">${escapeHtml(card.english || card.suit || '')}</p>
          <p class="card-dialog__upright">${escapeHtml(card.upright)}</p>
          <dl class="card-dialog__stats">
            <div><dt>Wert</dt><dd>${value}</dd></div>
            <div><dt>Gruppe</dt><dd>${card.isTrump ? `Große Arkana ${card.numeral}` : card.suit}</dd></div>
            ${card.court ? `<div><dt>Hofkarten-Segen</dt><dd>+${card.courtKarma} Karma</dd></div>` : ''}
            <div><dt>Modus</dt><dd>${effect ? (effect.mode === 'both' ? 'Turbo & Standard' : 'Standard') : 'alle Modi'}</dd></div>
          </dl>
          ${effect ? `<div class="card-dialog__effect" data-type="${effect.type}">
            <h4>${escapeHtml(effect.title)}</h4>
            <p>${escapeHtml(effect.text)}</p>
          </div>` : ''}
          <ul class="card-dialog__keywords" aria-label="Symbolik">${keywords}</ul>
        </div>
      </div>`;

    app.lastFocused = document.activeElement;
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    if (document.body) document.body.classList.add('has-dialog');
    dialog.querySelector('[data-close-dialog]')?.focus();
  }

  function closeCardDialog() {
    const dialog = document.getElementById('card-dialog');
    if (!dialog || !dialog.classList.contains('is-open')) return;
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    if (document.body) document.body.classList.remove('has-dialog');
    if (app.lastFocused && app.lastFocused.focus) app.lastFocused.focus();
  }

  /* ---------------------------------------------------------------- */
  /* Stochastik                                                        */
  /* ---------------------------------------------------------------- */

  function handSizes(mode) {
    const config = RULES.MODES[mode];
    return Array.from({ length: config.maxRounds }, (_, index) => RULES.cardsPerPlayer(mode, index + 1));
  }

  function deckStats() {
    return {
      total: CARDS.TAROT_DECK.length,
      trumps: CARDS.TAROT_DECK.filter(card => card.isTrump).length
    };
  }

  function initChart() {
    if (typeof global.Chart === 'undefined') {
      const frame = document.querySelector('.chart-frame');
      if (frame) frame.insertAdjacentHTML('beforeend', '<p class="chart-fallback">Diagramm nicht verfügbar (Chart.js konnte nicht geladen werden).</p>');
      return;
    }
    const canvas = document.getElementById('probChart');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    const { total, trumps } = deckStats();
    const sizes = handSizes(app.mode);
    app.chart = new global.Chart(ctx, {
      type: 'line',
      data: {
        labels: sizes.map(size => `${size} Karten`),
        datasets: [
          {
            label: 'Chance auf ≥ 1 Trumpf',
            data: sizes.map(size => RULES.chanceOfAtLeastOneTrump(size, total, trumps)),
            borderColor: '#f2dda3',
            backgroundColor: 'rgba(242, 221, 163, .14)',
            borderWidth: 3,
            fill: true,
            tension: 0.34,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#d8bd78',
            pointBorderColor: '#0b0710',
            pointBorderWidth: 2
          },
          {
            label: 'Chance auf ≥ 2 Trümpfe',
            data: sizes.map(size => Math.round((1 - hypergeometricAtMost(size, total, trumps, 1)) * 1000) / 10),
            borderColor: '#b49ad5',
            backgroundColor: 'rgba(180, 154, 213, .10)',
            borderWidth: 2,
            borderDash: [6, 5],
            fill: false,
            tension: 0.34,
            pointRadius: 4,
            pointBackgroundColor: '#b49ad5'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(216, 189, 120, .14)' },
            ticks: { color: '#e7dcc6', font: { size: 12 }, callback: value => `${value} %` }
          },
          x: {
            grid: { color: 'rgba(216, 189, 120, .1)' },
            ticks: { color: '#e7dcc6', font: { size: 12 } }
          }
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#f2eee6', boxWidth: 14, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 7, 16, .96)',
            borderColor: 'rgba(216, 189, 120, .5)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#f2dda3',
            bodyColor: '#f2eee6',
            callbacks: { label: context => ` ${context.dataset.label}: ${context.parsed.y} %` }
          }
        }
      }
    });
    updateChart();
  }

  /** P(X ≤ k) für die hypergeometrische Verteilung. */
  function hypergeometricAtMost(draws, total, successes, k) {
    let probability = 0;
    for (let hits = 0; hits <= Math.min(k, successes); hits++) {
      probability += (combinations(successes, hits) * combinations(total - successes, draws - hits)) / combinations(total, draws);
    }
    return probability;
  }

  function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
    return result;
  }

  function updateChart() {
    const explanation = document.getElementById('chart-explanation');
    const { total, trumps } = deckStats();
    const sizes = handSizes(app.mode);
    const first = sizes[0];
    const last = sizes[sizes.length - 1];
    if (explanation) {
      explanation.innerHTML = `Das Deck enthält <b>${total} Karten</b>, davon <b>${trumps} Große Arkana</b>.
        Die Kurven zeigen die exakte hypergeometrische Wahrscheinlichkeit (Ziehen ohne Zurücklegen):
        bei <b>${first} Karten</b> liegt die Chance auf mindestens einen Trumpf bei
        <b>${RULES.chanceOfAtLeastOneTrump(first, total, trumps)} %</b>, bei <b>${last} Karten</b> bei
        <b>${RULES.chanceOfAtLeastOneTrump(last, total, trumps)} %</b>.
        Erwartete Trümpfe: <b>${RULES.expectedTrumps(first, total, trumps).toFixed(2)}</b> bzw.
        <b>${RULES.expectedTrumps(last, total, trumps).toFixed(2)}</b>.`;
    }
    if (!app.chart) return;
    app.chart.data.labels = sizes.map(size => `${size} Karten`);
    app.chart.data.datasets[0].data = sizes.map(size => RULES.chanceOfAtLeastOneTrump(size, total, trumps));
    app.chart.data.datasets[1].data = sizes.map(size => Math.round((1 - hypergeometricAtMost(size, total, trumps, 1)) * 1000) / 10);
    app.chart.data.datasets[0].borderColor = app.mode === 'turbo' ? '#ffb066' : '#f2dda3';
    app.chart.update();
  }

  /* ---------------------------------------------------------------- */
  /* Wertungsrechner                                                   */
  /* ---------------------------------------------------------------- */

  function calculateScore() {
    const bidInput = document.getElementById('calc-bid');
    const wonInput = document.getElementById('calc-won');
    if (!bidInput || !wonInput) return;
    const bid = Math.max(0, parseInt(bidInput.value, 10) || 0);
    const won = Math.max(0, parseInt(wonInput.value, 10) || 0);
    const star = Boolean(document.getElementById('calc-stern')?.checked) && app.mode === 'standard';
    const courts = app.mode === 'standard' ? Math.max(0, parseInt(document.getElementById('calc-courts')?.value, 10) || 0) : 0;
    const result = RULES.scoreRound({
      mode: app.mode,
      bid,
      won,
      oracleUid: star ? 'major-17' : null,
      courtKarma: courts
    });

    const resultEl = document.getElementById('calc-result');
    if (resultEl) {
      resultEl.textContent = `${result.points >= 0 ? '+' : ''}${result.points} Karma`;
      resultEl.className = `calc-result ${result.points >= 0 ? 'is-positive' : 'is-negative'}`;
    }
    const breakdownEl = document.getElementById('calc-breakdown');
    if (breakdownEl) breakdownEl.innerHTML = result.breakdown.map(line => `<li>${escapeHtml(line)}</li>`).join('');
    const sternBox = document.getElementById('calc-stern-box');
    if (sternBox) sternBox.classList.toggle('is-disabled', app.mode !== 'standard');
    const courtField = document.getElementById('calc-courts-field');
    if (courtField) courtField.classList.toggle('is-disabled', app.mode !== 'standard');
  }

  /* ---------------------------------------------------------------- */
  /* Handlayout                                                        */
  /* ---------------------------------------------------------------- */

  function updateHandLayout() {
    const hand = document.getElementById('game-human-hand');
    if (!hand || !global.GameEngine3D || typeof global.GameEngine3D.handLayout !== 'function') return;
    const available = Math.max(1, hand.clientWidth - 24);
    const layout = global.GameEngine3D.handLayout(available, hand.children.length);
    hand.style.setProperty('--hand-card-width', `${layout.cardWidth}px`);
    hand.style.setProperty('--hand-overlap', `${layout.overlap}px`);
  }

  global.updateHandLayout = updateHandLayout;

  function installResponsiveHandLayout() {
    const hand = document.getElementById('game-human-hand');
    if (!hand) return;
    updateHandLayout();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHandLayout);
      observer.observe(hand);
    }
    global.addEventListener('resize', updateHandLayout, { passive: true });
  }

  /* ---------------------------------------------------------------- */
  /* Navigation, Tooltips, Dialoge                                     */
  /* ---------------------------------------------------------------- */

  function installMobileNavigation() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;
    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Navigation öffnen');
      nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Navigation schließen' : 'Navigation öffnen');
      nav.classList.toggle('is-open', open);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.addEventListener('pointerdown', event => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) close();
    });
  }

  let tooltipElement = null;
  let tooltipTarget = null;

  function hideTooltip() {
    if (tooltipTarget) tooltipTarget.removeAttribute('aria-describedby');
    if (tooltipElement) tooltipElement.remove();
    tooltipTarget = null;
    tooltipElement = null;
  }

  function showTooltip(target) {
    if (!target || !target.getAttribute) return;
    const text = target.getAttribute('data-tooltip');
    if (!text) return;
    hideTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'arc-tooltip';
    tooltip.id = `arc-tooltip-${Date.now()}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    target.setAttribute('aria-describedby', tooltip.id);
    tooltipElement = tooltip;
    tooltipTarget = target;
    const rect = target.getBoundingClientRect();
    const viewport = global.visualViewport;
    const leftEdge = viewport ? viewport.offsetLeft : 0;
    const topEdge = viewport ? viewport.offsetTop : 0;
    const viewportWidth = viewport ? viewport.width : global.innerWidth;
    const viewportHeight = viewport ? viewport.height : global.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.max(leftEdge + 12, Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, leftEdge + viewportWidth - tooltipRect.width - 12));
    const above = rect.top - tooltipRect.height - 10;
    const top = above >= topEdge + 8 ? above : Math.min(rect.bottom + 10, topEdge + viewportHeight - tooltipRect.height - 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function installTooltips() {
    const findTarget = event => (event.target && event.target.closest ? event.target.closest('[data-tooltip]') : null);
    document.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      const target = findTarget(event);
      if (target && target !== tooltipTarget) showTooltip(target);
    });
    document.addEventListener('pointerout', event => {
      const target = findTarget(event);
      if (target && target === tooltipTarget && (!event.relatedTarget || !target.contains(event.relatedTarget))) hideTooltip();
    });
    document.addEventListener('focusin', event => {
      const target = findTarget(event);
      if (target) showTooltip(target);
    });
    document.addEventListener('focusout', event => {
      if (tooltipTarget && (event.target === tooltipTarget || tooltipTarget.contains(event.target))) hideTooltip();
    });
    global.addEventListener('resize', hideTooltip, { passive: true });
    global.addEventListener('scroll', hideTooltip, { passive: true, capture: true });
  }

  /** Fokusfalle für Karten- und Podiumsdialog. */
  function installDialogKeyboard() {
    document.addEventListener('keydown', event => {
      const cardDialog = document.getElementById('card-dialog');
      const podium = document.getElementById('game-podium-overlay');
      const activeDialog = cardDialog && cardDialog.classList.contains('is-open')
        ? cardDialog
        : podium && podium.getAttribute('aria-hidden') === 'false' ? podium : null;
      if (!activeDialog) return;
      if (event.key === 'Escape' && activeDialog === cardDialog) {
        event.preventDefault();
        closeCardDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(activeDialog.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'))
        .filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Ereignisse                                                        */
  /* ---------------------------------------------------------------- */

  function installArenaEvents() {
    const arena = document.getElementById('play-game');
    if (!arena) return;

    arena.addEventListener('click', event => {
      const bidButton = event.target.closest('[data-bid]');
      if (bidButton) {
        global.GameEngine.submitHumanBid(Number(bidButton.dataset.bid));
        return;
      }
      const cardButton = event.target.closest('[data-card-index]');
      if (cardButton && !cardButton.disabled) {
        const index = Number(cardButton.dataset.cardIndex);
        const hand = document.getElementById('game-human-hand');
        if (hand && FX) {
          const target = document.getElementById('trick-cards-container');
          if (target) {
            FX.cardFlight(cardButton, target.getBoundingClientRect(), { arcHeight: 120 });
          }
        }
        global.GameEngine.playCard(0, index);
      }
    });

    const envSelect = document.getElementById('env-select');
    if (envSelect) {
      envSelect.addEventListener('change', () => global.GameEngine3D.changeEnvironment(envSelect.value));
    }

    const startButton = document.getElementById('game-start-btn');
    if (startButton) {
      startButton.addEventListener('click', () => {
        const count = Number(document.getElementById('game-player-count')?.value) || 3;
        global.GameEngine.initGame(count);
      });
    }

    const restartButton = document.getElementById('game-restart-btn');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        const count = Number(document.getElementById('game-player-count')?.value) || 3;
        global.GameEngine.initGame(count);
      });
    }

    const newGameButton = document.getElementById('podium-new-game');
    if (newGameButton) {
      newGameButton.addEventListener('click', () => {
        const count = Number(document.getElementById('game-player-count')?.value) || 3;
        global.GameEngine.initGame(count);
      });
    }
  }

  /**
   * Treffer-Effekt beim Stichentscheid: kurzer Shake der Bühne plus
   * einblendendes Ereignislabel. Läuft auf der persistenten Bühne,
   * damit das Neuzeichnen der Stichkarten die Animation nicht abbricht.
   */
  function installTrickFeedback() {
    document.addEventListener('arcanum:trick-won', event => {
      const detail = event.detail || {};
      const stage = document.querySelector('.stage-3d-wrapper');
      if (!stage) return;
      const label = detail.destroyed ? 'Der Turm zerbricht den Stich'
        : detail.foolBeatWorld ? 'Der Narr entthront die Welt'
          : detail.deathHalf ? 'Der Tod halbiert'
            : detail.cancelled ? 'Der Hierophant siegelt'
              : `Stich an ${document.querySelector(`#hud-opponents li:nth-child(${detail.winnerIdx}) .hud-opponent__name`)?.textContent || 'den Sieger'}`;
      stage.classList.remove('is-clashing');
      void stage.offsetWidth;
      stage.classList.add('is-clashing');
      const burst = document.createElement('div');
      burst.className = 'clash-burst';
      burst.setAttribute('aria-hidden', 'true');
      burst.textContent = label;
      stage.appendChild(burst);
      setTimeout(() => {
        stage.classList.remove('is-clashing');
        burst.remove();
      }, 1300);
    });
  }

  function installCodexEvents() {
    const section = document.getElementById('kodex');
    if (!section) return;

    const searchInput = document.getElementById('card-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        app.codexSearch = searchInput.value;
        renderCodex();
      });
    }

    section.addEventListener('change', event => {
      if (event.target.id === 'card-filter') {
        app.codexFilter = event.target.value;
        renderCodex();
      }
      if (event.target.id === 'card-sort') {
        app.codexSort = event.target.value;
        renderCodex();
      }
    });

    section.addEventListener('click', event => {
      const cardButton = event.target.closest('[data-uid]');
      if (cardButton) {
        openCardDialog(cardButton.dataset.uid);
        return;
      }
      if (event.target.closest('[data-codex-reset]')) {
        app.codexSearch = '';
        app.codexFilter = 'all';
        const search = document.getElementById('card-search');
        if (search) search.value = '';
        const filter = document.getElementById('card-filter');
        if (filter) filter.value = 'all';
        renderCodex();
      }
    });
  }

  function installCalculatorEvents() {
    ['calc-bid', 'calc-won', 'calc-stern', 'calc-courts'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.addEventListener('input', calculateScore);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Start                                                             */
  /* ---------------------------------------------------------------- */

  function init() {
    const canvas = document.getElementById('canvas-container');
    if (typeof global.THREE !== 'undefined' && global.GameEngine3D) {
      global.GameEngine3D.init();
    } else if (canvas) {
      canvas.classList.add('canvas-fallback');
      canvas.textContent = 'Die 3D-Bühne konnte nicht geladen werden – das Kartenritual bleibt vollständig spielbar.';
      document.getElementById('play-game')?.classList.add('without-3d');
    }

    installMobileNavigation();
    installTooltips();
    installDialogKeyboard();
    installArenaEvents();
    installTrickFeedback();
    installCodexEvents();
    installCalculatorEvents();
    installResponsiveHandLayout();

    applyMode(document.documentElement.dataset.mode || 'turbo');
    initChart();
    calculateScore();

    const dialog = document.getElementById('card-dialog');
    if (dialog) {
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-close-dialog]') || event.target === dialog) closeCardDialog();
      });
    }

    const playerCount = document.getElementById('game-player-count');
    global.GameEngine.initGame(Number(playerCount?.value) || 3);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Globale API für Inline-Verweise aus dem HTML.
  global.switchRulesetMode = switchRulesetMode;
  global.renderCards = renderCodex;
  global.calculateScore = calculateScore;
  global.openCardDialog = openCardDialog;
  global.closeCardDialog = closeCardDialog;
})(typeof globalThis !== 'undefined' ? globalThis : this);
