'use client';

import { lazyComponent, lazyModule } from '../../lib/use-lazy-module';

// The form brings react-hook-form and the stock fields in, so it loads apart from the pages' first-load scripts and
// starts early from the Edit Stock button (claude-docs/components/stock-dialog.md, "The button and the dialog").

/** One import of the stock form, shared by every opener and started early by the cards' Edit Stock. */
export const stockFormModule = lazyModule(() => import('./form'));

const LazyStockDialogForm = lazyComponent(stockFormModule);

export default LazyStockDialogForm;
