import { useState } from 'react';
import { ERROR_DETAIL_MAX_LENGTH } from './support-path';

// What an error screen hands the bug form (claude-docs/components/error-page.md, "Report This"). A client component
// may throw anything, not only an `Error`, and its error carries no digest.

/** A reference for an error with no digest. The leading `c` says it came from the browser, so no server log holds it. */
export function newErrorReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `c${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function errorDetailFrom(error: unknown): string {
  const detail =
    error instanceof Error
      ? error.message
        ? `${error.name}: ${error.message}`
        : error.name
      : String(error);
  return detail.slice(0, ERROR_DETAIL_MAX_LENGTH);
}

/** The digest where Next gives one, else a reference made once for this screen, and the error's detail. */
export function useErrorReport(error: unknown): { reference: string; detail: string } {
  const digest =
    error instanceof Error && 'digest' in error && typeof error.digest === 'string'
      ? error.digest
      : undefined;
  const [made] = useState(newErrorReference);
  return { reference: digest ?? made, detail: errorDetailFrom(error) };
}
