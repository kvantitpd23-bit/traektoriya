const cameraFeed = document.getElementById('camera-feed');
const handOverlay = document.getElementById('hand-overlay');
const handCtx = handOverlay.getContext('2d');
const mazeCanvas = document.getElementById('maze-canvas');
const mazeCtx = mazeCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const statusDiv = document.getElementById('status');
const timeDisplay = document.getElementById('time');
const movesDisplay = document.getElementById('moves');
const levelDisplay = document.getElementById('level');
const gestureCards = {
    up: document.getElementById('gesture-up'),
    down: document.getElementById('gesture-down'),
    left: document.getElementById('gesture-left'),
    right: document.getElementById('gesture-right')
};

let gameActive = false;
let gameStarted = false;
let startTime = 0;
let elapsedTime = 0;
let moves = 0;
let currentLevel = 1;
let gameInterval;

let cellSize = 40;
let mazeWidth, mazeHeight, cols, rows;
let maze = [];
let player = { x: 1, y: 1 };
let finish = { x: 0, y: 0 };

let hands = null;
let lastGesture = null;
let gestureCooldown = false;
let lastGestureTime = 0;
let currentHandPosition = { x: 0, y: 0 };
let previousHandPosition = { x: 0, y: 0 };
let showHandSkeleton = true;

const SENSITIVITY = {
    LOW: 0.7,
    MEDIUM: 1.0,
    HIGH: 1.3,
    VERY_HIGH: 1.6
};
let sensitivity = SENSITIVITY.MEDIUM;

let arrowKeys = {
    up: false,
    down: false,
    left: false,
    right: false
};

let arrowMoveInterval = null;

// ========== СИСТЕМА ИМЕНИ ИГРОКА ==========
let playerName = 'Игрок';

function createPlayerNameModal() {
    if (document.getElementById('player-name-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'player-name-modal';
    modal.id = 'player-name-modal';
    modal.innerHTML = `
        <div class="player-name-content">
            <div class="player-name-header">
                <i class="fas fa-user-circle"></i>
                <h2>Добро пожаловать в «Траекторию»!</h2>
            </div>
            <div class="player-name-body">
                <p>Введите ваше имя для личных достижений:</p>
                <div class="player-name-input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" id="player-name-input" placeholder="Ваше имя" maxlength="20">
                </div>
                <div class="player-name-hint">
                    <i class="fas fa-info-circle"></i>
                    <span>Имя можно изменить через вкладку "Главное меню" → "Сменить имя"</span>
                </div>
            </div>
            <div class="player-name-footer">
                <button class="btn btn-save-name" id="save-player-name">
                    <i class="fas fa-check"></i> Продолжить
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.value = playerName;
    const savedName = localStorage.getItem('grandwarmup-player-name');
    if (savedName) {
        playerName = savedName;
        const input = document.getElementById('player-name-input');
        if (input) input.value = savedName;
        modal.classList.add('hidden');
    } else {
        modal.classList.add('active');
    }
    const saveBtn = document.getElementById('save-player-name');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const input = document.getElementById('player-name-input');
            let name = input.value.trim();
            if (name === '') name = 'Игрок';
            if (name.length > 20) name = name.substring(0, 20);
            playerName = name;
            localStorage.setItem('grandwarmup-player-name', playerName);
            const modal = document.getElementById('player-name-modal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            showNotification(`Добро пожаловать, ${playerName}!`, themes[currentTheme].primary);
        });
    }
}

function openChangeNameModal() {
    let modal = document.getElementById('player-name-modal');
    if (!modal) {
        createPlayerNameModal();
        modal = document.getElementById('player-name-modal');
    }
    const input = document.getElementById('player-name-input');
    if (input) input.value = playerName;
    const header = modal.querySelector('.player-name-header h2');
    if (header) header.textContent = 'Изменить имя';
    const hint = modal.querySelector('.player-name-hint span');
    if (hint) hint.textContent = 'Измените имя — оно сохранится для всех достижений';
    const saveBtn = modal.querySelector('#save-player-name');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

// ========== ТЕМЫ ОФОРМЛЕНИЯ ==========
const themes = {
    purple: {
        label: 'Фиолетовый',
        primary: '#a855f7',
        accent: '#a855f7',
        accent2: '#d946ef',
        rgb: '168, 85, 247',
        rgb2: '217, 70, 239',
        light: '#c4b5fd',
        mazeBg: '#0d0518',
        mazeWall: 'rgba(168, 85, 247, 0.4)',
        player: '#a855f7',
        finish: '#fb7185'
    },
    blue: {
        label: 'Синий',
        primary: '#3b82f6',
        accent: '#3b82f6',
        accent2: '#06b6d4',
        rgb: '59, 130, 246',
        rgb2: '6, 182, 212',
        light: '#93c5fd',
        mazeBg: '#05101a',
        mazeWall: 'rgba(59, 130, 246, 0.4)',
        player: '#3b82f6',
        finish: '#fb7185'
    },
    green: {
        label: 'Зелёный',
        primary: '#10b981',
        accent: '#10b981',
        accent2: '#14b8a6',
        rgb: '16, 185, 129',
        rgb2: '20, 184, 166',
        light: '#6ee7b7',
        mazeBg: '#03130e',
        mazeWall: 'rgba(16, 185, 129, 0.4)',
        player: '#10b981',
        finish: '#fb7185'
    },
    pink: {
        label: 'Розовый',
        primary: '#ec4899',
        accent: '#ec4899',
        accent2: '#f43f5e',
        rgb: '236, 72, 153',
        rgb2: '244, 63, 94',
        light: '#f9a8d4',
        mazeBg: '#160714',
        mazeWall: 'rgba(236, 72, 153, 0.4)',
        player: '#ec4899',
        finish: '#fbbf24'
    }
};
let currentTheme = 'purple';

function applyTheme(themeName) {
    if (!themes[themeName]) themeName = 'purple';
    currentTheme = themeName;
    const t = themes[themeName];
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-2', t.accent2);
    root.style.setProperty('--accent-rgb', t.rgb);
    root.style.setProperty('--accent-2-rgb', t.rgb2);
    root.style.setProperty('--accent-light', t.light);
    drawMaze();
    localStorage.setItem('grandwarmup-theme', themeName);
    showNotification(`Тема: ${t.label}`, t.primary);
}

function showNotification(message, color = '#a855f7') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.borderLeft = `4px solid ${color}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (document.body.contains(notification)) document.body.removeChild(notification);
    }, 3000);
}

// ========== ЛАБИРИНТ ==========
function initCanvasSizes() {
    const width = cameraFeed.videoWidth || 640;
    const height = cameraFeed.videoHeight || 480;
    handOverlay.width = width;
    handOverlay.height = height;
    const mazeContainer = document.querySelector('.maze-container');
    mazeCanvas.width = mazeContainer.clientWidth || 640;
    mazeCanvas.height = mazeContainer.clientHeight || 400;
    // Keep a valid odd-sized grid even while the layout is still measuring or hidden.
    cols = Math.max(5, Math.floor(mazeCanvas.width / cellSize) - 2);
    rows = Math.max(5, Math.floor(mazeCanvas.height / cellSize) - 2);
    mazeWidth = cols * cellSize;
    mazeHeight = rows * cellSize;
}

