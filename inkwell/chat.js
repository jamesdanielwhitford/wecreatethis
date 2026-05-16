import * as storage from './storage.js';
import { getSettings } from './settings.js';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';

const params = new URLSearchParams(location.search);
const parentId = params.get('parent') || null;

const messagesEl = document.getElementById('chat-messages');
const inputEl = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const btnGenerate = document.getElementById('btn-generate');
const statusMsg = document.getElementById('status-msg');
const previewPanel = document.getElementById('preview-panel');
const previewTitle = document.getElementById('preview-title');
const previewBody = document.getElementById('preview-body');
const btnAccept = document.getElementById('btn-accept');
const btnReject = document.getElementById('btn-reject');

// Conversation history for the API
let history = [];
let generatedTitle = '';
let generatedBody = '';

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setStatus(msg) { statusMsg.textContent = msg; }

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  const settings = getSettings();
  if (!settings.anthropic_key) {
    setStatus('No Anthropic key. Add one in Settings (/inkwell/settings).');
    return;
  }

  inputEl.value = '';
  inputEl.style.height = '';
  appendMessage('user', text);
  history.push({ role: 'user', content: text });

  btnSend.disabled = true;
  btnGenerate.disabled = true;
  setStatus('Thinking...');

  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': settings.anthropic_key,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: history,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const data = await res.json();
    const reply = data.content?.[0]?.text || '';
    history.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply);
    setStatus('');
  } catch (e) {
    setStatus(`Error: ${e.message}`);
    history.pop();
  }

  btnSend.disabled = false;
  btnGenerate.disabled = false;
}

async function generateNote() {
  if (!history.length) {
    setStatus('Start a conversation first.');
    return;
  }
  const settings = getSettings();
  if (!settings.anthropic_key) {
    setStatus('No Anthropic key. Add one in Settings (/inkwell/settings).');
    return;
  }

  btnGenerate.disabled = true;
  btnSend.disabled = true;
  setStatus('Generating note...');
  previewPanel.classList.remove('visible');

  const transcript = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': settings.anthropic_key,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: "You are a note-writing assistant. The user has just had a conversation. Your job is to produce a clean, well-organised note capturing the key ideas from that conversation. Write in plain text, no markdown headers. Use short paragraphs. Output format: first line is the note title, blank line, then the note body. Nothing else.",
        messages: [{ role: 'user', content: `Conversation:\n\n${transcript}` }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text || '').trim();
    const lines = text.split('\n');
    generatedTitle = lines[0].trim();
    generatedBody = lines.slice(2).join('\n').trim();
    previewTitle.textContent = generatedTitle || 'Untitled';
    previewBody.textContent = generatedBody;
    previewPanel.classList.add('visible');
    previewPanel.scrollIntoView({ behavior: 'smooth' });
    setStatus('');
  } catch (e) {
    setStatus(`Error: ${e.message}`);
  }

  btnGenerate.disabled = false;
  btnSend.disabled = false;
}

btnSend.addEventListener('click', sendMessage);

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-grow textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
});

btnGenerate.addEventListener('click', generateNote);

btnAccept.addEventListener('click', async () => {
  btnAccept.disabled = true;
  const node = await storage.createNode({
    type: 'note',
    title: generatedTitle || 'AI note',
    body: generatedBody,
    parent_id: parentId,
    source: 'ai-chat',
  });
  location.href = `/inkwell/note?id=${node.id}`;
});

btnReject.addEventListener('click', () => {
  previewPanel.classList.remove('visible');
  setStatus('');
});
