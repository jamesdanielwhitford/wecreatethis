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
  const align = localStorage.getItem('slowread-align') || 'left';
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

const tocOverlay = document.getElementById('tocOverlay');
const tocList    = document.getElementById('tocList');

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

// ── Dynamic text positioning ──────────────────────────────

const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d');

function measureSentenceLines(words, containerW) {
  const spaceW = _ctx.measureText(' ').width;
  let lineCount = 1;
  let lineW = 0;
  for (let i = 0; i < words.length; i++) {
    const wordW = _ctx.measureText(words[i]).width;
    if (i === 0) {
      lineW = wordW;
    } else if (lineW + spaceW + wordW > containerW) {
      lineCount++;
      lineW = wordW;
    } else {
      lineW += spaceW + wordW;
    }
  }
  return lineCount;
}

let currentSentenceWords = [];
let currentSentenceWillScroll = false;

function repositionText(visibleWordCount, allWords) {
  const p = display.querySelector('.sentence-text');
  if (!p || visibleWordCount === 0) return;

  const fontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sentence-size') || '22', 10);
  const lineHeight = fontSize * 1.7;
  const containerW = Math.min(display.clientWidth - 80, 680);
  const containerH = display.clientHeight - 160;

  _ctx.font = `${fontSize}px Georgia, serif`;

  const visibleWords = allWords.slice(0, visibleWordCount);
  const lineCount = measureSentenceLines(visibleWords, containerW);
  const textH = lineCount * lineHeight;

  let marginTop;
  if (textH <= containerH) {
    marginTop = (containerH - textH) / 2;
  } else {
    marginTop = containerH - textH;
  }
  p.style.marginTop = marginTop + 'px';
}

// ── Sentence display ──────────────────────────────────────