function generateMaze() {
    if (cols % 2 === 0) cols--;
    if (rows % 2 === 0) rows--;
    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) maze[y][x] = 1;
    }
    let stack = [];
    let startX = 1;
    let startY = 1;
    maze[startY][startX] = 0;
    stack.push([startX, startY]);
    let maxIterations = Math.min(cols * rows, 500);
    let iterations = 0;
    while (stack.length > 0 && iterations < maxIterations) {
        let [x, y] = stack[stack.length - 1];
        iterations++;
        let neighbors = [];
        if (y > 1 && maze[y-2][x] === 1) neighbors.push([x, y-2, x, y-1]);
        if (y < rows-2 && maze[y+2][x] === 1) neighbors.push([x, y+2, x, y+1]);
        if (x > 1 && maze[y][x-2] === 1) neighbors.push([x-2, y, x-1, y]);
        if (x < cols-2 && maze[y][x+2] === 1) neighbors.push([x+2, y, x+1, y]);
        if (neighbors.length > 0) {
            let [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
            maze[ny][nx] = 0;
            maze[wy][wx] = 0;
            stack.push([nx, ny]);
        } else {
            stack.pop();
        }
    }
    player.x = startX;
    player.y = startY;
    const farthestPoint = findFarthestPoint(startX, startY);
    finish.x = farthestPoint.x;
    finish.y = farthestPoint.y;
    maze[finish.y][finish.x] = 0;
    for (let i = 0; i < Math.floor(cols * rows / 30); i++) {
        let x = Math.floor(Math.random() * (cols - 2)) + 1;
        let y = Math.floor(Math.random() * (rows - 2)) + 1;
        if ((x === player.x && y === player.y) || (x === finish.x && y === finish.y)) continue;
        maze[y][x] = 0;
    }
    drawMaze();
}

function findFarthestPoint(startX, startY) {
    const visited = Array(rows).fill().map(() => Array(cols).fill(false));
    const queue = [[startX, startY, 0]];
    visited[startY][startX] = true;
    let farthestX = startX, farthestY = startY, maxDistance = 0;
    const directions = [[0,-1],[1,0],[0,1],[-1,0]];
    while (queue.length > 0) {
        const [x, y, distance] = queue.shift();
        if (distance > maxDistance) {
            maxDistance = distance;
            farthestX = x;
            farthestY = y;
        }
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && !visited[newY][newX] && maze[newY][newX] === 0) {
                visited[newY][newX] = true;
                queue.push([newX, newY, distance + 1]);
            }
        }
    }
    return { x: farthestX, y: farthestY };
}

function drawMaze() {
    const theme = themes[currentTheme];
    mazeCtx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
    mazeCtx.fillStyle = theme.mazeBg;
    mazeCtx.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);
    const offsetX = (mazeCanvas.width - mazeWidth) / 2;
    const offsetY = (mazeCanvas.height - mazeHeight) / 2;
    mazeCtx.fillStyle = theme.mazeWall;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze[y][x] === 1) {
                mazeCtx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
            }
        }
    }
    mazeCtx.fillStyle = theme.finish;
    mazeCtx.beginPath();
    mazeCtx.arc(offsetX + finish.x * cellSize + cellSize/2, offsetY + finish.y * cellSize + cellSize/2, cellSize/2 - 2, 0, Math.PI * 2);
    mazeCtx.fill();
    mazeCtx.fillStyle = theme.player;
    mazeCtx.beginPath();
    mazeCtx.arc(offsetX + player.x * cellSize + cellSize/2, offsetY + player.y * cellSize + cellSize/2, cellSize/2 - 4, 0, Math.PI * 2);
    mazeCtx.fill();
    mazeCtx.fillStyle = '#34d399';
    mazeCtx.beginPath();
    mazeCtx.arc(offsetX + cellSize + cellSize/2, offsetY + cellSize + cellSize/2, cellSize/4, 0, Math.PI * 2);
    mazeCtx.fill();
}

function movePlayer(dx, dy) {
    if (!gameActive) return false;
    const newX = player.x + dx;
    const newY = player.y + dy;
    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && maze[newY][newX] === 0) {
        player.x = newX;
        player.y = newY;
        moves++;
        movesDisplay.textContent = moves;
        drawPlayerOnly();
        if (player.x === finish.x && player.y === finish.y) {
            levelComplete();
        }
        return true;
    }
    return false;
}

function drawPlayerOnly() {
    const theme = themes[currentTheme];
    const offsetX = (mazeCanvas.width - mazeWidth) / 2;
    const offsetY = (mazeCanvas.height - mazeHeight) / 2;
    mazeCtx.fillStyle = theme.mazeBg;
    mazeCtx.fillRect(offsetX + (player.x - 1) * cellSize, offsetY + (player.y - 1) * cellSize, cellSize * 3, cellSize * 3);
    mazeCtx.fillStyle = theme.mazeWall;
    for (let y = Math.max(0, player.y - 2); y < Math.min(rows, player.y + 3); y++) {
        for (let x = Math.max(0, player.x - 2); x < Math.min(cols, player.x + 3); x++) {
            if (maze[y][x] === 1) {
                mazeCtx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
            }
        }
    }
    if (Math.abs(finish.x - player.x) <= 2 && Math.abs(finish.y - player.y) <= 2) {
        mazeCtx.fillStyle = theme.finish;
        mazeCtx.beginPath();
        mazeCtx.arc(offsetX + finish.x * cellSize + cellSize/2, offsetY + finish.y * cellSize + cellSize/2, cellSize/2 - 2, 0, Math.PI * 2);
        mazeCtx.fill();
    }
    mazeCtx.fillStyle = theme.player;
    mazeCtx.beginPath();
    mazeCtx.arc(offsetX + player.x * cellSize + cellSize/2, offsetY + player.y * cellSize + cellSize/2, cellSize/2 - 4, 0, Math.PI * 2);
    mazeCtx.fill();
}

// ========== ЭФФЕКТЫ ПРАЗДНОВАНИЯ ==========
function celebrateWithEffects() {
    const effectType = Math.floor(Math.random() * 4);
    switch(effectType) {
        case 0: createConfettiEffect(); break;
        case 1: createFireworksEffect(); break;
        case 2: createGiftsEffect(); break;
        case 3: createHeartsEffect(); break;
    }
}

function createConfettiEffect() {
    let canvas = document.getElementById('celebration-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'celebration-canvas';
        document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#a855f7','#d946ef','#fb7185','#fbbf24','#34d399','#3b82f6','#f3e8ff','#c4b5fd'];
    const shapes = ['rect','circle','triangle','star'];
    const particleCount = 300;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 15 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 6 + 3,
            angle: Math.random() * Math.PI * 2,
            rotation: Math.random() * 0.2 - 0.1,
            wobble: Math.random() * 0.3 - 0.15,
            opacity: Math.random() * 0.9 + 0.1,
            shape: shapes[Math.floor(Math.random() * shapes.length)]
        });
    }
    animateEffect(canvas, ctx, particles, 15000);
}

