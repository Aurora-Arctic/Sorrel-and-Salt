import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import IngredientEntry from '../../../../../components/IngredientEntry';
import { pageTitleOf } from '../../../../../components/IngredientEntry/page-title';
import type { LinkedIngredient } from '../../../../../components/IngredientEntry/types';
import { NotFound } from '../../../../../lib/errors';
import { entryJsonLd } from '../../../../../lib/json-ld';
import { entryDescription, publicPageMetadata } from '../../../../../lib/page-metadata';
import { viewerIfSignedIn } from '../../../../../lib/viewer';
import { entryValues } from '@/app/entry-values';
import { readCompendiumEntry } from '@/modules/ingredients';
import { publicCupboardOf } from './cupboard';
import { covensHolding } from '@/app/plus-covens';
import type { CompendiumEntryParams } from './types';

// One compendium entry at its public address: readable signed out, and the address the coven's copy
// names as canonical. The (public) layout owns `<main>`, so this renders none. The entry comes from
// the cached, sessionless `readCompendiumEntry`; the page itself is drawn per request, because a
// signed-in viewer gets a curator Edit and their cupboard choices (`cupboard.ts`). An unknown slug and
// a coven entry's slug both answer 404; a moved slug answers 308 to the current address.

const addressOf = (slug: string) => `/compendium/ingredients/${slug}` as Route;

async function entryAt(slug: string) {
  try {
    return await readCompendiumEntry(slug);
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

// Title (the formal name tells two entries with one label apart), description and
// canonical link. A missing or moved address gets none, as it renders no page.
export async function generateMetadata({ params }: CompendiumEntryParams): Promise<Metadata> {
  const found = await entryAt((await params).slug);
  if (found?.kind !== 'entry') return {};
  const { entry } = found.detail;
  const title = pageTitleOf(entry);
  return publicPageMetadata(
    title,
    entryDescription(title, entry.description),
    addressOf(entry.slug),
  );
}

// A coven entry cannot be read here, so a link to one has no page to go to.
const hrefOf = ({ slug, workspaceId }: LinkedIngredient): Route | undefined =>
  workspaceId === null ? addressOf(slug) : undefined;

export default async function CompendiumEntryPage({ params, searchParams }: CompendiumEntryParams) {
  const { slug } = await params;
  const found = await entryAt(slug);
  if (!found) notFound();
  if (found.kind === 'moved') permanentRedirect(addressOf(found.slug));

  const shell = await viewerIfSignedIn();
  const { detail, movedAway } = found;
  const entry = detail.entry;

  // A bare `?edit` opens the compendium's edit modal over this page. The form's values are read
  // only for a curator who asks, as they are the longest read the page makes.
  const canEdit = shell?.viewer.canCurate === true;
  const own = addressOf(entry.slug);
  const search = await searchParams;
  const opened =
    canEdit && 'edit' in search
      ? { id: entry.id, values: await entryValues(entry, null) }
      : undefined;
  // The covens of the viewer's that hold the entry, read once: the shelf mark before the
  // name says any does, and the cupboard choices say which. Someone in no coven has none to ask.
  const holding = shell?.workspaces.length ? await covensHolding(entry.id) : [];
  const covens = shell ? await publicCupboardOf(entry, own, search, holding) : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        // Our own serialiser's output, with `<` escaped (src/lib/json-ld.ts).
        dangerouslySetInnerHTML={{ __html: entryJsonLd({ ...entry, folkNames: detail.folkNames }) }}
      />
      <IngredientEntry
        detail={detail}
        hrefOf={hrefOf}
        back={{ href: '/compendium' as Route, label: 'Compendium' }}
        edit={
          canEdit
            ? {
                href: `${own}?edit` as Route,
                closeHref: own,
                deletedHref: '/compendium' as Route,
                opened,
              }
            : undefined
        }
        covens={covens}
        heldInCovens={holding.length > 0}
        movedAway={
          movedAway ? { name: movedAway.name, href: addressOf(movedAway.slug) } : undefined
        }
      />
    </>
  );
}
