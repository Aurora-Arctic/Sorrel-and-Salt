import type { Story } from '@ladle/react';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { ComboboxMultiSelect, ComboboxSelect } from '../Combobox';
import Modal, { DiscardQuestion, RouteModal, useDiscardGuard } from '.';

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

// The address-driven wrapper the admin pages open: the workshop's router goes
// nowhere, so Close, Escape and Done fade it out and leave it gone until the
// story is reloaded. Done stands for a form's save.
export const OpenedByItsAddress: Story = () => (
  <RouteModal title="Edit Category" closeHref={'/admin/categories' as Route}>
    {(done) => (
      <div className="modal__actions">
        <button type="button" className="btn btn--solid" onClick={done}>
          Done
        </button>
      </div>
    )}
  </RouteModal>
);

OpenedByItsAddress.meta = { iframed: true };

/**
 * A form with a change, asked on opening whether to discard it, as Cancel,
 * Close, Escape or a click outside would ask (MB.115). Keep Editing goes back
 * to the form, whose Cancel asks again; Discard Changes closes.
 */
function ChangedForm({ close }: { close: () => void }) {
  const [name, setName] = useState('Testwort Renamed');
  const discard = useDiscardGuard(name !== 'Testwort');
  const { request } = discard;
  // The question shown from the start, once, as a press of Cancel would show it.
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    request(close);
  }, [request, close]);
  return (
    <form className="form" onSubmit={(event) => event.preventDefault()}>
      <div className="field">
        <label className="field__label" htmlFor="story-discard-name">
          Name
        </label>
        <input
          id="story-discard-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {discard.asking ? (
        <DiscardQuestion guard={discard} />
      ) : (
        <div className="form__actions">
          <button type="submit" className="btn btn--solid">
            Save Category
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => request(close)}>
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}

export const AskingToDiscardChanges: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Edit Category" onClose={() => setOpen(false)}>
          {(done) => <ChangedForm close={done} />}
        </Modal>
      )}
    </>
  );
};

AskingToDiscardChanges.meta = { iframed: true };

// The question at a phone's width in each theme: its buttons stack, full
// width, as the form's own do under 28rem.
export const PhoneDark: Story = () => <AskingToDiscardChanges />;
export const PhoneLight: Story = () => <AskingToDiscardChanges />;

PhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
PhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

const PICKS = [
  { value: 'fixture-mineral', label: 'Fixture Mineral' },
  { value: 'fixture-substance', label: 'Fixture Substance' },
  { value: 'mock-preparation', label: 'Mock Preparation' },
];

// A picker and a multi-picker in a modal: Escape on an open list closes the
// list alone, and a second Escape, the list shut, closes the modal (MB.115).
export const WithPickers: Story = () => {
  const [open, setOpen] = useState(true);
  const [group, setGroup] = useState('');
  const [colours, setColours] = useState<string[]>([]);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Edit Form" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <span className="field__label" id="story-group-label">
                Group
              </span>
              <ComboboxSelect
                id="story-group"
                label="Group"
                labelId="story-group-label"
                value={group}
                onChange={setGroup}
                choices={PICKS}
                placeholder="Choose a group"
              />
            </div>
            <div className="field">
              <span className="field__label" id="story-colours-label">
                Colours
              </span>
              <ComboboxMultiSelect
                id="story-colours"
                label="Colours"
                labelId="story-colours-label"
                values={colours}
                onChange={setColours}
                choices={PICKS}
                placeholder="Add a colour"
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

WithPickers.meta = { iframed: true };
