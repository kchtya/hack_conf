// ==================== ИНИЦИАЛИЗАЦИЯ ====================
let gameCanvas = null;
let ctx = null;

// Загружаем ваш SVG файл
const robotImg = new Image();
robotImg.src = 'robot.svg?' + Date.now();

let svgLoaded = false;

robotImg.onload = () => {
    svgLoaded = true;
    console.log('SVG робота успешно загружен');
};
robotImg.onerror = () => {
    console.error('Ошибка загрузки robot.svg');
};

let width, height;
let gameActive = false;
let score = 0;
let lives = 15;  // Жизни увеличены до 15
let timeLeft = 90;
let spawnInterval = null;
let currentTimer = null;
let animationId = null;
let highScore = localStorage.getItem('ddosHighScore') || 0;

// Объекты игры
let robots = [];
let particles = [];
let trailPoints = [];

// Глобальные переменные для Vue
window.gameState = {
    score: 0,
    lives: 15,
    timeLeft: 90,
    isActive: false
};

// ==================== РОБОТ С ПРАВИЛЬНОЙ ФИЗИКОЙ ====================
class Robot {
    constructor(x, y) {
        const types = ['normal', 'fast', 'small', 'boss'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        switch(type) {
            case 'fast':
                this.color = '#0077ff';
                this.size = 52;
                this.points = 20;
                break;
            case 'small':
                this.color = '#00ffaa';
                this.size = 46;
                this.points = 25;
                break;
            case 'boss':
                this.color = '#ff6666';
                this.size = 68;
                this.points = 60;
                break;
            default:
                this.color = '#ffffff';
                this.size = 56;
                this.points = 10;
        }
        
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = this.size * 0.55;
        this.wasHit = false;
        this.rotation = 0;
        this.eyeBlink = 0;
        
        // ========== ПРАВИЛЬНАЯ ФИЗИКА ==========
        this.state = 'rising'; // rising, hanging, falling
        
        // Случайная высота подъема (от 150 до 350 пикселей вверх)
        const jumpHeight = 180 + Math.random() * 220;
        this.peakY = y - jumpHeight;
        
        // Начальная скорость вверх
        this.velocityY = -Math.sqrt(2 * 0.42 * jumpHeight);
        this.velocityX = (Math.random() - 0.5) * 1.5;
        this.gravity = 0.42;
        
        // Время зависания в верхней точке (кадры)
        this.hangFrames = 0;
        this.maxHangFrames = 20 + Math.random() * 25;
    }
    
    update() {
        switch(this.state) {
            case 'rising':
                this.velocityY += this.gravity;
                this.y += this.velocityY;
                this.x += this.velocityX;
                this.rotation += 0.02;
                
                if (this.velocityY >= 0) {
                    this.state = 'hanging';
                    this.hangFrames = 0;
                    this.velocityY = 0;
                }
                break;
                
            case 'hanging':
                this.hangFrames++;
                this.x += this.velocityX * 0.1;
                this.rotation = Math.sin(this.hangFrames * 0.15) * 0.05;
                
                if (this.hangFrames >= this.maxHangFrames) {
                    this.state = 'falling';
                    this.velocityY = 1.5;
                }
                break;
                
            case 'falling':
                this.velocityY += this.gravity;
                this.y += this.velocityY;
                this.x += this.velocityX;
                this.rotation += 0.06;
                break;

                this.velocityY += this.gravity;
                if (this.velocityY > 15) this.velocityY = 15;
                this.y += this.velocityY;
                this.x += this.velocityX;
                this.rotation += 0.06;
                break;
        }
        
        this.eyeBlink++;
        if (this.eyeBlink > 80) this.eyeBlink = 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const size = this.size;
        
        if (svgLoaded && robotImg.complete) {
            try {
                ctx.drawImage(robotImg, -size / 2, -size / 2, size, size);
                
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = this.color;
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = 'source-over';
                
                ctx.shadowBlur = 12;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.1, size * 0.1, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.1, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.1, size * 0.06, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.1, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, size * 0.15, size * 0.12, 0, Math.PI);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(0, -size / 2 - size * 0.2);
        ctx.stroke();
        ctx.fillStyle = '#ffaa55';
        ctx.beginPath();
        ctx.arc(0, -size / 2 - size * 0.2, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }
    
    shouldRemove() {
        return this.y > height + 200 || this.y < -200 || this.x < -200 || this.x > width + 200;
    }
}

// ==================== ЭФФЕКТЫ ====================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 2 + 1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life -= 0.02;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class TrailPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 1;
    }
    
    update() {
        this.life -= 0.05;
        return this.life > 0;
    }
}

function createSliceEffect(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, '#00ffaa'));
    }
    playSound();
}

