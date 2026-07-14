function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Minimal markdown renderer: headers, bold, italic, links, lists, paragraphs.
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

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

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

// Parses the section slug from /blog/{section}. The post, if any, is in location.hash.
function parseBlogPath() {
  const parts = location.pathname.replace(/^\/blog\/?/, '').split('/').filter(Boolean);
  return { sectionSlug: parts[0] || null, postSlug: location.hash ? location.hash.slice(1) : null };
}

// Home page: renders blog/content/home.md directly, hand-authored.
if (document.getElementById('home-content')) {
  const content = document.getElementById('home-content');
  fetch('/blog/content/home.md')
    .then(r => r.text())
    .then(text => {
      const { body } = parseFrontmatter(text);
      content.innerHTML = renderMarkdown(body);
      document.getElementById('loading').style.display = 'none';
      content.style.display = 'block';
    })
    .catch(() => {
      document.getElementById('loading').textContent = 'Failed to load home page.';
    });
}

// Section page: renders every post in the section as a scrollable stack,
// so scrolling past one post moves straight into the next/previous one.
// A #post-slug in the URL scrolls to that post on load; the URL does not
// follow the scroll afterwards.
if (document.getElementById('post-stack')) {
  const { sectionSlug, postSlug } = parseBlogPath();

  loadManifest().then(({ sections }) => {
    const section = sections.find(s => s.slug === sectionSlug);

    if (!section) {
      document.getElementById('loading').textContent = 'Section not found.';
      return;
    }

    document.title = section.name + ' - Blog';
    document.getElementById('section-nav').textContent = section.name;
    document.getElementById('section-title').textContent = section.name;

    const stack = document.getElementById('post-stack');
    stack.innerHTML = section.posts.map(p => `
      <article class="post-entry" id="${p.slug}" data-slug="${p.slug}" data-loaded="false">
        <div class="post-meta">
          <h2>${p.title}</h2>
          <div class="meta-line">${formatDate(p.date)} by ${p.author}</div>
        </div>
        <div class="post-content post-placeholder">Loading…</div>
      </article>
    `).join('');

    document.getElementById('loading').style.display = 'none';
    stack.style.display = 'block';

    function loadEntry(entry) {
      if (entry.dataset.loaded === 'true') return;
      entry.dataset.loaded = 'true';
      const slug = entry.dataset.slug;
      fetch(`/blog/content/${section.slug}/${slug}/index.md`)
        .then(r => r.text())
        .then(text => {
          const { body } = parseFrontmatter(text);
          const contentEl = entry.querySelector('.post-content');
          contentEl.classList.remove('post-placeholder');
          contentEl.innerHTML = renderMarkdown(body);
        })
        .catch(() => {
          entry.querySelector('.post-content').textContent = 'Failed to load post.';
        });
    }

    const entries = Array.from(stack.querySelectorAll('.post-entry'));

    // Lazy-load posts as they approach the viewport.
    const loadObserver = new IntersectionObserver((observed) => {
      observed.forEach(o => { if (o.isIntersecting) loadEntry(o.target); });
    }, { rootMargin: '600px 0px' });
    entries.forEach(entry => loadObserver.observe(entry));

    // Jump straight to the requested post (or the top) without an animated scroll.
    const target = postSlug && document.getElementById(postSlug);
    if (target) {
      loadEntry(target);
      target.scrollIntoView({ block: 'start' });
    } else if (entries[0]) {
      loadEntry(entries[0]);
    }
  }).catch(() => {
    document.getElementById('loading').textContent = 'Failed to load section.';
  });
}
