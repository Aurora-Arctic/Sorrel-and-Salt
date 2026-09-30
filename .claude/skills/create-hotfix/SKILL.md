---
name: create-hotfix
description: Use when the user asks to start a new hotfix branch (e.g. "create a hotfix branch", "start a hotfix", "/create-hotfix"). Asks for the hotfix's name, then branches off the latest main as `hotfix/<slug>`.
---

# create-hotfix

Start a Gitflow hotfix branch off the latest `main`, asking what to call it first.

Follow [`../create-feature/reference-branch.md`](../create-feature/reference-branch.md) steps 1–8 with these parameters:

- `<base>`: `main`
- `<prefix>`: `hotfix`
