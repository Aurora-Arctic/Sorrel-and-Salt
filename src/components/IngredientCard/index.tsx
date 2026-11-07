import type { ReactElement } from 'react';
import type { SafetyVariant } from '../SafetyNote/types';
import CardFace from './face';
import type { IngredientCardProps } from './types';

// One ingredient in a list, for the public compendium and the coven's Ingredients page: the name as the
// card's link, formal name and forms beneath, the marks and a slot for jar lines. Props only; New or
// Updated sits left of the safety badge (claude-docs/components/ingredient-card.md).

// The card shows only that notes exist, as the Caution badge, never their text, so the browser is
// sent this stand-in for any notes rather than the notes themselves.
const NOTED = '*';
const noted = (notes: string | null | undefined): string | null =>
  (notes ?? '').trim() !== '' ? NOTED : null;

// A form with only what the face reads: its name, its group's icon, its flag and whether it has notes.
const facing = ({ form, formChoice, toxic, safetyNotes }: SafetyVariant): SafetyVariant => ({
  form,
  formChoice: formChoice?.group.icon ? { group: { icon: formChoice.group.icon } } : null,
  toxic: Boolean(toxic),
  safetyNotes: noted(safetyNotes),
});

const IngredientCard = ({ variants, safetyNotes, ...props }: IngredientCardProps): ReactElement => (
  <CardFace {...props} variants={variants?.map(facing)} safetyNotes={noted(safetyNotes)} />
);

export default IngredientCard;
export type { IngredientCardProps, CardCategory } from './types';
