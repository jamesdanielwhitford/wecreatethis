import { UserData } from './types';

const OFFLINE_QUEUE_KEY = 'bossbitch_offline_queue';
const OFFLINE_DATA_KEY = 'bossbitch_offline_data';

// Add interface for ServiceWorkerRegistration with sync
interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync: SyncManager;
}

interface OfflineAction {
  id: string;
  timestamp: number;
  type: 'update' | 'add' | 'delete';
  path: string;
  data?: Partial<UserData>;
}

export class OfflineManager {
  static async storeOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
    const queue = await this.getOfflineQueue();
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newAction);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    // Request sync if available
    if ('serviceWorker' in navigator) {
      try {
        // Get the service worker registration first
        const registration = await navigator.serviceWorker.ready;
        
        // Now check if sync is available on the registration
        if ('sync' in registration) {
          // Cast the registration to the extended type that includes sync
          const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
          await extendedRegistration.sync.register('sync-goals');
        }
      } catch (error) {
        console.error('Error registering sync:', error);
      }
    }
  }

  static async getOfflineQueue(): Promise<OfflineAction[]> {
    const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  }

  static async clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  static async storeOfflineData(data: Partial<UserData>) {
    localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(data));
  }

  static async getOfflineData(): Promise<Partial<UserData> | null> {
    const dataStr = localStorage.getItem(OFFLINE_DATA_KEY);
    return dataStr ? JSON.parse(dataStr) : null;
  }

  static async clearOfflineData() {
    localStorage.removeItem(OFFLINE_DATA_KEY);
  }

  static async removeOfflineAction(actionId: string) {
    const queue = await this.getOfflineQueue();
    const updatedQueue = queue.filter(action => action.id !== actionId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }

  static registerOnlineListener(callback: () => void) {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
  }

  static registerOfflineListener(callback: () => void) {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
  }
}