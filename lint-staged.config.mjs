// What `npm run pre-commit` and the git hook check: the lint, stylelint and
// Prettier runs narrowed to the files a commit changes, and typecheck run whole
// when TypeScript changed. The whole-repo commands stay `lint`, `format:check`
// and `typecheck`, which CI's checks.yml runs (claude-docs/commands.md,
// "Pre-commit").
//
// A glob without a slash matches the basename anywhere in the tree; one with a
// slash matches the path from the repo root. A string entry gets the matched
// files appended; a function entry returns its command whole, so it runs once
// over the whole project.

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}': 'oxlint',

  // The same scope as `lint:css`; any other .scss is not linted there either.
  '{src,.ladle}/**/*.scss': 'stylelint --allow-empty-input',

  // Prettier still honours .prettierignore for a path passed by name, so the
  // generated files it skips stay skipped; --ignore-unknown drops what it
  // cannot parse.
  '*': 'prettier --check --ignore-unknown',

  // tsc cannot be narrowed to files: a changed exported type can break a file
  // nobody touched. One key for all of them, so it runs once.
  '{*.{ts,tsx,mts,cts},tsconfig.json,package.json,package-lock.json}': () => 'tsc --noEmit',

  // A check's own config changed: rerun that check over the whole repo, since a
  // narrowed run would miss what the new rule now flags. package.json carries
  // `browserslist`, which stylelint's baseline rule reads.
  '{.oxlintrc.json,lint/**}': () => 'oxlint .',
  '{.prettierrc*,.prettierignore}': () => 'prettier --check .',
  '{.stylelintrc*,package.json}': () => 'npm run lint:css',
};
