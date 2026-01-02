// Deck browser page logic

document.addEventListener('DOMContentLoaded', () => {
    displayDeck();
    setupDeckSelector();
    updateCurrentDeckDisplay();
});

function displayDeck() {
    // Separate cards by type
    const majorArcana = TAROT_CARDS.filter(card => card.number !== undefined);
    const wands = TAROT_CARDS.filter(card => card.suit === 'wands');
    const cups = TAROT_CARDS.filter(card => card.suit === 'cups');
    const swords = TAROT_CARDS.filter(card => card.suit === 'swords');
    const pentacles = TAROT_CARDS.filter(card => card.suit === 'pentacles');

    // Render each section
    renderCardGrid('major-arcana-grid', majorArcana);
    renderCardGrid('wands-grid', wands);
    renderCardGrid('cups-grid', cups);
    renderCardGrid('swords-grid', swords);
    renderCardGrid('pentacles-grid', pentacles);
}

function renderCardGrid(containerId, cards) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'deck-card';
        cardEl.style.cursor = 'pointer';

        const imagePath = getCardImagePath(card);

        cardEl.innerHTML = `
            ${imagePath ? `<img src="${imagePath}" alt="${card.name}" class="deck-card-image">` : ''}
            <div class="deck-card-name">${card.name}</div>
        `;

        // Navigate to standalone card detail page
        cardEl.addEventListener('click', () => {
            window.location.href = `deck-card-detail.html?cardName=${encodeURIComponent(card.name)}`;
        });

        container.appendChild(cardEl);
    });
}

function setupDeckSelector() {
    const modal = document.getElementById('choose-deck-modal');
    const chooseDeckBtn = document.getElementById('choose-deck-btn');
    const cancelBtn = document.getElementById('cancel-deck-btn');
    const deckOptions = document.querySelectorAll('.deck-option:not(.disabled)');

    // Open modal
    chooseDeckBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        updateDeckStatuses();
    });

    // Close modal
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle deck selection
    deckOptions.forEach(option => {
        option.addEventListener('click', async () => {
            const deckId = option.dataset.deck;
            const currentDeck = getCurrentDeck();

            if (deckId === currentDeck) {
                return; // Already using this deck
            }

            // Show loading state
            option.classList.add('loading');
            const statusEl = option.querySelector('.deck-status');
            const originalStatus = statusEl.textContent;
            statusEl.textContent = 'Downloading...';

            // Switch deck
            const success = await switchDeck(deckId);

            if (success) {
                statusEl.textContent = '✓ Downloaded';
                updateCurrentDeckDisplay();

                // Reload page to show new deck images
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                statusEl.textContent = '✗ Failed';
                setTimeout(() => {
                    statusEl.textContent = originalStatus;
                }, 2000);
            }

            option.classList.remove('loading');
        });
    });
}

function updateDeckStatuses() {
    const currentDeck = getCurrentDeck();
    const deckOptions = document.querySelectorAll('.deck-option:not(.disabled)');

    deckOptions.forEach(option => {
        const deckId = option.dataset.deck;
        const statusEl = option.querySelector('.deck-status');

        if (deckId === currentDeck) {
            option.classList.add('selected');
            statusEl.textContent = '✓ Active';
        } else {
            option.classList.remove('selected');
            statusEl.textContent = 'Download';
        }
    });
}

function updateCurrentDeckDisplay() {
    const currentDeckId = getCurrentDeck();
    const config = getDeckConfig(currentDeckId);
    const nameEl = document.getElementById('current-deck-name');

    if (nameEl) {
        nameEl.textContent = config.name;
    }
}
