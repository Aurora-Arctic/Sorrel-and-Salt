import type { ReactNode } from 'react';

export interface EmailLayoutProps {
  preview: string;
  heading: string;
  origin: string;
  /** Optional in the type because `createElement` passes children apart from the props. */
  children?: ReactNode;
}

/** A run of text in the anchor Zoho Mail leaves alone (`Ink` in layout.ts). */
export interface InkProps {
  className: string;
  color: string;
  /** Repeated on the anchor for Word, which does not always inherit it. */
  font?: string;
  /** Optional in the type because `createElement` passes children apart from the props. */
  children?: ReactNode;
}

/** A prop, never React context: Next compiles these as server components (src/lib/auth.ts imports them), where `createContext` does not exist. */
export type Part = 'html' | 'text';
