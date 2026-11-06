# Running Costs

**Status:** research, no decision made · **Date:** 2026-11-06 · **Task:** M17.1

This page prices what it costs to run Sorrel & Salt at 100, 1,000, 10,000 and 100,000 accounts, in US dollars a month. It does not choose a billing model; [subscription-models.md](subscription-models.md) does that comparison and uses these figures as its cost side.

**Nothing here needs you to act yet.** The last section lists what I could not confirm and what I need you to decide. Prices were fetched on 2026-11-06 and move; see the [README](README.md).

Every figure is labelled. `measured` was counted in this repository. `sourced` comes from a numbered source at the bottom. `derived` is calculated from named inputs. `assumption` is a guess, given with a range you can change. The totals are computed by `.reports/m17.1/compute.mjs` from the Inputs table, so changing an assumption changes every total (see "How to Re-Run the Numbers").

## Inputs

### Ratios

| Input                                  | Value                        | Label      | Source or range                                                                                          |
| -------------------------------------- | ---------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Members per coven                      | 5.5                          | sourced    | Tabletop groups average 5.5; family covens run 3 to 20+ (subscription-models.md, Lane C)                 |
| Coven memberships per account          | 1.2                          | assumption | Range 1.0 to 2.0. No comparable publishes groups per member                                              |
| Monthly active share of accounts       | 25%                          | assumption | Range 15% to 30%. Not found                                                                              |
| Sessions per active account per month  | 8                            | assumption | Range 4 to 16                                                                                            |
| Function invocations per session       | 40                           | derived    | 480,000 invocations ÷ 12,000 sessions, [17]                                                              |
| Active CPU per invocation              | 30 ms                        | sourced    | [17]                                                                                                     |
| Edge requests per session              | 30                           | assumption | Range 9 to 100                                                                                           |
| Data out per session                   | 1.5 MB                       | assumption | Range 0.5 to 5                                                                                           |
| Provisioned memory                     | 2 GB, 2x the Active CPU time | assumption | Range 1x to 5x                                                                                           |
| Mails per account per month            | 0.5                          | assumption | Range 0.25 to 1; the 18 mail templates are sign-in, invitation and support mails                         |
| Document mailings per year             | 2                            | assumption | The document-updated mail goes to every account each time                                                |
| Share of covens (or accounts) that pay | 4%                           | assumption | Freemium median 3% to 5% in six months, top quartile 8% to 12% [38]. High case 10%                       |
| Monthly churn of paying units          | 6.1%                         | sourced    | ChartMogul, average revenue per account under $25 [37]. Recurly gives 3.6% but does not state the period |

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

