#!/usr/bin/env node
// Scans content/ recursively and writes content-manifest.json.
// Any folder containing an index.md is a post; the folder that holds post
// folders is a section, addressed by its path relative to content/
// (nesting allowed: content/game-dev/godot/my-post/index.md -> section
// "game-dev/godot"). No dependencies. Run manually before deploying, or
// let the GitHub Action (.github/workflows/blog-manifest.yml) regenerate it.

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUT_FILE = path.join(__dirname, 'content-manifest.json');
const SITEMAP_FILE = path.join(__dirname, 'sitemap.xml');
const SITE_ORIGIN = 'https://wecreatethis.com';

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

// Walks content/ collecting posts into { sectionPath: [post, ...] }.
// A post folder may itself contain further post folders (it then also
// acts as a section), so recursion continues either way.
function collectPosts(relDir, postsBySection) {
  const absDir = path.join(CONTENT_DIR, relDir);
  const dirs = fs.readdirSync(absDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const name of dirs) {
    const rel = relDir ? `${relDir}/${name}` : name;
    const mdPath = path.join(CONTENT_DIR, rel, 'index.md');

    if (fs.existsSync(mdPath)) {
      if (!relDir) {
        console.warn(`Skipping ${rel}/index.md: posts must live inside a section (content/{section}/{post}/index.md).`);
      } else {
        const source = fs.readFileSync(mdPath, 'utf8');
        const meta = parseFrontmatter(source);

        // Frontmatter is hand-written, so warn loudly on the values that
        // fail silently at runtime rather than letting them through.
        const draft = (meta.draft || '').toLowerCase();
        if (draft && draft !== 'true' && draft !== 'false') {
          console.warn(`${rel}: draft is "${meta.draft}", only "true" hides a post - this one WILL publish.`);
        }
        if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
          console.warn(`${rel}: date "${meta.date}" is not YYYY-MM-DD; sorting and display will be wrong.`);
        }
        if (!meta.date && meta.order === undefined) {
          console.warn(`${rel}: no date and no order, ordering will be arbitrary.`);
        }
        if (meta.order !== undefined && Number.isNaN(Number(meta.order))) {
          console.warn(`${rel}: order "${meta.order}" is not a number, ignoring it.`);
        }

        const order = meta.order !== undefined && !Number.isNaN(Number(meta.order))
          ? Number(meta.order)
          : null;

        if (draft !== 'true') {
          (postsBySection[relDir] = postsBySection[relDir] || []).push({
            slug: name,
            title: meta.title || name,
            date: meta.date || '',
            order,
            description: meta.description || '',
            author: meta.author || '',
            images: imageSizesFor(path.join(CONTENT_DIR, rel), source),
          });
        }
      }
    }

    collectPosts(rel, postsBySection);
  }
}

function buildManifest() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ sections: [] }, null, 2));
    return;
  }

  const postsBySection = {};
  collectPosts('', postsBySection);

  const sections = Object.keys(postsBySection).sort().map(sectionPath => {
    const posts = postsBySection[sectionPath];

    posts.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    return {
      path: sectionPath,
      name: slugToName(sectionPath.split('/').pop()),
      posts,
    };
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify({ sections }, null, 2));
  console.log(`Wrote ${OUT_FILE} (${sections.length} section${sections.length === 1 ? '' : 's'})`);

  writeSitemap(sections);
}

// One URL per section (posts live inside a section page as #fragments, so
// they are not separately addressable) plus the home page.
function writeSitemap(sections) {
  const urls = [`${SITE_ORIGIN}/`].concat(
    sections.map(s => `${SITE_ORIGIN}/${s.path}`)
  );

  const lastmodFor = sectionPath => {
    if (!sectionPath) return '';
    const section = sections.find(s => s.path === sectionPath);
    if (!section) return '';
    const dates = section.posts.map(p => p.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    return dates.sort().pop() || '';
  };

  const body = urls.map(url => {
    const sectionPath = url.replace(`${SITE_ORIGIN}/`, '').replace(/\/$/, '');
    const lastmod = lastmodFor(sectionPath);
    return '  <url>\n' +
      `    <loc>${url}</loc>\n` +
      (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
      '  </url>';
  }).join('\n');

  fs.writeFileSync(SITEMAP_FILE,
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + '\n</urlset>\n'
  );
  console.log(`Wrote ${SITEMAP_FILE} (${urls.length} urls)`);
}

buildManifest();
