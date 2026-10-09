import type { Color, ColorPickerRootProps } from '@ark-ui/react';
import type { Ref } from 'react';
import type { GroupColorColumn } from '../../lib/types';

/** The picker's channel layouts: hue, saturation and brightness; hue, saturation and lightness; or red, green and blue. */
export type PickerFormat = NonNullable<ColorPickerRootProps['format']>;

/** The colour the picker holds, which the hex box is written from. */
export type PickerColor = Color;

/** A channel the admin types into: the three of whichever format is chosen. */
export type PickerChannel =
  'hue' | 'saturation' | 'brightness' | 'lightness' | 'red' | 'green' | 'blue';

/** A format the admin can choose, its name, and the channels it is typed in. */
export interface FormatOption {
  format: PickerFormat;
  name: string;
  channels: { channel: PickerChannel; name: string }[];
}

/** Another group's colour in the same theme, which this one is warned against standing too close to. */
export interface NearbyColor {
  name: string;
  hex: string;
}

export interface ChipColorFieldProps {
  /** The hex box's id, which the form's label names. */
  id: string;
  /** What the field is called, which names the picker's parts too: "Dark Theme Colour hue". */
  label: string;
  /** Which of the group's two colours, so which ground the sample, the ratio and the line are on. */
  column: GroupColorColumn;
  /** The hex as typed: whole or not, it is shown as it is. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** The text on the sample chip: the group's name, or a stand-in before it has one. */
  sample: string;
  /** Every other group's colour in this theme, to warn of one too close. */
  others?: readonly NearbyColor[];
  /** The pair's other colour as typed, which Match sets this one from; none offers nothing to match. */
  partner?: string;
  /** The refusal of this colour, from the schema or the server, shown as an error notice. */
  error?: string;
  /** The refusal's id, which the hex box's description names. */
  errorId?: string;
  inputRef?: Ref<HTMLInputElement>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}
