const APP_VERSION = '1.0.0';
const STORAGE_KEY = 'chesstimer-history';
const MAX_HISTORY = 10;

// State
let totalSeconds = 0;
let topRemaining = 0;
let bottomRemaining = 0;
let activePlayer = 'bottom'; // 'top' or 'bottom'
let paused = false;
let intervalId = null;

// DOM refs
const screens = {
  setup: document.getElementById('setup-screen'),
  ready: document.getElementById('ready-screen'),
  timer: document.getElementById('timer-screen'),
};

const hoursInput = document.getElementById('hours-input');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const setupStartBtn = document.getElementById('setup-start-btn');
const timerList = document.getElementById('timer-list');
const timerListEmpty = document.getElementById('timer-list-empty');

const readyDisplayTimeTop = document.getElementById('ready-display-time-top');
const readyDisplayTimeBottom = document.getElementById('ready-display-time-bottom');
const readyStartBtnTop = document.getElementById('ready-start-btn-top');
const readyStartBtnBottom = document.getElementById('ready-start-btn-bottom');
const readyCancelBtn = document.getElementById('ready-cancel-btn');

const playerTopPanel = document.getElementById('player-top-panel');
const playerBottomPanel = document.getElementById('player-bottom-panel');
const playerTopTime = document.getElementById('player-top-time');
const playerBottomTime = document.getElementById('player-bottom-time');
const timerCancelBtn = document.getElementById('timer-cancel-btn');
const pauseBtn = document.getElementById('pause-btn');
const pausedOverlay = document.getElementById('paused-overlay');
const exitModal = document.getElementById('exit-modal');

// ── Utilities ──

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

// ── History ──

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(seconds) {
  const history = loadHistory();
  // Remove duplicate if already exists
  const filtered = history.filter(s => s !== seconds);
  filtered.unshift(seconds);
  // Keep only most recent MAX_HISTORY
  const trimmed = filtered.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function deleteFromHistory(seconds) {
  const history = loadHistory();
  const filtered = history.filter(s => s !== seconds);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  timerList.innerHTML = '';

  if (history.length === 0) {
    timerList.appendChild(timerListEmpty);
    timerListEmpty.style.display = '';
    return;
  }

  timerListEmpty.style.display = 'none';

  history.forEach(secs => {
    const item = document.createElement('div');
    item.className = 'timer-item';

    const tap = document.createElement('div');
    tap.className = 'timer-item-tap';
    tap.innerHTML = `<span class="timer-item-label">${formatTime(secs)}</span>`;
    tap.addEventListener('click', () => beginTimer(secs));

    const del = document.createElement('button');
    del.className = 'timer-item-delete';
    del.innerHTML = '&#x2715;';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFromHistory(secs);
    });

    item.appendChild(tap);
    item.appendChild(del);
    timerList.appendChild(item);
  });
}

// ── Timer Flow ──

function beginTimer(secs) {
  totalSeconds = secs;
  topRemaining = secs;
  bottomRemaining = secs;
  paused = false;

  readyDisplayTimeTop.textContent = formatTime(secs);
  readyDisplayTimeBottom.textContent = formatTime(secs);
  showScreen('ready');
}

function startActiveTimer(player) {
  saveToHistory(totalSeconds);
  renderHistory();

  activePlayer = player;
  paused = false;

  updateTimerDisplay();
  updatePlayerStyles();
  showScreen('timer');
  startTick();
}

function startTick() {
  clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
}

function tick() {
  if (paused) return;

  if (activePlayer === 'bottom') {
    bottomRemaining = Math.max(0, bottomRemaining - 1);
  } else {
    topRemaining = Math.max(0, topRemaining - 1);
  }

  updateTimerDisplay();

  if (bottomRemaining === 0 || topRemaining === 0) {
    clearInterval(intervalId);
    // Flash the expired player — just stop, UI reflects 0:00
  }
}

function updateTimerDisplay() {
  playerTopTime.textContent = formatTime(topRemaining);
  playerBottomTime.textContent = formatTime(bottomRemaining);
}

