const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const startHighscoreDisplay = document.getElementById('start-highscore');
const gameoverHighscoreDisplay = document.getElementById('gameover-highscore');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highscore = localStorage.getItem('flappyPigHighScore') || 0;
let frames = 0;
let animationId;

// Physics / Mechanics Constants
const GRAVITY = 0.25;
const FLAP_FORCE = -5.5;
let gameSpeed = 2.5;

// Variables to keep track of dynamic difficulty
let baseSpeed = 2.5;
let speedMultiplier = 1;

// Dimensions
let LOGICAL_WIDTH = 400;
let LOGICAL_HEIGHT = 600;
let CW = LOGICAL_WIDTH;
let CH = LOGICAL_HEIGHT;

function resizeGame() {
    const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let scale;
    if (isMobile) {
        LOGICAL_WIDTH = 400;
        // Make the width match the window horizontally
        scale = window.innerWidth / LOGICAL_WIDTH;
        // Extend the height so it covers the whole screen height
        LOGICAL_HEIGHT = window.innerHeight / scale;
    } else {
        LOGICAL_WIDTH = 400;
        LOGICAL_HEIGHT = 600;
        const scaleX = window.innerWidth / LOGICAL_WIDTH;
        const scaleY = window.innerHeight / LOGICAL_HEIGHT;
        // Scale with a 95% threshold to ensure it doesn't touch the exact edges on desktop
        scale = Math.min(scaleX, scaleY) * 0.95; 
    }
    
    CW = LOGICAL_WIDTH;
    CH = LOGICAL_HEIGHT;
    
    const displayWidth = LOGICAL_WIDTH * scale;
    const displayHeight = LOGICAL_HEIGHT * scale;
    
    const container = document.getElementById('game-container');
    container.style.width = `${displayWidth}px`;
    container.style.height = `${displayHeight}px`;
    container.style.borderRadius = isMobile ? '0' : '16px';

    const uiLayer = document.getElementById('ui-layer');
    uiLayer.style.width = `${LOGICAL_WIDTH}px`;
    uiLayer.style.height = `${LOGICAL_HEIGHT}px`;
    uiLayer.style.transform = `scale(${scale})`;
    uiLayer.style.transformOrigin = 'top left';

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale * dpr, scale * dpr);
    
    if (gameState === 'START') {
        pig.y = CH / 2;
    }
    
    if (gameState !== 'PLAYING') {
        if (bg.clouds && bg.clouds.length > 0) draw();
    }
}

window.addEventListener('resize', resizeGame);

// Sky Background Colors
const SKY_COLORS = ["#87CEEB", "#61C5FF", "#add8e6"];

// --- GAME ENTITIES ---

const pig = {
    x: 80,
    y: CH / 2,
    radius: 15,
    velocity: 0,
    flapAngle: 0,
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotation based on velocity
        let rotation = Math.min((this.velocity * 0.1), Math.PI / 4);
        ctx.rotate(rotation);

        // Draw Pig Body (Pink)
        ctx.fillStyle = '#ff9bcc';
        ctx.beginPath();
        // Slightly oval
        ctx.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d66ba8';
        ctx.stroke();

        // Pig Snout
        ctx.fillStyle = '#ff66aa';
        ctx.beginPath();
        ctx.ellipse(16, 2, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Snout holes
        ctx.fillStyle = '#cc0066';
        ctx.beginPath();
        ctx.arc(14, 0, 1.5, 0, Math.PI*2);
        ctx.arc(18, 0, 1.5, 0, Math.PI*2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, -5, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(10, -5, 2, 0, Math.PI*2);
        ctx.fill();

        // Wing
        // Flap animation based on frames
        let wingY = (frames % 20 < 10) ? -8 : 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-5, wingY, 10, 6, -Math.PI/6, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#cccccc';
        ctx.stroke();

        ctx.restore();
    },
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;

        // Ground collision (approx)
        if (this.y + 20 >= CH - 50) { 
            this.y = CH - 50 - 20;
            triggerGameOver();
        }
        
        // Ceiling collision
        if (this.y - 20 <= 0) {
            this.y = 20;
            this.velocity = 0;
        }
    },
    flap() {
        this.velocity = FLAP_FORCE;
        playFlapSound();
    },
    reset() {
        this.y = CH / 2;
        this.velocity = 0;
    }
};

