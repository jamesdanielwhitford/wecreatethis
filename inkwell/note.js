import * as storage from './storage.js';
import { getSettings } from './settings.js';
import { mistralTranscribe, anthropicChat } from './api.js';

const MISTRAL_MODEL = 'voxtral-mini-latest';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

let currentNode = null;
let saveTimer = null;
const AUTOSAVE_DELAY = 800;

const titleEl = document.getElementById('note-title');
const bodyEl = document.getElementById('note-body');
const statusEl = document.getElementById('save-status');
const btnMic = document.getElementById('btn-mic');
const voiceStatus = document.getElementById('voice-status');
const btnAiEdit = document.getElementById('btn-ai-edit');

// --- Save ---

async function save() {
  if (!currentNode) return;
  currentNode.title = titleEl.textContent.trim();
  currentNode.body = bodyEl.textContent;
  await storage.putNode(currentNode);
  document.title = `${currentNode.title || 'Untitled'} — Inkwell`;
  showStatus('Saved');
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, AUTOSAVE_DELAY);
}

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add('visible');
  clearTimeout(statusEl._hideTimer);
  statusEl._hideTimer = setTimeout(() => statusEl.classList.remove('visible'), 1500);
}

// --- Breadcrumb ---

async function buildBreadcrumb(node) {
  const crumbs = [{ title: 'Inkwell', href: '/inkwell/' }];
  const chain = [];
  let id = node.parent_id;
  while (id) {
    const parent = await storage.getNode(id);
    if (!parent) break;
    chain.unshift(parent);
    id = parent.parent_id;
  }
  for (const n of chain) crumbs.push({ title: n.title, href: `/inkwell/?folder=${n.id}` });
  crumbs.push({ title: node.title || 'Untitled' });
  const nav = document.getElementById('breadcrumb');
  nav.innerHTML = crumbs.map((c, i) =>
    i < crumbs.length - 1 && c.href
      ? `<span><a href="${c.href}">${escHtml(c.title)}</a></span>`
      : `<span>${escHtml(c.title || 'Untitled')}</span>`
  ).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Voice append ---

let mediaRecorder = null;
let audioChunks = [];
let voiceRecording = false;

async function startVoiceAppend() {
  const settings = getSettings();
  if (!settings.mistral_key) {
    voiceStatus.textContent = 'No Mistral key. Add one in Settings (/inkwell/settings).';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); transcribeAndAppend(); };
    mediaRecorder.start();
    voiceRecording = true;
    btnMic.textContent = '&#9209; Stop recording';
    btnMic.classList.add('recording');
    voiceStatus.textContent = 'Recording...';
  } catch {
    voiceStatus.textContent = 'Microphone access denied.';
  }
}

function stopVoiceAppend() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  voiceRecording = false;
  btnMic.innerHTML = '&#127908; Append voice';
  btnMic.classList.remove('recording');
  voiceStatus.textContent = 'Transcribing...';
}

async function transcribeAndAppend() {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const settings = getSettings();
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', MISTRAL_MODEL);
  try {
    const data = await mistralTranscribe(settings.mistral_key, formData);
    const text = (data.text || '').trim();
    if (text) {
      const current = bodyEl.textContent;
      bodyEl.textContent = current ? `${current}\n\n${text}` : text;
      clearTimeout(saveTimer);
      await save();
    }
    voiceStatus.textContent = '';
  } catch (e) {
    voiceStatus.textContent = `Transcription failed: ${e.message}`;
  }
}

btnMic.addEventListener('click', () => {
  if (voiceRecording) stopVoiceAppend();
  else startVoiceAppend();
});

// --- AI edit panel ---

