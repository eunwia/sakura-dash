const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const welcomeScreen = document.getElementById('welcome-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over-screen');
const restartButton = document.getElementById('restart-button');
const homeButton = document.getElementById('home-button');
const pauseScreen = document.getElementById('pause-screen');
const resumeButton = document.getElementById('resume-button');
const pauseHomeButton = document.getElementById('pause-home-button');
const petalsContainer = document.getElementById('petals-container');
const gameUi = document.getElementById('game-ui');
const livesDisplay = document.getElementById('lives-display');
const scoreDisplay = document.getElementById('score-display');
const pauseGuide = document.getElementById('pause-guide');
const finalScore = document.getElementById('final-score');

// Game Settings
const gravity = 0.8;
const jumpStrength = -16;
let gameSpeed = 6;

// Game State
let gameState = 'LOADING'; // LOADING, MENU, PLAYING, PAUSED, GAMEOVER
let score = 0;
let lives = 3;
let isInvincible = false;
let animationId;

// Assets
const images = {};
const assetsToLoad = {
    logo: 'static/images/logo.png',
    sky: 'static/images/background/sky.png',
    ground: 'static/images/background/ground.png',
    obstacle1: 'static/images/obstacle/obstacle1.png',
    obstacle2: 'static/images/obstacle/obstacle2.png',
    obstacle3: 'static/images/obstacle/obstacle3.png',
    run1: 'static/images/runsprite/run1.png',
    run2: 'static/images/runsprite/run2.png',
    run3: 'static/images/runsprite/run3.png',
    run4: 'static/images/runsprite/run4.png',
    jump1: 'static/images/jumpsprite/jump1.png',
    jump2: 'static/images/jumpsprite/jump2.png',
    jump3: 'static/images/jumpsprite/jump3.png',
    jump4: 'static/images/jumpsprite/jump4.png',
    jump5: 'static/images/jumpsprite/jump5.png',
    live0: 'static/images/lives/zero.png',
    live1: 'static/images/lives/one.png',
    live2: 'static/images/lives/two.png',
    live3: 'static/images/lives/three.png',
    pauseBg: 'static/images/pause/bg.png',
    pauseCloud: 'static/images/pause/cloud.png',
    pausePetals: 'static/images/pause/petals.png',
    pauseResume: 'static/images/pause/resumebutton.png',
    pauseHome: 'static/images/pause/homebutton.png',
    pauseText: 'static/images/pause/pausetext.png',
    pauseGuide: 'static/images/pause/pauseguide.png',
};

function loadAssets(callback) {
    let loadedCount = 0;
    const totalAssets = Object.keys(assetsToLoad).length;
    for (const key in assetsToLoad) {
        images[key] = new Image();
        images[key].src = assetsToLoad[key];
        images[key].onload = () => {
            loadedCount++;
            if (loadedCount === totalAssets) callback();
        };
        images[key].onerror = (e) => {
            console.error(`Failed to load asset: ${assetsToLoad[key]}`, e);
        };
    }
}

function startLoading() {
    const duration = 1500; // 1.5 seconds
    const interval = 30;
    let elapsed = 0;

    const timer = setInterval(() => {
        elapsed += interval;
        const progress = Math.min((elapsed / duration) * 100, 100);
        loadingBar.style.width = progress + '%';

        if (elapsed >= duration) {
            clearInterval(timer);
            
            // Show welcome screen immediately so it's visible UNDER the loading screen as it swipes
            welcomeScreen.classList.remove('hidden');
            gameState = 'MENU';

            // Swipe up animation
            loadingScreen.classList.add('swipe-up');
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 600); // Match CSS transition time (0.6s)
        }
    }, interval);
}

function finishLoading() {
    gameState = 'MENU';
    loadingScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
}

// Fixed Ground Level (Pixels from bottom)
const GROUND_OFFSET = 180; 

class Player {
    constructor() {
        this.width = 320; 
        this.height = 200; 
        this.x = 80;
        this.vy = 0;
        this.isJumping = false;
        this.frame = 0;
        this.frameCount = 0;
        this.animationSpeed = 8;
        this.isGlitching = false;
        this.updatePosition();
    }

    updatePosition() {
        this.groundY = canvas.height - GROUND_OFFSET - this.height;
        if (!this.isJumping) this.y = this.groundY;
    }

    jump() {
        if (!this.isJumping && gameState === 'PLAYING') {
            this.vy = jumpStrength;
            this.isJumping = true;
        }
    }

    update() {
        if (gameState !== 'PLAYING') return;
        this.vy += gravity;
        this.y += this.vy;

        if (this.y > this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            this.isJumping = false;
        }

        this.frameCount++;
        if (this.frameCount >= this.animationSpeed) {
            this.frameCount = 0;
            this.frame = (this.frame + 1) % (this.isJumping ? 5 : 4);
        }
    }

    draw() {
        if (this.isGlitching && Math.random() > 0.5) return; 

        const imgKey = this.isJumping ? `jump${this.frame + 1}` : `run${this.frame + 1}`;
        const img = images[imgKey];
        if (img && img.complete) {
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return {
            x: this.x + 130, 
            y: this.y + 60,
            width: this.width - 260, 
            height: this.height - 80
        };
    }
}

class Background {
    constructor() {
        this.xSky = 0;
        this.xGround = 0;
    }

    update() {
        if (gameState !== 'PLAYING') return;
        this.xSky -= gameSpeed * 0.3;
        this.xGround -= gameSpeed;
        if (this.xSky <= -canvas.width) this.xSky += canvas.width;
        if (this.xGround <= -canvas.width) this.xGround += canvas.width;
    }

