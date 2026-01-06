// Deck browser page logic

// Force clear old cached deck preferences
if (localStorage.getItem('tarot-deck-version') !== '2') {
    localStorage.setItem('tarot-deck-version', '2');
    localStorage.removeItem('tarot-current-deck');
    console.log('Cleared old deck cache - will use default golden-thread with correct paths');
}

document.addEventListener('DOMContentLoaded', () => {
    displayDeck();
    setupCardBackModal();
    restoreScrollPosition();
    setupScrollToTop();
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
            // Save scroll position before navigating
            saveScrollPosition();
            window.location.href = `deck-card-detail.html?cardName=${encodeURIComponent(card.name)}`;
        });

        container.appendChild(cardEl);
    });
}

function setupCardBackModal() {
    const modal = document.getElementById('card-back-modal');
    const openBtn = document.getElementById('card-back-settings-btn');
    const closeBtn = document.getElementById('close-card-back-modal');

    // Open modal
    openBtn.addEventListener('click', () => {
        renderCardBackOptions();
        modal.style.display = 'flex';
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function renderCardBackOptions() {
    const container = document.getElementById('card-back-options');
    const currentStyle = getCurrentCardBackStyle();
    container.innerHTML = '';

    Object.keys(CARD_BACK_STYLES).forEach(styleId => {
        const style = CARD_BACK_STYLES[styleId];
        const optionEl = document.createElement('div');
        optionEl.className = 'card-back-option';
        if (styleId === currentStyle) {
            optionEl.classList.add('selected');
        }

        // Generate a preview card back (use card index 0 for preview)
        const previewImage = generateCardBackPattern(styleId, 0);

        optionEl.innerHTML = `
            <div class="card-back-preview">
                <img src="${previewImage}" alt="${style.name}">
            </div>
            <div class="card-back-info">
                <h3>${style.name}</h3>
                <p>${style.description}</p>
            </div>
        `;

        optionEl.addEventListener('click', () => {
            // Update selection
            document.querySelectorAll('.card-back-option').forEach(el => {
                el.classList.remove('selected');
            });
            optionEl.classList.add('selected');

            // Save preference
            setCardBackStyle(styleId);
        });

        container.appendChild(optionEl);
    });
}

function saveScrollPosition() {
    sessionStorage.setItem('deckScrollPosition', window.scrollY.toString());
}

function restoreScrollPosition() {
    const savedPosition = sessionStorage.getItem('deckScrollPosition');
    if (savedPosition !== null) {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            window.scrollTo(0, parseInt(savedPosition, 10));
            // Clear the saved position after restoring
            sessionStorage.removeItem('deckScrollPosition');
        });
    }
}

function setupScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top when clicked
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

