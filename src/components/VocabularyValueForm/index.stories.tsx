import type { Story } from '@ladle/react';
import Modal from '../Modal';
import VocabularyValueForm from '.';

// Render-only; behaviour is asserted in tests/components/VocabularyValueForm.
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin page opens it in.
export default {
  title: 'Admin / Vocabulary Value Form',
};

const done = () => {};

export const AddingAPlanet: Story = () => (
  <Modal title="Add Planet" onClose={done}>
    <VocabularyValueForm vocabulary="planets" onDone={done} />
  </Modal>
);

// Rename it to see the note by Save that the rename carries onto the compendium.
export const EditingASign: Story = () => (
  <Modal title="Edit Sign" onClose={done}>
    <VocabularyValueForm
      vocabulary="zodiacSigns"
      value={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Fixture Ram',
        description: 'An invented sign, for the workshop.',
      }}
      onDone={done}
    />
  </Modal>
);

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
AddingAPlanet.meta = { iframed: true };
EditingASign.meta = { iframed: true };
