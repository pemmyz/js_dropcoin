document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL ELEMENTS ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const uiContainer = document.getElementById('ui');
    const scoreDisplay = document.getElementById('score-display');
    const coinsDisplay = document.getElementById('coins-display');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const styleToggleButton = document.getElementById('style-toggle-button');

    // --- GAME CONSTANTS & STATE ---
    const GRAVITY = 0.15;
    const DAMPING = 0.7;
    let score = 0;
    let coinsLeft = 10;
    let gameState = 'READY';
    let currentGameStyle = 'modern'; // 'modern' or 'classic'
    let coin = {};
    const pegs = [];
    const gates = [];

    // --- STYLE CONFIGURATIONS ---
    const gameStyles = {
        modern: {
            width: 600,
            height: 800,
            createPegs: (pegs, width, height) => {
                pegs.length = 0;
                const pegRows = 12, pegRadius = 6, startY = 100;
                const rowHeight = (height - 250) / pegRows;
                const pegsInFullRow = 9; // Max pegs in a non-offset row
                const rowWidth = width * 0.9;
                // Calculate spacing based on the row with the most pegs to ensure alignment
                const spacing = rowWidth / (pegsInFullRow - 1);
                const baseStartX = (width - rowWidth) / 2;

                for (let row = 0; row < pegRows; row++) {
                    const isOffsetRow = row % 2 !== 0; // Check if it's an odd-numbered row (1, 3, 5...)
                    const pegsInThisRow = isOffsetRow ? pegsInFullRow - 1 : pegsInFullRow;
                    // The startX for the offset row is shifted by half the spacing
                    const startX = isOffsetRow ? baseStartX + (spacing / 2) : baseStartX;

                    for (let col = 0; col < pegsInThisRow; col++) {
                        pegs.push({
                            x: startX + col * spacing,
                            y: startY + row * rowHeight,
                            radius: pegRadius,
                            color: '#ffc0cb'
                        });
                    }
                }
            },
            createGates: (gates, width, height) => {
                gates.length = 0;
                const gateCount = 7, gateHeight = 50;
                const gateValues = [10, 50, 100, 200, 100, 50, 10];
                const gateColors = ['#ff4444', '#44ff44', '#44aaff', '#ffff44', '#44aaff', '#44ff44', '#ff4444'];
                const gateWidth = width / gateCount;
                for (let i = 0; i < gateCount; i++) {
                    gates.push({ x: i * gateWidth, y: height - gateHeight, width: gateWidth, height: gateHeight, value: gateValues[i], color: gateColors[i] });
                }
            },
            handleScoring: (context) => {
                gameState = 'SCORED';
                let scored = false;
                gates.forEach(gate => {
                    if (context.coin.x > gate.x && context.coin.x < gate.x + gate.width) {
                        score += gate.value;
                        scored = true;
                    }
                });
                updateUI();
                setTimeout(resetCoin, 500); // Reset with delay
            }
        },
        classic: {
            width: 400,
            height: 600,
            createPegs: (pegs, width, height) => {
                pegs.length = 0;
                const pegRows = 9, pegRadius = 5, startY = 80, rowHeight = 55;
                const pegsInFullRow = 7; // Max pegs in a non-offset row
                const rowWidth = width * 0.8;
                // Calculate spacing based on the row with the most pegs
                const spacing = rowWidth / (pegsInFullRow - 1);
                const baseStartX = (width - rowWidth) / 2;

                for (let row = 0; row < pegRows; row++) {
                    const isOffsetRow = row % 2 !== 0; // Odd rows are offset (row 1, 3, 5...)
                    const pegsInThisRow = isOffsetRow ? pegsInFullRow - 1 : pegsInFullRow;
                    const startX = isOffsetRow ? baseStartX + (spacing / 2) : baseStartX;

                    // Add the main grid of pegs
                    for (let col = 0; col < pegsInThisRow; col++) {
                        pegs.push({
                            x: startX + col * spacing,
                            y: startY + row * rowHeight,
                            radius: pegRadius,
                            color: '#ffc0cb'
                        });
                    }

                    // *** CHANGE: On the offset rows, add pegs to the walls to block the sides ***
                    if (isOffsetRow) {
                        // Left wall peg
                        pegs.push({
                            x: pegRadius, // Positioned right at the edge
                            y: startY + row * rowHeight,
                            radius: pegRadius,
                            color: '#ffc0cb'
                        });
                        // Right wall peg
                        pegs.push({
                            x: width - pegRadius, // Positioned right at the other edge
                            y: startY + row * rowHeight,
                            radius: pegRadius,
                            color: '#ffc0cb'
                        });
                    }
                }
            },
            createGates: (gates, width, height) => {
                gates.length = 0;
                const gateCount = 5, gateHeight = 40;
                const gateValues = [10, 50, 100, 50, 10];
                const gateColors = ['#ff4444', '#44ff44', '#44aaff', '#44ff44', '#ff4444'];
                const gateWidth = width / gateCount;
                for (let i = 0; i < gateCount; i++) {
                    gates.push({ x: i * gateWidth, y: height - gateHeight, width: gateWidth, height: gateHeight, value: gateValues[i], color: gateColors[i] });
                }
            },
            handleScoring: (context) => {
                let scored = false;
                gates.forEach(gate => {
                    if (context.coin.x > gate.x && context.coin.x < gate.x + gate.width) {
                        score += gate.value;
                        scored = true;
                    }
                });
                updateUI();
                resetCoin(); // Reset instantly
            }
        }
    };

    // --- SHARED GAME FUNCTIONS ---

    function createCoin() {
        const style = gameStyles[currentGameStyle];
        return {
            x: style.width / 2, y: 40, radius: 12,
            color: '#ffff00', vx: 0, vy: 0
        };
    }

    function draw() {
        const style = gameStyles[currentGameStyle];
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, style.width, style.height);

        pegs.forEach(peg => {
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            ctx.fillStyle = peg.color;
            ctx.fill();
        });

        const gateTopY = style.height - gates[0].height;
        gates.forEach(gate => {
            ctx.fillStyle = gate.color;
            ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
            ctx.fillStyle = 'black';
            ctx.font = '24px "Courier New"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gate.value, gate.x + gate.width / 2, gate.y + gate.height / 2);
        });

        // --- DIVIDER DRAWING FIX ---
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        // Make the divider height relative to the gate height for consistency.
        const dividerHeightAboveGate = gates[0].height;
        for (let i = 1; i < gates.length; i++) {
            ctx.beginPath();
            // Start the line above the gates.
            ctx.moveTo(gates[i].x, gateTopY - dividerHeightAboveGate);
            // Draw it all the way to the bottom.
            ctx.lineTo(gates[i].x, style.height);
            ctx.stroke();
        }

        if (coin && gameState !== 'GAMEOVER') {
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fillStyle = coin.color;
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function update() {
        const style = gameStyles[currentGameStyle];
        if (gameState === 'DROPPING') {
            coin.vy += GRAVITY;
            coin.x += coin.vx;
            coin.y += coin.vy;

            if (coin.x - coin.radius < 0 || coin.x + coin.radius > style.width) {
                coin.vx *= -1;
                coin.x = Math.max(coin.radius, Math.min(style.width - coin.radius, coin.x));
            }

            pegs.forEach(peg => {
                const dx = coin.x - peg.x;
                const dy = coin.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < coin.radius + peg.radius) {
                    const angle = Math.atan2(dy, dx);
                    const magnitude = Math.sqrt(coin.vx ** 2 + coin.vy ** 2);
                    coin.vx = Math.cos(angle) * magnitude * DAMPING;
                    coin.vy = Math.sin(angle) * magnitude * DAMPING;
                    const overlap = coin.radius + peg.radius - distance;
                    coin.x += Math.cos(angle) * overlap;
                    coin.y += Math.sin(angle) * overlap;
                }
            });

            const gateTopY = style.height - gates[0].height;
            if (coin.y + coin.radius > gateTopY) {
                style.handleScoring({ coin: coin });
            }
        }
        draw();
        requestAnimationFrame(update);
    }

    function resetCoin() {
        if (coinsLeft > 0) {
            coin = createCoin();
            gameState = 'READY';
        } else {
            endGame();
        }
    }

    function updateUI() {
        scoreDisplay.textContent = score;
        coinsDisplay.textContent = coinsLeft;
    }

    function handleAim(e) {
        if (gameState !== 'READY') return;
        const style = gameStyles[currentGameStyle];
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX || e.changedTouches[0].clientX) - rect.left;
        coin.x = Math.max(coin.radius, Math.min(style.width - coin.radius, mouseX));
    }

    function handleDrop() {
        if (gameState !== 'READY') return;
        coinsLeft--;
        updateUI();
        gameState = 'DROPPING';
        coin.vx = (Math.random() - 0.5) * 2;
    }

    function startGame() {
        const style = gameStyles[currentGameStyle];

        canvas.width = style.width;
        canvas.height = style.height;
        uiContainer.style.width = `${style.width}px`;

        score = 0;
        coinsLeft = 10;
        gameOverScreen.classList.add('hidden');

        style.createPegs(pegs, style.width, style.height);
        style.createGates(gates, style.width, style.height);
        resetCoin();
        updateUI();
    }

    function endGame() {
        gameState = 'GAMEOVER';
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.remove('hidden');
    }

    function toggleStyle() {
        currentGameStyle = (currentGameStyle === 'modern') ? 'classic' : 'modern';
        styleToggleButton.textContent = `Switch to ${currentGameStyle === 'modern' ? 'Classic' : 'Modern'} Style`;
        startGame();
    }

    // --- EVENT LISTENERS ---
    canvas.addEventListener('mousemove', handleAim);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleAim(e); });
    canvas.addEventListener('click', handleDrop);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleDrop(); });
    restartButton.addEventListener('click', startGame);
    styleToggleButton.addEventListener('click', toggleStyle);

    // --- INITIALIZE GAME ---
    startGame();
    update();
});
