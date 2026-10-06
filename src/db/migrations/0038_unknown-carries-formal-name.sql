-- MB.161: an `unknown` entry may carry its formal name. The kind↔name CHECK
-- goes from a biconditional to three cases — `none` takes no formal name, a
-- named kind takes one, `unknown` takes either (DESIGN.md §5). Only a widening:
-- every row the old CHECK admitted, the new one admits, so nothing is
-- backfilled. Postgres cannot alter a CHECK in place, hence the drop and the
-- re-add under the same name, and the sidecar beside this file.
--
-- Written with `generate --custom`, its DDL taken from a `generate` run in a
-- scratch copy: MB.141's drop of `substitutes` is still pending, and a plain
-- `generate` here would have emitted it. The snapshot is the copied one with
-- this CHECK's value changed, so that drop stays MB.141's to generate
-- (claude-docs/db/expand-contract.md, "Expand/contract and the destructive-DDL check").
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_nomenclature_declares_canonical_name";--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_nomenclature_declares_canonical_name" CHECK (nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null));
