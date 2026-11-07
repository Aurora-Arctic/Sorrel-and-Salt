import type { Route } from 'next';
import type {
  IngredientFormValues,
  ReviewOffer,
} from '../../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../../components/CompendiumList/types';
import type { ModalHeading } from '../../../../components/Modal/types';
import type { ListDialog } from '../../../../lib/types';
import type { ListSearchParams } from '../types';
import type { SourcingScore } from '@/modules/ingredients';

export interface AdminCompendiumPageProps {
  searchParams: Promise<CompendiumSearchParams>;
}

export interface CompendiumSearchParams extends ListSearchParams {
  forms?: string | string[];
  withoutReferences?: string | string[];
  withoutForms?: string | string[];
  hidden?: string | string[];
  elements?: string | string[];
  categories?: string | string[];
  categoryMode?: string | string[];
  deities?: string | string[];
  zodiac?: string | string[];
  celestialBodies?: string | string[];
  toxic?: string | string[];
  reviewed?: string | string[];
  sort?: string | string[];
  order?: string | string[];
  entry?: string | string[];
}

export interface EditedEntry {
  id: string;
  revision?: number | null;
  updatedAt?: string | null;
  values: IngredientFormValues;
}

export interface OpenedEntry {
  heading: ModalHeading;
  entry?: EditedEntry;
  review?: ReviewOffer;
  sourcing?: SourcingScore | null;
}

export interface CompendiumDialogProps {
  place: CompendiumPlace;
  opened?: OpenedEntry;
  path?: Route;
  /** The modal the address opens, kept beneath a near match's Quick Look; left out where the list has none. */
  lookUnder?: ListDialog;
}