| Input                                           | Value                                                       | Label      | Source                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| Vercel Pro                                      | $20 a month, includes $20 of usage credit                   | sourced    | [2]                                                                               |
| Function invocations over the allowance         | $0.60 per million                                           | sourced    | [1]                                                                               |
| Active CPU                                      | $0.128 per hour                                             | sourced    | [1]                                                                               |
| Provisioned memory                              | $0.0106 per GB-hour                                         | sourced    | [1]                                                                               |
| Fast Data Transfer                              | 1 TB included, then $0.15 per GB                            | sourced    | [1]                                                                               |
| Edge requests                                   | $2 per million over the allowance (see open item 1)         | sourced    | [1]                                                                               |
| Vercel Workflows events                         | $20 per million; 3 events per step, 1 more per retry        | sourced    | [4]                                                                               |
| Workflow events from daily jobs                 | 270 a month                                                 | assumption | 3 jobs a day, 3 events each                                                       |
| Vercel Observability Plus                       | $1.20 per million events                                    | sourced    | [5]                                                                               |
| Neon Launch                                     | $0.106 per CU-hour                                          | sourced    | [6]                                                                               |
| Neon Scale                                      | $0.222 per CU-hour                                          | sourced    | [6]                                                                               |
| Neon average compute                            | 0.25 CU at 100 and 1,000; 0.5 CU at 10,000; 2 CU at 100,000 | assumption | Range half to double                                                              |
| Neon hours awake a month                        | 360, 540, 720, 720                                          | assumption | Autosuspend while idle                                                            |
| Resend                                          | Free 3,000 a month (100 a day); Pro 50K $20; Pro 100K $35   | sourced    | [8]                                                                               |
| Domain, `.com`                                  | $11.81 a year                                               | sourced    | [9] (Porkbun; Vercel's price not found)                                           |
| Claude Ultra                                    | $200 a month                                                | sourced    | [10]                                                                              |
| GitHub Free                                     | $0                                                          | sourced    | [11]                                                                              |
| Operations stack                                | $0.03 / $15.03 / $32.03 / $112.03                           | derived    | Lane B: error events, uptime, log drain and restore test (see "Operations Stack") |
| Maintenance hours a month (low / median / high) | 27.9 / 29.9 / 39.8                                          | derived    | Lane D, from 2,388 build hours                                                    |
| Incident hours a month (low / median / high)    | 2.4 / 19.5 / 36.6                                           | derived    | Lane D                                                                            |
| Contractor hourly rate                          | $95 / $122.50 / $150                                        | sourced    | [29] and Lane D's rate sources                                                    |
| Loaded-salary hourly rate                       | $137.97 / $147.81 / $157.65                                 | derived    | $286,977 to $327,922 a year ÷ 2,080 h, [29]                                       |
| Washington retailing B&O                        | 0.471%, less a credit of up to $55 a month                  | sourced    | [26]                                                                              |
| Stripe card fee                                 | 2.9% + 30¢; Billing 0.7%; Tax Basic 0.5%                    | sourced    | [30] [31]                                                                         |
| Managed Payments                                | +3.5% on top                                                | sourced    | [32]                                                                              |

B&O means business and occupation tax, Washington's tax on gross receipts rather than profit. CU-hour means one compute unit running for one hour (a compute unit is Neon's measure of CPU and memory).

## Scale Assumptions

| Quantity                                            |   100 |   1000 |   10000 |    100000 |
| --------------------------------------------------- | ----: | -----: | ------: | --------: |
| Covens                                              |    22 |    218 |   2,182 |    21,818 |
| Sessions a month                                    |   200 |  2,000 |  20,000 |   200,000 |
| Function invocations a month                        | 8,000 | 80,000 | 800,000 | 8,000,000 |
| Active CPU hours                                    |   0.1 |    0.7 |     6.7 |      66.7 |
| Provisioned memory GB-h                             |   0.3 |    2.7 |    26.7 |     266.7 |
| Data transfer GB                                    |     0 |      3 |      30 |       300 |
| Edge requests a month                               | 6,000 | 60,000 | 600,000 | 6,000,000 |
| Mails a month                                       |    67 |    667 |   6,667 |    66,667 |
| Workflow events a month                             |   470 |  2,270 |  20,270 |   200,270 |
| Database size (MB)                                  |  18.5 |   45.5 |   315.1 |   3,011.8 |
| Days to mail one document to everyone (at 60 a day) |     2 |     17 |     167 |     1,667 |

An account here is a person with a login. A coven is a workspace. Accounts become covens by dividing memberships by 5.5 members. Paying units are covens or accounts, depending on the model.

## Platform

### Vercel

Vercel hosts the site and runs its functions. **Hobby ($0) is a reference row only.** It forbids commercial use, and taking payment from visitors counts as commercial use [3], so it ends the day subscriptions start. It also caps usage at 1,000,000 invocations and 4 CPU-hours a month [17], which the model passes at about 10,000 accounts (800,000 invocations, 6.7 CPU-hours).

**Pro is $20 a month from 100 accounts.** It includes $20 of usage credit [2]. Every meter I priced stays under that credit up to 10,000 accounts, so the bill is the $20 plan fee. At 100,000 accounts metered usage reaches $30.17, so overage is $10.17. Extra deploying seats cost $20 each; viewer seats are free [2]. Vercel Workflows (the durable jobs that send mail) bill per event and are in the metered line.

Vercel Observability Plus (logs and metrics, on by default for new Pro teams since 3 April 2026 [5]) is priced separately in the table below.

### Neon

Neon hosts the Postgres database. **Launch ($0.106 per CU-hour) is the plan I model**: restore history is 7 days, set up by default at 1 day [7]. **Scale ($0.222) is shown as an alternative**: it keeps history for 30 days and carries a 99.95% uptime agreement [14], at about twice the compute price. Neon Launch has no IP allow-list (Scale only, and it needs the $100-a-month Static IPs add-on).

