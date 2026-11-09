// DOM rendering, mode controls, rules reference, statistics, and startup.
// --- MODE SWITCHER & DYNAMIC UI LOGIC ---
        function switchRulesetMode(mode) {
            currentActiveMode = mode;
            const btnTurbo = document.getElementById('btn-mode-turbo');
            const btnStandard = document.getElementById('btn-mode-standard');
            const headerBadge = document.getElementById('header-mode-badge');
            const calcSternBox = document.getElementById('calc-stern-box');

            if(mode === 'turbo') {
                btnTurbo.className = "px-3 py-1 rounded-lg text-xs font-bold transition bg-turbo text-white";
                btnStandard.className = "px-3 py-1 rounded-lg text-xs font-bold transition text-purple-300 hover:text-white";
                headerBadge.textContent = "⚡ Turbo Edition";
                if(calcSternBox) calcSternBox.classList.add('opacity-40', 'pointer-events-none');
            } else {
                btnStandard.className = "px-3 py-1 rounded-lg text-xs font-bold transition bg-purple-600 text-white";
                btnTurbo.className = "px-3 py-1 rounded-lg text-xs font-bold transition text-purple-300 hover:text-white";
                headerBadge.textContent = "📜 Standard Edition";
                if(calcSternBox) calcSternBox.classList.remove('opacity-40', 'pointer-events-none');
            }

            renderDynamicRules();
            renderCards();
            updateChartData();
            calculateScore();
            GameEngine.initGame(document.getElementById('game-player-count').value);
        }

        function renderDynamicRules() {
            const container = document.getElementById('rules-view');
            if(currentActiveMode === 'turbo') {
                container.innerHTML = `
                    <div class="mb-4 border-b border-gold/30 pb-3">
                        <span class="text-xs font-bold uppercase tracking-widest text-turbo">Blitzschnell & Knallhart</span>
                        <h2 class="text-2xl font-serif font-bold text-gold mt-1">⚡ Arcanum Express (Turbo-Regeln)</h2>
                        <p class="text-xs text-purple-200 mt-1">Spieldauer: 20–30 Minuten über 5 Runden. Kein Orakel-Deck!</p>
                    </div>
                    <div class="grid sm:grid-cols-3 gap-4 text-xs text-purple-200">
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">1. Reine Ziffern-Hierarchie</strong>
                            Alle 22 Großen Arkana liegen im Deck. Ziffer sticht Ziffer (XXI sticht XX, etc.).
                        </div>
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">2. 3 Schlüsselkarten</strong>
                            0 - Narr verliert immer (außer nach XXI), XVI - Turm vernichtet Stich, XXI - Welt gewinnt.
                        </div>
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">3. Wertung & Bieten</strong>
                            Synchrone Bietphase. Exakter Treffer: +20 Basis + 10/Stich. Abweichung: -10/Differenz.
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="mb-4 border-b border-gold/30 pb-3">
                        <span class="text-xs font-bold uppercase tracking-widest text-purple-400">Strategisch & Tiefgründig</span>
                        <h2 class="text-2xl font-serif font-bold text-gold mt-1">📜 Arcanum Standard (Kodex-Regeln)</h2>
                        <p class="text-xs text-purple-200 mt-1">Spieldauer: 45–60 Minuten über 7 Runden. Orakel-Karten verändern Weltgesetze!</p>
                    </div>
                    <div class="grid sm:grid-cols-3 gap-4 text-xs text-purple-200">
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">1. Orakel-System</strong>
                            Fünf Orakel verändern die Runde: Kelche als niedrige Trümpfe, freie Wahl, Partnerschaft, umgekehrte Hierarchie oder Stern-Bonus.
                        </div>
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">2. Schicksalskarten</strong>
                            Das Deck enthält 22 Große Arkana. Die im Kodex beschriebenen Schicksalseffekte gelten im Standardmodus.
                        </div>
                        <div class="bg-occult-950 p-3 rounded-xl border border-gold/30">
                            <strong class="text-gold block mb-1">3. Hermetische Wertung</strong>
                            Unterbieten wird mit -15/Differenz härter bestraft als Überbieten (-10).
                        </div>
                    </div>
                `;
            }
        }

        function renderCards() {
            const grid = document.getElementById('cards-grid');
            const searchVal = document.getElementById('card-search').value.toLowerCase();
            const filterVal = document.getElementById('card-filter').value;
            grid.innerHTML = '';

            const filtered = ALL_CARDS.filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(searchVal) || c.desc.toLowerCase().includes(searchVal);
                let matchesFilter = true;

                if (filterVal === 'active') {
                    matchesFilter = (c.mode === currentActiveMode || c.mode === 'both');
                } else if (filterVal !== 'all') {
                    matchesFilter = (c.type === filterVal);
                }

                return matchesSearch && matchesFilter;
            });

            filtered.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = "bg-occult-950 border border-gold/40 rounded-xl p-3 hover:border-gold transition cursor-pointer";
                cardEl.setAttribute('data-tooltip', card.desc);
                cardEl.innerHTML = `
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-2xl">${card.icon}</span>
                        <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gold/20 text-gold">${card.type}</span>
                    </div>
                    <h4 class="font-serif font-bold text-white text-xs mb-1">${card.name}</h4>
                    <p class="text-[11px] text-purple-300 leading-tight">${card.desc}</p>
                `;
                grid.appendChild(cardEl);
            });
        }

        function trumpProbability(handSize) {
            let noTrump = 1;
            for (let i = 0; i < handSize; i++) noTrump *= (56 - i) / (78 - i);
            return Math.round((1 - noTrump) * 1000) / 10;
        }

        function initProbabilityChart() {
            if (typeof Chart === 'undefined') return;
            const ctx = document.getElementById('probChart').getContext('2d');
            const turboData = [5, 7, 9, 11, 13, 15].map(trumpProbability);
            const standardData = turboData;

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['5 Karten', '7 Karten', '9 Karten', '11 Karten', '13 Karten', '15 Karten'],
                    datasets: [{
                        label: 'Chance auf >= 1 Trumpf (%)',
                        data: currentActiveMode === 'turbo' ? turboData : standardData,
                        borderColor: currentActiveMode === 'turbo' ? '#ea580c' : '#a855f7',
                        backgroundColor: currentActiveMode === 'turbo' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#d4af37'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 50, max: 100, ticks: { color: '#d4af37', callback: v => v + '%' } },
                        x: { ticks: { color: '#d4af37' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            updateChartData();
        }

        function updateChartData() {
            if(!chartInstance) return;
            const turboData = [5, 7, 9, 11, 13, 15].map(trumpProbability);
            const standardData = turboData;

            chartInstance.data.datasets[0].data = currentActiveMode === 'turbo' ? turboData : standardData;
            chartInstance.data.datasets[0].borderColor = currentActiveMode === 'turbo' ? '#ea580c' : '#a855f7';
            chartInstance.update();

            const exp = document.getElementById('chart-explanation');
            exp.innerHTML = `<strong>Mathematik:</strong> Beide Spielmodi verwenden derzeit 22 Trümpfe im 78-Karten-Deck. Bei 5 Handkarten beträgt die Chance auf mindestens einen Trumpf <strong>${trumpProbability(5)}%</strong>.`;
        }

        function calculateScore() {
            const bid = parseInt(document.getElementById('calc-bid').value) || 0;
            let won = parseInt(document.getElementById('calc-won').value) || 0;
            const isTurm = document.getElementById('calc-turm').checked;
            const isStern = document.getElementById('calc-stern').checked;

            if(isTurm && won > 0) won -= 1;

            let score = 0;
            let breakdown = [];

            if(bid === 0) {
                if(won === 0) { score += 50; breakdown.push("Null-Ansage geschafft (+50)"); }
                else { score -= 50; breakdown.push("Null-Ansage gescheitert (-50)"); }
            } else {
                if(bid === won) {
                    score += 20 + (won * 10);
                    breakdown.push(`Exakt getroffen (+20 Basis + ${won * 10} Stiche)`);
                    if(isStern && currentActiveMode === 'standard') {
                        score += 30;
                        breakdown.push("Stern Bonus (+30)");
                    }
                } else {
                    const diff = Math.abs(bid - won);
                    const pen = diff * (currentActiveMode === 'standard' && won < bid ? 15 : 10);
                    score -= pen;
                    breakdown.push(`Differenz: ${diff} Stiche (Malus: -${pen})`);
                }
            }

            const resBox = document.getElementById('calc-result');
            resBox.textContent = (score >= 0 ? "+" : "") + score + " Punkte";
            resBox.className = `sm:col-span-2 text-center text-3xl font-serif font-bold mt-2 ${score >= 0 ? 'text-gold' : 'text-red-400'}`;
            document.getElementById('calc-breakdown').textContent = breakdown.join(" | ");
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (typeof THREE !== 'undefined') GameEngine3D.init();
            else document.getElementById('canvas-container').textContent = '3D-Ansicht konnte nicht geladen werden; das Kartenspiel bleibt spielbar.';
            renderDynamicRules();
            renderCards();
            initProbabilityChart();
            calculateScore();
            GameEngine.initGame(3);
        });
