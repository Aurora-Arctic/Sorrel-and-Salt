'use client';

import { lazyComponent, lazyModule } from '../../lib/use-lazy-module';
import ModalLoading from '../Modal/loading';

// The curator's edit form, loaded when its dialog first has a form to draw, so a list page that
// only holds the dialog does not carry the form's code. The dialog's loading frame stands in until
// it arrives; the form is kept once it has, so a second opening draws it at once.
const formModule = lazyModule(() => import('./index'));

export const loadCompendiumEntryForm = formModule.load;

const LazyCompendiumEntryForm = lazyComponent(formModule, { fallback: () => <ModalLoading /> });

export default LazyCompendiumEntryForm;