function updatePlayerStyles() {
  playerTopPanel.classList.toggle('active-player', activePlayer === 'top');
  playerTopPanel.classList.toggle('inactive-player', activePlayer !== 'top');
  playerBottomPanel.classList.toggle('active-player', activePlayer === 'bottom');
  playerBottomPanel.classList.toggle('inactive-player', activePlayer !== 'bottom');
}

function switchPlayer(tapped) {
  // Only the active player's tap advances the turn
  if (tapped !== activePlayer) return;
  if (paused) {
    // Resume on tap
    resumeTimer();
    return;
  }
  activePlayer = activePlayer === 'bottom' ? 'top' : 'bottom';
  updatePlayerStyles();
}

function pauseTimer() {
  paused = true;
  pauseBtn.innerHTML = '&#9654;';
  pauseBtn.classList.remove('pause-btn');
  pauseBtn.classList.add('action-btn', 'resume-btn');
  pausedOverlay.classList.add('visible');
}

function resumeTimer() {
  paused = false;
  pauseBtn.innerHTML = '&#9646;&#9646;';
  pauseBtn.classList.remove('resume-btn');
  pauseBtn.classList.add('action-btn', 'pause-btn');
  pausedOverlay.classList.remove('visible');
}

function showExitModal() {
  paused = true;
  exitModal.classList.add('visible');
}

function hideExitModal() {
  paused = false;
  exitModal.classList.remove('visible');
}

function cancelToSetup() {
  clearInterval(intervalId);
  paused = false;
  pausedOverlay.classList.remove('visible');
  pauseBtn.innerHTML = '&#9646;&#9646;';
  pauseBtn.classList.remove('resume-btn');
  pauseBtn.classList.add('action-btn', 'pause-btn');
  hideExitModal();
  showScreen('setup');
}

// ── Input normalization ──

function clampInput(input, min, max) {
  let val = parseInt(input.value, 10);
  if (isNaN(val) || val < min) val = min;
  if (val > max) val = max;
  input.value = val;
}

hoursInput.addEventListener('blur', () => clampInput(hoursInput, 0, 9));
minutesInput.addEventListener('blur', () => clampInput(minutesInput, 0, 59));
secondsInput.addEventListener('blur', () => clampInput(secondsInput, 0, 59));

// Select all on focus for easy replacement
hoursInput.addEventListener('focus', () => hoursInput.select());
minutesInput.addEventListener('focus', () => minutesInput.select());
secondsInput.addEventListener('focus', () => secondsInput.select());

// ── Event Listeners ──

setupStartBtn.addEventListener('click', () => {
  clampInput(hoursInput, 0, 9);
  clampInput(minutesInput, 0, 59);
  clampInput(secondsInput, 0, 59);
  const hrs = parseInt(hoursInput.value, 10) || 0;
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  const total = hrs * 3600 + mins * 60 + secs;
  if (total === 0) return;
  beginTimer(total);
});

readyStartBtnTop.addEventListener('click', () => startActiveTimer('top'));
readyStartBtnBottom.addEventListener('click', () => startActiveTimer('bottom'));
readyCancelBtn.addEventListener('click', cancelToSetup);

timerCancelBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  showExitModal();
});

document.querySelectorAll('.exit-confirm-btn').forEach(btn => btn.addEventListener('click', cancelToSetup));
document.querySelectorAll('.exit-cancel-btn').forEach(btn => btn.addEventListener('click', hideExitModal));

pauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (paused) {
    resumeTimer();
  } else {
    pauseTimer();
  }
});

// Player panel taps
playerTopPanel.addEventListener('click', () => {
  if (paused) {
    resumeTimer();
    return;
  }
  switchPlayer('top');
});

playerBottomPanel.addEventListener('click', () => {
  if (paused) {
    resumeTimer();
    return;
  }
  switchPlayer('bottom');
});

// ── Init ──
renderHistory();
