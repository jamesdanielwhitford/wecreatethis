import { Metadata } from 'next';
import "./globals.css";

// This is where you define your metadata
export const metadata: Metadata = {
  title: 'wecreatethis.com',
  description: 'we create this',
  icons: {
    icon: '/your-logo.svg', // Add your logo file to public directory
  },
};

// Move the version checking to a client component
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
