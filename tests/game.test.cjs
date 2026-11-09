/**
 * Arcanum · Regel-, Daten- und Integritätstests
 * -------------------------------------------------------------
 * Ausführen:  node --test tests/*.test.cjs
 *
 * Geprüft werden:
 *   · Kartenregister und vollständiges 78-Karten-Deck
 *   · Kartenkunst (78 individuelle SVG-Motive, Rückseite, Beschriftung)
 *   · Kodex-Gruppierung, Suche, Filter und Sortierung
 *   · Rangordnung, Bedienpflicht und alle Spezialeffekte
 *   · Wertung inklusive Hofkarten-Segen und halber Stiche
 *   · Stochastik, Determinismus und Animationsmathematik
 *   · HTML-, CSS- und Dokumentationsintegrität
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const FILES = ['js/cards.js', 'js/card-art.js', 'js/rules.js', 'js/animations.js', 'js/scene3d.js', 'js/engine.js', 'js/app.js'];
const source = Object.fromEntries(FILES.map(file => [file, fs.readFileSync(file, 'utf8')]));

/** Minimaler Browser-Ersatz: Timer, Math und ein leerer DOM-Stub. */
const documentStub = {
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  body: { classList: { add() {}, remove() {}, toggle() {} }, style: {} },
  documentElement: { dataset: {} },
  readyState: 'complete',
  createElement() { return { classList: { add() {}, remove() {} }, appendChild() {}, remove() {}, style: {}, setAttribute() {} }; }
};
const context = {
  document: documentStub,
  setTimeout,
  clearTimeout,
  Math,
  console,
  performance: { now: () => Date.now() },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: cb => setTimeout(cb, 0),
  cancelAnimationFrame: id => clearTimeout(id),
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  confirm: () => true,
  visualViewport: null
};
vm.createContext(context);
vm.runInContext(
  FILES.map(file => source[file]).join('\n') +
  '\nthis.api = { Cards: ArcanumCards, Art: ArcanumCardArt, Rules: ArcanumRules, Fx: ArcanumFx, Game: GameEngine, Scene: GameEngine3D };',
  context
);

const { Cards, Art, Rules, Fx, Game, Scene } = context.api;
const MAJOR = n => Cards.DECK_BY_UID[`major-${n}`];
const MINOR = (suit, rank) => Cards.DECK_BY_UID[`minor-${suit}-${rank}`];
const mode = value => { context.currentActiveMode = value; };

/** Führt einen Stich über den reinen Regelkern aus. */
function resolve(cards, { oracleUid = null, mode = 'standard', leadSuit = 'Stäbe' } = {}) {
  return Rules.resolveTrick(cards.map((card, playerIdx) => ({ card, playerIdx })), {
    leadSuit, oracleUid, mode, playerCount: cards.length
  });
}

/* ================================================================ */
/* Karten und Deck                                                   */
/* ================================================================ */

test('Deck enthält 78 eindeutige Karten: 22 Große Arkana und 56 Kleine Arkana', () => {
  const deck = Cards.TAROT_DECK;
  assert.equal(deck.length, 78);
  assert.equal(new Set(deck.map(card => card.uid)).size, 78);
  assert.equal(deck.filter(card => card.isTrump).length, 22);
  assert.equal(deck.filter(card => !card.isTrump).length, 56);
  assert.equal(Rules.validateDeck().length, 0);
});

test('Jede Farbe hat 14 Ränge mit Ass = 14,5 und Hofkarten 11–14', () => {
  Cards.SUITS.forEach(suit => {
    const cards = Cards.TAROT_DECK.filter(card => card.suit === suit.name);
    assert.equal(cards.length, 14);
    assert.equal(cards.find(card => card.rank === 1).value, 14.5);
    assert.equal(cards.filter(card => card.court).length, 4);
    assert.deepEqual(
      Array.from(cards.filter(card => card.court).map(card => card.court)),
      ['page', 'knight', 'queen', 'king']
    );
  });
});

test('Große Arkana tragen römische Ziffern, englische Namen und Symbolik', () => {
  Cards.MAJOR_ARCANA.forEach(major => {
    const card = MAJOR(major.num);
    assert.equal(card.numeral, Cards.romanNumeral(major.num));
    assert.ok(card.english.length > 2);
    assert.ok(card.keywords.length >= 3);
    assert.ok(card.upright.length > 30);
    // Der Narr trägt den Ausnahmewert 0, alle anderen 100 + Nummer.
    assert.equal(card.value, major.num === 0 ? 0 : 100 + major.num);
  });
  assert.equal(MAJOR(21).numeral, 'XXI');
  assert.equal(MAJOR(0).numeral, '0');
});

test('Effektregister ist vollständig und konsistent', () => {
  const effectUids = Cards.EFFECT_LIST.map(effect => effect.uid);
  assert.equal(new Set(effectUids).size, effectUids.length);
  assert.equal(Cards.EFFECT_LIST.length, 17);
  Cards.EFFECT_LIST.forEach(effect => {
    assert.ok(Cards.DECK_BY_UID[effect.uid], `Karte fehlt: ${effect.uid}`);
    assert.ok(['turbo', 'schicksal', 'orakel'].includes(effect.type));
    assert.ok(['both', 'standard'].includes(effect.mode));
    assert.ok(effect.text.length > 40);
  });
  assert.equal(Cards.ORACLE_UIDS.length, 5);
});