function createFireworksEffect() {
    let canvas = document.getElementById('celebration-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'celebration-canvas';
        document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const fireworkCount = 25;
    for (let f = 0; f < fireworkCount; f++) {
        setTimeout(() => {
            const centerX = Math.random() * canvas.width;
            const centerY = Math.random() * canvas.height * 0.7;
            const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
            const particleCount = 50;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = Math.random() * 10 + 3;
                particles.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: Math.random() * 8 + 3,
                    color: color,
                    opacity: 1,
                    life: 1,
                    maxLife: Math.random() * 80 + 50
                });
            }
        }, f * 300);
    }
    let frame = 0;
    const maxFrames = 300;
    function animateFireworks() {
        if (frame >= maxFrames) {
            if (canvas && canvas.parentNode) canvas.remove();
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= 0.003;
            p.opacity = p.life;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        frame++;
        requestAnimationFrame(animateFireworks);
    }
    animateFireworks();
}

function createGiftsEffect() {
    let canvas = document.getElementById('celebration-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'celebration-canvas';
        document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gifts = [];
    const giftCount = 60;
    const giftEmojis = ['🎁','🎀','🎄','🎅','🤶','🦌','⭐','🌟','✨','🎊','🎉','🧸','🍬','🍭','🧁','🎈'];
    for (let i = 0; i < giftCount; i++) {
        gifts.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            emoji: giftEmojis[Math.floor(Math.random() * giftEmojis.length)],
            size: Math.random() * 50 + 30,
            speed: Math.random() * 3 + 1,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            wobble: Math.random() * 2
        });
    }
    let frame = 0;
    const maxFrames = 450;
    function animateGifts() {
        if (frame >= maxFrames) {
            if (canvas && canvas.parentNode) canvas.remove();
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gifts.forEach(g => {
            g.y += g.speed;
            g.x += Math.sin(g.y * 0.02 + frame * 0.01) * g.wobble;
            g.rotation += g.rotationSpeed;
            if (g.y > canvas.height + 100) {
                g.y = -100;
                g.x = Math.random() * canvas.width;
            }
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.rotation);
            ctx.font = `${g.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 15;
            ctx.fillText(g.emoji, 0, 0);
            ctx.restore();
        });
        frame++;
        requestAnimationFrame(animateGifts);
    }
    animateGifts();
}

function createHeartsEffect() {
    let canvas = document.getElementById('celebration-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'celebration-canvas';
        document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const hearts = [];
    const heartCount = 80;
    const colors = ['#ff6b6b','#ff4757','#ff3838','#ff5252','#ff6b8b','#ff8b8b','#ff9b9b','#ffabab'];
    function drawHeart(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size / 20, size / 20);
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(255, 100, 100, 0.5)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-5, -5, -15, -5, -15, 5);
        ctx.bezierCurveTo(-15, 15, 0, 25, 0, 25);
        ctx.bezierCurveTo(0, 25, 15, 15, 15, 5);
        ctx.bezierCurveTo(15, -5, 5, -5, 0, 5);
        ctx.fill();
        ctx.restore();
    }
    for (let i = 0; i < heartCount; i++) {
        hearts.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 40 + 20,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 1,
            wobble: Math.random() * 0.8,
            angle: Math.random() * Math.PI * 2,
            opacity: Math.random() * 0.7 + 0.3
        });
    }
    let frame = 0;
    const maxFrames = 360;
    function animateHearts() {
        if (frame >= maxFrames) {
            if (canvas && canvas.parentNode) canvas.remove();
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 200, 220, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hearts.forEach(h => {
            h.y += h.speed;
            h.x += Math.sin(h.y * 0.02 + h.angle) * h.wobble;
            if (h.y > canvas.height + 100) {
                h.y = -100;
                h.x = Math.random() * canvas.width;
            }
            ctx.globalAlpha = h.opacity * (1 - frame / maxFrames * 0.3);
            drawHeart(ctx, h.x, h.y, h.size, h.color);
        });
        frame++;
        requestAnimationFrame(animateHearts);
    }
    animateHearts();
}

function animateEffect(canvas, ctx, particles, duration) {
    let startTime = Date.now();
    function animate() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        if (elapsed > duration) {
            if (canvas && canvas.parentNode) canvas.remove();
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const opacity = 1 - Math.max(0, (elapsed - duration * 0.7) / (duration * 0.3));
        particles.forEach(p => {
            p.y += p.speed;
            p.x += Math.sin(p.y * 0.01 + p.angle) * (p.wobble || 0.5);
            p.rotation += p.wobble || 0;
            if (p.y > canvas.height + 50) {
                p.y = -50;
                p.x = Math.random() * canvas.width;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.globalAlpha = (p.opacity || 1) * opacity;
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(0, -p.size/2);
                ctx.lineTo(p.size/2, p.size/2);
                ctx.lineTo(-p.size/2, p.size/2);
                ctx.closePath();
                ctx.fill();
            } else if (p.shape === 'star') {
                drawStar(ctx, 0, 0, 5, p.size/2, p.size/4);
            } else {
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            }
            ctx.restore();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerR;
        let y = cy + Math.sin(rot) * outerR;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerR;
        y = cy + Math.sin(rot) * innerR;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.closePath();
    ctx.fill();
}

function showCelebrationMessage() {
    const message = document.createElement('div');
    message.className = 'celebration-message';
    const messages = [
        '🎉 УРОВЕНЬ {level} ПРОЙДЕН! 🎉',
        '⭐ ПОБЕДА! УРОВЕНЬ {level} ⭐',
        '🏆 ТЫ ПРОШЕЛ УРОВЕНЬ {level}! 🏆',
        '✨ УРОВЕНЬ {level} ЗАВЕРШЕН! ✨',
        '🎊 ОТЛИЧНО! УРОВЕНЬ {level} 🎊',
        '💫 ПРОГРЕСС! УРОВЕНЬ {level} 💫'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    message.innerHTML = randomMessage.replace('{level}', currentLevel);
    document.body.appendChild(message);
    setTimeout(() => {
        if (document.body.contains(message)) document.body.removeChild(message);
    }, 5000);
}

function levelComplete() {
    gameActive = false;
    clearInterval(gameInterval);
    stopArrowMovement();
    elapsedTime += (Date.now() - startTime) / 1000;
    saveLeaderboardResult(currentLevel, moves, elapsedTime);
    const cameraContainer = document.querySelector('.camera-container');
    const statsPanel = document.querySelector('.stats-panel');
    if (currentLevel % 3 === 0) {
        celebrateWithEffects();
        showCelebrationMessage();
        if (cameraContainer) cameraContainer.classList.add('celebrate');
        if (statsPanel) statsPanel.classList.add('celebrate');
        playVictorySound();
    }
    setTimeout(() => {
        showNotification(`Уровень ${currentLevel} пройден!`, themes[currentTheme].primary);
        currentLevel++;
        levelDisplay.textContent = currentLevel;
        initCanvasSizes();
        generateMaze();
        startGame();
        if (cameraContainer) cameraContainer.classList.remove('celebrate');
        if (statsPanel) statsPanel.classList.remove('celebrate');
    }, 500);
}

function playVictorySound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const melodyType = Math.floor(Math.random() * 3);
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
        if (melodyType === 0) {
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
            oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45);
            oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.8);
        } else if (melodyType === 1) {
            oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(698.46, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.4);
            oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.6);
            oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 1.0);
        } else {
            oscillator.frequency.setValueAtTime(415.30, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(622.25, audioContext.currentTime + 0.3);
            oscillator.frequency.setValueAtTime(830.61, audioContext.currentTime + 0.45);
            oscillator.frequency.setValueAtTime(830.61, audioContext.currentTime + 0.9);
        }
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 2);
    } catch (e) { /* игнорируем */ }
}

// ========== ДОСТИЖЕНИЯ ==========
let leaderboard = [];

function loadLeaderboard() {
    const saved = localStorage.getItem('grandwarmup-leaderboard');
    if (saved) leaderboard = JSON.parse(saved);
    displayLeaderboard();
}

function saveLeaderboardResult(level, moves, time) {
    const result = { name: playerName, level: level, moves: moves, time: time, date: new Date().toLocaleDateString() };
    leaderboard.push(result);
    leaderboard = leaderboard.slice(-50);
    localStorage.setItem('grandwarmup-leaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
    showNotification(`Результат сохранён для ${playerName}!`, themes[currentTheme].primary);
}

function displayLeaderboard() {
    const panel = document.getElementById('panel-leaderboard');
    if (!panel) return;
    const body = panel.querySelector('.panel-body');
    if (!body) return;

    const myAchievements = leaderboard
        .filter(e => e.name === playerName)
        .slice()
        .sort((a, b) => {
            if (a.moves !== b.moves) return a.moves - b.moves;
            return a.time - b.time;
        });

    const initial = (playerName || '?').charAt(0).toUpperCase();

    let html = `
        <div class="ach-player">
            <div class="ach-avatar">${initial}</div>
            <div class="ach-player-info">
                <div class="ach-player-name">${playerName}</div>
                <div class="ach-player-tag">Личные достижения</div>
            </div>
        </div>
    `;

    if (myAchievements.length === 0) {
        html += `
            <div class="ach-empty">
                <i class="fas fa-trophy"></i>
                <p>Пока нет результатов</p>
                <span>Сыграй игру, чтобы открыть первое достижение</span>
            </div>
        `;
    } else {
        const bestLevel = Math.max(...myAchievements.map(e => e.level));
        const bestMoves = Math.min(...myAchievements.map(e => e.moves));
        const bestTime = Math.min(...myAchievements.map(e => e.time));

        html += `
            <div class="ach-kpi-grid">
                <div class="ach-kpi">
                    <i class="fas fa-layer-group ach-kpi-icon"></i>
                    <div class="ach-kpi-value">${bestLevel}</div>
                    <div class="ach-kpi-label">Уровень</div>
                </div>
                <div class="ach-kpi">
                    <i class="fas fa-shoe-prints ach-kpi-icon"></i>
                    <div class="ach-kpi-value">${bestMoves}</div>
                    <div class="ach-kpi-label">Ходы</div>
                </div>
                <div class="ach-kpi">
                    <i class="fas fa-stopwatch ach-kpi-icon"></i>
                    <div class="ach-kpi-value">${formatTime(bestTime)}</div>
                    <div class="ach-kpi-label">Время</div>
                </div>
            </div>

            <div class="ach-section-title">
                <i class="fas fa-history"></i> История результатов
            </div>
            <div class="ach-list">
        `;
        myAchievements.forEach((entry, idx) => {
            const rankTitle = entry.level >= 10 ? 'Профи' :
                              entry.level >= 5 ? 'Опытный' :
                              entry.level >= 2 ? 'Ученик' : 'Новичок';
            html += `
                <div class="ach-entry ${idx < 3 ? 'top-' + (idx + 1) : ''}">
                    <div class="ach-entry-rank">${idx + 1}</div>
                    <div class="ach-entry-info">
                        <div class="ach-entry-title">${rankTitle} · ур. ${entry.level}</div>
                        <div class="ach-entry-date">${entry.date || '—'}</div>
                    </div>
                    <div class="ach-entry-stats">
                        <div class="ach-entry-stat">
                            <span>${entry.level}</span>
                            <small>ур.</small>
                        </div>
                        <div class="ach-entry-stat">
                            <span>${entry.moves}</span>
                            <small>ходы</small>
                        </div>
                        <div class="ach-entry-stat">
                            <span>${formatTime(entry.time)}</span>
                            <small>время</small>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        html += `<button class="btn-reset-leaderboard"><i class="fas fa-trash"></i> Сбросить достижения</button>`;
    }

    body.innerHTML = html;

    const resetBtn2 = body.querySelector('.btn-reset-leaderboard');
    if (resetBtn2) {
        resetBtn2.addEventListener('click', function() {
            if (confirm('Сбросить все личные достижения?')) {
                leaderboard = leaderboard.filter(e => e.name !== playerName);
                localStorage.setItem('grandwarmup-leaderboard', JSON.stringify(leaderboard));
                displayLeaderboard();
                showNotification('Достижения сброшены', themes[currentTheme].primary);
            }
        });
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
    if (!gameActive) return;
    const currentTime = Date.now();
    const totalSeconds = elapsedTime + (currentTime - startTime) / 1000;
    timeDisplay.textContent = formatTime(totalSeconds);
}

function startGame() {
    if (!gameStarted) {
        alert("Сначала активируйте камеру, нажав 'Начать игру'");
        return;
    }
    gameActive = true;
    startTime = Date.now();
    moves = 0;
    movesDisplay.textContent = moves;
    clearInterval(gameInterval);
    gameInterval = setInterval(updateTimer, 1000);
    statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Игра активна. Используйте жесты или стрелки';
    statusDiv.className = 'status status-active';
    showNotification(`Игра началась, ${playerName}!`, themes[currentTheme].primary);
}

function resetGame() {
    gameActive = false;
    clearInterval(gameInterval);
    stopArrowMovement();
    elapsedTime = 0;
    currentLevel = 1;
    moves = 0;
    timeDisplay.textContent = '00:00';
    movesDisplay.textContent = '0';
    levelDisplay.textContent = '1';
    initCanvasSizes();
    generateMaze();
    statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Игра сброшена. Нажмите "Начать игру"';
    statusDiv.className = 'status status-inactive';
    showNotification('Игра сброшена', themes[currentTheme].primary);
}

// ========== РАСПОЗНАВАНИЕ ЖЕСТОВ ==========
function detectGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const isHandRaised = indexTip.y < indexBase.y && middleTip.y < middleBase.y && ringTip.y < landmarks[13].y && pinkyTip.y < landmarks[17].y;
    if (isHandRaised) return 'up';
    const isFist = indexTip.y > indexBase.y && middleTip.y > middleBase.y && ringTip.y > landmarks[13].y && pinkyTip.y > landmarks[17].y;
    if (isFist) return 'right';
    const isOpenHand = Math.abs(indexTip.x - middleTip.x) < 0.2 && Math.abs(middleTip.x - ringTip.x) < 0.2 && Math.abs(ringTip.x - pinkyTip.x) < 0.2 && indexTip.y < indexBase.y && middleTip.y < middleBase.y;
    if (isOpenHand) return 'left';
    const isOneFingerUp = indexTip.y < indexBase.y && middleTip.y > middleBase.y && ringTip.y > landmarks[13].y && pinkyTip.y > landmarks[17].y;
    if (isOneFingerUp) return 'down';
    return null;
}

function smoothPosition(x, y) {
    const smoothedX = previousHandPosition.x * 0.3 + x * 0.7;
    const smoothedY = previousHandPosition.y * 0.3 + y * 0.7;
    previousHandPosition = { x: smoothedX, y: smoothedY };
    return { x: smoothedX, y: smoothedY };
}

function onResults(results) {
    if (!cameraActive) return;
    handCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        if (showHandSkeleton) {
            landmarks.forEach(point => {
                const x = (1 - point.x) * handOverlay.width;
                const y = point.y * handOverlay.height;
                handCtx.beginPath();
                handCtx.arc(x, y, 4, 0, 2 * Math.PI);
                handCtx.fillStyle = themes[currentTheme].primary;
                handCtx.fill();
            });
        }
        const gesture = detectGesture(landmarks);
        if (gameActive && gesture && !gestureCooldown) {
            processGesture(gesture);
        }
        const targetX = (1 - landmarks[0].x) * handOverlay.width;
        const targetY = landmarks[0].y * handOverlay.height;
        currentHandPosition = smoothPosition(targetX, targetY);
    }
}