function createMissEffect(x, y) {
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(x, y, '#ff6666'));
    }
}

function playSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.08;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
}

// ==================== СЛЕД ОТ КУРСОРА ====================
function addTrailPoint(x, y) {
    trailPoints.push(new TrailPoint(x, y));
    if (trailPoints.length > 15) trailPoints.shift();
}

// ==================== ПРОВЕРКА ПОПАДАНИЯ ====================
function checkHit(clientX, clientY) {
    if (!gameActive) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;
    
    addTrailPoint(mouseX, mouseY);
    
    let hitIndex = -1;
    let minDistance = 40;
    
    for (let i = 0; i < robots.length; i++) {
        const robot = robots[i];
        const dx = mouseX - robot.x;
        const dy = mouseY - robot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < robot.radius && distance < minDistance) {
            minDistance = distance;
            hitIndex = i;
        }
    }
    
    if (hitIndex !== -1) {
        const hit = robots[hitIndex];
        score += hit.points;
        
        // Обновляем глобальное состояние
        window.gameState.score = score;
        
        createSliceEffect(hit.x, hit.y);
        
        robots.splice(hitIndex, 1);
        
        if (navigator.vibrate) navigator.vibrate(50);
    }
}

// ==================== СПАВН РОБОТОВ ====================
function spawnRobot() {
    if (!gameActive) return;
    
    const x = Math.random() * (width - 140) + 70;
    const y = height - 30;
    
    const robot = new Robot(x, y);
    robots.push(robot);
}

// ==================== ФИЗИКА С ЖИЗНЯМИ ====================
function updatePhysics() {
    if (!gameActive) return;
    
    for (let i = 0; i < robots.length; i++) {
        const robot = robots[i];
        robot.update();
        
        if (robot.shouldRemove()) {
            if (!robot.wasHit) {
                robot.wasHit = true;
                
                // Отнимаем жизнь за улетевшего робота
                lives--;
                window.gameState.lives = lives;
                
                createMissEffect(robot.x, robot.y);
                
                // Проверка на поражение (жизни закончились)
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            robots.splice(i, 1);
            i--;
        }
    }
}

// ==================== ОТРИСОВКА ====================
function drawBackground() {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#0077ff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
        ctx.fillRect((i * 131) % width, (i * 253) % height, 1, 1);
    }
    
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, height - 35);
    ctx.lineTo(width, height - 35);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawTrail() {
    for (let i = 0; i < trailPoints.length; i++) {
        const point = trailPoints[i];
        ctx.globalAlpha = point.life * 0.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 * point.life, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffaa';
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function draw() {
    if (!width || !height || !ctx) return;
    
    drawBackground();
    
    for (const robot of robots) {
        robot.draw(ctx);
    }
    
    for (let i = 0; i < particles.length; i++) {
        const updated = particles[i].update();
        particles[i].draw(ctx);
        if (!updated) {
            particles.splice(i, 1);
            i--;
        }
    }
    
    drawTrail();
    
    for (let i = 0; i < trailPoints.length; i++) {
        const updated = trailPoints[i].update();
        if (!updated) {
            trailPoints.splice(i, 1);
            i--;
        }
    }
}

// ==================== УПРАВЛЕНИЕ ИГРОЙ ====================
function startGameInternal() {
    if (spawnInterval) {
        clearInterval(spawnInterval);
        spawnInterval = null;
    }
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }
    
    gameActive = true;
    score = 0;
    lives = 15;  // 15 жизней
    timeLeft = 90;
    robots = [];
    particles = [];
    trailPoints = [];
    
    window.gameState.score = 0;
    window.gameState.lives = 15;
    window.gameState.timeLeft = 90;
    window.gameState.isActive = true;
    
    spawnInterval = setInterval(spawnRobot, 750);
    
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
    
    if (spawnInterval) {
        clearInterval(spawnInterval);
        spawnInterval = null;
    }
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }
    
    // Сохраняем рекорд
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ddosHighScore', highScore);
    }
    
    // Вызываем колбэк если есть
    if (window.onGameEnd) {
        window.onGameEnd(score, Math.floor(score / 10));
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    if (!gameCanvas) return;
    
    gameCanvas.addEventListener('mousemove', (e) => {
        e.preventDefault();
        checkHit(e.clientX, e.clientY);
    });
    
    gameCanvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;
        const rect = gameCanvas.getBoundingClientRect();
        const scaleX = gameCanvas.width / rect.width;
        const scaleY = gameCanvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        addTrailPoint(mouseX, mouseY);
    });
    
    gameCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        checkHit(touch.clientX, touch.clientY);
    }, { passive: false });
    
    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameActive) return;
        const touch = e.touches[0];
        const rect = gameCanvas.getBoundingClientRect();
        const scaleX = gameCanvas.width / rect.width;
        const scaleY = gameCanvas.height / rect.height;
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        addTrailPoint(touchX, touchY);
    }, { passive: false });
}

