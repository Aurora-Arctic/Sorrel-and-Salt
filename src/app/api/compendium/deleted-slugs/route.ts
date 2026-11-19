import { listDeletedCompendiumSlugs } from '@/modules/ingredients';

// A public list like sitemap.xml: slugs of entries the public compendium once showed, with no session, read only by
// `src/proxy.ts` to answer 410, so it is no third access path (rule 1). Held in the data cache under the `compendium` tag.
export async function GET(): Promise<Response> {
  return Response.json(await listDeletedCompendiumSlugs());
}
