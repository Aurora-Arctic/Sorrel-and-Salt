import { CATALOG_MEDIA_TYPE, buildAiCatalog } from '../../ai-discovery';
import { listCompendiumSlugs } from '@/modules/ingredients';

// A public file with no session, serving only what the public compendium shows (rule 1). The same
// builder serves `/.well-known/ai-catalog.json` and `/.well-known/ard.json`, cached through the
// `compendium` tag; see claude-docs/seo/ai-discovery.md.
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify(buildAiCatalog(await listCompendiumSlugs())), {
    headers: { 'Content-Type': CATALOG_MEDIA_TYPE },
  });
}
