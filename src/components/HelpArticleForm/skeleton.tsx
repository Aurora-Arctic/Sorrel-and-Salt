import type { ReactElement, ReactNode } from 'react';
import { RichTextEditorSkeleton } from '../RichTextEditor/skeleton';
import { BackChevron } from '../IngredientEntry/back-chevron';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import SkeletonText from '../Skeleton/text';
import '../FacetPanel/choice-chip.scss';
import '../IconTip/index.scss';
import './index.scss';

// The form while it loads, drawn from the form's own classes and fixed words: a guide's fields, as an article opens on, so
// every label, control, hint and the Save row stand where the real ones will. Words are drawn as bars at their own size.

const Label = ({ children, required }: { children: string; required?: boolean }): ReactElement => (
  <div className="field__label-row">
    <span className="field__label">
      {children}
      {required && <span className="field__required">*</span>}
    </span>
  </div>
);

const Hint = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={['field__hint', className].filter(Boolean).join(' ')}>
    <SkeletonText>{children}</SkeletonText>
  </p>
);

const Field = ({
  label,
  required,
  note,
  after,
}: {
  label: string;
  required?: boolean;
  note?: string;
  after?: ReactNode;
}): ReactElement => (
  <div className="field">
    <Label required={required}>{label}</Label>
    {note && <Hint>{note}</Hint>}
    <Skeleton shape="block" quiet />
    {after}
  </div>
);

const Caret = (): ReactElement => (
  <svg className="facet-chip__caret" viewBox="0 0 10 6" focusable="false">
    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** A choice chip at rest, as ChoiceChip draws its face: shut and dashed when held, its note beneath. */
const Chip = ({
  legend,
  value,
  held = false,
  note,
}: {
  legend: string;
  value: string;
  held?: boolean;
  note?: string;
}): ReactElement => {
  const face = (
    <>
      <span className="facet-chip__name">{legend}:</span>
      <span className="facet-chip__value">{value}</span>
      <Caret />
    </>
  );
  return (
    <div className="field facet-chip">
      <div className="facet-chip__bar">
        {held ? (
          <button type="button" className="facet-chip__summary" disabled>
            {face}
          </button>
        ) : (
          <span className="facet-chip__summary">{face}</span>
        )}
      </div>
      {note && <Hint>{note}</Hint>}
    </div>
  );
};

const HelpArticleFormBody = ({ editing }: { editing: boolean }): ReactElement => (
  <div className="form help-article-form">
    <span className="visually-hidden">Loading</span>
    <div className="help-article-form__main" aria-hidden="true">
      <Field
        label="Title"
        required
        after={
          editing && (
            <Hint className="help-article-form__address">
              Address <code>/help/a-guide-title</code>, made from the title. Changing the title
              changes it, and breaks any link that holds the old one.
            </Hint>
          )
        }
      />
      <Field label="Summary" />
      <div className="field">
        <Label required>Body</Label>
        <RichTextEditorSkeleton label="Body" />
      </div>
    </div>
    <div className="help-article-form__details" aria-hidden="true">
      <h2 className="help-article-form__details-heading">Details</h2>
      <Chip legend="Kind" value="Article" held={editing} />
      <div className="field">
        <Label>Shown to Readers</Label>
        <span className="icon-tip">
          <span className="shown-switch">
            <span className="shown-switch__label">Shown</span>
            <span className="help-article-form__pending-switch" />
          </span>
        </span>
      </div>
      <Field label="Parent" />
      <fieldset className="fieldset help-article-form__sub-pages" disabled>
        <legend className="fieldset__legend">Sub Pages</legend>
        <Skeleton shape="block" quiet />
        <Hint>Adding one makes this a guide and fixes Parent at No Parent.</Hint>
      </fieldset>
      <Chip legend="Audience" value="Public" />
    </div>
    <div className="help-article-form__actions" aria-hidden="true">
      <div className="form__actions">
        <button type="button" className="btn btn--solid" disabled>
          Save Article
        </button>
        <span className="btn btn--quiet">Cancel</span>
        {editing && <span className="btn btn--destructive form__aside">Delete Article</span>}
      </div>
    </div>
  </div>
);

/** A new row's stand-in: the form's own heading over the form, as the form draws its heading itself. */
export const HelpArticleFormSkeleton = ({ heading }: { heading?: string }): ReactElement => (
  <>
    {heading && <PageHeader title={heading} />}
    <HelpArticleFormBody editing={!heading} />
  </>
);

/** The whole page while it is on its way: the back link, the heading, and the form. An edited row's title is not known yet. */
export const HelpArticlePageSkeleton = ({ editing }: { editing: boolean }): ReactElement => (
  <div className="help-article-page">
    <div className="back-bar help-article-form__bar">
      <span className="back-link" aria-hidden="true">
        <BackChevron />
        Back to Help
      </span>
    </div>
    {editing ? (
      <>
        <div className="help-article-form__pending-head">
          <PageHeader eyebrow={<SkeletonText>Edit Article</SkeletonText>} pendingTitle />
        </div>
        <HelpArticleFormBody editing />
      </>
    ) : (
      <HelpArticleFormSkeleton heading="Add Article" />
    )}
  </div>
);
