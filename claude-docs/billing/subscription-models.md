# Subscription Models

**Status:** research, no decision made · **Date:** 2026-11-06 · **Task:** M17.1

**The owner withdrew the free tier on 2026-11-06.** The owner's decision: there is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The size steps below count **paying seats**; trial, curator, exempt and demo-only accounts are overhead derived from them ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

This page compares five ways to charge for Sorrel & Salt, prices each against the running costs in [running-costs.md](running-costs.md), and ends with the questions I need you to answer. It does not choose a model. **You need to act:** the last section lists what I need you to decide.

The five wants a subscription has to meet are DESIGN.md §13's. I call them **R1** to **R5** here:

- **R1.** The coven pays, through its steward.
- **R2.** The price scales with the number of members.
- **R3.** A new coven gets free months. Now a trial of one month as standard, settable per coven by a keeper, with no card required.
- **R4.** A keeper can make a coven free.
- **R5.** Someone who belongs to several covens pays less. **Owner definition, 2026-11-06:** "'$1 for a discounted seat' - only a person paying for a coven gets a discounted seat on other covens." So the discount is on the second coven's invoice, for a seat held by a person who is themselves the paying steward of another coven. A member who pays for no coven gets no discount.

A price in a model below is mine unless it names a comparable. I anchored each on the comparables, and the doc says so each time. Change them in `scripts/billing-model.mjs` and re-run it. Sources S1 to S52 are Lane C's, listed at the end with the others.

## Owner Decisions Recorded for the Design Record

For `claude-docs/design-decisions/m17.1-subscription-billing-scope.md` when it is written:

- **R5 (2026-11-06).** "'$1 for a discounted seat' - only a person paying for a coven gets a discounted seat on other covens." The discount is on the second coven's invoice, for a seat held by a paying steward of another coven. At 1.2 memberships per account and 5.5 members per coven that is 3.6% of seats (derived).
- **Viewers and solo covens (2026-11-06).** "Viewers don't get solo covens." In (g) only a paid practitioner or steward seat includes a free solo coven; an observer seat does not. Revenue is unchanged; the free-coven storage cost counts practitioner seats only (70% of paid seats under the 30% observer assumption).
- **Observers add a solo coven (2026-11-06).** "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99." The observer pays the solo price less $1 on their own subscription (person-level price on the Stripe side); take-up 20% (assumption). (g) then needs 125 paying seats on cash.
- **Observer price (2026-11-06).** "Also viewers should get a cheaper price point." The modelled price is $1 against $2 for a practitioner seat, with 30% of members observers; both numbers are my assumptions (question 17).

- **Flat seats (2026-11-06).** "Yes, add (h) beside (g)." Model (h) has no base fee: a practitioner seat includes a solo coven, an observer seat costs less and becomes a practitioner seat by paying the difference, a solo coven alone costs the same as a practitioner seat, and a paying steward gets 50% off practitioner seats in other covens.
- **Payer modes (2026-11-06).** "Model both modes now." Every coven-pays model that reaches the page ((c), (g), (h)) gains a per-coven switch between coven pays and each member pays. See "Payer Modes" below; the member-pays rule and the switching rule are mine and are owner questions 19 and 20.
- **Models rejected (2026-11-06).** "We're not going to do e - any member pays, remove it. We're not going to do d - solo run only by itself. We're not going to do a - coven pays, seat bundles." Each is a short entry under "Considered and Rejected"; (d)'s solo-coven price research stays because (g) and (h) use it.
- **Salary structure (Lane J, 2026-11-06).** The owner's goals: "the cheapest tax option with the maximum benefits", "while maintaining what I would get at a $250k salary". The salary line uses structure C (a single-member LLC taxed as a sole proprietor) at $249,434 a year of business earnings, plus Lane D's benefits; the model's recommendation, pending an accountant. The all-salary figure stays as a sensitivity row. See [running-costs.md](running-costs.md#salary-structures-lane-j) and owner question 21.
- **AI assistance for support agents is on by default (owner, 2026-11-06; Lane K).** The factor on minutes per support contact is 0.87 in the primary case (0.735 and 1.00 as sensitivities), from Brynjolfsson, Li and Raymond (QJE 2025): resolutions per hour up 15.2%, handle time down 8.5%. It deflects no contact. Agents use the Claude Team plan ($25 a seat a month, 2-seat minimum), never Pro, because the consumer terms train on inputs unless opted out and customer messages must not train a model (the Code of Ethics: the site sells no data). The Team plan's training terms and what is unconfirmed are under "Labour and the One-Person Ceiling".
- **Labour scales with paying seats (Lane I, sources dated 2026-11-06).** Hours a month = fixed hours + variable hours per 1,000 paying seats. The low contact-rate row is the primary case and the median is the stress case; both are shown everywhere. Support, dispute and privacy-request hours are priced at a living wage without health cover ($41.47 an hour, derived), loaded with employer payroll taxes and benefits to $53.80 an hour; engineering hours at the BLS Washington developer median ($80.07), loaded to $100.88. See "Labour and the One-Person Ceiling" under Break-Even.
- **No free tier (2026-11-06).** There is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The four departures from DESIGN.md §13 under "New Requirements Beyond DESIGN.md §13" follow from it.
- **Pricing as modelled is fair enough (2026-11-06).** After reviewing regional pricing, a self-requested hardship exemption and a stated wage gap, the owner decided: "pricing as modelled is fair enough". None of the three is modelled. No numbers change.
- **The living wage is a floor (2026-11-06).** "The living wage is a minimum. Not a maximum." The $250,000 salary target is above that floor by the owner's choice. A task, to be minted on Wave 21 by M17.1 (no id yet), will scope an executive pay maximum: a ratio of the highest to the lowest pay on the site, researched against published pay-ratio policies.

## How Each Model Meets R1 to R5

