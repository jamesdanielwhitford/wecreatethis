// IndexedDB wrapper for Pomodoro settings
const DB_NAME = 'pomodoro-db';
const DB_VERSION = 1;
const SETTINGS_STORE = 'settings';

let db = null;

// Initialize database
async function openDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Get settings from database
async function getSettings() {
  await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get('preferences');

    request.onsuccess = () => {
      const settings = request.result;
      if (settings) {
        resolve(settings);
      } else {
        // Return default settings if none exist
        resolve(getDefaultSettings());
      }
    };

    request.onerror = () => {
      console.error('Failed to get settings:', request.error);
      reject(request.error);
    };
  });
}

// Save settings to database
async function saveSettings(settings) {
  await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.put(settings);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to save settings:', request.error);
      reject(request.error);
    };
  });
}

// Get default settings
function getDefaultSettings() {
  return {
    id: 'preferences',
    workDuration: 25,        // minutes
    shortBreakDuration: 5,   // minutes
    longBreakDuration: 15,   // minutes
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
    autoStart: false
  };
}
