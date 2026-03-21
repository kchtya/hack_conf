// ==================== ИНИЦИАЛИЗАЦИЯ ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Загружаем ваш SVG файл
const robotImg = new Image();
robotImg.src = 'robot.svg?' + Date.now();

let svgLoaded = false;

robotImg.onload = () => {
    svgLoaded = true;
    console.log('✅ SVG робота успешно загружен');
};
robotImg.onerror = () => {
    console.error('❌ Ошибка загрузки robot.svg');
};

let width, height;
let gameActive = false;
let score = 0;
let misses = 0;
let timeLeft = 90;
let spawnInterval = null;
let currentTimer = null;
let animationId = null;
let highScore = localStorage.getItem('ddosHighScore') || 0;

// Объекты игры
let robots = [];
let particles = [];
let trailPoints = [];

// DOM элементы
const scoreElement = document.getElementById('scoreValue');
const timeElement = document.getElementById('timeValue');
const registrationScreen = document.getElementById('registrationScreen');
const resultScreen = document.getElementById('resultScreen');
const registrationForm = document.getElementById('registrationForm');
const restartBtn = document.getElementById('restartBtn');

// Добавляем счетчик промахов и рекорд
const missesElement = document.createElement('div');
missesElement.className = 'misses-box';
missesElement.innerHTML = 'ПРОМАХИ: <span id="missesValue">0</span>/15';
document.querySelector('.stats').appendChild(missesElement);
const missesValueElement = document.getElementById('missesValue');

const highScoreElement = document.createElement('div');
highScoreElement.className = 'highscore-box';
highScoreElement.innerHTML = '🏆 РЕКОРД: <span id="highScoreValue">' + highScore + '</span>';
document.querySelector('.stats').appendChild(highScoreElement);

function updateMissesDisplay() {
    if (missesValueElement) missesValueElement.textContent = misses;
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ddosHighScore', highScore);
        const highScoreSpan = document.getElementById('highScoreValue');
        if (highScoreSpan) highScoreSpan.textContent = highScore;
    }
}

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
                // Подъем вверх
                this.velocityY += this.gravity * 0.3;
                this.y += this.velocityY;
                this.x += this.velocityX;
                this.rotation += 0.02;
                
                // Проверка: достигли ли верхней точки (скорость стала положительной)
                if (this.velocityY >= 0) {
                    this.state = 'hanging';
                    this.hangFrames = 0;
                    this.velocityY = 0;
                }
                break;
                
            case 'hanging':
                // Зависаем в верхней точке
                this.hangFrames++;
                this.x += this.velocityX * 0.1;
                this.rotation = Math.sin(this.hangFrames * 0.15) * 0.05;
                
                // После зависания начинаем падать
                if (this.hangFrames >= this.maxHangFrames) {
                    this.state = 'falling';
                    this.velocityY = 1.5;
                }
                break;
                
            case 'falling':
                // Падение вниз с ускорением
                this.velocityY += this.gravity;
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
        return this.y > height + 100 || this.y < -100;
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
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
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
        scoreElement.textContent = score;
        updateHighScore();
        
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

// ==================== ФИЗИКА ====================
function updatePhysics() {
    if (!gameActive) return;
    
    for (let i = 0; i < robots.length; i++) {
        const robot = robots[i];
        robot.update();
        
        if (robot.shouldRemove()) {
            if (!robot.wasHit) {
                robot.wasHit = true;
                misses++;
                updateMissesDisplay();
                createMissEffect(robot.x, robot.y);
                
                if (misses >= 15) {
                    endGame('misses');
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
    if (!width || !height) return;
    
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
function updateTimeDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startGame() {
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
    misses = 0;
    timeLeft = 90;
    robots = [];
    particles = [];
    trailPoints = [];
    scoreElement.textContent = score;
    updateTimeDisplay();
    updateMissesDisplay();
    
    spawnInterval = setInterval(spawnRobot, 750);
    
    currentTimer = setInterval(() => {
        if (gameActive && timeLeft > 0) {
            timeLeft--;
            updateTimeDisplay();
            if (timeLeft <= 0) {
                endGame('time');
            }
        }
    }, 1000);
}

function endGame(reason) {
    gameActive = false;
    
    if (spawnInterval) {
        clearInterval(spawnInterval);
        spawnInterval = null;
    }
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }
    
    updateHighScore();
    
    const resultTitle = document.getElementById('resultTitle');
    const finalScoreSpan = document.getElementById('finalScore');
    finalScoreSpan.textContent = score;
    
    if (reason === 'misses') {
        resultTitle.textContent = 'ПОРАЖЕНИЕ!';
        resultTitle.className = 'result-title lose';
    } else if (score >= 250) {
        resultTitle.textContent = 'ПОБЕДА!';
        resultTitle.className = 'result-title win';
    } else {
        resultTitle.textContent = 'ПОРАЖЕНИЕ';
        resultTitle.className = 'result-title lose';
    }
    
    resultScreen.classList.remove('hidden');
}

function resetAndStart() {
    resultScreen.classList.add('hidden');
    startGame();
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function resizeCanvas() {
    const container = canvas.parentElement;
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;
}

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    checkHit(e.clientX, e.clientY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    addTrailPoint(mouseX, mouseY);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    checkHit(touch.clientX, touch.clientY);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameActive) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;
    addTrailPoint(touchX, touchY);
}, { passive: false });

// ==================== АНИМАЦИЯ ====================
function animate() {
    if (gameActive) {
        updatePhysics();
    }
    draw();
    animationId = requestAnimationFrame(animate);
}

// ==================== РЕГИСТРАЦИЯ ====================
registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    
    if (firstName && lastName && phone) {
        localStorage.setItem('ddosUser', JSON.stringify({ firstName, lastName, phone, score: 0, date: new Date().toISOString() }));
        registrationScreen.classList.add('hidden');
        startGame();
    } else {
        alert('Пожалуйста, заполните все поля');
    }
});

restartBtn.addEventListener('click', resetAndStart);

window.addEventListener('resize', () => {
    resizeCanvas();
});

// ==================== ЗАПУСК ====================
resizeCanvas();
animate();
console.log('DDoS Ниндзя запущена!');