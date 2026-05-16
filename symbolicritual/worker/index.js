const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
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

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET /api/items?limit=20&before=<id>
    if (method === 'GET' && path === '/api/items') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const before = url.searchParams.get('before');
      const after = url.searchParams.get('after');

      let stmt, results;
      if (after) {
        // Items newer than after, ascending (caller reverses for display)
        stmt = env.DB.prepare(
          'SELECT * FROM items WHERE id > ? ORDER BY id ASC LIMIT ?'
        ).bind(Number(after), limit);
      } else if (before) {
        stmt = env.DB.prepare(
          'SELECT * FROM items WHERE id < ? ORDER BY id DESC LIMIT ?'
        ).bind(Number(before), limit);
      } else {
        stmt = env.DB.prepare(
          'SELECT * FROM items ORDER BY id DESC LIMIT ?'
        ).bind(limit);
      }

      results = await stmt.all();
      return json(results.results);
    }

    // GET /api/items/:id
    if (method === 'GET' && path.match(/^\/api\/items\/\d+$/)) {
      const id = Number(path.split('/').pop());
      const result = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
      if (!result) return err('Not found', 404);
      return json(result);
    }

    // POST /api/items — create
    if (method === 'POST' && path === '/api/items') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');
      const { media_url, media_type, media_mime, captured_at, lat, lng, caption, lang, alt, width, height } = body;
      if (!media_url || !media_type || !captured_at) return err('media_url, media_type, captured_at required');
      if (!['image', 'video'].includes(media_type)) return err('media_type must be image or video');

      const result = await env.DB.prepare(
        `INSERT INTO items (media_url, media_type, media_mime, captured_at, lat, lng, caption, lang, alt, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(media_url, media_type, media_mime ?? null, captured_at, lat ?? null, lng ?? null, caption ?? null, lang ?? 'en', alt ?? '', width ?? null, height ?? null).first();

      return json(result, 201);
    }

    // PUT /api/items/:id — update
    if (method === 'PUT' && path.match(/^\/api\/items\/\d+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const id = Number(path.split('/').pop());
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');

      const existing = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
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
         WHERE id = ?
         RETURNING *`
      ).bind(
        media_url    ?? existing.media_url,
        media_type   ?? existing.media_type,
        media_mime   ?? existing.media_mime,
        captured_at  ?? existing.captured_at,
        lat          !== undefined ? lat  : existing.lat,
        lng          !== undefined ? lng  : existing.lng,
        caption      !== undefined ? caption : existing.caption,
        lang         ?? existing.lang,
        alt          ?? existing.alt,
        width        !== undefined ? width  : existing.width,
        height       !== undefined ? height : existing.height,
        id
      ).first();

      return json(result);
    }

    // DELETE /api/items/:id
    if (method === 'DELETE' && path.match(/^\/api\/items\/\d+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const id = Number(path.split('/').pop());
      const existing = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
      if (!existing) return err('Not found', 404);

      // Delete media from R2 if it's an R2 key (not a data URL or external URL)
      if (existing.media_url && !existing.media_url.startsWith('data:') && !existing.media_url.startsWith('http')) {
        await env.MEDIA.delete(existing.media_url).catch(() => {});
      }

      await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/upload — get presigned R2 URL for direct browser upload
    if (method === 'POST' && path === '/api/upload') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body?.filename || !body?.contentType) return err('filename and contentType required');

      const key = `media/${Date.now()}-${body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadUrl = await env.MEDIA.createMultipartUpload(key);

      // R2 presigned URLs use createMultipartUpload — for simple PUT we use a signed URL
      // Cloudflare R2 presigned PUT URL
      const url = await env.MEDIA.createPresignedUrl(key, {
        expiresIn: 3600,
        httpMethod: 'PUT',
        headers: { 'Content-Type': body.contentType },
      }).catch(() => null);

      if (!url) return err('Could not generate upload URL', 500);

      const mediaUrl = `https://media.symbolic-ritual.com/${key}`;
      return json({ uploadUrl: url, mediaUrl, key });
    }

    return err('Not found', 404);
  },
};
