#!/usr/bin/env node
// Scans blog/content/ recursively and writes blog/content-manifest.json.
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
        const meta = parseFrontmatter(fs.readFileSync(mdPath, 'utf8'));

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
// they are not separately addressable) plus the blog home.
function writeSitemap(sections) {
  const urls = [`${SITE_ORIGIN}/blog/`].concat(
    sections.map(s => `${SITE_ORIGIN}/blog/${s.path}`)
  );

  const lastmodFor = sectionPath => {
    if (!sectionPath) return '';
    const section = sections.find(s => s.path === sectionPath);
    if (!section) return '';
    const dates = section.posts.map(p => p.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    return dates.sort().pop() || '';
  };

  const body = urls.map(url => {
    const sectionPath = url.replace(`${SITE_ORIGIN}/blog/`, '').replace(/\/$/, '');
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
