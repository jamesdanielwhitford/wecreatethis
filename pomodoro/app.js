// Pomodoro Timer Application
class PomodoroTimer {
  constructor() {
    this.timer = null;
    this.timeRemaining = 0;
    this.isRunning = false;
    this.mode = 'work';
    this.sessionCount = 1;
    this.currentSessionInCycle = 1;
    this.settings = null;
    this.audioContext = null;

    // DOM elements
    this.timerText = document.getElementById('timer-text');
    this.startBtn = document.getElementById('start-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.sessionText = document.getElementById('session-text');
    this.progressCircle = document.querySelector('.progress-ring-circle');
    this.modeBtns = document.querySelectorAll('.mode-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');

    // Progress ring setup
    const radius = this.progressCircle.r.baseVal.value;
    this.circumference = radius * 2 * Math.PI;
    this.progressCircle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
    this.progressCircle.style.strokeDashoffset = 0;

    this.init();
  }

  async init() {
    // Load settings
    this.settings = await getSettings();

    // Set initial time
    this.resetTimer();

    // Set up event listeners
    this.setupEventListeners();

    // Update UI
    this.updateDisplay();
    this.updateSessionCounter();
  }

  setupEventListeners() {
    // Timer controls
    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.resetTimer());

    // Mode selector
    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isRunning) {
          // Confirm mode change while running
          if (confirm('Timer is running. Switch mode?')) {
            this.pause();
            this.setMode(btn.dataset.mode);
          }
        } else {
          this.setMode(btn.dataset.mode);
        }
      });
    });

    // Settings modal
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('test-sound').addEventListener('click', () => this.playSound());

    // Close modal on outside click
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.closeSettings();
      }
    });

    // Settings range inputs
    const ranges = ['work-duration', 'short-break-duration', 'long-break-duration', 'sessions-count'];
    ranges.forEach(id => {
      const input = document.getElementById(id);
      const valueSpan = document.getElementById(`${id}-value`);
      input.addEventListener('input', () => {
        valueSpan.textContent = input.value;
      });
    });

    // Visibility change for accurate timing
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isRunning) {
        this.lastTick = Date.now();
      }
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update accent color based on mode
    const root = document.documentElement;
    switch (mode) {
      case 'work':
        root.style.setProperty('--accent', 'var(--accent-work)');
        break;
      case 'shortBreak':
        root.style.setProperty('--accent', 'var(--accent-short-break)');
        break;
      case 'longBreak':
        root.style.setProperty('--accent', 'var(--accent-long-break)');
        break;
    }

    this.resetTimer();
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startBtn.style.display = 'none';
    this.pauseBtn.style.display = 'inline-block';

    // Initialize audio context on user interaction
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    this.timer = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.startBtn.style.display = 'inline-block';
    this.pauseBtn.style.display = 'none';
    clearInterval(this.timer);
  }

  resetTimer() {
    this.pause();

    // Set time based on mode
    switch (this.mode) {
      case 'work':
        this.timeRemaining = this.settings.workDuration * 60;
        break;
      case 'shortBreak':
        this.timeRemaining = this.settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        this.timeRemaining = this.settings.longBreakDuration * 60;
        break;
    }

    this.updateDisplay();
  }

  tick() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      this.updateDisplay();
    } else {
      this.completeTimer();
    }
  }

  completeTimer() {
    this.pause();
    this.playSound();

    // Update session count if work session completed
    if (this.mode === 'work') {
      this.currentSessionInCycle++;

      if (this.currentSessionInCycle > this.settings.sessionsBeforeLongBreak) {
        // Take long break
        this.currentSessionInCycle = 1;
        this.setMode('longBreak');
      } else {
        // Take short break
        this.setMode('shortBreak');
      }

      this.sessionCount++;
      this.updateSessionCounter();
    } else {
      // Break completed, back to work
      this.setMode('work');
    }

    // Auto-start if enabled
    if (this.settings.autoStart) {
      this.start();
    } else {
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
          body: this.mode === 'work' ? 'Break time is over!' : 'Work session complete!',
          icon: '/pomodoro/icon-192.png'
        });
      }
    }
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update progress ring
    const totalTime = this.getTotalTime();
    const progress = (totalTime - this.timeRemaining) / totalTime;
    const offset = this.circumference * progress;
    this.progressCircle.style.strokeDashoffset = offset;

    // Update page title
    document.title = `${this.timerText.textContent} - Pomodoro`;
  }

  getTotalTime() {
    switch (this.mode) {
      case 'work':
        return this.settings.workDuration * 60;
      case 'shortBreak':
        return this.settings.shortBreakDuration * 60;
      case 'longBreak':
        return this.settings.longBreakDuration * 60;
    }
  }

  updateSessionCounter() {
    this.sessionText.textContent = `Session ${this.currentSessionInCycle} of ${this.settings.sessionsBeforeLongBreak}`;
  }

  playSound() {
    if (!this.settings.soundEnabled) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Create oscillator for chime sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Chime sound: two tones
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108.73, this.audioContext.currentTime + 0.15); // C#6

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  openSettings() {
    // Populate settings form
    document.getElementById('work-duration').value = this.settings.workDuration;
    document.getElementById('work-duration-value').textContent = this.settings.workDuration;
    document.getElementById('short-break-duration').value = this.settings.shortBreakDuration;
    document.getElementById('short-break-duration-value').textContent = this.settings.shortBreakDuration;
    document.getElementById('long-break-duration').value = this.settings.longBreakDuration;
    document.getElementById('long-break-duration-value').textContent = this.settings.longBreakDuration;
    document.getElementById('sessions-count').value = this.settings.sessionsBeforeLongBreak;
    document.getElementById('sessions-count-value').textContent = this.settings.sessionsBeforeLongBreak;
    document.getElementById('sound-enabled').checked = this.settings.soundEnabled;
    document.getElementById('auto-start').checked = this.settings.autoStart;

    this.settingsModal.style.display = 'flex';
  }

  closeSettings() {
    this.settingsModal.style.display = 'none';
  }

  async saveSettings() {
    this.settings.workDuration = parseInt(document.getElementById('work-duration').value);
    this.settings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
    this.settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
    this.settings.sessionsBeforeLongBreak = parseInt(document.getElementById('sessions-count').value);
    this.settings.soundEnabled = document.getElementById('sound-enabled').checked;
    this.settings.autoStart = document.getElementById('auto-start').checked;

    await saveSettings(this.settings);

    // Reset timer with new settings
    this.resetTimer();
    this.updateSessionCounter();

    this.closeSettings();

    // Request notification permission if sound is enabled
    if (this.settings.soundEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PomodoroTimer();
});
