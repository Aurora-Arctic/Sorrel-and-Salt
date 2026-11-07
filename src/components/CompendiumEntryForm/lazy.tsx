'use client';

import type { ReactElement } from 'react';
import { useLazyModule } from '../../lib/use-lazy-module';
import ModalLoading from '../Modal/loading';
import type { CompendiumEntryFormProps } from './types';

// The curator's edit form, loaded when its dialog first has a form to draw, so a list page that
// only holds the dialog does not carry the form's code. The dialog's loading frame stands in until
// it arrives; the form is kept once it has, so a second opening draws it at once.
type FormModule = typeof import('./index');
let arrived: FormModule | null = null;

export const loadCompendiumEntryForm = (): Promise<FormModule> =>
  import('./index').then((loaded) => (arrived = loaded));

export default function LazyCompendiumEntryForm(props: CompendiumEntryFormProps): ReactElement {
  const module = useLazyModule(loadCompendiumEntryForm, arrived === null) ?? arrived;
  if (!module) return <ModalLoading />;
  const CompendiumEntryForm = module.default;
  return <CompendiumEntryForm {...props} />;
}
