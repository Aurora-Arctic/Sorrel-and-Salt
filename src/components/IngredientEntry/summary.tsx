import type { ReactElement } from 'react';
import SafetyNote from '../SafetyNote';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { applyCupboardEntry } from '@/modules/ingredients/validation/cupboard-merge';
import type { IngredientDetail } from '@/modules/ingredients';
import {
  blockOf,
  categoryItems,
  CorrespondenceBlock,
  correspondences,
  ListBlock,
  said,
} from './blocks';
// The page's own stylesheet, for its blocks: a list page draws no entry page to load it.
import './index.scss';
import './summary.scss';

// The details modal's body (M12.5): the entry page's Details section, drawn by
// the page's own blocks in the page's order, cut to the owner's choice (the
// description, the caution, then the correspondences, folk names and
// categories; the description added by the owner's call, 2026-10-20). No
// forms, substitutes, references or Similar: Open Full Page has those. Shown as the list names the entry, the coven's annotations laid over a
// held compendium entry as the page lays them. Each form's caution stays on the
// page's form sections; a line here says which forms carry one (the owner's
// call, 2026-10-20). An empty block or correspondence row is left out here,
// where the page says "None recorded": a glance shows what the entry holds
// (the owner's call, 2026-10-20). claude-docs/components/ingredient-entry.md, "The details modal".

/** "The Oil form", "The Oil and Root forms", "The Oil, Root and Tincture forms". */
function formsCarrying(labels: readonly string[]): string {
  const named =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return labels.length === 1
    ? `The ${named} form carries its own caution; Open Full Page shows it.`
    : `The ${named} forms carry their own cautions; Open Full Page shows them.`;
}

export default function IngredientSummary({ detail }: { detail: IngredientDetail }): ReactElement {
  const { cupboardEntry, folkNames, categories, deities, variants } = detail;
  const shown = applyCupboardEntry(detail.entry, cupboardEntry);
  const cautioned = variants
    .filter(({ variant }) => said(variant.safetyNotes))
    .map(({ variant }) => formLabel(variant.form));
  const rows = correspondences(shown, deities).filter((row) => row.values.length > 0);
  const listed = rows.length > 0 || folkNames.length > 0 || categories.length > 0;
  // With every section hidden, one line says so rather than leave the body blank
  // (the owner's call, 2026-10-20).
  if (!listed && !said(shown.description) && !said(shown.safetyNotes) && cautioned.length === 0) {
    return (
      <div className="ingredient-summary">
        <p className="ingredient-summary__nothing">Nothing recorded yet.</p>
      </div>
    );
  }
  return (
    <div className="ingredient-summary">
      {/* No Details heading: the dialog's title names the entry, and its h2
          over a second h2 read as two titles. The blocks keep the page's h3s. */}
      {/* The page's own description: a `<p>`, so at the measure, keeping its
          typed line breaks. Left out when empty, where the page says so. */}
      {said(shown.description) && (
        <p className="ingredient-entry__description">{shown.description}</p>
      )}
      <SafetyNote
        safetyNotes={shown.safetyNotes}
        level={3}
        footnote={
          cautioned.length > 0 && (
            <p className="ingredient-summary__forms-caution">{formsCarrying(cautioned)}</p>
          )
        }
      />
      {/* Not drawn when every block is empty, so it adds no gap of its own. */}
      {listed && (
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
        </div>
      )}
    </div>
  );
}
