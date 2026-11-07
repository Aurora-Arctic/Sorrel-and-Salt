import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBusinessCards } from '@/lib/business-cards/pdf';
import { fetchCardAssets } from '@/lib/invitation-cards/assets';
import type { CardAssets } from '@/lib/invitation-cards/types';
import { saveFile } from '@/components/AdminCards/save-file';
import BusinessCards from '@/components/BusinessCards';

vi.mock('@/lib/invitation-cards/assets', () => ({ fetchCardAssets: vi.fn() }));
vi.mock('@/lib/business-cards/pdf', () => ({ renderBusinessCards: vi.fn() }));
vi.mock('@/components/AdminCards/save-file', () => ({ saveFile: vi.fn() }));

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
  fill('Phone', '555.010.0199');
};

beforeEach(() => {
  vi.mocked(fetchCardAssets).mockReset().mockResolvedValue(ASSETS);
  vi.mocked(renderBusinessCards).mockReset().mockResolvedValue(PDF);
  vi.mocked(saveFile).mockReset();
});

describe('BusinessCards', () => {
  it('starts with Generate off and Include Backs off', async () => {
    render(<BusinessCards />);

    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    expect(generate()).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Include Backs' })).not.toBeChecked();
  });

  it('keeps Generate off until the name, an email address and the phone are filled in', async () => {
    render(<BusinessCards />);

    fill('Name', 'Testwort Hollin');
    fill('Phone', '555.010.0199');
    await waitFor(() => expect(fetchCardAssets).toHaveBeenCalled());
    expect(generate()).toBeDisabled();

    fill('Email', 'testwort at example');
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(generate()).toBeDisabled();

    fill('Email', 'testwort@example.test');
    await waitFor(() => expect(generate()).toBeEnabled());
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
    fill('Phone', '555.010.0199');
    fireEvent.click(screen.getByRole('switch', { name: 'Include Backs' }));
    await waitFor(() => expect(generate()).toBeEnabled());

    fireEvent.click(generate());

    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(renderBusinessCards).toHaveBeenCalledWith(
      {
        name: 'Testwort Hollin',
        email: 'testwort@example.test',
        phone: '555.010.0199',
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
