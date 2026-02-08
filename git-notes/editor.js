// Git Notes - File Editor

let fileId = null;
let currentFile = null;
let saveTimeout = null;

async function init() {
  await initDB();

  const params = new URLSearchParams(window.location.search);
  fileId = parseInt(params.get('id'));

  if (!fileId) {
    window.location.href = 'index.html';
    return;
  }

  currentFile = await getFile(fileId);
  if (!currentFile) {
    alert('File not found');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('fileName').textContent = currentFile.name;
  document.getElementById('editor').value = currentFile.content || '';

  // Set up back button
  document.getElementById('backBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `repo.html?id=${currentFile.repoId}`;
  });

  // Set up auto-save
  document.getElementById('editor').addEventListener('input', autoSave);
}

function autoSave() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    const content = document.getElementById('editor').value;
    currentFile.content = content;
    currentFile.synced = false; // Mark as not synced

    try {
      await saveFile(currentFile);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  }, 500);
}

init();
