const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      // Cache read responses at the edge for 60s to reduce D1 reads
      'Cache-Control': status === 200 ? 'public, max-age=60, stale-while-revalidate=300' : 'no-store',
    },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

function authed(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  return token === env.AUTH_TOKEN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET /api/items?limit=20&before=<slug>&after=<slug>
    if (method === 'GET' && path === '/api/items') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const before = url.searchParams.get('before');
      const after = url.searchParams.get('after');

      let stmt;
      if (after) {
        stmt = env.DB.prepare(
          'SELECT * FROM items WHERE slug > ? ORDER BY slug ASC LIMIT ?'
        ).bind(Number(after), limit);
      } else if (before) {
        stmt = env.DB.prepare(
          'SELECT * FROM items WHERE slug < ? ORDER BY slug DESC LIMIT ?'
        ).bind(Number(before), limit);
      } else {
        stmt = env.DB.prepare(
          'SELECT * FROM items ORDER BY slug DESC LIMIT ?'
        ).bind(limit);
      }

      const results = await stmt.all();
      return json(results.results);
    }

    // GET /api/items/next-slug — returns the next available slug number
    if (method === 'GET' && path === '/api/items/next-slug') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const row = await env.DB.prepare('SELECT MAX(slug) as max_slug FROM items').first();
      return json({ nextSlug: (row?.max_slug ?? 0) + 1 });
    }

    // GET /api/items/:slug — look up by slug
    if (method === 'GET' && path.match(/^\/api\/items\/\d+$/)) {
      const slug = Number(path.split('/').pop());
      const result = await env.DB.prepare('SELECT * FROM items WHERE slug = ?').bind(slug).first();
      if (!result) return err('Not found', 404);
      return json(result);
    }

    // POST /api/items — create
    if (method === 'POST' && path === '/api/items') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');
      const { slug, media_url, media_type, media_mime, captured_at, lat, lng, caption, lang, alt, width, height } = body;
      if (!slug || !media_url || !media_type || !captured_at) return err('slug, media_url, media_type, captured_at required');
      if (!['image', 'video'].includes(media_type)) return err('media_type must be image or video');

      const result = await env.DB.prepare(
        `INSERT INTO items (slug, media_url, media_type, media_mime, captured_at, lat, lng, caption, lang, alt, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(slug, media_url, media_type, media_mime ?? null, captured_at, lat ?? null, lng ?? null, caption ?? null, lang ?? 'en', alt ?? '', width ?? null, height ?? null).first();

      return json(result, 201);
    }

    // PUT /api/items/:slug — update
    if (method === 'PUT' && path.match(/^\/api\/items\/\d+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const slug = Number(path.split('/').pop());
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');

      const existing = await env.DB.prepare('SELECT * FROM items WHERE slug = ?').bind(slug).first();
      if (!existing) return err('Not found', 404);

      const { media_url, media_type, media_mime, captured_at, lat, lng, caption, lang, alt, width, height } = body;
      const result = await env.DB.prepare(
        `UPDATE items SET
           media_url   = ?,
           media_type  = ?,
           media_mime  = ?,
           captured_at = ?,
           lat         = ?,
           lng         = ?,
           caption     = ?,
           lang        = ?,
           alt         = ?,
           width       = ?,
           height      = ?
         WHERE slug = ?
         RETURNING *`
      ).bind(
        media_url    ?? existing.media_url,
        media_type   ?? existing.media_type,
        media_mime   ?? existing.media_mime,
        captured_at  ?? existing.captured_at,
        lat          !== undefined ? lat    : existing.lat,
        lng          !== undefined ? lng    : existing.lng,
        caption      !== undefined ? caption : existing.caption,
        lang         ?? existing.lang,
        alt          ?? existing.alt,
        width        !== undefined ? width  : existing.width,
        height       !== undefined ? height : existing.height,
        slug
      ).first();

      return json(result);
    }

    // DELETE /api/items/:slug
    if (method === 'DELETE' && path.match(/^\/api\/items\/\d+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const slug = Number(path.split('/').pop());
      const existing = await env.DB.prepare('SELECT * FROM items WHERE slug = ?').bind(slug).first();
      if (!existing) return err('Not found', 404);

      // Delete from R2 if it's an R2 key (not a data URL or full external URL)
      if (existing.media_url && !existing.media_url.startsWith('data:') && !existing.media_url.startsWith('http')) {
        await env.MEDIA.delete(existing.media_url).catch(() => {});
      }

      await env.DB.prepare('DELETE FROM items WHERE slug = ?').bind(slug).run();
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/upload — presigned R2 URL for direct browser upload
    if (method === 'POST' && path === '/api/upload') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body?.filename || !body?.contentType) return err('filename and contentType required');

      const key = `media/${Date.now()}-${body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadUrl = await env.MEDIA.createPresignedUrl(key, {
        expiresIn: 3600,
        httpMethod: 'PUT',
        headers: { 'Content-Type': body.contentType },
      }).catch(() => null);

      if (!uploadUrl) return err('Could not generate upload URL', 500);

      const mediaUrl = `https://media.symbolic-ritual.com/${key}`;
      return json({ uploadUrl, mediaUrl, key });
    }

    return err('Not found', 404);
  },
};
