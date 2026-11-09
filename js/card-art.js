/**
 * Arcanum · Kartenkunst-Renderer
 * -------------------------------------------------------------
 * Erzeugt für jede der 78 Karten ein eigenständiges, hochwertiges
 * SVG-Motiv – ohne externe Assets, ohne Emoji, deterministisch und
 * damit auch offline sowie in Tests nutzbar.
 *
 * Jede Karte besteht aus denselben, sauber getrennten Schichten:
 *   1. Grundfläche      – Palettengradient, Sternenstaub, Vignette
 *   2. Rahmen           – doppelte Goldlinie, Eckfleuron, Nummernkartusche
 *   3. Bildfeld         – Strahlenkranz, Arkade, Medaillon
 *   4. Motiv            – 22 individuelle Arkana-Motive bzw. Hofkarten
 *   5. Schrift          – Kartenname, Farbe, Element, Schlüsselwörter
 *
 * Öffentliche API:
 *   ArcanumCardArt.face(card, options)   → SVG-String (Vorderseite)
 *   ArcanumCardArt.back(options)         → SVG-String (Rückseite)
 *   ArcanumCardArt.palette(name)         → Farbtripel
 *   ArcanumCardArt.motifCount()          → Anzahl unterschiedlicher Motive
 */
(function (global) {
  'use strict';

  const W = 240;
  const H = 400;

  /* ---------------------------------------------------------------- */
  /* Farbwelten                                                        */
  /* ---------------------------------------------------------------- */

  const PALETTES = {
    aether: { deep: '#170f2b', mid: '#3b2a5c', glow: '#9a86e0', accent: '#e8d29a', ink: '#f7eedb', foil: '#c9b6f0' },
    lunar: { deep: '#0b1428', mid: '#2a3a63', glow: '#8fb4ef', accent: '#dfe9ff', ink: '#eef3ff', foil: '#a9c6ff' },
    solar: { deep: '#241305', mid: '#6b3f14', glow: '#f0b53f', accent: '#ffe1a0', ink: '#fff5da', foil: '#ffd166' },
    infernal: { deep: '#25090d', mid: '#6b1a1d', glow: '#ef6a4b', accent: '#ffc07a', ink: '#ffe6d2', foil: '#ff8f6b' },
    verdant: { deep: '#0a2017', mid: '#1f4a33', glow: '#6fd39a', accent: '#dcf3b8', ink: '#eff8e4', foil: '#9be8b8' },
    cups: { deep: '#0a232e', mid: '#1d5060', glow: '#74cfd8', accent: '#cfeff2', ink: '#e8fbff', foil: '#8fe3ea' },
    swords: { deep: '#141829', mid: '#333a5c', glow: '#9db0e6', accent: '#dfe6ff', ink: '#eef1ff', foil: '#b6c4f5' },
    pentacles: { deep: '#1b2111', mid: '#414c25', glow: '#c2cf74', accent: '#eef2c6', ink: '#f5f8e0', foil: '#d9e58f' },
    wands: { deep: '#271207', mid: '#5c2f16', glow: '#e0924f', accent: '#ffd9a8', ink: '#fff1de', foil: '#f2ad6b' }
  };

  function palette(name) {
    return PALETTES[name] || PALETTES.aether;
  }

  /* ---------------------------------------------------------------- */
  /* Hilfsfunktionen                                                   */
  /* ---------------------------------------------------------------- */

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ESCAPES[ch]);
  }

  function safeId(uid) {
    return String(uid || 'card').replace(/[^a-zA-Z0-9]/g, '');
  }

  /** Kreis mit Ring – Grundbaustein für Sterne, Perlen und Sigille. */
  function ring(cx, cy, r, stroke, width, opacity) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width || 1}"${opacity ? ` opacity="${opacity}"` : ''}/>`;
  }

  function dot(cx, cy, r, fill, opacity) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${opacity ? ` opacity="${opacity}"` : ''}/>`;
  }

  /** Deterministischer Pseudo-Zufall – hält Kartenmotive reproduzierbar. */
  function seeded(seed) {
    let state = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      state ^= seed.charCodeAt(i);
      state = Math.imul(state, 16777619);
    }
    return function next() {
      state = Math.imul(state ^ (state >>> 15), 2246822507);
      state = Math.imul(state ^ (state >>> 13), 3266489909);
      return ((state ^= state >>> 16) >>> 0) / 4294967296;
    };
  }

  function starField(uid, count, color, area) {
    const rand = seeded(uid);
    const box = area || { x: 20, y: 60, w: 200, h: 250 };
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = +(box.x + rand() * box.w).toFixed(1);
      const y = +(box.y + rand() * box.h).toFixed(1);
      const r = +(0.35 + rand() * 0.95).toFixed(2);
      out += dot(x, y, r, color, +(0.18 + rand() * 0.5).toFixed(2));
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /* Rahmen und Grundfläche                                            */
  /* ---------------------------------------------------------------- */

  function cornerFleuron(x, y, sx, sy, color) {
    // Kleines Rankenornament für die vier Rahmenecken.
    return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" stroke="${color}" fill="none" stroke-width="1.1" stroke-linecap="round" opacity=".78">
      <path d="M0 16c0-9 7-16 16-16"/>
      <path d="M4 16c0-6.6 5.4-12 12-12" opacity=".55"/>
      <path d="M16 3c3.6 2.6 5.4 6.6 4.4 10.4-2.6-1-4.4-3-4.4-5.6" fill="none"/>
      <circle cx="16" cy="16" r="1.5" fill="${color}" stroke="none"/>
    </g>`;
  }

  function divider(y, color) {
    return `<g stroke="${color}" fill="none" stroke-width="1" opacity=".72">
      <path d="M52 ${y}h44M144 ${y}h44"/>
      <path d="M120 ${y}l-7 4 7 4 7-4z" fill="${color}" stroke="none" opacity=".9"/>
      <circle cx="104" cy="${y}" r="1.6" fill="${color}" stroke="none"/>
      <circle cx="136" cy="${y}" r="1.6" fill="${color}" stroke="none"/>
    </g>`;
  }

  function cornerSigil(cx, cy, r, color) {
    let out = '';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      out += `<line x1="${(cx + Math.cos(angle) * r * 0.62).toFixed(1)}" y1="${(cy + Math.sin(angle) * r * 0.62).toFixed(1)}" x2="${(cx + Math.cos(angle) * r).toFixed(1)}" y2="${(cy + Math.sin(angle) * r).toFixed(1)}"/>`;
    }
    return `<g stroke="${color}" stroke-width=".9" opacity=".55">${out}</g>${ring(cx, cy, r * 0.42, color, 1, '.6')}`;
  }

  /* ---------------------------------------------------------------- */
  /* Kartenrückseite                                                   */
  /* ---------------------------------------------------------------- */

  function back(options) {
    const opts = options || {};
    const id = safeId(opts.id || 'back');
    const p = palette(opts.palette || 'aether');
    const rays = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      rays.push(`<line x1="120" y1="200" x2="${(120 + Math.cos(a) * 150).toFixed(1)}" y2="${(200 + Math.sin(a) * 150).toFixed(1)}"/>`);
    }
    return `<svg class="card-svg card-svg--back" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kartenrückseite" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bk-${id}" cx="50%" cy="48%" r="72%">
          <stop offset="0%" stop-color="${p.mid}"/><stop offset="62%" stop-color="${p.deep}"/><stop offset="100%" stop-color="#05040a"/>
        </radialGradient>
        <linearGradient id="bkf-${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity=".95"/>
          <stop offset="48%" stop-color="${p.foil}" stop-opacity=".55"/>
          <stop offset="100%" stop-color="${p.accent}" stop-opacity=".92"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" rx="14" fill="url(#bk-${id})"/>
      <g stroke="url(#bkf-${id})" stroke-width=".7" opacity=".28">${rays.join('')}</g>
      <g opacity=".85" fill="none" stroke="url(#bkf-${id})">
        <rect x="9" y="9" width="222" height="382" rx="10" stroke-width="1.6"/>
        <rect x="16" y="16" width="208" height="368" rx="7" stroke-width=".7" opacity=".6"/>
      </g>
      <g stroke="url(#bkf-${id})" fill="none" stroke-width="1.1" opacity=".7">
        <circle cx="120" cy="200" r="66"/><circle cx="120" cy="200" r="54" stroke-width=".6"/>
      </g>
      <g stroke="url(#bkf-${id})" fill="none" stroke-width="1.2" opacity=".9">
        <path d="M120 140l52 30v60l-52 30-52-30v-60z"/>
        <path d="M120 158l36 21v42l-36 21-36-21v-42z" opacity=".6"/>
        <path d="M120 176l24 24-24 24-24-24z" opacity=".85"/>
      </g>
      <g fill="url(#bkf-${id})" opacity=".9">
        <circle cx="120" cy="200" r="5"/>
        <circle cx="120" cy="118" r="2.4"/><circle cx="120" cy="282" r="2.4"/>
        <circle cx="58" cy="200" r="2.4"/><circle cx="182" cy="200" r="2.4"/>
      </g>
      ${starField('arcanum-back', 26, p.accent, { x: 24, y: 26, w: 192, h: 348 })}
    </svg>`;
  }

  /* ---------------------------------------------------------------- */
  /* Schichten                                                         */
  /* ---------------------------------------------------------------- */

  function baseLayer(id, p, uid) {
    return `<rect width="${W}" height="${H}" rx="14" fill="url(#bg-${id})"/>
      <g opacity=".5">${starField(uid, 44, p.ink, { x: 18, y: 22, w: 204, h: 356 })}</g>
      <g opacity=".35">${starField(uid + '-g', 14, p.accent, { x: 22, y: 28, w: 196, h: 344 })}</g>
      <rect width="${W}" height="${H}" rx="14" fill="url(#vig-${id})"/>`;
  }

  function frameLayer(id, p, top, bottom, numeral) {
    return `<g fill="none" stroke="url(#frame-${id})">
        <rect x="7" y="7" width="226" height="386" rx="11" stroke-width="2.2"/>
        <rect x="13" y="13" width="214" height="374" rx="8" stroke-width=".75" opacity=".66"/>
        <rect x="20" y="20" width="200" height="360" rx="6" stroke-width=".5" opacity=".34"/>
      </g>
      <g opacity=".9">
        ${cornerFleuron(17, 17, 1, 1, p.accent)}
        ${cornerFleuron(223, 17, -1, 1, p.accent)}
        ${cornerFleuron(17, 383, 1, -1, p.accent)}
        ${cornerFleuron(223, 383, -1, -1, p.accent)}
      </g>
      <g>
        <path d="M96 34h48l-6 18H102z" fill="${p.deep}" stroke="url(#frame-${id})" stroke-width="1.1"/>
        <text x="120" y="47" text-anchor="middle" fill="${p.accent}" font-family="Cinzel, Georgia, serif" font-size="14" font-weight="700" letter-spacing="1.4">${esc(numeral)}</text>
      </g>
      <text x="120" y="68" text-anchor="middle" fill="${p.accent}" opacity=".78" font-family="Inter, system-ui, sans-serif" font-size="6.4" letter-spacing="2.6">${esc(top)}</text>
      <text x="120" y="378" text-anchor="middle" fill="${p.accent}" opacity=".62" font-family="Inter, system-ui, sans-serif" font-size="5.8" letter-spacing="2.2">${esc(bottom)}</text>`;
  }

  /** Strahlenkranz + Arkade hinter dem Motiv. */
  function haloLayer(id, p, cx, cy, radius) {
    const rays = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const inner = radius * 0.72;
      const outer = radius * (i % 2 ? 1.02 : 1.16);
      rays.push(`<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}" x2="${(cx + Math.cos(a) * outer).toFixed(1)}" y2="${(cy + Math.sin(a) * outer).toFixed(1)}"/>`);
    }
    return `<g stroke="${p.accent}" stroke-width=".75" opacity=".22">${rays.join('')}</g>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#halo-${id})"/>
      ${ring(cx, cy, radius * 0.94, p.accent, .9, '.42')}
      ${ring(cx, cy, radius * 0.79, p.foil, .6, '.26')}
      ${cornerSigil(cx, cy, radius * 1.06, p.accent)}`;
  }

  /* ---------------------------------------------------------------- */
  /* Symbol-Bausteine                                                  */
  /* ---------------------------------------------------------------- */

  const SYMBOLS = {
    sun(x, y, r, color) {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rays += `<line x1="${(x + Math.cos(a) * r * 1.35).toFixed(1)}" y1="${(y + Math.sin(a) * r * 1.35).toFixed(1)}" x2="${(x + Math.cos(a) * r * 1.9).toFixed(1)}" y2="${(y + Math.sin(a) * r * 1.9).toFixed(1)}" stroke-width="1.6"/>`;
      }
      return `<g stroke="${color}" fill="none" stroke-linecap="round" opacity=".92">${rays}</g>
        ${dot(x, y, r, color, '.92')}${dot(x, y, r * 0.72, '#1b1206', '.85')}${dot(x, y, r * 0.28, color, '.9')}`;
    },
    moon(x, y, r, color) {
      // Zwei Kreise in einem Pfad, mit even-odd gefüllt, ergeben eine
      // saubere Sichel – unabhängig davon, was hinter ihr liegt.
      const inner = r * 0.92;
      return `<path fill-rule="evenodd" fill="${color}" opacity=".94" d="M${x} ${y - r}a${r} ${r} 0 1 0 0 ${r * 2}a${r} ${r} 0 1 0 0 ${-r * 2}Z
        M${x + r * 0.62} ${y - inner}a${inner} ${inner} 0 1 0 0 ${inner * 2}a${inner} ${inner} 0 1 0 0 ${-inner * 2}Z"/>`;
    },
    star(x, y, r, color, points) {
      const n = points || 5;
      const coords = [];
      for (let i = 0; i < n * 2; i++) {
        const rr = i % 2 ? r * 0.42 : r;
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        coords.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
      }
      return `<polygon points="${coords.join(' ')}" fill="${color}" opacity=".9"/>`;
    },
    cup(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity=".95">
        <path d="M-9-9h18c0 8-3.6 13-9 15-5.4-2-9-7-9-15z" fill="${color}" fill-opacity=".16"/>
        <path d="M-9-8c-3.4.4-5 2.6-5 5.4 0 3 2.2 5 5.4 5M9-8c3.4.4 5 2.6 5 5.4 0 3-2.2 5-5.4 5"/>
        <path d="M0 6v6M-5 15h10"/>
      </g>`;
    },
    wand(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".95">
        <path d="M0-15v30"/>
        <path d="M0-8c-4.4-.6-6.4-2.6-6.6-5.4M0-1c4.4-.6 6.4-2.6 6.6-5.4M0 6c-4.4-.6-6.4-2.6-6.6-5.4" stroke-width="1.2"/>
        <path d="M-3.2-15.4c1.2-2.6 2.4-3.4 3.2-3.4s2 .8 3.2 3.4c-1 .8-2.2 1.2-3.2 1.2s-2.2-.4-3.2-1.2z" fill="${color}" fill-opacity=".35"/>
      </g>`;
    },
    sword(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".95">
        <path d="M0-17l4 6v14H-4V-11z" fill="${color}" fill-opacity=".22"/>
        <path d="M0-17v34M-8 7h16M0 10v7"/>
      </g>`;
    },
    pentacle(x, y, s, color) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? s * 0.38 : s * 0.88;
        pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
      }
      return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.2" opacity=".95">
        <circle r="${s * 0.96}"/><circle r="${s * 0.82}" stroke-width=".5" opacity=".6"/>
        <polygon points="${pts.join(' ')}" fill="${color}" fill-opacity=".12" stroke-width="1.1"/>
      </g>`;
    },
    crown(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}" opacity=".92">
        <path d="M-13 6l-2-14 7 6 8-10 8 10 7-6-2 14z"/>
        <rect x="-13" y="7.6" width="26" height="3.4" rx="1.2" opacity=".85"/>
        <circle cx="-9" cy="-2" r="1.3" fill="${color}"/><circle cx="0" cy="-6" r="1.5" fill="${color}"/><circle cx="9" cy="-2" r="1.3" fill="${color}"/>
      </g>`;
    },
    eye(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.3">
        <path d="M-14 0c5-7 23-7 28 0-5 7-23 7-28 0z" fill="${color}" fill-opacity=".12"/>
        <circle r="4.6"/><circle r="1.8" fill="${color}" stroke="none"/>
      </g>`;
    },
    flame(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}" opacity=".9">
        <path d="M0-16c7 8 10 13 10 17A10 10 0 1 1-10 1c0-3 1.4-6 4-9 0 3 1.4 4.4 3 4.4 2 0 3-2 3-5 0-2-.6-4-4-7z"/>
        <path d="M0-4c3 3.4 4.4 5.6 4.4 7.6A4.4 4.4 0 1 1-4.4 3.6c0-1.4.6-2.8 1.8-4.4.2 1.6.8 2.4 1.6 2.4.6 0 1-.8 1-1.6 0-.8-.2-2-1-3.2z" fill-opacity=".55"/>
      </g>`;
    },
    scales(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.3" stroke-linecap="round">
        <path d="M0-14v28M-13 8h26"/>
        <path d="M-13-10h26M0-14v4"/>
        <path d="M-13-10l-5 9h10zM13-10l-5 9h10z"/>
      </g>`;
    },
    tower(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.3">
        <path d="M-9 16v-24l9-6 9 6v24z" fill="${color}" fill-opacity=".14"/>
        <path d="M-9-8h18M-9-2h18M-4 16V4h8v12"/>
        <path d="M9-16l-6 6 5 1-7 7" stroke-width="1.6"/>
      </g>`;
    },
    key(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.35" stroke-linecap="round">
        <circle cy="-8" r="4.4"/><path d="M0-3.6V12M0 8h5M0 4h4"/>
      </g>`;
    },
    lantern(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.3">
        <path d="M0-16v4M-7-8h14v14H-7z" fill="${color}" fill-opacity=".2"/>
        <path d="M-3-8v14M3-8v14M-7 0h14M-4 8h8" stroke-width=".8" opacity=".7"/>
        <path d="M-5-8l5-4 5 4" stroke-width="1.2"/>
      </g>`;
    },
    chalice2(x, y, s, color) {
      return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="1.3">
        <path d="M-16-6h12c0 6-2.6 9-6 10-3.4-1-6-4-6-10z" fill="${color}" fill-opacity=".18"/>
        <path d="M16-14h-12c0 6 2.6 9 6 10 3.4-1 6-4 6-10z" fill="${color}" fill-opacity=".18"/>
        <path d="M-10 4v5M-13 11h6M10-6v5M7 1h6" stroke-width=".9"/>
      </g>`;
    }
  };

  /* ---------------------------------------------------------------- */
  /* 22 Motive der Großen Arkana                                       */
  /* ---------------------------------------------------------------- */

  /* Jedes Motiv erhält (p, c) – Palette und Akzentfarbe – und zeichnet
     innerhalb eines 140 × 150-Feldes um (120, 172). */

  const MAJOR_MOTIFS = {
    0(p, c) { // Der Narr – Klippe, Sonne, Bündel, Hund
      return `<path d="M40 236l86-30 74 30z" fill="${p.mid}" opacity=".9"/>
        ${SYMBOLS.sun(176, 118, 12, c)}
        <circle cx="178" cy="118" r="12" fill="${p.deep}" opacity=".55"/>
        ${SYMBOLS.sun(178, 118, 9, c)}
        <path d="M104 132c-8 6-12 16-10 24l16 24 22-6 6-26-14-16z" fill="${c}" opacity=".82"/>
        <circle cx="112" cy="124" r="9" fill="${c}" opacity=".9"/>
        <path d="M132 152l14-18M92 158l-14-10" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
        <path d="M150 186l20-8M150 186l18 6" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <path d="M62 206c8-10 18-8 22 2 2 6-2 12-8 12-5 0-8-3-8-7" stroke="${p.accent}" fill="none" stroke-width="1.6" opacity=".8"/>
        ${SYMBOLS.star(68, 140, 5, p.ink)}${SYMBOLS.star(150, 128, 3.4, p.ink)}`;
    },
    1(p, c) { // Der Magier – Unendlichkeit, Stab, Kelch, Schwert, Münze
      return `<g transform="translate(120 150)" stroke="${c}" fill="none" stroke-width="2.2" opacity=".9">
          <path d="M-26 0c0-11 13-11 13 0s13 11 13 0-13-11-13 0-13 11-13 0z"/>
        </g>
        <path d="M120 168v64" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
        <path d="M120 196l-16-8M120 196l16-8M120 214l-16-8M120 214l16-8" stroke="${c}" stroke-width="1.6" opacity=".55"/>
        <circle cx="120" cy="186" r="26" fill="${p.deep}" opacity=".5"/>
        ${SYMBOLS.cup(96, 202, .8, c)}${SYMBOLS.sword(146, 200, .82, c)}
        ${SYMBOLS.pentacle(120, 232, 13, c)}${SYMBOLS.wand(120, 240, .62, c)}
        <path d="M78 158h84" stroke="${p.accent}" stroke-width=".8" opacity=".4"/>`;
    },
    2(p, c) { // Die Hohepriesterin – zwei Säulen, Mond, Schleier
      return `<rect x="62" y="120" width="18" height="108" rx="3" fill="${p.mid}" stroke="${c}" stroke-width="1.1" opacity=".9"/>
        <rect x="160" y="120" width="18" height="108" rx="3" fill="${p.mid}" stroke="${c}" stroke-width="1.1" opacity=".9"/>
        <path d="M80 128h80v66a40 40 0 0 0-80 0z" fill="${p.deep}" stroke="${c}" stroke-width="1.1" opacity=".75"/>
        ${SYMBOLS.moon(120, 160, 15, c)}
        <path d="M98 200h44M104 208h32" stroke="${c}" stroke-width="1.4" opacity=".7"/>
        <circle cx="71" cy="116" r="5" fill="${c}" opacity=".85"/><circle cx="169" cy="116" r="5" fill="${c}" opacity=".85"/>
        <path d="M120 214v20M110 228h20" stroke="${c}" stroke-width="1.2" opacity=".65"/>`;
    },
    3(p, c) { // Die Herrscherin – Krone, Weizen, Schild
      return `<path d="M120 116l-24 22 6 84h36l6-84z" fill="${p.mid}" stroke="${c}" stroke-width="1.1" opacity=".85"/>
        ${SYMBOLS.crown(120, 128, 1.5, c)}
        <path d="M92 188c-8 10-10 22-8 34M148 188c8 10 10 22 8 34" stroke="${c}" stroke-width="1.4" fill="none" opacity=".65"/>
        <path d="M104 214h32M108 226h24" stroke="${c}" stroke-width="1.6" opacity=".7"/>
        <circle cx="120" cy="176" r="12" fill="none" stroke="${c}" stroke-width="1.2" opacity=".8"/>
        <path d="M120 166v20M110 176h20" stroke="${c}" stroke-width="1" opacity=".7"/>
        ${SYMBOLS.star(120, 176, 5.6, c, 6)}`;
    },
    4(p, c) { // Der Herrscher – Thron, Widderhörner, Reichsapfel
      return `<path d="M70 236V138l12-14h76l12 14v98z" fill="${p.mid}" stroke="${c}" stroke-width="1.2" opacity=".78"/>
        <path d="M86 236v-52h68v52" fill="none" stroke="${c}" stroke-width=".9" opacity=".5"/>
        <path d="M78 138l-18-14 4 22M162 138l18-14-4 22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity=".95"/>
        ${SYMBOLS.crown(120, 152, 1.15, c)}
        <circle cx="120" cy="200" r="17" fill="none" stroke="${c}" stroke-width="1.4" opacity=".9"/>
        <path d="M120 183v34M103 200h34" stroke="${c}" stroke-width=".9" opacity=".55"/>
        <path d="M106 186l28 28M134 186l-28 28" stroke="${c}" stroke-width=".55" opacity=".35"/>
        <circle cx="120" cy="200" r="4" fill="${c}" opacity=".95"/>
        <path d="M70 236h100" stroke="${c}" stroke-width="1.4" opacity=".6"/>`;
    },
    5(p, c) { // Der Hierophant – Tripelkreuz, Schlüssel
      return `<path d="M120 116v120" stroke="${c}" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>
        <path d="M96 140h48M88 172h64M104 206h32" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
        <circle cx="120" cy="116" r="8" fill="none" stroke="${c}" stroke-width="1.6"/>
        ${SYMBOLS.key(96, 218, .9, c)}${SYMBOLS.key(146, 218, .9, c)}
        <path d="M120 232v14" stroke="${c}" stroke-width="1.2" opacity=".6"/>`;
    },
    6(p, c) { // Die Liebenden – zwei Figuren, Engel, Sonne
      return `${SYMBOLS.sun(120, 116, 11, c)}
        <path d="M120 132l-30 22v34l30 40 30-40v-34z" fill="${p.mid}" stroke="${c}" stroke-width="1" opacity=".55"/>
        <circle cx="100" cy="170" r="9" fill="${c}" opacity=".82"/><circle cx="140" cy="170" r="9" fill="${c}" opacity=".82"/>
        <path d="M100 180v40M140 180v40M84 196c8-4 14-2 16 4M156 196c-8-4-14-2-16 4" stroke="${c}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".8"/>
        <path d="M120 196c-6 6-6 14 0 18 6-4 6-12 0-18z" fill="${c}" opacity=".7"/>
        ${SYMBOLS.star(84, 150, 4, p.ink)}${SYMBOLS.star(156, 150, 4, p.ink)}`;
    },
    7(p, c) { // Der Wagen – Kutsche, Baldachin, Räder
      return `<path d="M78 134h84v40H78z" fill="${p.mid}" stroke="${c}" stroke-width="1.2" opacity=".8"/>
        <path d="M78 134l-10-14h104l-10 14" fill="${p.deep}" stroke="${c}" stroke-width="1.2"/>
        <path d="M92 174v22h56v-22" fill="${p.deep}" stroke="${c}" stroke-width="1.1" opacity=".85"/>
        <circle cx="92" cy="212" r="16" fill="none" stroke="${c}" stroke-width="2"/>
        <circle cx="148" cy="212" r="16" fill="none" stroke="${c}" stroke-width="2"/>
        <path d="M92 196v32M76 212h32M148 196v32M132 212h32" stroke="${c}" stroke-width=".9" opacity=".65"/>
        <path d="M120 100l10 14h-20z" fill="${c}" opacity=".9"/>
        <path d="M74 130h92" stroke="${c}" stroke-width="1.6" opacity=".75"/>`;
    },
    8(p, c) { // Die Gerechtigkeit – Waage, Schwert, Auge
      return `${SYMBOLS.scales(120, 150, 2.5, c)}
        <path d="M120 186v54M108 222h24" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
        ${SYMBOLS.sword(120, 208, 1.5, c)}
        ${SYMBOLS.eye(120, 112, 1, c)}`;
    },
    9(p, c) { // Der Eremit – Laterne, Stab, Stern
      return `${SYMBOLS.star(120, 104, 22, c, 8)}
        <path d="M120 128l-26 40v66h52v-66z" fill="${p.mid}" stroke="${c}" stroke-width="1.1" opacity=".8"/>
        ${SYMBOLS.lantern(120, 172, 2, c)}
        <path d="M76 234V148M164 234V148" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
        ${SYMBOLS.star(76, 142, 5, c)}${SYMBOLS.star(164, 142, 5, c)}`;
    },
    10(p, c) { // Das Rad des Schicksals – Speichen, Glyphen
      let spokes = '';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        spokes += `<line x1="120" y1="172" x2="${(120 + Math.cos(a) * 54).toFixed(1)}" y2="${(172 + Math.sin(a) * 54).toFixed(1)}"/>`;
      }
      return `<g stroke="${c}" fill="none" stroke-width="1.5" opacity=".9">
          ${ring(120, 172, 60, c, 2.4)}${ring(120, 172, 52, c, .8)}${ring(120, 172, 22, c, 1.2)}${spokes}
        </g>
        <g fill="${c}" opacity=".85">
          <circle cx="120" cy="112" r="3"/><circle cx="120" cy="232" r="3"/>
          <circle cx="60" cy="172" r="3"/><circle cx="180" cy="172" r="3"/>
        </g>
        ${SYMBOLS.star(120, 172, 12, c, 6)}
        <path d="M96 244c8-6 16-6 24 0M120 244c8-6 16-6 24 0" stroke="${c}" fill="none" stroke-width="1" opacity=".4"/>`;
    },
    11(p, c) { // Die Kraft – Löwe, Unendlichkeit
      return `<g transform="translate(120 130)" stroke="${c}" fill="none" stroke-width="2">
          <path d="M-22 0c0-9 11-9 11 0s11 9 11 0-11-9-11 0-11 9-11 0z"/>
        </g>
        <path d="M120 148c-26 6-38 26-30 44 6 14 24 20 40 12" fill="${p.mid}" stroke="${c}" stroke-width="1.2" opacity=".9"/>
        <circle cx="104" cy="180" r="16" fill="${c}" opacity=".85"/>
        <circle cx="98" cy="176" r="2.4" fill="${p.deep}"/><circle cx="112" cy="176" r="2.4" fill="${p.deep}"/>
        <path d="M104 186c3 3 6 3 8 0M116 192c8 2 14 0 18-4" stroke="${p.deep}" fill="none" stroke-width="1.4" opacity=".7"/>
        <path d="M126 210c10 8 22 8 30-2" stroke="${c}" fill="none" stroke-width="2" opacity=".6"/>`;
    },
    12(p, c) { // Der Gehängte – Baum, Seil, Figur mit Heiligenschein
      return `<path d="M56 104h128M56 104v-10M184 104v-10" stroke="${c}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        <path d="M150 104v8" stroke="${c}" stroke-width="1.8" opacity=".9"/>
        ${ring(150, 148, 25, c, 1.1, '.5')}
        <circle cx="150" cy="128" r="10" fill="${c}" opacity=".92"/>
        <path d="M150 138v34M150 152h-18M150 152h18M150 172l-16 30M150 172l16 30" stroke="${c}" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
        <path d="M134 152l-8 10M166 152l8 10" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
        <path d="M74 236c14-16 34-16 48 0" stroke="${c}" fill="none" stroke-width="1.2" opacity=".4"/>`;
    },
    13(p, c) { // Der Tod – Sense, Rose, Schädel
      return `<path d="M86 240c26-6 44-24 52-48" stroke="${c}" fill="none" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
        <path d="M138 192c-16-14-34-16-50-4 12 22 34 26 50 4z" fill="${c}" opacity=".45"/>
        <path d="M120 200c-14-20-14-38 0-56 14 18 14 36 0 56z" fill="${p.mid}" stroke="${c}" stroke-width="1.1"/>
        <circle cx="114" cy="162" r="4.6" fill="${p.deep}"/><circle cx="126" cy="162" r="4.6" fill="${p.deep}"/>
        <path d="M120 172l-4 8h8z" fill="${p.deep}" opacity=".85"/>
        <path d="M110 188h20M110 194h20M114 200h12" stroke="${p.deep}" stroke-width="1.4" opacity=".65"/>
        <circle cx="152" cy="214" r="11" fill="none" stroke="${c}" stroke-width="1.3" opacity=".85"/>
        <path d="M152 206c-6-8-14-8-18-2 6 6 12 8 18 2z" fill="${c}" opacity=".85"/>`;
    },
    14(p, c) { // Die Mäßigkeit – zwei Kelche, Strom, Pfad
      return `${SYMBOLS.chalice2(120, 176, 2.4, c)}
        <path d="M120 150c-8 14-8 28 0 42" stroke="${c}" fill="none" stroke-width="1.8" opacity=".85" stroke-linecap="round"/>
        <path d="M96 236c10-12 38-12 48 0" stroke="${c}" fill="none" stroke-width="1.3" opacity=".5"/>
        <path d="M74 238l14-24 6 10M166 238l-14-24-6 10" stroke="${c}" fill="none" stroke-width="1.2" opacity=".45"/>
        ${SYMBOLS.star(120, 132, 7, c, 8)}`;
    },
    15(p, c) { // Der Teufel – Hörner, Kette, Sigille
      return `<path d="M100 128c-14-4-22-14-22-24 8 2 15 8 19 16M140 128c14-4 22-14 22-24-8 2-15 8-19 16" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>
        <path d="M120 126l-24 18v40l24 30 24-30v-40z" fill="${p.mid}" stroke="${c}" stroke-width="1.2"/>
        <circle cx="110" cy="168" r="4" fill="${c}"/><circle cx="130" cy="168" r="4" fill="${c}"/>
        <path d="M108 190c8 5 16 5 24 0" stroke="${c}" fill="none" stroke-width="1.6" opacity=".8"/>
        <g fill="none" stroke="${c}" stroke-width="1.6" opacity=".75">
          <ellipse cx="90" cy="222" rx="8" ry="5" transform="rotate(-24 90 222)"/>
          <ellipse cx="106" cy="228" rx="8" ry="5" transform="rotate(-12 106 228)"/>
          <ellipse cx="122" cy="231" rx="8" ry="5"/>
          <ellipse cx="138" cy="228" rx="8" ry="5" transform="rotate(12 138 228)"/>
          <ellipse cx="154" cy="222" rx="8" ry="5" transform="rotate(24 154 222)"/>
        </g>
        ${SYMBOLS.star(120, 148, 5, c)}`;
    },
    16(p, c) { // Der Turm – Blitz, Krone, Fenster
      return `${SYMBOLS.tower(120, 166, 2.6, c)}
        <path d="M170 92l-26 24 14 2-22 22 30-22-12-2 18-14z" fill="${c}" opacity=".95"/>
        <path d="M74 132l-10 10M84 120l-8 4" stroke="${c}" stroke-width="1.4" opacity=".6"/>
        <circle cx="98" cy="196" r="2.4" fill="${c}"/><circle cx="132" cy="204" r="2" fill="${c}"/>`;
    },
    17(p, c) { // Der Stern – großer Stern, Wasser, Krüge
      return `${SYMBOLS.star(120, 150, 34, c, 8)}${SYMBOLS.star(120, 150, 18, p.deep, 8)}
        ${SYMBOLS.star(120, 150, 12, c, 8)}
        <path d="M74 210c14 8 34 8 46-2 12 10 32 10 46 2" stroke="${c}" fill="none" stroke-width="1.6" opacity=".7"/>
        <path d="M84 188c-6 8-6 16 0 20M156 188c6 8 6 16 0 20" stroke="${c}" fill="none" stroke-width="1.8" stroke-linecap="round" opacity=".65"/>
        ${SYMBOLS.star(64, 128, 4, p.ink)}${SYMBOLS.star(176, 132, 4, p.ink)}${SYMBOLS.star(120, 104, 4, p.ink)}`;
    },
    18(p, c) { // Der Mond – Mondsichel zwischen zwei Wachtürmen
      const tower = (x, top) => `<g stroke="${c}" stroke-width="1.1" fill="${p.mid}" opacity=".9">
          <path d="M${x - 11} 232V${top + 14}l11-14 11 14v${232 - top - 14}Z"/>
          <path d="M${x - 5} 232v-22a5 5 0 0 1 10 0v22" fill="${p.deep}" stroke-width=".8" opacity=".85"/>
          <path d="M${x - 11} ${top + 22}h22" stroke-width=".8" opacity=".6"/>
        </g>`;
      return `${tower(74, 168)}${tower(166, 160)}
        ${SYMBOLS.moon(114, 152, 34, c)}
        <path d="M96 232c8-14 40-14 48 0" stroke="${c}" fill="none" stroke-width="1.3" opacity=".55"/>
        <path d="M120 232v-16" stroke="${c}" stroke-width="1" opacity=".4"/>
        ${SYMBOLS.star(146, 118, 4, p.ink)}${SYMBOLS.star(92, 108, 3.4, p.ink)}${SYMBOLS.star(152, 196, 3, p.ink)}`;
    },
    19(p, c) { // Die Sonne – Antlitz, Strahlen, Banner
      return `${SYMBOLS.sun(120, 156, 30, c)}
        <circle cx="120" cy="156" r="22" fill="${p.deep}" opacity=".72"/>
        ${SYMBOLS.sun(120, 156, 20, c)}
        <path d="M108 150c2-3 6-3 8 0M124 150c2-3 6-3 8 0M112 166c5 4 11 4 16 0" stroke="${p.deep}" fill="none" stroke-width="1.6" opacity=".8"/>
        <path d="M120 190v42M104 232h32" stroke="${c}" stroke-width="1.4" opacity=".6"/>`;
    },
    20(p, c) { // Das Gericht – Posaune, Banner, drei Erwachende
      return `<path d="M62 134c10-9 22-9 30 0 8-7 18-7 24 0" stroke="${c}" fill="none" stroke-width="1.5" opacity=".55"/>
        <g stroke="${c}" fill="none" stroke-width="1.4" opacity=".92">
          <path d="M164 118h-34v14h34" fill="${p.mid}"/>
          <path d="M130 118l-14 7 14 7z" fill="${c}" fill-opacity=".35"/>
          <path d="M164 108v34"/>
        </g>
        <g fill="${c}" opacity=".9">
          <rect x="104" y="132" width="13" height="34" rx="1.5"/>
        </g>
        <path d="M107 140h7M107 148h7M107 156h7" stroke="${p.deep}" stroke-width="1" opacity=".55"/>
        <g fill="${p.mid}" stroke="${c}" stroke-width="1" opacity=".95">
          <path d="M74 208a12 12 0 0 1 24 0z"/><path d="M108 198a13 13 0 0 1 26 0z"/><path d="M142 208a12 12 0 0 1 24 0z"/>
        </g>
        <g fill="${c}" opacity=".9">
          <circle cx="86" cy="203" r="4.2"/><circle cx="121" cy="192" r="4.6"/><circle cx="154" cy="203" r="4.2"/>
        </g>
        ${SYMBOLS.star(120, 166, 7, c)}`;
    },
    21(p, c) { // Die Welt – Lorbeerkranz, Tänzerin, Vier Ecken
      let leaves = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = 120 + Math.cos(a) * 48;
        const y = 168 + Math.sin(a) * 60;
        leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="8" ry="3.6" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${c}" opacity=".55"/>`;
      }
      return `<ellipse cx="120" cy="168" rx="48" ry="60" fill="none" stroke="${c}" stroke-width="1.6" opacity=".8"/>
        ${leaves}
        <circle cx="120" cy="140" r="10" fill="${c}" opacity=".9"/>
        <path d="M120 150v34M120 166l-20-12M120 166l20-12M120 184l-14 24M120 184l14 24" stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>
        ${SYMBOLS.star(48, 96, 6, c)}${SYMBOLS.star(192, 96, 6, c)}${SYMBOLS.star(48, 250, 6, c)}${SYMBOLS.star(192, 250, 6, c)}`;
    }
  };

  /* ---------------------------------------------------------------- */
  /* Hofkarten-Figuren                                                 */
  /* ---------------------------------------------------------------- */

  const COURT_FIGURES = {
    page(p, c, suit) {
      return `<g transform="translate(120 172)">
          <path d="M-46 72l14-58c8-12 20-18 32-18s24 6 32 18l14 58z" fill="url(#robe)" stroke="${c}" stroke-width="1.1" opacity=".92"/>
          <circle cy="-20" r="15" fill="${c}" opacity=".92"/>
          <path d="M-18 -34h36l-4 9h-28z" fill="${p.deep}" stroke="${c}" stroke-width="1"/>
          <path d="M12 -34c6-10 14-14 20-12-4 6-8 10-14 12z" fill="${c}" opacity=".7"/>
          <g opacity=".95">${suitEmblemByKey(suit, 0, 30, 1.1, c)}</g>
          <path d="M-46 72h92" stroke="${c}" stroke-width="1.3" opacity=".5"/>
        </g>`;
    },
    knight(p, c, suit) {
      return `<g transform="translate(120 172)">
          <path d="M-52 72l16-58c9-12 21-18 36-18s27 6 36 18l16 58z" fill="url(#robe)" stroke="${c}" stroke-width="1.1" opacity=".92"/>
          <path d="M-52 72h104" stroke="${c}" stroke-width="1.3" opacity=".5"/>
          <path d="M-16 -22v-12c0-9 7-16 16-16s16 7 16 16v12z" fill="${c}" opacity=".92"/>
          <path d="M-14 -26h28" stroke="${p.deep}" stroke-width="2.2" opacity=".8"/>
          <path d="M0 -50c2-12 8-20 16-24-2 12-6 18-12 24z" fill="${c}" opacity=".75"/>
          <g opacity=".95">${suitEmblemByKey(suit, 0, 30, 1.1, c)}</g>
        </g>`;
    },
    queen(p, c, suit) {
      return `<g transform="translate(120 172)">
          <path d="M-50 72l15-60c9-12 22-18 35-18s26 6 35 18l15 60z" fill="url(#robe)" stroke="${c}" stroke-width="1.1" opacity=".92"/>
          <path d="M-30 -30c-8 12-10 30-8 44M30 -30c8 12 10 30 8 44" stroke="${c}" stroke-width=".9" fill="none" opacity=".4"/>
          <circle cy="-22" r="14" fill="${c}" opacity=".92"/>
          <path d="M-15 -34l4-12 11 8 11-8 4 12z" fill="${c}" opacity=".92"/>
          <circle cy="-46" r="2.6" fill="${c}"/>
          <g opacity=".95">${suitEmblemByKey(suit, 0, 30, 1.15, c)}</g>
          <path d="M-50 72h100" stroke="${c}" stroke-width="1.3" opacity=".5"/>
        </g>`;
    },
    king(p, c, suit) {
      return `<g transform="translate(120 172)">
          <path d="M-52 72l16-60c9-13 22-19 36-19s27 6 36 19l16 60z" fill="url(#robe)" stroke="${c}" stroke-width="1.1" opacity=".94"/>
          <path d="M-24 74v-28M24 74v-28" stroke="${c}" stroke-width=".8" opacity=".3"/>
          <circle cy="-22" r="14" fill="${c}" opacity=".92"/>
          <path d="M-20 -32l-2-14 8 6 7-9 7 9 8-6-2 14z" fill="${c}" opacity=".95"/>
          <circle cx="-16" cy="-38" r="1.6" fill="${c}"/><circle cy="-43" r="1.8" fill="${c}"/><circle cx="16" cy="-38" r="1.6" fill="${c}"/>
          <g opacity=".95">${suitEmblemByKey(suit, 0, 30, 1.15, c)}</g>
          <path d="M-52 72h104" stroke="${c}" stroke-width="1.3" opacity=".55"/>
        </g>`;
    }
  };

  /* ---------------------------------------------------------------- */
  /* Kleine Arkana: Punktbilder                                        */
  /* ---------------------------------------------------------------- */

  const PIP_LAYOUTS = {
    1: [[0, 0]],
    2: [[0, -1], [0, 1]],
    3: [[0, -1.1], [-0.85, 0.75], [0.85, 0.75]],
    4: [[-0.8, -1], [0.8, -1], [-0.8, 1], [0.8, 1]],
    5: [[-0.8, -1], [0.8, -1], [0, 0], [-0.8, 1], [0.8, 1]],
    6: [[-0.8, -1], [0.8, -1], [-0.8, 0], [0.8, 0], [-0.8, 1], [0.8, 1]],
    7: [[-0.8, -1.1], [0.8, -1.1], [0, -0.45], [-0.8, 0.35], [0.8, 0.35], [-0.8, 1.15], [0.8, 1.15]],
    8: [[-0.85, -1.15], [0.85, -1.15], [-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38], [-0.85, 1.15], [0.85, 1.15]],
    9: [[-0.9, -1.2], [0, -1.2], [0.9, -1.2], [-0.9, 0], [0, 0], [0.9, 0], [-0.9, 1.2], [0, 1.2], [0.9, 1.2]],
    10: [[-0.9, -1.25], [0, -1.25], [0.9, -1.25], [-0.9, -0.45], [0, -0.45], [0.9, -0.45], [-0.9, 0.5], [0, 0.5], [0.9, 0.5], [0, 1.3]]
  };

  const SUIT_EMBLEM = {
    wands: SYMBOLS.wand,
    cups: SYMBOLS.cup,
    swords: SYMBOLS.sword,
    pentacles: SYMBOLS.pentacle
  };

  // Die Symbolgeometrien nutzen unterschiedliche Einheiten (Münzen: Radius,
  // übrige: ±15 Zeicheneinheiten). Diese Faktoren normalisieren sie auf eine
  // gemeinsame Skala, damit Punktbilder und Asse gleich groß wirken.
  const SUIT_SCALE = { wands: 1, cups: 1, swords: 1, pentacles: 8.4 };

  /** Zeichnet das Farbemblem an (x, y); `suitKey` ist 'wands' | 'cups' | 'swords' | 'pentacles'. */
  function suitEmblemByKey(suitKey, x, y, scale, color) {
    const draw = SUIT_EMBLEM[suitKey] || SYMBOLS.pentacle;
    return draw(x, y, scale * (SUIT_SCALE[suitKey] || 1), color);
  }

  function suitEmblem(card, x, y, scale, color) {
    return suitEmblemByKey(card.suitKey, x, y, scale, color);
  }

  /** Punktbild der Kleinen Arkana: Ass groß und zentral, danach Rasteraufbau. */
  function pipLayer(card, p, c) {
    if (card.rank === 1) return suitEmblem(card, 120, 174, 2.9, c);
    const layout = PIP_LAYOUTS[card.rank] || PIP_LAYOUTS[2];
    const scale = card.rank >= 9 ? 0.72 : card.rank >= 6 ? 0.86 : 1.0;
    return layout.map(([dx, dy]) => {
      const x = 120 + dx * 50;
      const y = 174 + dy * 44;
      return suitEmblem(card, x, y, scale * 1.55, c);
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* Vorderseite                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * @param {object} card
   * @param {{ suffix?: string }} [options]
   *   `suffix` macht die internen SVG-IDs eindeutig, wenn dieselbe Karte
   *   gleichzeitig in Hand, Stich oder Kodex gerendert wird.
   */
  function face(card, options) {
    if (!card) throw new Error('ArcanumCardArt.face: Karte fehlt');
    const opts = options || {};
    const id = `${safeId(card.uid)}${opts.suffix ? `-${safeId(opts.suffix)}` : ''}`;
    const p = palette(card.palette || (card.suitKey || 'aether'));
    const accent = card.isTrump ? p.accent : p.glow;

    if (card.concealed) return back({ id: `${safeId(card.uid)}${opts.suffix ? `-${safeId(opts.suffix)}` : ''}`, palette: card.palette });

    const rankLabel = card.isTrump ? card.numeral : card.index;
    const topLabel = card.isTrump ? 'ARCANA MAIOR' : `${String(card.suit || '').toUpperCase()} · ${String(card.element || '').toUpperCase()}`;
    const bottomLabel = card.isTrump
      ? (card.english || '').toUpperCase()
      : (card.court ? 'HOFKARTE' : 'ARCANA MINORA');

    const art = card.isTrump
      ? (MAJOR_MOTIFS[card.trumpNum] ? MAJOR_MOTIFS[card.trumpNum](p, accent) : '')
      : (card.court
        ? `<g opacity=".34">${suitEmblem(card, 120, 176, 3.4, accent)}</g>${COURT_FIGURES[card.court](p, accent, card.suitKey)}`
        : pipLayer(card, p, accent));

    const effectBadge = card.effectUid
      ? `<g><circle cx="204" cy="352" r="9.2" fill="${p.deep}" stroke="${p.accent}" stroke-width="1"/>
          <text x="204" y="355.6" text-anchor="middle" fill="${p.accent}" font-family="Georgia, serif" font-size="9" font-weight="700">✦</text></g>`
      : '';

    return `<svg class="card-svg card-svg--face" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(card.name)}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-${id}" cx="50%" cy="38%" r="78%">
          <stop offset="0%" stop-color="${p.mid}"/>
          <stop offset="56%" stop-color="${p.deep}"/>
          <stop offset="100%" stop-color="#05040a"/>
        </radialGradient>
        <radialGradient id="halo-${id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${p.glow}" stop-opacity=".38"/>
          <stop offset="62%" stop-color="${p.glow}" stop-opacity=".10"/>
          <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="vig-${id}" cx="50%" cy="46%" r="72%">
          <stop offset="62%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity=".62"/>
        </radialGradient>
        <linearGradient id="frame-${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${p.accent}"/>
          <stop offset="46%" stop-color="${p.foil}" stop-opacity=".72"/>
          <stop offset="100%" stop-color="${p.accent}"/>
        </linearGradient>
      </defs>
      ${baseLayer(id, p, card.uid)}
      ${haloLayer(id, p, 120, 172, 64)}
      <g>${art}</g>
      ${frameLayer(id, p, topLabel, bottomLabel, rankLabel)}
      ${divider(300, p.accent)}
      <text x="120" y="318" text-anchor="middle" fill="${p.ink}" font-family="Cinzel, Georgia, serif" font-size="12.2" font-weight="700" letter-spacing=".5">${esc(shortTitle(card))}</text>
      <text x="120" y="334" text-anchor="middle" fill="${p.accent}" opacity=".7" font-family="Inter, system-ui, sans-serif" font-size="6.2" letter-spacing="1.5">${esc((card.keywords[0] || '').toUpperCase())}</text>
      ${effectBadge}
      <rect width="${W}" height="${H}" rx="14" fill="none" stroke="${p.foil}" stroke-opacity=".28" stroke-width=".6"/>
    </svg>`;
  }

  /** Kartenname ohne Ziffernpräfix, damit der Titel zweizeilig atmet. */
  function shortTitle(card) {
    if (card.isTrump) return card.shortName || card.name;
    return `${card.rankName} der ${card.suit}`;
  }

  function motifCount() {
    return Object.keys(MAJOR_MOTIFS).length;
  }

  global.ArcanumCardArt = Object.freeze({
    WIDTH: W,
    HEIGHT: H,
    PALETTES,
    palette,
    face,
    back,
    motifCount,
    COURT_FIGURES,
    PIP_LAYOUTS
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
