import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { body, display } from './fonts';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sorrel & Salt',
  description: 'A compendium, ingredient store and grimoire.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Both fonts are applied as CSS variables rather than className, because the
  // Sass stacks ($font-body/$font-heading) reference --font-body and
  // --font-display and need them in scope for the whole document.
  //
  // No data-theme attribute is set: dark is the default and the system
  // preference is honoured (see globals.scss). A theme toggle would stamp the
  // attribute here.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
