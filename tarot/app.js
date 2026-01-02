// Main application logic

let currentReading = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    registerServiceWorker();
    loadReadingsList();
    setupEventListeners();
    setupRenameModal();
    setupDeleteModal();
});

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }
}

// Setup event listeners
function setupEventListeners() {
    const modal = document.getElementById('new-reading-modal');
    const fabBtn = document.getElementById('new-reading-fab');
    const cancelBtn = document.getElementById('cancel-reading-btn');
    const createBtn = document.getElementById('create-reading-btn');
    const spreadSelect = document.getElementById('spread-select');

    // Open modal
    fabBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    // Close modal
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetModal();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetModal();
        }
    });

    // Enable create button when spread is selected
    spreadSelect.addEventListener('change', () => {
        createBtn.disabled = !spreadSelect.value;
    });

    // Create reading
    createBtn.addEventListener('click', async () => {
        const title = document.getElementById('reading-title').value.trim();
        const spreadType = spreadSelect.value;

        if (!spreadType) return;

        // Create and save the reading
        await createReading(title, spreadType);

        // Close modal and refresh list
        modal.style.display = 'none';
        resetModal();
        loadReadingsList();
    });
}

// Reset modal form
function resetModal() {
    document.getElementById('reading-title').value = '';
    document.getElementById('spread-select').value = '';
    document.getElementById('create-reading-btn').disabled = true;
}

// Create a new reading
async function createReading(title, spreadType) {
    const spread = SPREADS[spreadType];
    if (!spread) return;

    const cards = drawCards(spread.positions.length);

    // Generate title if not provided
    const readingTitle = title || generateDateTitle();

    const reading = {
        id: Date.now(),
        title: readingTitle,
        spreadType: spreadType,
        spreadName: spread.name,
        date: new Date().toISOString(),
        cards: cards.map((card, index) => ({
            ...card,
            position: spread.positions[index]
        }))
    };

    await saveReading(reading);
    return reading;
}

// Generate date-based title
function generateDateTitle() {
    const date = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Load readings list
async function loadReadingsList() {
    const readings = await getAllReadings();
    const list = document.getElementById('readings-list');

    if (!readings || readings.length === 0) {
        list.innerHTML = '<li class="empty">No readings yet. Tap + to create your first reading.</li>';
        return;
    }

    list.innerHTML = readings.map(reading => {
        const date = new Date(reading.date);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <li class="reading-item">
                <a href="reading.html?id=${reading.id}" class="reading-link">
                    <span class="reading-title">${reading.title}</span>
                    <span class="reading-info">${reading.spreadName} • ${dateStr}</span>
                </a>
                <button class="reading-menu-btn" data-reading-id="${reading.id}">⋮</button>
                <div class="reading-menu-dropdown" id="menu-${reading.id}" style="display: none;">
                    <button class="menu-rename" data-reading-id="${reading.id}">Rename</button>
                    <button class="menu-delete danger" data-reading-id="${reading.id}">Delete</button>
                </div>
            </li>
        `;
    }).join('');

    // Setup menu event listeners after rendering
    setupMenuListeners();
}

// Setup menu listeners for all readings
function setupMenuListeners() {
    // Menu toggle buttons
    document.querySelectorAll('.reading-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const readingId = btn.dataset.readingId;
            const menu = document.getElementById(`menu-${readingId}`);

            // Close all other menus
            document.querySelectorAll('.reading-menu-dropdown').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });

            // Toggle this menu
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Rename buttons
    document.querySelectorAll('.menu-rename').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const readingId = parseInt(btn.dataset.readingId);
            await renameReading(readingId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.menu-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const readingId = parseInt(btn.dataset.readingId);
            await deleteReadingFromList(readingId);
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.reading-menu-dropdown').forEach(m => {
            m.style.display = 'none';
        });
    });
}

// Rename a reading
let currentRenameId = null;

async function renameReading(readingId) {
    const reading = await getReading(readingId);
    if (!reading) return;

    currentRenameId = readingId;

    // Show rename modal with current title
    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    renameInput.value = reading.title;
    renameModal.style.display = 'flex';

    // Focus the input and select all text
    setTimeout(() => {
        renameInput.focus();
        renameInput.select();
    }, 100);
}

// Setup rename modal handlers
function setupRenameModal() {
    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const saveBtn = document.getElementById('save-rename-btn');
    const cancelBtn = document.getElementById('cancel-rename-btn');

    // Save rename
    saveBtn.addEventListener('click', async () => {
        const newTitle = renameInput.value.trim();
        if (!newTitle || !currentRenameId) return;

        const reading = await getReading(currentRenameId);
        if (reading) {
            reading.title = newTitle;
            await updateReading(reading);
            loadReadingsList();
        }

        renameModal.style.display = 'none';
        renameInput.value = '';
        currentRenameId = null;
    });

    // Cancel rename
    cancelBtn.addEventListener('click', () => {
        renameModal.style.display = 'none';
        renameInput.value = '';
        currentRenameId = null;
    });

    // Click outside to close
    renameModal.addEventListener('click', (e) => {
        if (e.target === renameModal) {
            renameModal.style.display = 'none';
            renameInput.value = '';
            currentRenameId = null;
        }
    });

    // Enter key to save
    renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}

// Delete reading from list
let currentDeleteId = null;

async function deleteReadingFromList(readingId) {
    const reading = await getReading(readingId);
    if (!reading) return;

    currentDeleteId = readingId;

    // Show delete modal with reading title
    const deleteModal = document.getElementById('delete-modal');
    const titleSpan = document.getElementById('delete-reading-title');
    titleSpan.textContent = reading.title;
    deleteModal.style.display = 'flex';
}

// Setup delete modal handlers
function setupDeleteModal() {
    const deleteModal = document.getElementById('delete-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    // Confirm delete
    confirmBtn.addEventListener('click', async () => {
        if (!currentDeleteId) return;

        await deleteReading(currentDeleteId);
        loadReadingsList();

        deleteModal.style.display = 'none';
        currentDeleteId = null;
    });

    // Cancel delete
    cancelBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        currentDeleteId = null;
    });

    // Click outside to close
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
            currentDeleteId = null;
        }
    });
}

// Draw random cards
function drawCards(count) {
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(card => ({
        ...card,
        isReversed: Math.random() < 0.5
    }));
}
