import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Notice from '.';

// Render-only; the role each kind takes is asserted in tests/components/Notice.
const meta = {
  title: 'Feedback / Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const FailureView = () => (
  <Notice kind="error">That link has expired. Send a new one below.</Notice>
);

export const Failed: Story = { render: FailureView };

const WarningView = () => (
  <Notice kind="warn">
    This is close to &quot;Testwort Wards&quot;&apos;s dark theme colour, so their chips may be hard
    to tell apart. You can still save it.
  </Notice>
);

export const Warning: Story = { render: WarningView };

export const QuietWarning: Story = {
  render: () => (
    <Notice kind="warn" quiet>
      This address is unverified, so approving vouches for it as a sign-in would.
    </Notice>
  ),
};

const CautionView = () => (
  <Notice kind="caution">
    Testwort is out of stock, so this spell cannot be made from the cupboard as it stands.
  </Notice>
);

export const Caution: Story = { render: CautionView };

const SuccessView = () => <Notice kind="success">Your name was saved.</Notice>;

export const Success: Story = { render: SuccessView };

const PlainView = () => <Notice kind="plain">Nothing has changed since you last saved.</Notice>;

export const Default: Story = { render: PlainView };

// The block form: a sentence with a list and a button beneath it, as the
// duplicates warning holds, in a warning and an error.
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

const BlockWarningView = () => (
  <Notice kind="warn" block>
    <BlockContent />
  </Notice>
);

export const BlockWarning: Story = { render: BlockWarningView };

const BlockFailureView = () => (
  <Notice kind="error" block>
    <BlockContent />
  </Notice>
);

export const BlockFailure: Story = { render: BlockFailureView };