function processGesture(gesture) {
    if (!gesture || gestureCooldown) return;
    const now = Date.now();
    if (now - lastGestureTime < 150) return;
    Object.values(gestureCards).forEach(card => card.classList.remove('gesture-active'));
    let moved = false;
    switch(gesture) {
        case 'up': moved = movePlayer(0, -1); if (gestureCards.up) gestureCards.up.classList.add('gesture-active'); break;
        case 'down': moved = movePlayer(0, 1); if (gestureCards.down) gestureCards.down.classList.add('gesture-active'); break;
        case 'left': moved = movePlayer(-1, 0); if (gestureCards.left) gestureCards.left.classList.add('gesture-active'); break;
        case 'right': moved = movePlayer(1, 0); if (gestureCards.right) gestureCards.right.classList.add('gesture-active'); break;
    }
    if (moved) {
        lastGesture = gesture;
        lastGestureTime = now;
        gestureCooldown = true;
        setTimeout(() => {
            gestureCooldown = false;
            setTimeout(() => {
                Object.values(gestureCards).forEach(card => card.classList.remove('gesture-active'));
            }, 100);
        }, 150);
    }
}

function startArrowMovement() {
    if (!gameActive) return;
    stopArrowMovement();
    arrowMoveInterval = setInterval(() => {
        let moved = false;
        if (arrowKeys.up) moved = movePlayer(0, -1) || moved;
        if (arrowKeys.down) moved = movePlayer(0, 1) || moved;
        if (arrowKeys.left) moved = movePlayer(-1, 0) || moved;
        if (arrowKeys.right) moved = movePlayer(1, 0) || moved;
        Object.keys(gestureCards).forEach(key => {
            if (arrowKeys[key]) gestureCards[key].classList.add('gesture-active');
            else gestureCards[key].classList.remove('gesture-active');
        });
    }, 80);
}

