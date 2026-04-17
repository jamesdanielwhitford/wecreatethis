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

  // Pre-protect common abbreviations so Segmenter doesn't split on them.
  // Replace "Mr." etc. with a placeholder, restore after splitting.
  const ABBREVS = [
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Jr', 'Sr',
    'Vol', 'No', 'vs', 'etc', 'viz', 'cf', 'al', 'ibid',
    'Mt', 'Ft', 'Capt', 'Col', 'Gen', 'Sgt', 'Lt', 'Gov',
    'Messrs', 'Bros', 'Co', 'Corp', 'Inc', 'Ltd',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'approx', 'dept', 'est', 'ext', 'misc', 'dept', 'op', 'seq',
  ];
  const PLACEHOLDER = '\x00';
  let protected_ = normalized;
  ABBREVS.forEach(a => {
    protected_ = protected_.replace(new RegExp(`\\b${a}\\.`, 'g'), `${a}${PLACEHOLDER}`);
  });

  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const rawSegments = [...segmenter.segment(protected_)]
    .map(s => s.segment.replace(new RegExp(PLACEHOLDER, 'g'), '.').trim())
    .filter(Boolean);

  // Re-join segments where the split happened inside a closing quote
  // e.g. Segmenter splits: ["He said.", "\" she replied."] → join back
  // Rule: if segment starts with closing quote + lowercase, merge with previous
  const rejoined = [];
  for (const seg of rawSegments) {
    const prev = rejoined[rejoined.length - 1];
    if (prev && /^["'\u201C\u201D\u2018\u2019]\s+[a-z]/.test(seg)) {
      rejoined[rejoined.length - 1] = prev + ' ' + seg;
    } else if (prev && /^["'\u201D\u2019]\s*$/.test(seg)) {
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

const theTrial = parseBook({
  file: 'kafka-the-trial.txt',
  startMarker: 'Someone must have been telling lies about Josef K.',
  id: 'the-trial',
  title: 'The Trial',
  author: 'Franz Kafka',
  chapterRegex: /^Chapter \w+$/mg,
  prependChapter: 'Chapter One',
  extraFilters: [
    s => /^Chapter\s/i.test(s),
  ],
});

const karamazov = parseBook({
  file: 'karamazov.txt',
  startMarker: 'Alexey Fyodorovitch Karamazov was the third son',
  id: 'brothers-karamazov',
  title: 'The Brothers Karamazov',
  author: 'Fyodor Dostoyevsky',
  // Capture "Chapter I.\nTitle" as a two-line heading
  chapterRegex: /^Chapter [IVXLCDM]+\.\n.+$/mg,
  prependChapter: 'Chapter I. Fyodor Pavlovitch Karamazov',
  extraFilters: [
    s => /^Chapter\s/i.test(s),
    s => /^Book\s[IVXLCDM]+\./i.test(s),
    s => /^Part\s/i.test(s),
  ],
});

const thePrince = parseBook({
  file: 'the-prince.txt',
  startMarker: 'All states, all powers, that have held and hold rule over men',
  id: 'the-prince',
  title: 'The Prince',
  author: 'Niccolò Machiavelli',
  // "CHAPTER I.\nTITLE LINE(S)" — capture roman numeral + multi-line title
  chapterRegex: /^CHAPTER [IVXLCDM]+\.[^\n]*(?:\n[^\n]+)*/mg,
  prependChapter: 'CHAPTER I.',
  extraFilters: [
    s => /^CHAPTER\s/i.test(s),
    s => /^INTRODUCTION/.test(s),
    s => /^YOUTH/.test(s),
    s => /^OFFICE/.test(s),
    s => /^LITERATURE AND DEATH/.test(s),
    s => /^DEDICATION/.test(s),
    s => /^THE MAN AND HIS WORKS/.test(s),
  ],
});

const artOfWar = parseBook({
  file: 'art-of-war.txt',
  startMarker: 'Sun Tzŭ said: The art of war is of vital importance to the State.',
  id: 'art-of-war',
  title: 'The Art of War',
  author: 'Sun Tzu',
  chapterRegex: /^Chapter [IVXLCDM]+\. .+$/mg,
  prependChapter: 'Chapter I. Laying Plans',
  extraFilters: [
    s => /^Chapter\s/i.test(s),
    // Strip translator commentary in square brackets
    s => /^\[/.test(s.trim()),
    // Strip numbered aphorism markers like "1." or "5, 6."
    s => /^\d[\d,\s]*\./.test(s.trim()) && s.trim().length < 10,
  ],
});

const odyssey = parseBook({
  file: 'odyssey.txt',
  startMarker: 'Tell me, O Muse, of that ingenious hero who travelled far and wide',
  id: 'odyssey',
  title: 'The Odyssey',
  author: 'Homer',
  chapterRegex: /^BOOK [IVXLCDM]+$/mg,
  prependChapter: 'BOOK I',
  extraFilters: [
    s => /^BOOK\s/i.test(s),
    s => /^\[Illustration\]/.test(s),
    s => /^FOOTNOTES/.test(s),
  ],
});

const zarathustra = parseBook({
  file: 'zarathustra.txt',
  startMarker: 'When Zarathustra was thirty years old, he left his home',
  id: 'zarathustra',
  title: 'Thus Spake Zarathustra',
  author: 'Friedrich Nietzsche',
  chapterRegex: /^[IVXLCDM]+\. [A-Z][^\n]+$/mg,
  prependChapter: "Zarathustra's Prologue",
  extraFilters: [
    s => /^[IVXLCDM]+\.\s/.test(s),
    s => /^ZARATHUSTRA'S/.test(s),
    s => /^\d+\.$/.test(s.trim()),
  ],
});

const ulysses = parseBook({
  file: 'ulysses.txt',
  startMarker: 'Stately, plump Buck Mulligan came from the stairhead',
  id: 'ulysses',
  title: 'Ulysses',
  author: 'James Joyce',
  chapterRegex: /^\[ \d+ \]$/mg,
  prependChapter: '[ 1 ]',
  extraFilters: [
    s => /^\[/.test(s.trim()),
    s => /^\[Illustration\]/.test(s),
    s => /^—\s*[IVX]+\s*—$/.test(s.trim()),
  ],
});

const books = [mobyDick, donQuixote, theTrial, karamazov, thePrince, artOfWar, odyssey, zarathustra, ulysses];

fs.writeFileSync('./book.json', JSON.stringify(books, null, 2));
books.forEach(b => console.log(`${b.title}: ${b.sentences.length} sentences, ${b.chapters.length} chapters`));
console.log('Done. Written to book.json.');
