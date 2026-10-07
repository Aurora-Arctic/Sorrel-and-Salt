import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ChipColorField from '@/components/ChipColorField';
import type { ChipColorFieldProps } from '@/components/ChipColorField/types';
import { pairedColor } from '@/lib/group-colors';

// One of a category group's two chip colours (M5.6b): Ark's picker and the
// hex it writes, kept in step; the channels of a format the admin chooses; a
// 4.5 tag at each edge of the area where the colour crosses 4.5:1 on its
// ground; a Match button setting it from its partner; a
// sample chip there with its ratio (MB.36); and a warning when another
// group's colour in the theme stands too close (the owner's calls).

function Controlled({
  initial = '#5d8ab1',
  onChange,
  ...props
}: Partial<ChipColorFieldProps> & { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="dark">Dark Theme Colour</label>
      <ChipColorField
        id="dark"
        label="Dark Theme Colour"
        column="colorDark"
        sample="Fixture Wards"
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </>
  );
}

const hex = () => screen.getByRole('textbox', { name: 'Dark Theme Colour' });
const channel = (name: string) =>
  screen.getByRole('spinbutton', { name: `Dark Theme Colour ${name}` });
const formatButton = () => screen.getByRole('button', { name: /^Dark Theme Colour format:/ });
/** Presses the format toggle until it shows `name`, as Chrome's cycles. */
const showFormat = (name: 'HSB' | 'HSL' | 'RGB') => {
  for (let press = 0; press < 3; press += 1) {
    if (formatButton().getAttribute('aria-label')?.includes(`format: ${name}.`)) return;
    fireEvent.click(formatButton());
  }
};

