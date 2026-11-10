import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBusinessCards } from '@/lib/business-cards/pdf';
import { fetchCardAssets } from '@/lib/invitation-cards/assets';
import type { CardAssets } from '@/lib/invitation-cards/types';
import { saveFile } from '@/lib/save-file';
import BusinessCards from '@/components/BusinessCards';

vi.mock('@/lib/invitation-cards/assets', () => ({ fetchCardAssets: vi.fn() }));
vi.mock('@/lib/business-cards/pdf', () => ({ renderBusinessCards: vi.fn() }));
vi.mock('@/lib/save-file', () => ({ saveFile: vi.fn() }));

const ASSETS = { salt: new Uint8Array([1]) } as unknown as CardAssets;
const PDF = new Uint8Array([37, 80, 68, 70]);

const generate = () => screen.getByRole('button', { name: 'Generate' });
const fill = (label: string, text: string) => {
  const field = screen.getByRole('textbox', { name: label });
  fireEvent.change(field, { target: { value: text } });
  fireEvent.blur(field);
};
const fillAll = (email = 'testwort@example.test') => {
  fill('Name', 'Testwort Hollin');
  fill('Email', email);
  fill('Phone', '202-555-0199');
};

beforeEach(() => {
  vi.mocked(fetchCardAssets).mockReset().mockResolvedValue(ASSETS);
  vi.mocked(renderBusinessCards).mockReset().mockResolvedValue(PDF);
  vi.mocked(saveFile).mockReset();
});

describe('BusinessCards', () => {
  it('lays the phone number out while it is typed, in the form of its own country', async () => {
    render(<BusinessCards />);
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    const phone = screen.getByRole('textbox', { name: 'Phone' });
    fireEvent.input(phone, { target: { value: '2025550123' } });
    expect(phone).toHaveValue('(202) 555-0123');
    fireEvent.input(phone, { target: { value: '+44 7911 123456' } });
    expect(phone).toHaveValue('+44 7911 123456');
  });

  it("names the phone as the keeper's own for autofill", async () => {
    render(<BusinessCards />);
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveAttribute('autocomplete', 'tel');
  });

  it('refuses a number that is not one, with an example, and builds nothing on Generate', async () => {
    render(<BusinessCards />);
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    fillAll();
    fill('Phone', '555-0123');

    const phone = screen.getByRole('textbox', { name: 'Phone' });
    await waitFor(() => expect(phone).toHaveAttribute('aria-invalid', 'true'));
    expect(
      await screen.findAllByText('Enter a phone number, like (202) 555-0123'),
    ).not.toHaveLength(0);
    expect(generate()).toBeEnabled();
    fireEvent.click(generate());

    expect(await screen.findByRole('group', { name: 'There Is a Problem' })).toBeInTheDocument();
    expect(renderBusinessCards).not.toHaveBeenCalled();
  });

  it('tidies the email on blur, and Generate refuses an address with no domain dot', async () => {
    render(<BusinessCards />);
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());

    fillAll('  Testwort@Example.TEST ');
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveValue('testwort@example.test');

    fill('Email', 'testwort@example');
    fireEvent.click(generate());

    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(renderBusinessCards).not.toHaveBeenCalled();
  });

  it('starts with Generate usable and Include Backs off', async () => {
    render(<BusinessCards />);

    await waitFor(() => expect(generate()).toBeEnabled());
    expect(screen.getByRole('switch', { name: 'Include Backs' })).not.toBeChecked();
  });

  it('flags every empty field on Generate, with the summary taking the focus, and builds nothing', async () => {
    render(<BusinessCards />);
    await waitFor(() => expect(generate()).toBeEnabled());
    for (const name of ['Name', 'Email', 'Phone'])
      expect(screen.getByRole('textbox', { name })).not.toHaveAttribute('aria-invalid');

    fireEvent.click(generate());

    const summary = await screen.findByRole('group', { name: 'There Is a Problem' });
    await waitFor(() => expect(summary).toHaveFocus());
    for (const name of ['Name', 'Email', 'Phone'])
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    expect(renderBusinessCards).not.toHaveBeenCalled();
  });

  it('keeps Generate off until the fonts and pictures have arrived', async () => {
    let arrive: (assets: CardAssets) => void = () => {};
    vi.mocked(fetchCardAssets).mockReturnValue(
      new Promise((resolve) => {
        arrive = resolve;
      }),
    );
    render(<BusinessCards />);

    fillAll();
    // Precondition: the fields alone would let it build.
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(generate()).toBeDisabled();

    arrive(ASSETS);
    await waitFor(() => expect(generate()).toBeEnabled());
  });

  it('builds the sheet from the fetched files with the trimmed details, and saves it under the name', async () => {
    render(<BusinessCards />);
    fill('Name', '  Testwort Hollin ');
    fill('Email', 'testwort@example.test');
    fill('Phone', '202-555-0199');
    fireEvent.click(screen.getByRole('switch', { name: 'Include Backs' }));
    await waitFor(() => expect(generate()).toBeEnabled());

    fireEvent.click(generate());

    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(renderBusinessCards).toHaveBeenCalledWith(
      {
        name: 'Testwort Hollin',
        email: 'testwort@example.test',
        phone: '(202) 555-0199',
        backs: true,
      },
      ASSETS,
    );
    const [blob, filename] = vi.mocked(saveFile).mock.calls[0];
    expect(filename).toBe('business-cards-testwort-hollin.pdf');
    expect(blob.type).toBe('application/pdf');
    expect(fetchCardAssets).toHaveBeenCalledTimes(1);
  });

  it('says the PDF could not be built when building fails, and saves nothing', async () => {
    vi.mocked(renderBusinessCards).mockRejectedValue(new Error('broken font'));
    render(<BusinessCards />);
    fillAll();
    await waitFor(() => expect(generate()).toBeEnabled());

    fireEvent.click(generate());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('asks before the tab closes once a field holds typed input, and not before', async () => {
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    render(<BusinessCards />);
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    expect(unload()).toBe(false);

    fill('Name', 'Testwort Hollin');

    await waitFor(() => expect(unload()).toBe(true));
  });
});
