import type { ReactNode } from 'react';

export interface EmailLayoutProps {
  /** The line a client shows beside the subject in the inbox. */
  preview: string;
  heading: string;
  /** The site's origin, which serves the images and fonts under /email/. */
  origin: string;
  children: ReactNode;
}

/** A run of text in the anchor Zoho Mail leaves alone (`Ink` in layout.tsx). */
export interface InkProps {
  /** The class the light theme's rule targets. */
  className: string;
  color: string;
  /** Repeated on the anchor for Word, which does not always inherit it. */
  font?: string;
  children: ReactNode;
}

/**
 * Which part of the message is rendering. Where the two media differ, a
 * template words each its own way. A prop, never React context or state:
 * src/lib/auth.ts imports the templates, so Next compiles them as server
 * components, where `createContext` does not exist.
 */
export type Part = 'html' | 'text';
