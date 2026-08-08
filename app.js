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

  // Normalize line endings first. Every block-level regex below is
  // line-anchored (`^`/`$` with `.` never matching newlines), and a
  // trailing \r would either get stuck inside a captured line or make
  // consecutive `.+\n?` list/quote lines fail to chain into one block.
  let html = md.replace(/\r\n?/g, '\n');

  // Link cards: a whole title + description wrapped in one <a>, for
  // homepage-style "the folder speaks for itself" listings, where the
  // reader clicks anywhere in the block rather than just underlined text.
  // Written as a fenced block (```link:/some/url) so a URL can ride on the
  // opening line without any new inline syntax: first line inside is the
  // title, the rest is the description. Extracted first, on raw text, same
  // as fenced code/blockquotes below - otherwise the generic fenced-code
  // pass right after this would swallow ```link:... as a plain code block
  // before this regex ever saw it.
  html = html.replace(/^ {0,3}```link:(\S+)[ \t]*\n(.+)\n([\s\S]*?)\n {0,3}```[ \t]*$/gm,
    (m, href, title, desc) => {
      const inlineRaw = text => escHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      blocks.push(
        `<a class="link-card" href="${escHtml(href)}">` +
        `<span class="link-card-title">${inlineRaw(title)}</span>` +
        `<span class="link-card-desc">${inlineRaw(desc.replace(/\n/g, ' '))}</span>` +
        `</a>`
      );
      return placeholder('B', blocks.length - 1);
    }
  );

  // Pull fenced code blocks out of the raw text first so nothing inside
  // them gets treated as markdown. Up to 3 leading spaces are tolerated
  // before the marker, matching how far a heading/list/quote can be
  // indented before it's read as an indented code block instead.
  html = html.replace(/^ {0,3}```[^\n]*\n([\s\S]*?)\n {0,3}```[ \t]*$/gm, (m, code) => {
    blocks.push(`<pre><code>${highlightCode(escHtml(code))}</code></pre>`);
    return placeholder('B', blocks.length - 1);
  });

  // Blockquotes: strip the "> " prefixes and render the inside recursively,
  // so quoted code fences, lists, and inline markdown all work.
  html = html.replace(/((?:^ {0,3}> ?.*\n?)+)/gm, block => {
    const inner = block.replace(/^ {0,3}> ?/gm, '');
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
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
        // Internal links are always relative (/some-path) or an in-page
        // fragment (#heading); only http(s) links leave the site, so only
        // those get target="_blank". rel="noopener" is mandatory whenever
        // target="_blank" is used, so a malicious external page can't
        // reach back into this tab via window.opener.
        const external = /^https?:\/\//i.test(href);
        const attrs = external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${href}"${attrs}>${label}</a>`;
      });
  }

  // Tables: a header row, a |---|---| separator, then body rows. Pulled out
  // as whole blocks before the line-level passes so the pipes never leak.
  html = html.replace(
    /^ {0,3}\|(.+)\|[ \t]*\n {0,3}\|[ \t]*:?-{1,}:?[ \t]*(?:\|[ \t]*:?-{1,}:?[ \t]*)*\|[ \t]*\n((?:[ ]{0,3}\|.*\|[ \t]*\n?)*)/gm,
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

  // Headings, with anchor ids so in-page links work. Up to 3 leading
  // spaces are tolerated, same as lists/quotes/fences above.
  html = html.replace(/^ {0,3}### (.+)$/gm, (m, t) => headingTag(3, inline(t)));
  html = html.replace(/^ {0,3}## (.+)$/gm, (m, t) => headingTag(2, inline(t)));
  html = html.replace(/^ {0,3}# (.+)$/gm, (m, t) => headingTag(1, inline(t)));

  // Bold, italic, images, links
  html = inline(html);

  // Unordered lists. Accepts -, *, or + as the bullet, and up to 3 leading
  // spaces (a common shape from editor auto-indent or a pasted sub-item).
  // There's no true nesting: an indented item is flattened into the same
  // <ul> as its parent rather than a nested one, which is a smaller gap
  // than the previous behaviour of leaking the indented line as raw,
  // unwrapped text outside every tag.
  html = html.replace(/((?:^ {0,3}[-*+] .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^ {0,3}[-*+] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^ {0,3}\d+\. .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^ {0,3}\d+\. /, '')}</li>`).join('');
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
  return fetch('/content-manifest.json').then(r => r.json());
}

// Splits /{section...}/{post-slug} into its section and post parts. Every
// folder and every post is its own route, so this has to check the manifest
// to know whether the last path segment is a post slug or another section
// level: /a/b could be section "a" + post "b", or section "a/b" with no
// post selected.
function parseBlogPath(sections) {
  const parts = location.pathname.replace(/^\//, '').split('/').filter(Boolean);
  const fullPath = parts.join('/') || null;

  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    const slug = parts[parts.length - 1];
    const parent = sections.find(s => s.path === parentPath);
    if (parent && parent.posts.some(p => p.slug === slug)) {
      return { sectionPath: parentPath, postSlug: slug };
    }
  }

  return { sectionPath: fullPath, postSlug: null };
}

const SITE_OWNER_NAME = 'James Daniel Whitford';
const SITE_OWNER_EMAIL = 'james@wecreatethis.com';
const SITE_OWNER_GITHUB = 'jamesdanielwhitford';

// Bio modal: same on every page (home, section, post). Built once and
// appended to <body> lazily on first open.
function ensureBioModal() {
  let modal = document.getElementById('bio-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'bio-modal';
  modal.className = 'modal-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="bio-modal-title">
      <div class="top-nav">
        <span class="nav-slot nav-left" aria-hidden="true"></span>
        <span class="nav-slot nav-center"></span>
        <span class="nav-slot nav-right">
          <button type="button" class="modal-close" aria-label="Close">${Icons.svg('x')}</button>
        </span>
      </div>
      <div class="bio-avatar">${escHtml(initials(SITE_OWNER_NAME))}</div>
      <h2 id="bio-modal-title">${escHtml(SITE_OWNER_NAME)}</h2>
      <p class="bio-text">Writing on development tools, side projects, and whatever else is worth a post.</p>
      <div class="bio-links">
        <a class="bio-link" href="mailto:${SITE_OWNER_EMAIL}">${Icons.svg('mail')} ${SITE_OWNER_EMAIL}</a>
        <a class="bio-link" href="https://github.com/${SITE_OWNER_GITHUB}" target="_blank" rel="noopener">${Icons.svg('github')} github.com/${SITE_OWNER_GITHUB}</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { modal.hidden = true; };
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('.modal-close').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  return modal;
}

function openBioModal() {
  ensureBioModal().hidden = false;
}

function profileButtonHtml() {
  return `<button type="button" id="profile-btn" class="circle-btn" aria-label="About ${escHtml(SITE_OWNER_NAME)}">${escHtml(initials(SITE_OWNER_NAME))}</button>`;
}

// Home page header: left spacer (reserved, empty), centered wordmark,
// right profile circle.
function renderHomeHeader() {
  const nav = document.getElementById('crumbs');
  nav.className = 'top-nav';
  nav.innerHTML = `
    <span class="nav-slot nav-left" aria-hidden="true"></span>
    <span class="nav-slot nav-center"><span class="nav-wordmark">wecreatethis.com</span></span>
    <span class="nav-slot nav-right">${profileButtonHtml()}</span>
  `;
  nav.querySelector('#profile-btn').addEventListener('click', openBioModal);
}

// Section/folder page header: back arrow to the parent directory (or home
// at the top level), centered folder title, right profile circle.
function renderSectionHeader(sectionPath, title) {
  const nav = document.getElementById('crumbs');
  nav.className = 'top-nav';
  const segments = sectionPath.split('/');
  const parentHref = segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : '/';

  nav.innerHTML = `
    <span class="nav-slot nav-left">
      <a href="${parentHref}" class="circle-btn" aria-label="Back">${Icons.svg('arrowLeft')}</a>
    </span>
    <span class="nav-slot nav-center"><span class="nav-wordmark">${escHtml(title)}</span></span>
    <span class="nav-slot nav-right">${profileButtonHtml()}</span>
  `;
  nav.querySelector('#profile-btn').addEventListener('click', openBioModal);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', location.pathname);
}

// Post page top nav: back to the section on the left, table-of-contents
// modal on the right. The center slot holds the post title, hidden while
// the article's own H1 is on screen and shown once it scrolls past (see
// setupPostTitleReveal) - clicking it scrolls back to top.
function renderPostHeader(sectionPath, post, headings) {
  const nav = document.getElementById('crumbs');
  nav.className = 'top-nav';
  const backHref = '/' + sectionPath;

  nav.innerHTML = `
    <span class="nav-slot nav-left">
      <a href="${backHref}" class="circle-btn" aria-label="Back">${Icons.svg('arrowLeft')}</a>
    </span>
    <span class="nav-slot nav-center">
      <button type="button" id="post-title-btn" class="nav-wordmark nav-title-btn" hidden>${escHtml(post.title)}</button>
    </span>
    <span class="nav-slot nav-right">
      <button type="button" id="toc-btn" class="circle-btn" aria-label="Table of contents">${Icons.svg('list')}</button>
    </span>
  `;
  nav.querySelector('#post-title-btn').addEventListener('click', scrollToTop);

  const modal = document.createElement('div');
  modal.id = 'toc-modal';
  modal.className = 'modal-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="toc-modal-title">
      <div class="top-nav">
        <span class="nav-slot nav-left" aria-hidden="true"></span>
        <span class="nav-slot nav-center"></span>
        <span class="nav-slot nav-right">
          <button type="button" class="modal-close" aria-label="Close">${Icons.svg('x')}</button>
        </span>
      </div>
      <h2 id="toc-modal-title"><a href="#top" class="toc-top-link">${escHtml(post.title)}</a></h2>
      ${headings.length ? `
        <ul class="toc-links">
          ${headings.map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { modal.hidden = true; };
  const open = () => { modal.hidden = false; };
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.toc-top-link').addEventListener('click', e => {
    e.preventDefault();
    close();
    scrollToTop();
  });
  modal.querySelectorAll('.toc-links a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
  nav.querySelector('#toc-btn').addEventListener('click', open);
}

// Shows the post title in the top nav's center slot once the article's own
// H1 has scrolled out of view above the header, hides it while the H1 is
// still visible (avoids showing the same title twice on screen at once).
function setupPostTitleReveal() {
  const titleEl = document.getElementById('section-title');
  const btn = document.getElementById('post-title-btn');
  const header = document.querySelector('header');
  if (!titleEl || !btn) return;

  const observer = new IntersectionObserver(([entry]) => {
    btn.hidden = entry.isIntersecting;
  }, { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` });

  observer.observe(titleEl);
}

// Bottom nav on post pages: previous/next post within the same section,
// ordered exactly as the manifest (already sorted by build.js).
function renderPostBottomNav(section, currentSlug) {
  const bar = document.getElementById('bottom-nav');
  if (!bar) return;
  const idx = section.posts.findIndex(p => p.slug === currentSlug);
  const prev = idx > 0 ? section.posts[idx - 1] : null;
  const next = idx < section.posts.length - 1 ? section.posts[idx + 1] : null;

  bar.innerHTML = `
    <span class="nav-slot nav-left">
      ${prev ? `<a href="/${section.path}/${prev.slug}" class="circle-btn" aria-label="Previous: ${escHtml(prev.title)}">${Icons.svg('chevronLeft')}</a>` : ''}
    </span>
    <span class="nav-slot nav-center"></span>
    <span class="nav-slot nav-right">
      ${next ? `<a href="/${section.path}/${next.slug}" class="circle-btn" aria-label="Next: ${escHtml(next.title)}">${Icons.svg('chevronRight')}</a>` : ''}
    </span>
  `;
  bar.hidden = false;
}

// Post pages only: top and bottom nav fade out on scroll-down, reappear
// instantly on scroll-up, and reappear once the page is scrolled to the
// very bottom (so the nav is never permanently hidden after the last
// upward scroll gesture on a short viewport).
function setupPostScrollFade() {
  const header = document.querySelector('header');
  const bottomNav = document.getElementById('bottom-nav');
  if (!header || !bottomNav) return;

  let lastY = window.scrollY;

  const setVisible = visible => {
    header.classList.toggle('nav-hidden', !visible);
    bottomNav.classList.toggle('nav-hidden', !visible);
  };

  // Rubber-band overscroll at the top fires a jittery, non-monotonic run of
  // scroll events settling back to 0 (e.g. 3 -> 1 -> 2 -> 0), so a small
  // top zone is treated as "at top" throughout rather than comparing each
  // event to the last - otherwise the tiny upward jitter within the bounce
  // reads as a downward scroll and hides the nav right when the page is
  // at rest at the top.
  const TOP_ZONE = 24;

  window.addEventListener('scroll', () => {
    const y = Math.max(0, window.scrollY);
    const atTop = y <= TOP_ZONE;
    const atBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 1;

    if (atTop || atBottom || y <= lastY) {
      setVisible(true);
    } else if (y > lastY) {
      setVisible(false);
    }

    lastY = y;
  }, { passive: true });
}

// Home page: renders content/home.md directly, hand-authored.
if (document.getElementById('home-content')) {
  renderHomeHeader();
  const content = document.getElementById('home-content');
  fetch('/content/home.md')
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

// Section page: lists the posts (and any nested sections) at this path.
// Post page: renders exactly one post, standalone. Every folder and every
// post is its own route (/{section...}/{post-slug}); there is no
// multi-post stack, so nothing here loads or scrolls to another post.
if (document.getElementById('post-stack')) {
  loadManifest().then(({ sections }) => {
    const { sectionPath, postSlug } = parseBlogPath(sections);

    const section = sections.find(s => s.path === sectionPath);
    const subsections = sectionPath
      ? sections.filter(s => s.path.startsWith(sectionPath + '/'))
      : [];

    if (!section && subsections.length === 0) {
      document.getElementById('loading').textContent = 'Section not found.';
      return;
    }

    const stack = document.getElementById('post-stack');
    document.getElementById('loading').style.display = 'none';

    // Post page: render the single requested post and stop.
    if (postSlug) {
      const post = section.posts.find(p => p.slug === postSlug);
      document.title = post.title + ' - wecreatethis.com';
      document.getElementById('section-title').textContent = post.title;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && post.description) metaDesc.setAttribute('content', post.description);

      stack.className = 'post-single';
      stack.innerHTML = `
        <article class="post-entry is-revealed">
          <div class="post-meta">
            <div class="meta-line">${formatDate(post.date)}${post.author ? ' by ' + escHtml(post.author) : ''}</div>
          </div>
          <div class="md-content"></div>
        </article>
      `;
      stack.style.display = 'block';

      fetch(`/content/${section.path}/${postSlug}/index.md`)
        .then(r => r.text())
        .then(text => {
          const { body } = parseFrontmatter(text);
          const content = stack.querySelector('.md-content');
          content.innerHTML = renderMarkdown(
            stripLeadingTitle(body, post.title),
            post.images
          );

          const headings = Array.from(content.querySelectorAll('h2'))
            .filter(h => h.id)
            .map(h => ({ id: h.id, text: h.textContent }));
          renderPostHeader(section.path, post, headings);
          renderPostBottomNav(section, postSlug);
          setupPostScrollFade();
          setupPostTitleReveal();
        })
        .catch(() => {
          stack.querySelector('.md-content').textContent = 'Failed to load post.';
          renderPostHeader(section.path, post, []);
        });
      return;
    }

    // Section page: table of contents for this section's own posts, plus
    // links to any nested sections.
    const name = section ? section.name : slugToName(sectionPath.split('/').pop());
    document.title = name + ' - wecreatethis.com';
    document.getElementById('section-title').textContent = name;
    renderSectionHeader(sectionPath, name);

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
        `<li><a href="/${s.path}">${escHtml(s.path.slice(sectionPath.length + 1))}</a></li>`
      ).join('');
      list.style.display = 'block';
    }

    if (!section) return;

    stack.className = 'post-toc';
    stack.innerHTML = `<ul>` + section.posts.map(p => `
      <li class="toc-item">
        <div class="toc-date">${formatDate(p.date)}</div>
        <div class="toc-title"><a href="/${section.path}/${p.slug}">${escHtml(p.title)}</a></div>
        ${p.description ? `<div class="toc-description">${escHtml(p.description)}</div>` : ''}
      </li>
    `).join('') + `</ul>`;
    stack.style.display = 'block';
  }).catch(() => {
    document.getElementById('loading').textContent = 'Failed to load section.';
  });
}
