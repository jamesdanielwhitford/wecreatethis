// Run with: node parse-book.js
// Reads source files from books/ and writes book.json

const fs = require('fs');

function parseBook({ file, startMarker, endMarker, id, title, author, extraFilters = [] }) {
  const raw = fs.readFileSync(`./books/${file}`, 'utf8');

  let text = raw;
  const startIdx = text.indexOf(startMarker);
  if (startIdx !== -1) text = text.slice(startIdx);
  const endIdx = text.indexOf(endMarker);
  if (endIdx !== -1) text = text.slice(0, endIdx);

  // Collapse whitespace and normalize line breaks
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const raw_sentences = text.match(/[^.!?]+[.!?]+["']?/g) || [];

  const sentences = raw_sentences
    .map(s => s.trim())
    .filter(s => {
      if (s.length < 8) return false;
      if (/^[A-Z0-9\s\-;:,\.'"]+$/.test(s)) return false; // all-caps headings
      for (const fn of extraFilters) {
        if (fn(s)) return false;
      }
      return true;
    });

  return { id, title, author, sentences };
}

const mobyDick = parseBook({
  file: 'moby-dick.txt',
  startMarker: 'Call me Ishmael.',
  endMarker: '*** END OF THE PROJECT GUTENBERG EBOOK MOBY DICK; OR, THE WHALE ***',
  id: 'moby-dick',
  title: 'Moby Dick',
  author: 'Herman Melville',
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
  endMarker: '*** END OF THE PROJECT GUTENBERG EBOOK DON QUIXOTE ***',
  id: 'don-quixote',
  title: 'Don Quixote',
  author: 'Miguel de Cervantes',
  extraFilters: [
    s => /^CHAPTER\s/i.test(s),           // chapter headings
    s => /Full Size/.test(s),              // image captions
    s => /\.jpg/.test(s),                  // image filenames
    s => /^CONTENTS/.test(s),
    s => /^INTRODUCTION/.test(s),
    s => /^PREFACE/.test(s),
    s => /^VOLUME\s/i.test(s),
  ],
});

const books = [mobyDick, donQuixote];

fs.writeFileSync('./book.json', JSON.stringify(books, null, 2));
books.forEach(b => console.log(`${b.title}: ${b.sentences.length} sentences`));
console.log('Done. Written to book.json.');
