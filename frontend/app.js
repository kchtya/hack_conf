new Vue({
    el: '#app',
    data: {
        registered: false,
        gameActive: false,
        gameEnded: false,
        showAccountModal: false,
        showAdminPanel: false,
        showTournament: false,
        user: {
            firstName: '',
            lastName: '',
            phone: '',
            consent: false
        },
        highScore: 0,
        totalKills: 0,
        score: 0,
        lives: 3,
        gameTime: 120,
        finalScore: 0,
        finalKills: 0,
        showRules: false,
        currentGame: null,
        gameStatus: '',
        resultStatus: '',
        winScore: 500,
        tournamentData: []
    },
    
    computed: {
        sortedTournament() {
            return this.tournamentData;
        },
        topTen() {
            return this.tournamentData.slice(0, 10);
        },
        topScore() {
            if (this.tournamentData.length === 0) return 0;
            return Math.max(...this.tournamentData.map(p => p.score));
        },
        myRank() {
            if (!this.registered) return null;
            const index = this.tournamentData.findIndex(p => 
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
        }
    },
    
    methods: {
        register() {
            if (!this.user.firstName || !this.user.lastName || !this.user.phone || !this.user.consent) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }
            
            localStorage.setItem('user', JSON.stringify(this.user));
            this.loadStats();
            this.registered = true;
        },
        
        logout() {
            if (confirm('Вы уверены, что хотите выйти? Ваша статистика сохранится.')) {
                this.showAccountModal = false;
                this.registered = false;
                this.gameActive = false;
                this.gameEnded = false;
                this.showAdminPanel = false;
                this.showTournament = false;
                this.user = {
                    firstName: '',
                    lastName: '',
                    phone: '',
                    consent: false
                };
            }
        },
        
        telegramAuth() {
            alert('Telegram авторизация скоро появится');
        },
        
        loadStats() {
            const savedScore = localStorage.getItem('highScore');
            const savedKills = localStorage.getItem('totalKills');
            
            if (savedScore) this.highScore = parseInt(savedScore);
            if (savedKills) this.totalKills = parseInt(savedKills);
            
            this.loadTournament();
        },
        
        saveStats(score, kills) {
            if (score > this.highScore) {
                this.highScore = score;
                localStorage.setItem('highScore', score);
            }
            this.totalKills += kills;
            localStorage.setItem('totalKills', this.totalKills);
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
            
            let tournament = JSON.parse(localStorage.getItem('tournamentData') || '[]');
            tournament.push(playerData);
            tournament.sort((a, b) => b.score - a.score);
            if (tournament.length > 100) tournament = tournament.slice(0, 100);
            localStorage.setItem('tournamentData', JSON.stringify(tournament));
            this.tournamentData = tournament;
        },
        
        loadTournament() {
            const saved = localStorage.getItem('tournamentData');
            if (saved) {
                this.tournamentData = JSON.parse(saved);
            }
        },
        
        openTournament() {
            this.loadTournament();
            this.showTournament = true;
            this.showAdminPanel = false;
            this.gameActive = false;
            this.gameEnded = false;
        },
        
        openAdminPanel() {
            const pwd = prompt('Введите пароль администратора:');
            if (pwd === 'admin2026') {
                this.loadTournament();
                this.showAdminPanel = true;
                this.showTournament = false;
                this.gameActive = false;
                this.gameEnded = false;
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
                this.tournamentData.splice(index, 1);
                localStorage.setItem('tournamentData', JSON.stringify(this.tournamentData));
            }
        },
        
        clearAllData() {
            if (confirm('ВНИМАНИЕ! Это удалит ВСЕ записи из турнирной таблицы. Продолжить?')) {
                this.tournamentData = [];
                localStorage.setItem('tournamentData', '[]');
                alert('Все данные удалены');
            }
        },
        
        exportData() {
            if (this.tournamentData.length === 0) {
                alert('Нет данных для экспорта');
                return;
            }
            
            let csv = '№,Имя,Фамилия,Телефон,Очки,Уничтожено,Дата\n';
            this.tournamentData.forEach((player, index) => {
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
            this.gameActive = true;
            this.gameEnded = false;
            this.score = 0;
            this.lives = 3;
            this.gameTime = 120;
            this.gameStatus = '';
            
            this.$nextTick(() => {
                this.currentGame = startRobotGame((finalScore, kills) => {
                    this.endGame(finalScore, kills);
                });
                
                const updateInterval = setInterval(() => {
                    if (this.currentGame && this.currentGame.gameRunning) {
                        this.score = this.currentGame.score;
                        this.lives = this.currentGame.lives;
                        this.gameTime = this.currentGame.timeLeft;
                        
                        if (this.gameTime <= 0) {
                            this.gameStatus = this.score >= this.winScore ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
                        } else if (this.lives <= 0) {
                            this.gameStatus = 'ПОРАЖЕНИЕ';
                        } else if (this.score >= this.winScore) {
                            this.gameStatus = 'ПОБЕДА';
                        }
                    } else if (!this.currentGame || !this.currentGame.gameRunning) {
                        clearInterval(updateInterval);
                    }
                }, 100);
            });
        },
        
        endGame(score, kills) {
            this.gameActive = false;
            this.gameEnded = true;
            this.finalScore = score;
            this.finalKills = kills;
            
            this.resultStatus = score >= this.winScore ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
            
            this.saveStats(score, kills);
            this.saveToTournament(score, kills);
            if (this.currentGame) {
                this.currentGame.destroy();
                this.currentGame = null;
            }
        },
        
        playAgain() {
            this.gameEnded = false;
            this.startGame();
        },
        
        backToMenu() {
            this.gameEnded = false;
            this.gameActive = false;
        },
        
        exitGame() {
            if (this.currentGame) {
                this.currentGame.destroy();
                this.currentGame = null;
            }
            this.gameActive = false;
        }
    },
    
    mounted() {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.registered = true;
            this.loadStats();
        }
    }
});