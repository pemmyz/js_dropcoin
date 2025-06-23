document.addEventListener('DOMContentLoaded', () => {
    // --- SETUP ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreDisplay = document.getElementById('score-display');
    const coinsDisplay = document.getElementById('coins-display');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    // Game constants
    const WIDTH = 400;
    const HEIGHT = 600;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const GRAVITY = 0.15;
    const DAMPING = 0.7; // Energy loss on bounce

    // Game state
    let score = 0;
    let coinsLeft = 10;
    let gameState = 'READY'; // Can be 'READY', 'DROPPING', 'GAMEOVER'

    // Game Objects
    let coin = {};
    const pegs = [];
    const gates = [];

    // --- OBJECT CREATION ---

    function createCoin() {
        return {
            x: WIDTH / 2,
            y: 30,
            radius: 12,
            color: '#ffff00',
            vx: 0,
            vy: 0
        };
    }

    function createPegs() {
        pegs.length = 0; // Clear existing pegs
        const pegRows = 9;
        const pegRadius = 5;
        const startY = 80;
        const rowHeight = 55;

        for (let row = 0; row < pegRows; row++) {
            const pegsInRow = row % 2 === 0 ? 7 : 6;
            const rowWidth = WIDTH * 0.8;
            const spacing = rowWidth / (pegsInRow - 1);
            const startX = (WIDTH - rowWidth) / 2;

            for (let col = 0; col < pegsInRow; col++) {
                pegs.push({
                    x: startX + col * spacing,
                    y: startY + row * rowHeight,
                    radius: pegRadius,
                    color: '#ffc0cb' // Pink pegs
                });
            }
        }
    }

    function createGates() {
        gates.length = 0;
        const gateCount = 5;
        const gateWidth = WIDTH / gateCount;
        const gateValues = [10, 50, 100, 50, 10];
        const gateColors = ['#ff4444', '#44ff44', '#44aaff', '#44ff44', '#ff4444'];

        for (let i = 0; i < gateCount; i++) {
            gates.push({
                x: i * gateWidth,
                y: HEIGHT - 40,
                width: gateWidth,
                height: 40,
                value: gateValues[i],
                color: gateColors[i]
            });
        }
    }

    // --- DRAWING FUNCTIONS ---

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw pegs
        pegs.forEach(peg => {
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            ctx.fillStyle = peg.color;
            ctx.fill();
        });

        // Draw gates
        gates.forEach(gate => {
            ctx.fillStyle = gate.color;
            ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
            ctx.fillStyle = 'black';
            ctx.font = '20px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(gate.value, gate.x + gate.width / 2, gate.y + 28);
        });
        
        // Draw dividers between gates
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        for (let i = 1; i < gates.length; i++) {
            ctx.beginPath();
            ctx.moveTo(gates[i].x, HEIGHT - 80);
            ctx.lineTo(gates[i].x, HEIGHT);
            ctx.stroke();
        }

        // Draw coin
        if (gameState !== 'GAMEOVER') {
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fillStyle = coin.color;
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // --- GAME LOGIC & PHYSICS ---

    function update() {
        if (gameState === 'DROPPING') {
            // Apply gravity
            coin.vy += GRAVITY;

            // Move coin
            coin.x += coin.vx;
            coin.y += coin.vy;

            // Wall collisions
            if (coin.x - coin.radius < 0 || coin.x + coin.radius > WIDTH) {
                coin.vx *= -1; // Reverse horizontal velocity
                coin.x = Math.max(coin.radius, Math.min(WIDTH - coin.radius, coin.x)); // Clamp position
            }

            // Peg collisions
            pegs.forEach(peg => {
                const dx = coin.x - peg.x;
                const dy = coin.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < coin.radius + peg.radius) {
                    const angle = Math.atan2(dy, dx);
                    const magnitude = Math.sqrt(coin.vx ** 2 + coin.vy ** 2);
                    
                    coin.vx = Math.cos(angle) * magnitude * DAMPING;
                    coin.vy = Math.sin(angle) * magnitude * DAMPING;

                    // Push coin out of peg to prevent sticking
                    const overlap = coin.radius + peg.radius - distance;
                    coin.x += Math.cos(angle) * overlap;
                    coin.y += Math.sin(angle) * overlap;
                }
            });

            // Check for scoring or missing
            if (coin.y + coin.radius > HEIGHT - 40) {
                checkGates();
            }
        }
        
        draw();
        requestAnimationFrame(update);
    }
    
    function checkGates() {
        let scored = false;
        gates.forEach(gate => {
            if (coin.x > gate.x && coin.x < gate.x + gate.width) {
                score += gate.value;
                scored = true;
            }
        });
        
        // If coin falls through a gap, it's just a miss
        if (scored) {
            console.log("Score:", score);
        } else {
            console.log("Missed!");
        }
        
        updateUI();
        resetCoin();
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

    // --- EVENT LISTENERS & GAME FLOW ---

    function handleAim(e) {
        if (gameState !== 'READY') return;
        
        const rect = canvas.getBoundingClientRect();
        // Use clientX for mouse, and changedTouches for touch
        const mouseX = (e.clientX || e.changedTouches[0].clientX) - rect.left;
        
        // Clamp coin position to be within the canvas walls
        coin.x = Math.max(coin.radius, Math.min(WIDTH - coin.radius, mouseX));
    }
    
    function handleDrop() {
        if (gameState !== 'READY') return;
        coinsLeft--;
        updateUI();
        gameState = 'DROPPING';
        coin.vx = (Math.random() - 0.5) * 2; // Add a tiny bit of random horizontal push
    }

    function startGame() {
        score = 0;
        coinsLeft = 10;
        gameState = 'READY';
        gameOverScreen.classList.add('hidden');
        
        createPegs();
        createGates();
        resetCoin();
        updateUI();
    }

    function endGame() {
        gameState = 'GAMEOVER';
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.remove('hidden');
    }

    // Assign event listeners
    canvas.addEventListener('mousemove', handleAim);
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent screen scrolling
        handleAim(e);
    });

    canvas.addEventListener('click', handleDrop);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDrop(e);
    });

    restartButton.addEventListener('click', startGame);

    // --- INITIALIZE GAME ---
    startGame();
    update(); // Start the game loop
});
