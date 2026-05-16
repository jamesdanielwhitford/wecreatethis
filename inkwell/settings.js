import { syncFromServer } from './storage.js';

const SETTINGS_KEY = 'inkwell-settings';

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}

function saveSettings(obj) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
}

export function isAuthed() {
  return !!sessionStorage.getItem('inkwell-auth-token');
}

function init() {
  const settings = getSettings();

  // Populate key fields
  document.getElementById('mistral-key').value = settings.mistral_key || '';
  document.getElementById('anthropic-key').value = settings.anthropic_key || '';

  // Toggle visibility
  function makeToggle(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
    });
  }
  makeToggle('mistral-key', 'toggle-mistral');
  makeToggle('anthropic-key', 'toggle-anthropic');

  // Save keys
  document.getElementById('save-keys').addEventListener('click', () => {
    const current = getSettings();
    current.mistral_key = document.getElementById('mistral-key').value.trim();
    current.anthropic_key = document.getElementById('anthropic-key').value.trim();
    saveSettings(current);
    const msg = document.getElementById('keys-status');
    msg.textContent = 'Keys saved.';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  });

  // Auth state
  const authed = isAuthed();
  document.getElementById('login-form').hidden = authed;
  document.getElementById('logout-form').hidden = !authed;

  document.getElementById('btn-login').addEventListener('click', async () => {
    const token = document.getElementById('admin-token').value.trim();
    if (!token) return;
    sessionStorage.setItem('inkwell-auth-token', token);
    document.getElementById('login-status').textContent = 'Syncing...';
    try {
      await syncFromServer();
      document.getElementById('login-form').hidden = true;
      document.getElementById('logout-form').hidden = false;
      document.getElementById('login-status').textContent = '';
    } catch {
      document.getElementById('login-status').textContent = 'Sync failed. Check token.';
      sessionStorage.removeItem('inkwell-auth-token');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('inkwell-auth-token');
    location.reload();
  });
}

init();
