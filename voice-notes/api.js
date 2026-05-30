// All network calls to the voice-notes Cloudflare Worker go here.
// Change API_BASE after deploying your worker.
export const API_BASE = 'https://voice-notes.james-052.workers.dev';

function getToken() {
  return sessionStorage.getItem('vn-auth-token') || '';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function handle(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Returns true if credentials are valid, false if not, throws on network error.
export async function verifyCredentials(username, password) {
  const token = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

export async function fetchNotes(before = null, limit = 200) {
  const params = new URLSearchParams({ limit });
  if (before) params.set('before', before);
  const res = await fetch(`${API_BASE}/api/notes?${params}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function pushNote(note) {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(note),
  });
  return handle(res);
}

export async function updateNote(id, data) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function removeNote(id) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handle(res);
}
