function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
// which shares the same URL fragment (see parseRoute).
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

// Every post is served flat as /{slug} - no section segment, so there's no
// ambiguity left to resolve against the manifest. Zero path segments is the
// home page; one segment is a post slug; anything else is a stale/unknown
// URL (a real multi-segment path should have been caught by a 301 in
// _redirects before app.js ever runs).
function parseRoute() {
  const parts = location.pathname.replace(/^\//, '').split('/').filter(Boolean);
  if (parts.length === 0) return { postSlug: null };
  if (parts.length === 1) return { postSlug: parts[0] };
  return { postSlug: null, notFound: true };
}

const SITE_OWNER_NAME = 'James Daniel Whitford';
const SITE_OWNER_EMAIL = 'james@wecreatethis.com';
const SITE_OWNER_GITHUB = 'jamesdanielwhitford';
const SITE_OWNER_CITY = 'Pretoria';
const SITE_OWNER_COUNTRY = 'South Africa';
// South Africa has one timezone, no DST, so the city label above is purely
// cosmetic - the IANA zone is what actually drives the time/offset, and
// Africa/Johannesburg is correct for the whole country regardless of city.
const SITE_OWNER_TZ = 'Africa/Johannesburg';

// "21:31, Pretoria, South Africa (GMT+2)" - internationally recognisable
// order (time, city, country, offset). Intl derives the live time and the
// numeric UTC offset from the IANA zone; only the city/country labels are
// hand-written, since a timezone has no city name of its own.
function formatLocationTime() {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_OWNER_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  // "shortOffset" gives e.g. "GMT+2"; extract it from formatToParts rather
  // than string-slicing a full formatted date, so it's independent of
  // locale word order.
  const offsetPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_OWNER_TZ,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName');
  const offset = offsetPart ? offsetPart.value : '';

  return `${time}, ${SITE_OWNER_CITY}, ${SITE_OWNER_COUNTRY}${offset ? ` (${offset})` : ''}`;
}

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
        <span class="nav-slot nav-center"><span class="nav-wordmark" id="bio-modal-title">${escHtml(SITE_OWNER_NAME)}</span></span>
        <span class="nav-slot nav-right">
          <button type="button" class="modal-close" aria-label="Close">${Icons.svg('x')}</button>
        </span>
      </div>
      <img class="bio-photo" src="/profile.jpeg" alt="${escHtml(SITE_OWNER_NAME)} photographing a mountain landscape" width="800" height="600" loading="lazy" decoding="async">
      <div class="bio-links">
        <span class="bio-link">${Globes.emoji('africaEurope')} <span id="bio-location-time">${escHtml(formatLocationTime())}</span></span>
        <a class="bio-link" href="mailto:${SITE_OWNER_EMAIL}">${Icons.svg('mail')} ${SITE_OWNER_EMAIL}</a>
        <a class="bio-link" href="https://github.com/${SITE_OWNER_GITHUB}" target="_blank" rel="noopener">${Icons.svg('github')} github.com/${SITE_OWNER_GITHUB}</a>
        <a class="bio-link" href="/cv">${Icons.svg('briefcase')} wecreatethis.com/cv</a>
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

  // Keep the location time live while the modal is open. One shared
  // interval (not re-created per open) is fine at this scale - it just
  // re-renders a single text node every 30s, negligible cost even left
  // running for a whole session.
  const timeEl = modal.querySelector('#bio-location-time');
  setInterval(() => {
    if (!modal.hidden) timeEl.textContent = formatLocationTime();
  }, 30000);

  return modal;
}

function openBioModal() {
  const modal = ensureBioModal();
  const timeEl = modal.querySelector('#bio-location-time');
  if (timeEl) timeEl.textContent = formatLocationTime();
  modal.hidden = false;
}

