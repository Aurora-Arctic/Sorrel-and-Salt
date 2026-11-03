'use client';

import { useId, useState } from 'react';
import Modal from '../Modal';

/** The dialog that asks for a link's address, and links the words that were selected when it opened. */
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
  const [failed, setFailed] = useState(false);
  const inputId = useId();
  const errorId = useId();

  function add() {
    if (onAdd(url.trim())) onClose();
    else setFailed(true);
  }

  return (
    <Modal title="Add Link" onClose={onClose} returnTo={returnTo}>
      <div className="field">
        <label className="field__label" htmlFor={inputId}>
          Address
        </label>
        <input
          id={inputId}
          className="input"
          type="url"
          value={url}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? errorId : undefined}
          onChange={(event) => {
            setUrl(event.target.value);
            setFailed(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        {failed && (
          <p id={errorId} role="alert">
            Enter a full web address, such as https://example.com.
          </p>
        )}
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