/* ================================================================ */
/* Kartenkunst                                                       */
/* ================================================================ */

test('Alle 78 Karten besitzen ein eigenes, gültiges SVG-Motiv', () => {
  const faces = Cards.TAROT_DECK.map(card => Art.face(card));
  assert.equal(faces.length, 78);
  assert.equal(new Set(faces).size, 78, 'jedes Motiv muss einmalig sein');
  faces.forEach(svg => {
    assert.match(svg, /^<svg class="card-svg card-svg--face"/);
    assert.match(svg, /viewBox="0 0 240 400"/);
    assert.match(svg, /role="img"/);
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined|null/);
    // Keine Emoji in der Kunst – alle Symbole sind gezeichnet.
    assert.doesNotMatch(svg, /[\u{1F300}-\u{1FAFF}]/u);
  });
});

test('22 individuelle Motive für die Großen Arkana', () => {
  assert.equal(Art.motifCount(), 22);
  const trademarks = Cards.MAJOR_ARCANA.map(card => {
    const svg = Art.face(MAJOR(card.num));
    return svg.slice(svg.indexOf('<g>'), svg.indexOf('</g>', svg.indexOf('<g>')));
  });
  assert.equal(new Set(trademarks).size, 22);
});

test('Hofkarten tragen keinen Kodex-Effekt, aber den Hofkarten-Segen', () => {
  const courts = Cards.TAROT_DECK.filter(card => card.court);
  courts.forEach(court => {
    assert.equal(court.effectUid, null);
    assert.ok(court.courtKarma >= 1 && court.courtKarma <= 4);
  });
  assert.equal(Cards.filterCodexCards({ filter: 'effects' }).length, 17);
  assert.equal(Cards.filterCodexCards({ filter: 'courts' }).length, 16);
});

