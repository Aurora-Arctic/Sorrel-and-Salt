import { relative, sep } from 'node:path';

// Seven rules that were Vitest guards reading the source as text or as an
// abstract syntax tree (M14.27, claude-docs/testing/layer-ownership.md, "What a
// test may assert", rule 8). Each fails the same pattern its guard failed,
// now in the editor and in `npm run lint` instead of in a test run.
// `lint/sorrel-lint.js` spreads them into the `sorrel` plugin.

/** The file being linted, repo-relative with forward slashes. */
const fileOf = (context) => relative(context.cwd, context.filename).split(sep).join('/');

const isStory = (file) => file.endsWith('.stories.tsx');

/** The file's text with every comment blanked to spaces, newlines kept, so offsets and lines still match. */
function codeOf(context) {
  const { text } = context.sourceCode;
  let code = '';
  let at = 0;
  for (const comment of context.sourceCode.getAllComments()) {
    const [start, end] = comment.range;
    code += text.slice(at, start) + text.slice(start, end).replace(/[^\n]/g, ' ');
    at = end;
  }
  return code + text.slice(at);
}

/** A report location for a character offset into the file. */
const spanAt = (context, index, length = 1) => ({
  start: context.sourceCode.getLocFromIndex(index),
  end: context.sourceCode.getLocFromIndex(index + length),
});

const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'start', 'end']);

/** Every node directly under this one, in source order. */
function children(node) {
  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && typeof item === 'object' && typeof item.type === 'string') out.push(item);
    }
  }
  return out;
}

function* walk(node) {
  yield node;
  for (const child of children(node)) yield* walk(child);
}