function stopArrowMovement() {
    if (arrowMoveInterval) {
        clearInterval(arrowMoveInterval);
        arrowMoveInterval = null;
    }
    Object.values(gestureCards).forEach(card => card.classList.remove('gesture-active'));
}

// ========== КАМЕРА ==========
let cameraStream = null;
let cameraActive = false;
let cameraFrameId = null;
let cameraGeneration = 0;
let processingFrame = false;
let handsLibraryPromise = null;
let cameraInitPromise = null;
let cameraRequestGeneration = 0;

// MediaPipe is deliberately loaded only when the visitor starts camera control.
// This keeps the landing screen independent from the large vision library.
function loadHandsLibrary() {
    if (window.Hands) return Promise.resolve();
    if (handsLibraryPromise) return handsLibraryPromise;

    handsLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
        script.async = true;
        script.onload = () => {
            if (window.Hands) resolve();
            else reject(new Error('MediaPipe загрузился, но класс Hands недоступен'));
        };
        script.onerror = () => reject(new Error('Не удалось загрузить MediaPipe с CDN'));
        document.head.appendChild(script);
    }).catch(error => {
        handsLibraryPromise = null;
        throw error;
    });

    return handsLibraryPromise;
}

function setCameraStatus(message, active = false) {
    if (!statusDiv) return;
    statusDiv.innerHTML = `<i class="fas ${active ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    statusDiv.className = `status ${active ? 'status-active' : 'status-inactive'}`;
}

function initCamera() {
    if (cameraActive && cameraStream) return Promise.resolve(true);
    if (cameraInitPromise) return cameraInitPromise;
    const requestGeneration = ++cameraRequestGeneration;
    cameraInitPromise = performCameraInit(requestGeneration).finally(() => {
        cameraInitPromise = null;
    });
    return cameraInitPromise;
}

async function performCameraInit(requestGeneration) {
    if (cameraActive && cameraStream) return true;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('Для камеры откройте сайт по HTTPS и используйте современный браузер');
        if (cameraToggle) cameraToggle.checked = false;
        return false;
    }

    try {
        setCameraStatus('Подготавливаем управление жестами…');
        await loadHandsLibrary();
        if (requestGeneration !== cameraRequestGeneration) return false;

        setCameraStatus('Запрашиваем доступ к камере…');
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
                frameRate: { ideal: 24, max: 30 }
            }
        });

        if (requestGeneration !== cameraRequestGeneration) {
            stream.getTracks().forEach(track => track.stop());
            return false;
        }
        cameraStream = stream;
        cameraFeed.srcObject = stream;
        await cameraFeed.play();

        hands = new window.Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        hands.onResults(onResults);

        cameraActive = true;
        gameStarted = true;
        processingFrame = false;
        const generation = ++cameraGeneration;

        const processFrame = async () => {
            if (!cameraActive || generation !== cameraGeneration) return;
            if (cameraFeed.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !processingFrame && hands) {
                processingFrame = true;
                try { await hands.send({ image: cameraFeed }); }
                catch (error) { console.warn('Ошибка обработки кадра:', error); }
                finally { processingFrame = false; }
            }
            if (cameraActive && generation === cameraGeneration) {
                cameraFrameId = requestAnimationFrame(processFrame);
            }
        };
        cameraFrameId = requestAnimationFrame(processFrame);

        setCameraStatus('Камера активна. Начните игру', true);
        if (cameraToggle) cameraToggle.checked = true;
        return true;
    } catch (err) {
        console.error('Не удалось запустить камеру:', err);
        stopCamera(false);
        let message = 'Не удалось включить камеру';
        if (String(err?.message || '').includes('MediaPipe')) message = 'Не удалось загрузить управление жестами. Проверьте подключение к интернету и попробуйте снова';
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') message = 'Нет доступа к камере. Разрешите доступ в настройках браузера';
        else if (err?.name === 'NotFoundError') message = 'Камера не найдена на устройстве';
        else if (err?.name === 'NotReadableError') message = 'Камера уже используется другим приложением';
        else if (err?.name === 'OverconstrainedError') message = 'Камера не поддерживает выбранный режим';
        setCameraStatus(message);
        if (cameraToggle) cameraToggle.checked = false;
        return false;
    }
}

function setSensitivity(level) {
    switch(level) {
        case 1: sensitivity = SENSITIVITY.LOW; break;
        case 2: sensitivity = SENSITIVITY.MEDIUM; break;
        case 3: sensitivity = SENSITIVITY.HIGH; break;
        case 4: sensitivity = SENSITIVITY.VERY_HIGH; break;
        default: sensitivity = SENSITIVITY.MEDIUM;
    }
    const sensitivityText = ['НИЗКАЯ','СРЕДНЯЯ','ВЫСОКАЯ','ОЧЕНЬ ВЫСОКАЯ'][level-1];
    showNotification(`Чувствительность: ${sensitivityText}`, themes[currentTheme].primary);
}

startBtn.addEventListener('click', async () => {
    if (startBtn.disabled) return;
    startBtn.disabled = true;
    const originalContent = startBtn.innerHTML;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подождите…';
    try {
        const cameraStarted = cameraActive && cameraStream ? true : await initCamera();
        if (cameraStarted) {
            initCanvasSizes();
            generateMaze();
            startGame();
        }
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = originalContent;
    }
});

resetBtn.addEventListener('click', resetGame);

document.addEventListener('keydown', (e) => {
    if (!gameActive && e.key !== '1' && e.key !== '2' && e.key !== '3' && e.key !== '4') return;
    switch(e.key) {
        case 'ArrowUp': e.preventDefault(); arrowKeys.up = true; startArrowMovement(); break;
        case 'ArrowDown': e.preventDefault(); arrowKeys.down = true; startArrowMovement(); break;
        case 'ArrowLeft': e.preventDefault(); arrowKeys.left = true; startArrowMovement(); break;
        case 'ArrowRight': e.preventDefault(); arrowKeys.right = true; startArrowMovement(); break;
        case '1': setSensitivity(1); break;
        case '2': setSensitivity(2); break;
        case '3': setSensitivity(3); break;
        case '4': setSensitivity(4); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowUp': arrowKeys.up = false; break;
        case 'ArrowDown': arrowKeys.down = false; break;
        case 'ArrowLeft': arrowKeys.left = false; break;
        case 'ArrowRight': arrowKeys.right = false; break;
    }
    if (!arrowKeys.up && !arrowKeys.down && !arrowKeys.left && !arrowKeys.right) stopArrowMovement();
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    initCanvasSizes();
    generateMaze();
    window.addEventListener('resize', () => {
        initCanvasSizes();
        generateMaze();
    });
    const savedName = localStorage.getItem('grandwarmup-player-name');
    if (savedName) playerName = savedName;
    createPlayerNameModal();
    loadLeaderboard();
    const savedTheme = localStorage.getItem('grandwarmup-theme');
    if (savedTheme && themes[savedTheme]) {
        applyTheme(savedTheme);
    } else {
        applyTheme('purple');
    }
});

// ========== УПРАВЛЕНИЕ ВКЛАДКАМИ ==========
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    const closeButtons = document.querySelectorAll('.close-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.stopPropagation();
            const panelId = this.id.replace('tab', 'panel');
            const targetPanel = document.getElementById(panelId);
            panels.forEach(panel => panel.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            if (targetPanel) {
                targetPanel.classList.add('active');
                this.classList.add('active');
            }
        });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const panel = this.closest('.tab-panel');
            if (panel) {
                panel.classList.remove('active');
                const tabId = panel.id.replace('panel', 'tab');
                const tab = document.getElementById(tabId);
                if (tab) tab.classList.remove('active');
            }
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.tab-panel') && !e.target.closest('.tab')) {
            panels.forEach(panel => panel.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));
        }
    });

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.querySelector('span').textContent;
            menuItems.forEach(i => i.classList.remove('menu-item-active'));
            this.classList.add('menu-item-active');

            switch(action) {
                case 'Новая игра':
                    if (gameStarted) { resetGame(); startGame(); }
                    else alert('Сначала активируйте камеру');
                    break;
                case 'Сменить имя':
                    openChangeNameModal();
                    break;
                case 'Обучение':
                    openTutorialPanel();
                    break;
                case 'О программе':
                    openAboutPanel();
                    break;
                default:
                    showNotification(`Действие "${action}" в разработке`, themes[currentTheme].primary);
            }
        });
    });

    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const theme = this.dataset.theme;
            themeOptions.forEach(opt => opt.classList.remove('theme-active'));
            this.classList.add('theme-active');
            applyTheme(theme);
        });
    });

    loadLeaderboard();
});

// ========== НАСТРОЙКИ ==========
const cameraToggle = document.getElementById('camera-toggle');
const skeletonToggle = document.getElementById('skeleton-toggle');
const soundToggle = document.getElementById('sound-toggle');
const sensitivityRadios = document.querySelectorAll('input[name="sensitivity"]');
const cellSizeRadios = document.querySelectorAll('input[name="cell-size"]');
const resetSettingsBtn = document.getElementById('reset-settings');
const resetProgressBtn = document.getElementById('reset-progress');

let soundEnabled = true;

function stopCamera(updateToggle = true) {
    // Invalidate pending camera requests and queued frames before releasing the stream.
    cameraRequestGeneration++;
    cameraActive = false;
    gameStarted = false;
    cameraGeneration++;
    if (cameraFrameId !== null) {
        cancelAnimationFrame(cameraFrameId);
        cameraFrameId = null;
    }
    processingFrame = false;

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    if (cameraFeed) {
        cameraFeed.pause();
        cameraFeed.srcObject = null;
    }
    if (hands) {
        try { hands.close(); } catch (error) { console.warn('Ошибка остановки MediaPipe:', error); }
        hands = null;
    }
    if (handOverlay && handCtx) handCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);

    setCameraStatus('Камера отключена');
    if (updateToggle && cameraToggle) cameraToggle.checked = false;
    if (gameActive) {
        gameActive = false;
        if (gameInterval) clearInterval(gameInterval);
        stopArrowMovement();
    }
}

if (cameraToggle) {
    cameraToggle.addEventListener('change', function() {
        if (this.checked) initCamera();
        else stopCamera();
    });
}

if (skeletonToggle) {
    skeletonToggle.addEventListener('change', function() {
        showHandSkeleton = this.checked;
        if (!showHandSkeleton) {
            handCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
        }
        showNotification(`Скелет руки: ${showHandSkeleton ? 'вкл' : 'выкл'}`, themes[currentTheme].primary);
    });
}

if (sensitivityRadios.length) {
    sensitivityRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                const val = this.value;
                let level;
                switch(val) {
                    case 'low': level = 1; break;
                    case 'medium': level = 2; break;
                    case 'high': level = 3; break;
                    case 'very_high': level = 4; break;
                    default: level = 2;
                }
                setSensitivity(level);
            }
        });
    });
}

if (cellSizeRadios.length) {
    cellSizeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                cellSize = parseInt(this.value, 10) || 40;
                initCanvasSizes();
                generateMaze();
                const label = cellSize === 30 ? 'мелкий' : cellSize === 50 ? 'крупный' : 'стандартный';
                showNotification(`Размер лабиринта: ${label}`, themes[currentTheme].primary);
            }
        });
    });
}

if (soundToggle) {
    soundToggle.addEventListener('change', function() {
        soundEnabled = this.checked;
        showNotification(`Звук ${soundEnabled ? 'включён' : 'выключен'}`, themes[currentTheme].primary);
    });
}

if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', function() {
        if (confirm('Сбросить все достижения? Все результаты будут удалены.')) {
            leaderboard = [];
            localStorage.removeItem('grandwarmup-leaderboard');
            displayLeaderboard();
            showNotification('Достижения сброшены', themes[currentTheme].primary);
        }
    });
}

const originalPlayVictorySound = playVictorySound;
playVictorySound = function() {
    if (!soundEnabled) return;
    originalPlayVictorySound();
};

if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', function() {
        if (!cameraActive) initCamera();
        if (cameraToggle) cameraToggle.checked = true;
        if (skeletonToggle) { skeletonToggle.checked = true; showHandSkeleton = true; }
        const mediumRadio = document.querySelector('input[name="sensitivity"][value="medium"]');
        if (mediumRadio) { mediumRadio.checked = true; }
        setSensitivity(2);
        const sizeRadio = document.querySelector('input[name="cell-size"][value="40"]');
        if (sizeRadio) { sizeRadio.checked = true; cellSize = 40; }
        initCanvasSizes();
        generateMaze();
        if (soundToggle) soundToggle.checked = true;
        soundEnabled = true;
        showNotification('Настройки сброшены', themes[currentTheme].primary);
    });
}

// ========== ТУР (обучение) ==========
class Tour {
    constructor(steps) {
        this.steps = steps;
        this.current = 0;
        this.active = false;
        this.waitTimer = null;
        this.build();
    }

    build() {
        const root = document.createElement('div');
        root.className = 'tour-root';
        root.id = 'tourRoot';
        root.innerHTML = `
            <div class="tour-blocker" data-blocker="top"></div>
            <div class="tour-blocker" data-blocker="bottom"></div>
            <div class="tour-blocker" data-blocker="left"></div>
            <div class="tour-blocker" data-blocker="right"></div>
            <div class="tour-highlight"></div>
            <div class="tour-tooltip">
                <div class="tour-emoji"></div>
                <div class="tour-header">
                    <span class="tour-counter"></span>
                    <button class="tour-close" title="Пропустить">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <h3 class="tour-title"></h3>
                <p class="tour-text"></p>
                <div class="tour-actions">
                    <button class="ghost-btn tour-back">Назад</button>
                    <button class="primary-btn tour-next">Далее</button>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        this.root = root;
        this.blockers = {
            top: root.querySelector('[data-blocker="top"]'),
            bottom: root.querySelector('[data-blocker="bottom"]'),
            left: root.querySelector('[data-blocker="left"]'),
            right: root.querySelector('[data-blocker="right"]')
        };
        this.highlight = root.querySelector('.tour-highlight');
        this.tooltip = root.querySelector('.tour-tooltip');
        this.emoji = root.querySelector('.tour-emoji');
        this.title = root.querySelector('.tour-title');
        this.text = root.querySelector('.tour-text');
        this.counter = root.querySelector('.tour-counter');
        this.backBtn = root.querySelector('.tour-back');
        this.nextBtn = root.querySelector('.tour-next');
        this.closeBtn = root.querySelector('.tour-close');

        this.backBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        this.closeBtn.addEventListener('click', () => this.stop());
        window.addEventListener('resize', () => this.onResize());
        document.addEventListener('keydown', (e) => {
            if (!this.active) return;
            if (e.key === 'Escape') this.stop();
            else if (e.key === 'ArrowRight') this.next();
            else if (e.key === 'ArrowLeft') this.prev();
        });
    }

    start() {
        this.current = 0;
        this.active = true;
        this.root.classList.add('show');
        this.showStep();
    }

    stop() {
        this.active = false;
        if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }
        this.root.classList.remove('show', 'interactive', 'centered-mode');
        this.highlight.classList.remove('visible');
    }

    next() {
        if (this.current >= this.steps.length - 1) { this.stop(); return; }
        this.current++;
        this.showStep();
    }

    prev() {
        if (this.current <= 0) return;
        this.current--;
        this.showStep();
    }

    showStep() {
        if (!this.active) return;
        const step = this.steps[this.current];
        if (!step) { this.stop(); return; }

        if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }

        this.root.classList.toggle('interactive', !!step.interactive);
        this.root.classList.toggle('centered-mode', !!step.centered);

        this.tooltip.style.opacity = '0';

        if (step.centered && step.emoji) {
            this.emoji.textContent = step.emoji;
            this.emoji.classList.add('show');
        } else {
            this.emoji.classList.remove('show');
            this.emoji.textContent = '';
        }

        this.title.innerHTML = step.title;
        this.text.innerHTML = step.text;
        this.counter.textContent = `${this.current + 1} / ${this.steps.length}`;
        this.backBtn.disabled = this.current === 0;
        this.backBtn.style.display = step.centered ? 'none' : '';
        this.nextBtn.textContent = step.nextLabel || (this.current === this.steps.length - 1 ? 'Готово' : 'Далее');

        const oldWait = this.tooltip.querySelector('.tour-wait');
        if (oldWait) oldWait.remove();

        if (step.waitFor) {
            this.nextBtn.style.display = 'none';
            const w = document.createElement('div');
            w.className = 'tour-wait';
            w.textContent = step.waitText || 'Ждём вашего действия…';
            this.tooltip.querySelector('.tour-actions').prepend(w);
        } else {
            this.nextBtn.style.display = '';
        }

        if (step.centered) {
            this.highlight.classList.remove('visible');
            this.setBlockers(null);
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.classList.add('centered');
            this.tooltip.style.top = '-9999px';
            this.tooltip.style.left = '-9999px';
            setTimeout(() => {
                this.centerTooltip();
                this.tooltip.style.visibility = 'visible';
                this.tooltip.style.opacity = '1';
            }, 30);
        } else {
            const target = document.querySelector(step.selector);
            if (!target) {
                console.warn('Tour: не найден', step.selector);
                this.current++;
                return this.showStep();
            }
            try { target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (e) {}

            setTimeout(() => {
                const rect = target.getBoundingClientRect();
                const pad = 8;
                this.highlight.classList.add('visible');
                this.highlight.style.top = (rect.top - pad) + 'px';
                this.highlight.style.left = (rect.left - pad) + 'px';
                this.highlight.style.width = (rect.width + pad * 2) + 'px';
                this.highlight.style.height = (rect.height + pad * 2) + 'px';
                this.setBlockers({
                    top: rect.top - pad,
                    left: rect.left - pad,
                    right: rect.right + pad,
                    bottom: rect.bottom + pad
                });

                this.tooltip.style.visibility = 'hidden';
                this.tooltip.classList.remove('centered');
                this.positionTooltip(target, step.position || 'auto');
                this.tooltip.style.visibility = 'visible';
                this.tooltip.style.opacity = '1';
            }, 350);
        }

        if (step.waitFor) {
            this.startWait(step.waitFor);
        }
    }

    startWait(condition) {
        if (!this.active) return;
        if (condition()) {
            this.next();
            return;
        }
        this.waitTimer = setTimeout(() => this.startWait(condition), 250);
    }

    setBlockers(rect) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (!rect) {
            this.blockers.top.style.cssText = `top:0;left:0;width:${w}px;height:${h}px;`;
            this.blockers.bottom.style.cssText = `top:0;left:0;width:0;height:0;`;
            this.blockers.left.style.cssText = `top:0;left:0;width:0;height:0;`;
            this.blockers.right.style.cssText = `top:0;left:0;width:0;height:0;`;
            return;
        }
        const { top, left, right, bottom } = rect;
        this.blockers.top.style.cssText = `top:0;left:0;width:${w}px;height:${Math.max(0, top)}px;`;
        this.blockers.bottom.style.cssText = `top:${bottom}px;left:0;width:${w}px;height:${Math.max(0, h - bottom)}px;`;
        this.blockers.left.style.cssText = `top:${top}px;left:0;width:${Math.max(0, left)}px;height:${Math.max(0, bottom - top)}px;`;
        this.blockers.right.style.cssText = `top:${top}px;left:${right}px;width:${Math.max(0, w - right)}px;height:${Math.max(0, bottom - top)}px;`;
    }

    centerTooltip() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const tw = this.tooltip.offsetWidth;
        const th = this.tooltip.offsetHeight;
        this.tooltip.style.left = ((w - tw) / 2) + 'px';
        this.tooltip.style.top = ((h - th) / 2) + 'px';
    }

    positionTooltip(target, position) {
        const rect = target.getBoundingClientRect();
        const tw = this.tooltip.offsetWidth || 380;
        const th = this.tooltip.offsetHeight || 200;
        const margin = 20;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let pos = position;
        if (pos === 'auto') {
            if (rect.bottom + margin + th < vh) pos = 'bottom';
            else if (rect.top - margin - th > 0) pos = 'top';
            else pos = 'bottom';
        }

        let top = 0, left = 0;
        if (pos === 'bottom') {
            top = rect.bottom + margin;
            left = rect.left + rect.width / 2 - tw / 2;
        } else if (pos === 'top') {
            top = rect.top - margin - th;
            left = rect.left + rect.width / 2 - tw / 2;
        } else if (pos === 'right') {
            top = rect.top + rect.height / 2 - th / 2;
            left = rect.right + margin;
        } else if (pos === 'left') {
            top = rect.top + rect.height / 2 - th / 2;
            left = rect.left - margin - tw;
        }

        left = Math.max(16, Math.min(left, vw - tw - 16));
        top = Math.max(16, Math.min(top, vh - th - 16));

        this.tooltip.style.top = top + 'px';
        this.tooltip.style.left = left + 'px';
    }

    onResize() {
        if (!this.active) return;
        const step = this.steps[this.current];
        if (!step) return;
        if (step.centered) { this.centerTooltip(); return; }
        const target = document.querySelector(step.selector);
        if (target) this.showStep();
    }
}