describe('ChipColorField', () => {
  it('shows the hex in a text box named by its label', () => {
    render(<Controlled />);

    expect(hex()).toHaveValue('#5d8ab1');
  });

  it("names the picker's area and hue slider for the field", () => {
    render(<Controlled />);

    expect(
      screen.getByRole('slider', { name: 'Dark Theme Colour: saturation and brightness' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Dark Theme Colour hue' })).toBeInTheDocument();
  });

  describe('the format', () => {
    it('starts in HSB, typed as hue, saturation and brightness, each captioned under its box', () => {
      render(<Controlled />);

      expect(formatButton()).toHaveAccessibleName('Dark Theme Colour format: HSB. Switch to HSL');
      expect(channel('hue')).toBeInTheDocument();
      expect(channel('saturation')).toBeInTheDocument();
      expect(channel('brightness')).toBeInTheDocument();
      // Chrome's order: the box, then its caption.
      expect(
        channel('hue').compareDocumentPosition(screen.getByText('Hue')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('says what the toggle is in a tooltip on focus, and what a press moves to', async () => {
      render(<Controlled />);

      // Arrived at by the keyboard, as the tooltip opens on focus only then.
      fireEvent.keyDown(document.body, { key: 'Tab' });
      formatButton().focus();

      expect(await screen.findByRole('tooltip')).toHaveTextContent('Format: HSB. Press for HSL.');
    });

    // Chrome's toggle: each press shows the next format, round again after the last.
    it('cycles HSB, HSL, RGB and back, each with its own channels', () => {
      render(<Controlled />);

      fireEvent.click(formatButton());
      expect(channel('lightness')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: 'Dark Theme Colour brightness' })).toBeNull();

      fireEvent.click(formatButton());
      expect(channel('red')).toHaveValue(0x5d);
      expect(channel('green')).toHaveValue(0x8a);
      expect(channel('blue')).toHaveValue(0xb1);
      expect(formatButton()).toHaveAccessibleName('Dark Theme Colour format: RGB. Switch to HSB');

      fireEvent.click(formatButton());
      expect(channel('brightness')).toBeInTheDocument();
    });
  });

  it('writes a channel typed into the hex on Enter', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    showFormat('RGB');

    fireEvent.change(channel('red'), { target: { value: '255' } });
    fireEvent.keyDown(channel('red'), { key: 'Enter' });

    // The picker answers a moment after the key, not within it.
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('#ff8ab1'));
    expect(hex()).toHaveValue('#ff8ab1');
  });

  it('writes a channel typed into the hex on leaving it', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    showFormat('RGB');

    channel('green').focus();
    fireEvent.change(channel('green'), { target: { value: '0' } });
    channel('green').blur();

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('#5d00b1'));
  });

  it('moves the channels to a hex typed whole, and leaves them for half of one', async () => {
    render(<Controlled />);
    showFormat('RGB');

    fireEvent.change(hex(), { target: { value: '#35987' } });
    expect(channel('red')).toHaveValue(0x5d);

    fireEvent.change(hex(), { target: { value: '#35987D' } });
    await waitFor(() => expect(channel('red')).toHaveValue(0x35));
  });

  describe('the veil', () => {
    it("veils the low-contrast side in the ground's own colour, labelled inside, and says what it means", () => {
      const { container } = render(<Controlled />);

      const veil = container.querySelector<HTMLElement>('.chip-color-field__veil');
      expect(veil?.style.clipPath).toMatch(/^polygon\(/);
      expect(veil).toHaveStyle({ backgroundColor: '#1f1c16' });
      expect(container.querySelector('.chip-color-field__veil-label')).toHaveTextContent('< 4.5:1');
      const hint = screen.getByText(
        'Colours in the dark veil fall short of 4.5:1 on the dark card.',
      );
      expect(
        screen.getByRole('slider', { name: 'Dark Theme Colour: saturation and brightness' })
          .parentElement,
      ).toHaveAttribute('aria-describedby', hint.id);
    });

    it('draws the edge on the dark card in its own ink', () => {
      const { container } = render(<Controlled />);

      const edge = container.querySelector('svg[viewBox="0 0 100 100"]');
      expect(edge).toHaveClass('chip-color-field__edge--dark');
      expect(edge?.querySelector('path')?.getAttribute('d')).toMatch(/^M \d/);
    });

    it("draws the light page's edge, and its veil in the page's colour", () => {
      const { container } = render(
        <Controlled column="colorLight" label="Light Theme Colour" initial="#286ba6" />,
      );

      expect(container.querySelector('svg[viewBox="0 0 100 100"] path')?.getAttribute('d')).toMatch(
        /^M \d/,
      );
      expect(container.querySelector('.chip-color-field__veil')).toHaveStyle({
        backgroundColor: '#efe9da',
      });
      expect(
        screen.getByText('Colours in the light veil fall short of 4.5:1 on the light page.'),
      ).toBeInTheDocument();
    });
  });

  // The owner's call: the pair's rule on demand, from the other colour.
  describe('Match', () => {
    it('sets the colour from its partner, fitted to this ground', () => {
      const onChange = vi.fn();
      render(<Controlled partner="#286ba6" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Match Light Theme Colour' }));

      expect(onChange).toHaveBeenLastCalledWith(pairedColor('#286ba6', 'colorDark'));
      expect(hex()).toHaveValue(pairedColor('#286ba6', 'colorDark'));
    });

    it('names the dark-theme colour on the light field', () => {
      render(
        <Controlled
          column="colorLight"
          label="Light Theme Colour"
          initial="#286ba6"
          partner="#5d8ab1"
        />,
      );

      expect(screen.getByRole('button', { name: 'Match Dark Theme Colour' })).toBeEnabled();
    });

    it('waits for a whole partner', () => {
      render(<Controlled partner="#286b" />);

      expect(screen.getByRole('button', { name: 'Match Light Theme Colour' })).toBeDisabled();
    });
  });

  it('says what the colour reads on its own ground, as part of the box description', () => {
    render(<Controlled />);

    expect(screen.getByText('4.64:1 on the dark card')).toBeInTheDocument();
    expect(hex()).toHaveAccessibleDescription('4.64:1 on the dark card');
  });

  // The owner's call: a ratio at the floor or over it reads in the accent green.
  it('marks a ratio that clears the floor, and not one that falls short', () => {
    const { unmount } = render(<Controlled />);
    expect(screen.getByText('4.64:1 on the dark card')).toHaveClass(
      'chip-color-field__ratio--pass',
    );
    unmount();

    render(<Controlled initial="#0c5393" />);
    expect(screen.getByText('2.16:1 on the dark card')).not.toHaveClass(
      'chip-color-field__ratio--pass',
    );
  });

  it('says nothing of a ratio while the hex is not whole', () => {
    render(<Controlled initial="#5d8" />);

    expect(screen.queryByText(/^\d+\.\d+:1 on the/)).not.toBeInTheDocument();
  });

  it('shows the sample chip, named for the group', () => {
    render(<Controlled />);

    expect(screen.getAllByText('Fixture Wards').length).toBeGreaterThan(0);
  });

  describe('the near-colour warning', () => {
    const others = [
      { name: 'Testward', hex: '#5a87ae' },
      { name: 'Testcraft', hex: '#c371c6' },
    ];

    it('names the group whose colour in this theme stands too close', () => {
      render(<Controlled others={others} />);

      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent(
        'Close to the dark theme colour of "Testward", so their chips may be hard to tell apart.',
      );
      expect(hex().getAttribute('aria-describedby')).toContain(warning.id);
    });

    it('says nothing when every other colour stands clear', () => {
      render(<Controlled others={[others[1]]} />);

      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('follows the colour as it changes', () => {
      render(<Controlled others={others} />);

      fireEvent.change(hex(), { target: { value: '#c56fc4' } });

      expect(screen.getByRole('status')).toHaveTextContent('"Testcraft"');
    });
  });

  // The owner's call: a refusal in the error notice, as the warning is in its own.
  it('shows a refusal passed in as an error notice, which the box is described by', () => {
    render(
      <Controlled
        error="The two colours are 135° apart in hue — keep them within 10° of each other"
        errorId="dark-error"
        aria-describedby="dark-error"
        aria-invalid
      />,
    );

    const notice = screen.getByText(
      'The two colours are 135° apart in hue — keep them within 10° of each other',
    );
    expect(notice).toHaveAttribute('id', 'dark-error');
    expect(notice).toHaveClass('notice', 'notice--error');
    expect(hex()).toHaveAccessibleDescription(expect.stringContaining('135° apart in hue'));
  });

  it('describes the box by an error passed in, before the ratio', () => {
    render(<Controlled aria-describedby="dark-error" aria-invalid />);

    expect(hex().getAttribute('aria-describedby')).toMatch(/^dark-error /);
    expect(hex()).toHaveAttribute('aria-invalid', 'true');
  });
});
