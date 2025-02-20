import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Randle',
  description: 'Infinite Hardle',
  icons: {
    icon: [
      {
        url: '/randle-icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/randle-icon.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/randle-icon.png',
        sizes: '180x180',
      },
    ],
    shortcut: [
      {
        url: '/randle-icon.ico',
        sizes: 'any',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Randle',
  },
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-TileImage': '/randle-icon.png',
  },
};