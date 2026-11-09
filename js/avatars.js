/**
 * Arcanum · Avatar-Porträts
 * =================================================================
 * Erzeugt für jede Avatar-Identität (`js/worlds.js`) ein eigenständiges
 * SVG-Porträt – ohne Bilddateien, ohne Emoji, deterministisch und damit
 * offline, in der Oberfläche und in Node-Tests nutzbar.
 *
 * Bildaufbau (von hinten nach vorn)
 *   1. Grund      – Nachthimmel, radialer Schein in der Akzentfarbe
 *   2. Haar hinten – Volumen und Länge, hinter Kopf und Schultern
 *   3. Kapuze/Schleier hinten – Rahmen um den Kopf, Gesicht bleibt frei
 *   4. Robe       – Schultern, Kragen, Stickerei, Metallkante
 *   5. Hals & Kopf – Wangenlicht, Ohren, Nase, Mund, Wangenrot
 *   6. Blick      – Lid, Iris, Lichtpunkt, Wimpernlinie, Brauen
 *   7. Haar vorn  – Stirnansatz, Strähnen, Glanz
 *   8. Kopfbedeckung – Krone, Reif, Helm, Lorbeer, Hörner
 *   9. Kapuze/Schleier vorn – halbtransparente Stoffkante
 *  10. Sigill     – Zeichen der Identität als Anhänger
 *
 * Die Proportionen folgen einem 120 × 120-Raster: Kopfmitte (60, 62),
 * Kopfachse 20 × 24, Augen auf y = 64, Mund auf y = 79.
 *
 * Öffentliche API:
 *   ArcanumAvatars.portrait(avatar, options) → SVG-String
 *   ArcanumAvatars.sigil(name, options)      → SVG-String
 *   ArcanumAvatars.sigilGroup(name, options) → SVG-Gruppe (einbettbar)
 *   ArcanumAvatars.byId(id)                  → Avatar-Datensatz
 *   ArcanumAvatars.headwearList()            → alle Kopfbedeckungen
 */
