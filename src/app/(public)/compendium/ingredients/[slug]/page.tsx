import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import IngredientEntry from '../../../../../components/IngredientEntry';
import { pageTitleOf } from '../../../../../components/IngredientEntry/page-title';
import type { LinkedIngredient } from '../../../../../components/IngredientEntry/types';
import { Forbidden, NotFound } from '../../../../../lib/errors';
import { getSession } from '../../../../../lib/request-session';
import ReviewMark from '../../../../../components/IngredientEntry/review-mark';
import { entryJsonLd } from '../../../../../lib/json-ld';
import { entryDescription, publicPageMetadata } from '../../../../../lib/page-metadata';
import { viewerIfSignedIn } from '../../../../../lib/viewer';
import { entryValues } from '@/app/entry-values';
import { readCompendiumEntry, readCompendiumReview } from '@/modules/ingredients';
import { publicCupboardOf } from './cupboard';
import { covensHolding } from '@/app/plus-covens';
import type { CompendiumEntryParams } from './types';

// One compendium entry, at its public address (M8.19; MB.80): readable by
// anyone, signed out included, and the address the coven's copy of the page
// names as canonical. The (public) layout owns `<main>`, so this renders
// none.
//
// The entry comes from `readCompendiumEntry`, a cached read that takes no
// session, so nothing private can reach it. The page itself is drawn per
// request: it asks `viewerIfSignedIn()`, which never redirects, to decide
// whether to offer a curator Edit, and a signed-in person's cupboard choices
// across the covens they may write in (M9.12, `cupboard.ts`). A visitor with
// no session reads the page the same as ever. A member whose covens hold the
// entry sees the In Your Cupboard shelf before its name, read once with the
// choices (`covensHolding`); the choices change none of the page's other marks.
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

// The curator's own review read. A refusal or a missing entry means no switch, never an error page.
async function reviewOf(id: string) {
  const curator = await getSession();
  if (!curator) return undefined;
  try {
    const found = await readCompendiumReview(curator, id);
    return { reviewedAt: found?.reviewedAt ?? null };
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

  // Edit opens the compendium's edit modal over this page (M8.19), so the
  // address carries a bare `?edit`. The form's values are read only for a
  // curator who asks for them, since they are the longest read the page makes.
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
  // The review switch (M14.8), for a curator or admin only: a per-viewer read with their session,
  // never in the cached read above and not made at all for anyone else, so a visitor's page is
  // the same as ever. One read serves the side column's switch and the edit form's field.
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
            <ReviewMark
              ingredientId={entry.id}
              reviewedAt={review.reviewedAt?.toISOString() ?? null}
            />
          )
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
