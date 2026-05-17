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

      const { r2_key } = body;
      const result = await env.DB.prepare(
        `INSERT INTO items (slug, media_url, media_type, media_mime, r2_key, captured_at, lat, lng, caption, lang, alt, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(slug, media_url, media_type, media_mime ?? null, r2_key ?? null, captured_at, lat ?? null, lng ?? null, caption ?? null, lang ?? 'en', alt ?? '', width ?? null, height ?? null).first();

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

      const { slug: newSlug, media_url, media_type, media_mime, r2_key, captured_at, lat, lng, caption, lang, alt, width, height } = body;

      // If media is being replaced, delete the old R2 object
      if (r2_key && existing.r2_key && r2_key !== existing.r2_key) {
        await env.MEDIA.delete(existing.r2_key).catch(() => {});
      }

      // If slug is changing, check the new slug isn't already taken
      if (newSlug && newSlug !== slug) {
        const conflict = await env.DB.prepare('SELECT id FROM items WHERE slug = ?').bind(newSlug).first();
        if (conflict) return err(`Slug ${newSlug} is already in use`, 409);
      }

      const result = await env.DB.prepare(
        `UPDATE items SET
           slug        = ?,
           media_url   = ?,
           media_type  = ?,
           media_mime  = ?,
           r2_key      = ?,
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
        newSlug      ?? slug,
        media_url    ?? existing.media_url,
        media_type   ?? existing.media_type,
        media_mime   ?? existing.media_mime,
        r2_key       !== undefined ? r2_key : existing.r2_key,
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

      // Delete from R2 using the stored key if present
      if (existing.r2_key) {
        await env.MEDIA.delete(existing.r2_key).catch(() => {});
      }

      await env.DB.prepare('DELETE FROM items WHERE slug = ?').bind(slug).run();
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/upload — proxy file upload to R2
    // Body is the raw file bytes, content-type header must be set by client
    // Query param: filename
    if (method === 'POST' && path === '/api/upload') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const filename = url.searchParams.get('filename');
      const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
      if (!filename) return err('filename query param required');

      const key = `media/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const blob = await request.arrayBuffer();
      await env.MEDIA.put(key, blob, { httpMetadata: { contentType } });

      // Public URL — requires R2 public bucket or custom domain set in Cloudflare dashboard
      const mediaUrl = `${env.R2_PUBLIC_URL}/${key}`;
      return json({ mediaUrl, key }, 201);
    }

    return err('Not found', 404);
  },
};
