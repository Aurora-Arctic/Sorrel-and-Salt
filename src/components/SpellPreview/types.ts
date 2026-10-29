/** An ingredient step as the preview pane reads it: the label, the amount and any line of text. */
export interface IngredientPreviewStep {
  kind: 'ingredient';
  id: string;
  /** The ingredient and its form as one label: "Testwort (Dried Leaf)". */
  name: string;
  quantity: string | null;
  unit: string | null;
  body: string | null;
}

/** A step that is words alone. */
export interface InstructionPreviewStep {
  kind: 'instruction';
  id: string;
  body: string;
}

export type PreviewStep = IngredientPreviewStep | InstructionPreviewStep;

export interface SpellPreviewProps {
  /** The spell's name as the page shows it. */
  title: string;
  steps: readonly PreviewStep[];
}
