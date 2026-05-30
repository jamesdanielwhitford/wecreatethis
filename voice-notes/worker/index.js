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
  // Token is base64(username:password)
  try {
    const decoded = atob(token);
    const colon = decoded.indexOf(':');
    if (colon === -1) return false;
    const user = decoded.slice(0, colon);
    const pass = decoded.slice(colon + 1);
    return user === env.AUTH_USERNAME && pass === env.AUTH_PASSWORD;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/auth/verify — check credentials, returns 200 or 401
    if (method === 'POST' && path === '/api/auth/verify') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      return json({ ok: true });
    }

    // GET /api/notes?limit=50&before=<id>
    if (method === 'GET' && path === '/api/notes') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const before = url.searchParams.get('before');

      let stmt;
      if (before) {
        stmt = env.DB.prepare(
          'SELECT * FROM notes WHERE created_at < ? ORDER BY created_at DESC LIMIT ?'
        ).bind(before, limit);
      } else {
        stmt = env.DB.prepare(
          'SELECT * FROM notes ORDER BY created_at DESC LIMIT ?'
        ).bind(limit);
      }

      const results = await stmt.all();
      return json(results.results);
    }

    // POST /api/notes — create or upsert a note
    if (method === 'POST' && path === '/api/notes') {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');
      const { id, created_at, transcript, transcript_status, transcript_error, duration, audio_mime } = body;
      if (!id || !created_at) return err('id and created_at required');

      const result = await env.DB.prepare(
        `INSERT INTO notes (id, created_at, transcript, transcript_status, transcript_error, duration, audio_mime)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           transcript = excluded.transcript,
           transcript_status = excluded.transcript_status,
           transcript_error = excluded.transcript_error,
           duration = excluded.duration,
           audio_mime = excluded.audio_mime
         RETURNING *`
      ).bind(
        id, created_at,
        transcript ?? null,
        transcript_status ?? 'done',
        transcript_error ?? null,
        duration ?? null,
        audio_mime ?? null,
      ).first();

      return json(result, 201);
    }

    // PUT /api/notes/:id — update transcript text
    if (method === 'PUT' && path.match(/^\/api\/notes\/[^/]+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const id = path.split('/').pop();
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON');

      const existing = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
      if (!existing) return err('Not found', 404);

      const result = await env.DB.prepare(
        `UPDATE notes SET
           transcript = ?,
           transcript_status = ?,
           transcript_error = ?,
           duration = ?,
           audio_mime = ?
         WHERE id = ? RETURNING *`
      ).bind(
        body.transcript !== undefined ? body.transcript : existing.transcript,
        body.transcript_status !== undefined ? body.transcript_status : existing.transcript_status,
        body.transcript_error !== undefined ? body.transcript_error : existing.transcript_error,
        body.duration !== undefined ? body.duration : existing.duration,
        body.audio_mime !== undefined ? body.audio_mime : existing.audio_mime,
        id,
      ).first();

      return json(result);
    }

    // DELETE /api/notes/:id
    if (method === 'DELETE' && path.match(/^\/api\/notes\/[^/]+$/)) {
      if (!authed(request, env)) return err('Unauthorized', 401);
      const id = path.split('/').pop();
      const existing = await env.DB.prepare('SELECT id FROM notes WHERE id = ?').bind(id).first();
      if (!existing) return err('Not found', 404);
      await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
      return new Response(null, { status: 204, headers: CORS });
    }

    return err('Not found', 404);
  },
};