let gwTour = null;

function openTutorialPanel() {
    if (!gwTour) {
        gwTour = new Tour([
            {
                centered: true,
                emoji: '👋',
                title: 'Добро пожаловать!',
                text: '«Траектория» — игра с управлением жестами. 30 секунд, и ты знаешь всё.',
                nextLabel: 'Начать'
            },
            {
                selector: '#start-btn',
                title: 'Начать игру',
                text: 'Нажми — включится камера и запустится лабиринт. Управляй жестами или стрелками.',
                position: 'bottom',
                interactive: true,
                waitFor: () => gameStarted,
                waitText: 'Жду нажатия…'
            },
            {
                selector: '.maze-container',
                title: 'Лабиринт',
                text: 'Управляй шариком и дойди до красной цели. Каждый уровень — новое достижение.',
                position: 'top'
            },
            {
                selector: '.camera-container',
                title: 'Камера',
                text: 'Здесь видно твою руку. MediaPipe рисует точки и распознаёт жесты.',
                position: 'top'
            },
            {
                selector: '.gestures-info',
                title: 'Четыре жеста',
                text: 'Кулак, открытая ладонь, указательный палец, все пальцы вверх — четыре направления.',
                position: 'top'
            },
            {
                selector: '.sidebar-tabs',
                title: 'Боковое меню',
                text: 'Здесь всё остальное. Наведи — раскроется.',
                position: 'right'
            },
            {
                selector: '#tab-theme',
                title: 'Смена темы',
                text: 'Четыре цветовые схемы. Всё перекрашивается мгновенно.',
                position: 'right'
            },
            {
                selector: '#tab-leaderboard',
                title: 'Личные достижения',
                text: 'История твоих результатов: уровни, ходы, время.',
                position: 'right'
            },
            {
                selector: '#tab-settings',
                title: 'Настройки',
                text: 'Чувствительность, размер лабиринта, звук, камера — всё здесь.',
                position: 'right'
            },
            {
                centered: true,
                emoji: '🎉',
                title: 'Готово!',
                text: 'Теперь ты знаешь приложение. Приятной игры!',
                nextLabel: 'Погнали'
            }
        ]);
    }
    gwTour.start();
}

