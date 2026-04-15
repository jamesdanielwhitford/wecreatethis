async function init() {
  const res = await fetch('/slowread/book.json');
  const books = await res.json();

  const list = document.getElementById('bookList');

  books.forEach(book => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/slowread/reader?id=${book.id}`;

    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title;

    const author = document.createElement('div');
    author.className = 'book-author';
    author.textContent = book.author;

    a.appendChild(title);
    a.appendChild(author);
    li.appendChild(a);
    list.appendChild(li);
  });
}

init();
