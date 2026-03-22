// ==================== ИНИЦИАЛИЗАЦИЯ ====================
let gameCanvas = null;
let ctx = null;

// Функция для создания цветного SVG робота
function createColoredRobotSVG(color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="${color}" d="M352 64C352 46.3 337.7 32 320 32C302.3 32 288 46.3 288 64L288 128L192 128C139 128 96 171 96 224L96 448C96 501 139 544 192 544L448 544C501 544 544 501 544 448L544 224C544 171 501 128 448 128L352 128L352 64zM160 432C160 418.7 170.7 408 184 408L216 408C229.3 408 240 418.7 240 432C240 445.3 229.3 456 216 456L184 456C170.7 456 160 445.3 160 432zM280 432C280 418.7 290.7 408 304 408L336 408C349.3 408 360 418.7 360 432C360 445.3 349.3 456 336 456L304 456C290.7 456 280 445.3 280 432zM400 432C400 418.7 410.7 408 424 408L456 408C469.3 408 480 418.7 480 432C480 445.3 469.3 456 456 456L424 456C410.7 456 400 445.3 400 432zM224 240C250.5 240 272 261.5 272 288C272 314.5 250.5 336 224 336C197.5 336 176 314.5 176 288C176 261.5 197.5 240 224 240zM368 288C368 261.5 389.5 240 416 240C442.5 240 464 261.5 464 288C464 314.5 442.5 336 416 336C389.5 336 368 314.5 368 288zM64 288C64 270.3 49.7 256 32 256C14.3 256 0 270.3 0 288L0 384C0 401.7 14.3 416 32 416C49.7 416 64 401.7 64 384L64 288zM608 256C590.3 256 576 270.3 576 288L576 384C576 401.7 590.3 416 608 416C625.7 416 640 401.7 640 384L640 288C640 270.3 625.7 256 608 256z"/></svg>`;
}

// Кэш для загруженных SVG изображений
const robotImages = {
    normal: null,
    fast: null,
    small: null,
    boss: null
};

// Загружаем роботов разных цветов
function loadRobotImages() {
    const colors = {
        normal: '#6b4eff',   // фиолетовый
        fast: '#3a86ff',     // синий
        small: '#38b000',    // зеленый
        boss: '#d90429'      // красный
    };
    
    for (const [type, color] of Object.entries(colors)) {
        const svg = createColoredRobotSVG(color);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            console.log(`Робот типа ${type} загружен`);
        };
        robotImages[type] = img;
    }
}

// Загружаем сразу
loadRobotImages();

let width, height;
let gameActive = false;
let score = 0;
let lives = 15;
let timeLeft = 90;
let spawnInterval = null;
let currentTimer = null;
let animationId = null;
let highScore = localStorage.getItem('ddosHighScore') || 0;

let robots = [];
let particles = [];
let trailPoints = [];

window.gameState = {
    score: 0,
    lives: 15,
    timeLeft: 90,
    isActive: false
};

// ==================== РОБОТ ====================
class Robot {
    constructor(x, y) {
        // Типы роботов
        const types = ['normal', 'fast', 'small', 'boss'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        switch(type) {
            case 'fast':
                this.color = '#3a86ff';
                this.size = 65;
                this.points = 20;
                this.speedMult = 1.4;
                break;
            case 'small':
                this.color = '#38b000';
                this.size = 55;
                this.points = 25;
                this.speedMult = 1.2;
                break;
            case 'boss':
                this.color = '#d90429';
                this.size = 85;
                this.points = 60;
                this.speedMult = 0.65;
                break;
            default:
                this.color = '#6b4eff';
                this.size = 70;
                this.points = 10;
                this.speedMult = 1;
        }
        
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = this.size * 0.4;
        this.wasHit = false;
        this.rotation = 0;
        this.blinkTimer = 0;
        this.isCut = false;
        
        // ФИЗИКА - ВЗЛЕТАЮТ ВЫСОКО 380-480
        this.startY = y;
        this.vy = -18 * this.speedMult;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.gravity = 0.48;
        
        this.hoverTimer = 0;
        this.maxHover = 18 + Math.random() * 15;
        this.isHovering = false;
        
        // ВЫСОТА ПОДЪЕМА 380-480 ПИКСЕЛЕЙ
        this.maxHeight = y - 380 - Math.random() * 100;
    }
    
    update() {
        if (!this.isHovering && this.vy < 0 && this.y <= this.maxHeight) {
            this.isHovering = true;
            this.hoverTimer = 0;
            this.vy = 0;
        }
        
        if (this.isHovering) {
            this.hoverTimer++;
            this.rotation = Math.sin(this.hoverTimer * 0.15) * 0.12;
            
            if (this.hoverTimer >= this.maxHover) {
                this.isHovering = false;
                this.vy = 3.5;
            }
        } else {
            this.vy += this.gravity;
            this.rotation += 0.06;
        }
        
        this.y += this.vy;
        this.x += this.vx;
        
        this.blinkTimer++;
        if (this.blinkTimer > 65) this.blinkTimer = 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const size = this.size;
        const robotImg = robotImages[this.type];
        
        if (robotImg && robotImg.complete && robotImg.naturalWidth > 0) {
            try {
                // Рисуем цветного SVG робота
                ctx.drawImage(robotImg, -size / 2, -size / 2, size, size);
                
                // Добавляем свечение цветом
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                
            } catch(e) {
                this.drawFallback(ctx, size);
            }
        } else {
            this.drawFallback(ctx, size);
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    
    drawFallback(ctx, size) {
        // Запасной вариант - если SVG не загрузился
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Глаза
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.1, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.1, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        const pupilSize = this.blinkTimer < 6 ? size * 0.04 : size * 0.08;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.1, pupilSize, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.1, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Антенна
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(0, -size / 2 - 12);
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.arc(0, -size / 2 - 12, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    shouldRemove() {
        return this.y > height + 150 || this.y < -200;
    }
}

// ==================== ЧАСТИЦЫ ====================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 14;
        this.vy = (Math.random() - 0.5) * 12 - 6;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life -= 0.03;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ==================== СЛЕД (НЕПРЕРЫВНАЯ ЛИНИЯ) ====================
class TrailPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 1;
    }
    
    update() {
        this.life -= 0.04;
        return this.life > 0;
    }
}

let trailPointsList = [];

function addTrailPoint(x, y) {
    trailPointsList.push(new TrailPoint(x, y));
    while (trailPointsList.length > 40) trailPointsList.shift();
}

function drawTrail() {
    if (trailPointsList.length < 2) return;
    
    ctx.save();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(trailPointsList[0].x, trailPointsList[0].y);
    for (let i = 1; i < trailPointsList.length; i++) {
        ctx.lineTo(trailPointsList[i].x, trailPointsList[i].y);
    }
    
    const gradient = ctx.createLinearGradient(
        trailPointsList[0].x, trailPointsList[0].y,
        trailPointsList[trailPointsList.length - 1].x, trailPointsList[trailPointsList.length - 1].y
    );
    gradient.addColorStop(0, '#ff6b4e');
    gradient.addColorStop(0.5, '#ffaa44');
    gradient.addColorStop(1, '#ff6b4e');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(trailPointsList[0].x, trailPointsList[0].y);
    for (let i = 1; i < trailPointsList.length; i++) {
        ctx.lineTo(trailPointsList[i].x, trailPointsList[i].y);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
    
    ctx.restore();
}

// ==================== РЕЗАНИЕ ПРИ НАВЕДЕНИИ ====================
function checkSlice(clientX, clientY) {
    if (!gameActive) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;
    
    addTrailPoint(mouseX, mouseY);
    
    for (let i = robots.length - 1; i >= 0; i--) {
        const robot = robots[i];
        const dx = mouseX - robot.x;
        const dy = mouseY - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < robot.radius && !robot.isCut) {
            robot.isCut = true;
            score += robot.points;
            window.gameState.score = score;
            
            // Эффект разрушения
            for (let j = 0; j < 35; j++) {
                particles.push(new Particle(robot.x, robot.y, robot.color));
            }
            for (let j = 0; j < 20; j++) {
                particles.push(new Particle(robot.x, robot.y, '#ffaa44'));
            }
            
            // Звук
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = 800 + Math.random() * 200;
                gain.gain.value = 0.12;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.12);
                osc.stop(audioCtx.currentTime + 0.12);
            } catch(e) {}
            
            if (navigator.vibrate) navigator.vibrate(40);
            
            robots.splice(i, 1);
        }
    }
}

// ==================== ПРОВЕРКА ПРОПУЩЕННЫХ ====================
function checkMissed() {
    for (let i = robots.length - 1; i >= 0; i--) {
        const robot = robots[i];
        
        if (robot.y > height + 100 || robot.y < -150) {
            if (!robot.wasHit) {
                robot.wasHit = true;
                lives--;
                window.gameState.lives = lives;
                
                for (let j = 0; j < 25; j++) {
                    particles.push(new Particle(robot.x, robot.y, '#ff4444'));
                }
                
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            robots.splice(i, 1);
        }
    }
}

// ==================== СПАВН ====================
function spawnRobot() {
    if (!gameActive) return;
    
    const margin = 70;
    const x = margin + Math.random() * (width - margin * 2);
    const y = height - 35;
    
    const robot = new Robot(x, y);
    robots.push(robot);
}

// ==================== ОТРИСОВКА ФОНА ====================
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0c18');
    gradient.addColorStop(0.5, '#0f1222');
    gradient.addColorStop(1, '#080b15');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#6b4eff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;
    
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`;
        ctx.fillRect((i * 131) % width, (i * 253) % height, 1.5, 1.5);
    }
}