test('Hofkarten zeigen Figuren, Zahlenkarten Punktbilder', () => {
  const queen = Art.face(MINOR('Kelche', 13));
  const two = Art.face(MINOR('Kelche', 2));
  const ten = Art.face(MINOR('Kelche', 10));
  assert.notEqual(queen, two);
  // Zehn Kelche: zehn Symbole im Punktbild.
  assert.equal((ten.match(/<path d="M-9-9h18/g) || []).length, 10);
  assert.equal((two.match(/<path d="M-9-9h18/g) || []).length, 2);
});

test('Verdeckte Mondkarte ist eine vollständige Kartenbeschreibung', () => {
  const concealed = Cards.CONCEALED_CARD;
  assert.equal(concealed.concealed, true);
  assert.ok(concealed.uid && concealed.name && concealed.palette);
  // Regression: die verdeckte Karte muss durch den SVG-Renderer laufen
  const svg = Art.face(concealed);
  assert.match(svg, /card-svg--back/, 'verdeckte Karte zeigt die Rückseite');
  assert.doesNotMatch(svg, /NaN|undefined/);
  // Engine-Markup darf nicht brechen.
  const markup = Game.cardMarkup(concealed, { extraClass: 'card-on-table' });
  assert.match(markup, /arc-card__veil/);
  assert.match(markup, /card-svg--back/);
});

test('Kartenrückseite ist gestaltet und beschriftet', () => {
  const back = Art.back();
  assert.match(back, /card-svg--back/);
  assert.match(back, /aria-label="Kartenrückseite"/);
  assert.match(back, /<\/svg>$/);
  assert.notEqual(back, Art.back({ id: 'x', palette: 'solar' }), 'Palettenwechsel muss das Motiv färben');
});

test('Kartenklassen spiegeln Palette und Gruppe', () => {
  assert.match(Cards.cardArtClass(MAJOR(21)), /card-face--major/);
  assert.match(Cards.cardArtClass(MAJOR(21)), /arcana-21/);
  assert.match(Cards.cardArtClass(MINOR('Kelche', 5)), /card-face--minor/);
  assert.match(Cards.cardArtClass(MINOR('Kelche', 5)), /suit-cups/);
  assert.match(Cards.cardArtClass(MINOR('Münzen', 5)), /suit-pentacles/);
});

/* ================================================================ */
/* Kodex                                                             */
/* ================================================================ */

test('Kodex sortiert Große Arkana 0–XXI vor den vier Farben', () => {
  const all = Cards.filterCodexCards({});
  assert.equal(all.length, 78);
  assert.deepEqual(JSON.parse(JSON.stringify(all.slice(0, 4).map(card => card.uid))), ['major-0', 'major-1', 'major-2', 'major-3']);
  assert.equal(all[21].uid, 'major-21');
  assert.equal(all[22].uid, 'minor-Stäbe-1');
  assert.equal(all[35].uid, 'minor-Stäbe-14');
  assert.equal(all[36].uid, 'minor-Kelche-1');
  assert.equal(all[77].uid, 'minor-Münzen-14');
});

test('Kodex-Gruppen decken alle Karten ab und sind benannt', () => {
  const groups = Cards.CODEX_GROUPS;
  assert.equal(groups.length, 5);
  assert.deepEqual(Array.from(groups.map(group => group.key)), ['major', 'wands', 'cups', 'swords', 'pentacles']);
  const covered = groups.reduce((sum, group) => sum + Cards.TAROT_DECK.filter(card => card.group === group.key).length, 0);
  assert.equal(covered, 78);
  groups.forEach(group => assert.ok(group.label.length > 2 && group.hint.length > 5));
});

test('Kodex-Filter und Suche liefern korrekte Teilmengen', () => {
  assert.equal(Cards.filterCodexCards({ filter: 'majors' }).length, 22);
  assert.equal(Cards.filterCodexCards({ filter: 'courts' }).length, 16);
  assert.equal(Cards.filterCodexCards({ filter: 'effects' }).length, Cards.EFFECT_LIST.length);
  assert.equal(Cards.filterCodexCards({ filter: 'oracles' }).length, 5);
  assert.equal(Cards.filterCodexCards({ filter: 'cups' }).length, 14);
  assert.equal(Cards.filterCodexCards({ filter: 'turbo' }).length, 3);
  assert.equal(Cards.filterCodexCards({ filter: 'schicksal' }).length, 9, 'Schicksalskarten (Standard)');
  assert.ok(Cards.filterCodexCards({ search: 'narr' }).some(card => card.uid === 'major-0'));
  assert.ok(Cards.filterCodexCards({ search: 'kelche' }).length >= 14);
  assert.equal(Cards.filterCodexCards({ search: 'zzzzz' }).length, 0);
  const alpha = Cards.filterCodexCards({ sort: 'alpha' });
  assert.equal(alpha[0].name.localeCompare(alpha[1].name, 'de') <= 0, true);
  const effectFirst = Cards.filterCodexCards({ sort: 'effect' });
  assert.ok(effectFirst[0].effectUid);
});

/* ================================================================ */
/* Rangordnung und Effekte                                          */
/* ================================================================ */

test('Grundrangfolge: Trumpf schlägt Farbe, höhere Farbe schlägt niedrigere', () => {
  assert.equal(resolve([MINOR('Stäbe', 10), MINOR('Stäbe', 14)]).winnerIdx, 1);
  assert.equal(resolve([MINOR('Stäbe', 14), MINOR('Kelche', 2)]).winnerIdx, 0);
  assert.equal(resolve([MINOR('Stäbe', 2), MAJOR(5)]).winnerIdx, 1);
  assert.equal(resolve([MAJOR(5), MAJOR(9)]).winnerIdx, 1);
});

test('Ass zählt 14,5 und schlägt den König derselben Farbe', () => {
  assert.equal(resolve([MINOR('Kelche', 14), MINOR('Kelche', 1)]).winnerIdx, 1);
  assert.equal(resolve([MINOR('Kelche', 1), MINOR('Kelche', 14)]).winnerIdx, 0);
});

test('Der Narr verliert – außer unmittelbar nach der Welt', () => {
  assert.equal(resolve([MAJOR(0), MINOR('Stäbe', 2)]).winnerIdx, 1);
  assert.equal(resolve([MAJOR(21), MAJOR(0)]).winnerIdx, 1);
  const result = resolve([MAJOR(21), MAJOR(0)]);
  assert.equal(result.foolBeatWorld, true);
  // Mit Kraft im Stich greift die Narr-Regel nicht.
  assert.equal(resolve([MAJOR(21), MAJOR(0), MAJOR(11)]).winnerIdx, 2);
});

test('Magier passt sich der höchsten Kleinen Arkana an', () => {
  assert.equal(resolve([MAJOR(1), MINOR('Stäbe', 14)]).winnerIdx, 0);
  assert.equal(resolve([MAJOR(1), MAJOR(2)]).winnerIdx, 1, 'ohne Kleine Arkana zählt der Magier 0,5');
});

test('Kraft gewinnt gegen alles und sperrt danach Trümpfe', () => {
  const result = resolve([MAJOR(11), MAJOR(21)]);
  assert.equal(result.winnerIdx, 0);
  assert.equal(result.strengthPlayer, 0);
});

test('Turm zerstört den Stich, Tod halbiert ihn, Turm hat Vorrang', () => {
  const tower = resolve([MAJOR(16), MAJOR(21)]);
  assert.equal(tower.destroyed, true);
  assert.equal(tower.won, 0);
  const death = resolve([MAJOR(13), MAJOR(21)]);
  assert.equal(death.deathHalf, true);
  assert.equal(death.won, 0.5);
  const both = resolve([MAJOR(13), MAJOR(16), MAJOR(21)]);
  assert.equal(both.destroyed, true);
  assert.equal(both.won, 0);
});

test('Hierophant annulliert alle Karteneffekte des Stichs', () => {
  const result = resolve([MAJOR(5), MAJOR(16), MAJOR(13), MAJOR(8)]);
  assert.equal(result.cancelled, true);
  assert.equal(result.won, 1);
  assert.equal(result.winnerIdx, 1, 'reine Zahlenwerte: XVI gewinnt');
  assert.deepEqual(Array.from(result.justiceTargets), []);
  assert.equal(result.deathHalf, false);
  assert.equal(result.courtKarma, 0);
});

test('Gerechtigkeit vergibt fünf Karma an alle anderen Spieler', () => {
  const result = resolve([MAJOR(8), MAJOR(21), MINOR('Stäbe', 2)]);
  assert.equal(result.winnerIdx, 1, 'XXI gewinnt den Stich');
  assert.deepEqual(JSON.parse(JSON.stringify(result.justiceTargets)), [0, 2], 'alle außer dem Sieger');
});

test('Mond wird erst am Stichende aufgedeckt', () => {
  assert.equal(Rules.resolveTrick([
    { card: MAJOR(18), playerIdx: 0, hidden: true },
    { card: MAJOR(2), playerIdx: 1 }
  ], { mode: 'standard', leadSuit: null }).moonRevealed, true);
});

test('Herrscherin macht Kelche zu niederen Trümpfen', () => {
  assert.equal(resolve([MINOR('Stäbe', 14), MINOR('Kelche', 2)], { oracleUid: 'major-3' }).winnerIdx, 1);
  assert.equal(resolve([MINOR('Kelche', 2), MAJOR(0)], { oracleUid: 'major-3' }).winnerIdx, 0);
});

test('Rad des Schicksals invertiert die gesamte Hierarchie', () => {
  assert.equal(resolve([MAJOR(21), MINOR('Stäbe', 2)], { oracleUid: 'major-10' }).winnerIdx, 1);
  assert.equal(resolve([MAJOR(21), MINOR('Stäbe', 14)], { oracleUid: 'major-10' }).winnerIdx, 1);
  assert.equal(resolve([MINOR('Stäbe', 2), MINOR('Stäbe', 10)], { oracleUid: 'major-10' }).winnerIdx, 0);
  assert.equal(resolve([MAJOR(21), MAJOR(0)], { oracleUid: 'major-10' }).winnerIdx, 1);
});

test('Orakel wirken nur im Standardmodus', () => {
  assert.equal(resolve([MINOR('Stäbe', 14), MINOR('Kelche', 2)], { oracleUid: 'major-3', mode: 'turbo' }).winnerIdx, 0);
  assert.equal(resolve([MAJOR(5), MAJOR(16)], { mode: 'turbo' }).cancelled, false, 'Hierophant ist Standard-only');
});

test('Liebende teilen Stiche paarweise, letzter Spieler bleibt allein', () => {
  const pair = resolve([MAJOR(20), MINOR('Stäbe', 2), MINOR('Stäbe', 3)], { oracleUid: 'major-6' });
  assert.equal(pair.loversPartner, 1);
  const odd = resolve([MINOR('Stäbe', 2), MINOR('Stäbe', 3), MAJOR(20)], { oracleUid: 'major-6' });
  assert.equal(odd.loversPartner, null);
});

test('Hofkarten-Segen zählt nur im Standard und nur für den Stichsieger', () => {
  const king = MINOR('Kelche', 14);
  const standard = resolve([king, MINOR('Kelche', 2)], { mode: 'standard' });
  assert.equal(standard.courtKarma, 4);
  const turbo = resolve([king, MINOR('Kelche', 2)], { mode: 'turbo' });
  assert.equal(turbo.courtKarma, 0);
});

/* ================================================================ */
/* Zulässige Züge                                                    */
/* ================================================================ */

test('Bedienpflicht: Farbe muss bedient werden, Trümpfe sind immer erlaubt', () => {
  const hand = [MINOR('Stäbe', 3), MINOR('Kelche', 5), MAJOR(9)];
  const context = { leadSuit: 'Stäbe' };
  assert.deepEqual(Array.from(Rules.legalCardIndices(hand, context)), [0, 2]);
  assert.equal(Rules.describeConstraint(hand, context), 'Bedienpflicht: Stäbe muss bedient werden.');
});

test('Ohne passende Farbe sind alle Karten erlaubt', () => {
  const hand = [MINOR('Kelche', 5), MAJOR(9)];
  assert.deepEqual(Array.from(Rules.legalCardIndices(hand, { leadSuit: 'Stäbe' })), [0, 1]);
});

test('Herrscher hebt die Bedienpflicht auf', () => {
  const hand = [MINOR('Stäbe', 3), MINOR('Kelche', 5), MAJOR(9)];
  assert.deepEqual(Array.from(Rules.legalCardIndices(hand, { leadSuit: 'Stäbe', freeLead: true })), [0, 1, 2]);
});

test('Kraftverbot und Teufelszwang schränken die Auswahl ein', () => {
  const hand = [MINOR('Stäbe', 3), MINOR('Kelche', 14), MAJOR(21)];
  assert.deepEqual(Array.from(Rules.legalCardIndices(hand, { leadSuit: 'Stäbe', trumpBan: true })), [0]);
  assert.deepEqual(Array.from(Rules.legalCardIndices(hand, { mustPlayHighest: true })), [2]);
  assert.equal(
    Rules.describeConstraint(hand, { leadSuit: 'Stäbe', trumpBan: true }),
    'Die Kraft: in diesem Zug darf kein Trumpf gelegt werden.'
  );
});

/* ================================================================ */
/* Wertung                                                           */
/* ================================================================ */

test('Exaktes Gebot: +20 Basis und +10 je Stich', () => {
  const result = Rules.scoreRound({ mode: 'turbo', bid: 2, won: 2 });
  assert.equal(result.points, 40);
  assert.equal(result.exact, true);
  assert.equal(result.breakdown[0], 'Exakt getroffen (+20 Basis + 20 Stiche)');
});

test('Abweichungen kosten 10 (Turbo) bzw. 15 beim Unterbieten (Standard)', () => {
  assert.equal(Rules.scoreRound({ mode: 'turbo', bid: 3, won: 1 }).points, -20);
  assert.equal(Rules.scoreRound({ mode: 'turbo', bid: 1, won: 3 }).points, -20);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 1 }).points, -15);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 1, won: 2 }).points, -10);
});