function buildAiPanel() {
  if (document.getElementById('ai-edit-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'ai-edit-panel';
  panel.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    background: Canvas;
    border-top: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    padding: 1rem 1.25rem 1.5rem;
    z-index: 200;
    max-height: 60dvh;
    overflow-y: auto;
  `;
  panel.innerHTML = `
    <p style="font-size:0.85rem;font-weight:600;margin-bottom:0.5rem;">AI edit</p>
    <textarea id="ai-instruction" rows="2" placeholder="What would you like to change?" style="
      width:100%;font:inherit;font-size:0.9rem;padding:0.5rem;
      border:1px solid color-mix(in srgb, CanvasText 25%, transparent);
      border-radius:4px;background:Field;color:FieldText;resize:vertical;margin-bottom:0.5rem;
    "></textarea>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
      <button id="ai-apply" style="
        font:inherit;font-size:0.9rem;padding:0.4rem 1rem;
        border:1px solid CanvasText;border-radius:4px;
        background:Canvas;color:CanvasText;cursor:pointer;
      ">Apply</button>
      <button id="ai-cancel" style="
        font:inherit;font-size:0.9rem;padding:0.4rem 1rem;
        border:1px solid color-mix(in srgb, CanvasText 25%, transparent);border-radius:4px;
        background:Canvas;color:CanvasText;cursor:pointer;
      ">Cancel</button>
    </div>
    <div id="ai-preview-area" style="display:none;">
      <p style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:color-mix(in srgb, CanvasText 50%, transparent);margin-bottom:0.4rem;">Preview</p>
      <div id="ai-preview" style="
        font-size:0.95rem;line-height:1.6;white-space:pre-wrap;
        padding:0.75rem;background:color-mix(in srgb, CanvasText 4%, transparent);
        border-radius:4px;margin-bottom:0.75rem;
      "></div>
      <div style="display:flex;gap:0.5rem;">
        <button id="ai-accept" style="
          font:inherit;font-size:0.9rem;padding:0.4rem 1rem;
          border:1px solid CanvasText;border-radius:4px;
          background:Canvas;color:CanvasText;cursor:pointer;font-weight:600;
        ">Accept</button>
        <button id="ai-reject" style="
          font:inherit;font-size:0.9rem;padding:0.4rem 1rem;
          border:1px solid color-mix(in srgb, CanvasText 25%, transparent);border-radius:4px;
          background:Canvas;color:CanvasText;cursor:pointer;
        ">Reject</button>
      </div>
    </div>
    <p id="ai-status" style="font-size:0.8rem;color:color-mix(in srgb, CanvasText 55%, transparent);margin-top:0.5rem;min-height:1.2em;"></p>
  `;
  document.body.appendChild(panel);

  document.getElementById('ai-cancel').addEventListener('click', () => panel.remove());

  document.getElementById('ai-apply').addEventListener('click', async () => {
    const instruction = document.getElementById('ai-instruction').value.trim();
    if (!instruction) return;
    const settings = getSettings();
    if (!settings.anthropic_key) {
      document.getElementById('ai-status').textContent = 'No Anthropic key. Add one in Settings (/inkwell/settings).';
      return;
    }
    document.getElementById('ai-status').textContent = 'Thinking...';
    document.getElementById('ai-apply').disabled = true;
    document.getElementById('ai-preview-area').style.display = 'none';

    const noteBody = bodyEl.textContent;
    try {
      const data = await anthropicChat(settings.anthropic_key, {
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: 'You are a note editor. Apply the user\'s instruction to the note below. Return only the revised note body. No explanation, no preamble, no markdown code fences. Preserve the voice and structure unless the instruction asks you to change it.',
        messages: [
          { role: 'user', content: `Note:\n${noteBody}\n\nInstruction: ${instruction}` },
        ],
      });
      const revised = data.content?.[0]?.text || '';
      document.getElementById('ai-preview').textContent = revised;
      document.getElementById('ai-preview-area').style.display = 'block';
      document.getElementById('ai-status').textContent = '';
    } catch (e) {
      document.getElementById('ai-status').textContent = `Error: ${e.message}`;
    }
    document.getElementById('ai-apply').disabled = false;
  });

  document.getElementById('ai-accept').addEventListener('click', async () => {
    const revised = document.getElementById('ai-preview').textContent;
    bodyEl.textContent = revised;
    panel.remove();
    clearTimeout(saveTimer);
    await save();
  });

  document.getElementById('ai-reject').addEventListener('click', () => {
    document.getElementById('ai-preview-area').style.display = 'none';
    document.getElementById('ai-instruction').value = '';
  });
}

btnAiEdit.addEventListener('click', () => {
  if (document.getElementById('ai-edit-panel')) {
    document.getElementById('ai-edit-panel').remove();
  } else {
    buildAiPanel();
  }
});

// --- Init ---

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = '/inkwell/'; return; }
  const node = await storage.getNode(id);
  if (!node) { location.href = '/inkwell/'; return; }
  currentNode = node;
  document.title = `${node.title || 'Untitled'} — Inkwell`;
  await buildBreadcrumb(node);
  titleEl.textContent = node.title || '';
  bodyEl.textContent = node.body || '';

  titleEl.addEventListener('input', scheduleSave);
  bodyEl.addEventListener('input', scheduleSave);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      clearTimeout(saveTimer);
      save();
    }
  });
}

init();
