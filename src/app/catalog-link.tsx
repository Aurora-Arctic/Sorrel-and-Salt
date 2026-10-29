import { siteUrl } from '../lib/site';
import { CATALOG_MEDIA_TYPE } from './ai-discovery';

// Points an agent that has landed on any page at the AI catalog: the AI Catalog draft's "Link Relation
// Discovery" (https://ai-catalog.io/spec/). Absolute, because the catalog's address is the site's and
// not the request's host (claude-docs/seo/ai-discovery.md).
export default function CatalogLink() {
  return (
    <link
      rel="ai-catalog"
      href={siteUrl('/.well-known/ai-catalog.json')}
      type={CATALOG_MEDIA_TYPE}
    />
  );
}
