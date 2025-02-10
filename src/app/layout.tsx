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
        url: '/your-logo.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/your-logo.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/your-logo.png',
        sizes: '180x180',
      },
    ],
    shortcut: [
      {
        url: '/your-logo.ico',
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
    'msapplication-TileImage': '/your-logo.png',
  },
};

import { VersionChecker } from '@/components/VersionChecker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