### Resend

Resend sends the mail. Free allows 3,000 mails a month and 100 a day; Pro 50K is $20; Pro 100K is $35; Scale tiers run from $90 for 100K to $650 for 1M [8].

**The document-mailing cap is a job-design problem, not a billing one.** The document-updated mail goes to every account, and the mailing job is limited to 60 mails a day. Mailing everyone takes ceil(accounts ÷ 60) days: **2 days at 100, 17 at 1,000, 167 at 10,000 and 1,667 at 100,000.** At 10,000 accounts a policy change would take about six months to reach everyone. I need you to decide whether that is acceptable or whether the job should mail in larger batches on a paid tier; that is a job-design question for you, not part of the subscription decision. Resend's price tier is set by monthly volume, not by this cap.

### Domain

A `.com` is $11.81 a year at Porkbun [9], or $0.98 a month. Vercel's `.com` price was not found; Cloudflare sells at cost but I found no figure.

| Line                                                |     100 |    1000 |   10000 |   100000 |
| --------------------------------------------------- | ------: | ------: | ------: | -------: |
| Vercel metered usage (before credit)                |   $0.03 |   $0.21 |   $2.02 |   $30.17 |
| Vercel Pro (plan + overage after the $20 credit)    |  $20.00 |  $20.00 |  $20.00 |   $30.17 |
| Vercel Observability Plus                           |   $0.02 |   $0.19 |   $1.90 |   $18.96 |
| Neon Launch (compute + storage, history, snapshots) |   $9.55 |  $14.34 |  $38.35 |  $154.44 |
| Neon Scale, same usage (alternative)                |  $19.99 |  $30.00 |  $80.11 |  $321.48 |
| Resend tier                                         |    Free |    Free | Pro 50K | Pro 100K |
| Resend                                              |   $0.00 |   $0.00 |  $20.00 |   $35.00 |
| Domain (.com, Porkbun)                              |   $0.98 |   $0.98 |   $0.98 |    $0.98 |
| Operations stack (Lane B)                           |   $0.03 |  $15.03 |  $32.03 |  $112.03 |
| Platform and operations total                       |  $30.58 |  $50.54 | $113.26 |  $351.57 |
| Claude Ultra                                        | $200.00 | $200.00 | $200.00 |  $200.00 |
| Cash costs                                          | $230.58 | $250.54 | $313.26 |  $551.57 |

## CI

GitHub Actions is **free while the repository is public** [12]. Lane E measured one full gate run at about 15.7 to 18.5 runner-minutes, and about 290 full runs a month, which is about 4,550 to 5,370 minutes plus about 28 for runs stopped early.

**If the repository went private**, the Free plan includes 2,000 minutes a month [12]. At Linux 2-core rates ($0.006 a minute [13]), the remaining 2,550 to 3,370 minutes cost about $15 to $20 a month. Private repositories would also lose the free code scanning: Secret Protection is $19 and Code Security $30 per active committer [11]. One committer: $49 a month. Going private is a real cost that I have not included in the totals, since the repository is public today.

## Development Tooling

Claude Ultra is **$200 a month** [10], 10x the usage of Pro, and it is the largest cash line at every size. GitHub is $0 [11]. Whether the pricing page includes cloud review coverage is not stated there; I could not confirm it, so the review tooling may need a different plan.

## Operations Stack

This covers error tracking, uptime checks, log storage and paging. Lane B assumed 5 error events and 1 MB of logs per account per month, 8 monitors, and 1 responder (2 from 10,000).

| Category                     | Recommended                                          |   100 |  1,000 | 10,000 | 100,000 |
| ---------------------------- | ---------------------------------------------------- | ----: | -----: | -----: | ------: |
| Error tracking               | GlitchTip hosted [19]                                |    $0 |    $15 |    $15 |     $50 |
| Uptime checks                | UptimeRobot [20]                                     |    $0 |     $0 |    $12 |     $12 |
| Logs                         | Vercel drain fee [21], stored in Axiom Personal [22] |    $0 |     $0 |     $5 |     $50 |
| On-call paging               | PagerDuty Free [23]                                  |    $0 |     $0 |     $0 |      $0 |
| Dependency and secret checks | GitHub built-ins and Socket Free [24]                |    $0 |     $0 |     $0 |      $0 |
| Restore test                 | a scheduled restore, Neon storage                    | $0.03 |  $0.03 |  $0.03 |   $0.03 |
| Total                        |                                                      | $0.03 | $15.03 | $32.03 | $112.03 |

