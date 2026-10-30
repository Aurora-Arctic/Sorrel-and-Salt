import type { ReactElement, ReactNode } from 'react';
import InfoTip from '../InfoTip';
import {
  isBinomial,
  NAMELESS_KIND,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { IngredientRow } from '@/modules/ingredients';
import './formal-name.scss';

// The formal name as an eyebrow over an entry's heading, with its tip: drawn by the entry page and
// the details modal's head so they cannot differ. No hook and no client directive, so server and
// client parts alike build it.

/** Each settled nomenclature's formal name, as its label says it. */
const NAME_LABELS: Partial<Record<NomenclatureKind, string>> = {
  botanical: 'Botanical Name',
  fungal: 'Fungal Name',
  zoological: 'Zoological Name',
  mineral: 'Mineral Name',
  chemical: 'Chemical Name',
};

/** What the formal name is, said in the tip beside it: which naming system governs it (DESIGN.md §5's nomenclature table). */
const NAME_TIPS: Partial<Record<NomenclatureKind, string>> = {
  botanical: 'Its botanical name, under the ICN.',
  fungal: 'Its fungal name, under the ICN.',
  zoological: 'Its zoological name, under the ICZN.',
  mineral: 'Its mineral name: an IMA species or variety, or a rock, mineraloid or natural glass.',
  chemical: 'Its chemical name, IUPAC\u2019s or the accepted one.',
};
const FORMAL_NAME_TIP = 'Its formal name; which naming system it belongs to is not yet settled.';
const NO_FORMAL_NAME_TIP = 'No naming system names it.';

/** The formal name beside the label, never blank (claude-docs/components/ingredient-entry.md, "Structure"). */
export default function FormalName({
  entry,
}: {
  entry: Pick<IngredientRow, 'canonicalName' | 'nomenclature'>;
}): ReactElement {
  const formal = (entry.canonicalName ?? '').trim();
  const label = NAME_LABELS[entry.nomenclature] ?? 'Formal Name';
  const tip =
    entry.nomenclature === NAMELESS_KIND
      ? NO_FORMAL_NAME_TIP
      : (NAME_TIPS[entry.nomenclature] ?? FORMAL_NAME_TIP);
  let value: ReactNode;
  if (entry.nomenclature === NAMELESS_KIND) {
    value = 'None';
  } else if (formal === '') {
    value = 'Not yet looked up';
  } else if (isBinomial(entry.nomenclature)) {
    // `i` rather than `em`: a taxonomic name is set apart, not stressed.
    value = <i className="binomial">{formal}</i>;
  } else if (NAME_LABELS[entry.nomenclature]) {
    value = formal;
  } else {
    value = `${formal} (unconfirmed)`;
  }
  return (
    // The name alone as an eyebrow, with what it is in a tip
    // (claude-docs/components/ingredient-entry.md, "Structure").
    <dl className="ingredient-entry__formal">
      <div>
        <dt>{label}</dt>
        <dd>
          <span className="eyebrow">{value}</span>{' '}
          <InfoTip id="formal-name-tip" label={label}>
            {tip}
          </InfoTip>
        </dd>
      </div>
    </dl>
  );
}
