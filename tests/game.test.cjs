const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = ['js/cards.js', 'js/scene3d.js', 'js/game-engine.js', 'js/app.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const context = { document: { addEventListener() {} }, setTimeout, clearTimeout, Math, console };
vm.createContext(context);
vm.runInContext(script + '\nthis.engine = GameEngine; this.probability = trumpProbability; this.setMode = mode => currentActiveMode = mode; this.environments = GameEngine3D.environments; this.cameraDistance = aspect => GameEngine3D.cameraDistanceForAspect(aspect); this.handLayout = (width, count) => GameEngine3D.handLayout(width, count);', context);
const game = context.engine;
game.log = () => {};
game.renderUI = () => {};

test('Deck enthält 78 eindeutige Karten und 22 Trümpfe', () => {
  const deck = game.generateUniqueDeck();
  assert.equal(deck.length, 78);
  assert.equal(new Set(deck.map(c => c.uid)).size, 78);
  assert.equal(deck.filter(c => c.isTrump).length, 22);
});

test('Große Arkana besitzen jeweils ein individuelles Spielkartensymbol', () => {
  const majors = game.generateUniqueDeck().filter(card => card.isTrump);
  assert.equal(majors.length, 22);
  assert.equal(new Set(majors.map(card => card.icon)).size, 22);
});

test('Wahrscheinlichkeit entspricht Ziehen ohne Zurücklegen', () => {
  assert.equal(context.probability(0), 0);
  assert.equal(context.probability(1), 28.2);
  assert.equal(context.probability(5), 81.9);
});

test('Zehn Ortsprofile haben individuelle Architekturbauer und vollständige Beschreibungen', () => {
  const environments = Array.from(context.environments);
  assert.equal(environments.length, 10);
  assert.equal(new Set(environments.map(room => room.id)).size, 10);
  assert.equal(new Set(environments.map(room => room.architecture)).size, 10);
  assert.ok(environments.every(room => room.label.length > 8 && room.description.length > 45));
  const sceneSource = fs.readFileSync('js/scene3d.js', 'utf8');
  for (const room of environments) {
    const method = `build${room.architecture[0].toUpperCase()}${room.architecture.slice(1)}`;
    assert.ok(sceneSource.includes(`${method}(profile)`), `${room.id} has ${method}`);
  }
});

test('3D-Kamera zoomt im Hochformat weiter heraus als auf breiten Displays', () => {
  const portrait = context.cameraDistance(0.68);
  const tablet = context.cameraDistance(1.2);
  const ultrawide = context.cameraDistance(2.5);
  assert.ok(Number.isFinite(portrait) && Number.isFinite(tablet) && Number.isFinite(ultrawide));
  assert.ok(portrait > tablet && tablet > ultrawide);
  assert.ok(portrait <= 54 && ultrawide >= 25);
});

test('Handkarten-Layout hält auf Touch-Geräten mindestens 44 Pixel der Karte sichtbar', () => {
  const phone = context.handLayout(360, 13);
  const desktop = context.handLayout(1200, 10);
  assert.ok(phone.cardWidth >= 60);
  assert.ok(phone.cardWidth - phone.overlap >= 44);
  assert.ok(phone.totalWidth > 360, 'größere Hände bleiben scrollbar statt auf unantippbare Streifen zu schrumpfen');
  assert.ok(desktop.cardWidth <= 124);
  assert.ok(desktop.totalWidth <= 1200);
  assert.deepEqual(JSON.parse(JSON.stringify(context.handLayout(360, 0))), { cardWidth: 0, overlap: 0, totalWidth: 0 });
});

test('HTML bietet genau die zehn Orte des 3D-Manifests an und enthält mobile Layout-Hooks', () => {
  const html = fs.readFileSync('arcanum_tarot_browsergame_codex.html', 'utf8');
  const selector = html.match(/<select id="env-select"[\s\S]*?<\/select>/);
  assert.ok(selector, 'environment select exists');
  const optionIds = Array.from(selector[0].matchAll(/<option value="([^"]+)"/g), match => match[1]);
  assert.deepEqual(optionIds, Array.from(context.environments, room => room.id));
  assert.match(html, /id="mobile-nav-toggle"/);
  assert.match(html, /id="game-human-hand"/);
  const css = fs.readFileSync('css/arcanum.css', 'utf8');
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /orientation: landscape/);
});

test('Narr verliert; unmittelbar nach Welt gewinnt er', () => {
  const fool = { isTrump: true, trumpNum: 0, value: 100 };
  const world = { isTrump: true, trumpNum: 21, value: 121 };
  const minor = { isTrump: false, suit: 'Kelche', value: 2 };
  function evaluate(cards) {
    game.players = cards.map((_, id) => ({ id, hand: [{}], won: 0, isBot: false }));
    game.currentTrick = cards.map((card, playerIdx) => ({ card, playerIdx }));
    game.leadSuit = 'Kelche'; game.numPlayers = cards.length;
    game.evaluateTrick();
    return game.players.map(p => p.won);
  }
  assert.deepEqual(Array.from(evaluate([fool, minor])), [0, 1]);
  assert.deepEqual(Array.from(evaluate([world, fool])), [0, 1]);
});

