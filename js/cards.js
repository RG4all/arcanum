/**
 * Arcanum · Kartendatenbank (78 Karten)
 * -------------------------------------------------------------
 * Diese Datei ist die einzige Datenquelle für Karten, Kodex-Gruppen
 * und Spezialeffekte. Sie ist DOM-frei und damit in Node testbar.
 *
 * Aufbau:
 *   MAJOR_ARCANA  – 22 Große Arkana mit Symbolik, Bedeutung und Effekt
 *   SUITS         – vier Farben mit Element, Symbol und Farbschlüssel
 *   RANKS         – 14 Ränge je Farbe inklusive der vier Hofkarten
 *   EFFECTS       – Register aller regelrelevanten Effekte (uid-basiert)
 *   TAROT_DECK    – vollständiges, sortiertes Deck (22 + 56 Karten)
 *
 * Jede Deckkarte besitzt:
 *   uid        eindeutige Kennung, z. B. 'major-0' oder 'minor-Kelche-1'
 *   name       deutscher Kartenname
 *   icon       Symbolschlüssel (kein Emoji, siehe js/card-art.js)
 *   value      Vergleichswert (Ass = 14,5 · Große Arkana = 100 + Nummer)
 *   isTrump    true für Große Arkana
 *   suit       Farbe der Kleinen Arkana
 *   rank       1–14 (11 Bube, 12 Ritter, 13 Königin, 14 König)
 *   court      'page' | 'knight' | 'queen' | 'king' bei Hofkarten
 *   palette    Farbschlüssel für die Kartenkunst
 *   art        Motivschlüssel für die Kartenkunst
 */
