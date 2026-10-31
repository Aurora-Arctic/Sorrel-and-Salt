import type { Metadata, Route } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import IngredientEntry from '../../../../../components/IngredientEntry';
import { pageTitleOf } from '../../../../../components/IngredientEntry/page-title';
import type { LinkedIngredient } from '../../../../../components/IngredientEntry/types';
import { Forbidden, NotFound } from '../../../../../lib/errors';
import { getSession } from '../../../../../lib/request-session';
import ShownToggle from '../../../../../components/IngredientEntry/shown-toggle';
import ReviewMark from '../../../../../components/IngredientEntry/review-mark';
import { cardName } from '../../../../../components/IngredientCard/card-name';
import { curates } from '../../../../../lib/site-roles';
import { entryJsonLd } from '../../../../../lib/json-ld';
import { entryDescription, publicPageMetadata } from '../../../../../lib/page-metadata';
import { viewerIfSignedIn } from '../../../../../lib/viewer';
import { entryValues } from '@/app/entry-values';
import {
  getIngredient,
  readCompendiumEntry,
  readCompendiumEntryAsCurator,
  readCompendiumReview,
} from '@/modules/ingredients';
import { publicCupboardOf } from './cupboard';
import { covensHolding } from '@/app/plus-covens';
import type { CompendiumEntryParams } from './types';

// One compendium entry at its public address, readable signed out. The read is cached and sessionless,
// but a curator also reaches a hidden entry, uncached. The page is drawn per request for a signed-in viewer's Edit and cupboard choices. An unknown or
// coven slug answers 404; a moved slug answers 308.

const addressOf = (slug: string) => `/compendium/ingredients/${slug}` as Route;

// The public read first: cached, with no session. Only when it finds nothing is a session asked for, and
// only a curator or admin gets a second, uncached read that reaches a hidden entry. Everyone else gets the 404.
const entryAt = cache(async (slug: string) => {
  try {
    return await readCompendiumEntry(slug);
  } catch (error) {
    if (!(error instanceof NotFound)) throw error;
  }
  const session = await getSession();
  if (!session || !curates(session.role)) return null;
  try {
    return await readCompendiumEntryAsCurator(session, slug);
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return null;
    throw error;
  }
});

// Title (the formal name tells two entries with one label apart), description and
// canonical link. A missing or moved address gets none, as it renders no page.
export async function generateMetadata({ params }: CompendiumEntryParams): Promise<Metadata> {
  const found = await entryAt((await params).slug);
  if (found?.kind !== 'entry') return {};
  const { entry } = found.detail;
  const title = pageTitleOf(entry);
  const metadata = publicPageMetadata(
    title,
    entryDescription(title, entry.description),
    addressOf(entry.slug),
  );
  // A hidden entry is a curator's to see here, and is never indexed.
  return entry.shown ? metadata : { ...metadata, robots: { index: false, follow: false } };
}

// A coven entry cannot be read here, so a link to one has no page to go to.
const hrefOf = ({ slug, workspaceId }: LinkedIngredient): Route | undefined =>
  workspaceId === null ? addressOf(slug) : undefined;

// The curator's own review read. A refusal or a missing entry means no switch, never an error page.
async function reviewOf(id: string) {
  const curator = await getSession();
  if (!curator) return undefined;
  try {
    const found = await readCompendiumReview(curator, id);
    // A curator's read reaches a hidden entry too, so the switch starts from the row's own flag.
    const row = await getIngredient(curator, id);
    return { reviewedAt: found?.reviewedAt ?? null, shown: row.shown };
  } catch (error) {
    if (error instanceof Forbidden || error instanceof NotFound) return undefined;
    throw error;
  }
}

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
      ? {
          id: entry.id,
          values: await entryValues(entry, null),
          revision: entry.revision,
          updatedAt: entry.updatedAt.toISOString(),
        }
      : undefined;
  // The covens of the viewer's that hold the entry, read once: the shelf mark before the
  // name says any does, and the cupboard choices say which. Someone in no coven has none to ask.
  const holding = shell?.workspaces.length ? await covensHolding(entry.id) : [];
  const covens = shell ? await publicCupboardOf(entry, own, search, holding) : undefined;
  // The review switch's read, for a curator or admin only: per viewer, never in the cached read
  // above, so a visitor's page is unchanged. One read serves the head's switch and the form's field.
  const review = canEdit ? await reviewOf(entry.id) : undefined;

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
                ...(review && {
                  review: {
                    reviewed: review.reviewedAt !== null,
                    reviewedAt: review.reviewedAt?.toISOString() ?? null,
                  },
                }),
              }
            : undefined
        }
        reviewControl={
          review && (
            <span className="review-row__switches">
              <ReviewMark
                ingredientId={entry.id}
                reviewedAt={review.reviewedAt?.toISOString() ?? null}
              />
              <ShownToggle
                ingredientId={entry.id}
                shown={review.shown}
                name={cardName(entry.name, entry.canonicalName)}
                accessibleName="Shown in Compendium"
              />
            </span>
          )
        }
        hiddenFromPublic={!entry.shown}
        covens={covens}
        heldInCovens={holding.length > 0}
        movedAway={
          movedAway ? { name: movedAway.name, href: addressOf(movedAway.slug) } : undefined
        }
      />
    </>
  );
}
