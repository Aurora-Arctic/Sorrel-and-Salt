import { notFound } from 'next/navigation';
import { NotFound } from './errors';
import { stripMarks } from './help-marks';
import { helpPath, type HelpAddressed } from './help-paths';

/** A public page reads at most this many rows of a list; the help centre is a few dozen pages. */
export const HELP_PAGE_LIMIT = 200;

/** The help front page's lede, which its skeleton draws too. */
export const HELP_LEDE =
  'Guides to the Compendium, your coven, its ingredients and grimoire, and the words we use.';

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
  return {
    title: row.title,
    summary: row.summary === null ? null : stripMarks(row.summary),
    href: helpPath(row),
  };
}

type GuideLink = { title: string; href: string };

/** The pages either side of `href` in its guide, which runs from the guide itself through its sub pages in the order given; a guide with no sub pages has neither. */
export function guideSteps(
  guide: GuideLink,
  pages: readonly GuideLink[],
  href: string,
): { previous?: GuideLink; next?: GuideLink } {
  const sequence = pages.length > 0 ? [guide, ...pages] : [];
  const at = sequence.findIndex((page) => page.href === href);
  if (at < 0) return {};
  const steps: { previous?: GuideLink; next?: GuideLink } = {};
  const previous = sequence[at - 1];
  const next = sequence[at + 1];
  if (previous) steps.previous = { title: previous.title, href: previous.href };
  if (next) steps.next = { title: next.title, href: next.href };
  return steps;
}
