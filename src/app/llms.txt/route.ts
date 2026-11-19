import { buildLlmsTxt } from '../ai-discovery';
import { listHelpArticleLinks } from '@/modules/help';
import { listCompendiumSlugs } from '@/modules/ingredients';

// A public file like robots.txt: it serves only what the public compendium shows and takes no session,
// so it is no third access path (rule 1). Held in the data cache under the `compendium` and `help` tags.
// Format: claude-docs/seo/ai-discovery.md.
export async function GET(): Promise<Response> {
  return new Response(
    buildLlmsTxt(...(await Promise.all([listCompendiumSlugs(), listHelpArticleLinks()]))),
    {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    },
  );
}
