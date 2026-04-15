// Run with: node parse-book.js
// Reads books/moby-dick.txt and writes book.json

const fs = require('fs');

const raw = fs.readFileSync('./books/moby-dick.txt', 'utf8');

// Strip Project Gutenberg header/footer and front matter, start at Chapter 1
const startMarker = 'Call me Ishmael.';
const endMarker   = '*** END OF THE PROJECT GUTENBERG EBOOK MOBY DICK; OR, THE WHALE ***';

let text = raw;
const startIdx = text.indexOf(startMarker);
if (startIdx !== -1) text = text.slice(startIdx);
const endIdx = text.indexOf(endMarker);
if (endIdx !== -1) text = text.slice(0, endIdx);

// Collapse whitespace and normalize line breaks
text = text
  .replace(/\r\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')  // max double newline
  .replace(/\n/g, ' ')          // collapse single newlines into spaces
  .replace(/\s+/g, ' ')         // collapse multiple spaces
  .trim();

// Split into sentences using punctuation boundaries
// Handles ., !, ? followed by space and capital letter or end of string
const raw_sentences = text.match(/[^.!?]+[.!?]+["']?/g) || [];

const sentences = raw_sentences
  .map(s => s.trim())
  .filter(s => {
    if (s.length < 8) return false;                     // skip short fragments/headings
    if (/^CHAPTER\s/i.test(s)) return false;            // skip chapter headings
    if (/^[A-Z0-9\s\-;:,\.'"]+$/.test(s)) return false; // skip all-caps lines (headings)
    if (/^By [A-Z]/.test(s)) return false;              // skip byline
    if (/CONTENTS/.test(s)) return false;               // skip contents
    if (/ETYMOLOGY/.test(s)) return false;              // skip etymology header
    if (/EXTRACTS/.test(s)) return false;               // skip extracts header
    return true;
  });

const books = [
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    sentences
  }
];

fs.writeFileSync('./book.json', JSON.stringify(books, null, 2));
console.log(`Done. ${sentences.length} sentences written to book.json.`);
