// Кибер-фон с частицами в стиле DDoS-Guard
class CyberBackground {
    constructor(canvas) {
        this.canvas = canvas;
        if (!this.canvas) {
            console.error('Canvas не найден');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;
        this.mouseX = null;
        this.mouseY = null;
        this.time = 0;
        
        this.init();
        this.bindEvents();
        this.animate();
        window.addEventListener('resize', () => this.resize());
    }
    
    init() {
        this.resize();
        this.createParticles();
        console.log('CyberBackground инициализирован');
    }
    
    bindEvents() {
        // Отслеживание движения мыши для интерактива
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        window.addEventListener('mouseleave', () => {
            this.mouseX = null;
            this.mouseY = null;
        });
        
        // Для мобильных устройств
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.mouseX = e.touches[0].clientX;
                this.mouseY = e.touches[0].clientY;
            }
        });
        
        window.addEventListener('touchend', () => {
            this.mouseX = null;
            this.mouseY = null;
        });
    }
    
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles();
    }
    
    createParticles() {
        if (!this.canvas) return;
        this.particles = [];
        const particleCount = Math.min(200, Math.floor((this.canvas.width * this.canvas.height) / 12000));
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 3 + 1,
                alpha: Math.random() * 0.6 + 0.2,
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.4,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.01 + Math.random() * 0.03,
                color: `hsl(${260 + Math.random() * 40}, 70%, 55%)`
            });
        }
        console.log('Создано частиц:', particleCount);
    }
    
    draw() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.time += 0.01;
        
        // Рисуем радиальный градиент для глубины
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height / 1.5
        );
        gradient.addColorStop(0, 'rgba(10, 8, 32, 0.3)');
        gradient.addColorStop(1, 'rgba(3, 3, 24, 0.8)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем шестиугольную сетку
        this.drawHexGrid();
        
        // Рисуем частицы
        for (const p of this.particles) {
            // Движение
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += p.pulseSpeed;
            
            // Реакция на движение мыши
            if (this.mouseX !== null && this.mouseY !== null) {
                const dx = p.x - this.mouseX;
                const dy = p.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 150;
                
                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 1.2;
                    p.y += Math.sin(angle) * force * 1.2;
                }
            }
            
            // Отражение от границ
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
            
            const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.25;
            const glowSize = 1 + Math.sin(p.pulse) * 0.5;
            
            // Внешнее свечение
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius + glowSize, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(107, 78, 255, ${pulseAlpha * 0.3})`;
            this.ctx.fill();
            
            // Основная частица
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(107, 78, 255, ${pulseAlpha * 0.8})`;
            this.ctx.fill();
            
            // Ядро частицы
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 107, 78, ${pulseAlpha * 0.6})`;
            this.ctx.fill();
        }
        
        // Рисуем соединительные линии
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    const opacity = 0.2 * (1 - distance / 150);
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    
                    // Градиент для линий
                    const lineGradient = this.ctx.createLinearGradient(
                        this.particles[i].x, this.particles[i].y,
                        this.particles[j].x, this.particles[j].y
                    );
                    lineGradient.addColorStop(0, `rgba(107, 78, 255, ${opacity})`);
                    lineGradient.addColorStop(1, `rgba(255, 107, 78, ${opacity})`);
                    this.ctx.strokeStyle = lineGradient;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.stroke();
                }
            }
        }
        
        // Рисуем свечение от мыши
        if (this.mouseX !== null && this.mouseY !== null) {
            const mouseGradient = this.ctx.createRadialGradient(
                this.mouseX, this.mouseY, 0,
                this.mouseX, this.mouseY, 200
            );
            mouseGradient.addColorStop(0, 'rgba(107, 78, 255, 0.2)');
            mouseGradient.addColorStop(0.5, 'rgba(107, 78, 255, 0.1)');
            mouseGradient.addColorStop(1, 'rgba(107, 78, 255, 0)');
            
            this.ctx.fillStyle = mouseGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    drawHexGrid() {
        if (!this.ctx) return;
        const hexSize = 45;
        const hexWidth = hexSize * 2;
        const hexHeight = hexSize * 1.732;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.strokeStyle = '#6b4eff';
        this.ctx.lineWidth = 0.8;
        
        const offsetX = (this.time * 2) % hexWidth;
        const offsetY = (this.time * 1.5) % hexHeight;
        
        for (let x = -hexSize; x < this.canvas.width + hexSize; x += hexWidth) {
            for (let y = -hexSize; y < this.canvas.height + hexSize; y += hexHeight) {
                const xPos = x + offsetX + (Math.floor(y / hexHeight) % 2) * hexSize;
                const yPos = y + offsetY;
                this.drawHexagon(xPos, yPos, hexSize);
            }
        }
        
        this.ctx.restore();
    }
    
    drawHexagon(x, y, size) {
        if (!this.ctx) return;
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(xPos, yPos);
            else this.ctx.lineTo(xPos, yPos);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    animate() {
        if (!this.ctx) return;
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Запускаем фон после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cyberCanvas');
    if (canvas) {
        console.log('CyberCanvas найден, запускаем фон');
        window.cyberBg = new CyberBackground(canvas);
    } else {
        console.error('Canvas с id="cyberCanvas" не найден');
    }
});