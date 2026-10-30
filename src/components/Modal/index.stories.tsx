import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { ComboboxMultiSelect, ComboboxSelect } from '../Combobox';
import { GROUP_NAMES, asSlugs } from '../../../.storybook/fixtures';
import { Reopenable } from '../../../.storybook/reopenable';
import Modal, {
  ConfirmQuestion,
  DiscardQuestion,
  ModalButton,
  RouteModal,
  useDiscardGuard,
} from '.';
import { RouteModalContext } from './route-modal-provider';
import { usePressOnMount } from '../../../.storybook/press';

// Render-only; behaviour is asserted in tests/components/Modal. The owner closes
// it by unmounting it, so the story keeps an Open button; a story with no state of
// its own stands on `Reopenable` (.storybook/reopenable.tsx).
const meta = {
  title: 'Surfaces / Modal',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const DefaultView = () => {
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
const defaultNode = <DefaultView />;

// In its own iframe: `showModal()` puts the dialog in the top layer, which in
// the workshop's own document would cover Storybook's sidebar too.
/**
 * An edit dialog's head: the eyebrow says the action, the title which entry, and a
 * qualifier follows it (here a binomial in italics). The name wraps rather than
 * pushing the × out, as the phone stories show.
 */
const EditingView = () => {
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

const editingNode = <EditingView />;

// A modal a button opens: however it closes, Close, Escape, a click
// outside or Done, the focus ring is back on the button.
const ButtonModal = () => (
  <ModalButton label="Open" className="btn btn--solid" title="Add Category">
    {(close) => (
      <div className="modal__actions">
        <button type="button" className="btn btn--solid" onClick={close}>
          Done
        </button>
      </div>
    )}
  </ModalButton>
);

const openedByAButtonNode = <ButtonModal />;

// The same, pressed open as the story mounts, so the dialog itself shows.
const OpenedByAButtonOpenView = () => {
  usePressOnMount('Open');
  return <ButtonModal />;
};
const openedByAButtonOpenNode = <OpenedByAButtonOpenView />;

// The address-driven wrapper the admin pages open. The workshop's router reports
// where it was sent (.storybook/navigation.ts) and `Reopenable` unmounts it. Close,
// Escape and Done fade it out and leave Open Again; Done stands for a save.
const openedByItsAddressNode = (
  <Reopenable>
    {() => (
      <RouteModal
        closeHref={'/admin/categories' as Route}
        content={{
          heading: { eyebrow: 'Edit Category', title: 'Testcraft' },
          body: (done) => (
            <div className="modal__actions">
              <button type="button" className="btn btn--solid" onClick={done}>
                Done
              </button>
            </div>
          ),
        }}
      />
    )}
  </Reopenable>
);

// A route modal pressed open while its page is on its way: the pressed row's head
// over the form's skeleton, through a provider whose navigation never arrives.
// Close still leaves it.
const LoadingView = () => (
  <Reopenable>
    {() => (
      <RouteModalContext.Provider
        value={{
          loading: { eyebrow: 'Edit Category', title: 'Testcraft' },
          open: () => undefined,
          cancel: () => undefined,
        }}
      >
        <RouteModal closeHref={'/admin/categories' as Route} />
      </RouteModalContext.Provider>
    )}
  </Reopenable>
);

const loadingNode = <LoadingView />;

/**
 * A form with a change, asked on opening whether to discard it, as Cancel, Close,
 * Escape or a click outside would ask. The form is dimmed until answered, and each
 * further try flashes the question. Keep Editing returns; Discard Changes closes.
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

const AskingToDiscardChangesView = () => {
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

const askingToDiscardChangesNode = <AskingToDiscardChangesView />;

// The head's other parts, one story each beside the plain dialog (Modal/types.ts).
const HeadView = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal
          topEnd={<span className="badge">Updated</span>}
          aboveName={<span>Last edited by Ada Fixturewort</span>}
          formalName={<span className="binomial">Fixtura testalis</span>}
          formalActions={
            <button type="button" className="btn btn--quiet">
              Edit
            </button>
          }
          title="Testwort"
          under={<span className="badge">Safe</span>}
          onClose={() => setOpen(false)}
        >
          <p>The entry's own text.</p>
        </Modal>
      )}
    </>
  );
};

const withEveryHeadPartNode = <HeadView />;

const DestinationView = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Add Ingredient" destination="Whitethorn Coven" onClose={() => setOpen(false)}>
          <p>Where the add lands is named over the title.</p>
        </Modal>
      )}
    </>
  );
};

const withADestinationNode = <DestinationView />;

const ListedView = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal
          title="Edit Stock"
          size="listed"
          readingBody
          foot={
            <button type="button" className="btn">
              See in Your Cupboard
            </button>
          }
          onClose={() => setOpen(false)}
        >
          <p>A body to read, with a bar beneath it that never moves.</p>
        </Modal>
      )}
    </>
  );
};

const listedWithAFootNode = <ListedView />;

// The shared form groups, the first three, by slug as a picker's values are.
const PICKS = asSlugs(GROUP_NAMES.form.slice(0, 3)).map(({ slug, name }) => ({
  value: slug,
  label: name,
}));

/**
 * A form asked to confirm a delete over itself: Delete (destructive) and Keep It,
 * focused. Delete leaves it busy, "Deleting", since this one never lands; Keep It
 * closes the question.
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

const askingToConfirmNode = (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Group" title="Fixture Healing" onClose={close}>
        <DeletingForm />
      </Modal>
    )}
  </Reopenable>
);

// A picker and a multi-picker in a modal: Escape on an open list closes the
// list alone, and a second Escape, the list shut, closes the modal.
const WithPickersView = () => {
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
const withPickersNode = <WithPickersView />;

const MODAL_STATES: Record<string, ReactNode> = {
  Plain: defaultNode,
  Editing: editingNode,
  'Opened By A Button': openedByAButtonNode,
  'Opened By A Button And Pressed': openedByAButtonOpenNode,
  'Opened By Its Address': openedByItsAddressNode,
  Loading: loadingNode,
  'Asking To Discard Changes': askingToDiscardChangesNode,
  'With Every Head Part': withEveryHeadPartNode,
  'With A Destination': withADestinationNode,
  'Listed With A Foot': listedWithAFootNode,
  'Asking To Confirm': askingToConfirmNode,
  'With Pickers': withPickersNode,
};

export const States: Story = {
  args: { state: 'Plain' },
  argTypes: {
    state: { control: 'select', options: Object.keys(MODAL_STATES), mapping: MODAL_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
