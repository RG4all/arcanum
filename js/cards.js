// Full Card Registry (Strict Uniques)
        const ALL_CARDS = [
            { id: 0, name: "0 - Der Narr", type: "turbo", mode: "turbo", icon: "🃏", desc: "TURBO: Verliert JEDEN Stich. Stiehlt den Stich NUR, wenn er DIREKT nach der XXI (Die Welt) gespielt wird!" },
            { id: 16, name: "XVI - Der Turm", type: "turbo", mode: "turbo", icon: "⚡", desc: "TURBO: Zerstört den Stich vollkommen! Alle Karten wandern in den Limbus, niemand erhält den Stich." },
            { id: 21, name: "XXI - Die Welt", type: "turbo", mode: "turbo", icon: "🌍", desc: "TURBO: Höchster Trumpf im Spiel. Schlägt alle 77 anderen Karten (außer Narr kommt direkt danach)." },
            { id: 1, name: "I - Der Magier", type: "schicksal", mode: "standard", icon: "🪄", desc: "STANDARD: Passt sich an. Zählt 0,5 höher als die höchste Kleine Arkana im Stich (ohne Kleine Arkana: 0,5)." },
            { id: 2, name: "II - Hohepriesterin", type: "schicksal", mode: "standard", icon: "🌙", desc: "STANDARD: Wer gewinnt, MUSS sein Gebot sofort um +1 oder -1 korrigieren." },
            { id: 5, name: "V - Der Hierophant", type: "schicksal", mode: "standard", icon: "📜", desc: "STANDARD: Annulliert alle Karteneffekte im Stich. Nur reine Werte zählen." },
            { id: 7, name: "VII - Der Wagen", type: "schicksal", mode: "standard", icon: "⚔️", desc: "STANDARD: Gewinner MUSS den nächsten Stich eröffnen." },
            { id: 8, name: "VIII - Gerechtigkeit", type: "schicksal", mode: "standard", icon: "⚖️", desc: "STANDARD: Alle anderen Spieler erhalten +5 Bonuspunkte, auch wenn der Stich zerstört wird." },
            { id: 11, name: "XI - Kraft", type: "schicksal", mode: "standard", icon: "🦁", desc: "STANDARD: Schlägt alle, aber Spieler darf im Folge-Stich keinen Trumpf legen." },
            { id: 13, name: "XIII - Der Tod", type: "schicksal", mode: "standard", icon: "💀", desc: "STANDARD: Der rechnerische Gewinner erhält statt eines ganzen Stichs 0,5 Stiche; der Turm hat Vorrang." },
            { id: 15, name: "XV - Der Teufel", type: "schicksal", mode: "standard", icon: "🔥", desc: "STANDARD: Zwingt den nächsten Spieler im selben Stich, seine höchste zulässige Karte zu legen." },
            { id: 18, name: "XVIII - Der Mond", type: "schicksal", mode: "standard", icon: "🔮", desc: "STANDARD: Wird verdeckt gespielt. Wert wird erst am Ende enthüllt." },
            { id: 103, name: "III - Die Herrscherin", type: "orakel", mode: "standard", icon: "👑", desc: "ORAKEL: Kelche (Wasser) gelten in dieser Runde als niedrige Trumps." },
            { id: 104, name: "IV - Der Herrscher", type: "orakel", mode: "standard", icon: "🏛️", desc: "ORAKEL: Bedienpflicht aufgehoben. Trumps jederzeit erlaubt." },
            { id: 106, name: "VI - Die Liebenden", type: "orakel", mode: "standard", icon: "💖", desc: "ORAKEL: Nachbarsitze bilden Paare; beide erhalten jeden Stich ihres Partners. Bei ungerader Zahl spielt der letzte allein." },
            { id: 110, name: "X - Rad des Schicksals", type: "orakel", mode: "standard", icon: "🎡", desc: "ORAKEL: Hierarchie invertiert: 2 ist am höchsten, danach 3 bis Ass; Große Arkana darunter von 0 bis XXI." },
            { id: 117, name: "XVII - Der Stern", type: "orakel", mode: "standard", icon: "⭐", desc: "ORAKEL: Exakte Treffer erhalten +30 Bonuspunkte." }
        ];

        let currentActiveMode = 'turbo';
        let chartInstance = null;

        function cardArtClass(card) {
            if (card.isTrump) return `card-arcana arcana-${card.trumpNum ?? 0}`;
            const suit = (card.suit || '').toLowerCase();
            return `card-minor suit-${suit === 'kelche' ? 'cups' : suit === 'stäbe' ? 'wands' : suit === 'schwerter' ? 'swords' : 'pentacles'}`;
        }
