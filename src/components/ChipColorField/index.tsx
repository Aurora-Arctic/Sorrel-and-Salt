'use client';

import { ColorPicker, Tooltip, parseColor } from '@ark-ui/react';
import { type ReactElement, useMemo, useState } from 'react';
import { chipColors } from '../../lib/chip-colors';
import {
  CHIP_GROUNDS,
  HEX_COLOR,
  MIN_CHIP_CONTRAST,
  chipContrast,
  formatRatio,
} from '../../lib/contrast';
import {
  contrastBoundary,
  failingLabelPoint,
  failingRegion,
  pairedColor,
} from '../../lib/group-colors';
import { nearColor } from '../../lib/near-color';
import Notice from '../Notice';
import type { ChipColorFieldProps, FormatOption, PickerColor, PickerFormat } from './types';
import './index.scss';

// One of a category group's two chip colours: Ark's picker kept in step with the hex box the form
// validates, with a veil under 4.5:1, a copy-partner button, a sample chip with its ratio and a
// too-close warning. The checks are the schema's (claude-docs/components/chip-color-field.md).

const GROUND = { colorDark: 'the dark card', colorLight: 'the light page' } as const;

/**
 * The other colour of the pair, as the Match button shows it, short to fit the
 * hex's width; its accessible name says the rest, starting with what it shows.
 */
const PARTNER_NAME = { colorDark: 'Light', colorLight: 'Dark' } as const;

