// Chessle - Chess puzzle game
// Main application logic

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .then(() => console.log('Service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

// App initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('Chessle initialized');
});