| Model                                | R1 coven pays                          | R2 scales with members | R3 free months                           | R4 keeper exemption | R5 pays less in several covens                                                    |
| ------------------------------------ | -------------------------------------- | ---------------------- | ---------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| (b) Each user pays                   | **dropped**                            | **altered**            | **altered**                              | **altered**         | kept                                                                              |
| (c) Base plus seats                  | kept                                   | kept                   | kept                                     | kept                | kept (as a seat discount, paying stewards only)                                   |
| (g) Group plan includes a solo coven | kept (over (c))                        | kept (over (c))        | kept                                     | kept                | kept (a member's solo coven is free)                                              |
| (h) Flat seats                       | kept (steward's bill is seats × price) | kept                   | kept                                     | kept                | kept (50% off for paying stewards; every practitioner seat has a free solo coven) |
| (f) Trial only + curator covens      | kept, as policy                        | not applicable         | **altered** (one month, keeper-settable) | **altered** (timed) | not applicable                                                                    |

**No comparable discounts a seat across groups.** Notion bills a person once per paid workspace they belong to, "even if the same people are in multiple workspaces" [S3]. GitHub bills each organisation separately [S7]. R5 therefore has no consumer precedent as a seat discount, and none restricts one to people who pay for another group. The nearest thing is Kanka, where one payment covers several campaigns and the price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7) [S19].

**The keeper exemption (R4)** is a flag on the coven in (c), (g) and (h). In (b) it must be a flag on the person, or an exemption that waives every member of a flagged coven. Nothing in the comparables does this; it is an internal rule. In Stripe it is a 100%-off coupon on the subscription, or no subscription at all.

## The Models

### (b) Each User Pays

**Structure.** A personal subscription unlocks every coven the person belongs to.

**Price points.** Obsidian Sync is $4 to $5 a month [S13], and every collaborator on a shared vault needs their own plan [S14]. Solo grimoire apps cost $1.58 to $3.33 a month on annual plans (derived, Lane C). Roll20 Plus is $5.99 [S21]. I model **$4.00 a month per person** (assumption).

**R1 to R5.** R1 **dropped**. R2 **altered**: cost scales by itself, since nobody is billed for a count. R3 **altered** to free months per person. R4 **altered**: an exemption per person, or one that waives every member of a flagged coven. R5 kept automatically, because one subscription covers every coven.

**Multi-coven discount.** Not needed; the model has no per-coven charge.

**Stripe objects.** Product, one Price, Subscription per person, Coupon, Customer Portal. Nothing links a subscription to a coven, so the service has to check the subscription when it checks membership.

**Reception.** For: Obsidian requires it [S14]; RevenueCat's median prices ($10 a month, $34.80 a year) are per person [S34]. Against: only 3% of Netflix subscriptions are used by several households that share the cost [S39], so a person paying while an observer rides free is unusual, and an observer who never writes pays the same as a steward. This model drops R1, so the site's principle that the coven is the paying unit goes.

### (c) Base Plus Seats

**Structure.** The steward pays a base that covers a minimum group; each member above it adds a seat.

**Price points.** Spotify moves from Duo ($18.99) to Family ($21.99) [S9]. Figma's cheap Collab seat ($3) sits beside full seats ($16) [S6], which maps onto observers: about a fifth of the full price. Slack bills only members active in the last 28 days [S1]. I model **$6 base covering 3 practitioners, plus $2 for each extra practitioner and $1 for each observer** (assumption: the owner said on 2026-11-06 that observers should get a cheaper price; $1 against $2 is a ratio of one half, kinder than Figma's about one fifth, and mine). Observers do not count toward the 3 in the base. The observer share of a coven is an assumption: 30% (range 15% to 50%; not researched). A seat held by a paying steward of another coven is 50% off.

**Deriving the discount's reach (derived).** Stewards are one per coven, so the share of accounts that are paying stewards is covens per account = 1.2 memberships ÷ 5.5 members per coven [S45] = **21.8%**. A seat is a second or later membership for (1.2 − 1) ÷ 1.2 = 16.7% of seats. I take the two as independent, so 16.7% × 21.8% = **3.6% of seats** are discounted, and the average seat is charged 1 − 3.6% × 50% = 0.9818 of its price. At 5.5 members that is 3.85 practitioners and 1.65 observers per coven, so $6 + ($2 × 0.85 extra practitioners + $1 × 1.65 observers) × 0.9818 = **$9.29 per coven**.

**R1 to R5.** All five kept. R5 is a seat discount on the second coven's invoice, for a seat held by a person who is the paying steward of another coven (the owner's answer, 2026-11-06, to what DESIGN.md §13 left open). A member who holds a seat elsewhere but pays for no coven pays the full seat price.

**Multi-coven discount.** Needs a Stripe coupon on the second coven's seat line, or a lower seat price. The discount follows the person across customers, which Stripe does not do by itself; the service has to compute it, and it applies only while that person is the paying steward of another active coven.

**Stripe objects.** Product, a base Price, a per-seat Price (quantity), Subscription with quantity, Coupon (up to 20 stacked, can be added after checkout), Customer Portal.

**Reception.** For: meets every want; the cheap-observer seat and active-only billing both have precedents [S6] [S1]. Against: Notion's practice is the opposite of R5 [S3], and per-seat pricing draws the complaints in "Per Seat Pricing Sucks" (a vendor's opinion, no data) [S5].

### (f) Trial Only Plus Curator Covens

**Structure.** Not a price. It is the free-things policy every model carries once the free tier is gone: a new coven gets a trial with no card (one month, longer if a keeper sets it), each site curator holds a free coven of 7 seats, a keeper may exempt a coven for a stated time, and the demo coven's observer seat and the public compendium stay free. Nothing else is free.

**Why it has no break-even row of its own.** It adds cost (trial, curator and exempt seats, plus the demo-only accounts) and no revenue, so it is already inside every other model's cost side ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

- **Trial conversion without a card** is 4% to 6% ("good") and 10% to 15% ("great") within six months; with a card it is 25% to 35% [G7]. The owner chose no card, so the model uses 10%. A trial with no card needs 76% to 89% of the paying seats again in trial seats, at a steady state.
- **Cutting a free tier later is costly** (Evernote 2023 [S35] [S36]; Slack 2022, a competitor's claim [S37]; Heroku [S38]). Starting with none avoids that cut.
- **Reception of no free tier.** I found no source that measures harm from having none. Retention after one year was "nearly identical" for hard-paywall and freemium apps [S34].
- **Curator coven precedent.** Community products include 2 to 15 staff seats in a plan [G10] to [G12]; none gives a seat count free by the platform to its own curators. Ghost lets a publisher comp any member for a week, a month, six months, a year or forever [G13]; GitHub re-checks free eligibility every month [G14]. The re-check is the nearest precedent for a timed exemption.

### (g) Group Plan Includes a Solo Coven

**Structure.** Owner request, 2026-11-06: "Group plan includes solo coven, a solo coven price should be found." Every paid practitioner or steward seat in a group coven also gives that member a free solo coven of their own. An observer seat does not (owner, 2026-11-06: "Viewers don't get solo covens."). A person with no paid group seat buys a solo coven alone. (g) is a layer over a group model; I model it over **(c)** (base plus seats), and it could sit over another group model in the same way.

**Solo coven price proposals** (all assumptions, anchored on the solo comparables in section "Solo and Personal Spaces"; Day One is $49.99 a year, about $4.17 a month [S16]):

- **$1.99 a month**, Neumoire's price [S29]. Lowest barrier to entry, but it earns the least and the cheapest comparable is not the one that is known to last.
- **$2.99 a month**, Bear's price [S15]. Matches the best-known solo journal at a price people already accept; this is the one I modelled.
- **$4.99 a month**, Grimoire's price [S28], close to Day One's $4.17 [S16]. Earns the most per solo buyer, and sits at the price where a solo coven costs more than a group seat's share ($2.03).

**Assumptions in the model.** A paying seat is either a group seat (priced as (c): $9.29 per coven, 1.2 memberships per account, 5.5 members per coven, so $2.03 per seat) or a solo coven bought alone. I assume 20% of paying seats buy a solo coven alone (range 10% to 40%; no source). Revenue per paying seat = 80% × $9.29 × 1.2 ÷ 5.5 + 20% × $2.99 = $1.621 + $0.598 = **$2.22**. Stripe's 30¢ fixed fee is charged per subscription: 0.8 × 1.2 ÷ 5.5 group subscriptions plus 0.2 solo subscriptions per paying seat.

**Observers add a solo coven by paying the difference (owner, 2026-11-06: "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99.").** An observer seat costs $1, so an observer adds a solo coven for the solo price less $1: **$1.99** a month at the modelled $2.99. If you pick $1.99 or $4.99 as the solo price, the difference is $0.99 or $3.99. The observer pays it themselves, as their own subscription, not on the coven's invoice, so Stripe needs a person-level price for it (the person is a customer of their own, separate from the coven's steward). Take-up is an assumption: **20% of observers add one** (range 5% to 40%; no source). Per paying seat that is 80% in group covens × 30% observers × 20% take-up = 0.048 add-ons × $1.99 = **$0.095**, which brings revenue per paying seat to $2.22 + $0.095 = **$2.31**. Each add-on is also one more subscription (30¢ fixed fee) and one more free-sized coven of storage.

