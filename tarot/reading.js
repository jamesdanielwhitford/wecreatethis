// Reading detail page logic

let currentReading = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    loadReading();
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

    // Display cards
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    reading.cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'tarot-card';

        const meanings = card.isReversed ? card.reversed : card.upright;
        const orientation = card.isReversed ? ' (Reversed)' : '';

        cardEl.innerHTML = `
            <div class="card-position">${card.position.name}</div>
            <div class="card-name">${card.name}${orientation}</div>
            <div class="card-meaning">
                ${meanings.join(' • ')}
            </div>
        `;

        container.appendChild(cardEl);
    });
}
