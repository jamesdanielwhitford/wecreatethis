function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugToName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Tiny language-agnostic syntax highlighter, applied to already-escaped code.
// Comments, strings, numbers, and a shared keyword set. No dependencies.
const CODE_KEYWORDS = new Set((
  'const let var function return if else for while do break continue switch case ' +
  'default class extends new this super import export from async await try catch ' +
  'finally throw typeof instanceof in of delete void yield static get set ' +
  'def elif lambda pass raise with as global not and or is None True False ' +
  'fn mut impl struct enum match pub use mod trait type interface func go chan ' +
  'defer package range nil true false null undefined echo then fi esac done local'
).split(/\s+/));

function highlightCode(escaped) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(^[ \t]*#(?:$|[ !][^\n]*))|(&quot;|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[\da-fA-F]+|\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/gm;
  return escaped.replace(re, (m, comment, hashComment, str, num, word) => {
    if (comment || hashComment) return `<span class="tok-c">${m}</span>`;
    if (str) return `<span class="tok-s">${m}</span>`;
    if (num) return `<span class="tok-n">${m}</span>`;
    if (word && CODE_KEYWORDS.has(word)) return `<span class="tok-k">${m}</span>`;
    return m;
  });
}

// Extracted chunks are parked behind NUL-delimited placeholders while the
// rest of the text is transformed; NUL can never appear in real content.
function placeholder(kind, i) {
  return String.fromCharCode(0) + kind + i + String.fromCharCode(0);
}