(function (global) {
  'use strict';

  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

  /** Römische Ziffern für die Großen Arkana (0–XXI). */
  function romanNumeral(number) {
    return ROMAN[number] || String(number);
  }

  /**
   * Symbolik der 22 Großen Arkana.
   * `effect` verweist auf einen Schlüssel in EFFECTS (null = reine Zahlenkarte).
   */
  const MAJOR_ARCANA = [
    {
      num: 0, name: 'Der Narr', english: 'The Fool', icon: 'fool', art: 'fool', palette: 'aether',
      keywords: ['Aufbruch', 'Vertrauen', 'Sprung ins Unbekannte'],
      upright: 'Der Narr wandert an der Klippe: Wer sich ohne Ballast auf den Weg macht, gewinnt neue Horizonte.',
      effect: 'fool'
    },
    {
      num: 1, name: 'Der Magier', english: 'The Magician', icon: 'magician', art: 'magician', palette: 'aether',
      keywords: ['Wille', 'Manifestation', 'Anpassung'],
      upright: 'Der Magier verbindet Himmel und Erde. Sein Wert richtet sich nach dem Höchsten, das der Stich bereits trägt.',
      effect: 'magician'
    },
    {
      num: 2, name: 'Die Hohepriesterin', english: 'The High Priestess', icon: 'priestess', art: 'priestess', palette: 'lunar',
      keywords: ['Intuition', 'Geheimnis', 'Korrektur'],
      upright: 'Zwischen den Säulen bewahrt sie das verborgene Wissen und reicht dem Sieger die Kraft der Korrektur.',
      effect: 'priestess'
    },
    {
      num: 3, name: 'Die Herrscherin', english: 'The Empress', icon: 'empress', art: 'empress', palette: 'verdant',
      keywords: ['Fülle', 'Wachstum', 'Wasser'],
      upright: 'Die Herrscherin nährt den Garten: Kelche steigen in dieser Runde als niedere Trümpfe auf.',
      effect: 'empress'
    },
    {
      num: 4, name: 'Der Herrscher', english: 'The Emperor', icon: 'emperor', art: 'emperor', palette: 'solar',
      keywords: ['Ordnung', 'Freiheit', 'Gesetz'],
      upright: 'Der Herrscher öffnet die Tore. In dieser Runde entfällt jede Bedienpflicht.',
      effect: 'emperor'
    },
    {
      num: 5, name: 'Der Hierophant', english: 'The Hierophant', icon: 'hierophant', art: 'hierophant', palette: 'aether',
      keywords: ['Lehre', 'Stille', 'Annullation'],
      upright: 'Der Hierophant siegelt den Stich: Karteneffekte schweigen, allein die reinen Werte sprechen.',
      effect: 'hierophant'
    },
    {
      num: 6, name: 'Die Liebenden', english: 'The Lovers', icon: 'lovers', art: 'lovers', palette: 'verdant',
      keywords: ['Bund', 'Partnerschaft', 'Zweisamkeit'],
      upright: 'Die Liebenden teilen das Los: Benachbarte Sitze bilden Paare und teilen jeden Stich.',
      effect: 'lovers'
    },
    {
      num: 7, name: 'Der Wagen', english: 'The Chariot', icon: 'chariot', art: 'chariot', palette: 'solar',
      keywords: ['Eroberung', 'Führung', 'Tempo'],
      upright: 'Wer den Wagen lenkt, eröffnet den nächsten Stich – der Zuschlag für jede gewonnene Fahrt.',
      effect: 'chariot'
    },
    {
      num: 8, name: 'Die Gerechtigkeit', english: 'Justice', icon: 'justice', art: 'justice', palette: 'aether',
      keywords: ['Ausgleich', 'Wahrheit', 'Karma'],
      upright: 'Gerechtigkeit wiegt auf: Alle anderen Spieler erhalten sofort fünf Karma, selbst im zerstörten Stich.',
      effect: 'justice'
    },
    {
      num: 9, name: 'Der Eremit', english: 'The Hermit', icon: 'hermit', art: 'hermit', palette: 'lunar',
      keywords: ['Innenschau', 'Geduld', 'Laterne'],
      upright: 'Der Eremit trägt sein Licht allein. Als reine Zahlenkarte sticht er mit XXI–IX über alle Trümpfe unter IX.',
      effect: null
    },
    {
      num: 10, name: 'Das Rad des Schicksals', english: 'Wheel of Fortune', icon: 'wheel', art: 'wheel', palette: 'solar',
      keywords: ['Wende', 'Umkehr', 'Hierarchie'],
      upright: 'Das Rad kehrt die Welt: Die Kleinen Arkana stehen über den Großen, und selbst die Zwei wird zur Krone.',
      effect: 'wheel'
    },
    {
      num: 11, name: 'Die Kraft', english: 'Strength', icon: 'strength', art: 'strength', palette: 'solar',
      keywords: ['Mut', 'Zähmung', 'Verzicht'],
      upright: 'Die Kraft bezwingt den Löwen, doch der Sieger gelobt: Im nächsten Stich kein Trumpf, solange eine Farbe bleibt.',
      effect: 'strength'
    },
    {
      num: 12, name: 'Der Gehängte', english: 'The Hanged Man', icon: 'hanged', art: 'hanged', palette: 'lunar',
      keywords: ['Perspektive', 'Opfer', 'Pause'],
      upright: 'Der Gehängte hält inne. Er trägt keinen Sonderzug – sein Wert entscheidet wie bei jedem Trumpf.',
      effect: null
    },
    {
      num: 13, name: 'Der Tod', english: 'Death', icon: 'death', art: 'death', palette: 'infernal',
      keywords: ['Übergang', 'Schnitt', 'Halbierung'],
      upright: 'Der Tod nimmt die Hälfte: Dem rechnerischen Sieger bleibt ein halber Stich. Der Turm hat Vorrang.',
      effect: 'death'
    },
    {
      num: 14, name: 'Die Mäßigkeit', english: 'Temperance', icon: 'temperance', art: 'temperance', palette: 'lunar',
      keywords: ['Balance', 'Mischung', 'Geduld'],
      upright: 'Mäßigkeit mischt die Ströme, ohne die Ordnung zu stören: eine reine Zahlenkarte zwischen XIII und XV.',
      effect: null
    },
    {
      num: 15, name: 'Der Teufel', english: 'The Devil', icon: 'devil', art: 'devil', palette: 'infernal',
      keywords: ['Zwang', 'Kette', 'Versuchung'],
      upright: 'Der Teufel legt Ketten: Der nächste Spieler im selben Stich muss seine höchste zulässige Karte legen.',
      effect: 'devil'
    },
    {
      num: 16, name: 'Der Turm', english: 'The Tower', icon: 'tower', art: 'tower', palette: 'infernal',
      keywords: ['Einsturz', 'Zerstörung', 'Befreiung'],
      upright: 'Der Turm zerbricht den Stich: Alle Karten wandern in den Limbus, niemand erhält den Stich.',
      effect: 'tower'
    },
    {
      num: 17, name: 'Der Stern', english: 'The Star', icon: 'star', art: 'star', palette: 'lunar',
      keywords: ['Hoffnung', 'Segen', 'Präzision'],
      upright: 'Der Stern belohnt die genaue Vorhersage: Ein exaktes, nicht-null Gebot erhält in dieser Runde +30 Karma.',
      effect: 'star'
    },
    {
      num: 18, name: 'Der Mond', english: 'The Moon', icon: 'moon', art: 'moon', palette: 'lunar',
      keywords: ['Schleier', 'Täuschung', 'Enthüllung'],
      upright: 'Der Mond bleibt verdeckt, bis der Stich vollständig liegt. Erst dann wird sein Wert offenbar.',
      effect: 'moon'
    },
    {
      num: 19, name: 'Die Sonne', english: 'The Sun', icon: 'sun', art: 'sun', palette: 'solar',
      keywords: ['Klarheit', 'Sieg', 'Wärme'],
      upright: 'Die Sonne scheint ohne Bedingung: höchster reiner Trumpf vor dem Gericht, ohne Sonderregel.',
      effect: null
    },
    {
      num: 20, name: 'Das Gericht', english: 'Judgement', icon: 'judgement', art: 'judgement', palette: 'solar',
      keywords: ['Erwachen', 'Ruf', 'Wiederkehr'],
      upright: 'Das Gericht ruft die Ruhenden: ein reiner Trumpf zwischen XIX und XXI, der keine Mechanik beugt.',
      effect: null
    },
    {
      num: 21, name: 'Die Welt', english: 'The World', icon: 'world', art: 'world', palette: 'solar',
      keywords: ['Vollendung', 'Krone', 'Trumpf aller Trümpfe'],
      upright: 'Die Welt ist der höchste Trumpf – nur der Narr, der unmittelbar nach ihr fällt, entthront sie.',
      effect: 'world'
    }
  ];

  /** Die vier Farben der Kleinen Arkana. */
  const SUITS = [
    {
      key: 'wands', name: 'Stäbe', element: 'Feuer', art: 'wand', palette: 'wands',
      keyword: 'Wille, Tatkraft und Entfachung', atu: 'Frühling'
    },
    {
      key: 'cups', name: 'Kelche', element: 'Wasser', art: 'cup', palette: 'cups',
      keyword: 'Gefühl, Hingabe und Strömung', atu: 'Sommer'
    },
    {
      key: 'swords', name: 'Schwerter', element: 'Luft', art: 'sword', palette: 'swords',
      keyword: 'Gedanke, Klarheit und Schnitt', atu: 'Herbst'
    },
    {
      key: 'pentacles', name: 'Münzen', element: 'Erde', art: 'pentacle', palette: 'pentacles',
      keyword: 'Gestalt, Werk und Bestand', atu: 'Winter'
    }
  ];

  /**
   * Ränge 1–14. Hofkarten (11–14) tragen den „Hofkarten-Segen“:
   * gesammelte Hofkarten zahlen im Standard Karma nach Rang aus.
   */
  const RANKS = [
    { rank: 1, name: 'Ass', index: 'A', keywords: ['Ursprung', 'Geschenk', 'Same'] },
    { rank: 2, name: 'Zwei', index: '2', keywords: ['Gleichgewicht', 'Entscheidung', 'Paar'] },
    { rank: 3, name: 'Drei', index: '3', keywords: ['Wachstum', 'Zusammenkunft', 'erstes Werk'] },
    { rank: 4, name: 'Vier', index: '4', keywords: ['Fundament', 'Ruhe', 'Stabilität'] },
    { rank: 5, name: 'Fünf', index: '5', keywords: ['Wendung', 'Verlust', 'Unruhe'] },
    { rank: 6, name: 'Sechs', index: '6', keywords: ['Wiederkehr', 'Ausgleich', 'Gabe'] },
    { rank: 7, name: 'Sieben', index: '7', keywords: ['Prüfung', 'Täuschung', 'Wagnis'] },
    { rank: 8, name: 'Acht', index: '8', keywords: ['Bewegung', 'Wiederholung', 'Meisterschaft'] },
    { rank: 9, name: 'Neun', index: '9', keywords: ['Fülle', 'Nähe', 'Vollendung im Kleinen'] },
    { rank: 10, name: 'Zehn', index: '10', keywords: ['Abschluss', 'Erfüllung', 'Übergabe'] },
    { rank: 11, name: 'Bube', index: 'B', court: 'page', keywords: ['Bote', 'Neugier', 'erster Schritt'], karma: 1 },
    { rank: 12, name: 'Ritter', index: 'R', court: 'knight', keywords: ['Ritt', 'Entschlossenheit', 'Tempo'], karma: 2 },
    { rank: 13, name: 'Königin', index: 'D', court: 'queen', keywords: ['Herrschaft des Gefühls', 'Reife', 'Nährung'], karma: 3 },
    { rank: 14, name: 'König', index: 'K', court: 'king', keywords: ['Krönung', 'Verantwortung', 'Gesetz'], karma: 4 }
  ];

  const RANK_BY_NUMBER = {};
  const SUIT_BY_NAME = {};
  RANKS.forEach(rank => { RANK_BY_NUMBER[rank.rank] = rank; });
  SUITS.forEach(suit => { SUIT_BY_NAME[suit.name] = suit; });

  /* ---------------------------------------------------------------- */
  /* Effektregister                                                     */
  /* ---------------------------------------------------------------- */

  /**
   * Regelrelevante Effekte, indiziert nach Karten-uid.
   * `mode: 'both'` gilt in Turbo und Standard, `mode: 'standard'` nur im Kodex-Modus.
   * `type` steuert Filter und Darstellung im Kodex.
   */
  const EFFECT_LIST = [
    {
      uid: 'major-0', type: 'turbo', mode: 'both', title: 'Der Narr verliert',
      text: 'Verliert jeden Stich. Stiehlt den Stich nur, wenn er direkt nach der XXI (Die Welt) gespielt wird.',
      short: 'Verliert – außer direkt nach XXI.'
    },
    {
      uid: 'major-16', type: 'turbo', mode: 'both', title: 'Der Turm zerstört',
      text: 'Zerstört den Stich vollständig: Alle Karten wandern in den Limbus, niemand erhält den Stich.',
      short: 'Zerstört den ganzen Stich.'
    },
    {
      uid: 'major-21', type: 'turbo', mode: 'both', title: 'Die Welt krönt',
      text: 'Höchster Trumpf im Spiel und schlägt alle 77 anderen Karten – außer der Narr folgt unmittelbar danach.',
      short: 'Höchster Trumpf des Spiels.'
    },
    {
      uid: 'major-1', type: 'schicksal', mode: 'standard', title: 'Der Magier passt sich an',
      text: 'Zählt 0,5 höher als die höchste Kleine Arkana im Stich, unabhängig von deren Farbe; ohne Kleine Arkana Wert 0,5.',
      short: '+0,5 über der höchsten Kleinen Arkana.'
    },
    {
      uid: 'major-2', type: 'schicksal', mode: 'standard', title: 'Die Hohepriesterin korrigiert',
      text: 'Der rechnerische Sieger korrigiert sein Gebot sofort um genau eins. Menschen wählen, Bots erhöhen; an den Grenzen 0 und Kartenanzahl ist nur die Gegenrichtung möglich.',
      short: 'Sieger korrigiert Gebot um ±1.'
    },
    {
      uid: 'major-5', type: 'schicksal', mode: 'standard', title: 'Der Hierophant siegelt',
      text: 'Annulliert alle Karteneffekte bei der Stichwertung – Narr, Turm, Tod, Kraft, Magier, Gerechtigkeit und Hohepriesterin inklusive. Orakel bleiben aktiv.',
      short: 'Annulliert alle Karteneffekte im Stich.'
    },
    {
      uid: 'major-7', type: 'schicksal', mode: 'standard', title: 'Der Wagen führt',
      text: 'Der rechnerische Sieger eröffnet den nächsten Stich. Das entspricht der allgemeinen Eröffnungsregel, auch nach zerstörten Stichen.',
      short: 'Sieger eröffnet den nächsten Stich.'
    },
    {
      uid: 'major-8', type: 'schicksal', mode: 'standard', title: 'Gerechtigkeit wiegt auf',
      text: 'Alle anderen Spieler erhalten sofort je 5 Karma – auch dann, wenn der Turm den Stich zerstört.',
      short: 'Andere Spieler erhalten +5 Karma.'
    },
    {
      uid: 'major-11', type: 'schicksal', mode: 'standard', title: 'Kraft bezwingt',
      text: 'Gewinnt gegen alle anderen Karten. Ihr Spieler darf im nächsten Stich keinen Trumpf legen, solange eine andere Karte vorhanden ist.',
      short: 'Gewinnt; danach Trumpfverbot für einen Zug.'
    },
    {
      uid: 'major-13', type: 'schicksal', mode: 'standard', title: 'Der Tod halbiert',
      text: 'Der rechnerische Sieger erhält 0,5 statt 1 Stich. Der Turm hat Vorrang und verhindert auch den halben Stich.',
      short: 'Sieger erhält 0,5 Stiche.'
    },
    {
      uid: 'major-15', type: 'schicksal', mode: 'standard', title: 'Der Teufel zwingt',
      text: 'Der nächste Spieler im selben Stich muss seine höchste nach Bedienpflicht und Kraftverbot zulässige Karte legen. Als letzte Karte gespielt bleibt er wirkungslos.',
      short: 'Nächster Zug muss die höchste zulässige Karte sein.'
    },
    {
      uid: 'major-18', type: 'schicksal', mode: 'standard', title: 'Der Mond verhüllt',
      text: 'Die Karte liegt verdeckt, bis der Stich vollständig ist. Die Chronik verrät sie vorher nicht.',
      short: 'Bis zum Stichende verdeckt.'
    },
    {
      uid: 'major-3', type: 'orakel', mode: 'standard', title: 'Herrscherin: Kelche als Trümpfe',
      text: 'Kelche gelten in dieser Runde als niedrige Trümpfe: über den normalen Farben, unter den Großen Arkana. Die ursprüngliche Bedienpflicht bleibt bestehen.',
      short: 'Kelche werden niedere Trümpfe.'
    },
    {
      uid: 'major-4', type: 'orakel', mode: 'standard', title: 'Herrscher: freie Wahl',
      text: 'Die Bedienpflicht ist aufgehoben; Trümpfe und beliebige Farben sind jederzeit erlaubt.',
      short: 'Bedienpflicht aufgehoben.'
    },
    {
      uid: 'major-6', type: 'orakel', mode: 'standard', title: 'Liebende: Partnerstiche',
      text: 'Sitznachbarn 0/1, 2/3 und 4/5 bilden Paare; jeder Partner erhält auch die Stiche des anderen. Bei ungerader Spielerzahl spielt der letzte allein. Gebote und Punkte bleiben individuell.',
      short: 'Benachbarte Sitze teilen Stiche.'
    },
    {
      uid: 'major-10', type: 'orakel', mode: 'standard', title: 'Rad: umgekehrte Hierarchie',
      text: 'Kleine Arkana stehen über den Großen: Zwei ist die höchste Karte, dann 3 bis König, danach das Ass. Die Großen Arkana folgen darunter, wobei 0 über XXI steht. Bedienpflicht bleibt bestehen; Narr, Kraft und Magier behalten ihre Wirkung.',
      short: 'Hierarchie vollständig umgekehrt.'
    },
    {
      uid: 'major-17', type: 'orakel', mode: 'standard', title: 'Stern: Segen der Präzision',
      text: 'Ein exaktes, nicht-null Gebot erhält in dieser Runde zusätzlich 30 Karma. Nullgebote behalten ihre separate ±50-Wertung.',
      short: '+30 Karma bei exaktem Gebot.'
    }
  ];

  const EFFECTS = {};
  EFFECT_LIST.forEach(effect => { EFFECTS[effect.uid] = effect; });

  /** Orakel-Kennungen für die Rundenauswahl. */
  const ORACLE_UIDS = EFFECT_LIST.filter(effect => effect.type === 'orakel').map(effect => effect.uid);

  /** Hofkarten-Segen: Karma je gewonnener Hofkarte (Standard). */
  const COURT_BLESSING = { page: 1, knight: 2, queen: 3, king: 4 };

  /* ---------------------------------------------------------------- */
  /* Deckaufbau                                                        */
  /* ---------------------------------------------------------------- */

  const deck = [];

  MAJOR_ARCANA.forEach(major => {
    const effect = major.effect ? EFFECTS[`major-${major.num}`] : null;
    deck.push(Object.freeze({
      uid: `major-${major.num}`,
      id: major.num,
      name: `${romanNumeral(major.num)} – ${major.name}`,
      shortName: major.name,
      english: major.english,
      group: 'major',
      isTrump: true,
      trumpNum: major.num,
      numeral: romanNumeral(major.num),
      // Der Narr trägt den niedrigsten Zahlenwert des Spiels. Die Sonderregel
      // (verliert gegen alles) liegt im Regelkern und ist dort dokumentiert.
      value: major.num === 0 ? 0 : 100 + major.num,
      icon: major.icon,
      art: major.art,
      palette: major.palette,
      keywords: major.keywords,
      upright: major.upright,
      effectUid: effect ? effect.uid : null,
      desc: effect ? effect.text : major.upright
    }));
  });

  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      const isCourt = Boolean(rank.court);
      // Hofkarten tragen keinen Kodex-Effekt, sondern den Hofkarten-Segen
      // (eigenes Feld `courtKarma`) – sie bleiben reine Rangkarten.
      const effectUid = null;
      const keywordList = [SUIT_BY_NAME[suit.name].keyword.split(',')[0], ...rank.keywords, suit.element];
      deck.push(Object.freeze({
        uid: `minor-${suit.name}-${rank.rank}`,
        id: 100 + SUITS.indexOf(suit) * 14 + rank.rank,
        name: `${rank.name} der ${suit.name}`,
        shortName: `${rank.name} der ${suit.name}`,
        group: suit.key,
        suit: suit.name,
        suitKey: suit.key,
        element: suit.element,
        rank: rank.rank,
        rankName: rank.name,
        index: rank.index,
        court: rank.court || null,
        isTrump: false,
        value: rank.rank === 1 ? 14.5 : rank.rank,
        icon: suit.art,
        art: suit.art,
        palette: suit.palette,
        keywords: keywordList,
        upright: isCourt
          ? `Hofkarte der ${suit.name}: ${suit.keyword}. Als gewonnene Hofkarte zahlt sie im Standard ${rank.karma} Karma (Hofkarten-Segen).`
          : `${rank.name} der ${suit.name} – ${rank.keywords[0]}. ${suit.keyword}. Muss bedient werden; der Rang entscheidet im Stich.`,
        effectUid,
        courtKarma: isCourt ? rank.karma : 0,
        desc: isCourt
          ? `Hofkarten-Segen: +${rank.karma} Karma bei Stichgewinn. Rangwert ${rank.rank}. MUSS bedient werden!`
          : `Kleine Arkana der ${suit.name}. Rangwert ${rank.rank === 14.5 ? '14,5 (Ass)' : rank.rank}. MUSS bedient werden!`
      }));
    });
  });

  /**
   * Verdeckte Karte (Mond): keine eigene Deckkarte, sondern ein
   * Darstellungsplatzhalter mit vollständiger Kartenbeschreibung.
   * `suffix` sorgt für ein eigenes Rückseitenmotiv im SVG.
   */
  const CONCEALED_CARD = Object.freeze({
    uid: 'concealed-moon',
    concealed: true,
    name: 'Verdeckte Karte',
    shortName: 'Verdeckt',
    group: 'major',
    isTrump: true,
    trumpNum: 18,
    numeral: 'XVIII',
    value: 118,
    icon: 'moon',
    art: 'moon',
    palette: 'lunar',
    keywords: ['Schleier', 'Geheimnis'],
    upright: 'Der Mond liegt verdeckt, bis der Stich vollständig ist.',
    effectUid: 'major-18',
    desc: 'Verdeckte Karte des Mondes. Wird erst am Ende des Stichs aufgedeckt.'
  });

  const TAROT_DECK = Object.freeze(deck);
  const DECK_BY_UID = {};
  TAROT_DECK.forEach(card => { DECK_BY_UID[card.uid] = card; });

  /**
   * Kodex-Gruppen in sinnvoller Sortierreihenfolge:
   * Große Arkana 0–XXI, danach die vier Farben mit Ass … König.
   */
  const CODEX_GROUPS = [
    { key: 'major', label: 'Große Arkana', hint: '0 – XXI · Die Reise des Adepten', icon: '✦' },
    { key: 'wands', label: 'Stäbe', hint: 'Feuer · Wille und Tatkraft', icon: '🜂' },
    { key: 'cups', label: 'Kelche', hint: 'Wasser · Gefühl und Strömung', icon: '🜄' },
    { key: 'swords', label: 'Schwerter', hint: 'Luft · Klarheit und Schnitt', icon: '🜁' },
    { key: 'pentacles', label: 'Münzen', hint: 'Erde · Werk und Bestand', icon: '🜃' }
  ];

  const GROUP_ORDER = { major: 0, wands: 1, cups: 2, swords: 3, pentacles: 4 };

  /** Der kanonische Kodex-Index einer Karte (Große Arkana vor Kleinen). */
  function deckIndex(card) {
    return TAROT_DECK.indexOf(card);
  }

  /** Sortiert eine Kartenliste kanonisch: Gruppenreihenfolge, dann Rang. */
  function sortCards(cards) {
    return [...cards].sort((a, b) => {
      const groupDelta = (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9);
      if (groupDelta) return groupDelta;
      if (a.group === 'major' && b.group === 'major') return a.trumpNum - b.trumpNum;
      return (a.rank || 0) - (b.rank || 0);
    });
  }

  /**
   * Sortiert eine Hand für die Anzeige:
   *   1. Große Arkana absteigend (XXI … 0)
   *   2. danach die Farben in Kodex-Reihenfolge (Stäbe, Kelche, Schwerter, Münzen)
   *   3. innerhalb einer Farbe absteigend nach Rangwert (Ass 14,5 zuerst, dann König … Zwei)
   * So stehen die Trümpfe links, danach je Farbe die stärkste Karte.
   */
  function sortHand(cards) {
    return [...cards].sort((a, b) => {
      if (a.isTrump !== b.isTrump) return a.isTrump ? -1 : 1;
      if (a.isTrump && b.isTrump) return b.trumpNum - a.trumpNum;
      const suitDelta = (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9);
      if (suitDelta) return suitDelta;
      return b.value - a.value;
    });
  }

  /** Alle Karten mit Spezialeffekt, kanonisch sortiert. */
  function cardsWithEffects() {
    return sortCards(TAROT_DECK.filter(card => card.effectUid));
  }

  /**
   * Kodex-Abfrage: Suchtext + Filter + Sortierung.
   * Filter: 'all' | 'majors' | 'courts' | 'effects' | 'oracles'
   *         | 'schicksal' | 'standard' | 'turbo' | suit key
   */
  function filterCodexCards(options) {
    const opts = options || {};
    const search = String(opts.search || '').trim().toLowerCase();
    const filter = opts.filter || 'all';
    const sort = opts.sort || 'canonical';
    let result = TAROT_DECK.filter(card => {
      if (!search) return true;
      const haystack = [card.name, card.english, card.upright, card.suit, card.keywords.join(' ')].join(' ').toLowerCase();
      return haystack.includes(search);
    });
    if (filter === 'majors') result = result.filter(card => card.group === 'major');
    else if (filter === 'courts') result = result.filter(card => Boolean(card.court));
    else if (filter === 'effects') result = result.filter(card => Boolean(card.effectUid));
    else if (filter === 'oracles') result = result.filter(card => EFFECTS[card.effectUid]?.type === 'orakel');
    else if (filter === 'schicksal') result = result.filter(card => card.effectUid && EFFECTS[card.effectUid].type === 'schicksal');
    else if (filter === 'standard') result = result.filter(card => card.effectUid && ['schicksal', 'orakel'].includes(EFFECTS[card.effectUid].type));
    else if (filter === 'turbo') result = result.filter(card => card.effectUid && EFFECTS[card.effectUid].type === 'turbo');
    else if (['wands', 'cups', 'swords', 'pentacles'].includes(filter)) result = result.filter(card => card.group === filter);
    if (sort === 'alpha') result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    else if (sort === 'effect') result = [...result].sort((a, b) => Number(Boolean(b.effectUid)) - Number(Boolean(a.effectUid)));
    else result = sortCards(result);
    return result;
  }

  /** CSS-Klassen für die Kartenkunst (Palette + Trumpf/Farbe). */
  function cardArtClass(card) {
    if (!card) return 'card-face card-face--mystic';
    if (card.isTrump) return `card-face card-face--major arcana-${card.trumpNum} palette-${card.palette || 'aether'}`;
    const suitKey = card.suitKey || (SUIT_BY_NAME[card.suit]?.key) || 'wands';
    return `card-face card-face--minor suit-${suitKey} palette-${card.palette || suitKey}`;
  }

  /** Kleiner Text für Tooltips / Chronik. */
  function cardSummary(card) {
    if (!card) return '';
    const effect = card.effectUid ? EFFECTS[card.effectUid] : null;
    const base = card.isTrump ? `Große Arkana ${card.numeral}` : `${card.rankName} der ${card.suit}`;
    return effect ? `${card.name}: ${effect.short}` : `${card.name}: ${base}`;
  }

  const API = {
    ROMAN,
    romanNumeral,
    MAJOR_ARCANA,
    SUITS,
    RANKS,
    RANK_BY_NUMBER,
    SUIT_BY_NAME,
    EFFECTS,
    EFFECT_LIST,
    ORACLE_UIDS,
    COURT_BLESSING,
    TAROT_DECK,
    DECK_BY_UID,
    CONCEALED_CARD,
    CODEX_GROUPS,
    GROUP_ORDER,
    deckIndex,
    sortCards,
    cardsWithEffects,
    sortHand,
    filterCodexCards,
    cardArtClass,
    cardSummary
  };

  global.ArcanumCards = API;
  // Rückwärtskompatible Namen für bestehende Skripte und Tests.
  global.ALL_CARDS = EFFECT_LIST.filter(effect => DECK_BY_UID[effect.uid]);
  global.TAROT_DECK = TAROT_DECK;
  global.MAJOR_ARCANA = MAJOR_ARCANA;
  global.CODEX_GROUPS = CODEX_GROUPS;
  global.cardArtClass = cardArtClass;
  global.cardSummary = cardSummary;
  global.filterCodexCards = filterCodexCards;
  global.sortHand = sortHand;
})(typeof globalThis !== 'undefined' ? globalThis : this);
