import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface BusyButtonProps extends ComponentPropsWithRef<'button'> {
  busy: boolean;
  busyLabel: ReactNode;
  children: ReactNode;
}
