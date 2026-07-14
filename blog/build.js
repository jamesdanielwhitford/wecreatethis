#!/usr/bin/env node
// Scans blog/content/{section}/{post}/index.md and writes blog/content-manifest.json.
// No dependencies. Run before deploying (see "push to prod" workflow).

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUT_FILE = path.join(__dirname, 'content-manifest.json');

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

function buildManifest() {
  const sections = [];

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ sections: [] }, null, 2));
    return;
  }

  const sectionSlugs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const sectionSlug of sectionSlugs) {
    const sectionDir = path.join(CONTENT_DIR, sectionSlug);
    const postSlugs = fs.readdirSync(sectionDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const posts = [];
    for (const postSlug of postSlugs) {
      const mdPath = path.join(sectionDir, postSlug, 'index.md');
      if (!fs.existsSync(mdPath)) continue;
      const meta = parseFrontmatter(fs.readFileSync(mdPath, 'utf8'));
      posts.push({
        slug: postSlug,
        title: meta.title || postSlug,
        date: meta.date || '',
        order: meta.order !== undefined ? Number(meta.order) : null,
        description: meta.description || '',
        author: meta.author || '',
      });
    }

    posts.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    if (posts.length > 0) {
      sections.push({ slug: sectionSlug, name: slugToName(sectionSlug), posts });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify({ sections }, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
}

buildManifest();