(function (global) {
  'use strict';

  const WORLDS = global.ArcanumWorlds;
  const SIZE = 120;

  /**
   * Kopf und Schultern werden gegenüber dem Rahmen leicht vergrößert:
   * Bei 32 px im HUD ist ein Gesicht sonst nur ein Punkt. Der Maßstab
   * ist fest, damit alle Porträts dieselbe Bildsprache behalten.
   */
  const FIG_SCALE = 'translate(60 74) scale(1.26) translate(-60 -74)';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ESCAPES[ch]);
  }

  function byId(id) {
    if (!WORLDS) return null;
    return WORLDS.AVATAR_BY_ID[id] || null;
  }

  /** Helligkeitsverschiebung einer Hex-Farbe (-255 … 255). */
  function shade(hex, amount) {
    const value = String(hex || '#000000').replace('#', '');
    const full = value.length === 3 ? value.split('').map(ch => ch + ch).join('') : value;
    const num = parseInt(full, 16);
    const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
    const r = clamp(((num >> 16) & 255) + amount);
    const g = clamp(((num >> 8) & 255) + amount);
    const b = clamp((num & 255) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /** Mischen zweier Hex-Farben (0 = a, 1 = b). */
  function mix(a, b, t) {
    const parse = hex => {
      const v = String(hex).replace('#', '');
      const full = v.length === 3 ? v.split('').map(ch => ch + ch).join('') : v;
      const n = parseInt(full, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    const f = Math.max(0, Math.min(1, t));
    const to = n => Math.round(n).toString(16).padStart(2, '0');
    return `#${to(r1 + (r2 - r1) * f)}${to(g1 + (g2 - g1) * f)}${to(b1 + (b2 - b1) * f)}`;
  }

  /**
   * Einheitliche Farbpalette eines Avatars.
   * `js/worlds.js` führt sowohl WebGL-Zahlen als auch CSS-Werte; für
   * SVG-Porträts zählt ausschließlich die `ui`-Palette. Fehlt sie,
   * werden sinnvolle Ersatzwerte abgeleitet – nie `undefined`.
   */
  /** Wandelt CSS-Hex oder WebGL-Zahl in einen CSS-Hex-String. */
  function toHex(value, fallback) {
    if (typeof value === 'number' && isFinite(value)) {
      return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
    }
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim())) {
      const raw = value.trim().replace('#', '');
      const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw.slice(0, 6);
      return `#${full.toLowerCase()}`;
    }
    return fallback;
  }

  function paletteOf(avatar) {
    const source = (avatar && avatar.ui) || {};
    const ui = {
      skin: toHex(source.skin, '#d8a37e'),
      hair: toHex(source.hair, '#2a1c22'),
      robe: toHex(source.robe, '#8b7346'),
      robeDeep: toHex(source.robeDeep, '#3f3120'),
      trim: toHex(source.trim, '#f0dba6'),
      accent: toHex(source.accent, '#b591ed'),
      glow: toHex(source.glow, toHex(source.accent, '#b591ed')),
      deep: toHex(source.deep, '#100c16')
    };
    const skin = ui.skin;
    const hair = ui.hair;
    const robe = ui.robe;
    const robeDeep = ui.robeDeep;
    const trim = ui.trim;
    const accent = ui.accent;
    return {
      skin,
      skinLight: mix(skin, '#ffffff', .34),
      skinShade: mix(skin, '#2a1220', .82),
      skinDeep: mix(skin, '#1a0c14', .88),
      blush: mix(skin, '#c9504a', .34),
      hair,
      hairLight: mix(hair, '#ffffff', .42),
      hairDeep: mix(hair, '#000000', .34),
      brow: mix(hair, '#1a1016', .6),
      lip: mix(skin, '#7d2f3a', .62),
      robe,
      robeDeep,
      robeShade: mix(robe, '#000000', .38),
      robeLight: mix(robe, '#ffffff', .22),
      trim,
      trimDeep: mix(trim, '#000000', .46),
      trimLight: mix(trim, '#ffffff', .5),
      accent,
      glow: ui.glow,
      deep: ui.deep
    };
  }

  /* ---------------------------------------------------------------- */
  /* Sigille                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Zeichen der Identität, gezeichnet im 24 × 24-Raster.
   * `name` entspricht `AVATARS[].sigil`.
   */
  const SIGILS = {
    eye: '<path d="M3 12c3-4 6-6 9-6s6 2 9 6c-3 4-6 6-9 6s-6-2-9-6z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width=".7" opacity=".55"/>',
    moon: '<path d="M15.6 4.2a8 8 0 1 0 4.2 12.8A8.6 8.6 0 0 1 15.6 4.2z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18.4" cy="7" r="1" fill="currentColor"/>',
    sword: '<path d="M12 2.5l2 2v10.6l-2 2-2-2V4.5z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 14h9M10 18h4" stroke="currentColor" stroke-width="1.4" fill="none"/>',
    lantern: '<path d="M9 7h6l1.4 3.2v7.4L12 20l-4.4-2.4V10.2z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 2.5v3.4" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="13.2" r="2" fill="currentColor" opacity=".85"/>',
    rose: '<circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 3.4a8.6 8.6 0 0 1 8.6 8.6M12 6.6a5.4 5.4 0 0 1 5.4 5.4M12 20.6A8.6 8.6 0 0 1 3.4 12M12 17.4A5.4 5.4 0 0 1 6.6 12" fill="none" stroke="currentColor" stroke-width="1.3"/>',
    star: '<path d="M12 2.6l2.5 5.6 6.1.7-4.5 4.2 1.2 6-5.3-3-5.3 3 1.2-6L3.4 8.9l6.1-.7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    flame: '<path d="M12 2.8c3.6 3.6 5.6 6 5.6 9a5.6 5.6 0 0 1-11.2 0c0-1.8.8-3.2 2-4.6.4 1.6 1.2 2.4 2 2.4.8 0 1.2-.8 1.2-2 0-1.6-.4-3 .4-4.8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    anvil: '<path d="M4 9h9l3-2 4 1v2l-3 .6V13h2v3H5v-3h2V9z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 18h8" stroke="currentColor" stroke-width="1.4"/>',
    crystal: '<path d="M12 2.6l4.4 6-1.6 12.8h-5.6L7.6 8.6z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M7.6 8.6h8.8M12 2.6v18.8" stroke="currentColor" stroke-width=".8" opacity=".65"/>',
    wing: '<path d="M3 16c5.4.6 8.6-1.4 10.4-5.4.8-1.8 2-2.8 4-3.2-1.2 6.4-4.6 10-10.4 10z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 6.4c1.4 2.6 3 4.2 5.4 5" stroke="currentColor" stroke-width="1.1" opacity=".7"/>',
    scales: '<path d="M12 3v17M5 20h14" stroke="currentColor" stroke-width="1.4"/><path d="M4 8h6l-3 4.6zM14 8h6l-3 4.6z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="6.2" r="1.3" fill="currentColor"/>',
    pentacle: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12 4.4l2.2 5.2 5.6.4-4.3 3.7 1.4 5.5L12 16.2l-4.9 3 1.4-5.5L4.2 10l5.6-.4z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>'
  };

  /**
   * @param {string} name Sigillschlüssel
   * @param {{size?:number, color?:string, className?:string}} [options]
   */
  function sigil(name, options) {
    const opts = options || {};
    const size = Number(opts.size) || 24;
    const shape = SIGILS[name] || SIGILS.star;
    const color = opts.color || 'currentColor';
    return `<svg class="arc-sigil${opts.className ? ` ${esc(opts.className)}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${esc(color)}" aria-hidden="true" focusable="false">${shape}</svg>`;
  }

  /** Sigill als einbettbare Gruppe (ohne eigenes `<svg>`). */
  function sigilGroup(name, options) {
    const opts = options || {};
    const size = Number(opts.size) || 24;
    const scale = size / 24;
    const shape = SIGILS[name] || SIGILS.star;
    return `<g transform="translate(${opts.x || 0} ${opts.y || 0}) scale(${scale.toFixed(4)})" style="color:${esc(opts.color || 'currentColor')}">${shape}</g>`;
  }

  /* ---------------------------------------------------------------- */
  /* Haar                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Frisuren: short · long · waves · braid · bun · curls.
   * `back` liegt hinter dem Kopf, `front` auf der Stirn. Beide
   * erhalten die fertige Palette `c`.
   */
  const HAIR = {
    short: {
      back: () => '',
      front: c => `<path d="M39.4 59c-1.8-13.6 7-23 20.6-23s22.4 9.4 20.6 23c-1.6-6.6-4.8-10.4-8.4-11.8-3.6 3.2-7.8 4.6-12.2 4.6-5.8 0-10.6-1.8-14.2-5.2-2.8 2.4-5.2 6.4-6.4 12.4z" fill="${c.hair}"/>
        <path d="M46 42.4c4-3.8 8.8-5.6 14-5.6 4.6 0 8.8 1.4 12 4.2" fill="none" stroke="${c.hairLight}" stroke-width="1.1" opacity=".5" stroke-linecap="round"/>`
    },
    long: {
      back: c => `<path d="M32 56c-3 20-1.6 34 3 42 2-10 3.4-20 3.4-28h43.2c0 8 1.4 18 3.4 28 4.6-8 6-22 3-42z" fill="${c.hairDeep}"/>
        <path d="M35 62c-1.6 17-.4 27 2 34M85 62c1.6 17 .4 27-2 34" fill="none" stroke="${c.hair}" stroke-width="2.6" opacity=".8"/>`,
      front: c => `<path d="M38.6 60c-2.6-16 6.8-25.6 21.4-25.6S83 44 80.4 60c-1.6-7.8-4.6-12.6-8.6-14.8-4.6 4-10.4 6-16.8 6-5.6 0-10.6-1.6-14.6-4.6-1.4 3.4-1.6 8.4-.8 13.4z" fill="${c.hair}"/>
        <path d="M44 40.6c4.2-4.6 9.4-7 15.4-7 5.6 0 10.4 2 14 5.6" fill="none" stroke="${c.hairLight}" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>
        <path d="M41.6 52c-1.4 9-1.4 17 .4 24M78.4 52c1.4 9 1.4 17-.4 24" fill="none" stroke="${c.hairDeep}" stroke-width="1" opacity=".5"/>`
    },
    waves: {
      back: c => `<path d="M32 54c-3.4 15-2.4 26 1 33 3-4 5.2-10 6.2-16h41.6c1 6 3.2 12 6.2 16 3.4-7 4.4-18 1-33z" fill="${c.hairDeep}"/>
        <path d="M35 58c-2 12-1 20 1.4 26M85 58c2 12 1 20-1.4 26" fill="none" stroke="${c.hair}" stroke-width="2" opacity=".7"/>`,
      front: c => `<path d="M37.6 60.4c-2-15.4 7.4-25.4 22.4-25.4s24.4 10 22.4 25.4c-2-6.4-4.4-10.6-7.2-12.8-2.2 3.6-5.4 5-9.4 5-4.8 0-8.4-1.8-11-5.2-3.2 3.4-7.4 5.6-11.8 5.6-2.6 0-4.8-1-6.2-3-.6 3.2-.8 6.8.8 10.4z" fill="${c.hair}"/>
        <path d="M43 41.6c5-4.2 10.6-6.4 16.6-6.4" fill="none" stroke="${c.hairLight}" stroke-width="1.3" opacity=".55" stroke-linecap="round"/>`
    },
    braid: {
      back: c => `<path d="M31.6 58c-1.4 15-.4 24 2 30" fill="none" stroke="${c.hairDeep}" stroke-width="9" stroke-linecap="round"/>
        <path d="M88.4 58c1.4 15 .4 24-2 30" fill="none" stroke="${c.hairDeep}" stroke-width="9" stroke-linecap="round"/>
        <path d="M32.4 60c-1.2 14 0 22 1.8 28" fill="none" stroke="${c.hair}" stroke-width="6" stroke-linecap="round"/>
        <path d="M87.6 60c1.2 14 0 22-1.8 28" fill="none" stroke="${c.hair}" stroke-width="6" stroke-linecap="round"/>
        <g fill="${c.hair}" stroke="${c.hairDeep}" stroke-width=".5">
          <ellipse cx="34.4" cy="76" rx="4.6" ry="2.7" transform="rotate(20 34.4 76)"/>
          <ellipse cx="33.4" cy="83" rx="4.2" ry="2.4" transform="rotate(-16 33.4 83)"/>
          <ellipse cx="85.6" cy="76" rx="4.6" ry="2.7" transform="rotate(-20 85.6 76)"/>
          <ellipse cx="86.6" cy="83" rx="4.2" ry="2.4" transform="rotate(16 86.6 83)"/>
        </g>
        <circle cx="34" cy="88.6" r="2.4" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".5"/>
        <circle cx="86" cy="88.6" r="2.4" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".5"/>`,
      front: c => `<path d="M38.6 59c-2-14.4 7-24.4 21.4-24.4S82 44.6 80 59c-1.8-7.2-4.8-11.6-8.8-13.6C67.8 48.2 64 49.8 60 49.8s-7.8-1.6-11.6-4.2C44.4 47.6 40 52 38.6 59z" fill="${c.hair}"/>
        <path d="M48.6 40.4c3.6-2.8 7.6-4.2 11.4-4.2 4.6 0 8.8 1.8 12 5" fill="none" stroke="${c.hairLight}" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>`
    },
    bun: {
      back: c => `<circle cx="60" cy="28.6" r="10.4" fill="${c.hairDeep}"/>
        <circle cx="60" cy="28.6" r="10.4" fill="none" stroke="${c.hair}" stroke-width="2.6"/>
        <circle cx="60" cy="28.6" r="3.6" fill="none" stroke="${c.trim}" stroke-width="1.3" opacity=".9"/>
        <path d="M52 24c2.6-3 6-4.4 9.6-4.4" fill="none" stroke="${c.hairLight}" stroke-width="1" opacity=".6" stroke-linecap="round"/>`,
      front: c => `<path d="M37.6 60c-2-16 7.4-25.6 22.4-25.6S84.4 44 82.4 60c-1.6-8-5-12.8-9.8-14.8-3.8 2.8-8 4.2-12.6 4.2s-8.6-1.2-12-3.6C42.6 48 39 53 37.6 60z" fill="${c.hair}"/>
        <path d="M40 55c-1 6.6-.6 12 1 17M80 55c1 6.6.6 12-1 17" fill="none" stroke="${c.hairDeep}" stroke-width="1" opacity=".55"/>`
    },
    curls: {
      back: c => `<g fill="${c.hairDeep}">
          <circle cx="33" cy="52" r="9.4"/><circle cx="87" cy="52" r="9.4"/>
          <circle cx="37" cy="37" r="8.8"/><circle cx="83" cy="37" r="8.8"/>
          <circle cx="60" cy="28" r="10.6"/>
          <circle cx="29" cy="66" r="7.4"/><circle cx="91" cy="66" r="7.4"/>
        </g>
        <g fill="${c.hair}">
          <circle cx="33" cy="51.4" r="7.6"/><circle cx="87" cy="51.4" r="7.6"/>
          <circle cx="37.6" cy="37" r="7"/><circle cx="82.4" cy="37" r="7"/>
          <circle cx="60" cy="28.6" r="8.6"/>
          <circle cx="30" cy="65" r="5.8"/><circle cx="90" cy="65" r="5.8"/>
        </g>
        <g fill="none" stroke="${c.hairLight}" stroke-width=".9" opacity=".38">
          <circle cx="33" cy="51.4" r="5"/><circle cx="87" cy="51.4" r="5"/><circle cx="60" cy="28.6" r="5.6"/>
        </g>`,
      front: c => `<path d="M40 58c-1.6-12.4 6.8-19.6 20-19.6s21.6 7.2 20 19.6c-2-5.8-5-8.8-9-10.2-3 2.4-7 3.6-11 3.6s-8-1.2-11-3.6c-4 1.4-7 4.4-9 10.2z" fill="${c.hair}"/>
        <path d="M45 44c4-3 8.6-4.6 13.4-4.6" fill="none" stroke="${c.hairLight}" stroke-width="1.1" opacity=".45" stroke-linecap="round"/>`
    }
  };

  const HAIR_STYLES = {
    adept: 'short', oracle: 'long', warden: 'bun', hermit: 'curls',
    empress: 'waves', pilgrim: 'short', sibyl: 'waves', smith: 'short',
    frost: 'braid', dreamer: 'long', judge: 'bun', alchemist: 'braid'
  };

  function hairStyleFor(avatar) {
    return HAIR_STYLES[avatar.id] || 'short';
  }

  /* ---------------------------------------------------------------- */
  /* Stoff: Kapuze und Schleier                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Kapuze und Schleier sind **Rahmen**, keine Masken: hinten liegt
   * eine große Stoffform, vorn nur eine schmale Kante – das Gesicht
   * bleibt in jedem Fall sichtbar.
   */
  const HOODS = {
    /**
     * Kapuze: ein breites Stoffband, das vom einen Schulterpunkt über
     * den Kopf zum anderen läuft. Als Strich mit runden Enden gezeichnet,
     * bleibt die Öffnung frei – das Gesicht wird nie überdeckt.
     */
    hood: {
      behind: c => `<g>
          <ellipse cx="60" cy="49" rx="31" ry="33" fill="${mix(c.robeDeep, '#05040a', .4)}"/>
          <path d="M31 88C25 44 39 17 60 17s35 27 29 71" fill="none" stroke="${c.robeDeep}" stroke-width="17" stroke-linecap="round"/>
          <path d="M31 88C25 44 39 17 60 17s35 27 29 71" fill="none" stroke="${c.robeShade}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
          <path d="M34 80C29 45 41 22 60 22s31 23 26 58" fill="none" stroke="${c.trim}" stroke-width=".9" opacity=".35" stroke-dasharray="1.4 4.6"/>
        </g>`,
      front: c => `<path d="M44.6 60c-2.4-6.2-2.2-12.2 1-17.4M75.4 60c2.4-6.2 2.2-12.2-1-17.4" fill="none" stroke="${c.robeDeep}" stroke-width="3.4" opacity=".8" stroke-linecap="round"/>
        <path d="M44.6 60c-2.4-6.2-2.2-12.2 1-17.4M75.4 60c2.4-6.2 2.2-12.2-1-17.4" fill="none" stroke="${c.trim}" stroke-width=".8" opacity=".5" stroke-linecap="round" stroke-dasharray="1 3.2"/>
        <path d="M45.6 71.4c4.4 2 9.4 3 14.4 3s10-1 14.4-3" fill="none" stroke="${c.robeShade}" stroke-width="1.5" opacity=".4"/>`
    },

    /**
     * Schleier: dasselbe Band in hellerem Stoff, dazu ein Stirnband mit
     * Gemme und eine feine Perlenkette am Hals.
     */
    veil: {
      behind: c => `<g>
          <ellipse cx="60" cy="48" rx="32" ry="34" fill="${mix(c.robeDeep, '#05040a', .34)}"/>
          <path d="M29 90C23 43 38 14 60 14s37 29 31 76" fill="none" stroke="${c.robeDeep}" stroke-width="15" stroke-linecap="round"/>
          <path d="M31 86C26 45 40 19 60 19s34 26 29 67" fill="none" stroke="${c.glow}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
          <path d="M34 78C30 46 42 24 60 24s30 22 26 54" fill="none" stroke="${c.trim}" stroke-width=".9" opacity=".4" stroke-dasharray="1.6 4.4"/>
          <circle cx="60" cy="16.4" r="3" fill="${c.accent}" stroke="${c.trim}" stroke-width=".7"/>
        </g>`,
      front: c => `<path d="M44 54.6c5-3 10.2-4.4 16-4.4s11 1.4 16 4.4" fill="none" stroke="${c.trimDeep}" stroke-width="2.8" opacity=".42" stroke-linecap="round"/>
        <path d="M44 54.6c5-3 10.2-4.4 16-4.4s11 1.4 16 4.4" fill="none" stroke="${c.trim}" stroke-width="1.3" opacity=".85" stroke-linecap="round"/>
        <circle cx="60" cy="53.4" r="2.4" fill="${c.accent}" stroke="${c.trimLight}" stroke-width=".6"/>
        <path d="M41 76.6c6.2 1.8 12.6 2.8 19 2.8s12.8-1 19-2.8" fill="none" stroke="${c.accent}" stroke-width="1.1" opacity=".26"/>`
    }
  };

  /* ---------------------------------------------------------------- */
  /* Kopfbedeckungen (oben auf dem Haar)                               */
  /* ---------------------------------------------------------------- */

  const HEADWEAR = {
    none() {
      return '';
    },
    circlet(c) {
      return `<g>
        <path d="M40 46.6c5.6-8.6 12.4-12.8 20-12.8s14.4 4.2 20 12.8" fill="none" stroke="${c.trim}" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M41.2 45.2c5.4-7.6 11.8-11.2 18.8-11.2S73.4 37.6 78.8 45.2" fill="none" stroke="${c.trimLight}" stroke-width=".8" opacity=".6"/>
        <path d="M60 29.6l3.6 5.4-3.6 4.4-3.6-4.4z" fill="${c.accent}" stroke="${c.trim}" stroke-width=".8"/>
        <circle cx="60" cy="27.8" r="1.4" fill="${c.trimLight}"/>
      </g>`;
    },
    crown(c) {
      return `<g>
        <path d="M42 44.6l1.8-11.8 6.6 6.6 5.2-10.8 5.2 10.8 6.6-6.6 1.8 11.8z" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".9" stroke-linejoin="round"/>
        <path d="M41.4 47.2h37.2" stroke="${c.trimDeep}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M44.4 40.6h31.2" stroke="${c.trimLight}" stroke-width=".9" opacity=".7"/>
        <circle cx="43.8" cy="32.8" r="2" fill="${c.accent}" stroke="${c.trimDeep}" stroke-width=".5"/>
        <circle cx="60" cy="27.2" r="2.4" fill="${c.accent}" stroke="${c.trimDeep}" stroke-width=".5"/>
        <circle cx="76.2" cy="32.8" r="2" fill="${c.accent}" stroke="${c.trimDeep}" stroke-width=".5"/>
      </g>`;
    },
    helm(c) {
      return `<g>
        <path d="M59.6 21.6c-12.8 0-21.8 9.6-21.8 22.8 0 3 .4 5.6 1 7.6" fill="none" stroke="${c.trim}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M60.4 21.6c12.8 0 21.8 9.6 21.8 22.8 0 3-.4 5.6-1 7.6" fill="none" stroke="${c.trim}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M60 20v-5M53.6 15h12.8" stroke="${c.trim}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M42.6 44c5-3.6 11-5.4 17.4-5.4S72.4 40.4 77.4 44" fill="none" stroke="${c.trim}" stroke-width="1.6" opacity=".85"/>
        <path d="M45 38.6c3.8-2.4 8.6-3.6 14.4-3.6" fill="none" stroke="${c.trimLight}" stroke-width="1.3" opacity=".6" stroke-linecap="round"/>
        <circle cx="60" cy="37.4" r="2.3" fill="${c.accent}" opacity=".95"/>
      </g>`;
    },
    laurel(c) {
      const leaves = [];
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = 39.4 + t * 15;
        const y = 45.6 - Math.sin(t * Math.PI * .82) * 13.6;
        leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.5" ry="1.5" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".4" opacity="${(.95 - t * .2).toFixed(2)}" transform="rotate(${(-34 - i * 15).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
      }
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = 80.6 - t * 15;
        const y = 45.6 - Math.sin(t * Math.PI * .82) * 13.6;
        leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.5" ry="1.5" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".4" opacity="${(.95 - t * .2).toFixed(2)}" transform="rotate(${(34 + i * 15).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
      }
      return `<g>
        <path d="M39 46.6c6-11.4 13-16.4 21-16.4s15 5 21 16.4" fill="none" stroke="${c.trimDeep}" stroke-width="1.4" opacity=".7"/>
        ${leaves.join('')}
        <circle cx="60" cy="29.8" r="2.2" fill="${c.accent}" stroke="${c.trim}" stroke-width=".6"/>
      </g>`;
    },
    horns(c) {
      return `<g>
        <path d="M45 38.6c-6.6-1.6-10.8-7-9.8-13.6 3.8 3.6 7.4 4.8 10.4 4.4" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".8"/>
        <path d="M75 38.6c6.6-1.6 10.8-7 9.8-13.6-3.8 3.6-7.4 4.8-10.4 4.4" fill="${c.trim}" stroke="${c.trimDeep}" stroke-width=".8"/>
        <path d="M41 46.4c5-8.8 11.6-13.2 19-13.2s14 4.4 19 13.2" fill="none" stroke="${c.trim}" stroke-width="1.8"/>
        <circle cx="60" cy="30.6" r="2.2" fill="${c.accent}" opacity=".9"/>
      </g>`;
    }
  };

  const HEADWEAR_LIST = Object.keys(HEADWEAR);

  /* ---------------------------------------------------------------- */
  /* Gesicht                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Kopf mit Wangenlicht, Ohren, Nase, Mund und Kinn. Der Kopf ist
   * großzügig proportioniert (38 × 40 im 120er-Raster), damit Mimik
   * auch in kleinen Chips lesbar bleibt.
   */
  /** Hals – liegt HINTER der Robe, damit kein Schlauch über dem Kragen steht. */
  function neckLayer(c) {
    return `<path d="M53 74h14v13c0 3.4-3.2 5.2-7 5.2s-7-1.8-7-5.2z" fill="${c.skinShade}"/>
      <path d="M55.4 84.6c2.8 1.5 6.4 1.5 9.2 0" fill="none" stroke="${c.skinDeep}" stroke-width="1" opacity=".4"/>
      <path d="M53 78.6c2 2.4 4.4 3.6 7 3.6s5-1.2 7-3.6" fill="none" stroke="${c.skinDeep}" stroke-width="1.1" opacity=".28"/>`;
  }

  function faceLayer(c) {
    return `<g>
      <path d="M60 38.4c-11.4 0-20 8.4-20 20.4 0 12 8.6 21 20 21s20-9 20-21c0-12-8.6-20.4-20-20.4z" fill="${c.skin}"/>
      <path d="M60 38.4c-11.4 0-20 8.4-20 20.4 0 12 8.6 21 20 21-6.6-4.6-10-12-10-21 0-8.2 3.4-15.2 10-20.4z" fill="${c.skinLight}" opacity=".5"/>
      <path d="M60 38.4c11.4 0 20 8.4 20 20.4 0 12-8.6 21-20 21 6.6-4.6 10-12 10-21 0-8.2-3.4-15.2-10-20.4z" fill="${c.skinShade}" opacity=".28"/>
      <path d="M40.2 55.6c-2.8-.4-4.6 1.5-4.6 4.3s1.8 4.9 4.8 4.7" fill="${c.skin}" stroke="${c.skinShade}" stroke-width=".8"/>
      <path d="M79.8 55.6c2.8-.4 4.6 1.5 4.6 4.3s-1.8 4.9-4.8 4.7" fill="${c.skin}" stroke="${c.skinShade}" stroke-width=".8"/>
      <ellipse cx="48.2" cy="68.6" rx="5.2" ry="3.1" fill="${c.blush}" opacity=".38"/>
      <ellipse cx="71.8" cy="68.6" rx="5.2" ry="3.1" fill="${c.blush}" opacity=".38"/>
      <path d="M60 62.6c-1.2 0-2 1.1-2 2.7 0 1.7 1 2.9 2 2.9s2-1.2 2-2.9c0-1.6-.8-2.7-2-2.7z" fill="${c.skinDeep}" opacity=".4"/>
      <path d="M58.2 68.6c1.2.9 2.4.9 3.6 0" fill="none" stroke="${c.skinDeep}" stroke-width=".9" opacity=".5" stroke-linecap="round"/>
      <path d="M54.8 73.4c1.8 1.7 3.5 2.5 5.2 2.5s3.4-.8 5.2-2.5" fill="none" stroke="${c.lip}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M56.4 72.4c2.3.8 4.9.8 7.2 0" fill="none" stroke="${c.skinLight}" stroke-width=".8" opacity=".5" stroke-linecap="round"/>
      <path d="M56.6 77.6c2.2 1 4.6 1 6.8 0" fill="none" stroke="${c.skinShade}" stroke-width=".8" opacity=".32"/>
    </g>`;
  }

  /**
   * Ein Auge: Lidform, Iris mit Lichtpunkt, Wimpernlinie und Lidfalte.
   * `dir` verschiebt den Blick leicht nach links (-1) oder rechts (1).
   */
  function eye(x, y, c, dir) {
    return `<g>
      <path d="M${x - 6.2} ${y}c1.9-3.4 4.3-5 6.6-5s4.7 1.6 6.1 5c-1.8 3.2-3.9 4.7-6.1 4.7s-4.7-1.5-6.6-4.7z" fill="#fdf7ee"/>
      <path d="M${x - 6.2} ${y}c1.9-3.4 4.3-5 6.6-5s4.7 1.6 6.1 5c-1.8 3.2-3.9 4.7-6.1 4.7s-4.7-1.5-6.6-4.7z" fill="${c.skinShade}" opacity=".2"/>
      <circle cx="${x + dir * .8}" cy="${y - .2}" r="3" fill="${c.iris}"/>
      <circle cx="${x + dir * .8}" cy="${y - .2}" r="1.4" fill="#14101a"/>
      <circle cx="${x + dir * .8 - .95}" cy="${y - 1.35}" r=".9" fill="#ffffff" opacity=".92"/>
      <path d="M${x - 6.4} ${y - .2}c1.9-3.6 4.5-5.3 6.6-5.3s4.5 1.7 6.4 5.3" fill="none" stroke="${c.brow}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M${x - 5.2} ${y + 4}c1.7 1.2 3.5 1.7 5.2 1.7s3.5-.5 5.2-1.7" fill="none" stroke="${c.skinShade}" stroke-width=".8" opacity=".55"/>
      <path d="M${x - 6.6} ${y - 2.6}c1.9-3.2 4.5-4.8 6.6-4.8s4.7 1.6 6.6 4.8" fill="none" stroke="${c.skinShade}" stroke-width=".7" opacity=".4"/>
    </g>`;
  }

  /** Braue – leicht geneigt, je Identität verschieden. */
  function brow(x, y, c, tilt) {
    return `<path d="M${x - 5.8} ${y + tilt}c2.5-2.8 6.6-3.6 10-1.7" fill="none" stroke="${c.brow}" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <path d="M${x - 4.6} ${y + tilt - .5}c2-1.6 5-2.2 7.6-1.2" fill="none" stroke="${c.hairLight}" stroke-width=".6" opacity=".35" stroke-linecap="round"/>`;
  }

  /* ---------------------------------------------------------------- */
  /* Robe                                                              */
  /* ---------------------------------------------------------------- */

  function robeLayer(c) {
    return `<g>
      <path d="M17 120c1-15.4 8.8-25.6 21.4-31.2L60 82l21.6 6.8C94.2 94.4 102 104.6 103 120z" fill="${c.robe}"/>
      <path d="M17 120c1-15.4 8.8-25.6 21.4-31.2l9.6-3.2 1.6 34.4z" fill="${c.robeShade}" opacity=".42"/>
      <path d="M38.4 88.8c6.2 4.2 13.4 6.6 21.6 6.6s15.4-2.4 21.6-6.6" fill="none" stroke="${c.robeShade}" stroke-width="1.3"/>
      <path d="M60 95.6l10.8 4.8 3.4 19.6H45.8l3.4-19.6z" fill="${c.robeDeep}"/>
      <path d="M49.2 98.4c2 6.2 2.6 12.2 2.4 21.6M70.8 98.4c-2 6.2-2.6 12.2-2.4 21.6" fill="none" stroke="${c.trim}" stroke-width="1.1" opacity=".78"/>
      <path d="M38.4 88.6c6.8 4.4 13.4 6.8 21.6 6.8s14.8-2.4 21.6-6.8" fill="none" stroke="${c.trim}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M40.6 89.6c6.4 3.8 12.6 5.8 19.4 5.8" fill="none" stroke="${c.trimLight}" stroke-width=".8" opacity=".55"/>
      <circle cx="60" cy="94.6" r="2.4" fill="${c.accent}" stroke="${c.trim}" stroke-width=".7"/>
      <path d="M29.4 105c2.6 4.6 4.4 9 5 15.4M90.6 105c-2.6 4.6-4.4 9-5 15.4" fill="none" stroke="${c.robeShade}" stroke-width="1" opacity=".45"/>
      <path d="M64 100.4c2.6 1.8 5.4 2.8 8.2 3" fill="none" stroke="${c.robeLight}" stroke-width=".8" opacity=".35"/>
    </g>`;
  }

  /* ---------------------------------------------------------------- */
  /* Porträt                                                           */
  /* ---------------------------------------------------------------- */

  function safeId(value) {
    return String(value || 'x').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * @param {object|string} avatar Avatar-Datensatz oder `id`
   * @param {{suffix?:string, size?:number, className?:string}} [options]
   */
  function portrait(avatar, options) {
    const opts = options || {};
    const data = typeof avatar === 'string' ? byId(avatar) : avatar;
    if (!data) throw new Error('ArcanumAvatars.portrait: unbekannter Avatar');
    const c = paletteOf(data);
    c.iris = mix(c.accent, '#241a34', .28);
    const id = `av-${safeId(data.id)}${opts.suffix ? `-${safeId(opts.suffix)}` : ''}`;
    const style = hairStyleFor(data);
    const hair = HAIR[style] || HAIR.short;
    const wear = HEADWEAR[data.headwear] ? data.headwear : 'none';
    const hood = data.headwear === 'hood' ? HOODS.hood : data.headwear === 'veil' ? HOODS.veil : null;
    const tilt = data.id.length % 3 === 0 ? -1 : data.id.length % 3 === 1 ? 0 : 1;
    const gaze = data.id.length % 2 ? -1 : 1;
    const size = Number(opts.size) || SIZE;
    return `<svg class="arc-portrait${opts.className ? ` ${esc(opts.className)}` : ''}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(data.label)} – ${esc(data.title)}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-${id}" cx="50%" cy="28%" r="80%">
          <stop offset="0%" stop-color="${mix(c.accent, '#ffffff', .1)}"/>
          <stop offset="40%" stop-color="${mix(c.accent, c.deep, .62)}"/>
          <stop offset="100%" stop-color="#07050c"/>
        </radialGradient>
        <radialGradient id="halo-${id}" cx="50%" cy="38%" r="54%">
          <stop offset="0%" stop-color="${c.glow}" stop-opacity=".34"/>
          <stop offset="60%" stop-color="${c.accent}" stop-opacity=".12"/>
          <stop offset="100%" stop-color="${c.accent}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="rim-${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c.trimLight}"/>
          <stop offset="46%" stop-color="${c.trimDeep}"/>
          <stop offset="100%" stop-color="${c.trim}"/>
        </linearGradient>
        <linearGradient id="fade-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity=".38"/>
        </linearGradient>
        <clipPath id="clip-${id}"><circle cx="60" cy="60" r="58"/></clipPath>
      </defs>
      <g clip-path="url(#clip-${id})">
        <rect width="120" height="120" fill="url(#bg-${id})"/>
        <circle cx="60" cy="48" r="46" fill="url(#halo-${id})"/>
        <g transform="${FIG_SCALE}">
          ${hair.back(c)}
          ${hood ? hood.behind(c) : ''}
          ${neckLayer(c)}
          ${faceLayer(c)}
          ${eye(52.2, 63.4, c, gaze)}
          ${eye(67.8, 63.4, c, gaze)}
          ${brow(52.2, 55.4, c, tilt)}
          ${brow(67.8, 55.4, c, -tilt)}
          ${hair.front(c)}
          ${HEADWEAR[wear](c)}
          ${hood ? hood.front(c) : ''}
        </g>
        <g transform="translate(0 3)">${robeLayer(c)}</g>
        <rect y="86" width="120" height="34" fill="url(#fade-${id})"/>
      </g>
      <circle cx="60" cy="60" r="58" fill="none" stroke="url(#rim-${id})" stroke-width="2.6"/>
      <circle cx="60" cy="60" r="54.6" fill="none" stroke="${c.glow}" stroke-opacity=".22" stroke-width=".8"/>
      <g transform="translate(85 85)">
        <circle cx="12" cy="12" r="12.6" fill="${c.robeDeep}" stroke="${c.trim}" stroke-width="1.3"/>
        <circle cx="12" cy="12" r="12.6" fill="none" stroke="${c.glow}" stroke-opacity=".26" stroke-width=".7"/>
        ${sigilGroup(data.sigil, { x: 3.4, y: 3.4, size: 17.2, color: c.glow })}
      </g>
    </svg>`;
  }

  global.ArcanumAvatars = Object.freeze({
    SIZE,
    portrait,
    sigil,
    sigilGroup,
    paletteOf,
    byId,
    HEADWEAR,
    HOODS,
    HAIR,
    headwearList: () => HEADWEAR_LIST.slice(),
    SIGILS,
    shade,
    mix
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
