// DDoS Ниндзя - Основной файл приложения
new Vue({
    el: '#app',
    data: {
        registered: false,
        gameActive: false,
        gameEnded: false,
        showAccountModal: false,
        showAdminPanel: false,
        showTournament: false,
        notificationsEnabled: true,
        authMode: 'register',
        isAdmin: false,
        userId: null,
        adminCredentials: {
            phone: '+7 (999) 123-45-67',
            password: 'admin2026'
        },
        loginData: {
            phone: '',
            password: ''
        },
        user: {
            firstName: '',
            lastName: '',
            phone: '',
            password: '',
            consent: false
        },
        highScore: 0,
        totalKills: 0,
        score: 0,
        lives: 15,
        gameTime: 90,
        finalScore: 0,
        finalKills: 0,
        showRules: false,
        currentGame: null,
        gameStatus: '',
        resultStatus: '',
        winScore: 250,
        tournamentData: [],
        gameInterval: null,
        factInterval: null,
        factTimeout: null
    },
    
    computed: {
        sortedTournament() {
            return [...this.tournamentData].sort((a, b) => b.score - a.score);
        },
        topTen() {
            return this.sortedTournament.slice(0, 10);
        },
        topScore() {
            if (this.tournamentData.length === 0) return 0;
            return Math.max(...this.tournamentData.map(p => p.score));
        },
        myRank() {
            if (!this.registered) return null;
            const sorted = this.sortedTournament;
            const index = sorted.findIndex(p => 
                p.phone === this.user.phone && 
                p.first_name === this.user.firstName && 
                p.last_name === this.user.lastName
            );
            return index !== -1 ? index + 1 : null;
        },
        myScore() {
            if (!this.registered) return null;
            const myEntry = this.tournamentData.find(p => 
                p.phone === this.user.phone && 
                p.first_name === this.user.firstName && 
                p.last_name === this.user.lastName
            );
            return myEntry ? myEntry.score : null;
        },
        gameStatusClass() {
            return this.gameStatus === 'ПОБЕДА' ? 'status-win' : 'status-lose';
        },
        resultStatusClass() {
            return this.resultStatus === 'ПОБЕДА' ? 'status-win' : 'status-lose';
        },
        notificationsButtonText() {
            return this.notificationsEnabled ? 'Отключить уведомления' : 'Включить уведомления';
        },
        notificationsButtonClass() {
            return this.notificationsEnabled ? 'btn-notifications on' : 'btn-notifications';
        }
    },
    
    methods: {
        validatePhone(phone) {
            const cleanPhone = phone.replace(/[\s\(\)\-]/g, '');
            const phonePattern = /^(\+7|7|8)?\d{10}$/;
            
            if (!phonePattern.test(cleanPhone)) {
                return false;
            }
            const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
            return digitsOnly.length === 10 || digitsOnly.length === 11;
        },
        
        formatPhone(phone) {
            const clean = phone.replace(/[^\d]/g, '');
            if (clean.length === 11) {
                return `+${clean[0]} (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9, 11)}`;
            } else if (clean.length === 10) {
                return `+7 (${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 10)}`;
            }
            return phone;
        },
        
        register() {
            if (!this.user.firstName || !this.user.lastName || !this.user.phone || !this.user.password || !this.user.consent) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }
            
            if (!this.validatePhone(this.user.phone)) {
                alert('Пожалуйста, введите корректный номер телефона');
                return;
            }
            
            if (this.user.password.length < 6) {
                alert('Пароль должен содержать минимум 6 символов');
                return;
            }
            
            this.user.phone = this.formatPhone(this.user.phone);
            
            fetch('backend/api.php?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: this.user.firstName,
                    lastName: this.user.lastName,
                    phone: this.user.phone,
                    password: this.user.password
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.userId = data.user.id;
                    this.registered = true;
                    localStorage.setItem('ddosUserId', this.userId);
                    localStorage.setItem('ddosUser', JSON.stringify({
                        id: this.userId,
                        firstName: this.user.firstName,
                        lastName: this.user.lastName,
                        phone: this.user.phone
                    }));
                    this.loadUserStats();
                    this.loadTournament();
                    console.log('Регистрация успешна');
                } else {
                    alert(data.error);
                }
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Ошибка соединения с сервером');
            });
        },
        
        login() {
            if (!this.loginData.phone || !this.loginData.password) {
                alert('Введите телефон и пароль');
                return;
            }
            
            if (!this.validatePhone(this.loginData.phone)) {
                alert('Пожалуйста, введите корректный номер телефона');
                return;
            }
            
            const formattedPhone = this.formatPhone(this.loginData.phone);
            
            if (formattedPhone === this.adminCredentials.phone && 
                this.loginData.password === this.adminCredentials.password) {
                this.isAdmin = true;
                this.user = {
                    firstName: 'Admin',
                    lastName: 'System',
                    phone: formattedPhone,
                    consent: true
                };
                this.userId = 0;
                this.registered = true;
                this.loadUserStats();
                this.loadTournament();
                console.log('Вход администратора выполнен');
                this.loginData = { phone: '', password: '' };
                return;
            }
            
            fetch('backend/api.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formattedPhone,
                    password: this.loginData.password
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.userId = data.user.id;
                    this.user = {
                        firstName: data.user.firstName,
                        lastName: data.user.lastName,
                        phone: data.user.phone,
                        consent: true
                    };
                    this.registered = true;
                    
                    localStorage.setItem('ddosUserId', this.userId);
                    localStorage.setItem('ddosUser', JSON.stringify(data.user));
                    
                    this.loadUserStats();
                    this.loadTournament();
                    console.log('Вход выполнен успешно');
                } else {
                    alert(data.error);
                }
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Ошибка соединения с сервером');
            });
            
            this.loginData = { phone: '', password: '' };
        },
        
        logout() {
            if (confirm('Вы уверены, что хотите выйти? Ваша статистика сохранится.')) {
                this.showAccountModal = false;
                
                if (this.gameActive || this.currentGame) {
                    this.stopGame();
                    this.gameActive = false;
                    this.gameEnded = false;
                }
                
                this.registered = false;
                this.gameActive = false;
                this.gameEnded = false;
                this.showAdminPanel = false;
                this.showTournament = false;
                this.isAdmin = false;
                this.userId = null;
                this.score = 0;
                this.lives = 15;
                this.gameTime = 90;
                this.gameStatus = '';
                
                this.user = {
                    firstName: '',
                    lastName: '',
                    phone: '',
                    password: '',
                    consent: false
                };
                
                this.loginData = { phone: '', password: '' };
                this.authMode = 'register';
                
                localStorage.removeItem('ddosUserId');
                localStorage.removeItem('ddosUser');
                
                this.stopFactNotifications();
                
                console.log('Выход из аккаунта выполнен');
            }
        },
        
        logoutAdmin() {
            this.isAdmin = false;
            this.showAdminPanel = false;
            alert('Вы вышли из админ-панели');
        },
        
        closeAdminPanel() {
            this.showAdminPanel = false;
        },
        
        openAdminPanel() {
            if (this.isAdmin) {
                this.loadTournament();
                this.showAdminPanel = true;
                this.showTournament = false;
                if (this.gameActive) this.exitGame();
            }
        },
        
        telegramAuth() {
            alert('Telegram авторизация скоро появится');
        },
        
        toggleNotifications() {
            this.notificationsEnabled = !this.notificationsEnabled;
            localStorage.setItem('ddosNotificationsEnabled', this.notificationsEnabled);
            
            if (this.notificationsEnabled) {
                if (!this.gameActive && !this.gameEnded && this.registered) {
                    this.startFactNotifications();
                }
            } else {
                this.stopFactNotifications();
                this.closeBigPhoto();
            }
            
            console.log('Уведомления:', this.notificationsEnabled ? 'включены' : 'отключены');
        },
        
        loadUserStats() {
            if (!this.userId) return;
            
            fetch(`backend/api.php?action=get_user_stats&user_id=${this.userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.highScore = data.stats.best_score;
                    this.totalKills = data.stats.total_kills;
                }
            })
            .catch(err => console.error('Ошибка:', err));
        },
        
        loadTournament() {
            fetch('backend/api.php?action=get_top&limit=100')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.tournamentData = data.data;
                    console.log('Загружено записей:', this.tournamentData.length);
                }
            })
            .catch(err => console.error('Ошибка:', err));
        },
        
        saveToTournament(score, kills) {
            if (!this.userId) {
                console.log('Нет ID пользователя, результат не сохранен');
                const savedId = localStorage.getItem('ddosUserId');
                if (savedId) {
                    this.userId = parseInt(savedId);
                } else {
                    alert('Ошибка: не удалось сохранить результат. Выйдите и зайдите снова.');
                    return;
                }
            }
            
            fetch('backend/api.php?action=save_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    firstName: this.user.firstName,
                    lastName: this.user.lastName,
                    phone: this.user.phone,
                    score: score,
                    kills: kills
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Результат сохранен');
                    this.loadTournament();
                    this.loadUserStats();
                } else {
                    console.error('Ошибка сохранения:', data.error);
                }
            })
            .catch(err => console.error('Ошибка:', err));
        },
        
        openTournament() {
            this.loadTournament();
            this.showTournament = true;
            this.showAdminPanel = false;
            if (this.gameActive) this.exitGame();
        },
        
        isCurrentPlayer(player) {
            if (!this.registered) return false;
            return player.phone === this.user.phone && 
                   player.first_name === this.user.firstName && 
                   player.last_name === this.user.lastName;
        },
        
        deletePlayer(index) {
            if (confirm('Удалить запись?')) {
                const player = this.sortedTournament[index];
                
                fetch('backend/api.php?action=delete_result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ result_id: player.id })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.loadTournament();
                        alert('Запись удалена');
                    }
                })
                .catch(err => console.error('Ошибка:', err));
            }
        },
        
        clearAllData() {
            if (confirm('ВНИМАНИЕ! Это удалит ВСЕ записи из турнирной таблицы. Продолжить?')) {
                fetch('backend/api.php?action=clear_all', {
                    method: 'POST'
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.tournamentData = [];
                        alert('Все данные удалены');
                    }
                })
                .catch(err => console.error('Ошибка:', err));
            }
        },
        
        exportData() {
            if (this.tournamentData.length === 0) {
                alert('Нет данных для экспорта');
                return;
            }
            
            let csv = '№,Имя,Фамилия,Телефон,Очки,Уничтожено,Дата\n';
            this.sortedTournament.forEach((player, index) => {
                csv += `${index + 1},"${player.first_name}","${player.last_name}","${player.phone}",${player.score},${player.kills},"${player.played_at}"\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'tournament_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        
        startGame() {
            console.log('startGame вызван');
            this.gameActive = true;
            this.gameEnded = false;
            this.score = 0;
            this.lives = 15;
            this.gameTime = 90;
            this.gameStatus = '';
            
            this.stopFactNotifications();
            
            this.$nextTick(() => {
                const canvas = document.getElementById('gameCanvas');
                if (!canvas) {
                    console.error('Canvas не найден');
                    alert('Ошибка: Canvas не найден');
                    this.exitGame();
                    return;
                }
                
                setTimeout(() => {
                    if (typeof window.updateCanvasSize === 'function') {
                        window.updateCanvasSize();
                        console.log('Canvas размер обновлен после скрытия элементов');
                    }
                    
                    const rect = canvas.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) {
                        console.warn('Canvas имеет нулевой размер, повторное обновление через 100мс');
                        setTimeout(() => {
                            if (typeof window.updateCanvasSize === 'function') {
                                window.updateCanvasSize();
                            }
                        }, 100);
                    }
                }, 50);
                
                if (typeof window.startDDoSGame === 'function') {
                    if (this.currentGame) {
                        this.stopGame();
                    }
                    
                    this.currentGame = window.startDDoSGame(canvas, (finalScore, kills) => {
                        this.endGame(finalScore, kills);
                    });
                    
                    if (this.gameInterval) clearInterval(this.gameInterval);
                    this.gameInterval = setInterval(() => {
                        if (window.gameState && window.gameState.isActive) {
                            this.score = window.gameState.score;
                            this.lives = window.gameState.lives;
                            this.gameTime = window.gameState.timeLeft;
                            
                            if (this.lives <= 0) {
                                this.gameStatus = 'ПОРАЖЕНИЕ';
                            } else if (this.gameTime <= 0) {
                                this.gameStatus = this.score >= this.winScore ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
                            } else if (this.score >= this.winScore) {
                                this.gameStatus = 'ПОБЕДА';
                            } else {
                                this.gameStatus = '';
                            }
                        } else if (window.gameState && !window.gameState.isActive && this.gameActive) {
                            clearInterval(this.gameInterval);
                            this.gameInterval = null;
                        }
                    }, 100);
                } else {
                    console.error('startDDoSGame не определена');
                    alert('Ошибка загрузки игры');
                    this.exitGame();
                }
            });
        },
        
        endGame(score, kills) {
            console.log('endGame вызван, score:', score, 'kills:', kills);
            this.gameActive = false;
            this.gameEnded = true;
            this.finalScore = score;
            this.finalKills = kills;
            
            this.resultStatus = score >= this.winScore ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
            
            this.saveToTournament(score, kills);
            this.stopGame();
            
            setTimeout(() => {
                if (!this.gameActive && this.notificationsEnabled && this.registered) {
                    this.startFactNotifications();
                }
            }, 1000);
        },
        
        playAgain() {
            console.log('playAgain вызван');
            this.gameEnded = false;
            this.startGame();
        },
        
        backToMenu() {
            console.log('backToMenu вызван');
            if (this.gameActive) {
                this.exitGame();
            }
            this.gameEnded = false;
            this.gameActive = false;
            this.showAdminPanel = false;
            this.showTournament = false;
            this.showRules = false;
            this.showAccountModal = false;
            
            setTimeout(() => {
                if (this.notificationsEnabled && this.registered) {
                    this.startFactNotifications();
                }
            }, 500);
        },
        
        exitGame() {
            console.log('exitGame вызван');
            this.stopGame();
            this.gameActive = false;
            this.gameEnded = false;
            this.gameStatus = '';
            
            setTimeout(() => {
                if (this.notificationsEnabled && this.registered) {
                    this.startFactNotifications();
                }
            }, 500);
        },
        
        stopGame() {
            console.log('stopGame вызван');
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
                this.gameInterval = null;
            }
            
            if (this.currentGame) {
                try {
                    if (typeof this.currentGame.destroy === 'function') {
                        this.currentGame.destroy();
                    }
                } catch(e) {
                    console.warn('Ошибка при уничтожении игры:', e);
                }
                this.currentGame = null;
            }
            
            if (window.gameState) {
                window.gameState.isActive = false;
            }
            
            this.gameActive = false;
        },
        
        showBigPhoto() {
            if (!this.registered) {
                console.log('Пользователь не зарегистрирован, уведомления скрыты');
                return;
            }
            
            if (!this.notificationsEnabled) {
                console.log('Уведомления отключены, показ фото пропущен');
                return;
            }
            
            if (this.gameActive || this.gameEnded) {
                console.log('Игра активна, уведомления скрыты');
                return;
            }
            
            const photoSlide = document.getElementById('bigPhotoSlide');
            if (!photoSlide) return;
            
            if (this.factTimeout) {
                clearTimeout(this.factTimeout);
                this.factTimeout = null;
            }
            
            const randomFact = ddosFacts[Math.floor(Math.random() * ddosFacts.length)];
            const bigImage = document.getElementById('bigPhotoImage');
            const bigText = document.getElementById('bigPhotoText');
            
            if (bigImage && randomFact.image) {
                bigImage.src = randomFact.image;
            }
            if (bigText) bigText.textContent = randomFact.text;
            
            const isLeft = Math.random() > 0.5;
            
            photoSlide.classList.remove('right-side', 'left-side', 'show');
            photoSlide.style.display = 'block';
            
            if (isLeft) {
                photoSlide.classList.add('left-side');
            } else {
                photoSlide.classList.add('right-side');
            }
            
            setTimeout(() => {
                photoSlide.classList.add('show');
            }, 50);
            
            this.factTimeout = setTimeout(() => {
                this.closeBigPhoto();
            }, 7000);
        },
        
        closeBigPhoto() {
            const photoSlide = document.getElementById('bigPhotoSlide');
            if (photoSlide) {
                photoSlide.classList.remove('show');
                setTimeout(() => {
                    if (photoSlide && !photoSlide.classList.contains('show')) {
                        photoSlide.style.display = 'none';
                    }
                    const bigImage = document.getElementById('bigPhotoImage');
                    const bigText = document.getElementById('bigPhotoText');
                    if (bigImage) bigImage.src = '';
                    if (bigText) bigText.textContent = '';
                }, 500);
            }
            if (this.factTimeout) {
                clearTimeout(this.factTimeout);
                this.factTimeout = null;
            }
        },
        
        closeFactNotification() {
            this.closeBigPhoto();
        },
        
        startFactNotifications() {
            console.log('startFactNotifications вызван');
            
            if (!this.registered) {
                console.log('Пользователь не зарегистрирован, уведомления не запускаются');
                return;
            }
            
            if (!this.notificationsEnabled) {
                console.log('Уведомления отключены, запуск пропущен');
                return;
            }
            
            if (this.gameActive || this.gameEnded) {
                console.log('Игра активна, уведомления не запускаются');
                return;
            }
            
            if (this.factInterval) {
                clearInterval(this.factInterval);
                this.factInterval = null;
            }
            
            if (this.factTimeout) {
                clearTimeout(this.factTimeout);
                this.factTimeout = null;
            }
            
            this.factTimeout = setTimeout(() => {
                if (this.registered && this.notificationsEnabled && !this.gameActive && !this.gameEnded) {
                    this.showBigPhoto();
                }
            }, 5000);
            
            this.factInterval = setInterval(() => {
                if (this.registered && this.notificationsEnabled && !this.gameActive && !this.gameEnded) {
                    this.showBigPhoto();
                } else if (!this.registered) {
                    console.log('Пользователь не зарегистрирован, уведомления остановлены');
                    this.stopFactNotifications();
                }
            }, 15000);
        },
        
        stopFactNotifications() {
            console.log('stopFactNotifications вызван');
            if (this.factInterval) {
                clearInterval(this.factInterval);
                this.factInterval = null;
            }
            if (this.factTimeout) {
                clearTimeout(this.factTimeout);
                this.factTimeout = null;
            }
            this.closeBigPhoto();
        }
    },
    
    mounted() {
        console.log('Vue mounted');
        const savedUserId = localStorage.getItem('ddosUserId');
        const savedUser = localStorage.getItem('ddosUser');
        
        if (savedUserId && savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                this.userId = parseInt(savedUserId);
                this.user = {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    consent: true
                };
                this.registered = true;
                this.loadUserStats();
                this.loadTournament();
            } catch(e) {
                console.error('Ошибка загрузки пользователя:', e);
                localStorage.removeItem('ddosUserId');
                localStorage.removeItem('ddosUser');
            }
        }
        
        this.loadTournament();
        
        const savedNotifications = localStorage.getItem('ddosNotificationsEnabled');
        if (savedNotifications !== null) {
            this.notificationsEnabled = savedNotifications === 'true';
        } else {
            this.notificationsEnabled = true;
            localStorage.setItem('ddosNotificationsEnabled', 'true');
        }
        
        if (this.notificationsEnabled && !this.gameActive && !this.gameEnded && this.registered) {
            this.startFactNotifications();
        }
    },
    
    beforeDestroy() {
        this.stopGame();
        this.stopFactNotifications();
    }
});