export const rules = {
  // CLAUDE.md rule 8's sweep for M12.33: the site navigates through
  // `usePendingNavigation` or `PendingLink`, so the page bar and the skeletons
  // follow every move. A bare `router.push`, `replace` or `refresh` moves the
  // page with no signal. Next's `<Link>` is not covered. The old guard's
  // baseline of allowed files was empty, so this has none.
  'no-bare-router-navigation': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || file.startsWith('src/lib/navigation/')) return {};
      const isRouter = (node) =>
        (node.type === 'Identifier' && /[rR]outer$/.test(node.name)) ||
        (node.type === 'MemberExpression' &&
          !node.computed &&
          node.property.type === 'Identifier' &&
          /[rR]outer$/.test(node.property.name));
      return {
        MemberExpression(node) {
          if (
            !node.computed &&
            node.property.type === 'Identifier' &&
            ['push', 'replace', 'refresh'].includes(node.property.name) &&
            isRouter(node.object)
          ) {
            context.report({
              node,
              message:
                'Navigate through usePendingNavigation or PendingLink, so the page bar and the skeletons follow the move (M12.33)',
            });
          }
        },
      };
    },
  },

  // CLAUDE.md rule 8's sweep for claude-docs/components/ingredient-form.md,
  // "Forms are shown in title case": a form is shown through `formLabel`. It is
  // a line check, not a type check: it sees `x.form` and a JSX `{form}`, and
  // passes a line that does something else with the text (folds it, slugs it,
  // keys a list by it). A form copied into a local first, or arriving as a
  // plain string prop, is not caught; a reviewer reads those.
  'form-shown-through-form-label': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/(components|app)\/.*\.tsx$/.test(file) || isStory(file)) return {};
      /** `x.form` the property: not `x.form.id`, `x.form?.elements`, or `LIST_KINDS.form`. */
      const FORM_PROPERTY = /\.form\b(?!\??\.)/;
      /** A JSX child that is a bare `form`. */
      const BARE_FORM_CHILD = /(?<!=)\{form\}/;
      /** `capitalise` is the old way a form was raised, and leaves "oil of cloves" as "Oil of cloves". */
      const OLD_WAY = /capitalise\([^)]*\.form\)/;
      /** What a line may do with `x.form` besides show it. */
      const NOT_SHOWN =
        /\bfold(ed)?\(|\bslugify\(|\bkey=|\bconst form = |^\s*(\/\/|\*|\/\*)|\$\{at\}\.form|\.form\.trim\(\) [!=]==|[!=]== [\w.]*\.form\b|\bLIST_KINDS\b|\bGROUP_READERS\b|\bsameForm\(|\bsaid\(|\.map\(\(variant\) => variant\.form\)|(variants|steps)\.\$\{/;
      return {
        Program() {
          context.sourceCode.lines.forEach((line, index) => {
            if (line.includes('formLabel(')) return;
            const shows =
              OLD_WAY.test(line) ||
              BARE_FORM_CHILD.test(line) ||
              (FORM_PROPERTY.test(line) && !NOT_SHOWN.test(line));
            if (shows) {
              context.report({
                loc: {
                  start: { line: index + 1, column: 0 },
                  end: { line: index + 1, column: line.length },
                },
                message: 'Show a form through formLabel, which sets it in title case',
              });
            }
          });
        },
      };
    },
  },

  // CLAUDE.md rule 7 and claude-docs/db/spell-visibility.md, "Reading": who may
  // read a spell is `readableSpells` in src/db/repository/spells.ts, and
  // nothing else in src/ compares a spell's visibility. A second comparison is
  // a second rule: a finder that agrees today and drifts tomorrow, or a
  // service filtering rows after fetching them. It catches the column in a
  // query, the word inside a raw sql`` template, and a JavaScript comparison of
  // a row's `.visibility` (the last only under src/db/ and src/modules/, where
  // read decisions live: a component compares it to draw a badge, on a spell
  // the service has already let the viewer read). Comments are not read.
  'spell-visibility-read-in-one-place': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || file.startsWith('src/gql/')) return {};
      const PREDICATE_FILE = 'src/db/repository/spells.ts';
      // The one comparison allowed outside the predicate: `setSpellVisibility`
      // has read the spell through `findOneSpell` already, and compares its
      // current visibility with the requested one to refuse a narrowing (§5's
      // one-way rule). It decides a write, not who reads.
      const ALLOWED_FILE = 'src/modules/grimoire/services/spell-visibility.ts';
      const ALLOWED_TEXT = "spell.visibility === 'workspace'";
      const PATTERNS = [
        { name: 'the spells.visibility column', pattern: /\bspells\.visibility\b/g },
        {
          name: 'a visibility column handed to a Drizzle operator',
          pattern:
            /\b(?:eq|ne|inArray|notInArray|isNull|isNotNull|gt|gte|lt|lte|like|ilike)\(\s*[\w.]+\.visibility\b/g,
        },
        {
          name: 'visibility inside a raw sql`` template',
          pattern: /\bsql`[^`]*\bvisibility\b[^`]*`/g,
        },
        {
          name: 'a JavaScript comparison of a row’s visibility',
          pattern: /\.visibility\s*[!=]==?|[!=]==?\s*[\w.?]+\.visibility\b/g,
          scope: /^src\/(?:db|modules)\//,
        },
      ];
      return {
        Program(program) {
          const code = codeOf(context);
          // `readableSpells`, and beside it the two helpers of the grimoire's
          // Visibility facet (M13.22), which only narrow what it lets through.
          const predicates = [];
          if (file === PREDICATE_FILE) {
            for (const statement of program.body) {
              const declaration = statement.declaration;
              if (
                statement.type === 'ExportNamedDeclaration' &&
                declaration?.type === 'FunctionDeclaration' &&
                declaration.id.name === 'readableSpells'
              ) {
                predicates.push(declaration.range);
              }
              const variable =
                declaration?.type === 'VariableDeclaration' && declaration.declarations[0];
              if (
                statement.type === 'ExportNamedDeclaration' &&
                variable &&
                ['visibilityIn', 'visibilityText'].includes(variable.id.name)
              ) {
                predicates.push(declaration.range);
              }
            }
          }
          for (const { name, pattern, scope } of PATTERNS) {
            if (scope && !scope.test(file)) continue;
            for (const match of code.matchAll(pattern)) {
              const index = match.index ?? 0;
              if (predicates.some(([from, to]) => index > from && index < to)) continue;
              const lineText = code.split('\n')[code.slice(0, index).split('\n').length - 1].trim();
              if (file === ALLOWED_FILE && lineText.includes(ALLOWED_TEXT)) continue;
              context.report({
                loc: spanAt(context, index, match[0].length),
                message: `${name}: only readableSpells (src/db/repository/spells.ts) decides who may read a spell`,
              });
            }
          }
        },
      };
    },
  },

  // M14.8 (the owner's change of 2026-10-23): only the curator's switch,
  // `setCompendiumEntryReviewed`, writes a compendium entry's review mark. A
  // create, an edit or a promote leaves it as it was, so no service file names
  // the mark's columns, and the one repository writer that sets them is called
  // from the switch alone. The behaviour is tests/modules/ingredients/
  // services/compendium-review.test.ts's.
  'compendium-review-mark-switch-only': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/modules\/[^/]+\/services\/[^/]+\.ts$/.test(file)) return {};
      const SWITCH_FILE = 'src/modules/ingredients/services/compendium.ts';
      const inSwitch = [];
      return {
        Program() {
          for (const match of codeOf(context).matchAll(/\bcuratorReviewed(?:At|By)\b/g)) {
            context.report({
              loc: spanAt(context, match.index ?? 0, match[0].length),
              message:
                'A service never names the review mark; the repository writes it, for setCompendiumEntryReviewed alone (M14.8)',
            });
          }
        },
        FunctionDeclaration(node) {
          if (node.id?.name === 'setCompendiumEntryReviewed') inSwitch.push(node);
        },
        'FunctionDeclaration:exit'(node) {
          if (inSwitch[inSwitch.length - 1] === node) inSwitch.pop();
        },
        CallExpression(node) {
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'setReviewInCompendium' &&
            !(file === SWITCH_FILE && inSwitch.length > 0)
          ) {
            context.report({
              node,
              message: 'The review mark is set only from setCompendiumEntryReviewed (M14.8)',
            });
          }
        },
      };
    },
  },

  // M8.17 (claude-docs/design-decisions/m8.17-plan.md, "Giving the focus
  // back"): a modal gives the focus back to what opened it however it closes,
  // and the mechanism is Modal's own (`modal.tsx`), with RouteModal's
  // fallbacks beside it. An owner names where the focus goes when its opener is
  // gone through `returnTo`, and focuses nothing itself. A `.focus()` in a file
  // that draws a dialog, or in Modal's directory, is a hand-built return unless
  // the allowance below says otherwise. The allowance is counted by call, and a
  // count that no longer matches is reported too, so it can only shrink.
  'modal-focus-return-through-modal': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || isStory(file)) return {};
      if (['src/components/Modal/modal.tsx', 'src/components/Modal/route-modal.tsx'].includes(file))
        return {};
      const ALLOWED = {
        'src/components/FacetPanel/shell.tsx': {
          calls: 2,
          reason:
            'the Filters panel is a dialog of its own, not a Modal, open beside the page from the tablet width up: it gives the focus back to its button only when the focus was inside it',
        },
        'src/components/Modal/confirm-overlay.tsx': {
          calls: 5,
          reason:
            'a question over a modal body, not a modal: it takes the focus to its safe answer and gives it back to the field the question interrupted, inside the modal that stays open',
        },
        'src/components/Modal/discard.tsx': {
          calls: 1,
          reason:
            'the focus going in, not back: the page Discard Changes dialog puts it on Keep Editing, the safe answer, as it opens; Modal has no initial-focus prop, and its own first-field focus keeps a focus its contents placed',
        },
        'src/components/UserList/confirmed-action.tsx': {
          calls: 1,
          reason:
            'the focus going in, not back: the question puts it on the confirm, which the warning describes, as the modal opens',
        },
      };
      return {
        Program(program) {
          const code = codeOf(context);
          const scanned =
            /<(?:Modal|RouteModal|dialog)\b|\.showModal\(/.test(code) ||
            file.startsWith('src/components/Modal/');
          const calls = scanned ? [...code.matchAll(/\.focus\(/g)] : [];
          const allowed = ALLOWED[file]?.calls ?? 0;
          if (calls.length > allowed) {
            for (const call of calls.slice(allowed)) {
              context.report({
                loc: spanAt(context, call.index ?? 0, call[0].length),
                message: `A modal gives the focus back through Modal's own returnTo, not a hand-built .focus() (${calls.length} calls, ${allowed} allowed; M8.17)`,
              });
            }
          } else if (calls.length < allowed) {
            context.report({
              node: program,
              message: `This file allows ${allowed} .focus() calls and holds ${calls.length}: lower its allowance in lint/source-sweeps.js`,
            });
          }
        },
      };
    },
  },

  // M13.14 (story 32): a form that holds what someone typed asks before a tab
  // close, a reload or a link leaves it unsaved. The mechanism is
  // `useLeaveGuard` (src/lib/navigation/leave-guard.tsx), which
  // `useDiscardGuard` calls for every form already guarded in a modal, and
  // the spell builder's `useSaveOnClose` calls for a form that saves on close
  // rather than asking (M10.12). A component that draws a `<form>`, renders
  // `FormActions` or calls react-hook-form's `useForm` must call one of the
  // three unless the list below says why not; a listed file that no longer needs its place is reported
  // too, so the list can only shrink.
  'long-form-guards-leaving': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      const ALLOWED = {
        'src/components/NameForm/index.tsx': 'one short field, the account name (M13.14)',
        'src/components/EmailForm/index.tsx': 'one short field, the account address (M13.14)',
        'src/components/FilterForm/index.tsx':
          'a list filter that applies as it changes: nothing typed waits on a Save',
        'src/components/IngredientForm/reference-panel.tsx':
          'a panel inside IngredientForm, which it tells of its changes (`useReportPanelChanges`) and whose guard holds them',
        'src/components/IngredientEntry/coven-choice.tsx':
          'a single select inside a confirmation, a form only because SelectField is react-hook-form’s; nothing is submitted through it',
      };
      return {
        Program(program) {
          const code = codeOf(context);
          const isForm = /<form\b|<FormActions\b|\buseForm\s*[<(]/.test(code);
          const unguarded =
            isForm && !/\buse(?:(?:Discard|Leave)Guard|SaveOnClose)\s*\(/.test(code);
          if (unguarded && !(file in ALLOWED)) {
            context.report({
              node: program,
              message:
                'A form that holds typed input calls useDiscardGuard, useLeaveGuard or useSaveOnClose, so leaving it unsaved asks or saves first (M13.14)',
            });
          } else if (!unguarded && file in ALLOWED) {
            context.report({
              node: program,
              message:
                'This file no longer needs its place in the unguarded-forms list: remove it from lint/source-sweeps.js',
            });
          }
        },
      };
    },
  },

  // M11.18: a spec file's tests spread across Playwright's workers, each with
  // its own database, so a test that reads what an earlier test wrote passes
  // only when both land on the same worker: an intermittent red, the worst
  // kind. The one shape every chained file had was a variable declared outside
  // the test and assigned inside it, so this fails that shape wherever the file,
  // or the `describe` block around the test, is not serial. Assigning in a hook
  // (`beforeAll`, `beforeEach`) stays legal: a hook runs on every worker that
  // comes to the file. `.oxlintrc.json` turns it on for `tests/e2e/**/*.spec.ts`
  // alone. The rule, and when serial is still the choice: claude-docs/testing/
  // e2e.md, "E2E" (the paragraph on `fullyParallel`).
  'e2e-chained-tests-serial': {
    create: (context) => {
      const TEST_CALL = /^test(\.(only|skip|fixme|fail))?$/;
      const DESCRIBE_CALL =
        /^test\.describe(\.(only|skip|fixme|serial|parallel))?(\.(only|skip))?$/;

      /** `test.describe.configure` → 'test.describe.configure'; anything else dotted on identifiers → its name, or null. */
      const calleeName = (node) => {
        if (node.type === 'Identifier') return node.name;
        if (
          node.type === 'MemberExpression' &&
          !node.computed &&
          node.property.type === 'Identifier'
        ) {
          const object = calleeName(node.object);
          return object && `${object}.${node.property.name}`;
        }
        return null;
      };

      /** The identifiers a binding pattern declares: `x`, `{ a, b: c }`, `[d, ...e]`, `f = 1`. */
      const patternNames = (node) => {
        switch (node.type) {
          case 'Identifier':
            return [node.name];
          case 'ObjectPattern':
            return node.properties.flatMap((p) =>
              p.type === 'RestElement' ? patternNames(p.argument) : patternNames(p.value),
            );
          case 'ArrayPattern':
            return node.elements.flatMap((e) => (e ? patternNames(e) : []));
          case 'RestElement':
            return patternNames(node.argument);
          case 'AssignmentPattern':
            return patternNames(node.left);
          default:
            return [];
        }
      };

      /** The variables an assignment writes, by their root: `users.member.id = …` writes `users`. */
      const assignedRoots = (node) => {
        switch (node.type) {
          case 'Identifier':
            return [node.name];
          case 'MemberExpression':
            return assignedRoots(node.object);
          case 'TSNonNullExpression':
          case 'TSAsExpression':
          case 'TSSatisfiesExpression':
            return assignedRoots(node.expression);
          case 'ObjectPattern':
          case 'ArrayPattern':
            return patternNames(node);
          default:
            return [];
        }
      };

      /** Does this statement list hold `test.describe.configure({ mode: 'serial' })`? */
      const declaresSerial = (statements) =>
        statements.some((statement) => {
          if (statement.type !== 'ExpressionStatement') return false;
          const call = statement.expression;
          if (
            call.type !== 'CallExpression' ||
            calleeName(call.callee) !== 'test.describe.configure'
          )
            return false;
          const [options] = call.arguments;
          return (
            options?.type === 'ObjectExpression' &&
            options.properties.some(
              (p) =>
                p.type === 'Property' &&
                p.key.type === 'Identifier' &&
                p.key.name === 'mode' &&
                p.value.type === 'Literal' &&
                p.value.value === 'serial',
            )
          );
        });

      const lastFunction = (call) => {
        const last = call.arguments[call.arguments.length - 1];
        return last?.type === 'ArrowFunctionExpression' || last?.type === 'FunctionExpression'
          ? last
          : undefined;
      };

      return {
        Program(program) {
          // Only a name the file declares can chain two tests: a browser global
          // such as `document`, written inside `page.evaluate`, is declared
          // nowhere here.
          const declared = new Set();
          for (const node of walk(program)) {
            if (node.type === 'VariableDeclarator')
              patternNames(node.id).forEach((n) => declared.add(n));
            if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
            if (
              node.type === 'ImportSpecifier' ||
              node.type === 'ImportDefaultSpecifier' ||
              node.type === 'ImportNamespaceSpecifier'
            )
              declared.add(node.local.name);
          }

          const checkTest = (fn, serial) => {
            if (serial) return;
            const locals = new Set();
            for (const param of fn.params) patternNames(param).forEach((n) => locals.add(n));
            for (const node of walk(fn)) {
              if (node.type === 'VariableDeclarator')
                patternNames(node.id).forEach((n) => locals.add(n));
              if (node.type === 'FunctionDeclaration' && node.id) locals.add(node.id.name);
            }
            for (const node of walk(fn)) {
              const target =
                node.type === 'AssignmentExpression'
                  ? node.left
                  : node.type === 'UpdateExpression'
                    ? node.argument
                    : null;
              if (!target) continue;
              for (const name of assignedRoots(target)) {
                if (!locals.has(name) && declared.has(name)) {
                  context.report({
                    node,
                    message: `This test assigns \`${name}\`, declared outside it, for a later test to read: make the file or its describe block serial with test.describe.configure({ mode: 'serial' }) (M11.18)`,
                  });
                }
              }
            }
          };

          const visit = (node, serial) => {
            if (node.type === 'CallExpression') {
              const name = calleeName(node.callee);
              const fn = name && lastFunction(node);
              if (fn && DESCRIBE_CALL.test(name)) {
                const body = fn.body.type === 'BlockStatement' ? fn.body.body : [];
                return visitStatements(body, serial || name.includes('.serial'));
              }
              if (fn && TEST_CALL.test(name)) return checkTest(fn, serial);
            }
            for (const child of children(node)) visit(child, serial);
          };

          const visitStatements = (statements, serial) => {
            const serialHere = serial || declaresSerial(statements);
            for (const statement of statements) visit(statement, serialHere);
          };

          visitStatements(program.body, false);
        },
      };
    },
  },
};
