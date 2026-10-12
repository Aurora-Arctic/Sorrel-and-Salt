import type { Story } from '@ladle/react';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { ComboboxMultiSelect, ComboboxSelect } from '../Combobox';
import { GROUP_NAMES, asSlugs } from '../../../.ladle/fixtures';
import Modal, { ConfirmQuestion, DiscardQuestion, RouteModal, useDiscardGuard } from '.';

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

/**
 * An edit dialog's head (MB.115): the eyebrow says what it does to what
 * kind, the title which entry, by the name it was saved under, and a
 * qualifier after it, here a binomial in its italics. The name wraps rather
 * than pushing the × out, as the phone stories show.
 */
export const Editing: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal
          eyebrow="Edit Ingredient"
          title="Testwort of the Long Fixture Meadow"
          qualifier={<span className="binomial">Fixtura testalis var. longissima</span>}
          onClose={() => setOpen(false)}
        >
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field__label" htmlFor="story-editing-name">
                Name
              </label>
              <input
                id="story-editing-name"
                className="input"
                defaultValue="Testwort of the Long Fixture Meadow"
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export const EditingDark: Story = () => <Editing />;
export const EditingLight: Story = () => <Editing />;
export const EditingPhoneDark: Story = () => <Editing />;
export const EditingPhoneLight: Story = () => <Editing />;

Editing.meta = { iframed: true };
EditingDark.meta = { iframed: true, theme: 'dark' };
EditingLight.meta = { iframed: true, theme: 'light' };
EditingPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
EditingPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// The address-driven wrapper the admin pages open: the workshop's router goes
// nowhere, so Close, Escape and Done fade it out and leave it gone until the
// story is reloaded. Done stands for a form's save.
export const OpenedByItsAddress: Story = () => (
  <RouteModal eyebrow="Edit Category" title="Testcraft" closeHref={'/admin/categories' as Route}>
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
 * Close, Escape or a click outside would ask (MB.115): over the form, which
 * is dimmed and held until it is answered. Escape, Close or a click outside
 * now flashes it, as each try while asking does. Keep Editing goes back to
 * the form, whose Cancel asks again; Discard Changes closes.
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
      <div className="form__actions">
        <button type="submit" className="btn btn--solid">
          Save Category
        </button>
        <button type="button" className="btn btn--quiet" onClick={() => request(close)}>
          Cancel
        </button>
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
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
        <Modal eyebrow="Edit Category" title="Testwort" onClose={() => setOpen(false)}>
          {(done) => <ChangedForm close={done} />}
        </Modal>
      )}
    </>
  );
};

AskingToDiscardChanges.meta = { iframed: true };

// The question at a phone's width in each theme: its card fills the width
// in view, and its buttons stack, full width, as the form's own do under 28rem.
export const PhoneDark: Story = () => <AskingToDiscardChanges />;
export const PhoneLight: Story = () => <AskingToDiscardChanges />;

PhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
PhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// The shared form groups, the first three, by slug as a picker's values are.
const PICKS = asSlugs(GROUP_NAMES.form.slice(0, 3)).map(({ slug, name }) => ({
  value: slug,
  label: name,
}));

/**
 * A form asked to confirm a delete over itself: Delete, destructive, and
 * Keep It, the focus on it. A press of Delete leaves it busy, "Deleting",
 * as a delete in flight does, since this one never lands; Keep It closes
 * the question.
 */
function DeletingForm() {
  const [asked, setAsked] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <form className="form" onSubmit={(event) => event.preventDefault()}>
      <p>Fixture Healing holds no categories.</p>
      <div className="form__actions">
        <button type="button" className="btn btn--destructive" onClick={() => setAsked(true)}>
          Delete Group
        </button>
      </div>
      <ConfirmQuestion
        asked={asked}
        question={<>Delete &quot;Fixture Healing&quot;? No categories are filed under it.</>}
        busy={busy}
        onConfirm={() => {
          setBusy(true);
          return new Promise(() => {});
        }}
        onKeep={() => {
          setBusy(false);
          setAsked(false);
        }}
      />
    </form>
  );
}

export const AskingToConfirm: Story = () => (
  <Modal eyebrow="Edit Group" title="Fixture Healing" onClose={() => {}}>
    <DeletingForm />
  </Modal>
);

AskingToConfirm.meta = { iframed: true };

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
        <Modal eyebrow="Edit Form" title="Fixture Oil" onClose={() => setOpen(false)}>
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
