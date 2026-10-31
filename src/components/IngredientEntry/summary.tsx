import Link from 'next/link';
import type { ReactElement } from 'react';
import FormIcon from '../FormIcon';
import SafetyNote from '../SafetyNote';
import { StockBadge } from '../StockBadge';
import SummaryDescription from './summary-description';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { applyCupboardEntry } from '@/modules/ingredients/validation/cupboard-merge';
import type { HoldingCoven, IngredientDetail } from '@/modules/ingredients';
import {
  blockOf,
  categoryItems,
  CorrespondenceBlock,
  correspondences,
  ListBlock,
  said,
} from './blocks';
import { ShelfIcon } from './held-mark';
import type { SummaryJar } from './types';
import { HELD_IN_COVENS_TITLE } from '../AddIcon/wording';
// The page's own stylesheet, for its blocks: a list page draws no entry page to load it.
import './index.scss';
import './summary.scss';

// The details modal's body: the entry page's Details section cut to a glance, drawn by the page's
// own blocks and leaving out what is empty (claude-docs/components/ingredient-entry.md, "The details modal").

/** "The Oil form", "The Oil and Root forms", "The Oil, Root and Tincture forms". */
function formsCarrying(labels: readonly string[]): string {
  const named =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return labels.length === 1
    ? `The ${named} form carries its own caution; the ingredient's page shows it.`
    : `The ${named} forms carry their own cautions; the ingredient's page shows them.`;
}

export default function IngredientSummary({
  detail,
  covens = [],
  jars,
}: {
  detail: IngredientDetail;
  /** The viewer's own covens that hold this entry, per viewer; none for a visitor, and drawn for a compendium entry only. */
  covens?: readonly HoldingCoven[];
  /** The coven's jars of the entry, from the coven's page alone, so each form shows its stock; left out, the forms are named alone. */
  jars?: readonly SummaryJar[];
}): ReactElement {
  const { cupboardEntry, folkNames, categories, deities, variants } = detail;
  const shown = applyCupboardEntry(detail.entry, cupboardEntry);
  const cautioned = variants
    .filter(({ variant }) => said(variant.safetyNotes))
    .map(({ variant }) => formLabel(variant.form));
  const rows = correspondences(shown, deities).filter((row) => row.values.length > 0);
  const listed = rows.length > 0 || folkNames.length > 0 || categories.length > 0;
  // Each form as a jar line: icon and name, then with the coven's jars its stock in a grid cell so
  // quantities end in one column; a form in no jar says "Not Stocked" to a screen reader alone
  // (claude-docs/components/ingredient-entry.md, "Structure").
  const forms = variants.length > 0 && (
    <ListBlock
      block={blockOf('summary', 'forms')}
      title="Forms"
      level={3}
      className={
        jars
          ? 'ingredient-summary__forms ingredient-summary__forms--stocked'
          : 'ingredient-summary__forms'
      }
    >
      {variants.map(({ variant, icon }) => {
        const jar = jars?.find(({ variantId }) => variantId === variant.id);
        return (
          <li key={variant.id}>
            <span className="ingredient-summary__form">
              <FormIcon name={icon} /> {formLabel(variant.form)}
              {jars && <span className="spoken-separator">,</span>}
            </span>
            {jars && (
              <span className="ingredient-summary__stock">
                <span className="ingredient-summary__amount">
                  {jar === undefined ? (
                    <span className="visually-hidden">Not Stocked</span>
                  ) : jar.quantity === null ? (
                    'Unmeasured'
                  ) : jar.unit ? (
                    `${jar.quantity} ${jar.unit}`
                  ) : (
                    jar.quantity
                  )}
                </span>
                {jar && (
                  <StockBadge quantity={jar.quantity} threshold={jar.threshold} unit={jar.unit} />
                )}
              </span>
            )}
          </li>
        );
      })}
    </ListBlock>
  );
  const holding = detail.entry.workspaceId === null ? covens : [];
  // Where the viewer holds the entry, last; not something recorded of the entry, so it never stands
  // in for the line below.
  const inYourCovens = holding.length > 0 && (
    <ListBlock
      block={blockOf('summary', 'covens')}
      title={HELD_IN_COVENS_TITLE}
      level={3}
      className="ingredient-summary__covens"
    >
      {holding.map(({ id, slug, name }) => (
        <li key={id}>
          <Link href={`/coven/${slug}/ingredients/${detail.entry.id}`}>
            <ShelfIcon />
            <span>{name}</span>
          </Link>
        </li>
      ))}
    </ListBlock>
  );
  // With every section hidden, one line says so rather than leave the body blank.
  if (
    !listed &&
    !forms &&
    !said(shown.description) &&
    !said(shown.safetyNotes) &&
    cautioned.length === 0
  ) {
    return (
      <div className="ingredient-summary">
        <p className="ingredient-entry__empty">No details recorded.</p>
        {inYourCovens && <div className="ingredient-entry__side">{inYourCovens}</div>}
      </div>
    );
  }
  return (
    <div className="ingredient-summary">
      {/* No Details heading: the dialog's title names the entry, and its h2
          over a second h2 read as two titles. The blocks keep the page's h3s. */}
      {/* The page's own description, cut to its first lines here. Left out
          when empty, where the page says so. */}
      {said(shown.description) && <SummaryDescription text={shown.description!} />}
      <SafetyNote
        safetyNotes={shown.safetyNotes}
        level={3}
        footnote={
          cautioned.length > 0 && (
            <p className="ingredient-summary__forms-caution">{formsCarrying(cautioned)}</p>
          )
        }
      />
      {forms}
      {/* Not drawn when every block is empty, so it adds no gap of its own. */}
      {(listed || inYourCovens) && (
        <div className="ingredient-entry__side">
          {rows.length > 0 && (
            <CorrespondenceBlock
              block={blockOf('summary', 'correspondences')}
              rows={rows}
              level={3}
            />
          )}
          {folkNames.length > 0 && (
            <ListBlock block={blockOf('summary', 'folk-names')} title="Folk Names" level={3}>
              {folkNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ListBlock>
          )}
          {categories.length > 0 && (
            <ListBlock
              block={blockOf('summary', 'categories')}
              title="Categories"
              level={3}
              className="ingredient-entry__chips"
            >
              {categoryItems(categories)}
            </ListBlock>
          )}
          {inYourCovens}
        </div>
      )}
    </div>
  );
}
