import type { ReactElement } from 'react';
import { RichTextEditorSkeleton } from '../RichTextEditor/skeleton';
import { BackChevron } from '../IngredientEntry/back-chevron';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import './index.scss';

const Field = ({ label }: { label: string }): ReactElement => (
  <div className="field" aria-hidden="true">
    <div className="field__label-row">
      <span className="field__label">{label}</span>
    </div>
    <Skeleton shape="block" />
  </div>
);

// The form while its editor loads: the form's own grid, with the title, summary and body on the left and the details card
// beside them, so the fields stand where the real ones will.
export const HelpArticleFormSkeleton = ({ heading }: { heading?: string }): ReactElement => (
  <>
    {/* A new row's heading is the form's own, so its stand-in draws one too. */}
    {heading && <PageHeader title={heading} />}
    <HelpArticleFormBody />
  </>
);

const HelpArticleFormBody = (): ReactElement => (
  <div className="form help-article-form">
    <span className="visually-hidden">Loading</span>
    <div className="help-article-form__main">
      <Field label="Title" />
      <Field label="Summary" />
      <RichTextEditorSkeleton label="Body" />
    </div>
    <div className="help-article-form__details" aria-hidden="true">
      <p className="help-article-form__details-heading">Details</p>
      <Field label="Kind" />
      <Field label="Shown to Readers" />
      <Field label="Parent" />
      <Field label="Audience" />
      <Field label="Position" />
    </div>
  </div>
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
        <PageHeader eyebrow={<Skeleton shape="line" quiet />} pendingTitle />
        <HelpArticleFormBody />
      </>
    ) : (
      <HelpArticleFormSkeleton heading="Add Article" />
    )}
  </div>
);