test('Standardwertung und Sternbonus', () => {
  context.setMode('standard');
  game.players = [{ name: 'A', bid: 2, won: 1, score: 0 }, { name: 'B', bid: 2, won: 2, score: 0 }];
  game.activeOracle = { id: 117 }; game.currentRound = 1; game.maxRounds = 2;
  game.schedule = () => {};
  game.evaluateRoundScores();
  assert.equal(game.players[0].score, -15);
  assert.equal(game.players[1].score, 70);
});

const major = n => ({ isTrump: true, trumpNum: n, value: 100 + n, name: `Trumpf ${n}` });
const minor = (suit, value) => ({ isTrump: false, suit, value, name: `${suit} ${value}` });
function setup(cards, oracle = null, mode = 'standard') {
  context.setMode(mode);
  game.players = cards.map((_, id) => ({ id, name: `P${id}`, hand: [minor('Stäbe', 3)], bid: 1, won: 0, score: 0, isBot: true }));
  game.numPlayers = cards.length;
  game.currentTrick = cards.map((card, playerIdx) => ({ card, playerIdx }));
  game.leadSuit = 'Stäbe'; game.activeOracle = oracle ? { id: oracle } : null;
  game.phase = 'playing'; game.currentRound = 1; game.trumpBan = null; game.forcedPlayer = null;
}

test('Herrscherin und Rad ändern die Hierarchie', () => {
  setup([minor('Stäbe', 14), minor('Kelche', 2)], 103);
  game.evaluateTrick(); assert.equal(game.players[1].won, 1);
  setup([major(21), minor('Stäbe', 2)], 110);
  game.evaluateTrick(); assert.equal(game.players[1].won, 1);
});

test('Liebende teilen Stiche paarweise; letzter Spieler bleibt allein', () => {
  setup([major(20), minor('Stäbe', 2), minor('Stäbe', 3)], 106);
  game.evaluateTrick(); assert.deepEqual(Array.from(game.players, p => p.won), [1, 1, 0]);
});

test('Magier, Kraft, Tod und Gerechtigkeit wirken bei der Auswertung', () => {
  setup([major(1), minor('Stäbe', 14), major(13), major(8)]);
  game.evaluateTrick();
  assert.equal(game.players[2].won, .5);
  assert.deepEqual(Array.from(game.players, p => p.score), [5, 5, 0, 5]);
  setup([major(1), minor('Stäbe', 14)]);
  game.evaluateTrick(); assert.equal(game.players[0].won, 1);
  setup([major(11), major(21)]);
  game.evaluateTrick(); assert.equal(game.players[0].won, 1); assert.equal(game.trumpBan, 0);
});

test('Hierophant unterdrückt Turm, Tod und weitere nachträgliche Effekte', () => {
  setup([major(5), major(16), major(13), major(8)]);
  game.evaluateTrick();
  assert.deepEqual(Array.from(game.players, p => p.won), [0, 1, 0, 0]);
  assert.deepEqual(Array.from(game.players, p => p.score), [0, 0, 0, 0]);
});

test('Hohepriesterin korrigiert Bot-Gebot und Wagen lässt Gewinner eröffnen', () => {
  setup([major(2), major(7)]);
  game.evaluateTrick(); assert.equal(game.players[1].bid, 2); assert.equal(game.activePlayerIdx, 1);
});

test('Teufel und Kraft beachten zulässige Karten, Herrscher hebt Farbpflicht auf', () => {
  setup([minor('Stäbe', 2), major(15)]);
  game.players[0].hand = [minor('Stäbe', 3), minor('Kelche', 14), major(21)];
  game.forcedPlayer = 0;
  assert.deepEqual(Array.from(game.legalCardIndices(0)), [2]);
  game.trumpBan = 0;
  assert.deepEqual(Array.from(game.legalCardIndices(0)), [0]);
  game.activeOracle = { id: 104 }; game.forcedPlayer = null;
  assert.deepEqual(Array.from(game.legalCardIndices(0)), [0, 1]);
});

test('Mond bleibt bis zum vollständigen Stich verdeckt und Teufel zwingt den nächsten Zug', () => {
  setup([major(18), major(15), minor('Stäbe', 2)]);
  game.currentTrick = []; game.activePlayerIdx = 0; game.leadSuit = null;
  game.players[0].hand = [major(18)]; game.players[1].hand = [major(15)];
  game.players[2].hand = [minor('Stäbe', 2), minor('Kelche', 10)];
  game.playCard(0, 0); assert.equal(game.currentTrick[0].hidden, true);
  game.playCard(1, 0); assert.equal(game.forcedPlayer, 2);
  assert.deepEqual(Array.from(game.legalCardIndices(2)), [1]);
  game.playCard(2, 0); assert.equal(game.players[2].hand.length, 2);
  game.playCard(2, 1); assert.equal(game.currentTrick.length, 3);
});
