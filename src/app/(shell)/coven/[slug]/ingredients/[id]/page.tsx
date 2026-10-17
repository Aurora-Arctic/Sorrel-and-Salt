import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import IngredientEntry from '../../../../../../components/IngredientEntry';
import type { LinkedIngredient } from '../../../../../../components/IngredientEntry/types';
import { compendiumHref } from '../../../../../../components/CompendiumList/href';
import { Forbidden, NotFound } from '../../../../../../lib/errors';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { viewerOf } from '../../../../../../lib/viewer';
import { getIngredient, ingredientDetailOf } from '@/modules/ingredients';
import type { CovenIngredientParams } from './types';

// One ingredient inside a coven (M8.19): the coven's own, or a compendium
// entry read through the coven's door. The coven comes from the address and
// the guard proves the caller is in it, as on every coven page; `getIngredient`
// is then given that coven's id, which is what lets it open the coven's own
// entries. Its refusals (an id that names nothing visible to this coven, or
// one from another coven) are the 404 a stranger gets. Read per request and
// never cached: the detail is assembled for this viewer, and the cache is for
// reads that take no session (CLAUDE.md rule 6).
//
// The shell draws no `<main>`, so the page does. The entry's own article
// carries its own wide layout (the jump menu and the side columns), so
// `<main>` stays plain.

const publicAddress = (slug: string) => `/compendium/ingredients/${slug}` as Route;

// One read per request, shared by the metadata and the page. It runs the
// guard first, so a stranger is refused before the ingredient is looked up.
const entryOf = cache(async (slug: string, id: string) => {
  const { workspace } = await requireCovenMembership(slug);
  const session = await requireSession();
  try {
    return { workspace, session, entry: await getIngredient(session, id, workspace.id) };
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) notFound();
    throw error;
  }
});

// A compendium entry names its public page as canonical, since that is the
// address a search engine should index. The path is relative: the origin
// varies by deployment, and MB.84 owns the public page's metadata.
export async function generateMetadata({ params }: CovenIngredientParams): Promise<Metadata> {
  const { slug, id } = await params;
  const { entry } = await entryOf(slug, id);
  return entry.workspaceId === null
    ? { title: entry.name, alternates: { canonical: publicAddress(entry.slug) } }
    : { title: entry.name };
}

export default async function CovenIngredientPage({ params }: CovenIngredientParams) {
  const { slug, id } = await params;
  const { workspace, session, entry } = await entryOf(slug, id);
  const [detail, { viewer }] = await Promise.all([ingredientDetailOf(session, entry), viewerOf()]);
  const inCompendium = entry.workspaceId === null;

  // A compendium entry offers its public page's address as canonical, and Edit
  // to a curator. A coven's own entry gets no Edit until M8.17's modal.
  const hrefOf = ({ id, slug, workspaceId }: LinkedIngredient): Route | undefined => {
    if (workspaceId === null) return publicAddress(slug);
    if (workspaceId === workspace.id) return `/coven/${workspace.slug}/ingredients/${id}` as Route;
    return undefined;
  };

  return (
    <main>
      <IngredientEntry
        detail={detail}
        hrefOf={hrefOf}
        edit={
          inCompendium && viewer.canCurate
            ? { href: compendiumHref({}, { edit: entry.slug }) }
            : undefined
        }
        canonical={inCompendium ? publicAddress(entry.slug) : undefined}
      />
    </main>
  );
}
