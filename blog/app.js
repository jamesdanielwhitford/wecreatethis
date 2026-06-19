const POSTS = [
  {
    slug: 'how-to-write-sick-loops-in-claude-code',
    title: 'How to write (sick) loops in Claude Code',
    date: '2026-06-19',
    author: 'James Daniel Whitford',
    description: 'Boris Cherny, creator of Claude Code, says his job is now to write loops that prompt Claude autonomously. Here is how to do it, from simple CI watching to a full multi-model agent loop that clones a website using a browser.',
  },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Minimal markdown renderer
function renderMarkdown(md) {
  let html = md;

  // Escape HTML except inside code blocks
  const codeBlocks = [];
  html = html.replace(/```[\s\S]*?```/g, match => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `%%CODE_BLOCK_${idx}%%`;
  });

  // Inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escHtml(code)}</code>`);
    return `%%INLINE_CODE_${idx}%%`;
  });

  // Headings
  html = html.replace(/^### (.+)$/gm, (_, t) => `<h3>${t}</h3>`);
  html = html.replace(/^## (.+)$/gm, (_, t) => `<h2>${t}</h2>`);
  html = html.replace(/^# (.+)$/gm, (_, t) => ``); // skip h1, already in meta

  // HR
  html = html.replace(/^---$/gm, '<hr>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes — must run before paragraphs
  // Match contiguous lines starting with > (with or without trailing space/content)
  html = html.replace(/((?:^>.*\n?)+)/gm, block => {
    const inner = block.trim().split('\n').map(l => l.replace(/^> ?/, '')).join('\n');
    return `<blockquote>${renderMarkdown(inner)}</blockquote>`;
  });

  // Tables
  html = html.replace(/((?:^\|.+\|\n?)+)/gm, block => {
    const rows = block.trim().split('\n');
    const sepIdx = rows.findIndex(r => /^\|[-| :]+\|$/.test(r.trim()));
    let tableHtml = '<table>';
    rows.forEach((row, i) => {
      if (i === sepIdx) return;
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      const tag = (sepIdx === -1 ? i === 0 : i < sepIdx) ? 'th' : 'td';
      tableHtml += '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Paragraphs — wrap sequences of non-block lines
  html = html.replace(/^(?!<[hbuolt\/%]|%%)(.*\S.*)$/gm, '<p>$1</p>');

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    const code = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
    html = html.replace(`%%CODE_BLOCK_${idx}%%`, `<pre><code>${escHtml(code)}</code></pre>`);
  });

  // Restore inline code
  inlineCodes.forEach((tag, idx) => {
    html = html.replace(`%%INLINE_CODE_${idx}%%`, tag);
  });

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key) meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, body: match[2] };
}

// Index page
if (document.getElementById('post-list')) {
  const list = document.getElementById('post-list');
  list.innerHTML = POSTS.map(p => `
    <li class="post-item">
      <div class="post-date">${formatDate(p.date)}</div>
      <div class="post-title"><a href="/blog/post?slug=${p.slug}">${p.title}</a></div>
      <div class="post-description">${p.description}</div>
      <div class="post-author">${p.author}</div>
    </li>
  `).join('');
}

// Post page
if (document.getElementById('post-container')) {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  const post = POSTS.find(p => p.slug === slug);

  if (!post) {
    document.getElementById('loading').textContent = 'Post not found.';
  } else {
    document.title = post.title + ' - Blog';
    document.getElementById('post-title-nav').textContent = post.title;

    fetch(`/blog/posts/${slug}.md`)
      .then(r => r.text())
      .then(text => {
        const { body } = parseFrontmatter(text);
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = formatDate(post.date);
        document.getElementById('post-author').textContent = post.author;
        document.getElementById('post-body').innerHTML = renderMarkdown(body);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('post-container').style.display = 'block';
      })
      .catch(() => {
        document.getElementById('loading').textContent = 'Failed to load post.';
      });
  }
}
