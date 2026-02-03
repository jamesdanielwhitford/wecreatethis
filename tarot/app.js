// Main application logic

let currentReading = null;
let selectedSpreadType = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    registerServiceWorker();
    await loadReadingsList();
    setupEventListeners();
    setupSpreadSelectionModal();
    setupTitleMessageModal();
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
    const fabBtn = document.getElementById('new-reading-fab');
    const deckBtn = document.getElementById('deck-btn');

    // Open spread selection modal
    fabBtn.addEventListener('click', () => {
        const spreadModal = document.getElementById('spread-select-modal');
        spreadModal.style.display = 'flex';
    });

    // Navigate to deck browser
    deckBtn.addEventListener('click', () => {
        window.location.href = 'deck';
    });
}

// Setup spread selection modal
function setupSpreadSelectionModal() {
    const spreadModal = document.getElementById('spread-select-modal');
    const cancelBtn = document.getElementById('cancel-spread-btn');
    const spreadOptions = document.querySelectorAll('.spread-option');

    // Handle spread selection
    spreadOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedSpreadType = option.dataset.spread;
            spreadModal.style.display = 'none';
            openTitleMessageModal();
        });
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        spreadModal.style.display = 'none';
        selectedSpreadType = null;
    });

    // Click outside to close
    spreadModal.addEventListener('click', (e) => {
        if (e.target === spreadModal) {
            spreadModal.style.display = 'none';
            selectedSpreadType = null;
        }
    });
}

// Open title/message modal with appropriate settings
function openTitleMessageModal() {
    const titleModal = document.getElementById('title-message-modal');
    const titleInput = document.getElementById('reading-title');
    const messageGroup = document.getElementById('message-group');
    const messageTextarea = document.getElementById('reading-message');

    // Set placeholder to current date
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    titleInput.placeholder = dateStr;

    // Show/hide message field based on spread type
    if (selectedSpreadType === 'single') {
        messageGroup.style.display = 'block';
    } else {
        messageGroup.style.display = 'none';
        messageTextarea.value = '';
    }

    // Clear previous values
    titleInput.value = '';
    messageTextarea.value = '';

    // Show modal
    titleModal.style.display = 'flex';

    // Focus the title input
    setTimeout(() => titleInput.focus(), 100);
}

// Setup title/message modal
function setupTitleMessageModal() {
    const titleModal = document.getElementById('title-message-modal');
    const createBtn = document.getElementById('create-reading-btn');
    const cancelBtn = document.getElementById('cancel-title-btn');

    // Create reading
    createBtn.addEventListener('click', async () => {
        const title = document.getElementById('reading-title').value.trim();
        const message = document.getElementById('reading-message').value.trim();

        if (!selectedSpreadType) return;

        // Create and save the reading
        const reading = await createReading(title, selectedSpreadType, message);

        // Close modal and reset
        titleModal.style.display = 'none';
        selectedSpreadType = null;

        // Navigate to the reading detail page
        window.location.href = `reading?id=${reading.id}`;
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        titleModal.style.display = 'none';
        selectedSpreadType = null;
    });

    // Click outside to close
    titleModal.addEventListener('click', (e) => {
        if (e.target === titleModal) {
            titleModal.style.display = 'none';
            selectedSpreadType = null;
        }
    });

    // Enter key in title to submit
    document.getElementById('reading-title').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && selectedSpreadType !== 'single') {
            createBtn.click();
        }
    });
}

// Create a new reading
async function createReading(title, spreadType, message = '') {
    const spread = SPREADS[spreadType];
    if (!spread) return null;

    const cards = drawCards(spread.positions.length);

    // Generate title if not provided
    const readingTitle = title || generateDateTitle();

    const reading = {
        id: Date.now(),
        title: readingTitle,
        spreadType: spreadType,
        spreadName: spread.name,
        date: new Date().toISOString(),
        message: message || null,
        revealedCardIndex: 0,
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
                <a href="reading?id=${reading.id}" class="reading-link">
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
