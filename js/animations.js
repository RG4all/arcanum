/**
 * Arcanum · Animationsschicht
 * =================================================================
 * Kleine, DOM-freundliche Werkzeugkiste für gerenderte Animationen.
 * Alles läuft über requestAnimationFrame, respektiert
 * `prefers-reduced-motion` und benötigt keine Bibliothek.
 *
 * Bausteine:
 *   spring()             – gedämpfte Feder für Karten-Transforms
 *   tween()              – generischer Wertetransport mit Easing
 *   cardFlight()         – Karte fliegt vom Handfach zum Stich
 *   clash()              – Treffer-Effekt (Shake, Ringe, Funken)
 *   scoreCounter()       – zählender Karmawert
 *   confetti()           – Partikelregen für Podium und Treffer
 *
 * Alle geometrischen Helfer sind reine Funktionen und damit testbar.
 */
(function (global) {
  'use strict';

  const reduceMotionQuery = '(prefers-reduced-motion: reduce)';

  function prefersReducedMotion() {
    return typeof global.matchMedia === 'function' && global.matchMedia(reduceMotionQuery).matches;
  }

  /* ---------------------------------------------------------------- */
  /* Reine Mathematik                                                  */
  /* ---------------------------------------------------------------- */

  const EASING = {
    linear: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1)
  };

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Gedämpfte Feder – Standardmodell für Kartenbewegungen.
   * Reine Funktion: Zustand hinein, neuer Zustand heraus.
   *
   * @param {{value:number, velocity:number}} state
   * @param {number} target
   * @param {number} dt Sekunden
   * @param {{stiffness?:number, damping?:number, mass?:number}} [options]
   */
  function springStep(state, target, dt, options) {
    const opts = options || {};
    const stiffness = opts.stiffness ?? 180;
    const damping = opts.damping ?? 22;
    const mass = opts.mass ?? 1;
    const step = Math.max(0, Math.min(0.05, Number(dt) || 0));
    let value = state.value;
    let velocity = state.velocity;
    // Halbschrittintegration hält die Feder auch bei Bildraten unter 30 fps stabil.
    const half = step / 2;
    const accel1 = (-stiffness * (value - target) - damping * velocity) / mass;
    velocity += accel1 * half;
    value += velocity * half;
    const accel2 = (-stiffness * (value - target) - damping * velocity) / mass;
    velocity += accel2 * half;
    value += velocity * half;
    return { value, velocity };
  }

  /**
   * Kartenfächer: Rotation und Hub je Position in der Hand.
   * Der Fächerwinkel pro Karte bleibt konstant, damit eine große Hand
   * wie ein echter Fächer aussieht statt sich zu einer flachen Reihe
   * zu strecken. `maxSpread` begrenzt den Gesamtwinkel.
   */
  function fanTransform(index, count, options) {
    const opts = options || {};
    const spread = opts.spread ?? 4.2;
    const maxSpread = opts.maxSpread ?? 34;
    const arc = opts.arc ?? 34;
    const center = (count - 1) / 2;
    const offset = count > 1 ? index - center : 0;
    const clamped = count > 1 ? Math.max(-1, Math.min(1, (offset * spread) / (maxSpread / 2))) : 0;
    return {
      rotate: +(offset * spread).toFixed(3),
      lift: +(clamped * clamped * arc).toFixed(3),
      order: index
    };
  }

  /** Bogenpunkte für eine fliegende Karte (quadratische Bézierkurve). */
  function flightPoint(from, to, t, arcHeight) {
    const eased = EASING.inOutCubic(clamp01(t));
    const cx = (from.x + to.x) / 2;
    const cy = Math.min(from.y, to.y) - (arcHeight ?? 90);
    const mt = 1 - eased;
    return {
      x: mt * mt * from.x + 2 * mt * eased * cx + eased * eased * to.x,
      y: mt * mt * from.y + 2 * mt * eased * cy + eased * eased * to.y,
      rotate: lerp(from.rotate || 0, to.rotate || 0, eased),
      scale: lerp(from.scale ?? 1, to.scale ?? 1, eased)
    };
  }

  /* ---------------------------------------------------------------- */
  /* Laufzeit-Helfer                                                   */
  /* ---------------------------------------------------------------- */

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  /**
   * Führt eine Animation aus. Gibt eine Abbrechen-Funktion zurück.
   * Bei reduzierter Bewegung springt die Animation sofort ans Ziel.
   */
  function animate(duration, onFrame, onDone) {
    if (typeof global.requestAnimationFrame !== 'function' || prefersReducedMotion()) {
      onFrame(1);
      if (onDone) onDone();
      return () => {};
    }
    const start = now();
    let cancelled = false;
    let frame = 0;
    const tick = () => {
      if (cancelled) return;
      const progress = clamp01((now() - start) / Math.max(1, duration));
      onFrame(progress);
      if (progress < 1) frame = global.requestAnimationFrame(tick);
      else if (onDone) onDone();
    };
    frame = global.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(frame);
    };
  }

  /** Animiert einen Zahlenwert über einen generischen Easing-Verlauf. */
  function tween(from, to, duration, onValue, options) {
    const opts = options || {};
    const ease = EASING[opts.easing || 'outCubic'] || EASING.outCubic;
    return animate(duration, progress => onValue(lerp(from, to, ease(progress))));
  }

  /* ---------------------------------------------------------------- */
  /* Kartenflug                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Lässt eine Karte von der Hand zum Stich fliegen.
   * Der Aufrufer liefert bereits erzeugte Zielelemente; die Funktion
   * manipuliert nur Transform und Opacity.
   */
  function cardFlight(sourceEl, targetRect, options) {
    const opts = options || {};
    const element = sourceEl;
    if (!element || !element.getBoundingClientRect) return Promise.resolve();
    const startRect = element.getBoundingClientRect();
    const from = { x: startRect.left, y: startRect.top, rotate: opts.startRotate || 0, scale: 1 };
    const to = { x: targetRect.left, y: targetRect.top, rotate: 0, scale: targetRect.width / Math.max(1, startRect.width) };
    const ghost = element.cloneNode(true);
    ghost.classList.add('card-ghost');
    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.position = 'fixed';
    ghost.style.left = `${startRect.left}px`;
    ghost.style.top = `${startRect.top}px`;
    ghost.style.width = `${startRect.width}px`;
    ghost.style.height = `${startRect.height}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '900';
    document.body.appendChild(ghost);
    element.style.visibility = 'hidden';

    return new Promise(resolve => {
      animate(opts.duration || 620, progress => {
        const point = flightPoint(from, to, progress, opts.arcHeight ?? 110);
        ghost.style.transform = `translate3d(${point.x - from.x}px, ${point.y - from.y}px, 0) rotate(${point.rotate}deg) scale(${point.scale})`;
        ghost.style.opacity = String(progress > 0.86 ? Math.max(0, (1 - progress) / 0.14) : 1);
      }, () => {
        ghost.remove();
        element.style.visibility = '';
        resolve();
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Treffer-Effekt                                                    */
  /* ---------------------------------------------------------------- */

  /** Kurzer Shake plus expandierende Ringe am Stichzentrum. */
  function clash(targetEl, options) {
    const opts = options || {};
    const element = targetEl;
    if (!element) return;
    element.classList.remove('is-clashing');
    // Reflow erzwingen, damit die Animation erneut startet.
    void element.offsetWidth;
    element.classList.add('is-clashing');
    if (opts.label) {
      const burst = document.createElement('div');
      burst.className = 'clash-burst';
      burst.setAttribute('aria-hidden', 'true');
      burst.textContent = opts.label;
      element.appendChild(burst);
      animate(1100, () => {}, () => burst.remove());
    }
    setTimeout(() => element.classList.remove('is-clashing'), 700);
  }

  /* ---------------------------------------------------------------- */
  /* Karmazähler                                                       */
  /* ---------------------------------------------------------------- */

  /** Zählt einen Karmawert sichtbar hoch/runter und hebt Änderungen hervor. */
  function scoreCounter(element, to, options) {
    if (!element) return;
    const opts = options || {};
    const from = Number(element.dataset.value || opts.from || 0);
    const target = Number(to) || 0;
    element.dataset.value = String(target);
    const format = opts.format || (value => `${Math.round(value)}`);
    if (from === target) {
      element.textContent = format(target);
      return;
    }
    const direction = target > from ? 'is-up' : 'is-down';
    element.classList.remove('is-up', 'is-down');
    void element.offsetWidth;
    element.classList.add(direction);
    tween(from, target, opts.duration || 720, value => {
      element.textContent = format(value);
    }, { easing: 'outCubic' });
    setTimeout(() => element.classList.remove(direction), 1200);
  }

  /* ---------------------------------------------------------------- */
  /* Partikel                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Partikelregen auf einem Canvas. Wird für Podium und Treffer genutzt.
   * Gibt eine Stopp-Funktion zurück.
   */
  function confetti(canvas, options) {
    const opts = options || {};
    if (!canvas || typeof canvas.getContext !== 'function' || prefersReducedMotion()) {
      return () => {};
    }
    const ctx = canvas.getContext('2d');
    // Ohne 2D-Kontext (z. B. Canvas-deaktiviert) bleibt das Podium schlicht statisch.
    if (!ctx) return () => {};
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const colors = opts.colors || ['#f2dda3', '#d8bd78', '#b49ad5', '#9fe7b6', '#ffea80'];
    const count = opts.count || 90;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 0.6 * dpr,
      vy: (1.4 + Math.random() * 2.6) * dpr,
      size: (2.4 + Math.random() * 4.2) * dpr,
      spin: (Math.random() - 0.5) * 0.18,
      angle: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    let raf = 0;
    let stopped = false;
    const start = now();
    const tick = () => {
      if (stopped) return;
      const elapsed = now() - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.012 * dpr;
        particle.angle += particle.spin;
        if (particle.y > canvas.height + 20) {
          particle.y = -20;
          particle.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.angle);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 9000);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 5, particle.size, particle.size / 2.4);
        ctx.restore();
      });
      raf = global.requestAnimationFrame(tick);
    };
    raf = global.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  global.ArcanumFx = Object.freeze({
    EASING,
    prefersReducedMotion,
    clamp01,
    lerp,
    springStep,
    fanTransform,
    flightPoint,
    animate,
    tween,
    cardFlight,
    clash,
    scoreCounter,
    confetti
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
