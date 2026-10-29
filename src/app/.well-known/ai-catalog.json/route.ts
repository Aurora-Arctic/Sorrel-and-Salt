import { CATALOG_MEDIA_TYPE, buildAiCatalog } from '../../ai-discovery';
import { listCompendiumSlugs } from '@/modules/ingredients';

// A public file with no session that serves only what the public compendium already shows, so not a
// third access path (CLAUDE.md rule 1). Served at both `/.well-known/ai-catalog.json` (the AI Catalog
// draft) and `/.well-known/ard.json` (ARD v0.91, which tells consumers to fetch this one), from the
// same builder, cached through the `compendium` tag. See claude-docs/seo/ai-discovery.md.
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify(buildAiCatalog(await listCompendiumSlugs())), {
    headers: { 'Content-Type': CATALOG_MEDIA_TYPE },
  });
}
