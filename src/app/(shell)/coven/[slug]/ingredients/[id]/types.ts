export interface CovenIngredientParams {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/dynamic-routes.md) — must be awaited before use.
  params: Promise<{ slug: string; id: string }>;
}
