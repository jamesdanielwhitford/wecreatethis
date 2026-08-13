#!/usr/bin/env node
// Scans content/ recursively and writes content-manifest.json. Folders
// organize content on disk (a post's images resolve relative to its own
// folder), but say nothing about the URL: every post is served flat from
// the root as /{slug}. The slug is the post's explicit `slug:` frontmatter
// if given, else its folder name - so folders can be renamed freely without
// touching a post's public URL, and two posts that happen to share a folder
// name (e.g. two different projects each with a `stub` post) can still
// coexist by giving one an explicit slug.
// No dependencies. Run manually before deploying, or let the GitHub Action
// (.github/workflows/blog-manifest.yml) regenerate it.

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUT_FILE = path.join(__dirname, 'content-manifest.json');
const SITEMAP_FILE = path.join(__dirname, 'sitemap.xml');
const HOMEPAGE_CONFIG_FILE = path.join(__dirname, 'homepage.json');
const SITE_ORIGIN = 'https://wecreatethis.com';

// content/test/ and content/demo/ are renderer regression fixtures, not
// real posts - excluded from the manifest entirely (no route, no sitemap
// entry, never appear in a tag/post list), rather than requiring draft:true
// on every fixture individually.
const EXCLUDED_TOP_LEVEL = new Set(['test', 'demo']);

function slugToName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Intrinsic image dimensions, read straight from the file header. The
// renderer puts these on the <img> so the browser can reserve the right
// box before the image arrives, instead of shoving the page down when it
// loads. No dependencies: PNG, GIF, and JPEG headers are simple enough to
// parse by hand.
function imageSize(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return null;
  }
  if (buf.length < 24) return null;

  // PNG: IHDR width/height are big-endian at byte 16.
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: little-endian width/height at byte 6.
  if (buf.slice(0, 3).toString('ascii') === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // JPEG: walk the segment chain to the SOFn frame header.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry dimensions.
      if (marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }

  return null;
}

// Collects intrinsic sizes for every image referenced by a post, keyed by
// the src exactly as written in the markdown.
function imageSizesFor(postDir, markdown) {
  const sizes = {};
  const re = /!\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const src = m[1];
    if (/^https?:\/\//i.test(src)) continue; // remote, can't measure at build time
    const file = src.startsWith('/')
      ? path.join(__dirname, src.replace(/^\//, ''))
      : path.join(postDir, src);
    const size = imageSize(file);
    if (size) sizes[src] = size;
    else console.warn(`  image not found or unreadable: ${src}`);
  }
  return Object.keys(sizes).length ? sizes : undefined;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n?/);
  if (!match) return {};
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return meta;
}

// Tags are hand-written as a comma-separated list (not a YAML array)
// because parseFrontmatter above is a plain key:value line splitter, in
// both build.js and app.js - a list syntax would mean real YAML parsing in
// two places for no benefit at this scale. Lowercased and kebabbed so
// "Agent Design" and "agent-design" written on different posts count as
// the same tag rather than silently forking the tag index.
function parseTags(raw, rel, warnings) {
  if (!raw) return [];
  const seen = new Set();
  const tags = [];
  raw.split(',').forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (normalized !== trimmed) {
      warnings.push(`${rel}: tag "${trimmed}" normalized to "${normalized}" (lowercase, hyphenated).`);
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      tags.push(normalized);
    }
  });
  return tags;
}

// Walks content/ collecting every post into a flat list. Folders still
// nest freely (a post folder may itself contain further post folders) -
// that nesting is preserved as `group` (the folder path relative to
// content/), kept purely as internal metadata for the tag-retrofit
// migration and for sanity-checking "which project is this from" in the
// manifest. `group` never reaches a URL and never drives routing.
function collectPosts(relDir, posts, warnings) {
  const absDir = path.join(CONTENT_DIR, relDir);
  const dirs = fs.readdirSync(absDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const name of dirs) {
    if (!relDir && EXCLUDED_TOP_LEVEL.has(name)) continue;

    const rel = relDir ? `${relDir}/${name}` : name;
    const mdPath = path.join(CONTENT_DIR, rel, 'index.md');

    if (fs.existsSync(mdPath)) {
      const source = fs.readFileSync(mdPath, 'utf8');
      const meta = parseFrontmatter(source);

      // Frontmatter is hand-written, so warn loudly on the values that
      // fail silently at runtime rather than letting them through.
      const draft = (meta.draft || '').toLowerCase();
      if (draft && draft !== 'true' && draft !== 'false') {
        warnings.push(`${rel}: draft is "${meta.draft}", only "true" hides a post - this one WILL publish.`);
      }
      if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
        warnings.push(`${rel}: date "${meta.date}" is not YYYY-MM-DD; sorting and display will be wrong.`);
      }
      if (!meta.date && meta.order === undefined) {
        warnings.push(`${rel}: no date and no order, ordering will be arbitrary.`);
      }
      if (meta.order !== undefined && Number.isNaN(Number(meta.order))) {
        warnings.push(`${rel}: order "${meta.order}" is not a number, ignoring it.`);
      }

      const order = meta.order !== undefined && !Number.isNaN(Number(meta.order))
        ? Number(meta.order)
        : null;

      if (draft !== 'true') {
        posts.push({
          slug: meta.slug || name,
          title: meta.title || name,
          date: meta.date || '',
          order,
          description: meta.description || '',
          author: meta.author || '',
          tags: parseTags(meta.tags, rel, warnings),
          group: relDir || null,
          source: rel,
          images: imageSizesFor(path.join(CONTENT_DIR, rel), source),
        });
      }
    }

    collectPosts(rel, posts, warnings);
  }
}