const ddosFacts = [
    { text: "DDoS-атаки могут достигать скорости до 3.5 Тбит/с — это как одновременно загружать 350 000 фильмов в 4K!", image: "pictures/MASKOT1.png" },
    { text: "В 2025 году количество DDoS-атак выросло на 65% по сравнению с предыдущим годом.", image: "pictures/MASKOT2.png" },
    { text: "Средняя стоимость одной минуты простоя сайта из-за DDoS-атаки составляет $8,900 для крупных компаний.", image: "pictures/MASKOT3.png" },
    { text: "DDoS-атаки составляют около 42% всех кибератак в мире.", image: "pictures/MASKOT4.png" },
    { text: "Самая мощная зафиксированная DDoS-атака в 2025 году достигла 4.2 Тбит/с.", image: "pictures/MASKOT6.png" },
    { text: "DDoS-Guard защищает более 150 000 клиентов по всему миру от DDoS-атак.", image: "pictures/MASKOT7.png" },
    { text: "85% компаний, переживших крупную DDoS-атаку, теряют клиентов из-за снижения доверия.", image: "pictures/MASKOT1.png" },
    { text: "Средняя продолжительность DDoS-атаки — 3-4 часа, но некоторые длятся месяцами.", image: "pictures/MASKOT2.png" },
    { text: "DDoS расшифровывается как Distributed Denial of Service — распределённый отказ в обслуживании.", image: "pictures/MASKOT3.png" },
    { text: "Игровая индустрия страдает от DDoS-атак чаще всего — 45% всех атак направлены на игры.", image: "pictures/MASKOT4.png" },
    { text: "DDoS-атаки всё чаще используются как прикрытие для вымогательства и кражи данных.", image: "pictures/MASKOT6.png" },
    { text: "Ботнеты для DDoS-атак теперь используют IoT-устройства — до 5 миллионов зараженных устройств.", image: "pictures/MASKOT7.png" },
    { text: "DDoS-Guard имеет дата-центры в 12 странах мира для максимальной защиты.", image: "pictures/MASKOT1.png" },
    { text: "Каждый день в мире происходит более 4 500 крупных DDoS-атак.", image: "pictures/MASKOT2.png" },
    { text: "DDoS-защита от DDoS-Guard фильтрует более 12 Тбит/с трафика ежедневно.", image: "pictures/MASKOT3.png" },
    { text: "Искусственный интеллект теперь используется для автоматического обнаружения DDoS-атак за миллисекунды.", image: "pictures/MASKOT4.png" },
    { text: "DDoS-атаки на облачные сервисы выросли на 85% за последние два года.", image: "pictures/MASKOT6.png" },
    { text: "Сектор онлайн-банкинга стал главной мишенью DDoS-атак в 2025 году.", image: "pictures/MASKOT7.png" },
    { text: "DDoS-Guard блокирует более 95% атак автоматически без участия человека.", image: "pictures/MASKOT1.png" },
    { text: "Средний размер DDoS-атаки увеличился с 500 Мбит/с до 1.5 Гбит/с за последние 3 года.", image: "pictures/MASKOT2.png" }
];