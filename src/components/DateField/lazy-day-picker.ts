import { lazyModule } from '../../lib/use-lazy-module';

/** The calendar, one import shared by every date field and by the Record a Working button that starts it early. */
export const dayPickerModule = lazyModule(() => import('./day-picker'));
