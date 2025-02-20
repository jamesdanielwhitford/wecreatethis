import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hardle',
  description: 'Harder Wordle',
  icons: {
    icon: [
      {
        url: '/hardle-icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/hardle-icon.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/hardle-icon.png',
        sizes: '180x180',
      },
    ],
    shortcut: [
      {
        url: '/hardle-icon.ico',
        sizes: 'any',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hardle',
  },
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-TileImage': '/hardle-icon.png',
  },
};