    draw() {
        if (images.sky && images.sky.complete) {
            const x = Math.floor(this.xSky);
            ctx.drawImage(images.sky, x, 0, canvas.width, canvas.height);
            ctx.drawImage(images.sky, x + canvas.width, 0, canvas.width, canvas.height);
        }

        if (images.ground && images.ground.complete) {
            const groundHeight = images.ground.height * (canvas.width / images.ground.width);
            const groundY = canvas.height - groundHeight;
            const x = Math.floor(this.xGround);
            ctx.drawImage(images.ground, x, groundY, canvas.width + 1, groundHeight);
            ctx.drawImage(images.ground, x + canvas.width, groundY, canvas.width + 1, groundHeight);
        }
    }
}

class Obstacle {
    constructor() {
        const type = Math.floor(Math.random() * 3) + 1;
        this.img = images[`obstacle${type}`];
        this.width = 80;
        this.height = 80;
        this.x = canvas.width;
        this.y = canvas.height - GROUND_OFFSET - this.height + 20;
    }

    update() {
        if (gameState !== 'PLAYING') return;
        this.x -= gameSpeed;
    }

    draw() {
        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return {
            x: this.x + 15,
            y: this.y + 15,
            width: this.width - 30,
            height: this.height - 30
        };
    }
}

let player, background, obstacles;
let spawnTimer;

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    background = new Background();
    player = new Player();
    obstacles = [];
    score = 0;
    lives = 3;
    isInvincible = false;
    gameSpeed = 6;
    scoreDisplay.innerText = score;
    updateLivesUI();
}

function updateLivesUI() {
    const livesImages = ['zero', 'one', 'two', 'three'];
    livesDisplay.src = `static/images/lives/${livesImages[lives]}.png`;
    
    if (lives === 1) {
        livesDisplay.classList.add('shake');
    } else {
        livesDisplay.classList.remove('shake');
    }
}

function takeDamage() {
    if (isInvincible) return;

    lives--;
    updateLivesUI();

    if (lives <= 0) {
        gameOver();
        return;
    }

    player.y = 50; 
    player.vy = 0; 
    player.isJumping = true;

    isInvincible = true;
    player.isGlitching = true;

    setTimeout(() => {
        player.isGlitching = false;
        isInvincible = false;
    }, 1200); 
}

function spawnObstacle() {
    if (gameState !== 'PLAYING') return;
    obstacles.push(new Obstacle());
    spawnTimer = setTimeout(spawnObstacle, 1500 + Math.random() * 2000);
}

function animate() {
    if (gameState === 'GAMEOVER') return;
    
    if (gameState === 'PLAYING') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        background.update();
        background.draw();

        const playerBounds = player.getBounds();
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].update();
            obstacles[i].draw();
            if (checkCollision(playerBounds, obstacles[i].getBounds())) {
                takeDamage();
                obstacles.splice(i, 1);
                continue;
            }
            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                score++;
                scoreDisplay.innerText = score;
                if (score % 5 === 0) gameSpeed += 0.5;
            }
        }

        player.update();
        player.draw();
    }

    animationId = requestAnimationFrame(animate);
}

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function startGame() {
    gameState = 'PLAYING';
    welcomeScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameUi.classList.remove('hidden');
    pauseGuide.classList.remove('hidden');
    clearTimeout(spawnTimer);
    init();
    spawnObstacle();
    animate();
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
        pauseGuide.classList.add('hidden');
        clearTimeout(spawnTimer);
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseScreen.classList.add('hidden');
        pauseGuide.classList.remove('hidden');
        spawnObstacle();
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    clearTimeout(spawnTimer);
    gameUi.classList.add('hidden');
    pauseGuide.classList.add('hidden');
    finalScore.innerText = score; 
    gameOverScreen.classList.remove('hidden');
}

function goHome() {
    gameState = 'MENU';
    cancelAnimationFrame(animationId);
    clearTimeout(spawnTimer);
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameUi.classList.add('hidden');
    pauseGuide.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
homeButton.addEventListener('click', goHome);
resumeButton.addEventListener('click', togglePause);
pauseHomeButton.addEventListener('click', goHome);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') togglePause();
    } else if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === 'MENU') {
        startGame();
    } else if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === 'GAMEOVER') {
        startGame();
    } else if ((e.code === 'Space' || e.code === 'ArrowUp') && player) {
        player.jump();
    }
});

canvas.addEventListener('mousedown', () => { if (player) player.jump(); });

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (player) player.updatePosition();
});

const gameOverPetals = document.getElementById('game-over-petals');
const pausePetals = document.getElementById('pause-petals');

function createPetal(container, assetPath) {
    if (gameState === 'PLAYING') return;
    if (container.id === 'petals-container' && gameState !== 'MENU') return;
    if (container.id === 'game-over-petals' && gameState !== 'GAMEOVER') return;
    if (container.id === 'pause-petals' && gameState !== 'PAUSED') return;

    const p = document.createElement('img');
    p.src = assetPath;
    p.className = 'petal';
    p.style.left = Math.random() * 100 + 'vw';
    const d = Math.random() * 5 + 5;
    p.style.animationDuration = d + 's';
    container.appendChild(p);
    setTimeout(() => p.remove(), (d + 2) * 1000);
}
setInterval(() => createPetal(petalsContainer, 'static/images/start/petals.png'), 600);
setInterval(() => createPetal(gameOverPetals, 'static/images/gameover/petals.png'), 600);
setInterval(() => createPetal(pausePetals, 'static/images/pause/petals.png'), 600);

loadAssets(() => {
    console.log('Ready.');
    startLoading();
});