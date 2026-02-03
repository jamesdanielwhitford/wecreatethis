/**
 * Migration Receiver - runs on wecreatethis.com
 * Loads data from wecreatethis.pages.dev via popup window and imports to local IndexedDB
 * Uses popup instead of iframe to bypass storage partitioning
 *
 * Usage: Include this script and call:
 *   migrateFromOldDomain({ dbName: 'birdle-db', stores: {...} })
 */

const MIGRATION_SOURCE = 'https://wecreatethis.pages.dev/migrate.html';
const MIGRATION_TIMEOUT = 15000; // 15 seconds

/**
 * Check if we should attempt migration
 * @param {string} dbName - The database name to check migration for
 * @returns {boolean}
 */
function shouldAttemptMigration(dbName) {
  // Don't migrate if already done
  if (localStorage.getItem(`migration_completed_${dbName}`)) {
    return false;
  }

  // Don't migrate if we're on the old domain
  if (window.location.hostname === 'wecreatethis.pages.dev') {
    return false;
  }

  // Only migrate on the new domain
  const validHosts = ['wecreatethis.com', 'www.wecreatethis.com'];
  if (!validHosts.includes(window.location.hostname)) {
    // Allow localhost for testing
    if (!window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')) {
      return false;
    }
  }

  return true;
}

/**
 * Main migration function
 * @param {Object} config - Configuration object
 * @param {string} config.dbName - Database name to import into
 * @param {Object} config.stores - Store configurations { storeName: { keyPath, autoIncrement } }
 * @param {Function} [config.onProgress] - Optional progress callback
 * @returns {Promise<Object>} Migration result
 */
async function migrateFromOldDomain(config) {
  const { dbName, stores, onProgress = () => {} } = config;

  if (!shouldAttemptMigration(dbName)) {
    return { migrated: false, reason: 'skipped' };
  }

  onProgress({ status: 'starting', message: 'Checking for data from old site...' });
  console.log(`Migration: Starting migration check for ${dbName}`);

  try {
    // Load data from old domain via popup
    const data = await loadDataFromOldDomain();

    console.log('Migration: Received data:', data ? Object.keys(data) : 'null');

    if (!data || !data[dbName]) {
      // No data to migrate for this database
      localStorage.setItem(`migration_completed_${dbName}`, 'no_data');
      console.log(`Migration: No data found for ${dbName}`);
      return { migrated: false, reason: 'no_data' };
    }

    const dbData = data[dbName];
    onProgress({ status: 'importing', message: 'Importing your data...' });
    console.log(`Migration: Importing ${Object.keys(dbData).length} stores for ${dbName}`);

    // Import the data
    const importResult = await importData(dbName, dbData, stores);

    // Mark migration as complete
    localStorage.setItem(`migration_completed_${dbName}`, Date.now().toString());

    onProgress({ status: 'complete', message: 'Data imported successfully!' });
    console.log(`Migration: Complete for ${dbName}`, importResult);

    return {
      migrated: true,
      imported: importResult
    };

  } catch (error) {
    console.error('Migration error:', error);

    // Don't retry on certain errors
    if (error.message.includes('timeout') || error.message.includes('blocked')) {
      localStorage.setItem(`migration_completed_${dbName}`, 'failed');
    }

    return {
      migrated: false,
      reason: 'error',
      error: error.message
    };
  }
}

/**
 * Load data from old domain via popup window
 * Popup has first-party storage access, bypassing storage partitioning
 * @returns {Promise<Object>} The exported data
 */
function loadDataFromOldDomain() {
  return new Promise((resolve, reject) => {
    let popup = null;
    let timeoutId = null;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('message', messageHandler);
      // Don't close popup - it closes itself after sending data
    };

    const messageHandler = (event) => {
      // Only accept messages from our migration helper
      if (!event.origin.includes('wecreatethis.pages.dev')) {
        return;
      }

      console.log('Migration: Received message from popup:', event.data?.type);

      if (event.data?.type === 'MIGRATION_DATA') {
        resolved = true;
        cleanup();

        if (event.data.success) {
          console.log('Migration: Data received successfully');
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || 'Failed to export data'));
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Open popup window
    // Small window since it just shows a loading spinner
    const width = 400;
    const height = 200;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    console.log('Migration: Opening popup to', MIGRATION_SOURCE);

    popup = window.open(
      MIGRATION_SOURCE,
      'migration_helper',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (!popup || popup.closed) {
      cleanup();
      console.log('Migration: Popup was blocked');
      // Popup blocked - treat as no data (user can manually migrate later)
      resolve(null);
      return;
    }

    // Timeout
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        console.log('Migration: Timeout waiting for popup');
        // Treat timeout as "no data" rather than error
        resolve(null);
      }
    }, MIGRATION_TIMEOUT);
  });
}

/**
 * Import data into IndexedDB
 * @param {string} dbName - Database name
 * @param {Object} dbData - Data to import { storeName: [items] }
 * @param {Object} storeConfigs - Store configurations
 * @returns {Promise<Object>} Import counts per store
 */
async function importData(dbName, dbData, storeConfigs) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(new Error('Could not open database'));

    request.onsuccess = async (event) => {
      const db = event.target.result;
      const result = {};

      try {
        for (const [storeName, items] of Object.entries(dbData)) {
          if (!items || items.length === 0) continue;

          // Check if store exists
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`Migration: Store ${storeName} not found, skipping`);
            continue;
          }

          console.log(`Migration: Importing ${items.length} items to ${storeName}`);
          const count = await importStore(db, storeName, items, storeConfigs[storeName]);
          result[storeName] = count;
        }

        db.close();
        resolve(result);
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

/**
 * Import items into a single store
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {Array} items
 * @param {Object} storeConfig
 * @returns {Promise<number>} Number of items imported
 */
function importStore(db, storeName, items, storeConfig = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    let imported = 0;

    transaction.oncomplete = () => resolve(imported);
    transaction.onerror = () => reject(transaction.error);

    for (const item of items) {
      // Deserialize any ArrayBuffer data
      const deserialized = deserializeItem(item);

      // Use put to avoid duplicates (will overwrite if key exists)
      try {
        const request = store.put(deserialized);
        request.onsuccess = () => imported++;
      } catch (error) {
        console.warn(`Migration: Could not import item to ${storeName}:`, error);
      }
    }
  });
}

/**
 * Deserialize item, converting base64 back to ArrayBuffer
 */
function deserializeItem(item) {
  if (!item || typeof item !== 'object') return item;

  // Handle special type markers
  if (item.__type === 'ArrayBuffer' && item.data) {
    return base64ToArrayBuffer(item.data);
  }
  if (item.__type === 'Uint8Array' && item.data) {
    return new Uint8Array(base64ToArrayBuffer(item.data));
  }

  const result = Array.isArray(item) ? [] : {};
  for (const [key, value] of Object.entries(item)) {
    if (value && typeof value === 'object') {
      result[key] = deserializeItem(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Export for use by apps
window.migrateFromOldDomain = migrateFromOldDomain;
