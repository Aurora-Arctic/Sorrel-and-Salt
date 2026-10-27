import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmedAction from '@/components/UserList/confirmed-action';
import type { ConfirmedActionProps } from '@/components/UserList/types';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The ask-first action every admin control is built on (Approve, Revoke,
// Change Role, Impersonate, the pause switch, an invitation's Revoke): its
// asking, its busy confirm, its refusal and its success are proved once
// here, so each control's own file proves only what it sends and what it
// says (layer-ownership.md, rule 6).

const NAME = 'Approve Testwort Fixture';

const props = (overrides: Partial<ConfirmedActionProps> = {}): ConfirmedActionProps => ({
  label: 'Approve',
  accessibleName: NAME,
  openClass: 'btn',
  title: 'Approve Coven Creation',
  question: 'Approve Testwort Fixture?',
  busy: 'Approving…',
  confirmClass: 'btn btn--primary',
  send: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const opener = () => screen.getByRole('button', { name: NAME });
const asking = () => screen.getByRole('dialog', { name: 'Approve Coven Creation' });
const confirmButton = () => within(asking()).getByRole('button', { name: 'Approve' });

afterEach(() => {
  router.refresh.mockReset();
});

describe('ConfirmedAction', () => {
  it('asks first, the focus on the confirm, and Cancel closes it with nothing sent and the focus back', () => {
    const send = vi.fn();
    render(<ConfirmedAction {...props({ send })} />);

    fireEvent.click(opener());

    expect(confirmButton()).toHaveFocus();
    fireEvent.click(within(asking()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener()).toHaveFocus();
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps the confirm and Cancel disabled and the confirm busy while the write is out, and sends once', async () => {
    // Never answers, so the write stays out.
    const send = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ConfirmedAction {...props({ send })} />);

    fireEvent.click(opener());
    const confirm = confirmButton();
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm).toHaveAttribute('aria-busy', 'true'));
    expect(confirm).toBeDisabled();
    expect(within(asking()).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.click(confirm);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends the reason trimmed, and none when it is blank', async () => {
    const send = vi.fn().mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<ConfirmedAction {...props({ send, withNote: true })} />);

    fireEvent.click(opener());
    fireEvent.change(within(asking()).getByRole('textbox'), {
      target: { value: '  vouched for  ' },
    });
    fireEvent.click(confirmButton());
    expect(send).toHaveBeenLastCalledWith('vouched for');
    unmount();

    render(<ConfirmedAction {...props({ send, withNote: true })} />);
    fireEvent.click(opener());
    fireEvent.click(confirmButton());
    expect(send).toHaveBeenLastCalledWith(undefined);
  });

  it('says its announcement once sent, and reads the page again, the modal still open and busy', async () => {
    render(
      <ConfirmedAction {...props({ announcement: 'Testwort Fixture may now create a coven' })} />,
      {
        wrapper: StatusRegionProvider,
      },
    );
    expect(announced()).toBe('');

    fireEvent.click(opener());
    const confirm = confirmButton();
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(announced()).toBe('Testwort Fixture may now create a coven');
    expect(confirm).toHaveAttribute('aria-busy', 'true');
  });

  it('runs onSent in place of reading the page again', async () => {
    const onSent = vi.fn();
    render(<ConfirmedAction {...props({ onSent })} />);

    fireEvent.click(opener());
    fireEvent.click(confirmButton());

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('closes the modal once sent when it asks to, for a control the re-read keeps', async () => {
    render(<ConfirmedAction {...props({ closeOnSent: true })} />);

    fireEvent.click(opener());
    fireEvent.click(confirmButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('closes the modal on a refusal and says why under the control, which is usable again', async () => {
    const send = vi.fn().mockRejectedValue(new Error('refused'));
    render(<ConfirmedAction {...props({ send, refusal: 'Testwort Fixture is paused' })} />);

    fireEvent.click(opener());
    fireEvent.click(confirmButton());

    const said = await expectRefusalUnder(opener(), NAME);
    expect(said).toContain('Testwort Fixture is paused');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener()).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('clears the last refusal when asked again', async () => {
    const send = vi.fn().mockRejectedValue(new Error('refused'));
    render(<ConfirmedAction {...props({ send, refusal: 'Testwort Fixture is paused' })} />);

    fireEvent.click(opener());
    fireEvent.click(confirmButton());
    await screen.findByRole('alert');

    fireEvent.click(opener());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
