import type { Story } from '@ladle/react';
import IngredientForm from '.';

// Render-only; behaviour is asserted in tests/components/IngredientForm. The
// form reaches the network only on submit, so nothing is mocked: Save with an
// empty name shows the resolver's errors, and Save with one fails into the
// alert above the fields — both states worth seeing. The TanStack Query
// client `useMutation` needs comes from the workshop's global provider
// (.ladle/components.tsx), as it does from the app's root layout.
export default {
  title: 'Forms / Ingredient',
};

// Unframed: the form takes its width from whatever holds it.
export const Blank: Story = () => (
  <IngredientForm workspaceId="00000000-0000-4000-8000-000000000000" />
);
