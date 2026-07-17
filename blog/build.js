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
        if (meta.draft !== 'true') {
          (postsBySection[relDir] = postsBySection[relDir] || []).push({
            slug: name,
            title: meta.title || name,
            date: meta.date || '',
            order: meta.order !== undefined ? Number(meta.order) : null,
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
}

buildManifest();