const obstacles = {
    list: [],
    gap: 140,
    width: 60,
    dx: gameSpeed,
    draw() {
        for (let i = 0; i < this.list.length; i++) {
            let p = this.list[i];
            
            ctx.fillStyle = '#cd853f'; // Wood/barn color
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 4;

            // Top Pipe
            ctx.fillRect(p.x, 0, this.width, p.top);
            ctx.strokeRect(p.x, 0, this.width, p.top);

            // Roof texture (simple lines)
            ctx.beginPath();
            ctx.moveTo(p.x, p.top - 10);
            ctx.lineTo(p.x + this.width, p.top - 10);
            ctx.stroke();

            // Bottom Pipe
            let bottomY = p.top + this.gap;
            let bottomHeight = CH - bottomY - 50; // 50 is ground height
            ctx.fillRect(p.x, bottomY, this.width, bottomHeight);
            ctx.strokeRect(p.x, bottomY, this.width, bottomHeight);
            
            // Roof texture
            ctx.beginPath();
            ctx.moveTo(p.x, bottomY + 10);
            ctx.lineTo(p.x + this.width, bottomY + 10);
            ctx.stroke();
        }
    },
    update() {
        // Spawn
        if (frames % Math.floor(100 / speedMultiplier) === 0) {
            // vary the y position of the gap
            let topPosition = (Math.random() * (CH / 2)) + 50;
            this.list.push({
                x: CW,
                top: topPosition,
                passed: false
            });
        }

        for (let i = 0; i < this.list.length; i++) {
            let p = this.list[i];
            p.x -= this.dx * speedMultiplier;

            // Collision Detection
            // Pig bounding box (approx 30x24)
            let pigLeft = pig.x - 15;
            let pigRight = pig.x + 15;
            let pigTop = pig.y - 12;
            let pigBot = pig.y + 12;

            // Top Pipe BB
            if (pigRight > p.x && pigLeft < p.x + this.width && pigTop < p.top) {
                triggerGameOver();
            }
            // Bottom Pipe BB
            let bottomY = p.top + this.gap;
            if (pigRight > p.x && pigLeft < p.x + this.width && pigBot > bottomY) {
                triggerGameOver();
            }

            // Score update
            if (p.x + this.width < pigLeft && !p.passed) {
                p.passed = true;
                score++;
                scoreDisplay.innerText = score;
                playScoreSound();
                
                // Increase difficulty slightly
                if (score % 5 === 0) {
                    speedMultiplier += 0.1;
                    if (this.gap > 90) this.gap -= 5;
                }
            }

            // Remove offscreen
            if (p.x + this.width < 0) {
                this.list.shift();
                i--;
            }
        }
    },
    reset() {
        this.list = [];
        this.gap = 140;
        speedMultiplier = 1;
    }
};

const bg = {
    bgX: 0,
    clouds: [],
    init() {
        for(let i=0; i<5; i++) {
            this.clouds.push({
                x: Math.random() * CW * 2,
                y: Math.random() * (CH / 2),
                size: Math.random() * 20 + 20,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    },
    draw() {
        // Sky gradient
        let gradient = ctx.createLinearGradient(0, 0, 0, CH);
        gradient.addColorStop(0, "#87CEEB");
        gradient.addColorStop(1, "#E0F6FF");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CW, CH);

        // Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for(let i=0; i<this.clouds.length; i++){
            let c = this.clouds[i];
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI*2);
            ctx.arc(c.x + c.size*0.8, c.y - c.size*0.3, c.size*0.8, 0, Math.PI*2);
            ctx.arc(c.x + c.size*1.6, c.y, c.size, 0, Math.PI*2);
            ctx.fill();
        }

        // Scrolling Grass/Ground
        this.groundDx = obstacles.dx * speedMultiplier;
        this.bgX = (this.bgX - this.groundDx) % 40;
        
        ctx.fillStyle = '#7CFC00'; // LawnGreen
        ctx.fillRect(0, CH - 50, CW, 50);
        ctx.fillStyle = '#228B22'; // ForestGreen top border
        ctx.fillRect(0, CH - 50, CW, 10);
        
        // Grass details
        ctx.fillStyle = '#32CD32';
        for(let i=0; i<=CW/40 + 1; i++){
            ctx.fillRect(i*40 + this.bgX, CH-40, 5, 20);
            ctx.fillRect(i*40 + this.bgX + 15, CH-30, 5, 10);
        }
    },
    update() {
        for(let i=0; i<this.clouds.length; i++){
            let c = this.clouds[i];
            c.x -= c.speed;
            if(c.x + c.size*2 < 0) {
                c.x = CW + c.size*2;
                c.y = Math.random() * (CH / 2);
            }
        }
    }
};

// --- AUDIO SYNTHESIS ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFlapSound() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playScoreSound() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playCrashSound() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// --- GAME LOOP & CONTROLS ---

function draw() {
    ctx.clearRect(0, 0, CW, CH);
    bg.draw();
    obstacles.draw();
    pig.draw();
}

function update() {
    bg.update();
    pig.update();
    obstacles.update();
}

function loop() {
    if (gameState !== 'PLAYING') return;
    update();
    draw();
    frames++;
    animationId = requestAnimationFrame(loop);
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    playCrashSound();
    cancelAnimationFrame(animationId);
    
    // Update highscore
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('flappyPigHighScore', highscore);
    }
    
    finalScoreDisplay.innerText = score;
    gameoverHighscoreDisplay.innerText = highscore;
    gameOverScreen.classList.remove('hidden');
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    frames = 0;
    scoreDisplay.innerText = score;
    pig.reset();
    obstacles.reset();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if(audioCtx.state === 'suspended') audioCtx.resume();
    loop();
}

// Controls
function handleInteract(e) {
    if (e.type === 'touchstart' && e.target !== startBtn && e.target !== restartBtn) {
        // Prevent default to stop zooming/scrolling and double-firing mousedown
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    if (e.target === startBtn || e.target === restartBtn) {
        return;
    }

    if (gameState === 'PLAYING') {
        pig.flap();
    } else if (gameState === 'START') {
        startGame();
    }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (e.cancelable) e.preventDefault(); // Prevent scrolling
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        } else if (gameState === 'PLAYING') {
            pig.flap();
        }
    }
});

document.addEventListener('mousedown', handleInteract);
document.addEventListener('touchstart', handleInteract, {passive: false});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initialize Highscore on load
startHighscoreDisplay.innerText = highscore;

// Initial Draw
bg.init();
resizeGame();
