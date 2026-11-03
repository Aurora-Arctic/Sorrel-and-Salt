'use client';

import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { type ReactElement, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import ConfirmedAction from '../UserList/confirmed-action';
import { editorPlugins } from './elements';
import Toolbar from './toolbar';
import { editorValueToMarkdown, markdownToEditorValue } from './markdown';
import type { DocumentEditorProps } from './types';
import '../DocumentPage/index.scss';
import './index.scss';

// The admin's editor for one site document: the text as the public page will draw it, saved as a draft only its admin
// sees, then published as the next version. A save and a publish send the draft's revision, so a second admin's save
// in between is refused rather than overwritten (claude-docs/components/document-editor.md).

const SaveDraftDocument = graphql(`
  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {
    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {
      id
      revision
    }
  }
`);

const PublishDraftDocument = graphql(`
  mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {
    publishDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision) {
      number
    }
  }
`);

/** What a publish does for readers; only the terms ask anyone to agree again. */
function PublishQuestion({
  documentKey,
  title,
}: {
  documentKey: string;
  title: string;
}): ReactElement {
  return documentKey === 'terms' ? (
    <>
      Publish this as the new terms of use? Every account will be asked to agree to them again
      before it can use the site.
    </>
  ) : (
    <>
      Publish this as the new {title}? Readers see it at once, and the version it replaces stays
      listed on the page.
    </>
  );
}

const DocumentEditor = ({
  documentId,
  documentKey,
  title,
  lede,
  body,
  revision: openRevision,
  nextNumber,
  mailing,
}: DocumentEditorProps): ReactElement => {
  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: () => markdownToEditorValue(body),
  });
  const [revision, setRevision] = useState(openRevision);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [published, setPublished] = useState<number>();
  // The revision a write must send, kept in a ref too: a publish that saves first reads the revision that save returned.
  const revisionRef = useRef(openRevision);
  // The markdown last opened or saved, so undoing back to it leaves nothing to save; read from the editor, not `body`,
  // as the editor writes markdown a little differently from how it was read.
  const savedRef = useRef<string | null>(null);
  savedRef.current ??= editorValueToMarkdown(editor.children as never);

  /** Writes the editor's text as the draft. */
  async function writeDraft(): Promise<void> {
    const markdown = editorValueToMarkdown(editor.children as never);
    const { saveDocumentDraft } = await graphqlRequest(SaveDraftDocument, {
      documentId,
      body: markdown,
      expectedRevision: revisionRef.current,
    });
    savedRef.current = markdown;
    revisionRef.current = saveDocumentDraft.revision;
    setRevision(saveDocumentDraft.revision);
    setDirty(false);
  }

  async function save(): Promise<void> {
    setSaving(true);
    setFailure(undefined);
    setPublished(undefined);
    try {
      await writeDraft();
    } catch (error) {
      setFailure(readGraphqlFailure(error).alert);
    }
    setSaving(false);
  }

  async function publish(): Promise<void> {
    if (dirty) await writeDraft();
    const { publishDocumentDraft } = await graphqlRequest(PublishDraftDocument, {
      documentId,
      expectedRevision: revisionRef.current,
    });
    revisionRef.current = null;
    setRevision(null);
    setDirty(false);
    setFailure(undefined);
    setPublished(publishDocumentDraft.number);
  }

  return (
    <div className="document-editor">
      <h2>{title}</h2>
      <p className="lede">{lede}</p>
      {mailing}
      <div className="document-page__body document-editor__text">
        <Plate
          editor={editor}
          onValueChange={({ value }) =>
            setDirty(editorValueToMarkdown(value as never) !== savedRef.current)
          }
        >
          <Toolbar />
          <PlateContent aria-label="Document Text" />
        </Plate>
      </div>
      <div className="document-editor__bar">
        <BusyButton
          className="btn"
          type="button"
          busy={saving}
          busyLabel="Saving Draft"
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          Save Draft
        </BusyButton>
        <ConfirmedAction
          label="Publish"
          accessibleName="Publish"
          openClass="btn btn--caution"
          title={`Publish ${title}`}
          question={<PublishQuestion documentKey={documentKey} title={title} />}
          busy="Publishing"
          confirmClass="btn btn--caution"
          disabled={revision === null && !dirty}
          send={publish}
          onSent={() => undefined}
          closeOnSent
        />
        <p className="document-editor__status">
          {dirty
            ? 'Unsaved changes.'
            : revision === null
              ? `Showing version ${nextNumber - 1}.`
              : 'Draft saved.'}
        </p>
      </div>
      {failure && <Notice kind="error">{failure}</Notice>}
      {published !== undefined && <Notice kind="success">Published as version {published}.</Notice>}
    </div>
  );
};

export default DocumentEditor;
