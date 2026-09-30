---
name: create-feature
description: Use when the user asks to start a new feature branch (e.g. "create a feature branch", "start a new feature", "/create-feature"). Asks for the feature's name, then branches off the latest staging as `feature/<slug>`.
---

# create-feature

Start a Gitflow feature branch off the latest `staging`, asking what to call it first.

Follow [`reference-branch.md`](reference-branch.md) steps 1–8 with these parameters:

- `<base>`: `staging`
- `<prefix>`: `feature`
