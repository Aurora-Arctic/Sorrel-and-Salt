# Running Costs

**Status:** research, no decision made · **Date:** 2026-11-06 · **Task:** M17.1

This page prices what it costs to run Sorrel & Salt at 100, 1,000, 10,000 and 100,000 **paying seats**, in US dollars a month. A paying seat is one activated account that holds a seat in a paying coven. Every other account is overhead derived from the paying seats (see "Overhead on Top of Paying Seats"). It does not choose a billing model; [subscription-models.md](subscription-models.md) does that comparison and uses these figures as its cost side.

**Nothing here needs you to act yet.** The last section lists what I could not confirm and what I need you to decide. Prices were fetched on 2026-11-06 and move; see the [README](README.md).

Every figure is labelled. `measured` was counted in this repository. `sourced` comes from a numbered source at the bottom. `derived` is calculated from named inputs. `assumption` is a guess, given with a range you can change. The owner withdrew the free tier on 2026-11-06 (see "What Is Free"). The totals are computed by `scripts/billing-model.mjs` from the Inputs table, so changing an assumption changes every total (see "How to Re-Run the Numbers").

## Inputs

### Ratios

| Input                                 | Value                        | Label      | Source or range                                                                                                                |
| ------------------------------------- | ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Members per coven                     | 5.5                          | sourced    | Tabletop groups average 5.5 [S45]; family covens run 3 to 20+; a coven needs at least 3 [S44] (URLs in subscription-models.md) |
| Coven memberships per account         | 1.2                          | assumption | Range 1.0 to 2.0. No comparable publishes groups per member                                                                    |
| Monthly active share of accounts      | 25%                          | assumption | Range 15% to 30%. Not found                                                                                                    |
| Sessions per active account per month | 8                            | assumption | Range 4 to 16                                                                                                                  |
| Function invocations per session      | 40                           | derived    | 480,000 invocations ÷ 12,000 sessions, [17]                                                                                    |
| Active CPU per invocation             | 30 ms                        | sourced    | [17]                                                                                                                           |
| Edge requests per session             | 30                           | assumption | Range 9 to 100                                                                                                                 |
| Data out per session                  | 1.5 MB                       | assumption | Range 0.5 to 5                                                                                                                 |
| Provisioned memory                    | 2 GB, 2x the Active CPU time | assumption | Range 1x to 5x                                                                                                                 |
| Mails per account per month           | 0.5                          | assumption | Range 0.25 to 1; the 18 mail templates are sign-in, invitation and support mails                                               |
| Document mailings per year            | 2                            | assumption | The document-updated mail goes to every account each time                                                                      |
| Monthly churn of paying units         | 6.1%                         | sourced    | ChartMogul, average revenue per account under $25 [34]. Recurly gives 3.6% but does not state the period                       |

### What Is Free

The owner's decision, 2026-11-06: **there is no free tier.** The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. Everything else pays.

### Overhead on Top of Paying Seats (Inputs)

The size steps count paying seats. These inputs turn them into accounts. Lane G (the overhead research, `.reports/m17.1/lane-g-overhead.md`, sources [G1] to [G14] below) supplies the shares.

