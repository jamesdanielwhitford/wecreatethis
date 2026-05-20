const APP_VERSION = '1.0.0';
const STORAGE_KEY = 'chesstimer-history';
const DRUM_KEY = 'chesstimer-drum';
const MAX_HISTORY = 10;

// State
let totalSeconds = 0;
let topRemaining = 0;
let bottomRemaining = 0;
let activePlayer = 'bottom'; // 'top' or 'bottom'
let paused = false;
let intervalId = null;
let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {}
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && intervalId && !paused) acquireWakeLock();
});

// DOM refs
const screens = {
  setup: document.getElementById('setup-screen'),
  ready: document.getElementById('ready-screen'),
  timer: document.getElementById('timer-screen'),
};

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

function formatTimeHTML(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `<span class="time-seg">${h}</span><span class="time-colon">:</span><span class="time-seg">${String(m).padStart(2, '0')}</span><span class="time-colon">:</span><span class="time-seg">${String(s).padStart(2, '0')}</span>`;
  }
  return `<span class="time-seg">${m}</span><span class="time-colon">:</span><span class="time-seg">${String(s).padStart(2, '0')}</span>`;
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

    const actions = document.createElement('div');
    actions.className = 'timer-item-actions';

    const play = document.createElement('button');
    play.className = 'timer-item-play';
    play.innerHTML = '';
    play.addEventListener('click', (e) => {
      e.stopPropagation();
      beginTimer(secs);
    });

    const del = document.createElement('button');
    del.className = 'timer-item-delete';
    del.innerHTML = '';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFromHistory(secs);
    });

    actions.appendChild(play);
    actions.appendChild(del);
    item.appendChild(tap);
    item.appendChild(actions);
    timerList.appendChild(item);
  });
}

// ── Timer Flow ──

function beginTimer(secs) {
  totalSeconds = secs;
  topRemaining = secs;
  bottomRemaining = secs;
  paused = false;

  readyDisplayTimeTop.innerHTML = formatTimeHTML(secs);
  readyDisplayTimeBottom.innerHTML = formatTimeHTML(secs);
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
  acquireWakeLock();
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
    intervalId = null;
    const expiredPanel = bottomRemaining === 0 ? playerBottomPanel : playerTopPanel;
    expiredPanel.classList.remove('active-player', 'inactive-player');
    expiredPanel.classList.add('expired-player');
  }
}

function updateTimerDisplay() {
  playerTopTime.innerHTML = formatTimeHTML(topRemaining);
  playerBottomTime.innerHTML = formatTimeHTML(bottomRemaining);
}

function updatePlayerStyles() {
  playerTopPanel.classList.toggle('active-player', activePlayer === 'top');
  playerTopPanel.classList.toggle('inactive-player', activePlayer !== 'top');
  playerBottomPanel.classList.toggle('active-player', activePlayer === 'bottom');
  playerBottomPanel.classList.toggle('inactive-player', activePlayer !== 'bottom');
}

function switchPlayer(tapped) {
  if (topRemaining === 0 || bottomRemaining === 0) return;
  if (tapped !== activePlayer) return;
  if (paused) {
    resumeTimer();
    return;
  }
  activePlayer = activePlayer === 'bottom' ? 'top' : 'bottom';
  updatePlayerStyles();
}

function pauseTimer() {
  paused = true;
  pauseBtn.innerHTML = '';
  pauseBtn.classList.remove('pause-btn');
  pauseBtn.classList.add('action-btn', 'resume-btn');
  pausedOverlay.classList.add('visible');
  releaseWakeLock();
}

function resumeTimer() {
  paused = false;
  pauseBtn.innerHTML = '';
  pauseBtn.classList.remove('resume-btn');
  pauseBtn.classList.add('action-btn', 'pause-btn');
  pausedOverlay.classList.remove('visible');
  acquireWakeLock();
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
  releaseWakeLock();
  paused = false;
  pausedOverlay.classList.remove('visible');
  pauseBtn.innerHTML = '';
  pauseBtn.classList.remove('resume-btn');
  pauseBtn.classList.add('action-btn', 'pause-btn');
  hideExitModal();
  showScreen('setup');
}

