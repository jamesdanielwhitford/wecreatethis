const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status) { return json({ error: msg }, status); }
function noContent() { return new Response(null, { status: 204, headers: CORS }); }

function authed(req, env) {
  const auth = req.headers.get('Authorization') || '';
  return auth === `Bearer ${env.AUTH_TOKEN}`;
}

function requireAuth(req, env) {
  if (!authed(req, env)) return err('Unauthorized', 401);
  return null;
}

async function deleteWithDescendants(db, id) {
  // Recursive CTE to collect all descendant IDs
  const result = await db.prepare(`
    WITH RECURSIVE desc(id) AS (
      SELECT id FROM nodes WHERE id = ?1
      UNION ALL
      SELECT n.id FROM nodes n JOIN desc d ON n.parent_id = d.id
    )
    SELECT id FROM desc
  `).bind(id).all();
  const ids = result.results.map(r => r.id);
  for (const delId of ids) {
    await db.prepare('DELETE FROM nodes WHERE id = ?1').bind(delId).run();
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET /api/nodes?parent_id=<id>  (absent = top-level)
    if (method === 'GET' && pathname === '/api/nodes') {
      const parentId = url.searchParams.get('parent_id');
      let stmt, results;
      if (parentId === null || parentId === '' || parentId === 'root') {
        results = await env.DB.prepare(
          'SELECT * FROM nodes WHERE parent_id IS NULL ORDER BY position ASC'
        ).all();
      } else {
        results = await env.DB.prepare(
          'SELECT * FROM nodes WHERE parent_id = ?1 ORDER BY position ASC'
        ).bind(parentId).all();
      }
      return json(results.results);
    }

    // GET /api/nodes/sync?since=<iso>
    if (method === 'GET' && pathname === '/api/nodes/sync') {
      const deny = requireAuth(req, env);
      if (deny) return deny;
      const since = url.searchParams.get('since');
      let results;
      if (since) {
        results = await env.DB.prepare(
          'SELECT * FROM nodes WHERE updated_at > ?1 ORDER BY updated_at ASC'
        ).bind(since).all();
      } else {
        results = await env.DB.prepare('SELECT * FROM nodes ORDER BY updated_at ASC').all();
      }
      return json(results.results);
    }

    // GET /api/nodes/:id
    if (method === 'GET' && pathname.startsWith('/api/nodes/')) {
      const id = pathname.slice('/api/nodes/'.length);
      const row = await env.DB.prepare('SELECT * FROM nodes WHERE id = ?1').bind(id).first();
      if (!row) return err('Not found', 404);
      return json(row);
    }

    // POST /api/nodes
    if (method === 'POST' && pathname === '/api/nodes') {
      const deny = requireAuth(req, env);
      if (deny) return deny;
      const body = await req.json();
      const now = new Date().toISOString();
      const node = {
        id: body.id || crypto.randomUUID(),
        parent_id: body.parent_id ?? null,
        type: body.type,
        title: body.title ?? '',
        body: body.body ?? null,
        source: body.source ?? null,
        position: body.position ?? 0,
        created_at: body.created_at || now,
        updated_at: now,
      };
      await env.DB.prepare(`
        INSERT INTO nodes (id, parent_id, type, title, body, source, position, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      `).bind(node.id, node.parent_id, node.type, node.title, node.body, node.source, node.position, node.created_at, node.updated_at).run();
      return json(node, 201);
    }

    // PUT /api/nodes/:id
    if (method === 'PUT' && pathname.startsWith('/api/nodes/')) {
      const deny = requireAuth(req, env);
      if (deny) return deny;
      const id = pathname.slice('/api/nodes/'.length);
      const body = await req.json();
      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE nodes SET
          parent_id = ?2, type = ?3, title = ?4, body = ?5,
          source = ?6, position = ?7, updated_at = ?8
        WHERE id = ?1
      `).bind(id, body.parent_id ?? null, body.type, body.title ?? '', body.body ?? null, body.source ?? null, body.position ?? 0, now).run();
      const updated = await env.DB.prepare('SELECT * FROM nodes WHERE id = ?1').bind(id).first();
      if (!updated) return err('Not found', 404);
      return json(updated);
    }

    // DELETE /api/nodes/:id
    if (method === 'DELETE' && pathname.startsWith('/api/nodes/')) {
      const deny = requireAuth(req, env);
      if (deny) return deny;
      const id = pathname.slice('/api/nodes/'.length);
      await deleteWithDescendants(env.DB, id);
      return noContent();
    }

    return err('Not found', 404);
  },
};
