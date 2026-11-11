import type { Metadata, Route } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import IngredientEntry from '@/components/IngredientEntry';
import { pageTitleOf } from '@/components/IngredientEntry/page-title';
import type { LinkedIngredient } from '@/components/IngredientEntry/types';
import { Forbidden, NotFound } from '@/lib/errors';
import { getSession } from '@/lib/request-session';
import ShownToggle from '@/components/IngredientEntry/shown-toggle';
import ReviewMark from '@/components/IngredientEntry/review-mark';
import { cardName } from '@/lib/ingredient-name';
import { curates } from '@/lib/site-roles';
import { entryJsonLd } from '@/lib/json-ld';
import { entryDescription, publicPageMetadata } from '@/lib/page-metadata';
import { viewerIfSignedIn } from '@/lib/viewer';
import { readEntryReview, readEntrySourcing } from '@/app/compendium-reads';
import { entryValues } from '@/app/entry-values';
import { readCompendiumEntry, readCompendiumEntryAsCurator } from '@/modules/ingredients';
import { publicCupboardOf } from './cupboard';
import { covensHolding } from '@/app/plus-covens';
import type { CompendiumEntryParams } from './types';
import { compendiumEntryPath } from '@/lib/compendium-path';

// The public read first: cached, with no session. Only when it finds nothing is a session asked for, and
// only a curator or keeper gets a second, uncached read that reaches a hidden entry. Everyone else gets the 404.
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

export async function generateMetadata({ params }: CompendiumEntryParams): Promise<Metadata> {
  const found = await entryAt((await params).slug);
  if (found?.kind !== 'entry') return {};
  const { entry } = found.detail;
  const title = pageTitleOf(entry);
  const metadata = publicPageMetadata(
    title,
    entryDescription(title, entry.description),
    compendiumEntryPath(entry.slug),
  );
  // A hidden entry is a curator's to see here, and is never indexed.
  return entry.shown ? metadata : { ...metadata, robots: { index: false, follow: false } };
}

// A coven entry cannot be read here, so a link to one has no page to go to.
const hrefOf = ({ slug, workspaceId }: LinkedIngredient): Route | undefined =>
  workspaceId === null ? compendiumEntryPath(slug) : undefined;

export default async function CompendiumEntryPage({ params, searchParams }: CompendiumEntryParams) {
  const { slug } = await params;
  const found = await entryAt(slug);
  if (!found) notFound();
  if (found.kind === 'moved') permanentRedirect(compendiumEntryPath(found.slug));

  const shell = await viewerIfSignedIn();
  const { detail, movedAway } = found;
  const entry = detail.entry;

  // A bare `?edit` opens the compendium's edit modal over this page. The form's values are read
  // only for a curator who asks, as they are the longest read the page makes.
  const canEdit = shell?.viewer.canCurate === true;
  const own = compendiumEntryPath(entry.slug);
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
  // The review switch's read, for a curator or keeper only: per viewer, never in the cached read
  // above, so a visitor's page is unchanged. One read serves the head's switch and the form's field.
  const curator = canEdit ? await getSession() : null;
  const review = await readEntryReview(curator, entry.id);
  const sourcing = await readEntrySourcing(curator, entry.id);

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
        back={{
          href: '/compendium' as Route,
          label: 'Compendium',
          also: [{ path: '/curator/compendium', label: 'Curator Compendium' }],
        }}
        accessPause={shell?.viewer.accessPause}
        edit={
          canEdit
            ? {
                href: `${own}?edit` as Route,
                closeHref: own,
                deletedHref: '/compendium' as Route,
                opened,
                sourcing,
                ...(review && {
                  review: {
                    reviewed: review.reviewedAt !== null,
                    reviewedAt: review.reviewedAt,
                  },
                }),
              }
            : undefined
        }
        reviewControl={
          review && (
            <ReviewMark
              ingredientId={entry.id}
              reviewedAt={review.reviewedAt}
              alongside={
                <ShownToggle
                  ingredientId={entry.id}
                  shown={review.shown}
                  name={cardName(entry.name, entry.canonicalName)}
                  accessibleName="Shown in Compendium"
                />
              }
            />
          )
        }
        hiddenFromPublic={!entry.shown}
        covens={covens}
        heldInCovens={holding.length > 0}
        movedAway={
          movedAway
            ? { name: movedAway.name, href: compendiumEntryPath(movedAway.slug) }
            : undefined
        }
      />
    </>
  );
}
