// Deck browser page logic

// Force clear old cached deck preferences
if (localStorage.getItem('tarot-deck-version') !== '2') {
    localStorage.setItem('tarot-deck-version', '2');
    localStorage.removeItem('tarot-current-deck');
    console.log('Cleared old deck cache - will use default golden-thread with correct paths');
}

document.addEventListener('DOMContentLoaded', () => {
    displayDeck();
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
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    container.innerHTML = '';

    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'deck-card';
        cardEl.style.cursor = 'pointer';

        let imagePath = getCardImagePath(card);

        // Ensure path doesn't have double slashes or old golden-thread path
        if (imagePath) {
            imagePath = imagePath.replace(/images\/golden-thread\//g, 'images/');
            imagePath = imagePath.replace(/\/\//g, '/');
        }

        cardEl.innerHTML = `
            ${imagePath ? `<img src="${imagePath}" alt="${card.name}" class="deck-card-image" onerror="console.error('Failed to load: ${imagePath}')">` : ''}
            <div class="deck-card-name">${card.name}</div>
        `;

        // Navigate to standalone card detail page
        cardEl.addEventListener('click', () => {
            window.location.href = `deck-card-detail.html?cardName=${encodeURIComponent(card.name)}`;
        });

        container.appendChild(cardEl);
    });
}

