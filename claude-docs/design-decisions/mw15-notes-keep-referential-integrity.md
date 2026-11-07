# MW.15 — Notes use real foreign keys and one generic history trigger

**Status:** decided for v2. Notes are deferred (`../backlog.md`); these two choices bind them when they are built.

**Decided:**

- **No polymorphic note subject.** A note names its subject through nullable foreign keys checked by `num_nonnulls`, which keeps real referential integrity.
- **No shadow history table per model.** History uses one generic trigger. It survives schema drift; a table per model does not.