Vercel Pro and Observability Plus are left out of this table because they are priced above. Alternatives: Sentry Team at $29 a month, Bugsink, and Better Stack on-call at $29 per responder on an annual plan.

**The built-ins-only floor** is Vercel Pro, Observability Plus and Neon Launch, which cost nothing extra. It has no outside uptime checks, no error grouping, no phone paging and no status page.

**Service level.** None of seven comparables publishes uptime or response times on self-serve plans. I therefore price on-call as **best effort in working hours**. If you want a promised response, the alternative is a paid on-call arrangement: Lane D's incident.io figure is $540 a week, **$2,340 a month** [25], shown as its own row in the totals.

**Open items for you:**

- GlitchTip uses the Sentry SDK with its client file deleted. That is to be proved in a proof of concept, and its hosted privacy terms were not found.
- Each adopted vendor must be added to the privacy policy's list of processors. PagerDuty's data processing agreement was not fetched.
- UptimeRobot heartbeat monitors are unconfirmed.
- The availability of GitHub's dependency-review action on public repositories is in conflict between two pages.
- **Bot Protection.** Vercel's Bot Protection challenge mode serves a JavaScript challenge to non-browser traffic. I need you to decide whether the Code of Ethics allows that. Log mode runs no script.

## Maintenance and Incident Response

Lane D estimated maintenance from 2,388 build hours at 27.9 / 29.9 / 39.8 hours a month, and incident hours at 2.4 / 19.5 / 36.6. Incident hours already include a 2-hour emergency share that maintenance also counts, so I subtract it once. Median: 29.9 + 19.5 − 2 = **47.4 hours**.

Two rates price the hours. The contractor rate is what an outside developer would charge ($95 / $122.50 / $150 an hour). The loaded-salary rate is what an employee costs the owner once payroll tax and benefits are added: $286,977 to $327,922 a year for a $250,000 salary, divided by 2,080 hours, gives $137.97 to $157.65 an hour. Each case pairs its hours with its rate.

| Case   | Hours |       At contractor rate |      At loaded-salary rate |
| ------ | ----: | -----------------------: | -------------------------: |
| low    |  28.3 |    $2,688 (28.3 h x $95) |  $3,905 (28.3 h x $137.97) |
| median |  47.4 | $5,807 (47.4 h x $122.5) |  $7,006 (47.4 h x $147.81) |
| high   |  74.4 |  $11,160 (74.4 h x $150) | $11,729 (74.4 h x $157.65) |

Full-time job: $23,915 a month (loaded low) to $27,327 (loaded high); promised on-call alternative $2,340 a month.

## Payment Processing and Taxes

These are rates, not costs: they scale with revenue and are subtracted in subscription-models.md.

| Option                                             | Fee                                                          | Who is the seller                             |
| -------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| 1. Stripe Billing plus Stripe Tax, hosted Checkout | 2.9% + 30¢, plus 0.7% Billing, plus 0.5% Tax Basic [30] [31] | The site (the owner)                          |
| 2. Stripe Managed Payments                         | Option 1 plus 3.5% [32]                                      | Link, Stripe's service, as merchant of record |

A merchant of record is the company legally selling to the customer, which collects and pays the sales tax. Under option 1 the owner is the seller and **owes sales tax registration and filing** (Stripe Tax calculates the tax; it does not file it, and Tax Complete, which files, starts at $90 a month on a one-year contract [31]). Under option 2 Link collects and remits it. Other processors (Paddle, Lemon Squeezy, Polar) charge 5% + 50¢ and act as merchant of record [33]; they are covered in subscription-models.md.

**Washington taxes.** Retailing B&O is 0.471% of gross receipts [26], with a credit of up to $55 a month, which means no B&O is owed below about $11,677 of Washington revenue a month. State sales tax is 6.5%, and combined rates run from 7.6% to 10.7% depending on the location [27] [28]. Sales tax is passed through to the customer, so it is not a cost. **Whether a merchant of record's resale of software counts as a marketplace facilitator sale is unresolved**; an accountant must confirm.

