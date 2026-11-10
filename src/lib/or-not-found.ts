import { notFound } from 'next/navigation';
import { Forbidden, NotFound } from './errors';

// A read that finds nothing is a page's 404 or its empty case, never a server error. `also` adds the refusals a page treats the same way: a coven's pages answer a stranger's `Forbidden` with the 404 a missing row gets. Any other failure is rethrown.

type Refusal = typeof NotFound | typeof Forbidden;

const refusedBy = (error: unknown, also: Refusal[]) =>
  error instanceof NotFound || also.some((refusal) => error instanceof refusal);

/** The read's answer, or the site's 404. */
export async function orNotFound<T>(read: () => Promise<T>, ...also: Refusal[]): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (refusedBy(error, also)) notFound();
    throw error;
  }
}

/** The read's answer, or `undefined` for the page to draw its own empty case. */
export async function orMissing<T>(
  read: () => Promise<T>,
  ...also: Refusal[]
): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (refusedBy(error, also)) return undefined;
    throw error;
  }
}
