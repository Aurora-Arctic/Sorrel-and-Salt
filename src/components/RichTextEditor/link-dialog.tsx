'use client';

import { useState } from 'react';
import { linkAddressProblem, tidyLinkAddress } from '../../lib/link-address';
import { PlainTextField } from '../Field/plain-text-field';
import Modal from '../Modal';

export default function LinkDialog({
  onAdd,
  onClose,
  returnTo,
}: {
  onAdd: (url: string) => boolean;
  onClose: () => void;
  returnTo: () => HTMLElement | null;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();

  function add() {
    const address = tidyLinkAddress(url);
    setUrl(address);
    const problem = linkAddressProblem(address);
    if (problem) setError(problem);
    else if (onAdd(address)) onClose();
    else setError(linkAddressProblem('') as string);
  }

  return (
    <Modal title="Add Link" onClose={onClose} returnTo={returnTo}>
      {/* A div, not a form: the dialog can sit inside the document's own form. */}
      <div
        role="presentation"
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          add();
        }}
      >
        <PlainTextField
          name="address"
          label="Address"
          type="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="https://example.com"
          format={tidyLinkAddress}
          value={url}
          error={error}
          onChange={(next) => {
            setUrl(next);
            setError(undefined);
          }}
        />
      </div>
      <div className="form__actions">
        <button type="button" className="btn btn--solid" onClick={add}>
          Add Link
        </button>
        <button type="button" className="btn btn--quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
