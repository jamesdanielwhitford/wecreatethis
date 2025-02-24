import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BossBitch - Goal Tracking',
  description: 'Track your financial goals and celebrate your wins',
  manifest: '/manifest.json',
  themeColor: '#7C3AED',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BossBitch',
  },
  formatDetection: {
    telephone: false,
  },
};