// ========== О ПРОГРАММЕ ==========
function openAboutPanel() {
    let modal = document.getElementById('about-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'about-modal';
        modal.className = 'about-modal';
        modal.innerHTML = `
            <div class="about-content">
                <button class="about-close" title="Закрыть"><i class="fas fa-times"></i></button>
                <div class="about-hero">
                    <div class="about-icon"><i class="fas fa-hand-sparkles"></i></div>
                    <h1>Траектория</h1>
                    <div class="about-subtitle">Игра-лабиринт с управлением жестами</div>
                </div>

                <div class="about-section">
                    <h3><i class="fas fa-info-circle"></i> Что это</h3>
                    <p>«Траектория» — интерактивная игра, в которой лабиринт управляется движениями рук перед камерой. Никаких клавиатур и мышек: только жесты, распознаваемые нейросетью MediaPipe Hands прямо в браузере.</p>
                </div>

                <div class="about-section">
                    <h3><i class="fas fa-bullseye"></i> Зачем это нужно</h3>
                    <ul>
                        <li><b>Разминка перед работой</b> — короткая пауза с пользой для рук.</li>
                        <li><b>Демонстрация технологий</b> — показывает возможности компьютерного зрения без установки ПО.</li>
                        <li><b>Обучение</b> — наглядный пример, как жесты превращаются в команды.</li>
                    </ul>
                </div>

                <div class="about-section">
                    <h3><i class="fas fa-brain"></i> Что развивает</h3>
                    <ul>
                        <li><b>Крупная моторика</b> — точность и плавность движений рук.</li>
                        <li><b>Зрительно-моторная координация</b> — связка «увидел → сделал жест».</li>
                        <li><b>Концентрация</b> — удержание руки в зоне камеры.</li>
                        <li><b>Реакция</b> — быстрый отклик на изменение лабиринта.</li>
                    </ul>
                </div>

                <div class="about-section">
                    <h3><i class="fas fa-gamepad"></i> Как играть</h3>
                    <p>Нажми «Начать игру» — включится камера. Держи руку на расстоянии 0.5–1 метр. Показывай жесты:</p>
                    <ul>
                        <li><b>Кулак</b> → вправо</li>
                        <li><b>Открытая ладонь</b> → влево</li>
                        <li><b>Указательный палец</b> → вниз</li>
                        <li><b>Все пальцы вверх</b> → вверх</li>
                    </ul>
                    <p>Если жесты не срабатывают — увеличь чувствительность в настройках.</p>
                </div>

                <div class="about-footer">
                    Траектория 3.2.0
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.about-close').addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
    modal.classList.add('active');
}