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
      }
    ],
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