import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import Notice from '.';

// Render-only; the role each kind takes is asserted in tests/components/Notice.
const meta = {
  title: 'Feedback / Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ onCreateAnyway: () => void; created: boolean }>;

// The block form: a sentence with a list and a button beneath it, as the duplicates warning holds,
// in a warning and an error. Create Anyway calls the handler the story was given
// (logged in the Actions panel) and the line beneath each notice says it was pressed.
const BlockContent = ({ onCreateAnyway }: { onCreateAnyway: () => void }) => (
  <>
    <p>Did you mean one of these?</p>
    <ul>
      <li>
        <a href="#testwort">Testwort (Fixtura vulgaris)</a>
      </li>
      <li>
        <a href="#mockleaf">Mockleaf</a>
      </li>
    </ul>
    <button type="button" className="btn btn--medium" onClick={onCreateAnyway}>
      Create Anyway
    </button>
  </>
);

export const States: Story = {
  args: { onCreateAnyway: fn(), created: false },
  render: function Render({ onCreateAnyway, created }) {
    const [, updateArgs] = useArgs<{ created: boolean }>();
    const createAnyway = () => {
      onCreateAnyway();
      updateArgs({ created: true });
    };
    const block = (
      <>
        <BlockContent onCreateAnyway={createAnyway} />
        {created && <output>Created anyway</output>}
      </>
    );
    return (
      <StatesGrid
        cell="24rem"
        states={{
          Plain: <Notice kind="plain">Nothing has changed since you last saved.</Notice>,
          Failed: <Notice kind="error">That link has expired. Send a new one below.</Notice>,
          Warning: (
            <Notice kind="warn">
              This is close to &quot;Testwort Wards&quot;&apos;s dark theme colour, so their chips
              may be hard to tell apart. You can still save it.
            </Notice>
          ),
          'Quiet Warning': (
            <Notice kind="warn" quiet>
              This address is unverified, so approving vouches for it as a sign-in would.
            </Notice>
          ),
          Caution: (
            <Notice kind="caution">
              Testwort is out of stock, so this spell cannot be made from the cupboard as it stands.
            </Notice>
          ),
          Success: <Notice kind="success">Your name was saved.</Notice>,
          'Block Warning': (
            <Notice kind="warn" block>
              {block}
            </Notice>
          ),
          'Block Failure': (
            <Notice kind="error" block>
              {block}
            </Notice>
          ),
        }}
      />
    );
  },
};
