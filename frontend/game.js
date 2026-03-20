// DDoS-Ninja Game - Robot Slayer Edition
class DDoSGame {
    constructor(canvas, onGameEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameEnd = onGameEnd;
        
        this.width = 800;
        this.height = 500;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.robots = [];
        this.trails = [];
        this.sparks = [];
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 120;
        this.gameRunning = true;
        
        this.lastSpawn = 0;
        this.spawnDelay = 800;
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.isSlashing = false;
        
        this.initEvents();
        this.spawnRobot();
    }
    
    initEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            
            if (this.isSlashing) {
                this.addTrail(this.mouseX, this.mouseY);
                this.checkSlice();
            }
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.isSlashing = true;
            this.trails = [];
        });
        
        window.addEventListener('mouseup', () => {
            this.isSlashing = false;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (touch.clientX - rect.left) * scaleX;
            this.mouseY = (touch.clientY - rect.top) * scaleY;
            this.addTrail(this.mouseX, this.mouseY);
            this.checkSlice();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isSlashing = true;
            this.trails = [];
        });
        
        window.addEventListener('touchend', () => {
            this.isSlashing = false;
        });
    }
    
    addTrail(x, y) {
        this.trails.push({ x, y, life: 10 });
        if (this.trails.length > 30) this.trails.shift();
    }
    
    addSparks(x, y) {
        for (let i = 0; i < 8; i++) {
            this.sparks.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                life: 15,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    checkSlice() {
        for (let i = 0; i < this.robots.length; i++) {
            const robot = this.robots[i];
            const dx = this.mouseX - robot.x;
            const dy = this.mouseY - robot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < robot.radius) {
                this.robots.splice(i, 1);
                this.score += 10;
                this.addSparks(robot.x, robot.y);
                this.addSliceEffect(robot.x, robot.y);
                i--;
            }
        }
    }
    
    addSliceEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.trails.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, life: 5 });
        }
    }
    
    spawnRobot() {
        const radius = 38;
        const x = Math.random() * (this.width - radius * 2) + radius;
        const y = -radius;
        const speedX = (Math.random() - 0.5) * 2;
        const speedY = Math.random() * 3 + 2.5;
        
        this.robots.push({
            x, y, radius,
            speedX, speedY,
            type: Math.floor(Math.random() * 3),
            anger: Math.random() * Math.PI * 2,
            glow: 0
        });
    }
    
    update() {
        if (!this.gameRunning) return;
        
        for (let i = 0; i < this.robots.length; i++) {
            const robot = this.robots[i];
            robot.x += robot.speedX;
            robot.y += robot.speedY;
            robot.anger += 0.05;
            robot.glow = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
            
            if (robot.y - robot.radius > this.height) {
                this.robots.splice(i, 1);
                this.lives--;
                i--;
                if (this.lives <= 0) {
                    this.endGame();
                }
            }
            
            if (robot.x - robot.radius < 0 || robot.x + robot.radius > this.width) {
                robot.speedX *= -1;
            }
        }
        
        const now = Date.now();
        if (now - this.lastSpawn > this.spawnDelay) {
            this.spawnRobot();
            this.lastSpawn = now;
            if (this.spawnDelay > 400) this.spawnDelay -= 10;
        }
        
        for (let i = 0; i < this.trails.length; i++) {
            this.trails[i].life--;
            if (this.trails[i].life <= 0) {
                this.trails.splice(i, 1);
                i--;
            }
        }
        
        for (let i = 0; i < this.sparks.length; i++) {
            this.sparks[i].x += this.sparks[i].vx;
            this.sparks[i].y += this.sparks[i].vy;
            this.sparks[i].vy += 0.2;
            this.sparks[i].life--;
            if (this.sparks[i].life <= 0) {
                this.sparks.splice(i, 1);
                i--;
            }
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        for (const robot of this.robots) {
            this.drawRobot(robot.x, robot.y, robot.radius, robot.type, robot.glow);
        }
        
        for (const spark of this.sparks) {
            this.ctx.beginPath();
            this.ctx.fillStyle = `rgba(255, 107, 78, ${spark.life / 15})`;
            this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.beginPath();
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#ff6b4e';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ff6b4e';
        
        for (let i = 0; i < this.trails.length - 1; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.trails[i].x, this.trails[i].y);
            this.ctx.lineTo(this.trails[i + 1].x, this.trails[i + 1].y);
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
        
        for (const trail of this.trails) {
            this.ctx.beginPath();
            this.ctx.fillStyle = `rgba(255, 107, 78, ${trail.life / 10})`;
            this.ctx.arc(trail.x, trail.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawRobot(x, y, r, type, glow) {
        this.ctx.save();
        this.ctx.shadowBlur = 0;
        
        // Металлический корпус с градиентом
        const gradient = this.ctx.createLinearGradient(x - r * 0.5, y - r * 0.5, x + r * 0.5, y + r * 0.5);
        gradient.addColorStop(0, '#3a3a5a');
        gradient.addColorStop(0.5, '#2a2a4a');
        gradient.addColorStop(1, '#1a1a3a');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, r, r * 1.05, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Бронепластины
        this.ctx.fillStyle = '#2a2a4a';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + r * 0.2, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        const eyeGlow = 0.5 + glow * 0.5;
        
        // Левый глаз
        this.ctx.beginPath();
        this.ctx.ellipse(x - r * 0.35, y - r * 0.15, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 60, 50, ${0.7 + eyeGlow * 0.3})`;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.38, y - r * 0.18, r * 0.08, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();
        
        // Правый глаз
        this.ctx.beginPath();
        this.ctx.ellipse(x + r * 0.35, y - r * 0.15, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 60, 50, ${0.7 + eyeGlow * 0.3})`;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x + r * 0.32, y - r * 0.18, r * 0.08, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();
        
        // Свечение вокруг глаз
        this.ctx.beginPath();
        this.ctx.ellipse(x - r * 0.35, y - r * 0.15, r * 0.25, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 80, 60, ${0.2 + eyeGlow * 0.2})`;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(x + r * 0.35, y - r * 0.15, r * 0.25, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Антенны
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.2, y - r);
        this.ctx.lineTo(x - r * 0.35, y - r - 18);
        this.ctx.lineTo(x - r * 0.05, y - r - 15);
        this.ctx.fillStyle = '#4a4a6a';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + r * 0.2, y - r);
        this.ctx.lineTo(x + r * 0.35, y - r - 18);
        this.ctx.lineTo(x + r * 0.05, y - r - 15);
        this.ctx.fill();
        
        // Светодиоды на антеннах
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.2, y - r - 17, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(107, 78, 255, ${0.6 + glow * 0.4})`;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x + r * 0.2, y - r - 17, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Злой рот
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + r * 0.25, r * 0.35, r * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1a1a2a';
        this.ctx.fill();
        
        // Зубы
        for (let i = -2; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.rect(x + i * 8 - 4, y + r * 0.2, 5, 8);
            this.ctx.fillStyle = '#ffaa66';
            this.ctx.fill();
        }
        
        // Металлические заклепки
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.55, y + r * 0.35, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffaa66';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x + r * 0.55, y + r * 0.35, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Неоновый контур
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, r + 2, r * 1.05 + 2, 0, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(107, 78, 255, ${0.3 + glow * 0.3})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    updateTimer() {
        this.timeLeft--;
        if (this.timeLeft <= 0 || this.lives <= 0) {
            this.endGame();
        }
    }
    
    endGame() {
        this.gameRunning = false;
        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.getKills());
        }
    }
    
    getKills() {
        return Math.floor(this.score / 10);
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }
    
    destroy() {
        this.stopTimer();
        this.gameRunning = false;
    }
}

let currentGame = null;

function startRobotGame(onEnd) {
    const canvas = document.getElementById('gameCanvas');
    if (currentGame) {
        currentGame.destroy();
    }
    currentGame = new DDoSGame(canvas, onEnd);
    currentGame.startTimer();
    
    function gameLoop() {
        if (!currentGame.gameRunning) return;
        currentGame.update();
        currentGame.draw();
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
    
    return currentGame;
}