// Reading detail page logic

let currentReading = null;
let showingInfo = false;

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    loadReading();
    setupToggleButton();
});

async function loadReading() {
    const urlParams = new URLSearchParams(window.location.search);
    const readingId = parseInt(urlParams.get('id'));

    if (!readingId) {
        window.location.href = 'index.html';
        return;
    }

    currentReading = await getReading(readingId);

    if (!currentReading) {
        alert('Reading not found');
        window.location.href = 'index.html';
        return;
    }

    displayReading(currentReading);
}

function displayReading(reading) {
    // Add spread-specific class to body for layout
    document.body.className = `reading-page spread-${reading.spreadType}`;

    // Set title and meta info
    document.getElementById('reading-title').textContent = reading.title;

    const date = new Date(reading.date);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('reading-info').textContent = `${reading.spreadName} • ${dateStr}`;

    // Initialize revealedCardIndex if not set (for older readings)
    if (reading.revealedCardIndex === undefined) {
        reading.revealedCardIndex = 0;
    }

    // Display cards
    const container = document.getElementById('cards-view');
    container.innerHTML = '';

    reading.cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'tarot-card';

        const isRevealed = index <= reading.revealedCardIndex;
        const isNextCard = index === reading.revealedCardIndex;
        const isLastCard = index === reading.cards.length - 1;
        const imagePath = getCardImagePath(card);
        const reversedClass = card.isReversed ? ' reversed' : '';

        // For single card readings with a message, show the message instead of "Your Message"
        let positionLabel = card.position.name;
        if (reading.spreadType === 'single' && reading.message && reading.message.trim()) {
            positionLabel = reading.message;
        }

        if (isRevealed) {
            // Show revealed card with full details
            cardEl.style.cursor = 'pointer';

            // Add golden glow to the current card to read
            if (isNextCard) {
                cardEl.classList.add('next-to-read');
            }

            cardEl.innerHTML = `
                <div class="card-position">${positionLabel}</div>
                ${imagePath ? `<img src="${imagePath}" alt="${card.name}" class="card-image${reversedClass}">` : ''}
                <div class="card-name">${card.name}</div>
            `;

            // Navigate to card detail when clicked
            cardEl.addEventListener('click', () => {
                window.location.href = `card-detail.html?readingId=${currentReading.id}&cardIndex=${index}`;
            });
        } else {
            // Show face-down card with procedural pattern overlay
            cardEl.classList.add('face-down');
            const cardBackStyle = getCurrentCardBackStyle();
            const cardBackImage = generateCardBackPattern(cardBackStyle, index);
            cardEl.innerHTML = `
                <div class="card-position">${positionLabel}</div>
                <div class="card-image-wrapper">
                    ${imagePath ? `<img src="${imagePath}" alt="${card.name}" class="card-image">` : ''}
                    <img src="${cardBackImage}" alt="Card back" class="card-back-overlay">
                </div>
                <div class="card-name">&nbsp;</div>
            `;
        }

        container.appendChild(cardEl);
    });

    // Display spread info
    displaySpreadInfo(reading);
}

function displaySpreadInfo(reading) {
    const spread = SPREADS[reading.spreadType];
    if (!spread) return;

    const infoContainer = document.getElementById('spread-description');
    document.getElementById('spread-name').textContent = spread.name;

    let html = `<p>${spread.description || 'A powerful spread for divination and self-reflection.'}</p>`;

    // Add positions explanation
    html += `<h3>Card Positions</h3><ul>`;
    spread.positions.forEach(pos => {
        html += `<li><strong>${pos.name}</strong>${pos.description}</li>`;
    });
    html += `</ul>`;

    // Add how to read section
    html += `<h3>How to Read This Spread</h3>`;
    html += getSpreadGuidance(reading.spreadType);

    infoContainer.innerHTML = html;
}

function getSpreadGuidance(spreadType) {
    const guidance = {
        single: `
            <p>The single card reading offers direct, focused insight into your question or situation.</p>
            <p><strong>How to interpret:</strong> Consider the card's traditional meaning in relation to your question. Pay attention to whether it's upright or reversed, as this affects the energy of the message.</p>
        `,
        three: `
            <p>The three card spread provides a narrative journey through time, offering context and direction.</p>
            <p><strong>How to interpret:</strong> Read the cards as a story flowing from Past to Present to Future. Look for connections between the cards - do they reinforce each other or present contrasts? The Past shows influences, the Present reveals your current state, and the Future suggests where you're heading if you continue on this path.</p>
        `,
        celtic: `
            <p>The Celtic Cross is one of the most comprehensive spreads, offering deep insight into complex situations.</p>
            <p><strong>How to interpret:</strong> Start with cards 1 and 2 (Present and Challenge) to understand the core situation. Then read cards 3-4 (Foundation and Past) for context. Cards 5-6 (Crown and Future) show potential outcomes. Finally, cards 7-10 reveal internal factors (Self), external influences (Environment), your emotional state (Hopes/Fears), and the likely outcome.</p>
            <p>Take your time with this spread - each card adds layers of meaning to the overall picture.</p>
        `
    };

    return guidance[spreadType] || '';
}

function setupToggleButton() {
    const toggleBtn = document.getElementById('toggle-view-btn');
    const cardsView = document.getElementById('cards-view');
    const infoView = document.getElementById('info-view');

    toggleBtn.addEventListener('click', () => {
        showingInfo = !showingInfo;

        if (showingInfo) {
            // Show info, hide cards
            cardsView.style.display = 'none';
            infoView.style.display = 'block';
            toggleBtn.classList.remove('info-btn');
            toggleBtn.classList.add('cards-btn');
            toggleBtn.querySelector('.btn-icon').textContent = '';
        } else {
            // Show cards, hide info
            cardsView.style.display = '';  // Remove inline style to let CSS take over
            infoView.style.display = 'none';
            toggleBtn.classList.remove('cards-btn');
            toggleBtn.classList.add('info-btn');
            toggleBtn.querySelector('.btn-icon').textContent = 'i';
        }
    });
}
