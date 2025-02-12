import { Metadata } from 'next';
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | wecreatethis.com',
    default: 'wecreatethis.com',
  },
  description: 'we create this',
  icons: {
    icon: [
      {
        url: '/your-icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/your-icon.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/your-icon.png',
        sizes: '180x180',
      },
    ],
    shortcut: [
      {
        url: '/your-icon.ico',
        sizes: 'any',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'wecreatethis.com',
  },
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-TileImage': '/your-icon.png',
  },
};

import { ThemeProvider } from '@/contexts/ThemeContext';
import { VersionChecker } from '@/components/VersionChecker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <VersionChecker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
