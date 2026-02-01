// Card detail page logic

let currentReading = null;
let currentCard = null;
let cardIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    loadCardDetail();
});

async function loadCardDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const readingId = parseInt(urlParams.get('readingId'));
    cardIndex = parseInt(urlParams.get('cardIndex'));

    if (!readingId || cardIndex === null) {
        window.location.href = 'index';
        return;
    }

    currentReading = await getReading(readingId);

    if (!currentReading || !currentReading.cards[cardIndex]) {
        alert('Card not found');
        window.location.href = 'index';
        return;
    }

    currentCard = currentReading.cards[cardIndex];
    displayCardDetail(currentCard);

    // Setup back button
    document.getElementById('back-btn').addEventListener('click', async (e) => {
        e.preventDefault();

        // Initialize revealedCardIndex if not set (for older readings)
        if (currentReading.revealedCardIndex === undefined) {
            currentReading.revealedCardIndex = 0;
        }

        // Reveal next card if current card was just revealed (including the last card)
        if (cardIndex === currentReading.revealedCardIndex) {
            currentReading.revealedCardIndex++;
            await updateReading(currentReading);
        }

        window.location.href = `reading?id=${readingId}`;
    });
}

function displayCardDetail(card) {
    const imagePath = getCardImagePath(card);
    const reversedClass = card.isReversed ? ' reversed' : '';
    const orientation = card.isReversed ? ' (Reversed)' : '';

    // Set card image
    const cardImage = document.getElementById('card-image');
    if (imagePath) {
        cardImage.src = imagePath;
        cardImage.className = 'card-image-large' + reversedClass;
    }

    // Set position label
    document.getElementById('card-position-label').textContent = card.position.name;

    // Set card name
    document.getElementById('card-name-display').textContent = card.name + orientation;

    // Set meanings
    const meanings = card.isReversed ? card.reversed : card.upright;
    const meaningHeading = card.isReversed ? 'Reversed' : 'Upright';
    document.getElementById('meaning-heading').textContent = meaningHeading;

    const meaningList = document.getElementById('meaning-list');
    meaningList.innerHTML = '';
    meanings.forEach(meaning => {
        const li = document.createElement('li');
        li.textContent = meaning;
        meaningList.appendChild(li);
    });

    // Set position description
    document.getElementById('position-description-text').textContent = card.position.description;

    // Set card description
    const description = getCardDescription(card.name);
    const descriptionSection = document.getElementById('card-description-section');
    if (description) {
        document.getElementById('card-description-text').textContent = description;
        descriptionSection.style.display = 'block';
    } else {
        descriptionSection.style.display = 'none';
    }
}