function showSentence(index, autoPlay) {
  clearTimer();
  display.innerHTML = '';
  updateProgress();

  const sentence = sentences[index];
  currentSentenceWords = sentence.split(' ');

  // Pre-measure full sentence to decide if scrolling is needed
  const fontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sentence-size') || '22', 10);
  const lineHeight = fontSize * 1.7;
  const containerW = Math.min(display.clientWidth - 80, 680);
  const containerH = display.clientHeight - 160;
  _ctx.font = `${fontSize}px Georgia, serif`;
  const totalLines = measureSentenceLines(currentSentenceWords, containerW);
  const totalH = totalLines * lineHeight;
  currentSentenceWillScroll = totalH > containerH;

  const p = document.createElement('p');
  p.className = 'sentence-text';
  // Disable transition on initial placement so it doesn't animate in from wrong position
  p.style.transition = 'none';
  // Set initial marginTop: centered for short, top-of-container for long
  const initialMargin = currentSentenceWillScroll ? 0 : (containerH - totalH) / 2;
  p.style.marginTop = initialMargin + 'px';

  currentSpans = currentSentenceWords.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.innerHTML = (i === 0 ? '' : ' ') + word;
    p.appendChild(span);
    return span;
  });

  display.appendChild(p);
  // Re-enable transition after initial placement
  requestAnimationFrame(() => { p.style.transition = ''; });

  if (autoPlay && !isPaused) {
    pausedWordIndex = 0;
    navigatedWhilePaused = false;
    revealWords(currentSpans, 0);
  } else if (isPaused) {
    // Navigated while paused: show all words, resume will start from beginning
    pausedWordIndex = 0;
    navigatedWhilePaused = true;
    currentSpans.forEach(s => s.classList.add('visible'));
    if (currentSentenceWillScroll) {
      // Start at top so user reads from the beginning
      const p = display.querySelector('.sentence-text');
      if (p) { p.style.transition = 'none'; p.style.marginTop = '0px'; }
    } else {
      repositionText(currentSpans.length, currentSentenceWords);
    }
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
  if (currentSentenceWillScroll) repositionText(i + 1, currentSentenceWords);
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
// Paused + drag: scroll the sentence text

const DRAG_THRESHOLD = 8; // px — below this it's a tap, above it's a scroll
const HOLD_THRESHOLD = 150; // ms — below this it's a tap, above it's a hold

let dragStartY = null;
let dragStartMargin = 0;
let isDragging = false;
let holdTimer = null;
let isHolding = false;

function isHoldMode() {
  return localStorage.getItem('slowread-hold-to-play') === 'on';
}

function getCurrentMargin() {
  const p = display.querySelector('.sentence-text');
  return p ? parseFloat(p.style.marginTop) || 0 : 0;
}

function setMargin(value) {
  const p = display.querySelector('.sentence-text');
  if (!p) return;
  // Clamp: can't drag below initial position, can't drag so far up text disappears
  const fontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sentence-size') || '22', 10);
  const lineHeight = fontSize * 1.7;
  const containerH = display.clientHeight - 160;
  const maxMargin = (containerH - lineHeight) / 2; // initial centered position
  const minMargin = -(p.scrollHeight); // far enough up to read the top
  p.style.transition = 'none';
  p.style.marginTop = Math.min(maxMargin, Math.max(minMargin, value)) + 'px';
}

const zones = [zoneTop, zoneBottom, zoneLeft, zoneCenter, zoneRight];

zones.forEach(zone => {
  zone.addEventListener('touchstart', e => {
    dragStartY = e.touches[0].clientY;
    dragStartMargin = getCurrentMargin();
    isDragging = false;
    isHolding = false;

    if (isHoldMode()) {
      holdTimer = setTimeout(() => {
        isHolding = true;
        if (isPaused) resume();
      }, HOLD_THRESHOLD);
    }
  }, { passive: true });

  zone.addEventListener('touchmove', e => {
    if (dragStartY === null) return;
    const dy = e.touches[0].clientY - dragStartY;
    if (!isDragging && Math.abs(dy) > DRAG_THRESHOLD) {
      isDragging = true;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    }
    if (isDragging && isPaused) setMargin(dragStartMargin + dy);
  }, { passive: true });

  zone.addEventListener('touchend', e => {
    dragStartY = null;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (isHolding) {
      e.preventDefault(); // suppress synthetic click so it can't undo the pause
      isHolding = false;
      if (!isPaused) pause();
    }
  });
});

function handleZoneClick(action) {
  if (isDragging) { isDragging = false; return; }
  if (isHolding) return;
  action();
}

zoneTop.addEventListener('click', () => handleZoneClick(() => {
  if (isPaused) resume(); else pause();
}));

zoneBottom.addEventListener('click', () => handleZoneClick(() => {
  if (isPaused) resume(); else pause();
}));

zoneLeft.addEventListener('click', () => handleZoneClick(() => {
  if (isPaused) advance(-1); else pause();
}));

zoneCenter.addEventListener('click', () => handleZoneClick(() => {
  if (isPaused) resume(); else pause();
}));

zoneRight.addEventListener('click', () => handleZoneClick(() => {
  if (isPaused) advance(1); else pause();
}));

// ── Table of contents ─────────────────────────────────────

let tocOpen = false;

function openToc() {
  tocOpen = true;
  tocList.innerHTML = '';

  // Resume item
  const resume = document.createElement('div');
  resume.className = 'toc-item toc-resume';
  resume.textContent = 'Continue reading';
  resume.addEventListener('click', closeToc);
  tocList.appendChild(resume);

  // Chapter items
  (book.chapters || []).forEach(chapter => {
    const item = document.createElement('div');
    item.className = 'toc-item';

    // Mark the current chapter
    const currentChapter = getCurrentChapter();
    if (currentChapter && currentChapter.sentenceIndex === chapter.sentenceIndex) {
      item.classList.add('toc-current');
    }

    item.textContent = chapter.title;
    item.addEventListener('click', () => {
      closeToc();
      currentIndex = chapter.sentenceIndex;
      savePos();
      if (!isPaused) pause();
      showSentence(currentIndex, false);
    });
    tocList.appendChild(item);
  });

  tocOverlay.classList.add('visible');

  // Scroll to current chapter
  const currentItem = tocList.querySelector('.toc-current');
  if (currentItem) {
    requestAnimationFrame(() => currentItem.scrollIntoView({ block: 'center' }));
  }
}

function closeToc() {
  tocOpen = false;
  tocOverlay.classList.remove('visible');
}

function getCurrentChapter() {
  if (!book.chapters || book.chapters.length === 0) return null;
  let current = book.chapters[0];
  for (const ch of book.chapters) {
    if (ch.sentenceIndex <= currentIndex) current = ch;
    else break;
  }
  return current;
}

menuProg.addEventListener('click', () => {
  if (tocOpen) closeToc();
  else { if (!isPaused) pause(); openToc(); }
});

// ── Start ─────────────────────────────────────────────────

init();
