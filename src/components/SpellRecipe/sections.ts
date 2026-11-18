import type { PageNavEntry } from '../PageNav/types';

export const STEPS_ID = 'spell-steps';
export const STEPS_TITLE_ID = 'spell-steps-title';
export const SUMMARY_TITLE_ID = 'spell-summary-title';
export const WORKINGS_ID = 'spell-workings';
export const WORKINGS_TITLE_ID = 'spell-workings-title';
export const CATEGORY_MATCH_ID = 'spell-category-match';
export const INVENTORY_ID = 'spell-inventory';
export const CORRESPONDENCES_ID = 'spell-correspondences';
export const CORRESPONDENCES_TITLE_ID = 'spell-correspondences-title';
export const CATEGORY_MATCH_TITLE = 'Category Match';
export const INVENTORY_TITLE = 'In the Cupboard';
export const CORRESPONDENCES_TITLE = 'Correspondences';
export const WORKINGS_TITLE = 'Workings';
export const JAR_ID = 'spell-jar';

/**
 * The recipe's menu: Steps when it has any, the side column's sections (Correspondences only when
 * the block is drawn), listed only where the column stacks under the text, and Workings. The page and its skeleton both draw it.
 */
export const recipeMenu = ({
  steps,
  aside,
  correspondences = false,
  workings,
}: {
  steps: boolean;
  aside: boolean;
  correspondences?: boolean;
  workings: boolean;
}): PageNavEntry[] => [
  ...(steps ? [{ href: `#${STEPS_ID}` as const, label: 'Steps' }] : []),
  ...(aside
    ? [
        {
          href: `#${CATEGORY_MATCH_ID}` as const,
          label: CATEGORY_MATCH_TITLE,
          group: 'The Cupboard',
          narrowOnly: true,
        },
        {
          href: `#${INVENTORY_ID}` as const,
          label: INVENTORY_TITLE,
          group: 'The Cupboard',
          narrowOnly: true,
        },
        ...(correspondences
          ? [
              {
                href: `#${CORRESPONDENCES_ID}` as const,
                label: CORRESPONDENCES_TITLE,
                group: 'The Cupboard',
                narrowOnly: true,
              },
            ]
          : []),
      ]
    : []),
  ...(workings ? [{ href: `#${WORKINGS_ID}` as const, label: WORKINGS_TITLE }] : []),
];
