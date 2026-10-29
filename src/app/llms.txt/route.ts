import { buildLlmsTxt } from '../ai-discovery';
import { listCompendiumSlugs } from '@/modules/ingredients';

// A public file, like robots.txt and sitemap.xml: it serves only what the public compendium already
// shows and takes no session, so it is not a third access path (CLAUDE.md rule 1). The read is held
// in the data cache under the `compendium` tag, so an admin write refreshes it. Format:
// claude-docs/seo/ai-discovery.md.
export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(await listCompendiumSlugs()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
