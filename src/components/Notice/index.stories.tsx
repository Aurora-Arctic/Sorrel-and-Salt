import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import Notice from '.';

// Render-only; the role each kind takes is asserted in tests/components/Notice.
const meta = {
  title: 'Feedback / Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The block form: a sentence with a list and a button beneath it, as the duplicates warning holds,
// in a warning and an error.
const BlockContent = () => (
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
    <button type="button" className="btn btn--medium">
      Create Anyway
    </button>
  </>
);

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="24rem"
      states={{
        Plain: <Notice kind="plain">Nothing has changed since you last saved.</Notice>,
        Failed: <Notice kind="error">That link has expired. Send a new one below.</Notice>,
        Warning: (
          <Notice kind="warn">
            This is close to &quot;Testwort Wards&quot;&apos;s dark theme colour, so their chips may
            be hard to tell apart. You can still save it.
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
            <BlockContent />
          </Notice>
        ),
        'Block Failure': (
          <Notice kind="error" block>
            <BlockContent />
          </Notice>
        ),
      }}
    />
  ),
};
