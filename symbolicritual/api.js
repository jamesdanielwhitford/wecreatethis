// All network calls to the Cloudflare Worker go through this file.
// Change API_BASE to point at a different backend without touching anything else.
const API_BASE = 'https://symbolic-ritual.workers.dev';

function getToken() {
  return sessionStorage.getItem('sr-auth-token') || '';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchItems({ before = null, after = null, limit = 20 } = {}) {
  const params = new URLSearchParams({ limit });
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  const res = await fetch(`${API_BASE}/api/items?${params}`);
  return handleResponse(res);
}

export async function fetchItem(id) {
  const res = await fetch(`${API_BASE}/api/items/${id}`);
  return handleResponse(res);
}

export async function createItem(data) {
  const res = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateItem(id, data) {
  const res = await fetch(`${API_BASE}/api/items/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function removeItem(id) {
  const res = await fetch(`${API_BASE}/api/items/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getUploadUrl(filename, contentType) {
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ filename, contentType }),
  });
  return handleResponse(res); // returns { uploadUrl, mediaUrl, key }
}
