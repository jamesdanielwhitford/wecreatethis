'use client';

import { useEffect } from 'react';
import { checkForNewVersion } from '@/utils/version';

export function VersionChecker() {
  useEffect(() => {
    // Check for new version on initial load
    checkForNewVersion();
    // Set up periodic version checks
    const versionCheckInterval = setInterval(checkForNewVersion, 60000); // Check every minute
    return () => clearInterval(versionCheckInterval);
  }, []);

  return null;
}