/**
 * Arcanum · Weltdaten (Orte, Galaxien, Avatar-Identitäten)
 * =================================================================
 * Diese Datei ist die **einzige Datenquelle** für die zehn Ritualorte,
 * für die drei begehbaren Welten, für die Porträt-Paletten der
 * Avatare und für die Hover-Kurzbeschreibungen der Oberfläche.
 *
 * Sie ist vollständig DOM-frei: Kein Three.js, kein `document`,
 * keine Zeitgeber. Damit läuft sie in Node, in Tests und in der
 * 3D-Schicht (`js/scene3d.js`) gleichermaßen.
 *
 * Verantwortlichkeiten
 *   ROOMS            – zehn Orte mit Palette, Architektur, Stimmung
 *   WORLDS           – drei begehbare 3D-Welten (Kuppel, Insel, Orbit)
 *   AVATARS          – zwölf Avatar-Identitäten mit Palette und Sigille
 *   HOVER_HINTS      – Kurzbeschreibung + Funktion je UI-Element
 *   roomPalette()    – CSS-Farbwerte je Ort (für 2D-Flächen)
 *   hoverHint()      – Hint-Objekt zu einem Schlüssel
 *
 * Die 3D-Schicht liest `ROOMS` (inklusive `scene`) und `WORLDS`,
 * `js/app.js` liest `HOVER_HINTS` und `AVATARS`.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* Die zehn Ritualorte                                               */
  /* ---------------------------------------------------------------- */

  /**
   * `scene` enthält die WebGL-Parameter (Farben als Hex-Zahlen),
   * `ui` die CSS-Farbwerte derselben Stimmung für Karten, HUD und
   * Verläufe. Beide werden aus derselben Beschreibung abgeleitet,
   * damit 2D und 3D nie auseinanderlaufen.
   */
  const ROOMS = [
    {
      id: 'temple', world: 'cathedral', architecture: 'sanctum',
      label: 'Sanctum der Sieben Siegel',
      tagline: 'Marmor, Gold und ein sternverglastes Sanktuarium',
      description: 'Ein stiller Gewölbehof aus dunklem Marmor, vergoldeten Säulen und einem sternverglasten Sanktuarium.',
      mood: 'Andächtig · feierlich · still',
      camera: { distance: 30, height: 0.62, fov: 36, drift: 0.9 },
      scene: {
        background: 0x110d1b, fog: 0x282037, fogDensity: 0.008, stone: 0x51445a, trim: 0xc7a96a,
        accent: 0xb591ed, glass: 0x654b91, floor: 0x211b2a, wood: 0x3b2930, seat: 0x593d58,
        keyLight: 0xffd8a0, fillLight: 0x9d85d2, tableShape: 12, floorPattern: 'radial',
        particles: 'dust', particleTint: 0xe7c987
      },
      ui: { accent: '#b591ed', glow: '#e7c987', deep: '#110d1b', surface: 'radial' }
    },
    {
      id: 'druid', world: 'cathedral', architecture: 'grove',
      label: 'Hain der Wurzelchronik',
      tagline: 'Ein lebender Baumkreis aus Wurzeln und Samenlicht',
      description: 'Ein uralter Baumkreis: verwachsene Wurzeln, Moossteine, schwebende Samen und ein lebender Holzaltar.',
      mood: 'Wachsend · uralt · atmend',
      camera: { distance: 31, height: 0.58, fov: 37, drift: 1.1 },
      scene: {
        background: 0x071410, fog: 0x18392b, fogDensity: 0.012, stone: 0x344c3a, trim: 0xb1a36b,
        accent: 0x70ce91, glass: 0x38865d, floor: 0x17291d, wood: 0x493923, seat: 0x38533b,
        keyLight: 0xb7e8a0, fillLight: 0x5abf9d, tableShape: 14, floorPattern: 'moss',
        particles: 'spores', particleTint: 0xc9e88e
      },
      ui: { accent: '#70ce91', glow: '#c9e88e', deep: '#071410', surface: 'moss' }
    },
    {
      id: 'mountain', world: 'orbit', architecture: 'peak',
      label: 'Observatorium am Himmelsgrat',
      tagline: 'Offene Sternwarte über einem Meer aus Gipfeln',
      description: 'Eine offene Sternwarte auf einem schneebedeckten Grat mit Armillarsphäre, Fernrohr und fernen Gipfeln.',
      mood: 'Weit · klar · kalt',
      camera: { distance: 33, height: 0.66, fov: 38, drift: 1.4 },
      scene: {
        background: 0x0a1726, fog: 0x263b53, fogDensity: 0.006, stone: 0x596b7c, trim: 0xa8d2e3,
        accent: 0x8dc8ef, glass: 0x47748e, floor: 0x263442, wood: 0x493e34, seat: 0x34495c,
        keyLight: 0xc6eaff, fillLight: 0x829dd4, tableShape: 10, floorPattern: 'star',
        particles: 'snow', particleTint: 0xd9f2ff
      },
      ui: { accent: '#8dc8ef', glow: '#d9f2ff', deep: '#0a1726', surface: 'star' }
    },
    {
      id: 'library', world: 'cathedral', architecture: 'library',
      label: 'Bibliothek der Nachtflügel',
      tagline: 'Gotische Wissenshalle mit schwebenden Laternen',
      description: 'Eine gotische Wissenshalle mit mehrstöckigen Galerien, dicht gefüllten Eichenregalen und einer Rosette aus Glas.',
      mood: 'Gelehrt · verschachtelt · warm',
      camera: { distance: 29, height: 0.6, fov: 36, drift: 0.8 },
      scene: {
        background: 0x17101b, fog: 0x30263a, fogDensity: 0.007, stone: 0x554650, trim: 0xd1ac72,
        accent: 0xd19a55, glass: 0x597a9d, floor: 0x251b24, wood: 0x543a2a, seat: 0x593d32,
        keyLight: 0xffd49a, fillLight: 0x9b82ae, tableShape: 8, floorPattern: 'parquet',
        particles: 'dust', particleTint: 0xe2bc78
      },
      ui: { accent: '#d19a55', glow: '#e2bc78', deep: '#17101b', surface: 'parquet' }
    },
    {
      id: 'undersea', world: 'island', architecture: 'undersea',
      label: 'Abtei der Tiefenströmung',
      tagline: 'Versunkene Abtei im blauen Meereslicht',
      description: 'Eine versunkene Abtei aus Perlmutt und Korallen, durch deren Spitzbogenfenster blaues Meereslicht fällt.',
      mood: 'Schwerelos · tief · perlmuttern',
      camera: { distance: 30, height: 0.56, fov: 37, drift: 1.6 },
      scene: {
        background: 0x06202a, fog: 0x0e5260, fogDensity: 0.014, stone: 0x397078, trim: 0x91d9cb,
        accent: 0x68e0dc, glass: 0x347e9b, floor: 0x14343b, wood: 0x3a655f, seat: 0x315d63,
        keyLight: 0x9bf5ed, fillLight: 0x5eadd8, tableShape: 16, floorPattern: 'tide',
        particles: 'bubbles', particleTint: 0x97f4ec
      },
      ui: { accent: '#68e0dc', glow: '#97f4ec', deep: '#06202a', surface: 'tide' }
    },
    {
      id: 'desert', world: 'island', architecture: 'desert',
      label: 'Sonnenpalast der Glasdünen',
      tagline: 'Sandsteinhof mit Hufeisenarkaden und Wasserbecken',
      description: 'Ein warmer Hof aus Sandstein, Hufeisenarkaden, Sternmosaiken, Palmen und einem stillen Wasserbecken.',
      mood: 'Warm · sinnlich · golden',
      camera: { distance: 31, height: 0.6, fov: 37, drift: 0.7 },
      scene: {
        background: 0x28180f, fog: 0x70452b, fogDensity: 0.009, stone: 0x9d704a, trim: 0xe5bd75,
        accent: 0xf2a85d, glass: 0x3c8690, floor: 0x70513b, wood: 0x6e472b, seat: 0x835542,
        keyLight: 0xffdfa5, fillLight: 0xe79050, tableShape: 8, floorPattern: 'mosaic',
        particles: 'sand', particleTint: 0xffd69b
      },
      ui: { accent: '#f2a85d', glow: '#ffd69b', deep: '#28180f', surface: 'mosaic' }
    },
    {
      id: 'moon', world: 'island', architecture: 'moon',
      label: 'Mondkloster der stillen Gezeiten',
      tagline: 'Mondtor, Torii und ein spiegelnder Teich',
      description: 'Ein stiller Mondhof mit Torii, silbernem Mondtor, spiegelndem Wasser und sorgfältig geharktem Kies.',
      mood: 'Still · silbern · meditativ',
      camera: { distance: 30, height: 0.58, fov: 36, drift: 0.6 },
      scene: {
        background: 0x0a1020, fog: 0x202b4a, fogDensity: 0.006, stone: 0x505a70, trim: 0xc3d1e6,
        accent: 0x9eb7ed, glass: 0x768fba, floor: 0x252c3b, wood: 0x433c39, seat: 0x35405b,
        keyLight: 0xd5e3ff, fillLight: 0x778cce, tableShape: 12, floorPattern: 'zen',
        particles: 'moonlight', particleTint: 0xe0e7ff
      },
      ui: { accent: '#9eb7ed', glow: '#e0e7ff', deep: '#0a1020', surface: 'zen' }
    },
    {
      id: 'forge', world: 'cathedral', architecture: 'forge',
      label: 'Schmiede des Phönix',
      tagline: 'Basaltgewölbe mit Glutofen und Lavaadern',
      description: 'Eine unterirdische Schmiede aus Basalt und Eisen, durchzogen von Lavaadern und beherrscht von einem Glutofen.',
      mood: 'Glühend · roh · laut',
      camera: { distance: 29, height: 0.55, fov: 38, drift: 1.2 },
      scene: {
        background: 0x190b0a, fog: 0x592219, fogDensity: 0.011, stone: 0x493436, trim: 0xb98453,
        accent: 0xff653c, glass: 0xee4c2e, floor: 0x241819, wood: 0x3a2521, seat: 0x563329,
        keyLight: 0xffa05b, fillLight: 0xa13c32, tableShape: 10, floorPattern: 'lava',
        particles: 'embers', particleTint: 0xffa052
      },
      ui: { accent: '#ff653c', glow: '#ffa052', deep: '#190b0a', surface: 'lava' }
    },
    {
      id: 'ice', world: 'orbit', architecture: 'ice',
      label: 'Kristallhalle des Nordlichts',
      tagline: 'Eiskathedrale unter tanzendem Polarlicht',
      description: 'Eine Kathedrale aus Gletschereis mit prismatischen Pfeilern, gläsernen Spitzbögen und tanzendem Nordlicht.',
      mood: 'Klar · schimmernd · weit',
      camera: { distance: 32, height: 0.64, fov: 37, drift: 1.5 },
      scene: {
        background: 0x09172b, fog: 0x263f62, fogDensity: 0.008, stone: 0x5f89a1, trim: 0xc1eaff,
        accent: 0x7cdcf1, glass: 0x80c8eb, floor: 0x1c3047, wood: 0x37495c, seat: 0x32536c,
        keyLight: 0xc4f2ff, fillLight: 0x8b91e1, tableShape: 8, floorPattern: 'ice',
        particles: 'snow', particleTint: 0xbdeaff
      },
      ui: { accent: '#7cdcf1', glow: '#bdeaff', deep: '#09172b', surface: 'ice' }
    },
    {
      id: 'sky', world: 'orbit', architecture: 'sky',
      label: 'Hängende Gärten der Äonen',
      tagline: 'Schwebende Terrassen über einem Wolkenmeer',
      description: 'Ein offenes Himmelsheiligtum auf schwebenden Inseln, verbunden durch Brücken, Pergolen und Wasserfälle aus Licht.',
      mood: 'Luftig · heiter · erhaben',
      camera: { distance: 34, height: 0.68, fov: 39, drift: 1.8 },
      scene: {
        background: 0x13223b, fog: 0x5b7a9b, fogDensity: 0.006, stone: 0x728b8d, trim: 0xe3c77b,
        accent: 0x91d8dc, glass: 0x94cde4, floor: 0x344f51, wood: 0x67533a, seat: 0x48645e,
        keyLight: 0xffe0a1, fillLight: 0x86c4e4, tableShape: 12, floorPattern: 'garden',
        particles: 'pollen', particleTint: 0xfff0b0
      },
      ui: { accent: '#91d8dc', glow: '#fff0b0', deep: '#13223b', surface: 'garden' }
    }
  ];

  const ROOM_BY_ID = {};
  ROOMS.forEach(room => { ROOM_BY_ID[room.id] = room; });

  /* ---------------------------------------------------------------- */
  /* Drei begehbare Welten                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Eine Welt ist die **Hülle** um die Ritualbühne: Kuppel, schwebende
   * Inseln oder Orbit. Sie liefert Himmelsfarbe, Horizont, Sternenfeld
   * und die Kamerafahrt. Die Orte (`ROOMS[].world`) wählen ihre Welt.
   */
  const WORLDS = [
    {
      id: 'cathedral', label: 'Sternendom', icon: 'dome',
      tagline: 'Gewölbe, Arkaden und ein Fenster voller Sterne',
      description: 'Die Bühne liegt im Langhaus eines gotischen Sternendoms: Rippengewölbe, Strebepfeiler und ein Rosettenfenster, durch das Nachtlicht fällt.',
      sky: 0x0c0918, horizon: 0x2a2140, starDensity: 1200, aurora: false, cloudSea: false,
      cameraPath: { tilt: 0.06, sway: 0.05, orbit: 12 }
    },
    {
      id: 'island', label: 'Schwebeinseln', icon: 'isles',
      tagline: 'Terrassen im Himmel über einem Meer aus Wolken',
      description: 'Rund um den Ritualtisch schweben Felseninseln mit Terrassen, Brücken und Wasserfällen; darunter rollt ein Wolkenmeer.',
      sky: 0x101a2c, horizon: 0x46607d, starDensity: 700, aurora: false, cloudSea: true,
      cameraPath: { tilt: 0.11, sway: 0.09, orbit: 22 }
    },
    {
      id: 'orbit', label: 'Sternenorbit', icon: 'orbit',
      tagline: 'Offener Kosmos mit Asteroidenring und Polarlichtern',
      description: 'Die Bühne treibt frei im All: ein ferner Ring aus Staub und Asteroiden, wandernde Polarlichter und ein sehr tiefer, klarer Sternenhimmel.',
      sky: 0x050711, horizon: 0x1b2740, starDensity: 2200, aurora: true, cloudSea: false,
      cameraPath: { tilt: 0.16, sway: 0.12, orbit: 30 }
    }
  ];

  const WORLD_BY_ID = {};
  WORLDS.forEach(world => { WORLD_BY_ID[world.id] = world; });

  /* ---------------------------------------------------------------- */
  /* Avatar-Identitäten                                                */
  /* ---------------------------------------------------------------- */

  /**
   * Jeder Avatar hat eine erkennbare Silhouette: Hautton, Haar, Robe,
   * Metall, Kopfbedeckung (`headwear`) und ein Sigill, das im Porträt
   * und auf dem 3D-Kreis über dem Haupt erscheint.
   * `headwear`: crown | hood | circlet | veil | helm | laurel | horns | none
   */
  const AVATARS = [
    {
      id: 'adept', label: 'Adept', title: 'Hüter:in der Schwelle',
      sigil: 'eye', headwear: 'circlet', skin: 0xe8b890, hair: 0x2c1d20,
      robe: 0xc6a258, robeDeep: 0x6a4c22, trim: 0xffe194, accent: 0xb591ed,
      ui: { skin: '#e8b890', hair: '#2c1d20', robe: '#c6a258', robeDeep: '#6a4c22', trim: '#ffe194', accent: '#b591ed', glow: '#b591ed' }
    },
    {
      id: 'oracle', label: 'Orakel', title: 'Stimme der Gezeiten',
      sigil: 'moon', headwear: 'veil', skin: 0xd9a37c, hair: 0x141826,
      robe: 0x667fa4, robeDeep: 0x2b3a58, trim: 0xbfe1ff, accent: 0x8dc8ef,
      ui: { skin: '#d9a37c', hair: '#141826', robe: '#667fa4', robeDeep: '#2b3a58', trim: '#bfe1ff', accent: '#8dc8ef', glow: '#8dc8ef' }
    },
    {
      id: 'warden', label: 'Wächter', title: 'Schild der stillen Halle',
      sigil: 'sword', headwear: 'helm', skin: 0x8b563d, hair: 0x1a1410,
      robe: 0x916b9b, robeDeep: 0x452b4c, trim: 0xe9d3ff, accent: 0xd19ae8,
      ui: { skin: '#8b563d', hair: '#1a1410', robe: '#916b9b', robeDeep: '#452b4c', trim: '#e9d3ff', accent: '#d19ae8', glow: '#d19ae8' }
    },
    {
      id: 'hermit', label: 'Eremit', title: 'Laterne im Nebel',
      sigil: 'lantern', headwear: 'hood', skin: 0x6c4637, hair: 0x4a4a4a,
      robe: 0x4f866f, robeDeep: 0x254437, trim: 0xc9f0d8, accent: 0x70ce91,
      ui: { skin: '#6c4637', hair: '#4a4a4a', robe: '#4f866f', robeDeep: '#254437', trim: '#c9f0d8', accent: '#70ce91', glow: '#70ce91' }
    },
    {
      id: 'empress', label: 'Herrscherin', title: 'Garten des Überflusses',
      sigil: 'rose', headwear: 'laurel', skin: 0xf0c9a5, hair: 0xb68a42,
      robe: 0xa86054, robeDeep: 0x5a2b26, trim: 0xffd7b0, accent: 0xf2a85d,
      ui: { skin: '#f0c9a5', hair: '#b68a42', robe: '#a86054', robeDeep: '#5a2b26', trim: '#ffd7b0', accent: '#f2a85d', glow: '#f2a85d' }
    },
    {
      id: 'pilgrim', label: 'Pilger', title: 'Weg ohne Karte',
      sigil: 'star', headwear: 'none', skin: 0xb87857, hair: 0x231713,
      robe: 0x638c94, robeDeep: 0x2c464c, trim: 0xd7f3f7, accent: 0x68e0dc,
      ui: { skin: '#b87857', hair: '#231713', robe: '#638c94', robeDeep: '#2c464c', trim: '#d7f3f7', accent: '#68e0dc', glow: '#68e0dc' }
    },
    {
      id: 'sibyl', label: 'Sibylle', title: 'Rauch und Weissagung',
      sigil: 'flame', headwear: 'veil', skin: 0xd59871, hair: 0x5a2f1d,
      robe: 0x7a5c93, robeDeep: 0x3b2b4a, trim: 0xf0dcff, accent: 0xc9a1ff,
      ui: { skin: '#d59871', hair: '#5a2f1d', robe: '#7a5c93', robeDeep: '#3b2b4a', trim: '#f0dcff', accent: '#c9a1ff', glow: '#c9a1ff' }
    },
    {
      id: 'smith', label: 'Schmied', title: 'Funke und Amboss',
      sigil: 'anvil', headwear: 'crown', skin: 0x9a6647, hair: 0x1c1210,
      robe: 0x8a4a3a, robeDeep: 0x4a2018, trim: 0xffb37a, accent: 0xff653c,
      ui: { skin: '#9a6647', hair: '#1c1210', robe: '#8a4a3a', robeDeep: '#4a2018', trim: '#ffb37a', accent: '#ff653c', glow: '#ff653c' }
    },
    {
      id: 'frost', label: 'Frosthüter', title: 'Atem des Nordlichts',
      sigil: 'crystal', headwear: 'circlet', skin: 0xe4c3b0, hair: 0xdfe9f5,
      robe: 0x5f89a1, robeDeep: 0x263f62, trim: 0xd8f6ff, accent: 0x7cdcf1,
      ui: { skin: '#e4c3b0', hair: '#dfe9f5', robe: '#5f89a1', robeDeep: '#263f62', trim: '#d8f6ff', accent: '#7cdcf1', glow: '#7cdcf1' }
    },
    {
      id: 'dreamer', label: 'Träumer', title: 'Wolkenläufer:in',
      sigil: 'wing', headwear: 'laurel', skin: 0xc98f6a, hair: 0x4c263d,
      robe: 0x6f8f7a, robeDeep: 0x2f4a3d, trim: 0xfff0b0, accent: 0x91d8dc,
      ui: { skin: '#c98f6a', hair: '#4c263d', robe: '#6f8f7a', robeDeep: '#2f4a3d', trim: '#fff0b0', accent: '#91d8dc', glow: '#91d8dc' }
    },
    {
      id: 'judge', label: 'Richterin', title: 'Waage ohne Zorn',
      sigil: 'scales', headwear: 'crown', skin: 0xb07d5c, hair: 0x2b1b1b,
      robe: 0x54607f, robeDeep: 0x232c40, trim: 0xd9e4ff, accent: 0x9eb7ed,
      ui: { skin: '#b07d5c', hair: '#2b1b1b', robe: '#54607f', robeDeep: '#232c40', trim: '#d9e4ff', accent: '#9eb7ed', glow: '#9eb7ed' }
    },
    {
      id: 'alchemist', label: 'Alchemistin', title: 'Transmutation',
      sigil: 'pentacle', headwear: 'hood', skin: 0xdda882, hair: 0x6b3a1e,
      robe: 0x8c7a4e, robeDeep: 0x3f3720, trim: 0xffe8a8, accent: 0xe8c46a,
      ui: { skin: '#dda882', hair: '#6b3a1e', robe: '#8c7a4e', robeDeep: '#3f3720', trim: '#ffe8a8', accent: '#e8c46a', glow: '#e8c46a' }
    }
  ];

  const AVATAR_BY_ID = {};
  AVATARS.forEach(avatar => { AVATAR_BY_ID[avatar.id] = avatar; });

  /**
   * Wählt eine Avatar-Identität für einen Sitzplatz. Der Mensch sitzt
   * auf Platz 0 und behält seinen Avatar; Bots bekommen deterministisch
   * einen eigenen, damit sie über Partien hinweg erkennbar bleiben.
   */
  function avatarForPlayer(index, isBot) {
    const seat = Math.max(0, Math.floor(Number(index) || 0));
    if (!isBot) return AVATAR_BY_ID[seat === 0 ? 'adept' : 'pilgrim'] || AVATARS[0];
    const bots = AVATARS.filter(avatar => avatar.id !== 'adept');
    return bots[(seat - 1 + bots.length) % bots.length];
  }

  /* ---------------------------------------------------------------- */
  /* Hover-Hinweise: Kurzbeschreibung + Funktion                       */
  /* ---------------------------------------------------------------- */

  /**
   * Jedes interaktive Element der Oberfläche trägt
   * `data-hint="<schlüssel>"`. Die Hinweise sind hier zentral
   * gepflegt (Kurzbeschreibung + konkrete Funktion) und werden von
   * `js/app.js` als Karte am Zeiger eingeblendet.
   */
  const HOVER_HINTS = {
    'mode-turbo': { title: 'Regelwerk · Turbo', short: 'Fünf schnelle Runden, reine Zahlenhierarchie.', action: 'Schaltet auf Turbo und gibt ein frisches Ritual mit 5 Runden aus.' },
    'mode-standard': { title: 'Regelwerk · Standard', short: 'Sieben Runden mit Weltgesetzen und Hofkarten-Segen.', action: 'Schaltet auf Standard und gibt ein frisches Ritual mit 7 Runden aus.' },
    'env-select': { title: 'Ort der Begegnung', short: 'Zehn Ritualorte, jeder mit eigener Architektur.', action: 'Wechselt die 3D-Bühne; Materialien, Licht und Atmosphäre folgen dem Ort.' },
    'player-count': { title: 'Spielende', short: 'Zwei bis sechs Sitze am Ritualtisch.', action: 'Bestimmt, wie viele Bots beim nächsten Ritual mitspielen.' },
    'start-ritual': { title: 'Ritual starten', short: 'Beginnt ein neues Spiel mit den gewählten Parametern.', action: 'Mischt das 78-Karten-Deck, setzt Karma zurück und öffnet die Vision.' },
    'restart': { title: 'Neu geben', short: 'Gleiche Einstellungen, neue Karten.', action: 'Verwirft den aktuellen Verlauf und startet sofort ein frisches Ritual.' },
    'round-tile': { title: 'Emanation (Runde)', short: 'Aktuelle Runde und Kartenzahl je Hand.', action: 'Zeigt den Fortschritt der Partie; der Balken füllt sich bis zur letzten Runde.' },
    'oracle-tile': { title: 'Weltgesetz', short: 'Das Orakel, das diese Runde regiert.', action: 'Ändert Rangordnung oder Wertung – nur im Standard-Regelwerk.' },
    'mode-tile': { title: 'Regelwerk', short: 'Aktiver Modus mit Runden- und Wertungsart.', action: 'Umschalten über die Knöpfe oben im Kopf der Arena.' },
    'phase': { title: 'Phase', short: 'Was gerade am Tisch passiert.', action: 'Vision → Stiche → Auswertung, Runde für Runde.' },
    'karma': { title: 'Dein Karma', short: 'Summe aller Rundenpunkte.', action: 'Wächst bei exakter Vision und schrumpft bei Abweichungen.' },
    'bid': { title: 'Vision', short: 'Angesagte Stiche dieser Runde.', action: 'Muss exakt getroffen werden, sonst kostet die Abweichung Karma.' },
    'won': { title: 'Stiche', short: 'Tatsächlich gewonnene Stiche.', action: 'Verglichen mit der Vision ergibt sich die Rundenwertung.' },
    'hand-count': { title: 'Hand', short: 'Karten, die du noch auf der Hand hast.', action: 'Sinkt mit jedem Zug; bei null endet die Runde.' },
    'opponents': { title: 'Gegner', short: 'Bots mit Vision und aktuellem Stichstand.', action: 'Der goldene Rahmen markiert den Bot, der gerade am Zug ist.' },
    'tally': { title: 'Stichbilanz', short: 'Stiche im Verhältnis zur Vision.', action: 'Der Balken füllt sich bis zur Vision; Werte darüber werden golden.' },
    'stage': { title: 'Ritualbühne', short: 'Vollständig gerenderte 3D-Welt mit Tisch und Figuren.', action: 'Ziehen dreht die Kamera; ein Klick setzt sie zurück. Freie Sicht ohne Spielzug.' },
    'world-switch': { title: 'Welt', short: 'Hülle um die Bühne: Sternendom, Schwebeinseln, Orbit.', action: 'Wechselt Himmel, Horizont und Kamerafahrt der aktuellen Bühne.' },
    'camera-reset': { title: 'Kamera', short: 'Setzt die Perspektive zurück.', action: 'Zentriert die Bühne wieder auf den Ritualtisch.' },
    'trick': { title: 'Aktueller Stich', short: 'Alle Karten dieses Stichs.', action: 'Der höchste Trumpf oder die höchste Farbe gewinnt.' },
    'hand': { title: 'Deine Hand', short: 'Sortiert: Trümpfe, dann Farben absteigend.', action: 'Klick oder Enter spielt die Karte; nicht bedienbare Karten bleiben gesperrt.' },
    'bid-button': { title: 'Vision ansagen', short: 'Wähle genau die Zahl der Stiche, die du holst.', action: 'Setzt dein Gebot und startet die Stichphase.' },
    'log': { title: 'Chronik', short: 'Jedes Ereignis der Partie.', action: 'Scrollt mit; die letzten Einträge stehen unten.' },
    'summary': { title: 'Rundenbilanz', short: 'Punktedelta und Begründung je Spieler:in.', action: 'Erscheint nach jeder ausgewerteten Runde.' },
    'codex-card': { title: 'Kartenkodex', short: 'Motiv, Symbolik und Effekt einer Karte.', action: 'Öffnet den Detaildialog; Escape schließt ihn wieder.' },
    'chart': { title: 'Stochastik', short: 'Chance auf Trümpfe nach Handkartenzahl.', action: 'Hypergeometrisch berechnet aus dem echten 78-Karten-Deck.' },
    'calc': { title: 'Wertungsrechner', short: 'Karma aus Vision und Stichen.', action: 'Nutzt dieselbe Formel wie die Partie, inklusive Orakel und Hofkarten.' },
    'nav': { title: 'Navigation', short: 'Sprungmarken der Seite.', action: 'Springt weich zum gewählten Abschnitt.' }
  };

  /**
   * Erzeugt den Hinweis eines Ritualorts (Kurzbeschreibung + Wirkung
   * der Ortsauswahl). Die Orte sind keine statischen Schlüssel,
   * sondern werden aus dem Manifest abgeleitet.
   */
  function roomHint(id) {
    const room = ROOM_BY_ID[id];
    if (!room) return null;
    const world = WORLD_BY_ID[room.world];
    return {
      title: room.label,
      short: `${room.mood} · ${room.tagline}`,
      action: `Wechselt die Bühne in diese Umgebung${world ? ` (${world.label})` : ''}; Architektur, Licht und Materialien folgen dem Ort.`
    };
  }

  /**
   * Hinweis für eine Spielkarte: Kurzbeschreibung aus dem Effekttext
   * und die konkrete Funktion im Stich.
   */
  function cardHint(card, effect) {
    if (!card) return null;
    const value = card.isTrump ? `Große Arkana ${card.numeral}` : `${card.rankName} der ${card.suit}`;
    return {
      title: card.shortName || card.name,
      short: effect ? effect.short : card.desc || `${value} · Rangwert ${card.rank === 1 ? '14,5' : card.rank}`,
      action: effect
        ? (effect.type === 'orakel'
          ? 'Orakel: verändert als Weltgesetz die ganze Runde.'
          : 'Schicksalskarte: wirkt beim Auswerten eines Stichs.')
        : (card.court
          ? `Hofkarte: zahlt +${card.courtKarma} Karma, wenn ihr Stich gewonnen wird.`
          : 'Reine Zahlenkarte: zählt nur über ihren Rang im Stich.')
    };
  }

  /**
   * Liefert den Hinweis zu einem Schlüssel. Unbekannte Schlüssel
   * liefern einen neutralen Hinweis, damit die Oberfläche nie ohne
   * Beschriftung dasteht.
   */
  function hoverHint(key) {
    if (!key) return null;
    return HOVER_HINTS[key] || {
      title: String(key),
      short: 'Bereich der Arcanum-Oberfläche.',
      action: 'Interaktion nach Bedarf.'
    };
  }

  /** CSS-Farbwerte eines Ortes – für Verläufe außerhalb von WebGL. */
  function roomPalette(id) {
    const room = ROOM_BY_ID[id] || ROOMS[0];
    return room.ui;
  }

  /** Raumliste ohne WebGL-Parameter – direkt an die Oberfläche gebbar. */
  function roomOptions() {
    return ROOMS.map(room => ({ id: room.id, label: room.label, tagline: room.tagline, mood: room.mood, world: room.world }));
  }

  global.ArcanumWorlds = Object.freeze({
    ROOMS,
    ROOM_BY_ID,
    WORLDS,
    WORLD_BY_ID,
    AVATARS,
    AVATAR_BY_ID,
    HOVER_HINTS,
    avatarForPlayer,
    hoverHint,
    roomHint,
    cardHint,
    roomPalette,
    roomOptions
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