**Cost of the free solo covens.** Each paid practitioner or steward seat (80% of paying seats, times the 70% that are not observers: 56%) holds one more coven (observers who add a solo coven add theirs: 0.048 per paying seat), of the average size the cost model already uses (about 115 KB of spells and ingredients each, from the running-costs ratios). The free covens add stored data and nothing else: sessions, and so function calls, mail and tracing, are counted per account and do not change. The extra Neon storage is $0.00 / $0.04 / $0.43 / $4.28 a month at 100 / 1,000 / 10,000 / 100,000 paying seats. It is added to every cost line for (g).

**What it shows.** The free solo covens cost almost nothing, so the model's result depends on the assumed 20% who buy a solo coven alone and on the solo price:

| Solo coven price | Revenue per paying seat | Net at 100 | Net at 1,000 | Net at 10,000 | Net at 100,000 | (i) |  (ii) |  (iii) |
| ---------------- | ----------------------: | ---------: | -----------: | ------------: | -------------: | --: | ----: | -----: |
| $1.99            |                 $2.0669 |       $174 |       $1,742 |       $17,386 |       $173,361 | 141 | 1,972 | 13,794 |
| $2.99            |                 $2.3149 |       $197 |       $1,966 |       $19,608 |       $195,584 | 125 | 1,703 | 11,950 |
| $4.99            |                 $2.8109 |       $241 |       $2,412 |       $24,052 |       $240,030 | 101 | 1,337 |  9,498 |

| Paying seats                     | 100   | 1,000 | 10,000 | 100,000 |
| -------------------------------- | ----- | ----- | ------ | ------- |
| Cost of free solo covens a month | $0.00 | $0.04 | $0.43  | $4.28   |

The columns (i), (ii) and (iii) are seats to break even on cash, on cash + all labour hours (support at the loaded $53.80, engineering at the loaded $100.88), and on cash + a full-time job with hired help. They are shown for the low contact-rate row (primary) only; the median row (stress case) needs more seats on (ii) and (iii) (see Break-Even).

### (h) Flat Seats

**Structure.** Owner choice, 2026-11-06: "Yes, add (h) beside (g)." There is no base fee. Four rules:

1. A **practitioner seat** includes a solo coven of the member's own.
2. An **observer seat** costs less, and becomes a practitioner seat by paying the difference.
3. A **solo coven alone** costs the same as a practitioner seat.
4. A member who pays for a coven gets **50% off** their practitioner seats in other covens (R5, the paying-steward rule).

The steward's bill is seats × price. I use the same overhead, the same 30% observer share, the same 20% who buy a solo coven alone and the same paying-steward share as (g). The 20% observer take-up now means "upgrades to a practitioner seat" (and so gets a solo coven). All five wants are kept.

**Two price pairs, both shown.**

| Pair              | Practitioner seat | Observer seat | Observer upgrade (difference) | Solo coven alone |
| ----------------- | ----------------: | ------------: | ----------------------------: | ---------------: |
| Illustrative      |             $3.00 |         $1.00 |                         $2.00 |            $3.00 |
| Calibrated to (g) |             $2.27 |         $1.00 |                         $1.27 |            $2.27 |

**The calibration arithmetic.** Per paying seat, 80% of seats sit in group covens and a coven has 1.2 ÷ 5.5 = 0.2182 of a coven per seat. A coven has 3.85 practitioners (with the 0.9818 paying-steward seat factor) and 1.65 observers, 20% of whom upgrade. Revenue per paying seat is therefore 0.8 × 0.2182 × [3.85 × 0.9818 × p + 1.65 × (0.8 × $1 + 0.2 × p)] + 0.2 × p = 0.9173 p + $0.2304. Setting it equal to (g)'s $2.3149 per paying seat gives p = (2.3149 − 0.2304) ÷ 0.9173 = **$2.2722, rounded to $2.27**, with observers held at $1. At $2.27 revenue per paying seat is $2.3129. If you instead want one group coven to pay what (c) charges ($9.29), p is **$1.94** (derived); that is lower because (h)'s per-coven bill also carries the observer upgrades. At the illustrative $3 / $1, a group coven pays $13.65 and a paying seat brings $2.98; at $2.27 / $1 a group coven pays $10.65.

**Worked example.** A coven of five: three practitioners and two observers, and one of the practitioners also pays for a coven elsewhere. At $3 / $1 the coven's bill is 2 × $3 + 1 × $1.50 + 2 × $1 = **$9.50**. If one observer upgrades, the bill is $11.50, and the upgrade gives that member a solo coven. In the other coven, the same member's practitioner seat is billed at $1.50 and not $3. At $2.27 / $1 the same coven pays $7.68, or $8.95 with the upgrade.

**Costs.** Subscriptions: one per paying group coven and one per solo-alone buyer; an upgrade rides on the steward's invoice, so it adds no subscription. Stripe's 30¢ fixed fee is charged on those. Free solo covens cost Neon storage only, counted as in (g).

**Reception.** Per-seat pricing with a cheaper view-only seat is the common pattern: Figma's Collab seat is $3 beside a $16 full seat [S6]. Notion bills a person once per paid workspace [S3], so a 50% discount for paying stewards has no consumer precedent (see the R5 note above). The solo coven price anchors are Bear $2.99 [S15], Neumoire $1.99 [S29] and Grimoire $4.99 [S28], as in (g).

**Break-even (cash).** $3 / $1: **95** paying seats; $2.27 / $1: **124** (rows in the tables under Break-Even).

### Considered and Rejected

The owner rejected three models on 2026-11-06. Their research stays here so it is not redone.

**(a) Coven pays, seat bundles.** Owner decision, 2026-11-06: "We're not going to do a - coven pays, seat bundles." The steward bought a bundle covering a fixed number of members (1, up to 5, up to 13, unlimited), and a coven crossing a bundle edge moved up a step. Basecamp charges $29 for 5 users, $79 for 10 and $99 for 15, "no per-user fees" [S4]. Household bundles cost $5.99 to $27.95 for 5 to 6 people and take 70% to 78% off the per-head price [S9] [S10] [S11] [S12]. Kanka charges $9.99 for 3 campaign slots [S19], and its price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7). D&D Beyond's $5.99 for 12 people [S18] was the floor. The modelled step prices were my assumptions ($2.99 / $7.99 / $11.99 / $16.99 for 1, up to 5, up to 13 and unlimited), with an assumed spread of 6% / 50% / 42% / 2% of covens and a $9.55 average per coven. It needed 135 paying seats to break even on cash. Against it: a coven at a bundle edge pays a step, Flipper reports no results from its move to bundles [S5], and bundles count members regardless of role, so there is no cheaper observer price.

**(d) Solo rung only.** Owner decision, 2026-11-06: "We're not going to do d - solo run only by itself." It was a one-member coven at a low price, sitting inside (a), (b) or (c) as the smallest step; I modelled $2.50 a month (assumption), which needed 124 paying seats on cash. **The solo-coven price research stays in use**, because (g) and (h) price a solo coven from it: Bear $2.99 a month [S15]; Day One $49.99 a year [S16]; Grimoire $4.99 a month [S28]; Neumoire $1.99 a month [S29]. Notion, Kanka and Obsidian are free for one person [S2] [S19] [S13]. Demand: most practitioners are solitary: 79% in 2010 [S49], the "dominant group" [S50], and "the majority … have abandoned … practicing in groups" [S51]. Every witchcraft app I found except Witchy Coven is built for one person [S31]. Against: the 79% figure is from 2010, and neo-paganism.org attributes it to "a Pagan census" without a link I could check.

