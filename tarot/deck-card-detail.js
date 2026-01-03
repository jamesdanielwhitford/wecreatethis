// Standalone card detail page (from deck browser)

let currentCard = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCardDetail();
});

function loadCardDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const cardName = urlParams.get('cardName');

    if (!cardName) {
        window.location.href = 'deck.html';
        return;
    }

    // Find card by name
    currentCard = TAROT_CARDS.find(card => card.name === cardName);

    if (!currentCard) {
        alert('Card not found');
        window.location.href = 'deck.html';
        return;
    }

    displayCardDetail(currentCard);
}

function displayCardDetail(card) {
    const imagePath = getCardImagePath(card);

    // Set card image
    const cardImage = document.getElementById('card-image');
    if (imagePath) {
        cardImage.src = imagePath;
    }

    // Set card name
    document.getElementById('card-name-display').textContent = card.name;

    // Set card description
    const description = getCardDescription(card.name);
    const descriptionSection = document.getElementById('card-description-section');
    if (description) {
        document.getElementById('card-description-text').textContent = description;
        descriptionSection.style.display = 'block';
    } else {
        descriptionSection.style.display = 'none';
    }

    // Set upright meanings
    const uprightList = document.getElementById('upright-list');
    uprightList.innerHTML = '';
    card.upright.forEach(meaning => {
        const li = document.createElement('li');
        li.textContent = meaning;
        uprightList.appendChild(li);
    });

    // Set reversed meanings
    const reversedList = document.getElementById('reversed-list');
    reversedList.innerHTML = '';
    card.reversed.forEach(meaning => {
        const li = document.createElement('li');
        li.textContent = meaning;
        reversedList.appendChild(li);
    });
}
