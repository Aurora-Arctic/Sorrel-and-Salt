import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminInvitations from '@/components/AdminInvitations';
import EmailForm from '@/components/EmailForm';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import InviteDialog from '@/components/InviteDialog';
import { EMAIL_FORMAT_MESSAGE } from '@/lib/email-address';
import { renderWithQuery } from '../support/render-with-query';

// What an address field does when it is left, written once for every form that asks for one. The address's own shape
// is tests/lib/email-address.test.ts's; this is each form's wiring of it. Each form's test keeps its submit behaviour.

interface AddressForm {
  render: () => void;
  field: () => HTMLElement;
}

const inDialog = () =>
  within(screen.getByRole('dialog')).getByRole('textbox', { name: /^Email Address/ });

const FORMS: Record<string, AddressForm> = {
  EmailForm: {
    render: () => renderWithQuery(<EmailForm email="" verified={false} landing="/coven" />),
    field: () => screen.getByRole('textbox', { name: /^Email Address/ }),
  },
  ForgotPasswordForm: {
    render: () => render(<ForgotPasswordForm />),
    field: () => screen.getByRole('textbox', { name: /^Email Address/ }),
  },
  InviteDialog: {
    render: () => {
      render(<InviteDialog workspaceId="00000000-0000-0000-0000-000000000001" />);
      fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    },
    field: inDialog,
  },
  AdminInvitations: {
    render: () => render(<AdminInvitations invitations={[]} inviting />),
    field: inDialog,
  },
};

describe.each(Object.entries(FORMS))('the address field of %s', (_, form) => {
  it('tidies the address when the field is left: ends trimmed, all of it lower-cased', () => {
    form.render();

    fireEvent.change(form.field(), { target: { value: '  Ada@Example.TEST ' } });
    fireEvent.blur(form.field());

    expect(form.field()).toHaveValue('ada@example.test');
  });

  it('flags a malformed address when the field is left, linked to the field', () => {
    form.render();
    // Precondition: the field starts unflagged, so the flag is the blur's doing.
    expect(form.field()).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(form.field(), { target: { value: 'name@' } });
    fireEvent.blur(form.field());

    expect(form.field()).toHaveAttribute('aria-invalid', 'true');
    expect(form.field()).toHaveAccessibleDescription(expect.stringContaining(EMAIL_FORMAT_MESSAGE));
  });
});
