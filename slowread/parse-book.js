// Run with: node parse-book.js
// Reads source files from books/ and writes book.json

const fs = require('fs');

function parseBook({ file, startMarker, endMarker, id, title, author, chapterRegex, prependChapter, extraFilters = [] }) {
  const raw = fs.readFileSync(`./books/${file}`, 'utf8');

  let text = raw;

  // Strip Gutenberg header
  const startIdx = text.indexOf(startMarker);
  if (startIdx !== -1) text = text.slice(startIdx);

  // Strip Gutenberg footer
  const resolvedEnd = endMarker || '*** END OF THE PROJECT GUTENBERG EBOOK';
  const endIdx = text.indexOf(resolvedEnd);
  if (endIdx !== -1) text = text.slice(0, endIdx);

  // ── Pass 1: extract chapter headings with their char offsets ──
  const rawChapters = [];

  if (chapterRegex) {
    const re = new RegExp(chapterRegex.source, chapterRegex.flags.includes('g') ? chapterRegex.flags : chapterRegex.flags + 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      const heading = m[0].replace(/\s+/g, ' ').trim();
      rawChapters.push({ title: heading, charOffset: m.index });
    }
  }

  // ── Pass 2: clean and normalize text ──

  let normalized = text
    .replace(/\r\n/g, '\n')
    // Remove image lines (e.g. "p020.jpg (352K)" or "Full Size")
    .replace(/^\s*\S+\.jpg[^\n]*$/mg, '')
    .replace(/^\s*Full Size\s*$/mg, '')
    // Strip italic markers but preserve content as <em>
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Collapse runs of blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Join soft-wrapped lines within a paragraph (single newline → space)
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // ── Pass 3: sentence splitting via Intl.Segmenter ──

  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const rawSegments = [...segmenter.segment(normalized)].map(s => s.segment.trim()).filter(Boolean);

  // Re-join segments where the split happened inside a closing quote
  // e.g. Segmenter splits: ["He said.", "\" She replied."] → join back
  // Rule: if a segment is just a closing quote (or starts with one and is very short), merge with previous
  const rejoined = [];
  for (const seg of rawSegments) {
    const prev = rejoined[rejoined.length - 1];
    if (prev && /^["'\u201C\u201D\u2018\u2019]\s+[a-z]/.test(seg)) {
      // Starts with closing quote + space + lowercase → continuation of previous sentence
      rejoined[rejoined.length - 1] = prev + ' ' + seg;
    } else if (prev && /^["'\u201D\u2019]\s*$/.test(seg)) {
      // Segment is just a closing quote — attach to previous
      rejoined[rejoined.length - 1] = prev + seg;
    } else {
      rejoined.push(seg);
    }
  }

  // ── Pass 4: filter sentences ──

  const filters = [
    s => s.replace(/<[^>]+>/g, '').trim().length < 8,
    s => /^[A-Z0-9\s\-;:,\.'"]+$/.test(s.replace(/<[^>]+>/g, '')),
    ...extraFilters,
  ];

  const sentences = rejoined.filter(s => !filters.some(fn => fn(s)));

  // ── Pass 5: map chapter headings to sentence indices ──

  const chapters = [];

  if (rawChapters.length > 0) {
    let searchFrom = 0;
    const sentencePositions = sentences.map(s => {
      const plain = s.replace(/<[^>]+>/g, '');
      const pos = normalized.indexOf(plain.slice(0, 40), searchFrom);
      if (pos !== -1) searchFrom = pos + plain.length;
      return pos;
    });

    rawChapters.forEach(({ title, charOffset }) => {
      const headingWords = title.replace(/<[^>]+>/g, '').split(' ').slice(0, 4).join(' ');
      const normalizedOffset = normalized.indexOf(headingWords);
      if (normalizedOffset === -1) return;

      const sentenceIndex = sentencePositions.findIndex(pos => pos >= normalizedOffset);
      if (sentenceIndex !== -1) {
        chapters.push({ title, sentenceIndex });
      }
    });

    if (prependChapter) {
      chapters.unshift({ title: prependChapter, sentenceIndex: 0 });
    }

    const seen = new Set();
    const deduped = chapters
      .sort((a, b) => a.sentenceIndex - b.sentenceIndex)
      .filter(c => {
        if (seen.has(c.sentenceIndex)) return false;
        seen.add(c.sentenceIndex);
        return true;
      });

    chapters.length = 0;
    chapters.push(...deduped);
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
  // Multi-line chapter headings: match CHAPTER + roman numerals + everything until blank line
  chapterRegex: /^CHAPTER [IVXLCDM]+[^\n]*(?:\n[^\n]+)*/mg,
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
