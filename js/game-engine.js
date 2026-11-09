// Browser game state machine and game rules.
const GameEngine = {
            numPlayers: 3,
            currentRound: 1,
            maxRounds: 5,
            phase: 'bidding', // 'bidding', 'playing', 'roundOver', 'gameOver'
            players: [],
            currentTrick: [], // [{playerIdx, card}]
            leadSuit: null,
            activePlayerIdx: 0,
            activeOracle: null,
            timers: [],
            forcedPlayer: null,
            trumpBan: null,
            schedule(callback, delay) {
                const id = setTimeout(() => {
                    this.timers = this.timers.filter(timer => timer !== id);
                    callback();
                }, delay);
                this.timers.push(id);
            },

            generateUniqueDeck() {
                let deck = [];
                const suits = ['Stäbe', 'Kelche', 'Schwerter', 'Münzen'];

                // 56 Minor Arcana
                suits.forEach(suit => {
                    for (let v = 1; v <= 14; v++) {
                        deck.push({
                            uid: `minor-${suit}-${v}`,
                            isTrump: false,
                            suit: suit,
                            value: v === 1 ? 14.5 : v,
                            name: `${v === 1 ? 'As' : v === 11 ? 'Bube' : v === 12 ? 'Ritter' : v === 13 ? 'Königin' : v === 14 ? 'König' : v} der ${suit}`,
                            icon: suit === 'Stäbe' ? '🪵' : suit === 'Kelche' ? '🍷' : suit === 'Schwerter' ? '⚔️' : '🪙',
                            desc: `Kleine Arkana der ${suit}. Wert: ${v}. MUSS bedient werden!`
                        });
                    }
                });

                // 22 Major Arcana
                const majorNames = [
                    "0 - Der Narr", "I - Der Magier", "II - Hohepriesterin", "III - Die Herrscherin",
                    "IV - Der Herrscher", "V - Der Hierophant", "VI - Die Liebenden", "VII - Der Wagen",
                    "VIII - Gerechtigkeit", "IX - Der Eremit", "X - Rad des Schicksals", "XI - Kraft",
                    "XII - Gehängter", "XIII - Der Tod", "XIV - Mäßigkeit", "XV - Der Teufel",
                    "XVI - Der Turm", "XVII - Der Stern", "XVIII - Der Mond", "XIX - Die Sonne",
                    "XX - Gericht", "XXI - Die Welt"
                ];

                const majorIcons = ['🃏', '🪄', '🌙', '👑', '🏛️', '📜', '💞', '🛡️', '⚖️', '🕯️', '🎡', '🦁', '🙃', '☠️', '🏺', '🔥', '⚡', '⭐', '🌕', '☀️', '🔔', '🌍'];
                for (let i = 0; i < 22; i++) {
                    const info = ALL_CARDS.find(c => c.id === i);
                    deck.push({
                        uid: `major-${i}`,
                        isTrump: true,
                        trumpNum: i,
                        value: 100 + i,
                        name: majorNames[i],
                        icon: majorIcons[i],
                        desc: info ? info.desc : `Große Arkana #${i}. Höhere Nummer sticht.`
                    });
                }

                // Shuffle
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                return deck;
            },

            initGame(numPlayers = 3) {
                this.timers.forEach(clearTimeout);
                this.timers = [];
                this.numPlayers = Math.min(6, Math.max(2, parseInt(numPlayers, 10) || 3));
                this.currentRound = 1;
                this.maxRounds = currentActiveMode === 'turbo' ? 5 : 7;
                this.players = [];

                const podiumOverlay = document.getElementById('game-podium-overlay');
                const returnFocusToLobby = podiumOverlay && podiumOverlay.getAttribute('aria-hidden') === 'false';
                if (podiumOverlay) {
                    podiumOverlay.classList.add('hidden');
                    podiumOverlay.setAttribute('aria-hidden', 'true');
                }
                if (returnFocusToLobby && document.body) document.body.style.removeProperty('overflow');
                ['podium-1', 'podium-2', 'podium-3'].forEach(id => {
                    const podiumPlace = document.getElementById(id);
                    if (podiumPlace) podiumPlace.classList.remove('animate-podium-1', 'animate-podium-2', 'animate-podium-3');
                });

                this.players.push({ id: 0, name: "Du (Adept 1)", isBot: false, hand: [], bid: 0, won: 0, score: 0 });
                for(let i=1; i<this.numPlayers; i++) {
                    this.players.push({ id: i, name: `Bot ${i}`, isBot: true, hand: [], bid: 0, won: 0, score: 0 });
                }

                if(GameEngine3D.scene) GameEngine3D.spawnHumanoidAvatars(this.numPlayers);
                this.startRound();
                if (returnFocusToLobby) {
                    const startButton = document.getElementById('game-start-btn');
                    if (startButton) startButton.focus();
                }
            },

            startRound() {
                this.phase = 'bidding';
                this.currentTrick = [];
                this.leadSuit = null;
                this.forcedPlayer = null;
                this.trumpBan = null;
                const cardsPerPlayer = (currentActiveMode === 'turbo' ? 4 : 6) + this.currentRound;

                this.players.forEach(p => { p.hand = []; p.bid = 0; p.won = 0; });

                const deck = this.generateUniqueDeck();
                for(let i=0; i<cardsPerPlayer; i++) {
                    this.players.forEach(p => {
                        if(deck.length > 0) p.hand.push(deck.pop());
                    });
                }

                this.players[0].hand.sort((a,b) => b.value - a.value);

                if(currentActiveMode === 'standard') {
                    const oracles = ALL_CARDS.filter(c => c.type === 'orakel');
                    this.activeOracle = oracles[Math.floor(Math.random() * oracles.length)];
                } else {
                    this.activeOracle = null;
                }

                this.log(`🔮 Runde ${this.currentRound} (${cardsPerPlayer} Karten) gestartet. Gebote abgeben!`);
                this.renderUI();
            },

            submitHumanBid(bid) {
                if(this.phase !== 'bidding') return;
                this.players[0].bid = parseInt(bid);

                // Bots auto-bid logic
                for(let i=1; i<this.numPlayers; i++) {
                    const botHand = this.players[i].hand;
                    const trumpsCount = botHand.filter(c => c.isTrump).length;
                    this.players[i].bid = Math.min(botHand.length, Math.max(0, trumpsCount + (Math.random() > 0.4 ? 1 : 0)));
                }

                this.phase = 'playing';
                this.activePlayerIdx = (this.currentRound - 1) % this.numPlayers;

                this.log(`🎯 Visionen eingereicht! Anspiel: ${this.players[this.activePlayerIdx].name}`);
                this.renderUI();

                if(this.players[this.activePlayerIdx].isBot) {
                    this.schedule(() => this.playBotTurn(), 600);
                }
            },

            // Constraints are shared by human and bots so an effect cannot stall a turn.
            legalCardIndices(playerIdx) {
                const player = this.players[playerIdx];
                let indices = player.hand.map((_, index) => index);
                if (this.trumpBan === playerIdx) {
                    const nonTrumps = indices.filter(i => !player.hand[i].isTrump);
                    if (nonTrumps.length) indices = nonTrumps;
                }
                if (this.leadSuit && this.activeOracle?.id !== 104) {
                    const matching = indices.filter(i => !player.hand[i].isTrump && player.hand[i].suit === this.leadSuit);
                    if (matching.length) indices = indices.filter(i => player.hand[i].isTrump || player.hand[i].suit === this.leadSuit);
                }
                if (this.forcedPlayer === playerIdx && indices.length) {
                    const highest = Math.max(...indices.map(i => player.hand[i].value));
                    indices = indices.filter(i => player.hand[i].value === highest);
                }
                return indices;
            },

            playCard(playerIdx, cardIdx) {
                if (this.phase !== 'playing' || this.currentTrick.length >= this.numPlayers || playerIdx !== this.activePlayerIdx) return;
                const player = this.players[playerIdx];
                const card = player.hand[cardIdx];
                if (!card) return;
                if (!this.legalCardIndices(playerIdx).includes(cardIdx)) {
                    if (!player.isBot) alert('Diese Karte ist wegen Bedienpflicht oder eines Spezialeffekts nicht zulässig.');
                    return;
                }
                if (this.forcedPlayer === playerIdx) this.forcedPlayer = null;
                if (this.trumpBan === playerIdx) this.trumpBan = null;
                player.hand.splice(cardIdx, 1);
                if (this.currentTrick.length === 0 && !card.isTrump) this.leadSuit = card.suit;
                const hidden = currentActiveMode === 'standard' && card.isTrump && card.trumpNum === 18;
                this.currentTrick.push({ playerIdx, card, hidden });
                this.log(`🃏 ${player.name} spielt ${hidden ? 'eine verdeckte Karte' : card.name}`);
                // The Devil acts immediately; a Hierophant already in the trick suppresses it.
                if (currentActiveMode === 'standard' && card.isTrump && card.trumpNum === 15 &&
                    !this.currentTrick.some(item => item.card.isTrump && item.card.trumpNum === 5) && this.currentTrick.length < this.numPlayers) {
                    this.forcedPlayer = (playerIdx + 1) % this.numPlayers;
                    this.log('🔥 Der Teufel zwingt zur höchsten zulässigen Karte.');
                }
                if (this.currentTrick.length === this.numPlayers) {
                    this.renderUI();
                    this.schedule(() => this.evaluateTrick(), 900);
                } else {
                    this.activePlayerIdx = (this.activePlayerIdx + 1) % this.numPlayers;
                    this.renderUI();
                    if (this.players[this.activePlayerIdx].isBot) this.schedule(() => this.playBotTurn(), 600);
                }
            },

            playBotTurn() {
                const botIdx = this.activePlayerIdx;
                const bot = this.players[botIdx];
                if (!bot || !bot.isBot || this.phase !== 'playing') return;
                const legal = this.legalCardIndices(botIdx);
                if (legal.length) this.playCard(botIdx, legal[0]);
            },

            evaluateTrick() {
                const trick = this.currentTrick;
                if (trick.length !== this.numPlayers) return;
                const standard = currentActiveMode === 'standard';
                const has = n => trick.some(item => item.card.isTrump && item.card.trumpNum === n);
                const cancelled = standard && has(5);
                const oracle = standard ? this.activeOracle?.id : null;
                const minorValues = trick.filter(item => !item.card.isTrump).map(item => item.card.value);
                const maxMinor = minorValues.length ? Math.max(...minorValues) : 0;
                const rank = card => {
                    if (!cancelled && card.isTrump && card.trumpNum === 0) return -100;
                    if (!cancelled && standard && card.isTrump && card.trumpNum === 11) return 1000;
                    if (!cancelled && standard && card.isTrump && card.trumpNum === 1) return maxMinor + 0.5;
                    if (oracle === 110) {
                        if (card.isTrump) return 22 - card.trumpNum;
                        // Two is the highest card, followed by 3 ... King and Ace.
                        return 100 + (15 - card.value);
                    }
                    if (card.isTrump) return card.value;
                    if (oracle === 103 && card.suit === 'Kelche') return 50 + card.value;
                    return this.leadSuit && card.suit !== this.leadSuit ? -200 : card.value;
                };
                let winner = trick[0];
                for (const item of trick.slice(1)) if (rank(item.card) > rank(winner.card)) winner = item;
                const worldIdx = trick.findIndex(item => item.card.isTrump && item.card.trumpNum === 21);
                const foolIdx = trick.findIndex(item => item.card.isTrump && item.card.trumpNum === 0);
                if (!cancelled && worldIdx !== -1 && foolIdx === worldIdx + 1 && !(standard && has(11))) {
                    winner = trick[foolIdx];
                    this.log('✨ Der Narr entthront die Welt!');
                }
                if (trick.some(item => item.hidden)) this.log('🌙 Der Mond wird aufgedeckt.');
                if (cancelled) this.log('📜 Der Hierophant annulliert die Karteneffekte dieses Stichs.');
                const destroyed = !cancelled && has(16);
                const death = !cancelled && standard && has(13);
                const won = destroyed ? 0 : death ? 0.5 : 1;
                if (won) {
                    this.players[winner.playerIdx].won += won;
                    if (oracle === 106) {
                        const partner = winner.playerIdx % 2 === 0 ? winner.playerIdx + 1 : winner.playerIdx - 1;
                        if (this.players[partner]) this.players[partner].won += won;
                    }
                    this.log(`🏆 ${this.players[winner.playerIdx].name} erhält ${won} Stich(e)${death ? ' durch den Tod' : ''}.`);
                } else this.log('💥 Der Turm vernichtet den Stich.');

                if (!cancelled && standard) {
                    if (has(8)) trick.filter(item => item.playerIdx !== winner.playerIdx).forEach(item => {
                        this.players[item.playerIdx].score += 5;
                        this.log(`⚖️ ${this.players[item.playerIdx].name} erhält 5 Bonuspunkte.`);
                    });
                    if (has(2)) {
                        const player = this.players[winner.playerIdx];
                        const maxBid = (currentActiveMode === 'turbo' ? 4 : 6) + this.currentRound;
                        let delta = player.bid >= maxBid ? -1 : 1;
                        if (!player.isBot && player.bid > 0 && player.bid < maxBid) {
                            delta = confirm('Hohepriesterin: OK erhöht dein Gebot um 1, Abbrechen senkt es um 1.') ? 1 : -1;
                        }
                        player.bid += delta;
                        this.log(`🌙 ${player.name} korrigiert das Gebot auf ${player.bid}.`);
                    }
                    if (has(11)) this.trumpBan = trick.find(item => item.card.isTrump && item.card.trumpNum === 11).playerIdx;
                }
                this.currentTrick = [];
                this.leadSuit = null;
                this.forcedPlayer = null;
                this.activePlayerIdx = winner.playerIdx; // The winner always leads, including with the Chariot.
                if (this.players[0].hand.length === 0) this.evaluateRoundScores();
                else {
                    this.renderUI();
                    if (this.players[this.activePlayerIdx].isBot) this.schedule(() => this.playBotTurn(), 600);
                }
            },

            evaluateRoundScores() {
                this.phase = 'roundOver';
                this.log(`🏁 Runde ${this.currentRound} beendet. Auswertung:`);

                this.players.forEach(p => {
                    let rScore = 0;
                    if(p.bid === 0) {
                        rScore = p.won === 0 ? 50 : -50;
                    } else if(p.bid === p.won) {
                        rScore = 20 + (p.won * 10);
                    } else {
                        rScore = -(Math.abs(p.bid - p.won) * (currentActiveMode === 'standard' && p.won < p.bid ? 15 : 10));
                    }
                    if (p.bid > 0 && p.bid === p.won && this.activeOracle?.id === 117) rScore += 30;
                    p.score += rScore;
                    this.log(`📊 ${p.name}: Gebot ${p.bid} | Stiche ${p.won} -> Rundenpunkte: ${rScore} (Gesamt: ${p.score})`);
                });

                if(this.currentRound < this.maxRounds) {
                    this.currentRound++;
                    this.schedule(() => this.startRound(), 2200);
                } else {
                    this.phase = 'gameOver';
                    this.log(`👑 RITUAL VOLLENDET! Endstand ermittelt.`);
                    this.renderUI();
                    this.showPodium();
                }
            },

            showPodium() {
                const sorted = [...this.players].sort((a,b) => b.score - a.score);
                const overlay = document.getElementById('game-podium-overlay');
                
                document.getElementById('podium-1-name').textContent = sorted[0] ? sorted[0].name : '-';
                document.getElementById('podium-1-score').textContent = sorted[0] ? sorted[0].score + " Pkt" : '0';

                document.getElementById('podium-2-name').textContent = sorted[1] ? sorted[1].name : '-';
                document.getElementById('podium-2-score').textContent = sorted[1] ? sorted[1].score + " Pkt" : '0';

                document.getElementById('podium-3-name').textContent = sorted[2] ? sorted[2].name : '-';
                document.getElementById('podium-3-score').textContent = sorted[2] ? sorted[2].score + " Pkt" : '0';

                overlay.classList.remove('hidden');
                overlay.setAttribute('aria-hidden', 'false');
                if (document.body) document.body.style.overflow = 'hidden';
                overlay.focus();

                document.getElementById('podium-1').classList.add('animate-podium-1');
                document.getElementById('podium-2').classList.add('animate-podium-2');
                document.getElementById('podium-3').classList.add('animate-podium-3');
            },

            log(msg) {
                const logBox = document.getElementById('game-log');
                if(!logBox) return;
                const div = document.createElement('div');
                div.textContent = msg;
                logBox.appendChild(div);
                logBox.scrollTop = logBox.scrollHeight;
            },

            renderUI() {
                const cardsCount = (currentActiveMode === 'turbo' ? 4 : 6) + this.currentRound;
                document.getElementById('game-round-info').textContent = `Runde ${this.currentRound} von ${this.maxRounds} (${cardsCount} Karten)`;

                if(this.activeOracle) {
                    document.getElementById('game-oracle-info').textContent = `${this.activeOracle.name}`;
                } else {
                    document.getElementById('game-oracle-info').textContent = "Kein Orakel (Turbo)";
                }

                document.getElementById('game-phase-info').textContent = this.phase === 'bidding' ? "Vision (Bieten)" : (this.phase === 'playing' ? "Am Zug: " + this.players[this.activePlayerIdx].name : "Auswertung");
                if (typeof GameEngine3D !== 'undefined' && typeof GameEngine3D.setActivePlayer === 'function') {
                    GameEngine3D.setActivePlayer(this.phase === 'playing' ? this.activePlayerIdx : -1);
                }

                // Render Bots Status Bar
                const botStatusBox = document.getElementById('game-bots-status');
                botStatusBox.innerHTML = '';
                this.players.slice(1).forEach(bot => {
                    const activeStyle = (this.activePlayerIdx === bot.id && this.phase === 'playing') ? 'border-gold bg-gold/20' : 'border-gold/20 bg-occult-950/80';
                    botStatusBox.innerHTML += `
                        <div class="p-2 rounded-xl border ${activeStyle} text-center min-w-[100px]">
                            <div class="text-xs font-bold text-gold">${bot.name}</div>
                            <div class="text-[10px] text-purple-200">Gebot: ${bot.bid} | Stiche: ${bot.won}</div>
                            <div class="text-[10px] font-bold text-emerald-400">Karma: ${bot.score}</div>
                        </div>
                    `;
                });

                // Render Trick Cards
                const trickContainer = document.getElementById('trick-cards-container');
                trickContainer.innerHTML = '';
                this.currentTrick.forEach(item => {
                    const concealed = item.hidden && this.currentTrick.length < this.numPlayers;
                    const shownCard = concealed ? { desc: 'Wird am Ende des Stichs aufgedeckt', icon: '🌙', name: 'Verdeckte Karte' } : item.card;
                    trickContainer.innerHTML += `
                        <div data-tooltip="${shownCard.desc}" aria-label="${this.players[item.playerIdx].name}: ${shownCard.name}" class="occult-card-3d card-flying-in ${cardArtClass(shownCard)} card-on-table text-center shadow-2xl">
                            <div class="card-owner">${this.players[item.playerIdx].name}</div>
                            <div class="card-art"><span aria-hidden="true">${shownCard.icon}</span></div>
                            <div class="card-title">${shownCard.name}</div>
                            <div class="card-flourish" aria-hidden="true">✦</div>
                        </div>
                    `;
                });

                // Human Score
                const human = this.players[0];
                document.getElementById('game-human-score').textContent = `Karma: ${human.score} | Gewonnen: ${human.won}`;
                document.getElementById('game-human-bids-info').textContent = `(Deine Vision: ${human.bid})`;

                // Bidding Controls
                const bidControls = document.getElementById('game-bidding-controls');
                if(this.phase === 'bidding') {
                    bidControls.classList.remove('hidden');
                    const bidBtns = document.getElementById('game-bid-buttons');
                    bidBtns.innerHTML = '';
                    for(let b=0; b<=cardsCount; b++) {
                        bidBtns.innerHTML += `<button onclick="GameEngine.submitHumanBid(${b})" class="px-3 py-1.5 bg-gold text-black font-bold rounded-xl shadow active:scale-95">${b}</button>`;
                    }
                } else {
                    bidControls.classList.add('hidden');
                }

                // Human Hand Cards
                const handContainer = document.getElementById('game-human-hand');
                handContainer.innerHTML = '';
                human.hand.forEach((card, idx) => {
                    const isMyTurn = (this.activePlayerIdx === 0 && this.phase === 'playing');
                    handContainer.innerHTML += `
                        <button type="button" ${isMyTurn ? `onclick="GameEngine.playCard(0, ${idx})"` : 'disabled'} data-tooltip="${card.desc}" aria-label="${card.name}. ${card.desc}${isMyTurn ? ' Karte spielen.' : ' Noch nicht spielbar.'}" class="occult-card-3d hand-card ${cardArtClass(card)} ${isMyTurn ? 'cursor-pointer hover:border-gold-light' : 'opacity-70 cursor-not-allowed'} shadow-lg">
                            <span class="card-ribbon">${card.isTrump ? 'ARCANA MAIOR' : card.suit}</span>
                            <span class="card-art"><span aria-hidden="true">${card.icon}</span></span>
                            <span class="card-title">${card.name}</span>
                            <span class="card-flourish" aria-hidden="true">✦</span>
                        </button>
                    `;
                });
                if (typeof updateHandLayout === 'function') updateHandLayout();
            }
        };
