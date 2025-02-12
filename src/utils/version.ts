export const APP_VERSION = '1.2.4';

export async function checkForNewVersion() {
  try {
    const response = await fetch('/api/version');
    const { version } = await response.json();
    
    // Compare with current version
    const hasNewVersion = version !== APP_VERSION;
    
    if (hasNewVersion) {
      // Clear cache and reload
      if ('caches' in window) {
        await caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
      // Reload without forcing from server
      window.location.reload();
    }
  } catch (error) {
    console.error('Version check failed:', error);
  }
}
