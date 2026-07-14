function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Minimal markdown renderer: headers, bold, italic, links, paragraphs.
function renderMarkdown(md) {
  let html = md;

  html = escHtml(html);

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Paragraphs: wrap lines that aren't already a block tag
  html = html.replace(/^(?!<h[1-3]|<\/?[a-z])(.+)$/gm, '<p>$1</p>');

  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return { meta, body: match[2] };
}

function loadManifest() {
  return fetch('/blog/content-manifest.json').then(r => r.json());
}

// Home page: list sections
if (document.getElementById('section-list')) {
  const list = document.getElementById('section-list');
  loadManifest().then(({ sections }) => {
    if (sections.length === 0) {
      list.innerHTML = '<li id="loading">No sections yet.</li>';
      return;
    }
    list.innerHTML = sections.map(s => `
      <li class="section-item">
        <a href="/blog/section?s=${s.slug}">${s.name}</a>
      </li>
    `).join('');
  }).catch(() => {
    list.innerHTML = '<li id="loading">Failed to load sections.</li>';
  });
}

// Section page: list posts within a section
if (document.getElementById('post-list')) {
  const params = new URLSearchParams(location.search);
  const sectionSlug = params.get('s');
  const list = document.getElementById('post-list');

  loadManifest().then(({ sections }) => {
    const section = sections.find(s => s.slug === sectionSlug);
    if (!section) {
      list.innerHTML = '<li id="loading">Section not found.</li>';
      return;
    }
    document.title = section.name + ' - Blog';
    document.getElementById('section-title').textContent = section.name;
    list.innerHTML = section.posts.map(p => `
      <li class="post-item">
        <div class="post-date">${formatDate(p.date)}</div>
        <div class="post-title"><a href="/blog/post?s=${section.slug}&p=${p.slug}">${p.title}</a></div>
        <div class="post-description">${p.description}</div>
        <div class="post-author">${p.author}</div>
      </li>
    `).join('');
  }).catch(() => {
    list.innerHTML = '<li id="loading">Failed to load posts.</li>';
  });
}

// Post page
if (document.getElementById('post-container')) {
  const params = new URLSearchParams(location.search);
  const sectionSlug = params.get('s');
  const postSlug = params.get('p');

  loadManifest().then(({ sections }) => {
    const section = sections.find(s => s.slug === sectionSlug);
    const post = section && section.posts.find(p => p.slug === postSlug);

    if (!section || !post) {
      document.getElementById('loading').textContent = 'Post not found.';
      return;
    }

    document.title = post.title + ' - Blog';
    document.getElementById('section-nav').textContent = section.name;
    document.getElementById('section-nav').href = `/blog/section?s=${section.slug}`;

    return fetch(`/blog/content/${section.slug}/${post.slug}/index.md`)
      .then(r => r.text())
      .then(text => {
        const { body } = parseFrontmatter(text);
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = formatDate(post.date);
        document.getElementById('post-author').textContent = post.author;
        document.getElementById('post-body').innerHTML = renderMarkdown(body);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('post-container').style.display = 'block';
      });
  }).catch(() => {
    document.getElementById('loading').textContent = 'Failed to load post.';
  });
}
