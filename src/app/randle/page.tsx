import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Randle!',
  description: 'Infinite Hardle!',
  icons: {
    icon: [
      {
        url: '/randle-icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/randle-icon.png',
        type: 'image/png',
      },
      {
        url: '/randle.ico',
        sizes: 'any',
      }
    ],
  },
};

import RandleGame from './game';

export default function RandlePage() {
  return <RandleGame />;
}