test('Null-Ansage: +50 oder −50', () => {
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 0, won: 0 }).points, 50);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 0, won: 1 }).points, -50);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 0, won: 0 }).exact, true);
});

test('Stern-Segen nur bei exaktem Nicht-Null-Gebot', () => {
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 2, oracleUid: 'major-17' }).points, 70);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 0, won: 0, oracleUid: 'major-17' }).points, 50);
  // Der Stern ist ein Orakel und wirkt ausschließlich im Standard.
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 2 }).points, 40);
});

test('Hofkarten-Segen addiert sich zur Rundenwertung', () => {
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 2, courtKarma: 6 }).points, 46);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 1, courtKarma: 0 }).points, -15);
});

test('Halbe Stiche werden auf ganze Abweichungen gerundet', () => {
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 1, won: 1.5 }).points, -10, 'Überbieten: 0,5 → 1 Schritt à 10');
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 1, won: 0.5 }).points, -15, 'Unterbieten: 0,5 → 1 Schritt à 15');
  // Der Magier kann 0,5 Stiche nicht gewinnen – halbe Stiche entstehen nur durch den Tod.
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 3, won: 2.5 }).points, -15);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 1, won: 1 }).points, 30);
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 2, won: 0.5 }).points, -30, '1,5 Schritte: gerundet 2');
  assert.equal(Rules.scoreRound({ mode: 'standard', bid: 1, won: 2.5 }).points, -20, '1,5 Schritte beim Überbieten: −10 je Schritt');
});

