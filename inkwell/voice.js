import * as storage from './storage.js';
import { getSettings } from './settings.js';

const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/audio/transcriptions';
const MISTRAL_MODEL = 'voxtral-mini-latest';

const params = new URLSearchParams(location.search);
const parentId = params.get('parent') || null;

const btnRecord = document.getElementById('btn-record');
const timerEl = document.getElementById('timer');
const reviewSection = document.getElementById('review-section');
const transcriptArea = document.getElementById('transcript-area');
const btnSave = document.getElementById('btn-save');
const btnRetake = document.getElementById('btn-retake');
const statusMsg = document.getElementById('status-msg');

let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let secondsElapsed = 0;
let recording = false;

function setStatus(msg) { statusMsg.textContent = msg; }

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function startTimer() {
  secondsElapsed = 0;
  timerEl.textContent = formatTime(0);
  timerInterval = setInterval(() => {
    secondsElapsed++;
    timerEl.textContent = formatTime(secondsElapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerEl.textContent = '';
}

async function startRecording() {
  const settings = getSettings();
  if (!settings.mistral_key) {
    setStatus('No Mistral API key found. Add one in Settings (/inkwell/settings).');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); handleStop(); };
    mediaRecorder.start();
    recording = true;
    btnRecord.textContent = 'Stop';
    btnRecord.classList.add('recording');
    startTimer();
    setStatus('Recording...');
  } catch (e) {
    setStatus('Microphone access denied. Please allow microphone use and try again.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  recording = false;
  btnRecord.textContent = 'Record';
  btnRecord.classList.remove('recording');
  stopTimer();
  setStatus('Transcribing...');
}

async function handleStop() {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const settings = getSettings();
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', MISTRAL_MODEL);

  try {
    const res = await fetch(MISTRAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.mistral_key}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Mistral API error ${res.status}`);
    const data = await res.json();
    const text = data.text || '';
    transcriptArea.value = text;
    reviewSection.classList.add('visible');
    setStatus('');
    transcriptArea.focus();
  } catch (e) {
    setStatus(`Transcription failed: ${e.message}. Try again.`);
    reviewSection.classList.remove('visible');
  }
}

btnRecord.addEventListener('click', () => {
  if (recording) stopRecording();
  else startRecording();
});

btnSave.addEventListener('click', async () => {
  const text = transcriptArea.value.trim();
  const title = text.slice(0, 60).split('\n')[0] || 'Voice note';
  btnSave.disabled = true;
  const node = await storage.createNode({ type: 'note', title, body: text, parent_id: parentId, source: 'voice' });
  location.href = `/inkwell/note?id=${node.id}`;
});

btnRetake.addEventListener('click', () => {
  reviewSection.classList.remove('visible');
  transcriptArea.value = '';
  setStatus('');
  audioChunks = [];
});