| Input                               | Value                                                                             | Label             | Source or range                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo-only share of all accounts     | 62.5%                                                                             | derived           | 100% − 37.5% B2B activation, 62 companies [G1]. Range 57.4% (CRM & Sales, [G1]) to 70% (SaaS median 30%, [G2]). Probably high for an invite-gated site; no source says by how much                                                                                                                                                                                                                                                                               |
| Monthly growth of paying seats      | 2.84% up to 10,000 seats; 1.53% at 100,000                                        | derived           | (1.40)^(1/12) − 1 for the under-$1M band median of 40%, and (1.20)^(1/12) − 1 for 20%, [G4]. 100,000 seats at the model prices earn about $2.1M to $4.0M a year (derived from the net revenue table), which is the $1M–$3M band (25%, 1.88%) for models (c), (g) and (h) at $2.27 and the $3M–$5M band (20%) for (b) and (h) at $3; every band from $3M up has a median of 19% to 22%, so I use 20% (the 25% case would give 79.8% trial seats instead of 76.3%) |
| Trial length                        | 1 month                                                                           | owner, 2026-11-06 | Keepers may set longer per coven                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Trial-to-paid conversion, no card   | 10%                                                                               | sourced           | ChartMogul, 200 products: no card, "great" 10% to 15%, "good" 4% to 6% [G7]. Owner: the trial needs no card, so the no-card benchmark applies                                                                                                                                                                                                                                                                                                                    |
| Trial seats per paying seat         | (growth + churn) ÷ conversion × trial months                                      | derived           | A trial must replace churned seats as well as growth: (2.84% + 6.1%) ÷ 10% = 89.4%; (1.53% + 6.1%) ÷ 10% = 76.3% (Lane G, Section 2). Churn is the 6.1% above                                                                                                                                                                                                                                                                                                    |
| Curator covens                      | one curator per 1,000 paying seats, minimum 2; 7 seats each, the curator included | owner, 2026-11-06 | Free seats 2 to 15 per coven is the range in comparable products [G10] to [G12]                                                                                                                                                                                                                                                                                                                                                                                  |
| Exempt seats, share of paying seats | 5% at 100, 3% at 1,000, 1.5% at 10,000, 0.5% at 100,000                           | assumption        | Owner, 2026-11-06: "5% of paying seats initially, falling as the site becomes established and its beta testers are staff rather than friends and family." Each exemption has a timeline set by the keeper. No benchmark exists: Lane G found none ([G13] and [G14] show comparable practice only, and Lane G's own 1% was more cautious). **Owner to confirm**                                                                                                   |
| Demo-only accounts                  | activated accounts × d ÷ (1 − d)                                                  | derived           | d = 62.5%. Activated accounts are paying + trial + curator + exempt seats                                                                                                                                                                                                                                                                                                                                                                                        |

A Sorrel & Salt trial starts when a steward creates a coven, which is already past activation, so the no-card benchmark probably overstates the trial share, and counting it beside the demo-only share counts some people twice (Lane G, Section 2 caveat). The owner asked for the no-card benchmark and I used it. No source gives the effect of trial length on conversion; a longer trial multiplies the trial seats by its months.

**Measured on this repository (Lane E).** One coven list page load costs one function invocation and one edge request. [17] expects 4 to 5 invocations per page, so I use [17]'s 40 per session rather than the measurement; it is the higher figure. Real Active CPU per render was not measured.

### Storage (measured)

| Input                                                                         | Value                                                                                       | Label                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| Fixed global data (compendium 13.0 MB, vocabularies 1.6 MB, documents 0.2 MB) | 14.8 MB                                                                                     | measured                         |
| One account (minimum 1,376 B, typical OAuth sign-in 3,766 B)                  | 3,766 B                                                                                     | measured                         |
| One coven (demo level 32,682 B, W level 203,327 B)                            | 117,998 B, the midpoint                                                                     | derived                          |
| Mailing ledger row per recipient                                              | 225 B                                                                                       | measured (200 to 250 B)          |
| Neon storage, plus restore history and snapshots                              | $0.35 + $0.20 + $0.09 per GB-month, history and snapshots each assumed the size of the data | sourced [6] [7], size assumption |

Real spells and ingredients per coven are unknown. The two coven sizes above are measured fixtures, not observed usage, so database size is the least certain row.

### Prices

| Input                                                                                    | Value                                                                                               | Label      | Source                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Pro                                                                               | $20 a month, includes $20 of usage credit                                                           | sourced    | [2]                                                                                                                                                                                                                                                                                                                                                              |
| Function invocations over the allowance                                                  | $0.60 per million                                                                                   | sourced    | [1]                                                                                                                                                                                                                                                                                                                                                              |
| Active CPU                                                                               | $0.128 per hour                                                                                     | sourced    | [1]                                                                                                                                                                                                                                                                                                                                                              |
| Provisioned memory                                                                       | $0.0106 per GB-hour                                                                                 | sourced    | [1]                                                                                                                                                                                                                                                                                                                                                              |
| Fast Data Transfer                                                                       | 1 TB included, then $0.15 per GB                                                                    | sourced    | [1]                                                                                                                                                                                                                                                                                                                                                              |
| Edge requests                                                                            | $2 per million over the allowance (see open item 1)                                                 | sourced    | [1]                                                                                                                                                                                                                                                                                                                                                              |
| Vercel Workflows events                                                                  | $20 per million; 3 events per step, 1 more per retry                                                | sourced    | [4]                                                                                                                                                                                                                                                                                                                                                              |
| Workflow events from daily jobs                                                          | 270 a month                                                                                         | assumption | 3 jobs a day, 3 events each                                                                                                                                                                                                                                                                                                                                      |
| Vercel Observability Plus                                                                | $1.20 per million events                                                                            | sourced    | [5]                                                                                                                                                                                                                                                                                                                                                              |
| Neon Launch                                                                              | $0.106 per CU-hour                                                                                  | sourced    | [6]                                                                                                                                                                                                                                                                                                                                                              |
| Neon Scale                                                                               | $0.222 per CU-hour                                                                                  | sourced    | [6]                                                                                                                                                                                                                                                                                                                                                              |
| Neon average compute                                                                     | 0.25 CU at 100 and 1,000; 0.5 CU at 10,000; 2 CU at 100,000                                         | assumption | Range half to double                                                                                                                                                                                                                                                                                                                                             |
| Neon hours awake a month                                                                 | 360, 540, 720, 720                                                                                  | assumption | Autosuspend while idle                                                                                                                                                                                                                                                                                                                                           |
| Resend                                                                                   | Free 3,000 a month (100 a day); Pro 50K $20; Pro 100K $35                                           | sourced    | [8]                                                                                                                                                                                                                                                                                                                                                              |
| Domain, `.com`                                                                           | $11.81 a year                                                                                       | sourced    | [9] (Porkbun; Vercel's price not found)                                                                                                                                                                                                                                                                                                                          |
| Claude Ultra                                                                             | $200 a month                                                                                        | sourced    | [10]                                                                                                                                                                                                                                                                                                                                                             |
| GitHub Free                                                                              | $0                                                                                                  | sourced    | [11]                                                                                                                                                                                                                                                                                                                                                             |
| Operations stack                                                                         | $12.07 / $27.44 / $36.12 / $163.90                                                                  | derived    | Lanes B and H: error events, uptime, log drain, restore test, DMARC reports and tracing (see "Operations Stack")                                                                                                                                                                                                                                                 |
| Fixed labour hours a month (low / median / high)                                         | 24.8 / 44.4 / 70.4                                                                                  | derived    | Lane I: maintenance, incident response and recurring chores that do not grow with users                                                                                                                                                                                                                                                                          |
| Variable labour hours per 1,000 paying seats (low / median / high)                       | 6.08 / 26.6 / 100.3 (6.95 / 30.3 / 113.0 before AI assistance)                                      | derived    | Lane I: support, disputes, privacy requests, abuse reports; Lane K's factor on support minutes applied (below)                                                                                                                                                                                                                                                   |
| AI assistance factor on support minutes per contact (low / median / high)                | 0.735 / **0.87 used** / 1.00                                                                        | sourced    | Brynjolfsson, Li and Raymond, QJE 2025 [38]; Lane K. On by default (owner, 2026-11-06). Deflects no contact                                                                                                                                                                                                                                                      |
| Claude Team seat per support agent                                                       | $25 a month, 2-seat minimum                                                                         | sourced    | Lane K [38]. Agents use Team, never Pro; the training terms are under the AI heading in Labour [40]                                                                                                                                                                                                                                                              |
| Support wage (customer-service work: support, disputes, privacy requests, abuse reports) | $41.47 an hour, derived                                                                             | derived    | Owner decisions, 2026-11-06. (48.00 + 56.43 + 30.60) ÷ 3 = $45.01, the MIT living wage [36][37], minus the average MIT medical line (9,588 ÷ 2,080 = 4.61; 9,477 ÷ 2,080 = 4.56; 3,032 ÷ 2,080 = 1.46; average 3.54) = **$41.47**. The site provides health cover as a benefit, so the wage is adjusted down by that line. Pay scales with the worker's location |
| Loaded support cost                                                                      | **$53.80 an hour** ($50.92 low load, $56.68 high load)                                              | derived    | The $41.47 wage plus Lane D's employer payroll taxes and benefits (see "Labour")                                                                                                                                                                                                                                                                                 |
| Market-rate support sensitivity                                                          | $24.20 median / $29.49 75th percentile, loaded $32.27                                               | sourced    | BLS OEWS, Washington customer-service representatives [39]. Not the base: the Code of Ethics sets a living wage as the floor for anyone the site pays                                                                                                                                                                                                            |
| Engineering wage and loaded cost (fixed hours: maintenance, incidents, filing)           | $80.07 BLS developer median, loaded **$100.88** ($94.56 to $107.20); $122.50 contractor sensitivity | sourced    | [39], loaded as for support; the $122.50 is Lane D's contractor figure, unloaded because a contractor bills all-in [29]                                                                                                                                                                                                                                          |
| Washington retailing B&O                                                                 | 0.471%, less a credit of up to $55 a month                                                          | sourced    | [26]                                                                                                                                                                                                                                                                                                                                                             |
| Stripe card fee                                                                          | 2.9% + 30¢; Billing 0.7%; Tax Basic 0.5%                                                            | sourced    | [30] [31]                                                                                                                                                                                                                                                                                                                                                        |
| Managed Payments                                                                         | +3.5% per charge, tax included                                                                      | sourced    | [32]                                                                                                                                                                                                                                                                                                                                                             |

B&O means business and occupation tax, Washington's tax on gross receipts rather than profit. CU-hour means one compute unit running for one hour (a compute unit is Neon's measure of CPU and memory).

## Overhead on Top of Paying Seats

| Quantity                                             |   100 |  1000 |    10000 |    100000 |
| ---------------------------------------------------- | ----: | ----: | -------: | --------: |
| Paying seats                                         |   100 | 1,000 |   10,000 |   100,000 |
| Monthly growth of paying seats                       | 2.84% | 2.84% |    2.84% |     1.53% |
| Trial seats (one-month trial, no card)               |  89.4 |   894 |    8,940 |    76,300 |
| Trial seats as a share of paying seats (%)           |  89.4 |  89.4 |     89.4 |      76.3 |
| Curators (one per 1,000 paying seats, minimum 2)     |     2 |     2 |       10 |       100 |
| Curator-coven seats (7 each)                         |    14 |    14 |       70 |       700 |
| Exempt seats (5% / 3% / 1.5% / 0.5% of paying seats) |     5 |    30 |      150 |       500 |
| Activated accounts (all of the above)                | 208.4 | 1,938 |   19,160 |   177,500 |
| Demo-only accounts                                   | 347.3 | 3,230 | 31,933.3 | 295,833.3 |
| Total accounts                                       | 555.7 | 5,168 | 51,093.3 | 473,333.3 |
| Active accounts (total accounts x 25%, range 15-30%) |   139 | 1,292 |   12,773 |   118,333 |
| Total accounts per paying seat                       |  5.56 |  5.17 |     5.11 |      4.73 |

Active accounts are total accounts × the 25% monthly active share, an assumption (range 15% to 30%, no source found). They set the session count that drives function, bandwidth and tracing costs.

Worked example, 100 paying seats: trial seats = 100 × (2.84% + 6.1%) ÷ 10% = 89.4. Curators = max(2, floor(100 ÷ 1,000)) = 2, so 14 seats. Exempt = 100 × 5% = 5. Activated = 100 + 89.4 + 14 + 5 = 208.4. Total accounts = 208.4 ÷ (1 − 0.625) = 555.7, so 347.3 are demo-only.

**Sensitivity of total accounts** to the two widest ranges:

| Quantity                        | 100 |  1000 |  10000 |  100000 |
| ------------------------------- | --: | ----: | -----: | ------: |
| Demo-only share 57.40%          | 489 | 4,549 | 44,977 | 416,667 |
| Demo-only share 62.50%          | 556 | 5,168 | 51,093 | 473,333 |
| Demo-only share 70.00%          | 695 | 6,460 | 63,867 | 591,667 |
| No-card trial conversion 5.00%  | 794 | 7,552 | 74,933 | 676,800 |
| No-card trial conversion 10.00% | 556 | 5,168 | 51,093 | 473,333 |
| No-card trial conversion 15.00% | 476 | 4,373 | 43,147 | 405,511 |

The 5% trial-conversion row is the "good" no-card case; the 15% row the top of "great" [G7]. Demo-only accounts cost storage (3,766 B each, measured) and a few mails, so the demo-only range moves cost very little; the trial share moves it most. These ranges move the usage rows below (accounts drive sessions, mails and storage) but not the paying-seat counts the break-even uses.

## Scale Assumptions

| Quantity                                            |    100 |    1000 |     10000 |     100000 |
| --------------------------------------------------- | -----: | ------: | --------: | ---------: |
| Accounts (paying and overhead)                      |    556 |   5,168 |    51,093 |    473,333 |
| Covens                                              |     45 |     423 |     4,180 |     38,727 |
| Sessions a month                                    |  1,111 |  10,336 |   102,187 |    946,667 |
| Function invocations a month                        | 44,459 | 413,440 | 4,087,467 | 37,866,667 |
| Active CPU hours                                    |    0.4 |     3.4 |      34.1 |      315.6 |
| Provisioned memory GB-h                             |    1.5 |    13.8 |     136.2 |    1,262.2 |
| Data transfer GB                                    |      2 |      16 |       153 |      1,420 |
| Edge requests a month                               | 33,344 | 310,080 | 3,065,600 | 28,400,000 |
| Mails a month                                       |    370 |   3,445 |    34,062 |    315,556 |
| Workflow events a month                             |  1,381 |  10,606 |   102,457 |    946,937 |
| Database size (MB)                                  |   23.2 |    87.2 |     724.2 |    6,581.1 |
| Days to mail one document to everyone (at 60 a day) |     10 |      87 |       852 |      7,889 |

An account here is a person with a login. A coven is a workspace. Activated accounts become covens by dividing memberships by 5.5 members; demo-only accounts sit in the demo coven only. Active share, sessions and mails apply to all accounts, which overstates the demo-only accounts' use and so errs towards a higher bill. Paying units are covens or accounts, depending on the model, derived from paying seats.

## Platform

### Vercel

Vercel hosts the site and runs its functions. **Hobby ($0) is a reference row only.** It forbids commercial use, and taking payment from visitors counts as commercial use [3], so it ends the day subscriptions start. It also caps usage at 1,000,000 invocations and 4 CPU-hours a month [17], which the model nears at 1,000 paying seats (3.4 CPU-hours of 4) and passes by 10,000 (4.1 million invocations, 34.1 CPU-hours).

**Pro is $20 a month from 100 paying seats.** It includes $20 of usage credit [2]. Every meter I priced stays under that credit up to 10,000 paying seats (metered usage $14.44), so the bill is the $20 plan fee. At 100,000 paying seats metered usage reaches $213.23, so overage is $193.23. Extra deploying seats cost $20 each; viewer seats are free [2]. Vercel Workflows (the durable jobs that send mail) bill per event and are in the metered line.

Vercel Observability Plus (logs and metrics, on by default for new Pro teams since 3 April 2026 [5]) is priced separately in the table below.

### Neon

Neon hosts the Postgres database. **Launch ($0.106 per CU-hour) is the plan I model**: restore history is 7 days, set up by default at 1 day [7]. **Scale ($0.222) is shown as an alternative**: it keeps history for 30 days and carries a 99.95% uptime agreement [14], at about twice the compute price. Neon Launch has no IP allow-list (Scale only, and it needs the $100-a-month Static IPs add-on).

### Resend

Resend sends the mail. Free allows 3,000 mails a month and 100 a day; Pro 50K is $20; Pro 100K is $35; Scale tiers run from $90 for 100K to $650 for 1M [8].

**The document-mailing cap is a job-design problem, not a billing one.** The document-updated mail goes to every account, and the mailing job is limited to 60 mails a day. Mailing everyone takes ceil(accounts ÷ 60) days, counting demo-only accounts: **10 days at 100 paying seats, 87 at 1,000, 852 at 10,000 and 7,889 at 100,000.** At 10,000 paying seats a policy change would take more than two years to reach everyone. I need you to decide whether that is acceptable or whether the job should mail in larger batches on a paid tier; that is a job-design question for you, not part of the subscription decision. Resend's price tier is set by monthly volume, not by this cap.

### Domain

A `.com` is $11.81 a year at Porkbun [9], or $0.98 a month. Vercel's `.com` price was not found; Cloudflare sells at cost but I found no figure.

| Line                                                |     100 |    1000 |   10000 |     100000 |
| --------------------------------------------------- | ------: | ------: | ------: | ---------: |
| Vercel metered usage (before credit)                |   $0.12 |   $1.05 |  $14.44 |    $213.23 |
| Vercel Pro (plan + overage after the $20 credit)    |  $20.00 |  $20.00 |  $20.00 |    $213.23 |
| Vercel Observability Plus                           |   $0.11 |   $0.98 |   $9.69 |     $89.74 |
| Neon Launch (compute + storage, history, snapshots) |   $9.55 |  $14.36 |  $38.59 |    $156.56 |
| Neon Scale, same usage (alternative)                |  $19.99 |  $30.02 |  $80.35 |    $323.60 |
| Resend tier                                         |    Free | Pro 50K | Pro 50K | Scale 500K |
| Resend                                              |   $0.00 |  $20.00 |  $20.00 |    $350.00 |
| Domain (.com, Porkbun)                              |   $0.98 |   $0.98 |   $0.98 |      $0.98 |
| Operations stack (Lanes B and H)                    |  $12.07 |  $27.44 |  $36.12 |    $163.90 |
| of which server-side tracing (10% sampled)          |   $0.04 |   $0.41 |   $4.09 |     $37.87 |
| Platform and operations total                       |  $42.72 |  $83.77 | $125.38 |    $974.42 |
| Claude Ultra                                        | $200.00 | $200.00 | $200.00 |    $200.00 |
| Cash costs                                          | $242.72 | $283.77 | $325.38 |  $1,174.42 |

## CI

GitHub Actions is **free while the repository is public** [12]. Lane E measured one full gate run at about 15.7 to 18.5 runner-minutes, and about 290 full runs a month, which is about 4,550 to 5,370 minutes plus about 28 for runs stopped early.

**If the repository went private**, the Free plan includes 2,000 minutes a month [12]. At Linux 2-core rates ($0.006 a minute [13]), the remaining 2,550 to 3,370 minutes cost about $15 to $20 a month. Private repositories would also lose the free code scanning: Secret Protection is $19 and Code Security $30 per active committer [11]. One committer: $49 a month. Going private is a real cost that I have not included in the totals, since the repository is public today.

## Development Tooling

Claude Ultra is **$200 a month** [10], 10x the usage of Pro, and it is the largest cash line at every size. GitHub is $0 [11]. Whether the pricing page includes cloud review coverage is not stated there; I could not confirm it, so the review tooling may need a different plan.

## Operations Stack

This covers error tracking, uptime checks, log storage and paging. Lane H added eight gaps below. Lane B assumed 5 error events and 1 MB of logs per account per month, 8 monitors, and 1 responder (2 from 10,000).

| Category                     | Recommended                                          |    100 |  1,000 | 10,000 | 100,000 |
| ---------------------------- | ---------------------------------------------------- | -----: | -----: | -----: | ------: |
| Error tracking               | GlitchTip hosted [19]                                |     $0 |    $15 |    $15 |     $50 |
| Uptime checks                | UptimeRobot Solo [20] [H4]                           |    $12 |    $12 |    $12 |     $12 |
| Logs                         | Vercel drain fee [21], stored in Axiom Personal [22] |     $0 |     $0 |     $5 |     $50 |
| On-call paging               | PagerDuty Free [23]                                  |     $0 |     $0 |     $0 |      $0 |
| Dependency and secret checks | GitHub built-ins and Socket Free [24]                |     $0 |     $0 |     $0 |      $0 |
| Restore test                 | a scheduled restore, Neon storage                    |  $0.03 |  $0.03 |  $0.03 |   $0.03 |
| Email deliverability         | Postmark DMARC digests [H3]                          |     $0 |     $0 |     $0 |     $14 |
| Server-side tracing          | Vercel tracing at 10% sampling [H6]                  |  $0.04 |  $0.41 |  $4.09 |  $37.87 |
| Total                        |                                                      | $12.07 | $27.44 | $36.12 | $163.90 |

Vercel Pro and Observability Plus are left out of this table because they are priced above. Alternatives: Sentry Team at $29 a month, Bugsink, and Better Stack on-call at $29 per responder on an annual plan.

**The built-ins-only floor** is Vercel Pro, Observability Plus and Neon Launch, which cost nothing extra. It has no outside uptime checks, no error grouping, no phone paging and no status page.

**Service level.** None of seven comparables publishes uptime or response times on self-serve plans. I therefore price on-call as **best effort in working hours**. If you want a promised response, the alternative is a paid on-call arrangement: Lane D's incident.io figure is $540 a week, **$2,340 a month** [25], shown as its own row in the totals.

**Open items for you:**

- GlitchTip uses the Sentry SDK with its client file deleted. That is to be proved in a proof of concept, and its hosted privacy terms were not found.
- Each adopted vendor must be added to the privacy policy's list of processors. PagerDuty's data processing agreement was not fetched.
- UptimeRobot Free has no heartbeat monitors (Lane H, [H4]), so Solo at $12 a month (billed annually; $13 monthly) is priced from 100 paying seats. This corrects Lane B.
- The availability of GitHub's dependency-review action on public repositories is in conflict between two pages.
- **Bot Protection.** Vercel's Bot Protection challenge mode serves a JavaScript challenge to non-browser traffic. I need you to decide whether the Code of Ethics allows that. Log mode runs no script.

### Operations Gaps (Lane H)

Lane H, fetched 2026-11-06, covers eight things Lane B left open. Its sizes were written as "accounts" but were briefed as paying seats. Only tracing depends on volume. Lane H assumes 300 requests per account a month, which this model does not use: the request count here is the model's own, sessions times 40 invocations per session. Sessions are total accounts × 25% active × 8 sessions each, which is 2 sessions and about 80 requests per account a month, about 445 per paying seat, against Lane H's 300 per paying seat. The model's count is the higher one, which is why its tracing line exceeds Lane H's. Spans per request (20) and sampling (10%) are Lane H's assumptions and are kept. Tracing is $0.04 / $0.41 / $4.09 / $37.87. Lane H's own figures, at 300 requests per paying seat, were $0.03 / $0.30 / $3.00 / $30.00. Every other pick has a flat price. Each vendor named here must be added to the privacy policy's list of processors in the same change.

**1. Spend alerts and caps.** Included: Vercel Spend Management on Pro at no extra cost, with a budget, notices at 50%, 75% and 100%, and a signed webhook [H1]; Neon spending notifications on Launch and Scale, which alert but do not stop usage, and Neon consumption limits, which are hard caps [H1]. Pick: a Vercel budget with a webhook, Neon notifications and a Neon `compute_time_seconds` quota, with Resend pay-as-you-go left off. Price: $0 / $0 / $0 / $0. Reason: every piece is free and already sits with an existing processor. Vercel's "Pause Production Deployments" setting should stay off, because a 503 for every paying account is worse than a bill; this is an owner decision.

**2. Database health.** Included: the Neon console monitoring page and the `pg_stat_statements` extension [H2]. Pick: those, a weekly look at Query performance, and a daily cron that reads `pg_stat_activity` and database size and calls the alert webhook past a threshold. Price: $0 at every size. Reason: pganalyze costs $149 a month, more than the whole Lane B stack, and gets less on Neon [H2]. Reconsider it only at 100,000 on Neon Scale.

**3. Email deliverability.** Included: Resend webhooks for bounces, complaints and failures, and automatic suppression after a hard bounce or complaint [H3]. Pick: route those events to the alert route, make DMARC required with `rua=` pointing at Postmark's free weekly digest, and register the domain in Google Postmaster Tools. Price: $0 / $0 / $0 / $14 (Postmark paid digests, 60 days of history, from 100,000). Reason: every step is free at the current volume. Leave open and click tracking off, because they need tracking pixels. Postmark and Google become processors, but they receive aggregate reports only.

**4. Certificate and DNS expiry.** Included: Vercel renews certificates automatically and notifies on failure, and a domain bought through Vercel auto-renews [H4]. Pick: UptimeRobot Solo, which monitors certificate and domain expiry and, unlike Free, includes heartbeat monitors [H4]. Price: $12 at every size. Reason: Solo is needed for the three cron heartbeats anyway, so expiry monitoring costs nothing extra. UptimeRobot is already a Lane B processor.

**5. Payment-side monitoring.** Included: Stripe Radar Lite, free with payment processing from 22 January 2027, fraud alerts, dispute notices, and Smart Retries inside Billing's 0.7% [H5]. Pick: Radar Lite, with `charge.dispute.created` and `radar.early_fraud_warning.created` sent to the paging route, and the last `invoice.payment_failed` retry sent to the daily digest. Price: $0 a month; a dispute costs $15, plus $15 to counter it, refunded if won [H5]. Reason: a dispute has a deadline of 7 to 21 days, and Lite with webhooks covers one operator. Stripe advises loading Stripe.js on every page for better risk signals, which conflicts with the no-browser-script rule; hosted Checkout collects the same signals on Stripe's page and gives up part of the risk model's accuracy. This is an owner decision.

**6. Server-side tracing.** Included: Vercel tracing on every plan, $0.50 per 1M span units on Pro, 14 days of traces, set up with `@vercel/otel` [H6]. Pick: native tracing at 10% sampling. Price: see the table above. Reason: it is the cheapest option fetched at every size and adds no processor. Span attributes must not carry email addresses or request bodies.

**7. Secrets rotation and vulnerability disclosure.** Included: Vercel Secret variables, Better Auth's versioned secrets, Stripe's 7-day key overlap, Neon's immediate password reset (no overlap, so rotate through a second role), GitHub private vulnerability reporting, and `/.well-known/security.txt` under RFC 9116 [H7]. Pick: all of them, one rotation runbook in `claude-docs/` with a section per vendor, a yearly rotation, a `SECURITY.md`, and a `security.txt` that the yearly rotation renews. Price: $0 / $0 / $0 / $0. Reason: every step is free and native. Serving `security.txt` needs CLAUDE.md rule 1's `/.well-known/*.json` exception widened to name it, or a static file under `public/.well-known/`; this is an owner decision.

**8. Incident communication and runbooks.** Included: UptimeRobot Solo's public status page on its own domain, without subscribers, and Resend's mail path to every account [H8]. Pick: the Solo status page on a `status.` subdomain, a Resend mail to the accounts an incident affects, and a one-page runbook in `claude-docs/ops/` using PagerDuty's structure and Google's postmortem headings. Price: $0 beyond Solo. Reason: no subscriber addresses go to a new processor. Statuspage, Instatus and UptimeRobot Team each hold subscriber addresses; Team adds $27 a month.

## Labour

Hours a month = fixed hours + variable hours × (paying seats ÷ 1,000), using Lane I's figures (sources dated 2026-11-06). This replaces the flat 47.4 hours I used before. Lane D's flat figure came from build hours (maintenance 29.9 + incident 19.5 − a shared 2-hour emergency share) and so held the same at every size; Lane I adds the work that grows with users: support, payment disputes, privacy requests and abuse reports. The fixed hours below are Lane D's kind of work, re-derived by Lane I.

| Case            | Fixed hours | Variable hours per 1,000 seats | Hours at 100 | Hours at 1000 | Hours at 10000 | Hours at 100000 | One-person ceiling (seats) |
| --------------- | ----------: | -----------------------------: | -----------: | ------------: | -------------: | --------------: | -------------------------: |
| low (primary)   |        24.8 |                           6.08 |         25.4 |          30.9 |           85.6 |           632.7 |                     22,241 |
| median (stress) |        44.4 |                           26.6 |         47.1 |          71.0 |          310.7 |          2707.4 |                      4,341 |
| high            |        70.4 |                          100.3 |         80.4 |         170.7 |         1073.5 |         10100.9 |                        893 |

Variable hours include the AI factor of 0.87 on the support part. Without AI assistance they are 6.95 / 30.3 / 113.0 per 1,000 seats and the ceilings are 19,453 / 3,819 / 793. Disputes take 0.25 / 2.0 / 5.0 hours each. **Contacts are counted on 25% of all accounts, demo-only accounts included. That overstates the contacts of an invite-gated site, and is kept as the conservative choice.**

**AI assistance for support agents (on by default).** The factor on minutes per support contact is 0.87 in the primary case (0.735 and 1.00 as sensitivities): Brynjolfsson, Li and Raymond (QJE 2025) found resolutions per hour up 15.2% and handle time down 8.5% on average. It deflects no contact, so contacts are unchanged. Each support agent beyond the owner (whose own Claude Ultra is already counted) has a **Claude Team seat at $25 a month**, with a 2-seat minimum so the first agent costs $50, one agent per further 160 hours a month, rounded up. The seats are added inside every labour row of the Totals tables: low row 0 / 0 / 0 / 3 and median row 0 / 0 / 2 / 16 at the four sizes. **Privacy condition:** agents use Team, never Pro. Pro's consumer terms train on inputs unless a person opts out, and customer messages must not train a model; Anthropic's privacy centre states "By default, we will not use your inputs or outputs from our commercial products (e.g. Claude for Work, Anthropic API, Claude Gov, etc.) to train our models", with exceptions for thumbs-up/down feedback and data a user chooses to share, which a Team or Enterprise plan's Owner can disable through the Rate chats setting ([40], updated 2026-08-18, fetched 2026-11-06). The page names Team only as "Claude for Work"; the help-centre collection tying that name to the Team plan was seen in a search result only and is unverified. **Owner to confirm** that Team is Claude for Work, and to turn off Rate chats for support agents. This is consistent with the Code of Ethics line that the site sells no data.

**Which rate prices which hour, and why the old figure overstated labour.** The fixed hours are engineering work (maintenance, incident response, the Washington excise filing), priced at the BLS Washington developer median of $80.07 an hour. The variable hours are customer-service work (support, disputes, privacy requests, abuse reports), priced at the support wage below. The earlier version priced every hour at the single $122.50 contractor rate. That is an engineering rate; applied to support work it overstated labour, and together with the median contact rate it produced a $3.87 a seat finding that is withdrawn. The low contact-rate row is the primary case and the median the stress case.

**The support wage: $41.47 an hour, derived.** Owner decisions, 2026-11-06: "Do the average between the top 3. We will scale wage based on location." and "provide benefits but adjust the wage to living without them paying it themselves." The three rows are from the MIT Living Wage Calculator (page updated 2026-02-15, fetched 2026-11-06): Washington, 1 adult and 1 child, $48.00 an hour [36]; King County, 1 adult and 1 child, $56.43; King County, 1 adult and no children, $30.60 [37]. Their average is $45.01. Each row's budget includes a medical line the worker would pay themselves: $9,588, $9,477 and $3,032 a year, which on 2,080 hours is $4.61, $4.56 and $1.46 an hour, an average of $3.54. The site provides health cover as a benefit, so the wage is $45.01 − $3.54 = **$41.47**. MIT's medical line is an after-tax budget subtracted from a pre-tax wage, so this is a small understatement of the wage needed. Support staff are employees, not contractors. The BLS Washington customer-service median of $24.20 ($29.49 at the 75th percentile) stays as a "market rate" sensitivity, loaded in the model; it is not the base because the Code of Ethics sets a living wage as the floor for anyone the site pays.

**Loading a wage into an hourly cost.** Each wage × 2,080 hours is loaded with Lane D's employer payroll taxes and benefits, by the same rules Lane D applied to the $250,000 salary, and the base rate is the midpoint of the low and high loads. For the $41.47 wage ($86,255 a year): low load, taxes $7,664 (Social Security 6.2%, Medicare 1.45%, FUTA $42, Washington unemployment 1.0% and EAF 0.02% on $78,200, no employer PFML share, L&I at the class 5302 rate) plus benefits $12,002 (health $7,344 plus retirement 5.40% of wage) gives $105,921 ÷ 2,080 = **$50.92**. High load, taxes $11,888 (unemployment 6.0%, EAF 0.03%, employer PFML 1.13% × 28.57%, L&I at the class 4904 rate, the higher one) plus benefits $19,752 (22.90% of wage, BLS ECEC) gives $117,895 ÷ 2,080 = **$56.68**. The midpoint is **$53.80 an hour**. The benefits load includes health cover, and the wage already has the medical line taken out, so health cover is not counted twice. The same method on the engineering wage gives $94.56 to $107.20, base **$100.88**, and on the market-rate $24.20 gives $31.26 to $33.27, base $32.27. Engineering hours above one person's 160, if hired, would be loaded the same way; the fixed hours never reach 160, so none arise. The owner's own line keeps Lane J's structure.

- **Labour line (ii):** cash + fixed hours at the loaded $100.88 + variable hours at the loaded $53.80 + Claude Team seats.
- **Salary line (iii):** cash + structure C's monthly cost with Lane D's benefits ($22,524 a month with low benefits, $25,557 with high; **the recommended structure, pending an accountant**, see Salary Structures below) + hired help for every hour above 160 a month, bought at the loaded $53.80 (the variable hours are the ones that grow) + Claude Team seats. One full-time person is 160 hours a month. The all-salary figure (structure A) is $23,952 a month low and $26,986 high.
- **One-person ceiling:** the paying-seat count where the hours reach 160 a month: **22,241** (low row), **4,341** (median row), **893** (high row). The hourly rates do not change it; the AI factor does (19,453 / 3,819 / 793 at 1.00).
- **Variable labour per paying seat:** low row 6.08 h ÷ 1,000 × $53.80 = **$0.33 a month** ($0.20 at the loaded market rate); median row 26.6 h ÷ 1,000 × $53.80 = **$1.43** ($0.86 at the market rate). Net revenue per paying seat after fees at 10,000 seats is $1.76 to $3.31 (model (c) is lowest), so in the low row every model breaks even on labour at some size, and in the median row model (c) keeps only $0.33 a seat (see subscription-models.md). Fixed labour is $2,502 a month in the low row and $4,479 in the median row at the loaded $100.88 ($3,038 and $5,439 at the unloaded $122.50).
- **Primary case:** the low row. Kanka, Pinboard and Plausible fit only the low row, and it holds only if self-service help ships before billing (the Low-Support Scenario in subscription-models.md). The median is the stress case and is shown beside it everywhere.

Promised on-call alternative: $2,340 a month.

## Payment Processing and Taxes

These are rates, not costs: they scale with revenue and are subtracted in subscription-models.md.

| Option                                             | Fee                                                                                                       | Who is the seller                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1. Stripe Billing plus Stripe Tax, hosted Checkout | 2.9% + 30¢, plus 0.7% Billing, plus 0.5% Tax Basic by the no-code route (50¢ per charge by API) [30] [31] | The site (the owner)                          |
| 2. Stripe Managed Payments                         | 2.9% + 30¢, plus 0.7% Billing, plus 3.5%; tax is included in the 3.5% [30] [32]                           | Link, Stripe's service, as merchant of record |

A merchant of record is the company legally selling to the customer, which collects and pays the sales tax. Under option 1 the owner is the seller and **owes sales tax registration and filing** (Stripe Tax calculates the tax; it does not file it, and Tax Complete, which files, starts at $90 a month on a one-year contract [31]). Under option 2 Link collects and remits it. Other processors (Paddle, Lemon Squeezy, Polar) charge 5% + 50¢ and act as merchant of record [33]; they are covered in subscription-models.md.

**Washington taxes.** Retailing B&O is 0.471% of gross receipts [26], with a credit of up to $55 a month, which means no B&O is owed below about $11,677 of Washington revenue a month. State sales tax is 6.5%, and combined rates run from 7.6% to 10.7% depending on the location [27] [28]. Sales tax is passed through to the customer, so it is not a cost. **Whether a merchant of record's resale of software counts as a marketplace facilitator sale is unresolved**; an accountant must confirm.

## Salary Structures (Lane J)

Lane J (sources dated 2026-11-06) asked what the business must earn for the owner to keep the take-home of a $250,000 salary under four ways of paying oneself. The owner's goals (2026-11-06): "the cheapest tax option with the maximum benefits", "while maintaining what I would get at a $250k salary". A is all-salary. B and B* are an S corporation paying a wage of $184,500 or $190,000 with the rest as distributions. C is a single-member LLC taxed as a sole proprietor, with no S election. The take-home held equal is A's: $180,243 after all tax, single filer.

**What each earlier figure includes.** Lane D's $286,977 is $250,000 wage + employer payroll taxes, unemployment insurance, the Employment Administration Fund and workers' compensation lines + Lane D's low benefits ($20,848). Lane J's $266,575 for A is $250,000 wage + employer taxes ($15,106) + $1,469 of payroll and return-preparation admin, and **no benefits**. Add the same low benefits and Lane J's A is $287,423. That differs from Lane D's $286,977 by $446: Lane D's unemployment insurance, Employment Administration Fund and L&I lines (+$1,024) which Lane J sets to zero (a 100% owner-officer cannot draw unemployment, and officers are exempt from L&I by default), less Lane J's admin ($1,469) which Lane D does not carry. So the two agree once the benefits and these two lines are lined up; nothing is double counted.

**Like for like.** Every row below adds the same Lane D benefits, because health and retirement cost the same in every structure: $20,848 (method A, low) to $57,251 (method B, high).

| Structure                                                                    | Business earnings a year | a month | Saving against A | Loaded a year, low benefits | Loaded a year, high benefits |
| ---------------------------------------------------------------------------- | -----------------------: | ------: | ---------------: | --------------------------: | ---------------------------: |
| A all-salary ($250,000 wage)                                                 |                 $266,575 | $22,215 |               $0 |                    $287,423 |                     $323,826 |
| B S corporation ($184,500 wage, distributions)                               |                 $257,599 | $21,467 |           $8,976 |                    $278,447 |                     $314,850 |
| B* S corporation ($190,000 wage, distributions)                              |                 $258,302 | $21,525 |           $8,273 |                    $279,150 |                     $315,553 |
| C sole proprietor or single-member LLC (recommended, pending the accountant) |                 $249,434 | $20,786 |          $17,141 |                    $270,282 |                     $306,685 |

What each structure gives up against A: B and B* keep every benefit, and carry a reasonable-compensation audit risk. C keeps the Social Security record and Medicare, makes Paid Family and Medical Leave opt-in (employee share only, three-year minimum), loses unemployment cover (a 100% owner could not draw it in A either), keeps WA Cares only if the owner first self-employed within three years, and has retirement room of about $71,400 against $72,000 (about $600 less). C wins because Social Security is capped at the same $184,500 in every structure, so an S corporation saves only Medicare on the distribution, while a sole proprietor's whole profit counts for the qualified business income (QBI) deduction.

**The model's recommendation is C, pending the accountant.** If the accountant rules C out, B* at a $190,000 wage is second. The result rests on secondary sources for the QBI thresholds and on a single-filer assumption; filing jointly was not computed. If the business is a specified service trade or business (SSTB), B's saving falls to about $6,800 (derived) and C is unchanged. The checklist for the accountant is items 21 to 33 under "What the Repository Doesn't Say".

## Totals

All rows are dollars a month. Cash costs are the Platform total plus Claude Ultra. The labour rows use the low and median cases of the Labour section, so they grow with paying seats. The full-time rows are structure C (the recommended structure, pending the accountant) with Lane D's benefits, $270,282 a year (low) or $306,685 (high), divided by 12, plus hired help for hours above 160 a month. The sensitivity row is all-salary (A) with low benefits, $287,423 a year. The on-call row is a separate best-effort-versus-promised comparison.

**Low contact-rate row (primary):**

| Row                                                                                  |     100 |    1000 |   10000 |  100000 |
| ------------------------------------------------------------------------------------ | ------: | ------: | ------: | ------: |
| Cash costs                                                                           |    $243 |    $284 |    $325 |  $1,174 |
| Labour hours a month                                                                 |    25.4 |    30.9 |    85.6 |   632.7 |
| Claude Team seats for support agents (inside every labour row below)                 |       0 |       0 |       0 |       3 |
| Labour alone (loaded $100.88 engineering, $53.80 support)                            |  $2,535 |  $2,829 |  $5,772 | $35,283 |
| Cash + labour at base rates                                                          |  $2,777 |  $3,113 |  $6,098 | $36,457 |
| Cash + labour at the loaded BLS market support rate ($32.27)                         |  $2,764 |  $2,982 |  $4,789 | $23,367 |
| Cash + labour with contractor engineering ($122.50)                                  |  $3,313 |  $3,649 |  $6,634 | $36,994 |
| Cash + structure C job (recommended, pending accountant; low benefits) + hired hours | $22,766 | $22,807 | $22,849 | $49,205 |
| Cash + structure C job (high benefits) + hired hours                                 | $25,800 | $25,841 | $25,882 | $52,239 |
| Sensitivity: cash + all-salary job (A; low benefits) + hired hours                   | $24,195 | $24,236 | $24,277 | $50,634 |
| Cash + labour + promised on-call                                                     |  $5,117 |  $5,453 |  $8,438 | $38,797 |

**Median contact-rate row (stress case):**

| Row                                                                                  |     100 |    1000 |   10000 |   100000 |
| ------------------------------------------------------------------------------------ | ------: | ------: | ------: | -------: |
| Cash costs                                                                           |    $243 |    $284 |    $325 |   $1,174 |
| Labour hours a month                                                                 |    47.1 |    71.0 |   310.7 |   2707.4 |
| Claude Team seats for support agents (inside every labour row below)                 |       0 |       0 |       2 |       16 |
| Labour alone (loaded $100.88 engineering, $53.80 support)                            |  $4,622 |  $5,912 | $18,857 | $148,154 |
| Cash + labour at base rates                                                          |  $4,865 |  $6,196 | $19,182 | $149,328 |
| Cash + labour at the loaded BLS market support rate ($32.27)                         |  $4,808 |  $5,622 | $13,448 |  $91,984 |
| Cash + labour with contractor engineering ($122.50)                                  |  $5,825 |  $7,156 | $20,142 | $150,288 |
| Cash + structure C job (recommended, pending accountant; low benefits) + hired hours | $22,766 | $22,807 | $31,007 | $161,153 |
| Cash + structure C job (high benefits) + hired hours                                 | $25,800 | $25,841 | $34,040 | $164,187 |
| Sensitivity: cash + all-salary job (A; low benefits) + hired hours                   | $24,195 | $24,236 | $32,435 | $162,581 |
| Cash + labour + promised on-call                                                     |  $7,205 |  $8,536 | $21,522 | $151,668 |

Reading the table: **Claude Ultra is 82% of the cash cost at 100 paying seats.** Cash costs reach about $1,174 at 100,000 paying seats (against $552 before the overhead accounts were counted), because 473,333 accounts use the platform. Labour dwarfs cash at every size in both rows; in the low row at 1,000 paying seats it is about 10 times the cash costs.

## Enterprise Thresholds

No usage forces an enterprise plan at 100,000 paying seats. Features do.

- **Vercel:** Enterprise is forced only by features, not by usage [15]. Enterprise prices were not found.
- **Neon:** Scale at $0.222 per CU-hour covers the 99.95% uptime agreement [14]. Enterprise terms were not found [16].
- **Resend:** Scale tiers run to at least 2.5M mails a month at $1,150 [8]; above that is not listed.
- **GitHub:** Enterprise is $21 per user [11]; nothing forces it.
- **Claude:** No Ultra threshold applies; Max is $100 and Pro $20 [10].

## What the Repository Doesn't Say

**I need you to confirm or decide each of these.**

1. **Vercel edge-request allowance.** The pricing page says 10 million on Pro; the plan page says 1 million [1] [2]. The model uses 1 million (higher bills).
2. **Function invocations.** I measured 1 invocation per page load; [17] says 4 to 5. The model uses [17]'s 40 per session.
3. **Assumptions with no source** (**owner to confirm** each): monthly active share of accounts (25%), coven memberships per account (1.2), sessions per active account (8), edge requests per session (30), data out per session (1.5 MB), provisioned memory (2x the Active CPU time), mails per account per month (0.5), document mailings per year (2), workflow events from daily jobs (270 a month), the size of restore history and snapshots (each assumed the size of the data), spells and ingredients per coven (so database size), Neon average compute and hours awake, and the keeper-exemption schedule (5% / 3% / 1.5% / 0.5% of paying seats at 100 / 1,000 / 10,000 / 100,000).
4. **Neon compute-hours at each size** have no source; they are assumptions.
5. **Churn period.** Recurly's 3.6% has no stated period. The model uses ChartMogul's 6.1% monthly.
6. **Labour hours** (Lanes D and I) are derived from build hours, published ratios and support-contact benchmarks, not from this project's history. The support contact rate decides the one-person ceiling (**owner to confirm**, subscription-models.md question 18).
7. **Merchant of record treatment** of resold software for Washington B&O: not found, accountant to confirm.
8. **Accountant items:** unemployment and L&I cover for officers, S-corporation salary, Paid Family and Medical Leave opt-in, L&I risk class, and SB 6346 credit changes from 2029.
9. **Vercel's `.com` price, Vercel and Neon enterprise terms:** not found.
10. **Claude cloud review coverage:** not on the pricing page.
11. **GlitchTip hosted privacy terms, PagerDuty DPA, UptimeRobot heartbeats, the dependency-review action:** unverified (see Operations Stack).
12. **Bot Protection:** your decision (see Operations Stack).
13. **Document-mailing cap:** your decision (see Resend).
14. **Unverified figures I did not use:** Discord boost price, Sanctuary and World Anvil prices, FireHydrant's incident benchmark, the 51% Pagan Census figure.
15. **Overhead shares.** The demo-only share and the trial share come from benchmarks measured on mostly self-signup populations, not invite-gated sites. No source gives the split, a trial-length effect, customer-count growth (only revenue growth) or the share of accounts given away free (Lane G).
16. **Incident count against users:** not found (Lane I). **Owner to confirm.**
17. **Time to prepare a Washington excise tax return, and time per refund:** not found (Lane I). **Owner to confirm** with the accountant.
18. **Minutes per abuse report for a moderator, and solo-founder hours against users:** not found (Lane I). **Owner to confirm.**
19. **Curation ratio** (compendium edits per user): not found (Lane I). **Owner to confirm.**
20. **Not measured:** real Active CPU per render, and real spells and ingredients per coven.
21. **Accountant, salary structure (Lane J, item 1):** Is $184,500 or $190,000 reasonable compensation for this owner (developer plus manager), given BLS Washington pay ($166,540 median, $211,860 75th percentile; IT managers $209,370 median)? **Owner to confirm** with the accountant.
22. **Accountant, salary structure (Lane J, item 2):** Confirm the 2026 QBI threshold ($201,750 single) and $75,000 phase-in from Rev. Proc. 2025-32, and whether a SaaS business is a specified service trade or business (SSTB). **Owner to confirm** with the accountant.
23. **Accountant, salary structure (Lane J, item 3):** Confirm the C-versus-S result for the owner's real filing status and other income, and whether an S election still pays at all. **Owner to confirm** with the accountant.
24. **Accountant, salary structure (Lane J, item 4):** For a solo 401(k), is an S-corporation owner's "compensation" W-2 wages only, and is a sole proprietor's employer share effectively 20%? **Owner to confirm** with the accountant.
25. **Accountant, salary structure (Lane J, item 5):** Are the owner's health premiums and retirement contributions handled the same way in each structure, and how do they reduce QBI? **Owner to confirm** with the accountant.
26. **Accountant, salary structure (Lane J, item 6):** Form 2553 deadline and effective date; late-election relief. **Owner to confirm** with the accountant.
27. **Accountant, salary structure (Lane J, item 7):** Confirm a 100% owner-officer should not elect unemployment insurance coverage (exempt, and ineligible for benefits as a 10%+ owner). **Owner to confirm** with the accountant.
28. **Claude Team training terms.** Confirm Team = Claude for Work, and turn off Rate chats for support agents (see the AI heading in Labour).
29. **Accountant, salary structure (Lane J, item 8):** Confirm the L&I officer exemption and whether to elect it for injury cover. **Owner to confirm** with the accountant.
30. **Accountant, salary structure (Lane J, item 9):** PFML: officer reported as an employee in B; for C, the elective-coverage rate, base and three-year term. **Owner to confirm** with the accountant.
31. **Accountant, salary structure (Lane J, item 10):** WA Cares: whether the owner is inside the self-employed opt-in window under C. **Owner to confirm** with the accountant.
32. **Accountant, salary structure (Lane J, item 11):** Confirm B&O is unchanged by the structure. **Owner to confirm** with the accountant.
33. **Accountant, salary structure (Lane J, item 12):** Confirm distributions are not self-employment income, and that the Medicare premium income test is unaffected by the split. **Owner to confirm** with the accountant.
34. **Accountant, salary structure (Lane J, item 13):** Current payroll and return-preparation fees (the survey figures date from 2016-17). **Owner to confirm** with the accountant.

## How to Re-Run the Numbers

`node scripts/billing-model.mjs` prints every table above, from paying seats through overhead accounts to totals. Its constants are the Inputs tables. Change a value in the `I` object and run it again.

## Sources

All fetched 2026-11-06.

1. Vercel pricing: https://vercel.com/pricing
2. Vercel Pro plan: https://vercel.com/docs/plans/pro-plan
3. Vercel Hobby plan: https://vercel.com/docs/plans/hobby
4. Vercel Workflows pricing: https://vercel.com/docs/workflows/pricing
5. Vercel Observability Plus: https://vercel.com/docs/observability/observability-plus
6. Neon pricing: https://neon.com/pricing
7. Neon plans: https://neon.com/docs/introduction/plans
8. Resend pricing: https://resend.com/pricing
9. Porkbun `.com`: https://porkbun.com/tld/com
10. Claude pricing: https://claude.com/pricing
11. GitHub pricing: https://github.com/pricing and https://github.com/security/plans
12. GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
13. Runner pricing: https://docs.github.com/en/billing/reference/actions-runner-pricing
14. Neon SLA: https://neon.com/sla
15. Vercel Enterprise: https://vercel.com/enterprise
16. Neon Enterprise: https://neon.com/enterprise
17. DESIGN.md §4, capacity estimate (this repository, `claude-docs/DESIGN.md`)
18. Lane E measurements (this task's research notes)
19. GlitchTip pricing: https://glitchtip.com/pricing
20. UptimeRobot pricing: https://uptimerobot.com/pricing/
21. Vercel drains: https://vercel.com/docs/drains
22. Axiom pricing: https://axiom.co/pricing
23. PagerDuty pricing: https://www.pagerduty.com/pricing/incident-management/
24. Socket pricing: https://socket.dev/pricing
25. incident.io on-call: https://incident.io/blog/uncovering-the-mysteries-of-on-call
26. WA B&O classifications: https://dor.wa.gov/taxes-rates/business-occupation-tax/business-occupation-tax-classifications
27. WA digital products: https://dor.wa.gov/digitalproducts
28. WA local sales tax rates: https://dor.wa.gov/sites/default/files/2026-05/Q326_LSU-flyer-by-county.pdf
29. BLS employer costs: https://www.bls.gov/news.release/ecec.nr0.htm and https://www.index.dev/blog/freelance-developer-rates
30. Stripe pricing: https://stripe.com/pricing
31. Stripe Tax pricing: https://stripe.com/tax/pricing
32. Stripe Managed Payments: https://docs.stripe.com/payments/managed-payments
33. Paddle pricing: https://www.paddle.com/pricing
34. ChartMogul churn: https://chartmogul.com/blog/good-customer-churn-rate/
35. ChartMogul conversion: https://chartmogul.com/reports/saas-conversion-report/
36. MIT Living Wage Calculator, Washington (page updated 2026-02-15, fetched 2026-11-06; 1 adult + 1 child $48.00 an hour, medical $9,588 a year): https://livingwage.mit.edu/states/53
37. MIT Living Wage Calculator, King County, Washington (page updated 2026-02-15, fetched 2026-11-06; 1 adult + 1 child $56.43, medical $9,477; 1 adult no children $30.60, medical $3,032): https://livingwage.mit.edu/counties/53033
38. AI assistance for support agents: Brynjolfsson, Li and Raymond, "Generative AI at Work", Quarterly Journal of Economics 2025 (resolutions per hour +15.2%, handle time −8.5%); Claude Team seat $25 a month, 2-seat minimum, and the Pro consumer-terms training default, as collected in Lane K (the research notes, 2026-11-06).
39. US Bureau of Labor Statistics, Occupational Employment and Wage Statistics, Washington, May 2025 (customer-service representatives $24.20 median, $29.49 75th percentile; software developers $80.07 median), fetched 2026-11-06: https://www.bls.gov/oes/
40. Anthropic privacy centre, "Is my data used for model training?" (updated 2026-08-18, fetched 2026-11-06): https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training

- [G1] Userpilot, "SaaS Product Metrics": https://userpilot.com/saas-product-metrics/
- [G2] Rachitsky and Timen, "What is a good activation rate": https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate
- [G3] Amplitude, "The 7% Retention Rule Explained": https://amplitude.com/blog/7-percent-retention-rule
- [G4] SaaS Capital, Research Brief 34: https://www.saas-capital.com/wp-content/uploads/2026/07/RB34WS1-2026-B2B-Benchmarking-Private-SaaS-Company-Growth-Rates.pdf
- [G5] ChartMogul, "What Is a Good SaaS Growth Rate?": https://chartmogul.com/blog/good-monthly-growth-rate/
- [G6] ChartMogul, "SaaS Growth Report 2023": https://chartmogul.com/reports/saas-growth-report/
- [G7] ChartMogul, "The SaaS Conversion Report": https://chartmogul.com/reports/saas-conversion-report/
- [G8] First Page Sage, trial conversion benchmarks: https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/
- [G9] Baremetrics, "Open Startups": https://baremetrics.com/blog/open-startups (search result only, not fetched)
- [G10] Discourse pricing: https://www.discourse.org/pricing
- [G11] Circle pricing: https://circle.so/pricing
- [G12] Mighty Networks pricing: https://www.mightynetworks.com/pricing
- [G13] Ghost, complimentary plans: https://ghost.org/help/complimentary-plans
- [G14] GitHub Copilot Pro free access: https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro

- [H1] Spend: https://vercel.com/docs/spend-management ; https://neon.com/docs/introduction/plans ; https://neon.com/docs/guides/consumption-limits ; https://resend.com/pricing (fetched 2026-11-06)
- [H2] Database health: https://neon.com/docs/introduction/monitoring-page ; https://neon.com/docs/extensions/pg_stat_statements ; https://pganalyze.com/pricing (fetched 2026-11-06)
- [H3] Deliverability: https://resend.com/docs/dashboard/webhooks/event-types ; https://resend.com/docs/dashboard/emails/email-suppressions ; https://dmarc.postmarkapp.com/ ; https://support.google.com/a/answer/9981691 (fetched 2026-11-06)
- [H4] Expiry and heartbeats: https://vercel.com/docs/domains/working-with-ssl ; https://vercel.com/docs/domains/renew-a-domain ; https://uptimerobot.com/pricing/ ; https://uptimerobot.com/pricing.md (fetched 2026-11-06)
- [H5] Payments: https://docs.stripe.com/radar/how-radar-works ; https://support.stripe.com/questions/updates-to-radar-pricing-(january-2027) ; https://docs.stripe.com/disputes/responding ; https://stripe.com/pricing ; https://docs.stripe.com/billing/revenue-recovery/smart-retries ; https://docs.stripe.com/radar/optimize-risk-factors (fetched 2026-11-06)
- [H6] Tracing: https://vercel.com/docs/tracing ; https://vercel.com/docs/tracing/configure-tracing ; https://vercel.com/docs/tracing/instrumentation (fetched 2026-11-06)
- [H7] Secrets and disclosure: https://vercel.com/docs/environment-variables/rotating-secrets ; https://better-auth.com/docs/1.6/reference/security ; https://neon.com/docs/manage/roles ; https://docs.stripe.com/keys ; https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability ; https://www.rfc-editor.org/rfc/rfc9116 (fetched 2026-11-06)
- [H8] Incident communication: https://uptimerobot.com/pricing/ ; https://www.atlassian.com/software/statuspage/pricing ; https://instatus.com/pricing ; https://response.pagerduty.com/ ; https://sre.google/sre-book/example-postmortem/ (fetched 2026-11-06)
