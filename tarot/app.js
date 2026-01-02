// Main application logic

let currentReading = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    registerServiceWorker();
    setupEventListeners();
    updateOnlineStatus();
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
    // Reading type buttons
    document.querySelectorAll('.reading-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const spreadType = e.target.dataset.spread;
            performReading(spreadType);
        });
    });

    // New reading button
    document.getElementById('new-reading').addEventListener('click', () => {
        showReadingSelect();
    });

    // Online/offline status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

// Perform a tarot reading
function performReading(spreadType) {
    const spread = SPREADS[spreadType];
    if (!spread) return;

    const cards = drawCards(spread.positions.length);
    currentReading = {
        spreadType: spreadType,
        spreadName: spread.name,
        cards: cards.map((card, index) => ({
            ...card,
            position: spread.positions[index]
        }))
    };

    displayReading(currentReading);
    saveReading(currentReading);
}

// Draw random cards
function drawCards(count) {
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(card => ({
        ...card,
        isReversed: Math.random() < 0.5
    }));
}

// Display the reading
function displayReading(reading) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    reading.cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'tarot-card';

        const meanings = card.isReversed ? card.reversed : card.upright;
        const orientation = card.isReversed ? ' (Reversed)' : '';

        cardEl.innerHTML = `
            <div class="card-name">${card.name}${orientation}</div>
            <div class="card-position">${card.position.name}</div>
            <div class="card-meaning">
                ${meanings.slice(0, 2).join(', ')}
            </div>
        `;

        container.appendChild(cardEl);
    });

    showCardDisplay();
}

// Show reading selection
function showReadingSelect() {
    document.querySelector('.reading-select').classList.remove('hidden');
    document.querySelector('.card-display').classList.add('hidden');
}

// Show card display
function showCardDisplay() {
    document.querySelector('.reading-select').classList.add('hidden');
    document.querySelector('.card-display').classList.remove('hidden');
}

// Update online status
function updateOnlineStatus() {
    const statusEl = document.getElementById('online-status');
    if (navigator.onLine) {
        statusEl.textContent = 'Online';
        statusEl.style.color = 'var(--accent-light)';
    } else {
        statusEl.textContent = 'Offline';
        statusEl.style.color = '#fbbf24';
    }
}