function draw() {
    if (!width || !height || !ctx) return;
    
    drawBackground();
    
    for (const robot of robots) {
        robot.draw(ctx);
    }
    
    drawTrail();
    
    for (let i = 0; i < particles.length; i++) {
        const updated = particles[i].update();
        particles[i].draw(ctx);
        if (!updated) {
            particles.splice(i, 1);
            i--;
        }
    }
    
    for (let i = 0; i < trailPointsList.length; i++) {
        const updated = trailPointsList[i].update();
        if (!updated) {
            trailPointsList.splice(i, 1);
            i--;
        }
    }
}

// ==================== УПРАВЛЕНИЕ ====================
function startGameInternal() {
    if (spawnInterval) clearInterval(spawnInterval);
    if (currentTimer) clearInterval(currentTimer);
    
    gameActive = true;
    score = 0;
    lives = 15;
    timeLeft = 90;
    robots = [];
    particles = [];
    trailPointsList = [];
    
    window.gameState.score = 0;
    window.gameState.lives = 15;
    window.gameState.timeLeft = 90;
    window.gameState.isActive = true;
    
    spawnInterval = setInterval(spawnRobot, 700);
    
    currentTimer = setInterval(() => {
        if (gameActive && timeLeft > 0) {
            timeLeft--;
            window.gameState.timeLeft = timeLeft;
            if (timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    window.gameState.isActive = false;
    
    if (spawnInterval) clearInterval(spawnInterval);
    if (currentTimer) clearInterval(currentTimer);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ddosHighScore', highScore);
    }
    
    if (window.onGameEnd) {
        window.onGameEnd(score, Math.floor(score / 10));
    }
}

function updateGame() {
    if (!gameActive) return;
    
    for (const robot of robots) {
        robot.update();
    }
    checkMissed();
}

function animateGame() {
    updateGame();
    draw();
    animationId = requestAnimationFrame(animateGame);
}

// ==================== СОБЫТИЯ ====================
function setupEvents() {
    if (!gameCanvas) return;
    
    gameCanvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;
        checkSlice(e.clientX, e.clientY);
    });
    
    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameActive) return;
        const touch = e.touches[0];
        checkSlice(touch.clientX, touch.clientY);
    }, { passive: false });
}

