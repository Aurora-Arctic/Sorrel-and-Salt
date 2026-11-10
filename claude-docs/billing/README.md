# Billing Research

This folder holds the research for task M17.1: what it would cost to run Sorrel & Salt, and how it could charge for it. It records research only. No decision lives here.

| File                                             | What it holds                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [running-costs.md](running-costs.md)             | What the site costs a month at 100, 1,000, 10,000 and 100,000 paying seats: platform, tooling, operations, maintenance and processing.                    |
| [subscription-models.md](subscription-models.md) | Six ways to charge (three more were rejected), measured against DESIGN.md §13's five wants, with break-even tables, processors and the owner's questions. |

## When the Prices Were Fetched

Every price and policy was fetched on **2026-11-06**. Vendors change prices, so check a figure's source before relying on it later.

## Re-Running the Numbers

The figures in both files come from a script, `scripts/billing-model.mjs`. Run:

```
node scripts/billing-model.mjs
```

Add `--json` to get the same figures as data. Sizes are paying seats; trial, curator, exempt and demo-only accounts are derived from them. Its inputs are one object near the top of the file. Change a price or a ratio there and re-run it. The model prices in `subscription-models.md` are assumptions anchored on comparables, and are set there too.

## Where Decisions Live

The decision record is `claude-docs/design-decisions/ingredients.md`, "Subscription Billing Scope". It records the model, the processor, the keeper-exemption schedule and the other choices the questions at the end of `subscription-models.md` leave to the owner.
