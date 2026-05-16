// All HTTP calls to the Cloudflare Worker. Change API_BASE to point at any backend.
const API_BASE = 'https://inkwell.james-052.workers.dev';

function getToken() { return sessionStorage.getItem('inkwell-auth-token') || ''; }

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function handle(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchChildren(parentId) {
  const params = new URLSearchParams();
  if (parentId !== null) params.set('parent_id', parentId);
  const res = await fetch(`${API_BASE}/api/nodes?${params}`);
  return handle(res);
}

export async function fetchNode(id) {
  const res = await fetch(`${API_BASE}/api/nodes/${id}`);
  return handle(res);
}

export async function syncSince(since) {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`${API_BASE}/api/nodes/sync${params}`, { headers: authHeaders() });
  return handle(res);
}

export async function createNode(data) {
  const res = await fetch(`${API_BASE}/api/nodes`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateNode(id, data) {
  const res = await fetch(`${API_BASE}/api/nodes/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteNode(id) {
  const res = await fetch(`${API_BASE}/api/nodes/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  return handle(res);
}