**(e) Any member pays.** Owner decision, 2026-11-06: "We're not going to do e - any member pays, remove it." Any member could buy a subscription covering a coven, and one subscription could cover several covens, with tiers by coven count. Kanka sells 1, 3 and 7 campaigns for $4.99, $9.99 and $24.99 [S19]; D&D Beyond's $5.99 Master plan shares with up to 12 people, and the subscriber need not be the DM [S18]; any Discord member may boost a server [S8]. I modelled $5.64 a month per covered coven (derived: 87% of Kanka payers at $4.99 and 13% at $9.99, [S20] and [S19]), which needed 238 paying seats on cash. It altered R1 (any member, not only the steward, may pay) and dropped or altered R2. Kanka's survey found 99% saying merged boosts simplified the system [S20]; I found no data on how often a non-owner pays. The owner's separate "each member pays" payer mode (below) is a different thing and stays.

## Fair Pricing

The test is the Code of Ethics (`documents/code-of-ethics.md`, line 34): "It will charge, fairly: enough to cover its costs and to pay the people who work on it a fair, living wage." The model keeps these things that meet it:

- Observers pay less than practitioners ($1 against $2 in (c), (g) and (h)).
- A solo practitioner pays for one seat.
- A member who pays for a coven pays half for a seat in another coven (R5).
- A new coven gets a one-month trial with no card.
- Each site curator holds a free coven.
- Keeper exemptions carry an end date.
- Prices are anchored on hobby and household comparables, not on business tools.

**Decision (2026-11-06).** The owner reviewed regional pricing, a self-requested hardship exemption and a stated wage gap, and decided: "pricing as modelled is fair enough". None of the three is modelled. No numbers change.

**The living wage is a floor.** Owner correction, 2026-11-06: "The living wage is a minimum. Not a maximum." The Code's living wage is a minimum, not a limit on pay. The $250,000 salary target is above that floor by the owner's choice. A task, to be minted on Wave 21 by M17.1 (no id yet), will scope an executive pay maximum: a ratio of the highest to the lowest pay on the site, researched against published pay-ratio policies. The owner's words: "we should probably add a task to scope executive maximum percentages to ensure more equity."

**The living wage is the wage floor for anyone the site pays, and the site provides benefits.** Owner decision, 2026-11-06: support, dispute and privacy-request hours are priced at a living wage. The owner's words: "Do the average between the top 3. We will scale wage based on location." and "provide benefits but adjust the wage to living without them paying it themselves." The basis is the average of three MIT Living Wage Calculator rows (page updated 2026-02-15, fetched 2026-11-06): Washington, 1 adult and 1 child, $48.00 an hour (https://livingwage.mit.edu/states/53); King County, 1 adult and 1 child, $56.43; King County, 1 adult and no children, $30.60 (both https://livingwage.mit.edu/counties/53033). The average is (48.00 + 56.43 + 30.60) ÷ 3 = $45.01 an hour, derived. Each row's budget includes a medical line the worker would pay for themselves: $9,588, $9,477 and $3,032 a year, which is $4.61, $4.56 and $1.46 an hour on 2,080 hours, an average of $3.54. The site pays the health cover as a benefit, so the wage is **$45.01 − $3.54 = $41.47 an hour**, derived. MIT's medical line is an after-tax budget subtracted from a pre-tax wage, a small understatement of the wage needed. The $41.47 is then loaded with the employer's payroll taxes and benefits (running-costs.md, "Labour"); that load includes health cover, so it is not counted twice. Pay scales with the worker's location, so $41.47 is the Washington figure used in the model, not a flat rate for every worker. The BLS Washington customer-service median of $24.20 an hour is kept only as a "market rate" sensitivity. It is not used as the base because the Code of Ethics sets a living wage as the minimum for anyone the site pays, and $24.20 is below every one of the three rows above. Support staff are treated as employees, not contractors. Engineering hours use the BLS Washington developer median of $80.07 an hour, loaded the same way, which is above all three rows.

### Payer Modes

Owner decision, 2026-11-06: "Model both modes now." Every coven-pays model that reaches the page, (c), (g) and (h), gains a per-coven switch. A steward sets it for the coven.