function profileButtonHtml() {
  return `<button type="button" id="profile-btn" class="circle-btn" aria-label="About ${escHtml(SITE_OWNER_NAME)}">${Icons.svg('user')}</button>`;
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

// Preserves the query string (e.g. an active homepage ?tag= filter) -
// history.replaceState(null, '', location.pathname) would silently drop it.
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
}

// Post page top nav: back to the homepage (or, if this post belongs to a
// project, back to that project's filtered view - so following a project
// post from its collapsed ?tag= list and hitting Back lands you where you
// were, not the unfiltered homepage) on the left, table-of-contents modal
// on the right. The center slot holds the post title, hidden while the
// article's own H1 is on screen and shown once it scrolls past (see
// setupPostTitleReveal) - clicking it scrolls back to top.
//
// Deliberately a plain href (not history.back()): a post can be reached by
// direct link, refresh, or a new tab with no usable history, and the tag
// filter is fully described by the URL already - reconstructing it here is
// correct in every case, where history.back() would only be correct for
// the one path of clicking through from the homepage in the same tab.
function renderPostHeader(post, headings) {
  const nav = document.getElementById('crumbs');
  nav.className = 'top-nav';
  const projectTag = post.tags && post.tags[0];
  const backHref = projectTag ? `/?tag=${encodeURIComponent(projectTag)}` : '/';

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
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="toc-modal-heading">
      <div class="top-nav">
        <span class="nav-slot nav-left" aria-hidden="true"></span>
        <span class="nav-slot nav-center"><span class="nav-wordmark" id="toc-modal-heading">Table of Contents</span></span>
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

// Bottom nav on post pages: previous/next post within the same project
// (the post's own tag - the only tags left in the system are the 5 project
// tags from homepage.json, so a post's tag *is* its project), ordered
// exactly as the manifest (already sorted by build.js). A post with no tag
// doesn't belong to a project, so there's no group to page within - the
// bar stays hidden rather than falling back to a global/unscoped order.
function renderPostBottomNav(posts, currentSlug, currentTags) {
  const bar = document.getElementById('bottom-nav');
  if (!bar) return;
  const projectTag = currentTags && currentTags[0];
  if (!projectTag) { bar.hidden = true; return; }

  const projectPosts = posts.filter(p => p.tags.includes(projectTag));
  const idx = projectPosts.findIndex(p => p.slug === currentSlug);
  const prev = idx > 0 ? projectPosts[idx - 1] : null;
  const next = idx < projectPosts.length - 1 ? projectPosts[idx + 1] : null;

  if (!prev && !next) { bar.hidden = true; return; }

  bar.innerHTML = `
    <span class="nav-slot nav-left">
      ${prev ? `<a href="/${prev.slug}" class="circle-btn" aria-label="Previous: ${escHtml(prev.title)}">${Icons.svg('chevronLeft')}</a>` : ''}
    </span>
    <span class="nav-slot nav-center"></span>
    <span class="nav-slot nav-right">
      ${next ? `<a href="/${next.slug}" class="circle-btn" aria-label="Next: ${escHtml(next.title)}">${Icons.svg('chevronRight')}</a>` : ''}
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

// #loading starts hidden (see style.css) so a fast/cached navigation never
// paints it at all. Call this once per page load, right before the fetch it
// covers; only shows the text if that fetch is still pending after
// LOADING_DELAY_MS, so a slow/offline load still gets feedback. `done()`
// cancels the pending reveal (fast path) or hides the now-visible text
// (slow path) - safe to call exactly once, from either the success or the
// error branch.
const LOADING_DELAY_MS = 200;
function deferredLoading() {
  const el = document.getElementById('loading');
  const timer = setTimeout(() => { el.style.display = 'block'; }, LOADING_DELAY_MS);
  return {
    done() {
      clearTimeout(timer);
      el.style.display = 'none';
    },
    fail(message) {
      clearTimeout(timer);
      el.textContent = message;
      el.style.display = 'block';
    }
  };
}

// Renders the post list (optionally filtered to one tag) into the
// homepage's #post-list, reusing the same .post-toc/.toc-item markup the
// old section page used - already styled, and reused here so a flat list
// of every post looks exactly like the old per-section list did.
function renderPostList(posts, activeTag) {
  const list = document.getElementById('post-list');
  const headingRow = document.getElementById('posts-heading-row');
  const visible = activeTag ? posts.filter(p => p.tags.includes(activeTag)) : posts;
  list.hidden = false;
  headingRow.hidden = false;

  if (visible.length === 0) {
    list.innerHTML = `
      <p class="empty-state">No posts tagged "${escHtml(activeTag)}".
        <button type="button" class="clear-filter-link">Clear filter</button>
      </p>
    `;
    list.querySelector('.clear-filter-link').addEventListener('click', () => setActiveTag(null));
    return;
  }

  list.innerHTML = `<ul>` + visible.map(p => `
    <li class="toc-item">
      <div class="toc-date">${formatDate(p.date)}</div>
      <div class="toc-title"><a href="/${p.slug}">${escHtml(p.title)}</a></div>
      ${p.description ? `<div class="toc-description">${escHtml(p.description)}</div>` : ''}
    </li>
  `).join('') + `</ul>`;
}

// Featured project list (from homepage.json via the manifest) - a curated
// set. Styled exactly like the old markdown-rendered homepage's .link-card
// blocks (a real <h2> plus title/description buttons inside .md-content) so
// this reads as ordinary page prose rather than a separate UI widget.
// Normally grouped into per-section sub-headings (Agentic Engineering, App
// Development, Modding, ...) in homepage.json's own array order - each
// project carries a `section` field, and section order follows first
// appearance rather than being sorted, so homepage.json is the single place
// that controls both grouping and order.
//
// When the active tag matches one of these projects, the list collapses to
// just that project (no section headings, no siblings) plus a back control
// to restore the full grouped list - selecting a project "zooms in" rather
// than merely highlighting itself in place among everything else.
function renderFeaturedTiles(featured, activeTag) {
  const wrap = document.getElementById('featured-tiles');
  if (!featured.length) { wrap.hidden = true; return; }

  // Back to "all projects" lives in the nav-left slot (see renderHomeNav),
  // not inline here - keeps this collapsed view down to just the project
  // itself.
  const selected = featured.find(f => f.tag === activeTag);
  if (selected) {
    wrap.innerHTML = `
      <p class="project-selected">
        <span class="project-card-title">${escHtml(selected.label)}</span>
        ${selected.description ? `<span class="project-card-desc">${escHtml(selected.description)}</span>` : ''}
      </p>
    `;
    wrap.hidden = false;
    return;
  }

  const sections = [];
  featured.forEach(f => {
    const name = f.section || 'Projects';
    let section = sections.find(s => s.name === name);
    if (!section) { section = { name, items: [] }; sections.push(section); }
    section.items.push(f);
  });

  wrap.innerHTML = sections.map(section => `
    <h2>${escHtml(section.name)}</h2>
    ${section.items.map(f => `
      <button type="button" class="project-card" data-tag="${escHtml(f.tag)}">
        <span class="project-card-title">${escHtml(f.label)}</span>
        ${f.description ? `<span class="project-card-desc">${escHtml(f.description)}</span>` : ''}
      </button>
    `).join('')}
  `).join('');
  wrap.hidden = false;

  wrap.querySelectorAll('.project-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      setActiveTag(tag === activeTag ? null : tag);
    });
  });
}

let homepageManifest = null;

// Applies a project selection without a full navigation: updates the URL
// (?tag=x, or strips it entirely when cleared) via pushState so the
// selected view is bookmarkable/shareable and back/forward step through
// selection states, then re-renders the nav/project list/post list in
// place. The only tags left in the system are the 5 project tags (see
// homepage.json), so "active tag" and "selected project" are the same
// thing now - no independent tag filtering exists any more.
function setActiveTag(tag) {
  const url = tag ? `/?tag=${encodeURIComponent(tag)}` : '/';
  history.pushState({ tag }, '', url);
  renderHomepageState();
}

function renderHomepageState() {
  if (!homepageManifest) return;
  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');
  const selectedProject = homepageManifest.featured.find(f => f.tag === activeTag) || null;

  // The intro line (content/home.md) is homepage-only chrome, not relevant
  // once a project has "zoomed in" the page to just itself.
  document.getElementById('home-content').style.display = selectedProject ? 'none' : 'block';

  renderHomeNav(selectedProject);
  renderFeaturedTiles(homepageManifest.featured, activeTag);
  renderPostList(homepageManifest.posts, activeTag);
}

// Swaps the home page's nav-left slot between empty (default) and a back
// button (project selected) - same .circle-btn/arrowLeft pattern as the
// post page's real "back" button, but here it clears the selection in
// place rather than navigating anywhere.
function renderHomeNav(selectedProject) {
  const nav = document.getElementById('crumbs');
  const left = nav.querySelector('.nav-left');
  if (!left) return;

  if (selectedProject) {
    left.innerHTML = `<button type="button" class="circle-btn" aria-label="All projects">${Icons.svg('arrowLeft')}</button>`;
    left.removeAttribute('aria-hidden');
    left.querySelector('button').addEventListener('click', () => setActiveTag(null));
  } else {
    left.innerHTML = '';
    left.setAttribute('aria-hidden', 'true');
  }
}

// Home page: a wordmark header, a short hand-authored intro (content/home.md),
// featured project tiles and a tag chip row (both from the manifest), and
// the full post list beneath - filterable to one tag via ?tag=, reflected
// in the URL so filtered views are shareable and survive back/forward.
if (document.getElementById('home-content')) {
  renderHomeHeader();
  const loading = deferredLoading();

  // Canonical stays "/" regardless of filter state, so ?tag= views don't
  // fragment indexing into separate pages.
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', 'https://wecreatethis.com/');

  Promise.all([
    fetch('/content/home.md').then(r => r.text()),
    loadManifest(),
  ]).then(([homeText, manifest]) => {
    const { body } = parseFrontmatter(homeText);
    document.getElementById('home-content').innerHTML = renderMarkdown(body);

    homepageManifest = manifest;
    renderHomepageState();

    window.addEventListener('popstate', renderHomepageState);

    loading.done();
    // Not forced to 'block' here - renderHomepageState (just called above)
    // already set #home-content's display correctly (hidden when a project
    // is selected on load, e.g. a direct link to /?tag=heat). Featured
    // tiles/post-list each reveal themselves via `hidden` inside
    // renderFeaturedTiles/renderPostList, called from the same function.
  }).catch(() => {
    loading.fail('Failed to load home page.');
  });
}

// Post page: renders exactly one post, standalone, at its flat /{slug}
// route. There is no multi-post stack and no section to scope anything to.
if (document.getElementById('post-stack')) {
  const loading = deferredLoading();
  loadManifest().then(manifest => {
    const { postSlug, notFound } = parseRoute();
    const post = !notFound && postSlug ? manifest.posts.find(p => p.slug === postSlug) : null;

    if (!post) {
      loading.fail('Post not found.');
      return;
    }

    const stack = document.getElementById('post-stack');
    document.title = post.title + ' - wecreatethis.com';
    document.getElementById('section-title').textContent = post.title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && post.description) metaDesc.setAttribute('content', post.description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `https://wecreatethis.com/${post.slug}`);

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

    fetch(`/content/${post.source}/index.md`)
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
        renderPostHeader(post, headings);
        renderPostBottomNav(manifest.posts, post.slug, post.tags);
        setupPostScrollFade();
        setupPostTitleReveal();
        loading.done();
      })
      .catch(() => {
        stack.querySelector('.md-content').textContent = 'Failed to load post.';
        renderPostHeader(post, []);
        loading.done();
      });
  }).catch(() => {
    loading.fail('Failed to load post.');
  });
}