test('Wertungsrechner und Engine nutzen dieselbe Formel', () => {
  const cases = [
    { bid: 0, won: 0 }, { bid: 0, won: 2 }, { bid: 3, won: 3 }, { bid: 3, won: 1 }, { bid: 1, won: 4 }
  ];
  cases.forEach(({ bid, won }) => {
    const viaRules = Rules.scoreRound({ mode: 'standard', bid, won, oracleUid: 'major-17' }).points;
    // Engine-Pfad: evaluateRoundScores auf einen einzelnen Spieler reduzieren.
    mode('standard');
    Game.players = [{ id: 0, name: 'A', bid, won, score: 0 }];
    Game.activeOracle = { uid: 'major-17' };
    Game.currentRound = 2;
    Game.maxRounds = 7;
    Game.schedule = () => {};
    Game.log = () => {};
    Game.renderUI = () => {};
    Game.renderHud = () => {};
    Game.evaluateRoundScores();
    assert.equal(Game.players[0].roundPoints, viaRules);
  });
});

/* ================================================================ */
/* Ablauf und Engine                                                */
/* ================================================================ */

test('Rundengrößen folgen Modus und Rundennummer', () => {
  assert.equal(Rules.cardsPerPlayer('turbo', 1), 5);
  assert.equal(Rules.cardsPerPlayer('turbo', 5), 9);
  assert.equal(Rules.cardsPerPlayer('standard', 1), 7);
  assert.equal(Rules.cardsPerPlayer('standard', 7), 13);
  assert.equal(Rules.maxRounds('turbo'), 5);
  assert.equal(Rules.maxRounds('standard'), 7);
});

test('Verteilen gibt jedem Spieler gleich viele, eindeutige Karten', () => {
  const deck = Rules.createDeck(Rules.createRng(42));
  const { hands, remainder, dealt } = Rules.deal({ deck, playerCount: 6, cardsEach: 13 });
  assert.equal(dealt, 13);
  assert.equal(hands.length, 6);
  hands.forEach(hand => assert.equal(hand.length, 13));
  assert.equal(remainder.length, 78 - 78);
  const all = hands.flat().map(card => card.uid);
  assert.equal(new Set(all).size, all.length);
});

test('Gleicher Seed erzeugt identische Partien', () => {
  const a = Rules.createDeck(Rules.createRng(2024)).map(card => card.uid);
  const b = Rules.createDeck(Rules.createRng(2024)).map(card => card.uid);
  assert.deepEqual(a, b);
  const c = Rules.createDeck(Rules.createRng(2025)).map(card => card.uid);
  assert.notDeepEqual(a, c);
});