// A post is unreachable if its slug collides with another post's slug, or
// with a reserved top-level name - every post now competes in the same
// flat URL namespace as every other post AND every sibling app folder
// (birdle, tarot, cv, ...) and static asset at the repo root, since
// _redirects passes those through ahead of the blog's catch-all. Both are
// silent-404 failure modes, not cosmetic ones (contrast the warnings
// above, which just mean a wrong sort order or a leaked draft), so both
// collect every offender and then hard-fail the build rather than warn.
function checkCollisions(posts) {
  const errors = [];

  const bySlug = {};
  posts.forEach(p => { (bySlug[p.slug] = bySlug[p.slug] || []).push(p); });
  Object.keys(bySlug).forEach(slug => {
    const group = bySlug[slug];
    if (group.length > 1) {
      errors.push(
        `Slug "${slug}" is used by ${group.length} posts: ${group.map(p => p.source).join(', ')}. ` +
        `Add an explicit "slug:" to front matter on all but one.`
      );
    }
  });

  // Directory names are reserved as-is (they're routed as /{name}/... by
  // _redirects). File names are reserved both with and without their
  // extension, since a static file is requested as e.g. /robots.txt but a
  // post slug is a bare path segment - stripping the extension only for
  // files (not directories) avoids mistakenly reserving "v1" because of an
  // unrelated directory literally named "v1.5".
  const reserved = new Set();
  fs.readdirSync(__dirname, { withFileTypes: true })
    .filter(d => d.name !== 'content' && !d.name.startsWith('.'))
    .forEach(d => {
      reserved.add(d.name);
      if (!d.isDirectory()) reserved.add(d.name.replace(/\.[^.]+$/, ''));
    });
  posts.forEach(p => {
    if (reserved.has(p.slug)) {
      errors.push(
        `Slug "${p.slug}" (${p.source}) collides with a reserved top-level name ` +
        `(an app folder or static file at the repo root). Give it an explicit "slug:" in front matter.`
      );
    }
  });

  if (errors.length) {
    console.error('Build failed: slug collisions would make posts unreachable.\n');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// Which icons.js keys actually exist, so a typo'd icon in homepage.json
// warns at build time instead of silently rendering no icon.
function knownIconKeys() {
  try {
    const src = fs.readFileSync(path.join(__dirname, 'icons.js'), 'utf8');
    const keys = new Set();
    const re = /^\s*([a-zA-Z][\w]*):\s*'/gm;
    let m;
    while ((m = re.exec(src)) !== null) keys.add(m[1]);
    keys.delete('svg');
    return keys;
  } catch (e) {
    return new Set();
  }
}

// homepage.json curates which tags get a tile on the homepage - a
// tag-level decision (label/icon/description) that doesn't fit as a
// per-post flag (a tag isn't a post) and shouldn't be inferred from
// popularity (the author picks, doesn't get picked for). Validated here so
// a stale or misspelled featured tag warns at build time.
function loadHomepageConfig(posts) {
  if (!fs.existsSync(HOMEPAGE_CONFIG_FILE)) return { featured: [] };

  let config;
  try {
    config = JSON.parse(fs.readFileSync(HOMEPAGE_CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.warn(`homepage.json is not valid JSON (${e.message}); treating as empty.`);
    return { featured: [] };
  }

  const featured = Array.isArray(config.featured) ? config.featured : [];
  const knownTags = new Set(posts.flatMap(p => p.tags));
  const icons = knownIconKeys();

  featured.forEach(f => {
    if (!f.tag || !knownTags.has(f.tag)) {
      console.warn(`homepage.json: featured tag "${f.tag}" matches no published post.`);
    }
    if (f.icon && icons.size && !icons.has(f.icon)) {
      console.warn(`homepage.json: featured icon "${f.icon}" is not defined in icons.js.`);
    }
  });

  return { featured };
}

function buildManifest() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ posts: [], tags: [], featured: [] }, null, 2));
    return;
  }

  const posts = [];
  const warnings = [];
  collectPosts('', posts, warnings);
  warnings.forEach(w => console.warn(w));

  checkCollisions(posts);

  posts.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  const tagCounts = {};
  posts.forEach(p => p.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const tags = Object.keys(tagCounts)
    .sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b))
    .map(tag => ({ tag, count: tagCounts[tag] }));

  const { featured } = loadHomepageConfig(posts);

  fs.writeFileSync(OUT_FILE, JSON.stringify({ posts, tags, featured }, null, 2));
  console.log(`Wrote ${OUT_FILE} (${posts.length} post${posts.length === 1 ? '' : 's'}, ${tags.length} tag${tags.length === 1 ? '' : 's'})`);

  writeSitemap(posts);
}

// One URL per post, flat, plus the home page. No section URLs - those
// paths now 301 to their flat equivalent (see _redirects) and a sitemap
// must not list redirecting URLs as canonical.
function writeSitemap(posts) {
  const entries = [{ url: `${SITE_ORIGIN}/`, lastmod: '' }];

  posts.forEach(post => {
    entries.push({
      url: `${SITE_ORIGIN}/${post.slug}`,
      lastmod: /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : '',
    });
  });

  const body = entries.map(({ url, lastmod }) =>
    '  <url>\n' +
    `    <loc>${url}</loc>\n` +
    (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
    '  </url>'
  ).join('\n');

  fs.writeFileSync(SITEMAP_FILE,
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + '\n</urlset>\n'
  );
  console.log(`Wrote ${SITEMAP_FILE} (${entries.length} urls)`);
}

buildManifest();
