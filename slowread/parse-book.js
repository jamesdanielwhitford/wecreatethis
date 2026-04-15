// Run with: node parse-book.js
// Reads source files from books/ and writes book.json

const fs = require('fs');

function parseBook({ file, startMarker, endMarker, id, title, author, chapterRegex, prependChapter, extraFilters = [] }) {
  const raw = fs.readFileSync(`./books/${file}`, 'utf8');

  let text = raw;
  const startIdx = text.indexOf(startMarker);
  if (startIdx !== -1) text = text.slice(startIdx);

  const resolvedEnd = endMarker || '*** END OF THE PROJECT GUTENBERG EBOOK';
  const endIdx = text.indexOf(resolvedEnd);
  if (endIdx !== -1) text = text.slice(0, endIdx);

  // ── Pass 1: find chapter headings and their byte offsets in raw prose ──
  const rawChapters = []; // { title, charOffset }

  if (chapterRegex) {
    let m;
    const re = new RegExp(chapterRegex.source, chapterRegex.flags.includes('g') ? chapterRegex.flags : chapterRegex.flags + 'g');
    while ((m = re.exec(text)) !== null) {
      rawChapters.push({ title: m[0].replace(/\s+/g, ' ').trim(), charOffset: m.index });
    }
  }

  // ── Pass 2: normalize and split sentences, tracking char offsets ──
  // Build a char-offset map by replacing text chunk by chunk
  // Simpler: note the raw text position of each sentence start

  // Normalize
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const raw_sentences = normalized.match(/[^.!?]+[.!?]+["']?/g) || [];

  const sentences = [];
  const filters = [
    s => s.length < 8,
    s => /^[A-Z0-9\s\-;:,\.'"]+$/.test(s),
    ...extraFilters,
  ];

  raw_sentences.forEach(s => {
    s = s.trim();
    if (filters.some(fn => fn(s))) return;
    sentences.push(s);
  });

  // ── Pass 3: map chapter offsets to sentence indices ──
  // For each chapter heading, find which sentence index it precedes
  // by searching for the first sentence that appears after the heading in the normalized text
  const chapters = [];

  if (rawChapters.length > 0) {
    // Build a lookup: for each sentence, find its position in normalized text
    let searchFrom = 0;
    const sentencePositions = sentences.map(s => {
      const pos = normalized.indexOf(s, searchFrom);
      if (pos !== -1) searchFrom = pos + s.length;
      return pos;
    });

    // For each chapter, find the normalized offset of the heading
    // then find the first sentence whose position is >= that offset
    rawChapters.forEach(({ title, charOffset }) => {
      // Find this heading in normalized text
      // The heading may be slightly different after normalization, use first few words
      const headingWords = title.split(' ').slice(0, 4).join(' ');
      const normalizedOffset = normalized.indexOf(headingWords);
      if (normalizedOffset === -1) return;

      // Find first sentence that starts at or after this offset
      const sentenceIndex = sentencePositions.findIndex(pos => pos >= normalizedOffset);
      if (sentenceIndex !== -1) {
        chapters.push({ title, sentenceIndex });
      }
    });

    // Prepend chapter 1 at sentence 0 if the prose starts mid-chapter
    if (prependChapter) {
      chapters.unshift({ title: prependChapter, sentenceIndex: 0 });
    }

    // Deduplicate by sentenceIndex (keep first)
    const seen = new Set();
    const dedupedChapters = chapters.filter(c => {
      if (seen.has(c.sentenceIndex)) return false;
      seen.add(c.sentenceIndex);
      return true;
    });
    chapters.length = 0;
    chapters.push(...dedupedChapters.sort((a, b) => a.sentenceIndex - b.sentenceIndex));
  }

  return { id, title, author, sentences, chapters };
}

const mobyDick = parseBook({
  file: 'moby-dick.txt',
  startMarker: 'Call me Ishmael.',
  id: 'moby-dick',
  title: 'Moby Dick',
  author: 'Herman Melville',
  prependChapter: 'CHAPTER 1. Loomings.',
  chapterRegex: /^CHAPTER \d+\. .+$/mg,
  extraFilters: [
    s => /^CHAPTER\s/i.test(s),
    s => /^By [A-Z]/.test(s),
    s => /CONTENTS/.test(s),
    s => /ETYMOLOGY/.test(s),
    s => /EXTRACTS/.test(s),
  ],
});

const donQuixote = parseBook({
  file: 'don-quixote.txt',
  startMarker: 'In a village of La Mancha, the name of which I have no desire to call',
  id: 'don-quixote',
  title: 'Don Quixote',
  author: 'Miguel de Cervantes',
  prependChapter: 'CHAPTER I.',
  chapterRegex: /^CHAPTER [IVXLCDM]+[^\n]*/mg,
  extraFilters: [
    s => /^CHAPTER\s/i.test(s),
    s => /Full Size/.test(s),
    s => /\.jpg/.test(s),
    s => /^CONTENTS/.test(s),
    s => /^INTRODUCTION/.test(s),
    s => /^PREFACE/.test(s),
    s => /^VOLUME\s/i.test(s),
  ],
});

const books = [mobyDick, donQuixote];

fs.writeFileSync('./book.json', JSON.stringify(books, null, 2));
books.forEach(b => console.log(`${b.title}: ${b.sentences.length} sentences, ${b.chapters.length} chapters`));
console.log('Done. Written to book.json.');