function resizeCanvasInternal() {
    if (!gameCanvas) return;
    const container = gameCanvas.parentElement;
    if (container) {
        width = container.clientWidth;
        height = container.clientHeight - 80; // вычитаем высоту game-info
        gameCanvas.width = width;
        gameCanvas.height = height;
        console.log('Canvas resized:', width, height);
    }
}

// ==================== АНИМАЦИЯ ====================
function animateGame() {
    if (gameActive) {
        updatePhysics();
        
        // Отладка: выводим состояние первого робота
        if (robots.length > 0) {
            const r = robots[0];
            console.log('Робот:', r.state, 'y:', r.y.toFixed(1), 'vy:', r.velocityY.toFixed(2));
        }
    }
    draw();
    animationId = requestAnimationFrame(animateGame);
}


// ==================== ЭКСПОРТ ДЛЯ ИНТЕГРАЦИИ ====================
window.startDDoSGame = function(canvas, onEnd) {
    // Останавливаем предыдущую игру
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Устанавливаем новый canvas
    gameCanvas = canvas;
    ctx = gameCanvas.getContext('2d');
    
    // Настраиваем колбэк
    window.onGameEnd = onEnd;
    
    // Инициализируем
    resizeCanvasInternal();
    setupEventListeners(
        // В функции setupEventListeners или в начале файла
function setupTouchEvents() {
    if (!gameCanvas) return;
    
    // Отключаем прокрутку страницы при касании canvas
    gameCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        checkHit(touch.clientX, touch.clientY);
    }, { passive: false });
    
    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameActive) return;
        const touch = e.touches[0];
        const rect = gameCanvas.getBoundingClientRect();
        const scaleX = gameCanvas.width / rect.width;
        const scaleY = gameCanvas.height / rect.height;
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        addTrailPoint(touchX, touchY);
    }, { passive: false });
    
    gameCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
    });
}
    );
    
    // Запускаем игру
    startGameInternal();
    
    // Запускаем анимацию
    animateGame();
    
    // Возвращаем объект управления
    return {
        isActive: true,
        score: score,
        lives: lives,
        timeLeft: timeLeft,
        destroy: function() {
            gameActive = false;
            window.gameState.isActive = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (spawnInterval) clearInterval(spawnInterval);
            if (currentTimer) clearInterval(currentTimer);
            robots = [];
        }
    };
    // Принудительное обновление размеров canvas при загрузке
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
        console.log('Canvas размеры обновлены');
    }, 100);
});

// Экспортируем функцию для ручного обновления
window.updateCanvasSize = function() {
    if (typeof resizeCanvas === 'function') {
        resizeCanvas();
    }
};
};

window.addEventListener('resize', () => {
    resizeCanvasInternal();
});

// Принудительное обновление размеров canvas при загрузке
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof resizeCanvasInternal === 'function') {
            resizeCanvasInternal();
        }
        console.log('Canvas размеры обновлены');
    }, 100);
});

// Экспортируем функцию для ручного обновления
window.updateCanvasSize = function() {
    if (typeof resizeCanvasInternal === 'function') {
        resizeCanvasInternal();
    }
};

// Функция для обновления размеров canvas
function resizeCanvasInternal() {
    if (!gameCanvas) return;
    const container = gameCanvas.parentElement;
    if (container) {
        const rect = container.getBoundingClientRect();
        width = rect.width - 40;
        height = rect.height - 100;
        gameCanvas.width = width;
        gameCanvas.height = height;
        console.log('Canvas resized:', width, height);
    }
}

// Добавляем слушатель изменения размера окна
window.addEventListener('resize', () => {
    resizeCanvasInternal();
});

console.log('DDoS Ниндзя готова к интеграции! Жизней: 15');