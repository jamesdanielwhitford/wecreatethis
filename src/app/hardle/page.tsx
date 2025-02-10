import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hardle!',
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
      },
      {
        url: '/hardle.ico',
        sizes: 'any',
      }
    ],
  },
};

import HardleGame from './game';

export default function HardlePage() {
  return <HardleGame />;
}
