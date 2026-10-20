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
// caution, then the correspondences, folk names and categories). No
// description, forms, substitutes, references or Similar: Open Full Page has
// those. Shown as the list names the entry, the coven's annotations laid over a
// held compendium entry as the page lays them. Each form's caution stays on the
// page's form sections; a line here says which forms carry one (the owner's
// call, 2026-10-20). claude-docs/components/ingredient-entry.md, "The details modal".

/** "The Oil form", "The Oil and Root forms", "The Oil, Root and Tincture forms". */
function formsCarrying(forms: readonly string[]): string {
  const labels = forms.map(formLabel);
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
    .map(({ variant }) => variant.form);
  return (
    <div className="ingredient-summary">
      {/* No Details heading: the dialog's title names the entry, and its h2
          over a second h2 read as two titles. The blocks keep the page's h3s. */}
      <SafetyNote
        safetyNotes={shown.safetyNotes}
        level={3}
        footnote={
          cautioned.length > 0 && (
            <p className="ingredient-summary__forms-caution">{formsCarrying(cautioned)}</p>
          )
        }
      />
      <div className="ingredient-entry__side">
        <CorrespondenceBlock
          block={blockOf('summary', 'correspondences')}
          rows={correspondences(shown, deities)}
          level={3}
        />
        <ListBlock
          block={blockOf('summary', 'folk-names')}
          title="Folk Names"
          level={3}
          empty="No folk names recorded."
        >
          {folkNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ListBlock>
        <ListBlock
          block={blockOf('summary', 'categories')}
          title="Categories"
          level={3}
          empty="No categories recorded."
          className="ingredient-entry__chips"
        >
          {categoryItems(categories)}
        </ListBlock>
      </div>
    </div>
  );
}
