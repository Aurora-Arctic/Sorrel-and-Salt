import { useId, type ReactElement } from 'react';
import FormIcon from '../FormIcon';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { SafetyNoteProps } from './types';
import './index.scss';

const said = (notes: string | null | undefined): notes is string => (notes ?? '').trim() !== '';

// The ingredient's caution as a region of its own, labelled by its visible
// Caution heading rather than an aria-label, so the word a reader sees is the
// name a screen reader announces. Text to read, not a control, so nothing in
// it takes focus. claude-docs/components/safety-note.md.
const SafetyNote = ({
  safetyNotes,
  variants = [],
  level = 3,
  footnote,
  compact = false,
}: SafetyNoteProps): ReactElement | null => {
  const headingId = useId();
  const forms = variants.filter((variant) => said(variant.safetyNotes));

  if (!said(safetyNotes) && forms.length === 0 && !footnote) {
    return null;
  }

  const Heading = `h${level}` as const;

  return (
    <section
      className={compact ? 'safety-note safety-note--compact' : 'safety-note'}
      aria-labelledby={headingId}
    >
      <Heading id={headingId} className="safety-note__heading">
        Caution
      </Heading>
      {said(safetyNotes) && <p className="safety-note__text">{safetyNotes}</p>}
      {forms.length > 0 && (
        <dl className="safety-note__forms">
          {forms.map((variant) => (
            <div key={variant.form}>
              <dt>
                <FormIcon name={variant.formChoice?.group.icon ?? null} /> {formLabel(variant.form)}
              </dt>
              <dd className="safety-note__text">{variant.safetyNotes}</dd>
            </div>
          ))}
        </dl>
      )}
      {footnote}
    </section>
  );
};

export default SafetyNote;