test('Engine spielt eine komplette Runde regelkonform durch', () => {
  mode('turbo');
  Game.rng = Rules.createRng(7);
  Game.numPlayers = 3;
  Game.players = [
    { id: 0, name: 'Du', isBot: false, hand: [], bid: 0, won: 0, score: 0 },
    { id: 1, name: 'Bot 1', isBot: true, hand: [], bid: 0, won: 0, score: 0 },
    { id: 2, name: 'Bot 2', isBot: true, hand: [], bid: 0, won: 0, score: 0 }
  ];
  Game.currentRound = 1;
  Game.maxRounds = 5;
  Game.schedule = () => {};
  Game.log = () => {};
  Game.renderUI = () => {};
  Game.renderHud = () => {};
  Game.hidePodium = () => {};
  Game.startRound();

  assert.equal(Game.phase, 'bidding');
  assert.equal(Game.players[0].hand.length, 5);

  Game.submitHumanBid(1);
  assert.equal(Game.phase, 'playing');

  let guard = 0;
  // Timer sind im Test deaktiviert – der Stich wird daher manuell ausgewertet,
  // sobald alle Spielenden gelegt haben.
  const tick = () => {
    while (Game.phase === 'playing' && guard++ < 400) {
      if (Game.currentTrick.length === Game.players.length) {
        Game.evaluateTrick();
        if (Game.phase !== 'playing') break;
        continue;
      }
      const playerIdx = Game.activePlayerIdx;
      const legal = Game.legalCardIndices(playerIdx);
      assert.ok(legal.length > 0, 'es muss immer einen zulässigen Zug geben');
      const cardIdx = legal[0];
      const cardUid = Game.players[playerIdx].hand[cardIdx].uid;
      Game.playCard(playerIdx, cardIdx);
      // Die Karte muss den Stich erreicht haben – entweder liegt sie noch dort
      // oder der Stich wurde bereits ausgewertet (dann ist er leer) und die
      // Karte steckt im letzten Stichergebnis.
      const inTrick = Game.currentTrick.some(item => item.card.uid === cardUid);
      const inLastTrick = Boolean(Game.lastTrick && Game.lastTrick.cards.some(item => item.card.uid === cardUid));
      assert.ok(inTrick || inLastTrick, 'gespielte Karte muss im Stich oder im letzten Stichergebnis liegen');
      // Keine Karte darf doppelt im Stich liegen.
      const uids = Game.currentTrick.map(item => item.card.uid);
      assert.equal(new Set(uids).size, uids.length, 'keine doppelten Karten im Stich');
    }
  };
  tick();

  assert.ok(guard < 400, 'die Runde muss terminieren');
  assert.equal(Game.players[0].hand.length, 0);
  // 15 Stiche à 5 Karten bei drei Spielenden; jeder Stich hat genau einen Gewinner.
  const totalWon = Game.players.reduce((sum, player) => sum + player.won, 0);
  assert.equal(totalWon, 5);
});

test('Bot-Heuristik bleibt innerhalb der Rundengröße', () => {
  Game.currentRound = 3;
  mode('turbo');
  Cards.TAROT_DECK.slice(0, 7).forEach(() => {});
  for (let i = 0; i < 20; i++) {
    const hand = Rules.createDeck(Rules.createRng(i + 1)).slice(0, 7);
    const bid = Game.estimateBotBid(hand);
    assert.ok(bid >= 0 && bid <= hand.length, `Gebot ${bid} für ${hand.length} Karten`);
  }
});

test('Spielstand lässt sich versioniert serialisieren', () => {
  const state = Game.serialize();
  assert.equal(state.schema, Rules.STATE_SCHEMA_VERSION);
  assert.equal(state.ruleset, Rules.RULESET_VERSION);
  assert.ok(['turbo', 'standard'].includes(state.mode));
  assert.ok(Array.isArray(state.trick));
});

/* ================================================================ */
/* Stochastik                                                       */
/* ================================================================ */

test('Trumpfwahrscheinlichkeit entspricht der hypergeometrischen Verteilung', () => {
  const total = Cards.TAROT_DECK.length;
  const trumps = Cards.TAROT_DECK.filter(card => card.isTrump).length;
  assert.equal(Rules.chanceOfAtLeastOneTrump(0, total, trumps), 0);
  assert.equal(Rules.chanceOfAtLeastOneTrump(1, total, trumps), 28.21);
  assert.equal(Rules.chanceOfAtLeastOneTrump(5, total, trumps), 81.91);
  assert.equal(Rules.chanceOfAtLeastOneTrump(78, total, trumps), 100);
  // Monoton steigend
  let previous = -1;
  for (let size = 0; size < 16; size++) {
    const chance = Rules.chanceOfAtLeastOneTrump(size, total, trumps);
    assert.ok(chance > previous, `Chance muss mit der Handgröße steigen (${size})`);
    previous = chance;
  }
  // Monotonie wird bis 16 Karten geprüft; ab ~20 Karten rundet die
  // Wahrscheinlichkeit auf 99,9 %+ und ist praktisch gesättigt.
  // Ab 57 Karten (78 − 22) muss zwangsläufig ein Trumpf dabei sein.
  assert.equal(Rules.chanceOfAtLeastOneTrump(total - trumps, total, trumps), 100);
  assert.ok(Math.abs(Rules.expectedTrumps(13, total, trumps) - 13 * 22 / 78) < 1e-9);
});

/* ================================================================ */
/* Animationsmathematik                                             */
/* ================================================================ */

