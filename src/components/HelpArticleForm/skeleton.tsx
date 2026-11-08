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

/** The Kind chip at rest, as ChoiceChip draws its face: shut and dashed once the row is saved, as its kind is held. */
const KindChip = ({ held }: { held: boolean }): ReactElement => (
  <div className="field facet-chip">
    <span className="field__label facet-chip__spacer">&#8203;</span>
    <div className="facet-chip__bar">
      {held ? (
        <button type="button" className="facet-chip__summary" disabled>
          <span className="facet-chip__name">Kind:</span>
          <span className="facet-chip__value">Article</span>
          <Caret />
        </button>
      ) : (
        <span className="facet-chip__summary">
          <span className="facet-chip__name">Kind:</span>
          <span className="facet-chip__value">Article</span>
          <Caret />
        </span>
      )}
    </div>
  </div>
);

/** A segmented choice, as RadioGroupField draws one in text. */
const Segments = ({
  legend,
  options,
  note,
}: {
  legend: string;
  options: readonly string[];
  note: string;
}): ReactElement => (
  <fieldset className="fieldset radio-group radio-group--segmented" disabled>
    <legend className="fieldset__legend">{legend}</legend>
    <div className="radio-strip radio-strip--text">
      {options.map((option) => (
        <span key={option} className="radio radio--segment radio--text">
          {option}
        </span>
      ))}
    </div>
    <Hint>{note}</Hint>
  </fieldset>
);

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
      <KindChip held={editing} />
      <div className="field">
        <Label>Shown to Readers</Label>
        <span className="icon-tip">
          <span className="shown-switch">
            <span className="shown-switch__label">Shown</span>
            <span className="help-article-form__pending-switch" />
          </span>
        </span>
        <Hint>
          Hidden, it leaves every reader page and the search, and stays listed under Keepers › Help.
        </Hint>
      </div>
      <Field label="Parent" />
      <fieldset className="fieldset help-article-form__sub-pages" disabled>
        <legend className="fieldset__legend">Sub Pages</legend>
        <Skeleton shape="block" quiet />
        <Hint>Adding one makes this a guide and fixes Parent at No Parent.</Hint>
      </fieldset>
      <Segments
        legend="Audience"
        options={['Public', 'Staff', 'Keeper']}
        note="Who reads it. A sub page is as wide as this or narrower."
      />
      <Field label="Position" note="1 of 21 guides. Whole numbers only." />
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
  <div>
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
