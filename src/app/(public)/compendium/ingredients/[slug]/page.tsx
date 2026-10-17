import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import IngredientEntry from '../../../../../components/IngredientEntry';
import type { LinkedIngredient } from '../../../../../components/IngredientEntry/types';
import { compendiumHref } from '../../../../../components/CompendiumList/href';
import { NotFound } from '../../../../../lib/errors';
import { viewerIfSignedIn } from '../../../../../lib/viewer';
import { readCompendiumEntry } from '@/modules/ingredients';
import type { CompendiumEntryParams } from './types';

// One compendium entry, at its public address (M8.19; MB.80): readable by
// anyone, signed out included, and the address the coven's copy of the page
// names as canonical. The (public) layout owns `<main>`, so this renders
// none.
//
// The entry comes from `readCompendiumEntry`, a cached read that takes no
// session, so nothing private can reach it. The page itself is drawn per
// request: it asks `viewerIfSignedIn()`, which never redirects, only to
// decide whether to offer a curator Edit. A visitor with no session reads
// the page the same as ever.
//
// An unknown slug and a coven entry's slug both answer 404, since the read
// refuses them alike. A slug the entry has moved off answers 308 to its
// current address; MB.84 pins that response's headers.

const addressOf = (slug: string) => `/compendium/ingredients/${slug}` as Route;

async function entryAt(slug: string) {
  try {
    return await readCompendiumEntry(slug);
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

// Only the title: MB.84 owns the description and the canonical link of this
// page. A missing or moved address gets none, as it renders no page.
export async function generateMetadata({ params }: CompendiumEntryParams): Promise<Metadata> {
  const found = await entryAt((await params).slug);
  return found?.kind === 'entry' ? { title: found.detail.entry.name } : {};
}

// A coven entry cannot be read here, so a link to one has no page to go to.
const hrefOf = ({ slug, workspaceId }: LinkedIngredient): Route | undefined =>
  workspaceId === null ? addressOf(slug) : undefined;

export default async function CompendiumEntryPage({ params }: CompendiumEntryParams) {
  const { slug } = await params;
  const found = await entryAt(slug);
  if (!found) notFound();
  if (found.kind === 'moved') permanentRedirect(addressOf(found.slug));

  const shell = await viewerIfSignedIn();
  const { detail, movedAway } = found;

  return (
    <IngredientEntry
      detail={detail}
      hrefOf={hrefOf}
      edit={
        shell?.viewer.canCurate
          ? { href: compendiumHref({}, { edit: detail.entry.slug }) }
          : undefined
      }
      movedAway={movedAway ? { name: movedAway.name, href: addressOf(movedAway.slug) } : undefined}
    />
  );
}