test('Feder konvergiert gedämpft gegen das Ziel', () => {
  let state = { value: 0, velocity: 0 };
  for (let frame = 0; frame < 240; frame++) state = Fx.springStep(state, 100, 1 / 60);
  assert.ok(Math.abs(state.value - 100) < 0.6, `Wert ${state.value}`);
  assert.ok(Math.abs(state.velocity) < 1.2, `Geschwindigkeit ${state.velocity}`);
  // Kein Überschwingen über 130 (stabil bei 60 fps)
  state = { value: 0, velocity: 0 };
  let max = 0;
  for (let frame = 0; frame < 200; frame++) {
    state = Fx.springStep(state, 100, 1 / 60);
    max = Math.max(max, state.value);
  }
  assert.ok(max < 130);
});

test('Kartenflug startet und endet exakt an den Endpunkten', () => {
  const from = { x: 0, y: 0, rotate: 0, scale: 1 };
  const to = { x: 400, y: 200, rotate: 12, scale: 2 };
  const start = Fx.flightPoint(from, to, 0);
  const end = Fx.flightPoint(from, to, 1);
  assert.deepEqual([Math.round(start.x), Math.round(start.y)], [0, 0]);
  assert.deepEqual([Math.round(end.x), Math.round(end.y)], [400, 200]);
  assert.ok(Math.abs(end.rotate - 12) < 1e-6);
  const middle = Fx.flightPoint(from, to, 0.5, 100);
  // Quadratische Bézier: y(0,5) = 0,25·Start + 0,5·Kontrollpunkt + 0,25·Ziel
  // y(0,5) liegt auf halber Höhe des Kontrollpunkts: (0 + 2·(−100) + 200) / 4 = 0
  assert.ok(Math.abs(middle.y) < 1e-6, `Bogenmitte ${middle.y}`);
  const quarter = Fx.flightPoint(from, to, 0.25, 100);
  assert.ok(quarter.y < 0, 'der Flug steigt über die Startlinie');
  assert.ok(middle.x > 0 && middle.x < 400, 'der Flug bleibt zwischen Start und Ziel');
});

test('Fächerlayout ist symmetrisch und skaliert mit der Kartenzahl', () => {
  const three = [0, 1, 2].map(index => Fx.fanTransform(index, 3));
  assert.equal(three[1].rotate, 0);
  assert.ok(Math.abs(three[0].rotate + three[2].rotate) < 1e-9);
  const wide = [0, 1, 2, 3].map(index => Fx.fanTransform(index, 4));
  // Der Fächer bleibt ein echter Fächer: gleicher Winkel pro Karte,
  // die Randkarten liegen weiter außen, die Mitte bleibt ruhig.
  assert.ok(Math.abs(wide[0].rotate) > Math.abs(three[0].rotate));
  assert.ok(Math.abs(wide.at(-1).rotate) < 34, 'Gesamtfächer bleibt begrenzt');
  assert.ok(wide[1].rotate < 0 && wide[2].rotate > 0, 'linke Hälfte links, rechte Hälfte rechts');
  assert.deepEqual(JSON.parse(JSON.stringify(Fx.fanTransform(0, 1))), { rotate: 0, lift: 0, order: 0 });
});

/* ================================================================ */
/* Integrität von HTML, CSS und Dokumentation                       */
/* ================================================================ */

const html = fs.readFileSync('arcanum_tarot_browsergame_codex.html', 'utf8');
const css = fs.readFileSync('css/arcanum.css', 'utf8');

test('HTML lädt alle Module in Abhängigkeitsreihenfolge', () => {
  const order = ['js/cards.js', 'js/card-art.js', 'js/rules.js', 'js/animations.js', 'js/scene3d.js', 'js/engine.js', 'js/app.js'];
  const positions = order.map(file => html.indexOf(`src="${file}"`));
  assert.ok(positions.every(position => position > -1), 'alle Skripte müssen eingebunden sein');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(html, /js\/game-engine\.js/, 'die alte Datei darf nicht mehr referenziert werden');
});

