import { relative, sep } from 'node:path';

// Rules that were Vitest guards reading source as text or syntax tree (claude-docs/testing/layer-ownership.md,
// "What a test may assert"), now in the editor and `npm run lint`. `lint/sorrel-lint.js` spreads them into the `sorrel` plugin.

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
  // CLAUDE.md rule 8's sweep: the site navigates through `usePendingNavigation` or `PendingLink`, so the page bar and
  // skeletons follow every move. A bare `router.push`, `replace` or `refresh` moves the page with no signal. `<Link>` is not covered.
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

  // A form is shown through `formLabel` (claude-docs/components/ingredient-form.md, "Forms are shown in title case"). A line
  // check, not a type check: it sees `x.form` and a JSX `{form}`, passes a line that folds or keys the text, and misses
  // a form copied to a local or passed as a string prop.
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

  // Who may read a spell is `readableSpells` in src/db/repository/spells.ts and nothing else in src/ compares a spell's
  // visibility (claude-docs/db/spell-visibility.md, "Reading"). Catches the column in a query, the word in a raw sql``
  // template, and a `.visibility` comparison under src/db/ and src/modules/ only (a component compares it to draw a badge).
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
          // `readableSpells`, `readableWorkings` (a working carries a visibility of its own), and beside them the two helpers of the grimoire's
          // Visibility facet, which only narrow what it lets through.
          const predicates = [];
          if (file === PREDICATE_FILE) {
            for (const statement of program.body) {
              const declaration = statement.declaration;
              if (
                statement.type === 'ExportNamedDeclaration' &&
                declaration?.type === 'FunctionDeclaration' &&
                ['readableSpells', 'readableWorkings'].includes(declaration.id.name)
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

  // Only the curator's switch, `setCompendiumEntryReviewed`, writes a compendium entry's review mark: no service file
  // names the mark's columns, and the one repository writer that sets them is called from the switch alone.
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

  // A modal gives the focus back to its opener however it closes, and the mechanism is Modal's own (`modal.tsx`)
  // (claude-docs/design-decisions/m8.17-editing-a-coven-ingredient.md, "Giving the focus back"). A `.focus()` in a file that draws a dialog is a
  // hand-built return unless the allowance below says so; it is counted by call, and a stale count is reported, so it only shrinks.
  'modal-focus-return-through-modal': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || isStory(file)) return {};
      if (['src/components/Modal/modal.tsx', 'src/components/Modal/route-modal.tsx'].includes(file))
        return {};
      const ALLOWED = {
        'src/components/AdminCards/mint-form.tsx': {
          calls: 1,
          reason:
            'not a return to the opener: a refused Mint Cards puts the focus on Number of Sheets, inside the modal that stays open, as a plain-state form does on Save',
        },
        'src/components/FacetPanel/shell.tsx': {
          calls: 2,
          reason:
            'the Filters panel is a dialog of its own, not a Modal, open beside the page from the tablet width up: it gives the focus back to its button only when the focus was inside it',
        },
        'src/components/ConfirmDialog/index.tsx': {
          calls: 1,
          reason:
            'an alert dialog of its own, not a Modal: it takes the focus to Cancel, its safe answer, as it opens; Modal has no initial-focus prop',
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
        'src/components/PasswordSection/two-factor.tsx': {
          calls: 3,
          reason:
            'not a return to the opener: the print window takes the focus, the warning puts it on its safe answer as it opens, and after Stay, Go Back, Esc, Close or an outside click it goes to the two-factor section rather than to the button or link that opened the dialog',
        },
        'src/components/ConfirmedAction/index.tsx': {
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

  // A form holding typed text asks before a tab close, reload or link leaves it unsaved, through `useLeaveGuard`
  // (src/lib/navigation/leave-guard.tsx), `useDiscardGuard` or `useSaveOnClose`. A component drawing a `<form>`, `FormActions`
  // or `useForm` must call one unless the list below says why not; a listed file that no longer needs it is reported.
  'long-form-guards-leaving': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      const ALLOWED = {
        'src/components/NameForm/index.tsx': 'one short field, the account name (M13.14)',
        'src/components/EmailForm/index.tsx': 'one short field, the account address (M13.14)',
        'src/components/SignInPanel/password-form.tsx':
          'sign-in credentials, which the browser’s password manager holds: nothing typed is lost by leaving',
        'src/components/SignInPanel/two-factor-step.tsx':
          'a six-digit code that changes every 30 seconds: nothing typed outlasts leaving',
        'src/components/ForgotPasswordForm/index.tsx':
          'one short field, an address the browser fills: nothing typed is lost by leaving',
        'src/components/ResetPasswordForm/index.tsx':
          'a new password, which the browser’s password manager offers to save: nothing typed is lost by leaving',
        'src/components/PasswordSection/index.tsx':
          'passwords, which the browser’s password manager holds: nothing typed is lost by leaving',
        'src/components/HelpSearchForm/index.tsx':
          'a one-field search that submits as a page load: nothing typed waits on a Save',
        'src/components/FilterForm/index.tsx':
          'a list filter that applies as it changes: nothing typed waits on a Save',
        'src/components/IngredientForm/reference-panel.tsx':
          'a panel inside IngredientForm, which it tells of its changes (`useReportPanelChanges`) and whose guard holds them',
        'src/components/IngredientEntry/coven-choice.tsx':
          'a single select inside a confirmation, a form only because SelectField is react-hook-form’s; nothing is submitted through it',
        'src/components/SpellBuilder/skeleton.tsx':
          'the Edit Spell form’s loading skeleton, inert and holding no input: nothing can be typed into it',
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

  // A spec's tests spread across Playwright workers, each with its own database, so a test reading what an earlier one wrote
  // is intermittently red. Fails a variable declared outside a test and assigned inside it, in a file or `describe` not serial;
  // a hook assignment stays legal. On for `tests/e2e/**/*.spec.ts` only (claude-docs/testing/e2e.md, "E2E").
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

  // An in-app link is a `PendingLink`, so the page bar and the skeletons follow the press. A bare `next/link` `<Link>` moves
  // the page with no signal. The status hook and types are fine, and the allowlist holds the files that build on `Link` itself.
  'in-app-link-through-pending-link': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || isStory(file)) return {};
      /** The files that import `next/link` for its component, each with the reason. */
      const ALLOWED = {
        'src/lib/navigation/pending-link.tsx':
          'PendingLink is the one wrapper every in-app link goes through',
        'src/components/Pager/pager-link.tsx':
          'the pager link reports its own pending state to the list, not the page bar',
        'src/components/TabbedPage/tab-links.tsx':
          'a tab link reports its press to the tab row, which greys the tabs',
      };
      const allowed = file in ALLOWED;
      let imported = false;
      return {
        ImportDeclaration(node) {
          if (node.source.value !== 'next/link' || node.importKind === 'type') return;
          const draws = node.specifiers.some(
            (specifier) =>
              specifier.type !== 'ImportSpecifier' ||
              (specifier.importKind !== 'type' &&
                (specifier.imported.name ?? specifier.imported.value) !== 'useLinkStatus'),
          );
          if (!draws) return;
          imported = true;
          if (!allowed) {
            context.report({
              node,
              message:
                'Link through PendingLink (@/lib/navigation), so the page bar and the skeletons follow the press',
            });
          }
        },
        'Program:exit'(program) {
          if (allowed && !imported) {
            context.report({
              node: program,
              message: `This file no longer imports the next/link component, so take it off the allowlist in lint/source-sweeps.js (${ALLOWED[file]})`,
            });
          }
        },
      };
    },
  },

  // A full page load (`location.assign`, `replace` or `reload`) is reported first, so the bar and the busy hint stay up
  // through the load instead of dropping when the request settles. Checked per function: a load in a callback is not
  // covered by a report in the function around it.
  'full-page-load-reports-leaving': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || isStory(file)) return {};
      const isLocation = (node) =>
        (node.type === 'Identifier' && node.name === 'location') ||
        (node.type === 'MemberExpression' &&
          !node.computed &&
          node.property.type === 'Identifier' &&
          node.property.name === 'location' &&
          node.object.type === 'Identifier' &&
          ['window', 'document'].includes(node.object.name));
      const FUNCTIONS = new Set([
        'ArrowFunctionExpression',
        'FunctionExpression',
        'FunctionDeclaration',
      ]);
      /** Whether `root` calls reportLeaving() before `before`, not looking inside a function of its own. */
      const reportsBefore = (root, before) => {
        const visit = (node) => {
          if (node !== root && FUNCTIONS.has(node.type)) return false;
          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'reportLeaving' &&
            node.range[1] <= before
          )
            return true;
          return children(node).some(visit);
        };
        return visit(root);
      };
      return {
        CallExpression(node) {
          const { callee } = node;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.property.type !== 'Identifier' ||
            !['assign', 'replace', 'reload'].includes(callee.property.name) ||
            !isLocation(callee.object)
          )
            return;
          let fn = node.parent;
          while (fn && !FUNCTIONS.has(fn.type)) fn = fn.parent;
          if (fn && reportsBefore(fn, node.range[0])) return;
          context.report({
            node,
            message:
              'Call reportLeaving() first, in the same function, so the page bar stays up through the full page load',
          });
        },
      };
    },
  },
  // Every typed input is built on the Field set (TextField, TextAreaField, PlainTextField, DateField, Combobox), so its label,
  // hint, error, limit and attributes are drawn once (.claude/rules/components.md, "Form inputs", R1). A raw text <input> or
  // <textarea> belongs only in src/components/Field/ and the Combobox, bar the files below. A control no one types into
  // (checkbox, radio, hidden, file, button) is not text, and neither is one carrying aria-hidden, which is a honeypot.
  'inputs-use-field': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      if (
        file.startsWith('src/components/Field/') ||
        file.startsWith('src/components/Combobox/') ||
        file.startsWith('src/components/PasswordField/')
      )
        return {};
      const ALLOWED = {
        'src/components/AdminCards/mint-form.tsx':
          'Number of Sheets: its total line takes the error’s place, and Field has no slot for that',
        'src/components/ChipColorField/index.tsx':
          'the chip colour hex box needs the form’s own id and the contrast ratio’s description',
        'src/components/IngredientForm/references.tsx':
          'Locator: its row links to its own control id',
        'src/components/HelpSearchForm/index.tsx': 'the help search is a plain GET form',
      };
      const NOT_TEXT = new Set([
        'hidden',
        'checkbox',
        'radio',
        'file',
        'submit',
        'button',
        'reset',
        'image',
        'range',
        'color',
      ]);
      let used = false;
      return {
        JSXOpeningElement(node) {
          if (node.name.type !== 'JSXIdentifier' || !['input', 'textarea'].includes(node.name.name))
            return;
          const attribute = (name) =>
            node.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
          if (attribute('aria-hidden')) return;
          if (node.name.name === 'input') {
            const type = attribute('type')?.value;
            if (type?.type === 'Literal' && NOT_TEXT.has(type.value)) return;
          }
          used = true;
          if (file in ALLOWED) return;
          context.report({
            node,
            message:
              'Build a typed input on the Field set (TextField, PlainTextField, DateField or Combobox), not a raw <' +
              node.name.name +
              '> (M17.24, R1)',
          });
        },
        'Program:exit'(program) {
          if (file in ALLOWED && !used) {
            context.report({
              node: program,
              message:
                'This file no longer holds a raw text input, so take it off the list in lint/source-sweeps.js (' +
                ALLOWED[file] +
                ')',
            });
          }
        },
      };
    },
  },

  // An amount is a text input with inputMode="decimal", never type="number", whose spinner, scroll wheel and locale handling
  // change what was typed (R2). A bounded whole number may keep it, on the list below.
  'no-number-input': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      const ALLOWED = {
        'src/components/AdminCards/mint-form.tsx':
          'Number of Sheets is a whole number from 1 to a maximum',
      };
      let used = false;
      return {
        JSXAttribute(node) {
          if (node.name.name !== 'type') return;
          const value = node.value;
          const text =
            value?.type === 'Literal'
              ? value.value
              : value?.type === 'JSXExpressionContainer' && value.expression.type === 'Literal'
                ? value.expression.value
                : null;
          if (text !== 'number') return;
          used = true;
          if (file in ALLOWED) return;
          context.report({
            node,
            message:
              'An amount is a text input with inputMode="decimal" and the shared quantity rule, not type="number"; only a bounded whole number keeps it, on the list in lint/source-sweeps.js (M17.24, R2)',
          });
        },
        'Program:exit'(program) {
          if (file in ALLOWED && !used) {
            context.report({
              node: program,
              message:
                'This file no longer uses type="number", so take it off the list in lint/source-sweeps.js (' +
                ALLOWED[file] +
                ')',
            });
          }
        },
      };
    },
  },

  // A length or size limit in a zod schema is a named constant exported from the module that owns it, so the service, the server schema
  // and the form share one number (R3). Applies to any src file importing zod. .min(0) and .min(1) are "not negative" and "not empty",
  // not limits, and pass.
  'schema-limits-are-named': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx?$/.test(file) || isStory(file) || file.startsWith('src/gql/')) return {};
      let zod = false;
      const calls = [];
      return {
        ImportDeclaration(node) {
          if (node.source.value === 'zod') zod = true;
        },
        CallExpression(node) {
          const { callee } = node;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.property.type !== 'Identifier' ||
            !['max', 'min'].includes(callee.property.name) ||
            (callee.object.type === 'Identifier' && callee.object.name === 'Math')
          )
            return;
          const [first] = node.arguments;
          if (first?.type !== 'Literal' || typeof first.value !== 'number') return;
          if (callee.property.name === 'min' && (first.value === 0 || first.value === 1)) return;
          calls.push(first);
        },
        'Program:exit'() {
          if (!zod) return;
          for (const literal of calls) {
            context.report({
              node: literal,
              message:
                'Write a schema limit as a named constant exported from the module that owns it, not a bare number (M17.24, R3)',
            });
          }
        },
      };
    },
  },

  // A length limit is soft: Field's limit prop shows a count and the schema refuses past it, because a hard maxLength silently cuts
  // pasted text (R4). Only a fixed-length code, where an extra character is always a typo, keeps one.
  'no-max-length-attribute': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file) || file.startsWith('src/components/Field/'))
        return {};
      const FIXED_LENGTH_CODES = new Set([
        'src/components/SignInPanel/two-factor-step.tsx',
        'src/components/PasswordSection/two-factor.tsx',
      ]);
      if (FIXED_LENGTH_CODES.has(file)) return {};
      return {
        JSXAttribute(node) {
          if (node.name.type === 'JSXIdentifier' && node.name.name.toLowerCase() === 'maxlength') {
            context.report({
              node,
              message:
                'Show a limit through Field’s limit prop and the schema’s .max(LIMIT), not a hard maxLength (M17.24, R4)',
            });
          }
        },
      };
    },
  },

  // A react-hook-form form lists its errors in FormErrorSummary (R6). The list names the forms that do not, with the reason; a listed file
  // that no longer needs its place is reported.
  'use-form-renders-error-summary': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      const ALLOWED = {
        'src/components/IngredientEntry/coven-choice.tsx':
          'a single select inside a confirmation, a form only because SelectField is react-hook-form’s; there is no second field to list',
      };
      let calls = null;
      return {
        CallExpression(node) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'useForm') calls ??= node;
        },
        'Program:exit'(program) {
          if (!calls && file in ALLOWED) {
            context.report({
              node: program,
              message:
                'This file no longer needs its place in the no-summary list: remove it from lint/source-sweeps.js',
            });
            return;
          }
          if (!calls) return;
          const summarised = /<FormErrorSummary\b/.test(codeOf(context));
          if (!summarised && !(file in ALLOWED)) {
            context.report({
              node: calls,
              message:
                'A form that calls useForm renders FormErrorSummary, so an error is listed and focused on Save (M17.24, R6)',
            });
          } else if (summarised && file in ALLOWED) {
            context.report({
              node: program,
              message:
                'This file now renders FormErrorSummary: remove it from the no-summary list in lint/source-sweeps.js',
            });
          }
        },
      };
    },
  },

  // A placeholder is empty or a short sample; a rule about the value goes in the hint (R8). Counts words, not the articles a, an and
  // the, so the field doc's own "Add a name" is two. (Field's placeholder prop and a raw control both end up as a JSX attribute.)
  'placeholder-is-short': {
    create: (context) => {
      const file = fileOf(context);
      if (!/^src\/.*\.tsx$/.test(file) || isStory(file)) return {};
      const words = (text) =>
        text.split(/\s+/).filter((word) => word !== '' && !/^(a|an|the)$/i.test(word)).length;
      return {
        JSXAttribute(node) {
          if (node.name.name !== 'placeholder') return;
          const value = node.value;
          const literal =
            value?.type === 'Literal'
              ? value
              : value?.type === 'JSXExpressionContainer' && value.expression.type === 'Literal'
                ? value.expression
                : null;
          if (typeof literal?.value !== 'string' || words(literal.value) <= 2) return;
          context.report({
            node,
            message:
              'A placeholder is one or two words; put a rule about the value in the field’s hint (M17.24, R8)',
          });
        },
      };
    },
  },
};
