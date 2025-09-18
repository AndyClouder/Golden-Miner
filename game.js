class GoldMinerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameContainer = document.getElementById('gameContainer');

        this.setupCanvas();
        this.initializeGame();
        this.bindEvents();
        this.generateItems();
        this.soundManager = new SoundManager();
    }

    setupCanvas() {
        this.canvas.width = this.gameContainer.offsetWidth;
        this.canvas.height = this.gameContainer.offsetHeight;

        window.addEventListener('resize', () => {
            this.canvas.width = this.gameContainer.offsetWidth;
            this.canvas.height = this.gameContainer.offsetHeight;
        });
    }

    initializeGame() {
        this.gameState = 'start';
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.items = [];
        this.particles = [];

        // 矿工和钩子属性
        this.miner = {
            x: this.canvas.width / 2,
            y: 80,
            width: 60,
            height: 60
        };

        this.hook = {
            x: this.miner.x,
            y: this.miner.y + 30,
            angle: 0,
            length: 50,
            maxLength: 400,
            speed: 2,
            state: 'swing', // swing, extending, retracting, caught
            targetItem: null,
            rotation: 0
        };

        this.lastTime = 0;
        this.itemSpawnTimer = 0;
        this.gameTimer = 0;
    }

    bindEvents() {
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });

        // 鼠标和触控事件
        this.canvas.addEventListener('click', (e) => {
            this.handleInput();
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
    }

    handleInput() {
        if (this.gameState === 'playing' && this.hook.state === 'swing') {
            this.hook.state = 'extending';
            this.hook.speed = 3;
        }
    }

    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
        this.soundManager.setEnabled(true);
        this.gameLoop();
    }

    restartGame() {
        this.initializeGame();
        this.generateItems();
        this.startGame();
        document.getElementById('gameOver').style.display = 'none';
    }

    generateItems() {
        this.items = [];
        const itemCount = 8 + this.level * 2;

        for (let i = 0; i < itemCount; i++) {
            const type = this.getRandomItemType();
            const x = Math.random() * (this.canvas.width - 60) + 30;
            const y = 150 + Math.random() * (this.canvas.height - 200);

            this.items.push({
                x: x,
                y: y,
                type: type,
                width: type.width,
                height: type.height,
                value: type.value,
                speed: type.speed,
                color: type.color,
                caught: false,
                angle: 0
            });
        }
    }

    getRandomItemType() {
        const types = [
            { width: 30, height: 25, value: 50, speed: 1, color: '#FFD700' }, // 小金块
            { width: 45, height: 35, value: 100, speed: 0.8, color: '#FFA500' }, // 中金块
            { width: 60, height: 50, value: 200, speed: 0.6, color: '#FF8C00' }, // 大金块
            { width: 25, height: 25, value: 300, speed: 1.2, color: '#00CED1' }, // 钻石
            { width: 35, height: 30, value: 20, speed: 0.5, color: '#696969' }, // 小石头
            { width: 50, height: 40, value: 10, speed: 0.3, color: '#2F4F4F' }, // 大石头
            { width: 20, height: 35, value: 150, speed: 1.5, color: '#9370DB' }, // 紫水晶
        ];

        return types[Math.floor(Math.random() * types.length)];
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        // 更新游戏时间
        this.gameTimer += deltaTime;
        if (this.gameTimer >= 1000) {
            this.timeLeft--;
            this.gameTimer = 0;
            document.getElementById('timer').textContent = `时间: ${this.timeLeft}`;

            if (this.timeLeft <= 0) {
                this.gameOver();
                return;
            }
        }

        // 更新钩子
        this.updateHook();

        // 更新物品
        this.updateItems();

        // 更新粒子效果
        this.updateParticles(deltaTime);

        // 检查碰撞
        this.checkCollisions();
    }

    updateHook() {
        switch (this.hook.state) {
            case 'swing':
                this.hook.angle += 0.02;
                if (Math.abs(this.hook.angle) > Math.PI / 3) {
                    this.hook.angle *= -1;
                }
                break;

            case 'extending':
                this.hook.length += this.hook.speed;
                if (this.hook.length >= this.hook.maxLength ||
                    this.hook.y + this.hook.length >= this.canvas.height - 20) {
                    this.hook.state = 'retracting';
                }
                break;

            case 'retracting':
                this.hook.length -= this.hook.speed * 1.5;
                if (this.hook.length <= 50) {
                    this.hook.length = 50;
                    this.hook.state = 'swing';
                    if (this.hook.targetItem) {
                        this.score += this.hook.targetItem.value;
                        document.getElementById('score').textContent = `分数: ${this.score}`;
                        this.createParticles(this.hook.targetItem.x, this.hook.targetItem.y, this.hook.targetItem.color);
                        this.removeItem(this.hook.targetItem);
                        this.hook.targetItem = null;

                        // 检查是否完成关卡
                        if (this.items.length === 0) {
                            this.nextLevel();
                        }
                    }
                }
                break;
        }
    }

    updateItems() {
        this.items.forEach(item => {
            if (item.caught) {
                // 被抓取的物品跟随钩子
                const hookEndX = this.hook.x + Math.sin(this.hook.angle) * this.hook.length;
                const hookEndY = this.hook.y + Math.cos(this.hook.angle) * this.hook.length;
                item.x = hookEndX - item.width / 2;
                item.y = hookEndY - item.height / 2;
            } else {
                // 物品轻微摆动
                item.angle += 0.02;
                item.x += Math.sin(item.angle) * 0.3;
            }
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * deltaTime / 16;
            particle.y += particle.vy * deltaTime / 16;
            particle.life -= deltaTime / 1000;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        if (this.hook.state !== 'extending') return;

        const hookEndX = this.hook.x + Math.sin(this.hook.angle) * this.hook.length;
        const hookEndY = this.hook.y + Math.cos(this.hook.angle) * this.hook.length;

        this.items.forEach(item => {
            if (!item.caught &&
                hookEndX > item.x &&
                hookEndX < item.x + item.width &&
                hookEndY > item.y &&
                hookEndY < item.y + item.height) {

                item.caught = true;
                this.hook.targetItem = item;
                this.hook.state = 'retracting';
                this.hook.speed = item.speed;

                // 播放抓取音效
                if (item.color === '#FFD700' || item.color === '#FFA500' || item.color === '#FF8C00') {
                    this.soundManager.play('gold');
                } else if (item.color === '#00CED1') {
                    this.soundManager.play('diamond');
                } else if (item.color === '#696969' || item.color === '#2F4F4F') {
                    this.soundManager.play('rock');
                } else {
                    this.soundManager.play('grab');
                }
            }
        });
    }

    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: color,
                life: 1.0,
                size: Math.random() * 5 + 2
            });
        }
    }

    nextLevel() {
        this.level++;
        this.timeLeft = Math.max(30, 60 - this.level * 5);
        document.getElementById('level').textContent = `关卡: ${this.level}`;
        document.getElementById('timer').textContent = `时间: ${this.timeLeft}`;
        this.soundManager.play('levelUp');
        this.generateItems();
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.soundManager.play('gameOver');
        document.getElementById('finalScore').textContent = `最终分数: ${this.score}`;
        document.getElementById('gameOver').style.display = 'flex';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        this.drawBackground();

        // 绘制矿工
        this.drawMiner();

        // 绘制钩子
        this.drawHook();

        // 绘制物品
        this.drawItems();

        // 绘制粒子效果
        this.drawParticles();
    }

    drawBackground() {
        // 地面
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);

        // 地面纹理
        this.ctx.fillStyle = '#A0522D';
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.fillRect(i, this.canvas.height - 50, 10, 50);
        }
    }

    drawMiner() {
        const { x, y, width, height } = this.miner;

        // 矿工身体
        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(x - width/2, y - height/2, width, height);

        // 矿工头部
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.beginPath();
        this.ctx.arc(x, y - height/2 + 10, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // 矿工帽子
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x - 18, y - height/2 - 5, 36, 15);

        // 眼睛
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 8, y - height/2 + 5, 3, 3);
        this.ctx.fillRect(x + 5, y - height/2 + 5, 3, 3);

        // 嘴巴
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y - height/2 + 12, 5, 0, Math.PI);
        this.ctx.stroke();
    }

    drawHook() {
        const hookEndX = this.hook.x + Math.sin(this.hook.angle) * this.hook.length;
        const hookEndY = this.hook.y + Math.cos(this.hook.angle) * this.hook.length;

        // 绘制绳子
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hook.x, this.hook.y);
        this.ctx.lineTo(hookEndX, hookEndY);
        this.ctx.stroke();

        // 绘制钩子
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.strokeStyle = '#808080';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(hookEndX, hookEndY, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 钩子的钩状部分
        this.ctx.beginPath();
        this.ctx.arc(hookEndX + 6, hookEndY + 6, 6, Math.PI, Math.PI * 1.5);
        this.ctx.stroke();
    }

    drawItems() {
        this.items.forEach(item => {
            this.ctx.save();
            this.ctx.translate(item.x + item.width/2, item.y + item.height/2);
            this.ctx.rotate(item.angle);

            // 绘制物品
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(-item.width/2, -item.height/2, item.width, item.height);

            // 添加光泽效果
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(-item.width/2, -item.height/2, item.width/3, item.height/3);

            // 绘制价值
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(item.value, 0, 4);

            this.ctx.restore();
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        if (this.gameState === 'playing') {
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    new GoldMinerGame();
});