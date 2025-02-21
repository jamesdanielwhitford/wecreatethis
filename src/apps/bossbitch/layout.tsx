// src/app/bossbitch/layout.tsx
import React from 'react';

export default function BossBitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Theme initialization script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Try to get the saved theme
              var savedTheme = localStorage.getItem('bossbitch-theme');
              var theme;
              
              if (savedTheme) {
                // Use saved theme if available
                theme = savedTheme;
              } else {
                // Otherwise use device preference
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              
              // Apply theme immediately
              document.documentElement.classList.add(theme + '-mode');
            })();
          `,
        }}
      />
      <div className="min-h-screen">
        {children}
      </div>
    </>
  );
}