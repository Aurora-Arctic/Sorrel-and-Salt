'use client';

import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { type ReactElement, useMemo, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { useAutosave, type SaveResult } from '../../lib/autosave';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
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
// sees (by the shared autosave, or at once by Save Draft), then published as the next version. A save, a publish and a
// restore send the draft's revision, so a second admin's save in between is refused rather than overwritten (claude-docs/components/document-editor.md).

const SaveDraftDocument = graphql(`
  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {
    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {
      id
      revision
    }
  }
`);

const DiscardDraftDocument = graphql(`
  mutation DiscardDocumentDraft($documentId: ID!, $expectedRevision: Int!) {
    discardDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision)
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
  publishedBody,
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
  const [markdown, setMarkdown] = useState(() => editorValueToMarkdown(editor.children as never));
  const [publishing, setPublishing] = useState(false);
  // Bumped when a publish fails with text still unsaved, so the autosave sees that text as a fresh change.
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState<string>();
  const [published, setPublished] = useState<number>();
  // The revision a write must send, kept in a ref too: a publish that saves first reads the revision that save returned.
  const revisionRef = useRef(openRevision);
  // The markdown last opened or saved, so undoing back to it leaves nothing to save; read from the editor, not `body`,
  // as the editor writes markdown a little differently from how it was read.
  const savedRef = useRef<string | null>(null);
  savedRef.current ??= editorValueToMarkdown(editor.children as never);

  /** Writes `text` as the draft, against the revision the last write answered with. */
  async function writeDraft(text: string): Promise<SaveResult> {
    setFailure(undefined);
    setPublished(undefined);
    try {
      const { saveDocumentDraft } = await graphqlRequest(SaveDraftDocument, {
        documentId,
        body: text,
        expectedRevision: revisionRef.current,
      });
      savedRef.current = text;
      revisionRef.current = saveDocumentDraft.revision;
      setRevision(saveDocumentDraft.revision);
      // Text typed while the save was in flight is not on the server yet.
      setDirty(editorValueToMarkdown(editor.children as never) !== text);
      return {
        revision: saveDocumentDraft.revision,
        savedAt: new Date(),
        id: saveDocumentDraft.id,
      };
    } catch (error) {
      setFailure(readGraphqlFailure(error).alert);
      throw error;
    }
  }

  // A publish writes its own save, so the autosave sees nothing to save while it runs, and leaving is not held for it.
  const autosave = useAutosave<{ markdown: string; retry: number }>({
    value: useMemo(() => ({ markdown, retry }), [markdown, retry]),
    dirty: dirty && !publishing,
    enabled: !publishing,
    save: ({ markdown: text }) => writeDraft(text),
    revision: openRevision,
  });
  const saving = autosave.status === 'saving';
  const guard = useDiscardGuard(dirty && !saving && !publishing);

  async function publish(): Promise<void> {
    setPublishing(true);
    try {
      if (dirty) await writeDraft(editorValueToMarkdown(editor.children as never));
      const { publishDocumentDraft } = await graphqlRequest(PublishDraftDocument, {
        documentId,
        expectedRevision: revisionRef.current,
      });
      revisionRef.current = null;
      setRevision(null);
      setDirty(false);
      setFailure(undefined);
      setPublished(publishDocumentDraft.number);
    } catch (error) {
      setRetry((count) => count + 1);
      throw error;
    } finally {
      setPublishing(false);
    }
  }

  /** Throws the open draft away, when there is one, and puts the published text back in the editor. */
  async function restore(): Promise<void> {
    if (revisionRef.current !== null) {
      await graphqlRequest(DiscardDraftDocument, {
        documentId,
        expectedRevision: revisionRef.current,
      });
    }
    // With nothing to delete the dialog would close in the click's own tick; a turn later lets the editor's value change land first.
    else await new Promise((resolve) => setTimeout(resolve, 0));
    const restored = markdownToEditorValue(publishedBody);
    const text = editorValueToMarkdown(restored as never);
    savedRef.current = text;
    revisionRef.current = null;
    editor.tf.setValue(restored);
    setMarkdown(text);
    setRevision(null);
    setDirty(false);
    setFailure(undefined);
    setPublished(undefined);
  }

  return (
    <div className="document-editor">
      <h2>{title}</h2>
      <p className="lede">{lede}</p>
      {mailing}
      <div className="document-page__body document-editor__text">
        <Plate
          editor={editor}
          onValueChange={({ value }) => {
            const text = editorValueToMarkdown(value as never);
            setMarkdown(text);
            setDirty(text !== savedRef.current);
          }}
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
          onClick={() => autosave.flush().catch(() => {})}
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
          disabled={(revision === null && !dirty) || saving}
          send={publish}
          closeOnSent
        />
        <ConfirmedAction
          label="Restore Published Version"
          accessibleName="Restore Published Version"
          openClass="btn"
          title="Restore Published Version"
          question={
            <>
              Throw away this draft and show the published text again? Readers see no change, and
              the draft cannot be brought back.
            </>
          }
          busy="Restoring"
          confirmClass="btn btn--destructive"
          disabled={(revision === null && !dirty) || saving || publishing}
          send={restore}
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
      {guard.asking && <DiscardQuestion guard={guard} />}
      {failure && <Notice kind="error">{failure}</Notice>}
      {published !== undefined && <Notice kind="success">Published as version {published}.</Notice>}
    </div>
  );
};

export default DocumentEditor;