function resizeCanvas() {
    if (!gameCanvas) return;
    const rect = gameCanvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    gameCanvas.width = width;
    gameCanvas.height = height;
}

// ==================== ЭКСПОРТ ====================
window.startDDoSGame = function(canvas, onEnd) {
    if (animationId) cancelAnimationFrame(animationId);
    
    gameCanvas = canvas;
    ctx = gameCanvas.getContext('2d');
    window.onGameEnd = onEnd;
    
    resizeCanvas();
    setupEvents();
    startGameInternal();
    animateGame();
    
    return {
        destroy: function() {
            gameActive = false;
            if (animationId) cancelAnimationFrame(animationId);
            if (spawnInterval) clearInterval(spawnInterval);
            if (currentTimer) clearInterval(currentTimer);
        }
    };
};

// Функция для обновления размера canvas с задержкой
window.updateCanvasSize = function() {
    if (gameCanvas) {
        setTimeout(() => {
            const rect = gameCanvas.parentElement?.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
                width = rect.width;
                height = rect.height;
                gameCanvas.width = width;
                gameCanvas.height = height;
                console.log('Canvas размер обновлен:', width, 'x', height);
            }
        }, 100);
    }
};

// Следим за изменением размера окна
window.addEventListener('resize', () => {
    setTimeout(window.updateCanvasSize, 150);
});

window.updateCanvasSize = resizeCanvas;
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => setTimeout(resizeCanvas, 100));

console.log('DDoS Ниндзя готова! Цветные роботы, взлетают на 380-480px, режутся при наведении');
