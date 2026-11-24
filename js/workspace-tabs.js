/**
 * ARCANUM workspace: four keyboard-accessible, deep-linkable sections.
 * The online lobby is moved outside the offline arena without cloning state.
 */
(function (root) {
  'use strict';
  const tabs = Object.freeze(['bot', 'multiplayer', 'codex', 'scoring']);
  const aliases = Object.freeze({
    'play-game': 'bot', 'rules-view': 'codex', 'kodex': 'codex',
    math: 'codex', calculator: 'scoring', 'online-lobby': 'multiplayer'
  });
  let current = 'bot';

  function tabFromHash(hash) {
    const key = String(hash || '').replace(/^#/, '');
    return tabs.includes(key.replace(/^tab-/, '')) ? key.replace(/^tab-/, '') : aliases[key] || 'bot';
  }
  function select(name, { updateHash = false, focus = false } = {}) {
    if (!tabs.includes(name)) name = 'bot';
    current = name;
    for (const tab of tabs) {
      const panel = document.getElementById('tab-' + tab);
      const button = document.getElementById('tab-nav-' + tab);
      if (!panel || !button) continue;
      panel.hidden = tab !== name;
      button.setAttribute('aria-selected', String(tab === name));
      button.tabIndex = tab === name ? 0 : -1;
      button.classList.toggle('is-active', tab === name);
      if (focus && tab === name) button.focus();
    }
    document.documentElement.dataset.workspace = name;
    if (updateHash && root.history && root.history.replaceState) {
      root.history.replaceState(null, '', '#tab-' + name);
    }
    if (name === 'codex' && root.Chart && typeof root.Chart.getChart === 'function') {
      const chart = root.Chart.getChart(document.getElementById('probChart'));
      if (chart) root.requestAnimationFrame(() => chart.resize());
    }
    document.dispatchEvent(new CustomEvent('arcanum:workspace-change', { detail: { tab: name } }));
  }

  function install() {
    const online = document.getElementById('online-lobby');
    const multiplayer = document.getElementById('tab-multiplayer');
    if (online && multiplayer) multiplayer.appendChild(online);
    const navbar = document.getElementById('primary-nav');
    if (!navbar) return;
    navbar.addEventListener('click', event => {
      const button = event.target.closest('[data-workspace-tab]');
      if (!button) return;
      select(button.dataset.workspaceTab, { updateHash: true });
      const toggle = document.getElementById('mobile-nav-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Navigation öffnen');
      }
      navbar.classList.remove('is-open');
    });
    navbar.addEventListener('keydown', event => {
      const button = event.target.closest('[data-workspace-tab]');
      if (!button || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(button.dataset.workspaceTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[next], { updateHash: true, focus: true });
    });
    root.addEventListener('hashchange', () => select(tabFromHash(root.location.hash)));
    select(tabFromHash(root.location.hash));
  }

  root.ArcanumWorkspace = Object.freeze({ select, current: () => current, tabFromHash });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof globalThis !== 'undefined' ? globalThis : this);
