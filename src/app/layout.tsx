import { Metadata } from 'next';
import { ThemeProvider } from '@/features/theme';
import "@/styles/globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}