## Totals

All rows are dollars a month. Cash costs are the Platform total plus Claude Ultra. The labour rows add the median maintenance case (47.4 hours, above). The full-time row is a $250,000 salary with payroll tax and benefits ($286,977 a year loaded, low estimate, divided by 12), as the target if this became a full-time job. The on-call row is a separate best-effort-versus-promised comparison.

| Row                                                       |     100 |    1000 |   10000 |  100000 |
| --------------------------------------------------------- | ------: | ------: | ------: | ------: |
| Cash costs                                                |    $231 |    $251 |    $313 |    $552 |
| Cash + maintenance at contractor rate                     |  $6,037 |  $6,057 |  $6,120 |  $6,358 |
| Cash + maintenance at loaded-salary rate                  |  $7,237 |  $7,257 |  $7,319 |  $7,558 |
| Cash + full-time job (loaded $250k, low)                  | $24,145 | $24,165 | $24,228 | $24,466 |
| Cash + full-time job (loaded $250k, high)                 | $27,557 | $27,577 | $27,640 | $27,878 |
| Cash + median maintenance + promised on-call (contractor) |  $8,377 |  $8,397 |  $8,460 |  $8,698 |

Reading the table: **Claude Ultra is 87% of the cash cost at 100 accounts.** Cash costs reach about $552 at 100,000 accounts. Labour dwarfs cash at every size; the median maintenance hours cost about 23 times the cash costs at 1,000 accounts.

## Enterprise Thresholds

No usage forces an enterprise plan at 100,000 accounts. Features do.

- **Vercel:** Enterprise is forced only by features, not by usage [15]. Enterprise prices were not found.
- **Neon:** Scale at $0.222 per CU-hour covers the 99.95% uptime agreement [14]. Enterprise terms were not found [16].
- **Resend:** Scale tiers run to 1M mails a month at $650 [8]; above that is custom.
- **GitHub:** Enterprise is $21 per user [11]; nothing forces it.
- **Claude:** No Ultra threshold applies; Max is $100 and Pro $20 [10].

## What the Repository Doesn't Say

**I need you to confirm or decide each of these.**

1. **Vercel edge-request allowance.** The pricing page says 10 million on Pro; the plan page says 1 million [1] [2]. The model uses 1 million (higher bills).
2. **Function invocations.** I measured 1 invocation per page load; [17] says 4 to 5. The model uses [17]'s 40 per session.
3. **Assumptions with no source:** monthly active share, coven memberships per account, paying share, sessions per active account, spells and ingredients per coven (so database size), Neon average compute, mails per account per month.
4. **Neon compute-hours at each size** have no source; they are assumptions.
5. **Churn period.** Recurly's 3.6% has no stated period. The model uses ChartMogul's 6.1% monthly.
6. **Maintenance hours** (Lane D) are derived from build hours and published ratios, not from this project's history.
7. **Merchant of record treatment** of resold software for Washington B&O: not found, accountant to confirm.
8. **Accountant items:** unemployment and L&I cover for officers, S-corporation salary, Paid Family and Medical Leave opt-in, L&I risk class, and SB 6346 credit changes from 2029.
9. **Vercel's `.com` price, Vercel and Neon enterprise terms:** not found.
10. **Claude cloud review coverage:** not on the pricing page.
11. **GlitchTip hosted privacy terms, PagerDuty DPA, UptimeRobot heartbeats, the dependency-review action:** unverified (see Operations Stack).
12. **Bot Protection:** your decision (see Operations Stack).
13. **Document-mailing cap:** your decision (see Resend).
14. **Unverified figures I did not use:** Discord boost price, Sanctuary and World Anvil prices, FireHydrant's incident benchmark, the 51% Pagan Census figure.
15. **Not measured:** real Active CPU per render, and real spells and ingredients per coven.

## How to Re-Run the Numbers

`node .reports/m17.1/compute.mjs` prints every table above. Its constants are the Inputs table. The folder `.reports/` is ignored by git, so the script is not in the repository; copy it into the folder if you want to keep it. Change a value in the `I` object and run it again.

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