/** Chrome's format toggle: a chevron up over a chevron down. */
const FormatIcon = (): ReactElement => (
  <svg
    className="chip-color-field__format-icon"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4.5 6.5 8 3l3.5 3.5M4.5 9.5 8 13l3.5-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The contrast icon in the veil's label: a circle half filled, which reads
 * as light against dark.
 */
const ContrastIcon = (): ReactElement => (
  <svg className="chip-color-field__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5Z" fill="currentColor" />
  </svg>
);

/** Each format the admin can choose, its name, and the channels it is typed in. */
const FORMATS: FormatOption[] = [
  {
    format: 'hsba',
    name: 'HSB',
    channels: [
      { channel: 'hue', name: 'Hue' },
      { channel: 'saturation', name: 'Saturation' },
      { channel: 'brightness', name: 'Brightness' },
    ],
  },
  {
    format: 'hsla',
    name: 'HSL',
    channels: [
      { channel: 'hue', name: 'Hue' },
      { channel: 'saturation', name: 'Saturation' },
      { channel: 'lightness', name: 'Lightness' },
    ],
  },
  {
    format: 'rgba',
    name: 'RGB',
    channels: [
      { channel: 'red', name: 'Red' },
      { channel: 'green', name: 'Green' },
      { channel: 'blue', name: 'Blue' },
    ],
  },
];

const hexOf = (color: PickerColor) => color.toString('hex').toLowerCase();

const ChipColorField = ({
  id,
  label,
  column,
  placeholder,
  value,
  onChange,
  onBlur,
  sample,
  others = [],
  partner,
  error,
  errorId,
  inputRef,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-required': required,
}: ChipColorFieldProps): ReactElement => {
  const hex = HEX_COLOR.test(value) ? value.toLowerCase() : undefined;
  // The picker keeps its own colour, since a hex forgets a grey's hue and a drag through the grey edge
  // would snap the hue to red. A hex from outside (typed, or the partner's) replaces it; half a hex
  // leaves it be.
  const [color, setColor] = useState<PickerColor>(() => parseColor(hex ?? '#808080'));
  if (hex && hex !== hexOf(color)) setColor(parseColor(hex));
  const [format, setFormat] = useState<PickerFormat>('hsba');
  const at = Math.max(
    0,
    FORMATS.findIndex((each) => each.format === format),
  );
  const current = FORMATS[at];
  const next = FORMATS[(at + 1) % FORMATS.length];
  const { channels } = current;

  const hue = color.toFormat('hsba').getChannelValue('hue');
  // The area is laid out in HSL for HSL and in HSB otherwise, as the picker lays it.
  const space = format === 'hsla' ? 'hsl' : 'hsb';
  const labelPoint = useMemo(() => failingLabelPoint(hue, column, space), [hue, column, space]);
  // The veil's edge, drawn as a fine line in the ground's own ink.
  const edge = useMemo(() => contrastBoundary(hue, column, space), [hue, column, space]);
  const veil = useMemo(() => {
    const region = failingRegion(hue, column, space);
    return `polygon(${region.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
  }, [hue, column, space]);
  const partnerHex = partner && HEX_COLOR.test(partner) ? partner.toLowerCase() : undefined;

  const near = hex ? nearColor(hex, others) : undefined;
  // A ratio at the floor or over it reads in the accent green.
  const passes = hex !== undefined && chipContrast(column, hex) >= MIN_CHIP_CONTRAST;
  const ratioId = `${id}-ratio`;
  const nearId = `${id}-near`;
  const lineId = `${id}-line`;
  // Both halves of the pair are this colour: the ground's own theme picks one.
  const colors = hex ? chipColors({ colorDark: hex, colorLight: hex }) : undefined;
  const theme = column === 'colorDark' ? 'dark' : 'light';

  return (
    <div className="chip-color-field">
      {/* Under the field's label, saying what the veil below means. */}
      {labelPoint && (
        <p id={lineId} className="field__hint chip-color-field__veil-hint">
          Colours under the veil are too faint on {GROUND[column]} (under 4.5:1).
        </p>
      )}
      <ColorPicker.Root
        inline
        value={color}
        format={format}
        onFormatChange={(details) => setFormat(details.format)}
        onValueChange={(details) => {
          setColor(details.value);
          onChange(hexOf(details.value));
        }}
        onBlur={onBlur}
      >
        {/* Inline, so always open; the picker finds its channel inputs in here. */}
        <ColorPicker.Content className="chip-color-field__picker">
          <ColorPicker.Area
            className="chip-color-field__area"
            aria-describedby={labelPoint ? lineId : undefined}
          >
            <ColorPicker.AreaBackground className="chip-color-field__area-background" />
            {/* The ground itself, faintly, over the colours that would sink into it. */}
            <span
              className={`chip-color-field__veil chip-color-field__veil--${theme}`}
              style={{
                clipPath: veil,
                backgroundColor: CHIP_GROUNDS[column === 'colorDark' ? 'dark' : 'light'],
              }}
              aria-hidden="true"
            />
            {edge && (
              <svg
                className={`chip-color-field__edge chip-color-field__edge--${theme}`}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d={edge} />
              </svg>
            )}
            {labelPoint && (
              <span
                className="chip-color-field__veil-label"
                style={{ left: `${labelPoint[0]}%`, top: `${labelPoint[1]}%` }}
                aria-hidden="true"
              >
                <ContrastIcon />
                <span>
                  <span className="chip-color-field__lt">&lt;</span> 4.5:1
                </span>
              </span>
            )}
            <ColorPicker.AreaThumb
              className="chip-color-field__thumb"
              aria-label={`${label}: saturation and ${space === 'hsl' ? 'lightness' : 'brightness'}`}
            />
          </ColorPicker.Area>
          <ColorPicker.ChannelSlider channel="hue" className="chip-color-field__hue">
            <ColorPicker.ChannelSliderTrack className="chip-color-field__hue-track" />
            <ColorPicker.ChannelSliderThumb
              className="chip-color-field__thumb"
              aria-label={`${label} hue`}
            />
          </ColorPicker.ChannelSlider>
          {/* One grid: the three channels, the divider and the hex across the top, each
              captioned under its box; under them the format toggle spanning the channels
              and Match under the hex. */}
          <div className="chip-color-field__controls">
            {channels.map(({ channel, name }) => (
              <label key={channel} className="chip-color-field__channel">
                <ColorPicker.ChannelInput
                  channel={channel}
                  className="input chip-color-field__channel-input"
                  aria-label={`${label} ${name.toLowerCase()}`}
                />
                <span className="field__hint chip-color-field__caption">
                  <span className="chip-color-field__caption-full">{name}</span>
                  {/* Chrome's single letter, for a phone's width. */}
                  <span className="chip-color-field__caption-short" aria-hidden="true">
                    {name.charAt(0)}
                  </span>
                </span>
              </label>
            ))}
            {/* From the top of the inputs to the foot of the buttons under them. */}
            <span className="chip-color-field__divider" aria-hidden="true" />
            {/* The hex the form validates: the box its label names. */}
            <div className="chip-color-field__channel">
              <input
                id={id}
                ref={inputRef}
                className="input chip-color-field__hex"
                value={value}
                spellCheck={false}
                autoComplete="off"
                placeholder={placeholder}
                onChange={(event) => onChange(event.currentTarget.value)}
                aria-invalid={invalid}
                aria-required={required}
                aria-describedby={
                  [describedBy, hex ? ratioId : undefined, near ? nearId : undefined]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              <span className="field__hint chip-color-field__caption" aria-hidden="true">
                Hex
              </span>
            </div>
            {/* Says what the toggle is, on hover and on keyboard focus, in the
                site's tip bubble under it; it stays open through a press and
                names the format it moved to. */}
            <Tooltip.Root
              openDelay={300}
              closeOnClick={false}
              closeOnPointerDown={false}
              positioning={{ placement: 'bottom', offset: { mainAxis: 10 }, flip: false }}
            >
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="btn btn--quiet btn--small chip-color-field__format"
                  aria-label={`${label} Format: ${current.name}. Switch to ${next.name}`}
                  onClick={() => setFormat(next.format)}
                >
                  {current.name}
                  <FormatIcon />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Positioner className="chip-color-field__tooltip-positioner">
                <Tooltip.Content className="chip-color-field__tooltip">
                  Format: {current.name}. Press for {next.name}.
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
            {/* The pair's rule, on demand: the same hue fitted to this ground. */}
            <button
              type="button"
              className="btn btn--quiet btn--small chip-color-field__match"
              disabled={!partnerHex}
              aria-label={`Match ${PARTNER_NAME[column]} Theme Colour`}
              onClick={() => partnerHex && onChange(pairedColor(partnerHex, column))}
            >
              Match {PARTNER_NAME[column]}
            </button>
          </div>
        </ColorPicker.Content>
      </ColorPicker.Root>
      {/* On the colour's own ground whatever the page's theme, both chip levels. */}
      <div
        className={`chip-color-field__ground chip-color-field__ground--${theme}`}
        aria-hidden="true"
      >
        {colors ? (
          <span className="chip" style={colors}>
            {sample}
          </span>
        ) : (
          <span className="chip-color-field__empty">{sample}</span>
        )}
      </div>
      {hex && (
        <p
          id={ratioId}
          className={`field__hint chip-color-field__ratio${passes ? ' chip-color-field__ratio--pass' : ''}`}
        >
          {`${formatRatio(chipContrast(column, hex))}:1 on ${GROUND[column]}`}
        </p>
      )}
      {/* A refusal of this colour, in the error notice: the contrast floor missed, or
          the pair's hues too far apart. The `.notice` markup by hand rather than
          `Notice`: this is the field's described error, read with the hex box through
          `aria-describedby`, and `Notice`'s error adds `role="alert"`, so a screen
          reader would read it twice. */}
      {error && (
        <p id={errorId} className="notice notice--error chip-color-field__notice">
          {error}
        </p>
      )}
      {/* The site's warning notice: seen but short of an error, since the save still
          goes through. Quiet, so an `<output>`: always present, empty and hidden when
          there is nothing to say, so a warning that appears is announced without
          interrupting. */}
      <Notice
        kind="warn"
        quiet
        id={nearId}
        className="chip-color-field__notice chip-color-field__near"
      >
        {near &&
          `This is close to "${near.name}"'s ${theme} theme colour, so their chips may be hard to tell apart. You can still save it.`}
      </Notice>
    </div>
  );
};

export default ChipColorField;
