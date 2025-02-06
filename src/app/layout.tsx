import { useEffect } from 'react';
import { checkForNewVersion } from '@/utils/version';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Check for new version on initial load
    checkForNewVersion();

    // Set up periodic version checks
    const versionCheckInterval = setInterval(checkForNewVersion, 60000); // Check every minute

    return () => clearInterval(versionCheckInterval);
  }, []);

  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}