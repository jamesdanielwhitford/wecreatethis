import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstallable(false);
      }
    };
    checkInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptToInstall = async () => {
    if (prompt) {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstallable(false);
      }
    }
  };

  return { isInstallable, promptToInstall };
}