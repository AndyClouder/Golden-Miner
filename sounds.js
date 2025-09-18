class SoundManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.enabled = true;
        this.initializeSounds();
    }

    initializeSounds() {
        // 延迟初始化AudioContext，等待用户交互
        this.audioContext = null;
        this.soundsInitialized = false;
    }

    createSounds() {
        // 抓取音效
        this.sounds.grab = this.createTone(800, 0.1);

        // 金子音效
        this.sounds.gold = this.createTone(1200, 0.2);

        // 钻石音效
        this.sounds.diamond = this.createTone(1600, 0.3);

        // 石头音效
        this.sounds.rock = this.createTone(200, 0.15);

        // 游戏结束音效
        this.sounds.gameOver = this.createTone(400, 0.5);

        // 升级音效
        this.sounds.levelUp = this.createTone(1000, 0.4);
    }

    createTone(frequency, duration) {
        return () => {
            if (!this.enabled) return;

            // 初始化AudioContext（如果尚未初始化）
            this.initializeAudioContext();
            if (!this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    setupMusicControls() {
        // 背景音乐控制将在用户交互后设置
    }

    createBackgroundMusic() {
        // 创建简单的背景音乐旋律
        const melody = [
            { note: 523.25, duration: 0.5 }, // C5
            { note: 587.33, duration: 0.5 }, // D5
            { note: 659.25, duration: 0.5 }, // E5
            { note: 698.46, duration: 0.5 }, // F5
            { note: 783.99, duration: 0.5 }, // G5
            { note: 659.25, duration: 0.5 }, // E5
            { note: 587.33, duration: 0.5 }, // D5
            { note: 523.25, duration: 0.5 }  // C5
        ];

        this.playMelody(melody, 0.6, true);
    }

    playMelody(notes, tempo, loop = false) {
        if (!this.enabled) return;

        // 初始化AudioContext（如果尚未初始化）
        this.initializeAudioContext();
        if (!this.audioContext) return;

        let currentTime = this.audioContext.currentTime;

        const playNote = (note, duration) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(note, currentTime);
            oscillator.type = 'triangle';

            gainNode.gain.setValueAtTime(0.1, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
        };

        notes.forEach(({ note, duration }) => {
            playNote(note, duration * tempo);
            currentTime += duration * tempo;
        });

        if (loop) {
            setTimeout(() => {
                this.playMelody(notes, tempo, loop);
            }, currentTime * 1000);
        }
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    initializeAudioContext() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 如果音频上下文是暂停状态，尝试恢复
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // 创建音效
            this.createSounds();

            // 设置背景音乐
            this.createBackgroundMusic();

            this.soundsInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
        }
    }
}

// 将音效管理器添加到游戏中
window.SoundManager = SoundManager;