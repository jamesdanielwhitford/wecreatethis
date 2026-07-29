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
  // `(?<!:)` keeps URLs (https://...) from being swallowed by the // comment rule.
  const re = /((?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(^[ \t]*#(?:$|[ !][^\n]*))|(&quot;|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[\da-fA-F]+|\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/gm;
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

// Heading anchors are prefixed so they can never collide with a post slug,
// which shares the same URL fragment (see parseBlogPath).
const HEADING_ID_PREFIX = 'h-';

function headingId(text) {
  const slug = text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug ? HEADING_ID_PREFIX + slug : '';
}

function headingTag(level, text) {
  const id = headingId(text);
  return `<h${level}${id ? ` id="${id}"` : ''}>${text}</h${level}>`;
}

// Minimal markdown renderer: headings, bold, italic, links, lists,
// blockquotes, fenced + inline code, paragraphs. No dependencies.
// `imageSizes` maps an image src to its intrinsic {width, height} (from the
// manifest, measured at build time); passing it lets images reserve the
// right space before they load instead of shifting the page.
function renderMarkdown(md, imageSizes) {
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
    blocks.push(`<blockquote>${renderMarkdown(inner, imageSizes)}</blockquote>`);
    return placeholder('B', blocks.length - 1);
  });

  html = escHtml(html);

  // Inline code, pulled out before emphasis so `*` etc. inside stays literal.
  html = html.replace(/`([^`\n]+)`/g, (m, code) => {
    spans.push(`<code>${code}</code>`);
    return placeholder('S', spans.length - 1);
  });

  // Inline transforms, applied to a single line of already-escaped text.
  // Shared by paragraphs, list items, and table cells.
  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => {
        const size = imageSizes && imageSizes[src];
        const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
        return `<img src="${src}" alt="${alt}"${dims} loading="lazy" decoding="async">`;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  }

  // Tables: a header row, a |---|---| separator, then body rows. Pulled out
  // as whole blocks before the line-level passes so the pipes never leak.
  html = html.replace(
    /^\|(.+)\|[ \t]*\n\|[ \t]*:?-{1,}:?[ \t]*(?:\|[ \t]*:?-{1,}:?[ \t]*)*\|[ \t]*\n((?:\|.*\|[ \t]*\n?)*)/gm,
    (m, headerRow, bodyRows) => {
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const head = cells(headerRow).map(c => `<th>${c}</th>`).join('');
      const body = bodyRows.trim().split('\n').filter(Boolean).map(row =>
        `<tr>${cells(row).map(c => `<td>${c}</td>`).join('')}</tr>`
      ).join('');
      blocks.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      return placeholder('B', blocks.length - 1) + '\n';
    }
  );

  // Headings, with anchor ids so in-page links work.
  html = html.replace(/^### (.+)$/gm, (m, t) => headingTag(3, inline(t)));
  html = html.replace(/^## (.+)$/gm, (m, t) => headingTag(2, inline(t)));
  html = html.replace(/^# (.+)$/gm, (m, t) => headingTag(1, inline(t)));

  // Bold, italic, images, links
  html = inline(html);

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs: wrap any line that isn't already a block-level element.
  // Only real block tags are skipped, inline tags (<strong>, <em>, <a>,
  // <code>) must still be wrapped, so a line starting with bold text
  // still becomes its own paragraph.
  html = html.replace(
    /^(?!<h[1-3]|<ul|<\/ul|<ol|<\/ol|<li|<\/li|<blockquote|<\/blockquote|<pre|<\/pre|<table|<\/table|\u0000B)(.+)$/gm,
    '<p>$1</p>'
  );

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

// Posts normally repeat their frontmatter title as a leading `# H1`. The
// stack already renders the title from the manifest, so drop the duplicate.
function stripLeadingTitle(body, title) {
  if (!title) return body;
  const norm = s => s.trim().toLowerCase();
  return body.replace(/^\s*# (.+)(?:\n|$)/, (m, heading) =>
    norm(heading) === norm(title) ? '' : m
  );
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

    // Fill the meta description from the section's own posts. Client-side,
    // so crawlers that don't run JS still only see the static fallback,
    // but it keeps the tag accurate for those that do.
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && section && section.posts.length) {
      const first = section.posts.find(p => p.description);
      metaDesc.setAttribute('content', first
        ? first.description
        : `${section.posts.length} post${section.posts.length === 1 ? '' : 's'} in ${name}.`);
    }

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
    // Posts after the first reserve a rough height inline, so the space
    // exists in the very first paint. Setting it from JS afterwards is too
    // late: the stack has already been laid out, and the post growing into
    // place shifts everything below it.
    stack.innerHTML = section.posts.map((p, i) => `
      <article class="post-entry" id="${p.slug}" data-slug="${p.slug}" data-title="${escHtml(p.title).replace(/"/g, '&quot;')}" data-loaded="false">
        <div class="post-meta">
          <h2>${escHtml(p.title)}</h2>
          <div class="meta-line">${formatDate(p.date)}${p.author ? ' by ' + escHtml(p.author) : ''}</div>
        </div>
        <div class="md-content post-placeholder"${i === 0 ? '' : ' style="min-height:70vh"'}></div>
      </article>
    `).join('');

    stack.style.display = 'block';

    function loadEntry(entry) {
      if (entry.dataset.loaded === 'true') return Promise.resolve();
      entry.dataset.loaded = 'true';
      const slug = entry.dataset.slug;
      const title = entry.dataset.title || '';
      const post = section.posts.find(p => p.slug === slug);
      return fetch(`/blog/content/${section.path}/${slug}/index.md`)
        .then(r => r.text())
        .then(text => {
          const { body } = parseFrontmatter(text);
          const contentEl = entry.querySelector('.md-content');
          contentEl.classList.remove('post-placeholder');
          contentEl.innerHTML = renderMarkdown(
            stripLeadingTitle(body, title),
            post && post.images
          );
          // Drop the reserved height now the real content sets it.
          contentEl.style.minHeight = '';
        })
        .catch(() => {
          entry.querySelector('.md-content').textContent = 'Failed to load post.';
        });
    }

    const entries = Array.from(stack.querySelectorAll('.post-entry'));

    // Only the posts below the first one need reserving: the first renders
    // before anything is on screen, but a later post growing from nothing
    // pushes every sibling under it down, which is a layout shift the size
    // of the post. Reserving a rough height caps that movement to the
    // difference between the estimate and the real height. Cleared as soon
    // as the post renders.
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

    // Jump to a fragment: either a post slug (an article in the stack) or a
    // heading anchor inside a post (prefixed `h-`, see headingId).
    // Posts above the target are loaded first, otherwise they expand from
    // short placeholders to full content after the scroll and push the
    // target out of view.
    function goToFragment(fragment, smooth) {
      if (!fragment) return Promise.resolve(false);

      const post = document.getElementById(fragment);
      if (post && post.classList.contains('post-entry')) {
        const above = entries.slice(0, entries.indexOf(post));
        return Promise.all(above.concat(post).map(loadEntry)).then(() => {
          post.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
          return true;
        });
      }

      // Heading anchors only exist once their post is rendered, so load
      // everything, then look again. Bare anchors (`#some-heading`, as
      // written by hand in a post's own table of contents) also resolve
      // against the prefixed id.
      return Promise.all(entries.map(loadEntry)).then(() => {
        const heading = document.getElementById(fragment) ||
          document.getElementById(HEADING_ID_PREFIX + fragment);
        if (!heading) return false;
        heading.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
        return true;
      });
    }

    if (postSlug) {
      // Deep link: the stack is still all placeholders, so keep it hidden
      // until the posts above the target have their real height. Revealing
      // and scrolling in one go avoids a large layout shift.
      stack.style.visibility = 'hidden';
      goToFragment(postSlug, false).finally(() => {
        stack.style.visibility = '';
      });
    } else if (entries[0]) {
      loadEntry(entries[0]);
    }

    // In-page fragment links (a post's own table of contents) don't reload
    // the page, so handle them here too.
    window.addEventListener('hashchange', () => {
      const fragment = location.hash ? location.hash.slice(1) : null;
      goToFragment(fragment, true);
    });
  }).catch(() => {
    document.getElementById('loading').textContent = 'Failed to load section.';
  });
}
