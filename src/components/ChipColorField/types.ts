import type { Color, ColorPickerRootProps } from '@ark-ui/react';
import type { Ref } from 'react';
import type { GroupColorColumn } from '../../lib/types';

export type PickerFormat = NonNullable<ColorPickerRootProps['format']>;

export type PickerColor = Color;

type PickerChannel = 'hue' | 'saturation' | 'brightness' | 'lightness' | 'red' | 'green' | 'blue';

export interface FormatOption {
  format: PickerFormat;
  name: string;
  channels: { channel: PickerChannel; name: string }[];
}

interface NearbyColor {
  name: string;
  hex: string;
}

export interface ChipColorFieldProps {
  id: string;
  label: string;
  column: GroupColorColumn;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  sample: string;
  others?: readonly NearbyColor[];
  partner?: string;
  error?: string;
  errorId?: string;
  inputRef?: Ref<HTMLInputElement>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}
