import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Randle',
  description: 'Random word puzzle game',
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
        url: '/randle.ico',
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

import RandleGame from './game';

export default function RandlePage() {
  return <RandleGame />;
}
