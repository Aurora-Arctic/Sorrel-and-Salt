import { buildLlmsTxt } from '../ai-discovery';
import { listCompendiumSlugs } from '@/modules/ingredients';

// A public file like robots.txt: it serves only what the public compendium shows and takes no session,
// so it is no third access path (rule 1). Held in the data cache under the `compendium` tag.
// Format: claude-docs/seo/ai-discovery.md.
export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(await listCompendiumSlugs()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
