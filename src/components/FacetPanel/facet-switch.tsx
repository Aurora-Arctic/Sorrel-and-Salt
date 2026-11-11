'use client';

import { type ReactElement, useId } from 'react';
import { SwitchControl } from '../Field/switch-control';
import { FacetCount } from './facet-count';

/** An on-or-off filter drawn as SwitchField draws it, with its count after the name. */
export function FacetSwitch({
  label,
  count,
  name,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <SwitchControl id={useId()} name={name} value="1" checked={checked} onChange={onChange}>
      {label}
      {count !== undefined && <FacetCount count={count} />}
    </SwitchControl>
  );
}