// Minimal markdown renderer: headings, bold, italic, links, lists,
// blockquotes, fenced + inline code, paragraphs. No dependencies.
function renderMarkdown(md) {
  const blocks = [];
  const spans = [];

  // Pull fenced code blocks out of the raw text first so nothing inside
  // them gets treated as markdown.
  let html = md.replace(/^```[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm, (m, code) => {
    blocks.push(`<pre><code>${highlightCode(escHtml(code))}</code></pre>`);
    return placeholder('B', blocks.length - 1);
  });

  // Blockquotes: strip the "> " prefixes and render the inside recursively,
  // so quoted code fences, lists, and inline markdown all work.
  html = html.replace(/((?:^> ?.*\n?)+)/gm, block => {
    const inner = block.replace(/^> ?/gm, '');
    blocks.push(`<blockquote>${renderMarkdown(inner)}</blockquote>`);
    return placeholder('B', blocks.length - 1);
  });

  html = escHtml(html);

  // Inline code, pulled out before emphasis so `*` etc. inside stays literal.
  html = html.replace(/`([^`\n]+)`/g, (m, code) => {
    spans.push(`<code>${code}</code>`);
    return placeholder('S', spans.length - 1);
  });

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

  // Restore code blocks (dropping any <p> the paragraph pass wrapped them in)
  html = html.replace(/(?:<p>)?\u0000B(\d+)\u0000(?:<\/p>)?/g, (m, i) => blocks[Number(i)]);
  html = html.replace(/\u0000S(\d+)\u0000/g, (m, i) => spans[Number(i)]);

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

// Parses the section path from /blog/{section...} (nesting allowed).
// The post, if any, is in location.hash.
function parseBlogPath() {
  const parts = location.pathname.replace(/^\/blog\/?/, '').split('/').filter(Boolean);
  return {
    sectionPath: parts.join('/') || null,
    postSlug: location.hash ? location.hash.slice(1) : null,
  };
}

// Shared breadcrumb header: wecreatethis.com / blog / section / subsection.
// Every segment except the current page is a link.
function renderCrumbs(sectionPath) {
  const crumbs = document.getElementById('crumbs');
  const parts = [`<a href="/">wecreatethis.com</a>`];

  if (!sectionPath) {
    parts.push('<span aria-current="page">blog</span>');
  } else {
    parts.push('<a href="/blog/">blog</a>');
    const segments = sectionPath.split('/');
    segments.forEach((seg, i) => {
      const href = '/blog/' + segments.slice(0, i + 1).join('/');
      if (i === segments.length - 1) {
        parts.push(`<span aria-current="page">${escHtml(seg)}</span>`);
      } else {
        parts.push(`<a href="${href}">${escHtml(seg)}</a>`);
      }
    });
  }

  crumbs.innerHTML = parts.join(' / ');
}

// Home page: renders blog/content/home.md directly, hand-authored.
if (document.getElementById('home-content')) {
  renderCrumbs(null);
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
  const { sectionPath, postSlug } = parseBlogPath();
  renderCrumbs(sectionPath);

  loadManifest().then(({ sections }) => {
    const section = sections.find(s => s.path === sectionPath);
    const subsections = sections.filter(s => s.path.startsWith(sectionPath + '/'));

    if (!section && subsections.length === 0) {
      document.getElementById('loading').textContent = 'Section not found.';
      return;
    }

    const name = section ? section.name : slugToName(sectionPath.split('/').pop());
    document.title = name + ' - Blog';
    document.getElementById('section-title').textContent = name;

    // Sections nested below this path get listed as links above the posts.
    if (subsections.length > 0) {
      const list = document.getElementById('subsections');
      list.innerHTML = subsections.map(s =>
        `<li><a href="/blog/${s.path}">${escHtml(s.path.slice(sectionPath.length + 1))}</a></li>`
      ).join('');
      list.style.display = 'block';
    }

    document.getElementById('loading').style.display = 'none';

    if (!section) return;

    const stack = document.getElementById('post-stack');
    stack.innerHTML = section.posts.map(p => `
      <article class="post-entry" id="${p.slug}" data-slug="${p.slug}" data-loaded="false">
        <div class="post-meta">
          <h2>${escHtml(p.title)}</h2>
          <div class="meta-line">${formatDate(p.date)}${p.author ? ' by ' + escHtml(p.author) : ''}</div>
        </div>
        <div class="md-content post-placeholder">Loading…</div>
      </article>
    `).join('');

    stack.style.display = 'block';

    function loadEntry(entry) {
      if (entry.dataset.loaded === 'true') return;
      entry.dataset.loaded = 'true';
      const slug = entry.dataset.slug;
      fetch(`/blog/content/${section.path}/${slug}/index.md`)
        .then(r => r.text())
        .then(text => {
          const { body } = parseFrontmatter(text);
          const contentEl = entry.querySelector('.md-content');
          contentEl.classList.remove('post-placeholder');
          contentEl.innerHTML = renderMarkdown(body);
        })
        .catch(() => {
          entry.querySelector('.md-content').textContent = 'Failed to load post.';
        });
    }

    const entries = Array.from(stack.querySelectorAll('.post-entry'));

    // Lazy-load posts as they approach the viewport.
    const loadObserver = new IntersectionObserver((observed) => {
      observed.forEach(o => { if (o.isIntersecting) loadEntry(o.target); });
    }, { rootMargin: '600px 0px' });
    entries.forEach(entry => loadObserver.observe(entry));

    // Reading-order toggle: flips the stack between newest-first and
    // oldest-first. Only shown when there is more than one post.
    if (entries.length > 1) {
      const toggle = document.getElementById('sort-toggle');
      // Work out which way the manifest order runs from the post dates;
      // sections ordered by an explicit `order` field just get "reversed".
      const first = section.posts[0].date;
      const last = section.posts[section.posts.length - 1].date;
      let direction = first && last ? (first >= last ? 'newest' : 'oldest') : null;

      function label() {
        if (!direction) return 'Reverse order';
        return direction === 'newest' ? 'Reading: newest first' : 'Reading: oldest first';
      }

      toggle.textContent = label();
      toggle.style.display = 'inline-block';
      toggle.addEventListener('click', () => {
        entries.reverse();
        entries.forEach(e => stack.appendChild(e));
        if (direction) direction = direction === 'newest' ? 'oldest' : 'newest';
        toggle.textContent = label();
        window.scrollTo({ top: 0 });
      });
    }

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
