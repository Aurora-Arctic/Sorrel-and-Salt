# Archived from claude-docs/workshop.md — end of M0 (M0.34)

Text the M0.34 compression pass removed from
[`../../workshop.md`](../../workshop.md).

---

## 1. The `defaultState` description

```
- `.ladle/config.mjs` — `stories` glob, `port` 61000, `outDir` `build`, pinned `hmrPort` 61002. `addons.theme.defaultState: 'auto'` — the theme control's unset position, so the
  workshop opens letting `prefers-color-scheme` decide (the app's dark-first default lives
  in `globals.scss`, not here).
```

**This one was replaced rather than corrected, and the distinction matters.**

The description is right about the _intent_. `.ladle/config.mjs` currently
reads `defaultState: 'dark'`, so a reader comparing doc to code would conclude
the doc is wrong and "fix" it. The history says otherwise:

| Task  | Value    | Documented?                                                        |
| ----- | -------- | ------------------------------------------------------------------ |
| M0.30 | `'dark'` | Yes — `m0.30-ladle-component-workshop.md`: "the app is dark-first" |
| M0.31 | `'auto'` | Yes — decision record _and_ transcript, with rationale             |
| M0.32 | `'dark'` | **No** — no decision record, no transcript entry, nothing          |

M0.31 changed it deliberately and rewrote the surrounding code comment to
explain the choice. M0.32 flipped it back and left that comment in place, so
`.ladle/config.mjs` now contradicts itself: lines 66–71 describe `'auto'`
behaviour, line 74 sets `'dark'`. An undocumented reversal of a documented
decision, with the explanation left standing, is the signature of an accidental
revert rather than a considered one.

So the live summary keeps `'auto'` as the intent, states that the file
currently reads `'dark'`, and says explicitly that the code is the defect. The
regression is filed as its own Bugfix task; per `CLAUDE.md` it needs a
regression test, which is not this task's job.

## 2. The story gate's CI wiring

```
  array in `package.json`) and is a plain npm script so the M0.17 build job and the M0.20 PR
  gate can call it once they land — together with `npm run workshop:build`, which fails the
  run on a story that throws. Not an Oxlint rule: Oxlint has no custom-rule API and the check
```

"can call it once they land" — both landed and neither calls it.
`grep -rn "check:stories\|workshop:build" .github/workflows/` returns nothing.
`m0.33-component-story-gate.md` explicitly assigned the wiring to M0.17/M0.20
under "What this commits later tasks to"; the handoff was dropped when those
workflows were ported. The live text now states the gap plainly — pre-commit
only, CI catches neither a missing story nor a throwing one — and the wiring is
filed as its own task.

---

## Kept deliberately

- **The whole "Stopgaps to unwind" section.** All three stopgaps are still
  live, and the "three places that must agree" claim (the `$font-*` fallback
  stacks in `src/scss/_variables.scss`, the Google Fonts URL in
  `.ladle/head.html`, and the `:root` override in `.ladle/typography.scss`) is
  exact.
- Why `.ladle/theme.scss` is a trimmed copy of `globals.scss` rather than an
  import of it — importing whole drags `_typography.scss`'s document-wide
  element rules onto Ladle's own chrome.
- The `transform`/`overflow: hidden` reasoning in `.ladle/story-frame.scss`.
- `*.stories.tsx` being excluded from `tsc`.

## Not addressed by this pass

`.ladle/layout.scss`, `.ladle/primitives.scss`, `storyOrder` and
`previewPort: 61001` all exist and are undocumented here. That is an
_expansion_, not a compression, so it is out of scope for M0.34 and filed
alongside the equivalent gap in `styling.md`.
