'use client';

import type { ReactElement } from 'react';
import { lazyModule, useLazyModule } from '../../lib/use-lazy-module';
import type { StockDialogFormProps } from './types';

// The form brings react-hook-form and the stock fields in, so it loads apart from the pages' first-load scripts and
// starts early from the Edit Stock button (claude-docs/components/stock-dialog.md, "The button and the dialog").

/** One import of the stock form, shared by every opener and started early by the cards' Edit Stock. */
export const stockFormModule = lazyModule(() => import('./form'));

export default function LazyStockDialogForm(props: StockDialogFormProps): ReactElement | null {
  const module = useLazyModule(stockFormModule, true);
  return module ? <module.default {...props} /> : null;
}