test('Jede im Code angesprochene Element-ID existiert genau einmal im HTML', () => {
  const ids = ['game-podium-overlay', 'game-human-hand', 'game-bid-buttons', 'game-bidding-controls',
    'game-bots-status', 'trick-cards-container', 'game-log', 'game-toast', 'game-round-info',
    'game-oracle-info', 'game-phase-info', 'game-human-bids-info', 'game-constraint-info',
    'hud-karma', 'hud-bid', 'hud-won', 'hud-cards-left', 'hud-name', 'hud-target', 'hud-oracle',
    'hud-opponents', 'hud-round-summary', 'hud-trick-tally', 'hud-round', 'hud-round-total',
    'hud-round-cards', 'hud-round-progress', 'hud-phase', 'hud-phase-detail', 'hud-phase-tile',
    'hud-mode-name', 'hud-mode-detail', 'hud-round-info', 'canvas-container', 'env-select',
    'game-player-count', 'game-start-btn', 'game-restart-btn', 'podium-new-game', 'card-dialog',
    'cards-grid', 'card-search', 'card-filter', 'card-sort', 'probChart', 'calc-bid', 'calc-won',
    'calc-courts', 'calc-stern', 'calc-stern-box', 'calc-courts-field', 'calc-result',
    'calc-breakdown', 'chart-explanation', 'codex-count', 'codex-effects-count', 'podium-confetti'];
  ids.forEach(id => {
    const occurrences = (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    assert.equal(occurrences, 1, `id="${id}" muss genau einmal vorkommen, gefunden: ${occurrences}`);
  });
  assert.equal(new Set(Array.from(html.matchAll(/id="([^"]+)"/g), match => match[1])).size,
    (html.match(/id="/g) || []).length, 'keine doppelten IDs');
});

test('Alle aria-labelledby-/aria-describedby-Verweise zeigen auf existierende IDs', () => {
  const targets = Array.from(html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g))
    .flatMap(match => match[1].split(/\s+/))
    .filter(Boolean);
  assert.ok(targets.length >= 6, 'Seitenbereiche müssen beschriftet sein');
  targets.forEach(id => {
    if (['rules-title'].includes(id)) return; // wird zur Laufzeit injiziert (geprüft in app.js)
    assert.ok(html.includes(`id="${id}"`), `aria-Verweis auf fehlende ID: ${id}`);
  });
  const appSource = fs.readFileSync('js/app.js', 'utf8');
  targets.filter(id => !html.includes(`id="${id}"`)).forEach(id => {
    assert.ok(appSource.includes(`id="${id}"`), `${id} muss zur Laufzeit erzeugt werden`);
  });
});

test('Handsortierung: Trümpfe zuerst, dann Farben, jeweils absteigend', () => {
  const hand = [MINOR('Kelche', 3), MINOR('Stäbe', 14), MAJOR(5), MINOR('Kelche', 1), MAJOR(21), MINOR('Stäbe', 2)];
  const sorted = Cards.sortHand(hand).map(card => card.uid);
  assert.deepEqual(JSON.parse(JSON.stringify(sorted)), [
    'major-21', 'major-5',
    'minor-Stäbe-14', 'minor-Stäbe-2',
    'minor-Kelche-1', 'minor-Kelche-3'
  ]);
  // Sortieren verändert die Hand nicht.
  assert.equal(hand.length, 6);
});

test('HTML bietet die zehn Orte des 3D-Manifests und semantische Grundstruktur', () => {
  const selector = html.match(/<select id="env-select">([\s\S]*?)<\/select>/);
  assert.ok(selector, 'Ortsauswahl fehlt');
  const optionIds = Array.from(selector[1].matchAll(/<option value="([^"]+)"/g), match => match[1]);
  assert.deepEqual(optionIds, Array.from(Scene.environments, room => room.id));
  ['<main', '<header', '<footer', '<section id="kodex"', 'role="log"', 'aria-live'].forEach(needle =>
    assert.ok(html.includes(needle), `${needle} fehlt`));
  assert.match(html, /<html lang="de"/);
  assert.match(html, /data-mode="turbo"/);
});

test('HUD ist groß und kontrastreich ausgelegt', () => {
  const hudRules = css.slice(css.indexOf('/* 4 · HUD'), css.indexOf('/* 5 · Bühne'));
  assert.match(hudRules, /\.hud-karma__value\s*\{[\s\S]*?font-size:\s*clamp\(52px, 6\.4vw, 86px\)/);
  assert.match(hudRules, /\.hud-tile__value\s*\{[\s\S]*?font-size:\s*clamp\(26px/);
  assert.ok((css.match(/font-variant-numeric: tabular-nums/g) || []).length >= 5, 'Zahlen brauchen Tabellenziffern');
  // Alle interaktiven Ziele mindestens 44 px
  assert.match(css, /\.primary-nav a \{[\s\S]*?min-height: 44px/);
  assert.match(css, /\.bid-button \{[\s\S]*?min-height: 54px/);
});

test('Stylesheet deckt alle Breakpoints und reduzierte Bewegung ab', () => {
  ['@media (max-width: 1180px)', '@media (max-width: 900px)', '@media (max-width: 700px)',
    '@media (max-width: 430px)', 'orientation: landscape',
    '@media (prefers-reduced-motion: reduce)'].forEach(needle =>
    assert.ok(css.includes(needle), `${needle} fehlt`));
  assert.match(css, /@media \(min-width: 1600px\)/);
});

test('Version ist in HTML, README, CHANGELOG und Regelkern konsistent', () => {
  const version = html.match(/<meta name="version" content="([^"]+)">/)[1];
  const readme = fs.readFileSync('README.md', 'utf8');
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  assert.match(readme, new RegExp(version.replace(/\./g, '\\.')));
  assert.ok(changelog.includes(`## ${version}`), 'Changelog braucht einen Eintrag zur Version');
  assert.match(Rules.RULESET_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(readme.includes('docs/ARCHITECTURE.md'));
});

test('Dokumentation beschreibt den Regelkern und die Kartenkunst', () => {
  const architecture = fs.readFileSync('docs/ARCHITECTURE.md', 'utf8');
  ['js/rules.js', 'js/card-art.js', 'js/animations.js', 'js/engine.js', 'resolveTrick',
    'Hofkarten-Segen', 'RULESET_VERSION', 'STATE_SCHEMA_VERSION'].forEach(needle =>
    assert.ok(architecture.includes(needle), `ARCHITECTURE.md muss ${needle} erwähnen`));
});
