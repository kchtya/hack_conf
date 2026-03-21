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
        notificationsEnabled: true, // Новая переменная для состояния уведомлений
        user: {
            firstName: '',
            lastName: '',
            phone: '',
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
                p.firstName === this.user.firstName && 
                p.lastName === this.user.lastName
            );
            return index !== -1 ? index + 1 : null;
        },
        myScore() {
            if (!this.registered) return null;
            const myEntry = this.tournamentData.find(p => 
                p.phone === this.user.phone && 
                p.firstName === this.user.firstName && 
                p.lastName === this.user.lastName
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
            return this.notificationsEnabled ? ' Отключить уведомления' : ' Включить уведомления';
        },
        notificationsButtonClass() {
            return this.notificationsEnabled ? 'btn-notifications on' : 'btn-notifications';
        }
    },
    
    methods: {
        register() {
            if (!this.user.firstName || !this.user.lastName || !this.user.phone || !this.user.consent) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }
            
            localStorage.setItem('ddosUser', JSON.stringify({
                firstName: this.user.firstName,
                lastName: this.user.lastName,
                phone: this.user.phone
            }));
            this.loadStats();
            this.registered = true;
            console.log('Регистрация успешна');
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
                this.score = 0;
                this.lives = 15;
                this.gameTime = 90;
                this.gameStatus = '';
                
                this.user = {
                    firstName: '',
                    lastName: '',
                    phone: '',
                    consent: false
                };
                
                this.stopFactNotifications();
                
                console.log('Выход из аккаунта выполнен');
            }
        },
        
        // Метод для переключения уведомлений
        toggleNotifications() {
            this.notificationsEnabled = !this.notificationsEnabled;
            localStorage.setItem('ddosNotificationsEnabled', this.notificationsEnabled);
            
            if (this.notificationsEnabled) {
                // Если включили уведомления и игра не активна - запускаем
                if (!this.gameActive && !this.gameEnded && this.registered) {
                    this.startFactNotifications();
                }
            } else {
                // Если выключили - останавливаем всё
                this.stopFactNotifications();
                this.closeBigPhoto();
            }
            
            console.log('Уведомления:', this.notificationsEnabled ? 'включены' : 'отключены');
        },
        
        telegramAuth() {
            alert('Telegram авторизация скоро появится');
        },
        
        loadStats() {
            const savedHighScore = localStorage.getItem('ddosHighScore');
            const savedTotalKills = localStorage.getItem('ddosTotalKills');
            
            if (savedHighScore) this.highScore = parseInt(savedHighScore);
            if (savedTotalKills) this.totalKills = parseInt(savedTotalKills);
            
            this.loadTournament();
            
            // Загружаем состояние уведомлений
            const savedNotifications = localStorage.getItem('ddosNotificationsEnabled');
            if (savedNotifications !== null) {
                this.notificationsEnabled = savedNotifications === 'true';
            }
        },
        
        saveStats(score, kills) {
            if (score > this.highScore) {
                this.highScore = score;
                localStorage.setItem('ddosHighScore', score);
            }
            const newTotal = this.totalKills + kills;
            this.totalKills = newTotal;
            localStorage.setItem('ddosTotalKills', newTotal);
        },
        
        saveToTournament(score, kills) {
            const playerData = {
                firstName: this.user.firstName,
                lastName: this.user.lastName,
                phone: this.user.phone,
                score: score,
                kills: kills,
                date: new Date().toLocaleString()
            };
            
            let tournament = JSON.parse(localStorage.getItem('ddosTournamentData') || '[]');
            tournament.push(playerData);
            tournament.sort((a, b) => b.score - a.score);
            if (tournament.length > 100) tournament = tournament.slice(0, 100);
            localStorage.setItem('ddosTournamentData', JSON.stringify(tournament));
            this.tournamentData = tournament;
        },
        
        loadTournament() {
            const saved = localStorage.getItem('ddosTournamentData');
            if (saved) {
                this.tournamentData = JSON.parse(saved);
            }
        },
        
        openTournament() {
            this.loadTournament();
            this.showTournament = true;
            this.showAdminPanel = false;
            if (this.gameActive) this.exitGame();
        },
        
        openAdminPanel() {
            const pwd = prompt('Введите пароль администратора:');
            if (pwd === 'admin2026') {
                this.loadTournament();
                this.showAdminPanel = true;
                this.showTournament = false;
                if (this.gameActive) this.exitGame();
            } else if (pwd) {
                alert('Неверный пароль');
            }
        },
        
        isCurrentPlayer(player) {
            if (!this.registered) return false;
            return player.phone === this.user.phone && 
                   player.firstName === this.user.firstName && 
                   player.lastName === this.user.lastName;
        },
        
        deletePlayer(index) {
            if (confirm('Удалить запись?')) {
                const sorted = this.sortedTournament;
                const actualIndex = this.tournamentData.findIndex(p => 
                    p.phone === sorted[index].phone && 
                    p.firstName === sorted[index].firstName && 
                    p.lastName === sorted[index].lastName
                );
                if (actualIndex !== -1) {
                    this.tournamentData.splice(actualIndex, 1);
                    localStorage.setItem('ddosTournamentData', JSON.stringify(this.tournamentData));
                }
            }
        },
        
        clearAllData() {
            if (confirm('ВНИМАНИЕ! Это удалит ВСЕ записи из турнирной таблицы. Продолжить?')) {
                this.tournamentData = [];
                localStorage.setItem('ddosTournamentData', '[]');
                alert('Все данные удалены');
            }
        },
        
        exportData() {
            if (this.tournamentData.length === 0) {
                alert('Нет данных для экспорта');
                return;
            }
            
            let csv = '№,Имя,Фамилия,Телефон,Очки,Уничтожено,Дата\n';
            this.sortedTournament.forEach((player, index) => {
                csv += `${index + 1},"${player.firstName}","${player.lastName}","${player.phone}",${player.score},${player.kills},"${player.date}"\n`;
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
                
                // Небольшая задержка для применения CSS скрытия элементов (логотип, кнопка аккаунта)
                setTimeout(() => {
                    // Обновляем размер canvas после того как элементы скрылись
                    if (typeof window.updateCanvasSize === 'function') {
                        window.updateCanvasSize();
                        console.log('Canvas размер обновлен после скрытия элементов');
                    }
                    
                    // Дополнительная проверка видимости canvas
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
            console.log('endGame вызван');
            this.gameActive = false;
            this.gameEnded = true;
            this.finalScore = score;
            this.finalKills = kills;
            
            this.resultStatus = score >= this.winScore ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
            
            this.saveStats(score, kills);
            this.saveToTournament(score, kills);
            this.stopGame();
            
            setTimeout(() => {
                if (!this.gameActive && this.notificationsEnabled) {
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
                if (this.notificationsEnabled) {
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
                if (this.notificationsEnabled) {
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
            // Проверка: если пользователь не зарегистрирован - НИКАКИХ уведомлений
            if (!this.registered) {
                console.log('Пользователь не зарегистрирован, уведомления скрыты');
                return;
            }
            
            // Проверка: если уведомления отключены - НЕ показываем
            if (!this.notificationsEnabled) {
                console.log('Уведомления отключены, показ фото пропущен');
                return;
            }
            
            // Проверка: если игра активна - НЕ показываем
            if (this.gameActive || this.gameEnded) {
                console.log('Игра активна, уведомления скрыты');
                return;
            }
            
            const photoSlide = document.getElementById('bigPhotoSlide');
            if (!photoSlide) return;
            
            // Очищаем предыдущие таймауты
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
            
            // Сначала скрываем, потом показываем
            photoSlide.classList.remove('right-side', 'left-side', 'show');
            
            // Форсируем скрытие перед показом
            photoSlide.style.display = 'block';
            
            if (isLeft) {
                photoSlide.classList.add('left-side');
            } else {
                photoSlide.classList.add('right-side');
            }
            
            // Небольшая задержка для плавного появления
            setTimeout(() => {
                photoSlide.classList.add('show');
            }, 50);
            
            // Авто-закрытие через 7 секунд
            this.factTimeout = setTimeout(() => {
                this.closeBigPhoto();
            }, 7000);
        },
        
        closeBigPhoto() {
            const photoSlide = document.getElementById('bigPhotoSlide');
            if (photoSlide) {
                photoSlide.classList.remove('show');
                // Скрываем после анимации
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
            
            // ВАЖНО: проверяем, зарегистрирован ли пользователь
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
            
            // Очищаем существующие интервалы
            if (this.factInterval) {
                clearInterval(this.factInterval);
                this.factInterval = null;
            }
            
            if (this.factTimeout) {
                clearTimeout(this.factTimeout);
                this.factTimeout = null;
            }
            
            // Запускаем первое уведомление через 5 секунд
            this.factTimeout = setTimeout(() => {
                if (this.registered && this.notificationsEnabled && !this.gameActive && !this.gameEnded) {
                    this.showBigPhoto();
                }
            }, 5000);
            
            // Запускаем интервал каждые 15 секунд
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
        const savedUser = localStorage.getItem('ddosUser');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.registered = true;
                this.loadStats();
            } catch(e) {
                console.error('Ошибка загрузки пользователя:', e);
                localStorage.removeItem('ddosUser');
            }
        }
        
        this.loadTournament();
        
        // Загружаем состояние уведомлений
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

// ==================== ФАКТЫ О DDoS ====================
const ddosFacts = [
    { text: "DDoS-атака может достигать скорости до 1 Тбит/с — это как одновременно загружать 100 000 фильмов в 4K!", image: "pictures/MASKOT1.png" },
    { text: "Первая DDoS-атака была проведена в 1996 году и вывела из строя интернет-провайдера Panix.", image: "pictures/MASKOT2.png" },
    { text: "Средняя стоимость одной минуты простоя сайта из-за DDoS-атаки составляет $5,600 для крупных компаний.", image: "pictures/MASKOT3.png" },
    { text: "DDoS-атаки составляют около 35% всех кибератак в мире.", image: "pictures/MASKOT4.png" },
    { text: "Самая мощная зафиксированная DDoS-атака достигла 2.5 Тбит/с в 2020 году.", image: "pictures/MASKOT6.png" },
    { text: "DDoS-Guard защищает более 50 000 клиентов по всему миру от DDoS-атак.", image: "pictures/MASKOT7.png" },
    { text: "70% компаний, переживших крупную DDoS-атаку, теряют клиентов из-за снижения доверия.", image: "pictures/MASKOT1.png" },
    { text: "Средняя продолжительность DDoS-атаки — 2-3 часа, но некоторые длятся неделями.", image: "pictures/MASKOT2.png" },
    { text: "DDoS расшифровывается как Distributed Denial of Service — распределённый отказ в обслуживании.", image: "pictures/MASKOT3.png" },
    { text: "Игровая индустрия страдает от DDoS-атак чаще всего — 40% всех атак направлены на игры.", image: "pictures/MASKOT4.png" },
    { text: "DDoS-атаки могут быть использованы как прикрытие для более серьезных вторжений в сеть.", image: "pictures/MASKOT6.png" },
    { text: "Ботнеты, используемые для DDoS-атак, могут состоять из миллионов зараженных устройств.", image: "pictures/MASKOT7.png" },
    { text: "DDoS-Guard имеет дата-центры в 7 странах мира для максимальной защиты.", image: "pictures/MASKOT1.png" },
    { text: "Каждый день в мире происходит более 2000 крупных DDoS-атак.", image: "pictures/MASKOT2.png" },
    { text: "DDoS-защита от DDoS-Guard фильтрует более 5 Тбит/с трафика ежедневно.", image: "pictures/MASKOT3.png" }
];