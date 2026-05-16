// Run this in the browser DevTools console on the symbolicritual page.
// Edit the ITEMS array below with your real data, then paste and run.
//
// media_url: a full URL or a path to a file served by your local server
//   e.g. 'http://localhost:8765/symbolicritual/test-assets/photo.jpg'
// captured_at: ISO 8601 string — the time the photo/video was taken
// lat/lng: decimal degrees (negative = S/W)
// alt: required for images, describe what is in the image
// caption: optional text shown below metadata
// lang: BCP 47 tag for the caption language, e.g. 'en', 'ar', 'fr', 'zh'
// media_type: 'image' or 'video'

const ITEMS = [
  {
    id: 1,
    media_type: 'image',
    media_url: 'REPLACE_WITH_URL_OR_PATH',
    alt: 'REPLACE with a description of the image',
    captured_at: '2026-05-16T11:09',
    lat: -33.8688,
    lng: 151.2093,
    caption: null,
    lang: 'en',
  },
  // Add more items here...
];

(async () => {
  const DB_NAME = 'symbolic-ritual-db';
  const DB_VERSION = 1;

  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('items')) {
        const store = d.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('captured_at', 'captured_at', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  for (const item of ITEMS) store.put(item);

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  console.log(`Seeded ${ITEMS.length} item(s). Reloading...`);
  location.reload();
})();
