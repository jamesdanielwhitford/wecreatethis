// Deck Manager - Handles deck selection and caching

const DECK_CONFIG = {
    'rider-waite': {
        name: 'Rider-Waite-Smith',
        description: 'The classic tarot deck',
        imagePrefix: 'images/',
        imageExtension: '.webp'
    },
    'golden-thread': {
        name: 'Golden Thread',
        description: 'Modern minimalist design',
        imagePrefix: 'images/golden-thread/',
        imageExtension: '.webp'
    }
};

const CURRENT_DECK_KEY = 'tarot-current-deck';

// Get current deck from localStorage
function getCurrentDeck() {
    return localStorage.getItem(CURRENT_DECK_KEY) || 'rider-waite';
}

// Set current deck in localStorage
function setCurrentDeck(deckId) {
    localStorage.setItem(CURRENT_DECK_KEY, deckId);
}

// Get deck configuration
function getDeckConfig(deckId) {
    return DECK_CONFIG[deckId] || DECK_CONFIG['rider-waite'];
}

// Generate list of all image URLs for a deck
function getDeckImageUrls(deckId) {
    const config = getDeckConfig(deckId);
    const urls = [];

    TAROT_CARDS.forEach(card => {
        const imagePath = getCardImagePath(card);
        if (imagePath) {
            // Convert relative path to absolute URL for caching
            const url = `/tarot/${imagePath}`;
            urls.push(url);
        }
    });

    return urls;
}

// Cache a deck's images using service worker
async function cacheDeck(deckId) {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const imageUrls = getDeckImageUrls(deckId);

    // Send message to service worker to cache the deck
    if (registration.active) {
        registration.active.postMessage({
            type: 'CACHE_DECK',
            deckId: deckId,
            imageUrls: imageUrls
        });
        return true;
    }

    return false;
}

// Remove old deck images from cache
async function removeDeckFromCache(deckId) {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const imageUrls = getDeckImageUrls(deckId);

    if (registration.active) {
        registration.active.postMessage({
            type: 'REMOVE_DECK',
            deckId: deckId,
            imageUrls: imageUrls
        });
        return true;
    }

    return false;
}

// Switch to a new deck
async function switchDeck(newDeckId) {
    const oldDeckId = getCurrentDeck();

    if (oldDeckId === newDeckId) {
        console.log('Already using this deck');
        return true;
    }

    try {
        // Cache new deck images
        await cacheDeck(newDeckId);

        // Remove old deck images (if different)
        if (oldDeckId !== newDeckId) {
            await removeDeckFromCache(oldDeckId);
        }

        // Update current deck
        setCurrentDeck(newDeckId);

        console.log(`Switched to deck: ${newDeckId}`);
        return true;
    } catch (error) {
        console.error('Error switching deck:', error);
        return false;
    }
}
