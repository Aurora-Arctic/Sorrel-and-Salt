import type { Story } from '@ladle/react';
import { useState } from 'react';
import Modal from '.';

// Render-only; behaviour is asserted in tests/components/Modal. The owner
// closes it by unmounting it, so the story keeps an Open button to bring it
// back after Close or Escape.
export default {
  title: 'Surfaces / Modal',
};

export const WithAForm: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Add Category" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field__label" htmlFor="story-name">
                Name
              </label>
              <input id="story-name" className="input" />
            </div>
            <div className="modal__actions">
              <button type="submit" className="btn btn--solid">
                Save Category
              </button>
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

// In its own iframe: `showModal()` puts the dialog in the top layer, which in
// the workshop's own document would cover Ladle's sidebar too.
WithAForm.meta = { iframed: true };

// The wide size, for a long form (M5.5): the compendium entry's is the first.
export const Wide: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Add Ingredient" size="wide" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field__label" htmlFor="story-wide-name">
                Name
              </label>
              <input id="story-wide-name" className="input" defaultValue="Testwort" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="story-wide-formal">
                Formal Name
              </label>
              <input id="story-wide-formal" className="input" defaultValue="Fixtura testalis" />
            </div>
            <div className="modal__actions">
              <button type="submit" className="btn btn--solid">
                Save Ingredient
              </button>
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

Wide.meta = { iframed: true };
