import { notFound } from 'next/navigation';
import { NotFound } from './errors';
import { helpPath, type HelpAddressed } from './help-paths';

/** A public page reads at most this many rows of a list; the help centre is a few dozen pages. */
export const HELP_PAGE_LIMIT = 200;

/** A read that finds nothing answers the site's 404. */
export async function orNotFound<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
}

/** The link a list draws for a row: its title and summary at its address. */
export function linkTo(row: HelpAddressed & { title: string; summary: string | null }) {
  return { title: row.title, summary: row.summary, href: helpPath(row) };
}