- **Coven pays.** The steward is billed for every seat and holds the R5 discount for seats in other covens.
- **Each member pays.** Every member subscribes to their own seat at the same seat prices. R5 does not apply (the discount belongs to a paying steward's invoice).

**Revenue is held equal.** Revenue per coven is the same under both modes in the tables. Take-up differs and no source says which converts better, so I did not guess. One cost does differ and is not in the tables: Stripe's 30¢ fixed fee is charged per subscription, so member-pays pays it for each member and not once per coven. Per paying seat that is 30¢ × (1 − 1.2 ÷ 5.5) = about **$0.23** more a month (derived), against revenue of $1.8 to $3.3 a seat. I recommend you treat member-pays as costing about that much more in fees.

**The member-pays rule (modelled; owner question 19).** A member who stops paying keeps an unpaid seat, which is read-only until they pay again. Their spells and ingredients stay; nothing is deleted.

**The switching rule (modelled; owner question 20).** A change of mode cancels one set of subscriptions and starts the other at the next renewal. There is no mid-period switch, so no proration and no double charge.

**Invitation wording.** In member-pays mode an invitation must say "to join you must subscribe", and the invited person must be told the seat price before accepting. In coven-pays mode the invitation says nothing about payment.

**What this adds to the Wave 21 test plan.** Entitlement paths, webhook cases and stories roughly double: each runs once for coven pays and once for member pays, plus the switching case (cancel at renewal, start at renewal) and the unpaid read-only seat. Allow for that in the estimate.

### New Requirements Beyond DESIGN.md §13

The no-free-tier decision departs from §13 in four places. **I need you to accept each before a task is minted.**

1. **A per-coven trial length that a keeper can set.** Standard one month; longer for promotions and beta testers.
2. **A curator's free coven of 7 seats**, the curator included, one curator per 1,000 paying seats and at least 2.
3. **Timed exemptions.** A keeper's exemption has an end date. "Permanent" is the exception: it needs confirmation, is listed on the keeper billing page, and can be revoked.
4. **The demo coven's observer seat stays free** (already in §5; recorded here so billing never charges it).

## Solo and Personal Spaces

**Demand.** See "Considered and Rejected", (d): most practitioners practise alone [S49] [S50] [S51].

**What comparables do.** Notion gives a single-member workspace with no block limit [S2]. Figma has free Drafts [S6]. GitHub has a free personal account beside organisations [S7]. Obsidian is a free local vault [S13]. Kanka and Basecamp have no personal type: a solo user is a group of one [S19] [S4]. Slack has no personal space [S1].

**What reintroducing a personal `kind` would change.** CLAUDE.md says there are no personal workspaces: no `kind` column, every coven can take members and be deleted by a steward. Under the current rule, a solo user is a coven of one, which is how Kanka and Basecamp work. Adding a `kind` would let a personal space be free and undeletable, and would let it not take members. It would also add a `kind` check to every membership rule, the invitation service and the demo coven's deletion rule. **This is a change you would have to accept; I have made none.** I recommend no `kind`: a solo coven in (g) or (h), as a coven of one, gives the same price point without a schema change.

## Processors

### Lane F's Summary

**Rank 1: Stripe Billing plus Stripe Tax with hosted Checkout, the site as merchant.** **Rank 2: Stripe Managed Payments, where Link, Stripe's service, is the merchant of record.** A merchant of record is the company legally selling to the customer: it collects and pays the sales tax. Hosted Checkout loads no Stripe.js on the site, which keeps the site within its Code of Ethics and Privacy Policy [S-js] [S-checkout].

| Route                                             | Cost on a $10 monthly seat, US card |
| ------------------------------------------------- | ----------------------------------- |
| Stripe Billing + Tax Basic by API                 | $1.16 (11.6%)                       |
| Stripe Billing + Tax Basic, no-code               | 71¢ (7.1%)                          |
| Stripe Managed Payments                           | $1.01 (10.1%)                       |
| Paddle, Lemon Squeezy or Polar Starter (5% + 50¢) | $1.00 (10%)                         |
| Creem (3.9% + 40¢)                                | 79¢ (7.9%)                          |

Stripe Tax Basic does not register or file anything [S-tax]; with it the owner registers and files in Washington and wherever else a threshold is crossed.

**Managed Payments limits.** Subscriptions only through Checkout; no invoice items; statements read "Sold through Link"; Stripe may refund within 60 days; products must be digital and fully automated; an eligibility review applies [S-mp] [S-mp-elig].

### Restricted-Business Quotes

The site sells a grimoire and a compendium that includes zodiac and deity vocabularies. Each vendor's list, quoted:

- **Stripe:** "Psychic services and fortune tellers", under jurisdiction-specific bans for Japan, Mexico and Thailand only. Nothing on astrology, the occult or spiritual services [S-rb].
- **Paddle** (item 14): "Digital services associated with pseudo-science, including but not limited to clairvoyance, horoscopes, fortune-telling" [P-aup].
- **Polar** (item 31, prohibited): the same wording; "Spiritual & Astrology services" are under closer review [PO-aup].
- **Creem:** "Metaphysical, fortune-telling, and spiritual outcome services" [C-proh].
- **Dodo** (item 15): "Religious or spiritual product or services…"; "Spiritual & Astrology services" need review ("Entertainment only; no claims or predictions") [D-proh].
- **Lemon Squeezy:** "Services of any kind", and any product its payment partners restrict [LS-proh].

Stripe has the narrowest list. Whether a spell journal falls under any of these lines is a judgement the vendor makes; I could not resolve it.

### Testing the Integration

`stripe-mock` is Stripe's local fake API. It is stateless: it checks requests against the API spec and returns fixed replies, and it sends no webhooks [S-mock]. It cannot test subscription renewals. I recommend a scheduled run against Stripe's real test mode using test clocks, which move a test subscription through time [S-clocks]. Webhooks are not delivered in order, so the handler has to dedupe on the event id [S-wh].

### Better Auth Plugin Note

`@better-auth/stripe` lists peer dependency ranges newer than the versions of `stripe` and `better-auth` the repository pins, so using the plugin means a bump [BA-stripe]. DESIGN.md §13 names the plugin's two structural costs: its tables sit outside `withAudit`, and its routes sit outside `/api/graphql`. The alternative is a thin service over the Stripe SDK with audited tables of its own; the spike is meant to settle it.

## Break-Even

**Method.** Sizes are paying seats: 100, 1,000, 10,000 and 100,000. Revenue = paying units × price × (1 − 6.1%), the single-month churn haircut, a crude stand-in for steady-state churn. Paying units are paying seats for (b), (g) and (h) (whose per-seat revenue is built in their sections), and paying covens (seats × 1.2 memberships ÷ 5.5 members) for (c). Fees are Stripe's option 1 (2.9% + 30¢, 0.7% Billing, 0.5% Tax Basic) on that revenue, and Washington retailing B&O of 0.471% less the $55 a month credit. Sales tax is passed through to the customer, so it is neither revenue nor cost. Trial, curator, exempt and demo-only accounts earn nothing and are in the cost side. The cost lines come from running-costs.md: (i) cash, (ii) cash + all labour hours, with fixed (engineering) hours at the BLS Washington developer median of $80.07, loaded to $100.88, and variable (customer-service) hours at the $41.47 living wage without health cover, loaded to $53.80, (iii) cash + the owner's job as salary structure C (the recommended structure, pending the accountant) with Lane D's benefits, $270,282 a year (low) or $306,685 (high), plus hired hours at the loaded $53.80 for every hour above 160 a month. Support agents use AI assistance (on by default, factor 0.87 on support minutes), and each agent beyond the owner has a Claude Team seat at $25 a month; those seats are inside every labour line. Labour hours grow with paying seats (below), and every labour result is shown for the low contact-rate row (the primary case) and the median row (the stress case). **Net revenue a month**, after churn, fees and B&O:

| Model                                           | Price per paying unit |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | --------------------: | ---: | -----: | ------: | -------: |
| (b) Each user pays                              |                 $4.00 | $332 | $3,320 | $33,081 | $330,316 |
| (c) Base plus seats                             |                 $9.29 | $176 | $1,764 | $17,601 | $175,518 |
| (g) Group plan includes a solo coven (over (c)) |                 $2.31 | $197 | $1,966 | $19,608 | $195,584 |
| (h) Flat seats, $3 / $1 (illustrative)          |                 $2.98 | $258 | $2,580 | $25,726 | $256,763 |
| (h) Flat seats, $2.27 / $1 (calibrated to (g))  |                 $2.31 | $198 | $1,977 | $19,725 | $196,754 |

#### Option 2, Managed Payments

| Model                                           |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | ---: | -----: | ------: | -------: |
| (b) Each user pays                              | $321 | $3,208 | $31,954 | $319,048 |
| (c) Base plus seats                             | $171 | $1,707 | $17,030 | $169,809 |
| (g) Group plan includes a solo coven (over (c)) | $190 | $1,900 | $18,956 | $189,063 |
| (h) Flat seats, $3 / $1 (illustrative)          | $250 | $2,496 | $24,886 | $248,362 |
| (h) Flat seats, $2.27 / $1 (calibrated to (g))  | $191 | $1,912 | $19,073 | $190,239 |

**Y means net revenue covers the cost line**, for (i) / (ii) / (iii). Low contact-rate row (primary):

| Model                                           |   100 |  1000 | 10000 | 100000 |
| ----------------------------------------------- | ----: | ----: | ----: | -----: |
| (b) Each user pays                              | Y n n | Y Y n | Y Y Y |  Y Y Y |
| (c) Base plus seats                             | n n n | Y n n | Y Y n |  Y Y Y |
| (g) Group plan includes a solo coven (over (c)) | n n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $3 / $1 (illustrative)          | Y n n | Y n n | Y Y Y |  Y Y Y |
| (h) Flat seats, $2.27 / $1 (calibrated to (g))  | n n n | Y n n | Y Y n |  Y Y Y |

Median row (stress case):

| Model                                           |   100 |  1000 | 10000 | 100000 |
| ----------------------------------------------- | ----: | ----: | ----: | -----: |
| (b) Each user pays                              | Y n n | Y n n | Y Y Y |  Y Y Y |
| (c) Base plus seats                             | n n n | Y n n | Y n n |  Y Y Y |
| (g) Group plan includes a solo coven (over (c)) | n n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $3 / $1 (illustrative)          | Y n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $2.27 / $1 (calibrated to (g))  | n n n | Y n n | Y Y n |  Y Y Y |

**Seats needed to break even.** The smallest number of paying seats whose net revenue covers each cost line. The cost line is interpolated linearly between the four sizes (and continued on the last slope above 100,000), because overhead and usage grow with seats; the answer is therefore exact at the four sizes and approximate between them.

| Model                                           | (i) | (ii) low | (iii) low | (ii) median | (iii) median |
| ----------------------------------------------- | --: | -------: | --------: | ----------: | -----------: |
| (b) Each user pays                              |  74 |      930 |     6,898 |       2,532 |        9,133 |
| (c) Base plus seats                             | 139 |    1,943 |    13,590 |      15,123 |       53,446 |
| (g) Group plan includes a solo coven (over (c)) | 125 |    1,703 |    11,950 |       9,170 |       32,388 |
| (h) Flat seats, $3 / $1 (illustrative)          |  95 |    1,237 |     8,878 |       4,180 |       14,712 |
| (h) Flat seats, $2.27 / $1 (calibrated to (g))  | 124 |    1,691 |    11,867 |       8,965 |       31,661 |

**Labour and the One-Person Ceiling.** Hours a month = fixed hours + variable hours × (paying seats ÷ 1,000), where the fixed hours are 24.8 / 44.4 / 70.4 (low / median / high; all engineering work) and the variable hours per 1,000 seats, after the AI factor of 0.87 on support minutes, are 6.08 / 26.6 / 100.3 (support, disputes, privacy requests and abuse reports; all customer-service work). Without AI assistance they would be 6.95 / 30.3 / 113.0. Disputes are 0.25 / 2.0 / 5.0 hours each. Hours are **25.4 / 30.9 / 85.6 / 632.7** at 100 / 1,000 / 10,000 / 100,000 paying seats in the low row, and **47.1 / 71.0 / 310.7 / 2,707.4** in the median row (high row: 80.4 / 170.7 / 1,073.5 / 10,100.9). Contacts are counted on 25% of all accounts, demo-only accounts included. That overstates the contacts of an invite-gated site, and is kept as the conservative choice.

**AI assistance for support agents (on by default).** The factor on minutes per support contact is 0.87 (median) in the primary case, with 0.735 (low) and 1.00 (high, no gain) as sensitivities. It rests on Brynjolfsson, Li and Raymond (QJE 2025): resolutions per hour up 15.2% on average, handle time down 8.5%, a large gain for the least experienced and almost none for the top fifth. The assistant helps an agent answer; it deflects no contact, so the factor changes minutes, not contact counts, and it applies to the support part of the variable hours only. Each support agent beyond the owner has a Claude Team seat at **$25 a month** (the plan has a 2-seat minimum, so the first agent costs $50), one agent per further 160 hours a month, rounded up. The seats are inside every labour line and are 0 / 0 / 0 / 3 in the low row and 0 / 0 / 2 / 16 in the median row at the four sizes. **Privacy condition:** agents use the Team plan, never Pro. The consumer terms (Pro) train a model on inputs unless a person opts out, and customer messages must not train a model; Anthropic's privacy centre states "By default, we will not use your inputs or outputs from our commercial products (e.g. Claude for Work, Anthropic API, Claude Gov, etc.) to train our models", with exceptions for thumbs-up/down feedback and data a user chooses to share, which a Team or Enterprise plan's Owner can disable through the Rate chats setting (https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training, updated 2026-08-18, fetched 2026-11-06). The page names Team only as "Claude for Work"; the help-centre collection tying that name to the Team plan was seen in a search result only and is unverified. **Owner to confirm** that Team is Claude for Work, and to turn off Rate chats for support agents. Using Team is consistent with the Code of Ethics line that the site sells no data. Sensitivity of the main results to the factor:

| Factor          | One-person ceiling (low / median / high row) | (b) cash + labour, low / median | (c) cash + labour, low / median | (g) cash + labour, low / median |
| --------------- | -------------------------------------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| 0.735           | 26,128 / 5,059 / 1,028                       | 915 / 2,285                     | 1,879 / 9,121                   | 1,653 / 6,564                   |
| **0.87 (used)** | **22,241 / 4,341 / 893**                     | **930 / 2,532**                 | **1,943 / 15,123**              | **1,703 / 9,170**               |
| 1.00            | 19,453 / 3,819 / 793                         | 945 / 2,827                     | 2,008 / 41,631                  | 1,753 / 14,906                  |

**What a labour hour costs.** Support hours cost a loaded **$53.80**: the $41.47 wage plus employer payroll taxes and benefits (low $50.92, high $56.68; the arithmetic is in running-costs.md). Engineering hours cost a loaded **$100.88** ($94.56 to $107.20) on the $80.07 developer wage. Variable labour is **$0.33 a paying seat a month in the low row** (6.08 h ÷ 1,000 × $53.80) and **$1.43 in the median row** (26.6 h ÷ 1,000 × $53.80); at the loaded BLS market rate ($32.27) they would be $0.20 and $0.86. Fixed labour is $2,502 a month in the low row and $4,479 in the median row (at Lane D's $122.50 contractor rate, unloaded: $3,038 and $5,439). Labour alone at 10,000 paying seats is $5,772 (low) or $18,857 (median); cash + labour is $6,098 (low) or $19,182 (median), against $4,789 and $13,448 at the market support rate and $6,634 and $20,142 with contractor engineering. Cash + the structure C job (low benefits) + hired hours is $22,849 (low) or $31,007 (median) at 10,000 seats, and $49,205 (low) or $161,153 (median) at 100,000. The earlier version of this document priced every hour at the $122.50 contractor rate and used the median contact rate, which gave $3.87 a paying seat and a finding that no model could break even on labour. That rate was an engineering rate applied to support work, and the finding is withdrawn.

**One-person ceiling.** At **22,241** paying seats in the low row (**4,341** median; **893** high) the work exceeds one person at 160 hours a month. It holds for every model, since hours depend on paying seats, and it does not depend on the hourly rates (it does depend on the AI factor, above). The salary line pays the structure C job plus hired hours above 160 at the loaded $53.80. Fixed engineering hours (at most 70.4) never reach 160 on their own, so the hired hours are the variable, customer-service ones.

What the tables say (the restricted discount and the observer price are in (c) and so in (g)): with no free tier and the withdrawn 4% share gone, every model covers cash costs by 74 to 139 paying seats ((h) at $3 / $1: 95). **In the low row every model also covers cash + labour**: (b) at 930 paying seats, (h) at $3 / $1 at 1,237, (h) at $2.27 / $1 at 1,691, (g) at 1,703 and (c) at 1,943. **In the median row** (b) needs 2,532 and (h) at $3 / $1 4,180, but (h) at $2.27 / $1 needs 8,965, (g) 9,170 and (c) 15,123, all beyond the one-person ceiling of 4,341 paying seats. The reason is the margin: net revenue per paying seat at 10,000 seats is $3.31 for (b), $1.76 for (c), $1.96 for (g), $2.57 for (h) at $3 / $1 and $1.97 at $2.27 / $1, and median variable labour of $1.43 a seat leaves (c) only $0.33. This is driven by the support contact rate (owner question 18), the number to check first. Model (g), over (c), needs 125 seats on cash. Model (b) needs the fewest seats because it counts people, not covens, and prices each at $4.00. The two owner decisions of 2026-11-06 (discount for paying stewards only, cheaper observer seats) lowered (c) from $10.58 to $9.29 per coven, which raised its cash break-even from 121 to 139 paying seats. These counts leave out the overhead's cost _growth_ beyond what the cost lines already include, and they take paying seats as given: how many people would pay is the thing no source answers for this site.

### Low-Support Scenario

The low row is the primary case. Kanka, Pinboard and Plausible fit only the low row, and it holds only if self-service help ships before billing opens. What the site has to do to earn it:

- **A self-service help centre in front of the contact form.** Lane I found knowledge-base deflection of 25 to 35% of tier-1 contacts (the Stealth Agents aggregator, attributed to Zendesk), a FAQ and video in front of the contact form for Pedometer++ (David Smith, Design Notes 30, 2023-03-06), and the same pattern at Kanka, Pinboard and Plausible.
- **Answers inside the app**, next to the screen they are about, so a question is answered before it becomes a contact.
- **Community help in the demo coven**, where practitioners answer each other's questions.
- **No support promise on trial and observer seats.** Contacts are counted on all active accounts; a promise attached to a seat that pays nothing adds contacts without revenue.
- **Annual billing**, which cuts disputes. Lane I's figures give roughly twelvefold fewer charges in a year, so roughly twelvefold fewer chances for a dispute (derived).

A Wave 21 support-reduction task will be minted by M17.1 to build these (no id yet). Until it ships, the median row is the safer planning figure.

### Prices That Clear Labour

The practitioner (or account) price at which net revenue covers labour at 10,000 paying seats. Observers are held at $1 and the solo prices scale in proportion. "Cash + labour" prices labour at the loaded $53.80 and $100.88; "cash + job" is the structure C job plus hired hours. The comparables range is **$1.58 to $5.99** (solo grimoire apps $1.58 to $3.33; Obsidian $4 to $5; Roll20 Plus $5.99). Wider references: Figma's collaborator seat at $3 against $16 for a full seat [S6], and the RevenueCat median of $10 [S34].

| Model                | Today | Cash + labour, low | Cash + labour, median | Cash + job, low | Cash + job, median |
| -------------------- | ----: | -----------------: | --------------------: | --------------: | -----------------: |
| (b) Each user pays   | $4.00 |      $0.99 (below) |        $2.45 (inside) |  $2.86 (inside) |     $3.77 (inside) |
| (c) Base plus seats  | $2.00 |      $0.47 (below) |        $2.21 (inside) |  $2.70 (inside) |     $3.79 (inside) |
| (g) Group plan, solo | $2.00 |      $0.55 (below) |        $1.95 (inside) |  $2.35 (inside) |     $3.22 (inside) |
| (h) Flat seats       | $3.00 |      $0.61 (below) |        $2.20 (inside) |  $2.65 (inside) |     $3.64 (inside) |

"Below" means the clearing price is under the lowest comparable ($1.58), so today's price already clears. For (c) and (g) the figure is the practitioner seat price and the base scales with it; for (g) the scale factors are 0.276 (low) and 0.977 (median). These use the AI factor of 0.87; at 0.735 the median-row cash + labour prices are $2.22, $1.94, $1.74 and $1.96, and at 1.00 they are $2.67, $2.47, $2.16 and $2.44. Every price that clears cash + labour or cash + job falls inside the comparables range, so none requires a price the market does not already charge. The 10,000-seat size is the model's assumption, not a forecast.

## Questions for the Owner

**I need you to answer each of these.** The recommendation of the research is beside each where a lane made one.

**Lane F's five:**

1. **Merchant or merchant of record?** The site as merchant (Stripe Billing + Tax, ranked first) means you register for and file sales tax. Managed Payments passes that to Link for a higher fee, and statements read "Sold through Link". Research recommendation: the site as merchant, with Managed Payments the fallback. Merchant-of-record treatment for Washington B&O is unresolved; an accountant must confirm.
2. **Link branding.** Are you willing to have "Sold through Link" on customers' statements? Only relevant to Managed Payments. No recommendation.
3. **Business form.** Sole proprietor or company? Vendors' requirements vary and several were not found. No recommendation.
4. **Content under review.** Are you willing to submit to a vendor review of the grimoire and compendium, given the restricted-business lines above? Research recommendation: Stripe, whose list is the narrowest.
5. **International customers.** Are they in scope? International cards add 1.5%, currency conversion 1%, and sales tax in other countries. No recommendation.

**The rest:**

6. **Which model?** I need you to choose one of (b), (c), (g) or (h); (a), (d) and (e) were rejected by you on 2026-11-06 (see "Considered and Rejected"). The research made no recommendation. Paying seats to break even on cash: (b) 74 (fewest, but drops R1); (c) 139 (meets all five wants); (g) over (c) 125 (assumes 20% buy a solo coven alone); (h) flat seats 95 at $3 / $1 and 124 at the calibrated $2.27 / $1 (meets all five wants). On cash + labour (low row) the counts are (b) 930, (c) 1,943, (g) 1,703, (h) 1,237 at $3 / $1 and 1,691 at $2.27 / $1; in the median row they are 2,532, 15,123, 9,170, 4,180 and 8,965 (see "Labour and the One-Person Ceiling"). I also need you to choose, for each coven, whether the default payer mode is coven pays or each member pays (questions 19 and 20).
7. **Keeper exemptions.** The model uses 5% / 3% / 1.5% / 0.5% of paying seats at 100 / 1,000 / 10,000 / 100,000 (your words, 2026-11-06: "5% of paying seats initially, falling as the site becomes established and its beta testers are staff rather than friends and family"). I need you to confirm or give the numbers. No benchmark exists.
8. **The pause rule.** When a site is paused (M15.52) or a coven is paused (M15.55), should the subscription be paused (Stripe `pause_collection`), keep running, or be extended by the paused time? No recommendation.
9. **Bot Protection.** Does the Code of Ethics allow Vercel's JavaScript-challenge mode? Log mode runs no script. No recommendation.
10. **The document-mailing cap.** Is it acceptable that mailing a document to everyone takes 852 days at 10,000 paying seats (51,093 accounts)? Not a billing question. No recommendation.
11. **The new requirements.** Do you accept the four departures from §13 under "New Requirements Beyond DESIGN.md §13"? Research recommendation: accept all four.
12. **Trial length.** One month standard, no card. Is one month right, and is no card right given the trial seats it creates (76% to 89% of paying seats)? You decided both on 2026-11-06; this records the cost.
13. **Hosted Checkout only.** Do you agree the site loads no Stripe.js on its own pages and sends buyers to Stripe's hosted Checkout? Research recommendation: yes. It keeps to the no-browser-script rule and gives up part of Stripe's fraud-model accuracy (Stripe says advanced risk factors improve it by 36%).
14. **security.txt.** Do you agree to widen CLAUDE.md rule 1's `/.well-known/*.json` exception to also cover `security.txt`? Research recommendation: yes. It is sessionless and carries no application data. A static file under `public/.well-known/` may avoid a route handler; that was not checked.
15. **Vercel pause on budget.** Is Vercel's "Pause Production Deployments" setting on? Research recommendation: off. A 503 page for every paying account is a worse outcome than a bill, and the budget still emails you at 50%, 75% and 100%.
16. **Solo coven price (model (g)).** I need you to choose one: $1.99 (Neumoire [S29]; lowest barrier, earns the least; (g) then needs 141 paying seats on cash), $2.99 (Bear [S15]; the one modelled; 125), or $4.99 (Grimoire [S28]; earns the most per solo buyer, nearer Day One's about $4.17 [S16]; 101). No recommendation: the result also rests on the assumed 20% who buy a solo coven alone, which no source informs.
17. **Observer price and share.** I need you to confirm or change two assumptions. Price: $1 for an observer seat against $2 for a practitioner seat beyond the 3 in the base (anchor: Figma's Collab seat at $3 beside a $16 full seat [S6]; at Figma's ratio it would be about $0.40). Share: 30% of a coven's members are observers (range 15% to 50%; I did not research it). Take-up: 20% of observers add a solo coven for the solo price less $1, on their own subscription (range 5% to 40%; no source). At 15% / 50% observers or 5% / 40% take-up the break-evens move; run `scripts/billing-model.mjs` with `observerShare` or `observerTakeUp` changed to see them. No recommendation beyond the labels.

18. **Support contact rate.** I need you to confirm or change it, because it decides the one-person ceiling. The median is 21.5 hours of support a month per 1,000 active accounts (range 5.1 to 75). The work passes one person at 22,241 paying seats in the low row, 4,341 in the median row and 893 in the high row, with AI assistance for support agents at a factor of 0.87 (question 24). **Research recommendation: take the low row as primary (question 22)**, on the condition that self-service help ships before billing. Annual billing cuts dispute hours. Lane I did not find these, and they are on the list for you or an accountant to confirm: how incident counts scale with users, the time a Washington excise return takes, the time a refund takes, the curation ratio, solo-founder hours against users, and the minutes a moderator spends per abuse report.
19. **The member-pays rule.** Under "each member pays", a member who stops paying keeps an unpaid seat that is read-only until they pay again. I need you to confirm or change that. No recommendation.
20. **The switching rule.** A change of payer mode cancels one set of subscriptions and starts the other at the next renewal, with no mid-period switch. I need you to confirm or change that. No recommendation.
21. **Which salary structure?** I need you to choose one, or tell me to wait for an accountant. **C, a single-member LLC taxed as a sole proprietor, is recommended**: the business earns $249,434 a year ($20,786 a month) to leave you the take-home of a $250,000 salary, against $266,575 for all-salary (A), a saving of $17,141. **B\*, an S corporation with a $190,000 wage, is second**: $258,302 a year ($21,525 a month), saving $8,273, with every benefit kept. B (a $184,500 wage) would earn $257,599 ($21,467). The model's salary line uses C, and the recommendation rests on secondary sources for the QBI thresholds and a single-filer assumption; an accountant must confirm it (the 13 questions are in [running-costs.md](running-costs.md#what-the-repository-doesnt-say)).
22. **Which contact-rate row is the primary case?** I need you to choose the low row or the median row. **Recommended: the low row**, because Kanka, Pinboard and Plausible fit only that row; it holds only if the Low-Support Scenario (help centre, in-app answers, demo-coven community help, no support promise on trial and observer seats, annual billing) ships before billing. The median stays as the stress case beside it. Both rows are in every table.
23. **Which price points?** I need you to choose a practitioner (or account) price for the model you pick. At 10,000 paying seats, cash + labour is cleared by today's prices in the low row and by $1.95 to $2.45 in the median row; cash + the structure C job is cleared by $2.35 to $2.86 (low row) or $3.22 to $3.79 (median row). All fall inside the comparables range of $1.58 to $5.99. No recommendation on the exact price; the table under "Prices That Clear Labour" has each model's figure.
24. **AI assistance for support agents.** You decided on 2026-11-06 that it is on by default. I need you to confirm the factor on support minutes: **0.87 is used** (the average gain in Brynjolfsson, Li and Raymond, QJE 2025), with 0.735 and 1.00 as sensitivities (the table under "AI assistance for support agents"). I also need you to confirm the cost: a Claude Team seat at $25 a month per agent beyond you, 2-seat minimum, and that agents use Team, never Pro, so customer messages are not used to train a model. I also need you to confirm Team = Claude for Work, and to turn off Rate chats for support agents (see "Labour and the One-Person Ceiling"). Nothing else for you to do on this one.

## Sources

Lane C's sources S1 to S52 are the comparables. Their URLs are:

- S1 https://slack.com/pricing
- S2 https://www.notion.com/pricing
- S3 https://www.notion.com/help/billing
- S4 https://basecamp.com/pricing
- S5 https://www.flippercloud.io/blog/per-seat-pricing-sucks/
- S6 https://www.figma.com/pricing/
- S7 https://github.com/pricing
- S8 https://discord.com/nitro
- S9 https://www.spotify.com/us/premium/
- S10 https://www.apple.com/apple-one/
- S11 https://1password.com/pricing/password-manager
- S12 https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products
- S13 https://obsidian.md/pricing
- S14 https://obsidian.md/help/sync/collaborate
- S15 https://bear.app/faq/features-and-price-of-bear-pro/
- S16 https://dayoneapp.com/pricing/
- S18 https://www.dndbeyond.com/en/subscribe
- S19 https://kanka.io/pricing
- S20 https://blog.kanka.io/2023/05/03/update-on-merging-of-boosts-superboosts
- S21 https://bloghub.roll20.net/posts/roll20-pricing-increase-announcement
- S28 https://getgrimoire.app/
- S29 https://apps.apple.com/us/app/modern-grimoire-neumoire/id1496242046
- S31 https://apps.apple.com/us/app/witchy-coven/id6711345013
- S34 https://www.revenuecat.com/state-of-subscription-apps/
- S35 https://9to5mac.com/2023/11/28/evernote-free-users-new-limits/
- S36 https://www.theregister.com/2023/11/30/evernote_free_tier_changes/
- S37 https://blog.zulip.com/2022/08/26/why-slacks-free-plan-change-is-causing-an-exodus/
- S38 https://techcrunch.com/2022/08/25/heroku-announces-plans-to-eliminate-free-plans-blaming-fraud-and-abuse
- S39 https://www.lightreading.com/cable-technology/33-of-netflix-subscriptions-are-shared-outside-the-household-study
- S44 https://en.wikipedia.org/wiki/Coven
- S45 https://www.myarchivist.ai/ai-dungeon-master/the-data-behind-dnd
- S49 https://neo-paganism.org/how-many-pagans-are-there/
- S50 https://ethandoylewhite.blogspot.com/2021/11/an-interview-with-professor-helen-berger.html
- S51 https://uscpress.com/Solitary-Pagans

Lane F's processor sources (fetched 2026-11-06):

- S-checkout https://docs.stripe.com/payments/checkout/how-checkout-works
- S-js https://docs.stripe.com/js/including
- S-tax https://stripe.com/tax/pricing
- S-mp https://docs.stripe.com/payments/managed-payments
- S-mp-elig https://docs.stripe.com/payments/managed-payments/eligibility
- S-rb https://stripe.com/legal/restricted-businesses
- S-mock https://github.com/stripe/stripe-mock
- S-clocks https://docs.stripe.com/billing/testing/test-clocks
- S-wh https://docs.stripe.com/webhooks
- BA-stripe https://www.npmjs.com/package/@better-auth/stripe
- P-aup https://www.paddle.com/support/aup
- PO-aup https://polar.sh/docs/merchant-of-record/acceptable-use
- C-proh https://docs.creem.io/merchant-of-record/account-reviews/account-reviews.md
- D-proh https://docs.dodopayments.com/miscellaneous/merchant-acceptance.md
- LS-proh https://docs.lemonsqueezy.com/help/getting-started/prohibited-products

Overhead sources [G1] to [G14] and their URLs are in [running-costs.md](running-costs.md#sources). Running-cost sources are numbered in [running-costs.md](running-costs.md#sources).