// ── Drum pickers ──

function makeDrum(colId, trackId, max, initial, label) {
  const col = document.getElementById(colId);
  const track = document.getElementById(trackId);
  const ITEM_H = 52;
  const BUFFER = 10;
  let value = initial;
  const api = { getValue: () => value, setValue, onChange: null };

  function buildTrack() {
    track.innerHTML = '';
    for (let i = -BUFFER; i <= BUFFER; i++) {
      const div = document.createElement('div');
      div.className = 'drum-item' + (i === 0 ? ' selected' : '');
      const num = String((value + i + max + 1) % (max + 1)).padStart(max >= 10 ? 2 : 1, '0');
      div.innerHTML = i === 0
        ? `${num}<span class="drum-unit">${label}</span>`
        : num;
      track.appendChild(div);
    }
    track.style.transform = `translateY(${-(BUFFER - 1) * ITEM_H}px)`;
  }

  function setValue(v) {
    value = ((v % (max + 1)) + max + 1) % (max + 1);
    buildTrack();
    if (api.onChange) api.onChange();
  }

  buildTrack();

  let startY = 0;
  let dragging = false;
  let accumulated = 0;

  function onStart(y) {
    startY = y;
    dragging = true;
    accumulated = 0;
    track.style.transition = 'none';
  }

  function onMove(y) {
    if (!dragging) return;
    const dy = y - startY;
    track.style.transform = `translateY(${-(BUFFER - 1) * ITEM_H + dy}px)`;
    accumulated = dy;
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    const steps = -Math.round(accumulated / ITEM_H);
    setValue(value + steps);
  }

  col.addEventListener('mousedown', e => onStart(e.clientY));
  window.addEventListener('mousemove', e => { if (dragging) onMove(e.clientY); });
  window.addEventListener('mouseup', onEnd);

  col.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  col.addEventListener('touchmove', e => { onMove(e.touches[0].clientY); }, { passive: true });
  col.addEventListener('touchend', onEnd);

  return api;
}

function loadDrumState() {
  try { return JSON.parse(localStorage.getItem(DRUM_KEY)) || { h: 0, m: 5, s: 0 }; }
  catch { return { h: 0, m: 5, s: 0 }; }
}
function saveDrumState() {
  localStorage.setItem(DRUM_KEY, JSON.stringify({ h: drumHours.getValue(), m: drumMinutes.getValue(), s: drumSeconds.getValue() }));
}

const savedDrum = loadDrumState();
const drumHours   = makeDrum('drum-hours',   'drum-track-hours',   9,  savedDrum.h, 'hours');
const drumMinutes = makeDrum('drum-minutes', 'drum-track-minutes', 59, savedDrum.m, 'min');
const drumSeconds = makeDrum('drum-seconds', 'drum-track-seconds', 59, savedDrum.s, 'sec');

drumHours.onChange   = saveDrumState;
drumMinutes.onChange = saveDrumState;
drumSeconds.onChange = saveDrumState;

// ── Event Listeners ──

setupStartBtn.addEventListener('click', () => {
  const total = drumHours.getValue() * 3600 + drumMinutes.getValue() * 60 + drumSeconds.getValue();
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

// ── Fullscreen ──
const fullscreenBtn = document.getElementById('fullscreen-btn');

const ICON_ENTER = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const ICON_EXIT  = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`;

const fullscreenSupported = document.documentElement.requestFullscreen !== undefined;
if (!fullscreenSupported) {
  fullscreenBtn.style.display = 'none';
} else {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.innerHTML = document.fullscreenElement ? ICON_EXIT : ICON_ENTER;
  });
}

// ── Init ──
renderHistory();
