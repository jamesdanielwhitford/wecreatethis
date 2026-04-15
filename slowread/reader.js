const FONT_SIZE_MAP = {
  small:  '16px',
  medium: '22px',
  large:  '28px',
  xlarge: '36px',
};

function getWordDelay() {
  return parseInt(localStorage.getItem('slowread-speed') || '200', 10);
}

function getSentencePause() {
  return parseInt(localStorage.getItem('slowread-pause') || '2000', 10);
}

function applyFontSize() {
  const size = localStorage.getItem('slowread-fontsize') || 'medium';
  document.documentElement.style.setProperty('--sentence-size', FONT_SIZE_MAP[size] || '22px');
}

function applyAlign() {
  const align = localStorage.getItem('slowread-align') || 'center';
  document.documentElement.style.setProperty('--sentence-align', align);
}

let book = null;
let sentences = [];
let currentIndex = 0;
let isPaused = false;
let wordTimer = null;
let currentSpans = [];
let pausedWordIndex = 0;
let navigatedWhilePaused = false;

// ── DOM refs ─────────────────────────────────────────────

const display   = document.getElementById('sentenceDisplay');
const menu      = document.getElementById('readerMenu');
const menuTitle = document.getElementById('menuTitle');
const menuProg  = document.getElementById('menuProgress');

const zoneTop    = document.getElementById('zoneTop');
const zoneBottom = document.getElementById('zoneBottom');
const zoneLeft   = document.getElementById('zoneLeft');
const zoneCenter = document.getElementById('zoneCenter');
const zoneRight  = document.getElementById('zoneRight');

// ── Init ─────────────────────────────────────────────────

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = '/slowread/'; return; }

  const res = await fetch('/slowread/book.json');
  const books = await res.json();
  book = books.find(b => b.id === id);
  if (!book) { location.href = '/slowread/'; return; }

  sentences = book.sentences;
  menuTitle.textContent = book.title;

  // Restore saved position
  const saved = localStorage.getItem(`slowread-pos-${id}`);
  currentIndex = saved ? parseInt(saved, 10) : 0;
  if (currentIndex >= sentences.length) currentIndex = 0;

  applyFontSize();
  applyAlign();
  showSentence(currentIndex, true);
}

// ── Sentence display ──────────────────────────────────────

function showSentence(index, autoPlay) {
  clearTimer();
  display.innerHTML = '';
  updateProgress();

  const sentence = sentences[index];
  const words = sentence.split(' ');

  const p = document.createElement('p');
  p.className = 'sentence-text';

  currentSpans = words.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = (i === 0 ? '' : ' ') + word;
    p.appendChild(span);
    return span;
  });

  display.appendChild(p);

  if (autoPlay && !isPaused) {
    pausedWordIndex = 0;
    navigatedWhilePaused = false;
    revealWords(currentSpans, 0);
  } else if (isPaused) {
    // Navigated while paused: show all words, resume will start from beginning
    pausedWordIndex = 0;
    navigatedWhilePaused = true;
    currentSpans.forEach(s => s.classList.add('visible'));
  }
}

function revealWords(spans, i) {
  pausedWordIndex = i;
  if (i >= spans.length) {
    // Sentence done, auto-advance after a pause
    wordTimer = setTimeout(() => {
      if (!isPaused) advance(1);
    }, getSentencePause());
    return;
  }
  spans[i].classList.add('visible');
  wordTimer = setTimeout(() => revealWords(spans, i + 1), getWordDelay());
}

function clearTimer() {
  if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; }
}

// ── Navigation ────────────────────────────────────────────

function advance(dir) {
  const next = currentIndex + dir;
  if (next < 0 || next >= sentences.length) return;
  currentIndex = next;
  savePos();
  showSentence(currentIndex, !isPaused);
}

function savePos() {
  localStorage.setItem(`slowread-pos-${book.id}`, currentIndex);
}

function updateProgress() {
  menuProg.textContent = `${currentIndex + 1} / ${sentences.length}`;
}

// ── Pause / Resume ────────────────────────────────────────

function pause() {
  isPaused = true;
  clearTimer();
  menu.classList.add('visible');
  // Leave words as-is — don't reveal the rest
}

function resume() {
  isPaused = false;
  menu.classList.remove('visible');
  if (navigatedWhilePaused) {
    // Navigated to a new sentence while paused: rebuild and play from start
    navigatedWhilePaused = false;
    showSentence(currentIndex, true);
  } else {
    // Resumed on same sentence: continue from where we paused
    revealWords(currentSpans, pausedWordIndex);
  }
}

// ── Touch zones ───────────────────────────────────────────
// Playing: entire screen = pause
// Paused: top/bottom = resume, left = prev, right = next

zoneTop.addEventListener('click', () => {
  if (isPaused) resume(); else pause();
});

zoneBottom.addEventListener('click', () => {
  if (isPaused) resume(); else pause();
});

zoneLeft.addEventListener('click', () => {
  if (isPaused) advance(-1); else pause();
});

zoneCenter.addEventListener('click', () => {
  if (isPaused) resume(); else pause();
});

zoneRight.addEventListener('click', () => {
  if (isPaused) advance(1); else pause();
});

// ── Start ─────────────────────────────────────────────────

init();
