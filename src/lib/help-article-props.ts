import 'server-only';
import type { Metadata } from 'next';
import { HELP_WIDGET_ELEMENTS } from '@/components/HelpWidget';
import type { HelpArticleWithChildren } from '@/modules/help';
import { readGlossaryTerms } from './help-glossary';
import { guideSteps, linkTo } from './help-pages';
import { helpPath, keeperHelpEditPath } from './help-paths';
import { helpViewerOffers } from './help-viewer';
import { publicPageMetadata } from './page-metadata';
import { SITE_NAME } from './site';

/**
 * What `HelpArticleView` draws of a help article, the same on a public and a staff page: the glossary terms, the keeper's
 * edit link and the guide's steps. A sub page passes its parent, whose guide the steps run through. The page adds the
 * `parent` link and the `heading`, which differ between the public and the staff pages.
 */
export async function helpArticleProps(
  found: HelpArticleWithChildren,
  parent?: HelpArticleWithChildren,
) {
  const guide = parent ?? found;
  return {
    terms: await readGlossaryTerms(),
    widgets: HELP_WIDGET_ELEMENTS,
    title: found.title,
    body: found.body,
    // A sub page keeps the component's default name, 'Article'.
    ...(parent
      ? {}
      : { editName: found.kind === 'guide' ? ('Guide' as const) : ('Article' as const) }),
    subpages: found.children.map(linkTo),
    editHref: (await helpViewerOffers()).edit ? keeperHelpEditPath(found.id) : undefined,
    steps: guideSteps(linkTo(guide), guide.children.map(linkTo), helpPath(found)),
  };
}

/** The search-result text of a public help article. */
export function helpArticleMetadata(found: HelpArticleWithChildren): Metadata {
  return publicPageMetadata(
    found.title,
    linkTo(found).summary ?? `${found.title}, a help article on ${SITE_NAME}.`,
    helpPath(found),
  );
}
