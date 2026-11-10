import { z } from 'zod';
import { INGREDIENT_ELEMENTS } from '../schema/ingredient-enums';

/** Free text entries, trimmed. Each schema decides what a blank entry and an empty list mean, as the two differ. */
export const textEntries = z.array(z.string().trim());

/** Closed: the five values and nothing typed (DESIGN.md §5). Kept in the order chosen, and a repeat is refused at its own index rather than dropped, as the form never offers an element twice. */
export const elementArray = z
  .array(z.enum(INGREDIENT_ELEMENTS, { error: 'Choose one of the five elements' }))
  .superRefine((elements, ctx) => {
    elements.forEach((element, index) => {
      if (elements.indexOf(element) === index) return;
      ctx.addIssue({
        code: 'custom',
        path: [index],
        message: `${element[0]?.toUpperCase()}${element.slice(1)} is already chosen`,
      });
    });
  });
