'use client';

import { ColorPicker, Tooltip, parseColor } from '@ark-ui/react';
import { type ReactElement, useMemo, useState } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { CHIP_GROUNDS, MIN_CHIP_CONTRAST, chipContrast, formatRatio } from '../../lib/contrast';
import {
  contrastBoundary,
  failingLabelPoint,
  failingRegion,
  pairedColor,
} from '../../lib/group-colors';
import { nearColor } from '../../lib/near-color';
import type { ChipColorFieldProps, FormatOption, PickerColor, PickerFormat } from './types';
import './index.scss';

// One of a category group's two chip colours (M5.6b): Ark's colour picker —
// an area, a hue slider and the channels of a format the admin chooses — kept
// in step with the hex box the form validates, a light veil of the colour's
// own ground over the colours that fall short of 4.5:1 on it, labelled
// "< 4.5:1" inside (the owner's calls),
// a button setting the colour from its partner,
// a sample chip on that ground
// with the ratio it reads there (MB.36), and a warning when another group's
// colour in this theme is too close to tell apart. The checks themselves are
// the schema's; this shows them while the admin chooses rather than after a
// save (claude-docs/components/chip-color-field.md).

const WHOLE = /^#[0-9a-f]{6}$/i;

const GROUND = { colorDark: 'the dark card', colorLight: 'the light page' } as const;

/**
 * The other colour of the pair, as the Match button shows it, short to fit the
 * hex's width; its accessible name says the rest, starting with what it shows.
 */
const PARTNER_NAME = { colorDark: 'Light', colorLight: 'Dark' } as const;

/**
 * The contrast glyph in the veil's label: a circle half filled, which reads
 * as light against dark.
 */
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
  const hex = WHOLE.test(value) ? value.toLowerCase() : undefined;
  // The picker keeps its own colour rather than re-reading the hex each
  // time: a hex forgets the hue of a grey, so a drag through the grey edge of
  // the area would otherwise snap the hue to red. A hex from outside — typed,
  // or filled from the partner — replaces it; half a hex leaves it be.
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
  // The veil's edge, drawn as a fine line in the ground's own ink (the owner's call).
  const edge = useMemo(() => contrastBoundary(hue, column, space), [hue, column, space]);
  const veil = useMemo(() => {
    const region = failingRegion(hue, column, space);
    return `polygon(${region.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
  }, [hue, column, space]);
  const partnerHex = partner && WHOLE.test(partner) ? partner.toLowerCase() : undefined;

  const near = hex ? nearColor(hex, others) : undefined;
  // A ratio at the floor or over it reads in the accent green (the owner's call).
  const passes = hex !== undefined && chipContrast(column, hex) >= MIN_CHIP_CONTRAST;
  const ratioId = `${id}-ratio`;
  const nearId = `${id}-near`;
  const lineId = `${id}-line`;
  // Both halves of the pair are this colour: the ground's own theme picks one.
  const colors = hex ? chipColors({ colorDark: hex, colorLight: hex }) : undefined;
  const theme = column === 'colorDark' ? 'dark' : 'light';

  return (
    <div className="chip-color-field">
      {/* Under the field's label, saying what the veil below means (the owner's call). */}
      {labelPoint && (
        <p id={lineId} className="field__hint chip-color-field__veil-hint">
          Colours in the {theme} veil fall short of 4.5:1 on {GROUND[column]}.
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
          {/* One grid: the three channels, the divider and the hex across the
              top, each captioned under its box; under them the format toggle
              spanning the channels and Match under the hex (the owner's calls). */}
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
                placeholder="#rrggbb"
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
                  className="btn btn--small btn--quiet chip-color-field__format"
                  aria-label={`${label} format: ${current.name}. Switch to ${next.name}`}
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
              className="btn btn--small btn--quiet chip-color-field__match"
              disabled={!partnerHex}
              aria-label={`Match ${PARTNER_NAME[column]} Theme Colour`}
              onClick={() => partnerHex && onChange(pairedColor(partnerHex, column))}
            >
              Match {PARTNER_NAME[column]}
            </button>
          </div>
        </ColorPicker.Content>
      </ColorPicker.Root>
      {/* On the colour's own ground whatever the page's theme, both chip states. */}
      <div
        className={`chip-color-field__ground chip-color-field__ground--${theme}`}
        aria-hidden="true"
      >
        {colors ? (
          <>
            <span className="chip" style={colors}>
              {sample}
            </span>
            <span className="chip is-selected" style={colors}>
              {sample}
            </span>
          </>
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
      {/* Always present, so a warning that appears is announced. */}
      {/* A refusal of this colour, in the error notice: the contrast floor
          missed, or the pair's hues too far apart (the owner's call). */}
      {error && (
        <p id={errorId} className="notice notice--error chip-color-field__notice">
          {error}
        </p>
      )}
      {/* The site's warning notice: the plain box with the red triangle, seen
          but short of an error, since the save still goes through (the
          owner's call). */}
      <output
        id={nearId}
        className="notice notice--warn chip-color-field__notice chip-color-field__near"
      >
        {near &&
          `Close to the ${theme} theme colour of "${near.name}", so their chips may be hard to tell apart.`}
      </output>
    </div>
  );
};

export default ChipColorField;
