# Subscription Models

**Status:** research; the owner has answered every open question · **Date:** 2026-11-06 · **Task:** M17.1

**The owner withdrew the free tier on 2026-11-06.** The owner's decision: there is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The size steps below count **paying seats**; trial, curator, exempt and demo-only accounts are overhead derived from them ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

This page compares six ways to charge for Sorrel & Salt, prices each against the running costs in [running-costs.md](running-costs.md), and records the owner's decisions. The owner chose model (i) and answered every open question on 2026-11-06; the answers are under "Owner Decisions Recorded for the Design Record". **Nothing is waiting on you.**

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
- **Viewers and solo covens (2026-11-06).** "Viewers don't get solo covens." In (g) only a paid practitioner or steward seat includes a free solo coven; an observer seat does not. Revenue is unchanged; the free-coven storage cost counts practitioner seats only (80% of paid seats under the 20% observer assumption).
- **Observers add a solo coven (2026-11-06).** "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99." The observer pays the solo price less $1 on their own subscription (person-level price on the Stripe side); take-up 20% (assumption). (g) then needs 121 paying seats on cash.
- **Observer price (2026-11-06).** "Also viewers should get a cheaper price point." The modelled price is $1 against $2 for a practitioner seat, with 20% of members observers. The price is my assumption; the 20% share is the owner's estimate (answered 2026-11-06, no source).

- **Owner's answers to the open questions (2026-11-06).** Every open question is answered. They are recorded here by topic.
  - **Seller:** sell through a company, an LLC, not as a sole proprietor.
  - **Stripe's review:** yes, describe the site to Stripe's review.
  - **Where customers are:** United States only, at first.
  - **Keeper exemptions:** the schedule is confirmed: 5% of paying seats at first, then 3%, 1.5% and 0.5% as the site grows.
  - **Pauses:** stop charging while paused, using Stripe's `pause_collection`. It applies to a site pause and to a coven pause.
  - **Vercel Bot Protection:** log mode only. It records suspicious requests and runs no test in visitors' browsers.
  - **DESIGN.md §13:** all four departures under "New Requirements Beyond DESIGN.md §13" are accepted.
  - **Trial:** keep the one-month trial with no card.
  - **security.txt:** add it to the public list of pages that need no signed-in session.
  - **Vercel spending:** leave pause-on-budget off.
  - **Observer share: 20%.** Owner: "I think the observers are going to be lower. Let's do 20%." This was 30%. It is the owner's estimate, with no source (range 15% to 50%). Every figure that uses it is re-run: (c), (g), (h) and (i).
  - **Support contact rates:** keep the modelled rates.
  - **A lapsed member (each member pays):** the seat and the content stay, and the other members see them read-only; the lapsed member has no access to the coven until they pay. Owner: "The seat stay, the content stays, the other members can see their stuff read-only. They just can't access it at all until they pay." The entitlement paths therefore refuse the lapsed member; they no longer give read-only access.
  - **Switching payer mode:** takes effect at the next renewal, with no mid-period switch.
  - **Tax structure: B*** (an S corporation paying a $190,000 wage, the rest as distributions), pending the accountant. The salary line stays A. The spouse's income is confirmed as zero. B* is the owner's choice; C stays the model's cheapest structure.
  - **Main case:** the low contact-rate row is the main case, and the median row is the stress case.
  - **Prices that clear labour:** keep the raised prices. The owner raised them before this question, so the raise answers it.
  - **AI assistance:** the 0.87 factor and the Claude Team seats are confirmed.
  - **Each-member-pays share: 66.66%.** Owner: "I honestly think it will be more like 66.66%." This was 50%. It is the owner's estimate, with no source (range 0% to 100%). Model (i) is re-run with it: 11.1% of seats earn the discount, not 8.3%.
- **GitHub Team (2026-11-06).** The repository is going private and moves to GitHub Team: $4 a user a month, Secret Protection $19 and Code Security $30 per active committer a month, and the Actions minutes beyond Team's 3,000 included at $0.006 a minute. Free offers repository rules and protected branches on public repositories only, which is why Team is required. Owner: "Yeah we're gonna need those for the team plan." The cost is one committer at every size and $67.39 a month, a cash row of its own in every total. See "CI" in running-costs.md.
- **The owner does the hours (2026-11-06).** Owner: "Also model it if I'm going to take the contractor hours. At least some of them. Based on how much other work there is. Because I'd definitely be doing that and what support I can without paying someone else." The salary line already does this: the owner takes every hour up to 160 a month and the site hires the rest. See "Who does the hours" under Break-Even.
- **What changed in the figures.** The observer share (30% to 20%) and the each-member-pays share (50% to 66.66%) moved the tables. (i)'s cash break-even is 124 paying seats, and its cash + labour break-evens are 1,302 (low) and 4,480 (median). The price that clears cash + the structure A job in the median row is $3.85, against today's $3.00.
- **Flat seats (2026-11-06).** "Yes, add (h) beside (g)." Model (h) has no base fee: a practitioner seat includes a solo coven, an observer seat costs less and becomes a practitioner seat by paying the difference, a solo coven alone costs the same as a practitioner seat, and a paying steward gets 50% off practitioner seats in other covens.
- **One price list, over (c) (2026-11-06).** The owner asked for (i) beside (h), then asked why it did not use (g)'s group plan of $6 for 3 and $2 for each additional ("Model g had a group plan for $6 for 3 and $2 for additional. Why didn't you incorporate that?"), and said "rebuild yes". (i) is now built over (c), not (h): one price list with the per-coven payer switch. **Coven pays:** $6 a month for 3 practitioner seats, $2 each extra practitioner, $1 each observer. **Each member pays:** practitioner seat **$3** (owner: "$3"), observer $1. Every practitioner seat includes a solo coven; an observer upgrades to a practitioner seat by paying the difference ($1 in a coven that pays, $2 where members pay). A solo coven bought alone is the **personal plan at $3.50**. Owner: "Let's go $3.50 for a practitioner seat without a coven. There will probably be more support cost per user." The reason is the owner's expectation; it has no source. The consequence of $3: coven-pays and each-member-pays cost the same at two practitioners ($6 both ways) and coven-pays is cheaper from three ($6 against $9), which is what makes paying for the coven worth it.
- **(i)'s prices raised (owner, 2026-11-06).** The owner's list, verbatim: "Coven pays: base (covers 3 practitioners) - $7.00; Coven pays: extra practitioner seat - $2.50; Each member pays: practitioner seat - $3.00; Observer seat - $1.25; Observer upgrade - $1.50 a month where the coven pays, $2.00 where members pay; Personal plan - $3.50; Personal plan - $1 off, free observer". I read it as: the coven pays $7 for 3 practitioner seats, $2.50 for each extra practitioner and $1.25 for each observer; each member pays $3 for a practitioner seat and $1.25 for an observer; an observer upgrade is a set $1.50 a month where the coven pays and $2.00 where members pay; the personal plan is $3.50; and the discount stays $1 off each later self-paid practitioner seat or personal plan, while a later self-paid observer seat is free (the whole $1.25 off). The upgrade is now a set price, not the difference between the seats: it is $0.25 above the difference in both modes. Coven-pays breaks even with each-member-pays at two practitioners ($7 against $6, so each-member-pays is cheaper at two) and is cheaper from three ($7 against $9). The other models are unchanged.
- **R5 in (i): $1 off (2026-11-06).** "Any user that is paying for a seat gets a discount. So coven members that aren't paying for their own seat don't." The owner first set 50% and then changed it: "50% discount seems high." then "$1 off." The discount is $1 off each seat a person pays for themselves (a seat in an each-member-pays coven, or an upgrade difference they pay), beyond the first one they pay at full price. It never lands on another payer's invoice: "self paid seats only." It applies to every seat type, observer seats included, so a person's self-paid observer seat in a later coven costs $0 (owner: "I'm ok with the observer seat being free in other covens."). This replaces the paying-steward rule for (i) only; (c), (g) and (h) keep the rule above, and (h) keeps its 50%.
- **An observer upgrade earns the discount (2026-11-06).** Owner: "yes they earn the discount." An observer who pays only the upgrade price to become a practitioner counts as paying for a seat, and earns the discount on the seats they pay for elsewhere. (i) is modelled that way.
- **One subscription per paying person (2026-11-06).** In an each-member-pays coven a person holds one Stripe subscription with one line per seat, not one subscription per seat. The owner's point: a $0 observer line adds no subscription, and Stripe's 30¢ fixed fee is charged per payment, so a free later seat costs nothing extra. This is a data-model point for the record: the billing tables hold a subscription per person with seat lines, not a subscription per coven seat. (i) counts subscriptions that way: one per paying person, one per coven that pays, one per personal-plan buyer.
- **Payer modes (2026-11-06).** "Model both modes now." Every coven-pays model that reaches the page ((c), (g), (h), (i)) gains a per-coven switch between coven pays and each member pays. See "Payer Modes" below; the member-pays rule and the switching rule are now the owner's decisions (see below).
- **Models rejected (2026-11-06).** "We're not going to do e - any member pays, remove it. We're not going to do d - solo run only by itself. We're not going to do a - coven pays, seat bundles." Each is a short entry under "Considered and Rejected"; (d)'s solo-coven price research stays because (g) and (h) use it.
- **Salary structure (Lane J, 2026-11-06).** The owner's goals: "the cheapest tax option with the maximum benefits", "while maintaining what I would get at a $250k salary". The owner's decisions, 2026-11-06: the salary line is structure A, "$250,000 gross before what the employee would see taken out of their paycheck" (a $250,000 gross salary plus the employer's payroll taxes, $266,575 a year, plus Lane D's benefits), because the owner wants the line to read as a normal employee's cost; and the owner files married filing jointly ("Married filing jointly would be my tax."), with the spouse's income unknown and assumed to be zero (owner to confirm). Structure C (a single-member LLC taxed as a sole proprietor, $252,950 a year of business earnings jointly, $249,434 for a single filer) stays the model's recommendation as a tax structure, pending an accountant, and is a sensitivity row beside the salary line. See [running-costs.md](running-costs.md#salary-structures-lane-j) and owner question 21.
- **AI assistance for support agents is on by default (owner, 2026-11-06; Lane K).** The factor on minutes per support contact is 0.87 in the primary case (0.735 and 1.00 as sensitivities), from Brynjolfsson, Li and Raymond (QJE 2025): resolutions per hour up 15.2%, handle time down 8.5%. It deflects no contact. Agents use the Claude Team plan ($25 a seat a month, 2-seat minimum), never Pro, because the consumer terms train on inputs unless opted out and customer messages must not train a model (the Code of Ethics: the site sells no data). The Team plan's training terms and what is unconfirmed are under "Labour and the One-Person Ceiling".
- **Labour scales with paying seats (Lane I, sources dated 2026-11-06).** Hours a month = fixed hours + variable hours per 1,000 paying seats. The low contact-rate row is the primary case and the median is the stress case; both are shown everywhere. Support, dispute and privacy-request hours are priced at a living wage without health cover ($41.47 an hour, derived), loaded with employer payroll taxes and benefits to $53.80 an hour; engineering hours at the BLS Washington developer median ($80.07), loaded to $100.88. See "Labour and the One-Person Ceiling" under Break-Even.
- **No free tier (2026-11-06).** There is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The four departures from DESIGN.md §13 under "New Requirements Beyond DESIGN.md §13" follow from it.
- **Pricing as modelled is fair enough (2026-11-06).** After reviewing regional pricing, a self-requested hardship exemption and a stated wage gap, the owner decided: "pricing as modelled is fair enough". None of the three is modelled. No numbers change.
- **The living wage is a floor (2026-11-06).** "The living wage is a minimum. Not a maximum." The $250,000 salary target is above that floor by the owner's choice. A task, to be minted on Wave 21 by M17.1 (no id yet), will scope an executive pay maximum: a ratio of the highest to the lowest pay on the site, researched against published pay-ratio policies.
- **Model (i) chosen (owner, 2026-11-06).** The owner chose model (i), One price list ($7 base, +$2.50 for each extra seat if the coven pays, $3 if members pay, $1.25 observer seat, $1 off a second coven, personal plan $3.50; the prices were raised later the same day, see the next entry). The remaining owner questions are written against (i) and quote (i)'s figures first; the other models' sections and tables stay as the record of what was compared. Questions 6 and 16 and the (g)-only and (c)-only options are gone; a question that applies to only some models carries a models list.
- **Processor: Stripe Billing + Stripe Tax, the site as merchant, with a checkout page the site hosts; Stripe.js loads on that page and on no other (owner, 2026-11-06).** The owner first said "And stripe as the processor: Stripe Billing + Tax, hosted Checkout", then amended it: "I want to host my own checkout. And only have the scripts on absolutely necessary pages." Questions 1 (merchant or merchant of record), 2 (Sold through Link) and 13 (Stripe.js; now answered as: on the checkout page only) are decided. The research's earlier recommendation, Stripe-hosted Checkout, is overridden by the owner; the reason is fewer vendor pages and the script confined to the one page that needs it. Fees are unchanged. The consequences are under "A Site-Hosted Checkout Page". Question 4 stays, as a yes or no on describing the site to Stripe's review. Fee figures use Stripe option 1 as primary; Managed Payments stays in the comparison as the recorded fallback, and it requires Stripe's hosted Checkout, so using the fallback would also mean giving up the site-hosted page.

## How Each Model Meets R1 to R5

| Model                                | R1 coven pays                                                                     | R2 scales with members | R3 free months                           | R4 keeper exemption | R5 pays less in several covens                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| (b) Each user pays                   | **dropped**                                                                       | **altered**            | **altered**                              | **altered**         | kept                                                                                                                                          |
| (c) Base plus seats                  | kept                                                                              | kept                   | kept                                     | kept                | kept (as a seat discount, paying stewards only)                                                                                               |
| (g) Group plan includes a solo coven | kept (over (c))                                                                   | kept (over (c))        | kept                                     | kept                | kept (a member's solo coven is free)                                                                                                          |
| (h) Flat seats                       | kept (steward's bill is seats × price)                                            | kept                   | kept                                     | kept                | kept (50% off for paying stewards; every practitioner seat has a free solo coven)                                                             |
| (i) One price list                   | kept (steward pays $7 / $2.50 / $1.25, or each member pays $3 / $1.25, per coven) | kept                   | kept                                     | kept                | kept ($1 off each seat a person pays for themselves beyond their first, observer seats included; a seat on another payer's invoice gets none) |
| (f) Trial only + curator covens      | kept, as policy                                                                   | not applicable         | **altered** (one month, keeper-settable) | **altered** (timed) | not applicable                                                                                                                                |

**No comparable discounts a seat across groups.** Notion bills a person once per paid workspace they belong to, "even if the same people are in multiple workspaces" [S3]. GitHub bills each organisation separately [S7]. R5 therefore has no consumer precedent as a seat discount, and none restricts one to people who pay for another group. The nearest thing is Kanka, where one payment covers several campaigns and the price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7) [S19].

**The keeper exemption (R4)** is a flag on the coven in (c), (g), (h) and (i). In (b) it must be a flag on the person, or an exemption that waives every member of a flagged coven. Nothing in the comparables does this; it is an internal rule. In Stripe it is a 100%-off coupon on the subscription, or no subscription at all.

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

**Price points.** Spotify moves from Duo ($18.99) to Family ($21.99) [S9]. Figma's cheap Collab seat ($3) sits beside full seats ($16) [S6], which maps onto observers: about a fifth of the full price. Slack bills only members active in the last 28 days [S1]. I model **$6 base covering 3 practitioners, plus $2 for each extra practitioner and $1 for each observer** (assumption: the owner said on 2026-11-06 that observers should get a cheaper price; $1 against $2 is a ratio of one half, kinder than Figma's about one fifth, and mine). Observers do not count toward the 3 in the base. The observer share of a coven is the owner's estimate, 20% (2026-11-06; no source; range 15% to 50%). A seat held by a paying steward of another coven is 50% off.

**Deriving the discount's reach (derived).** Stewards are one per coven, so the share of accounts that are paying stewards is covens per account = 1.2 memberships ÷ 5.5 members per coven [S45] = **21.8%**. A seat is a second or later membership for (1.2 − 1) ÷ 1.2 = 16.7% of seats. I take the two as independent, so 16.7% × 21.8% = **3.6% of seats** are discounted, and the average seat is charged 1 − 3.6% × 50% = 0.9818 of its price. At 5.5 members that is 4.40 practitioners and 1.10 observers per coven, so $6 + ($2 × 1.4 extra practitioners + $1 × 1.10 observers) × 0.9818 = **$9.83 per coven**.

**R1 to R5.** All five kept. R5 is a seat discount on the second coven's invoice, for a seat held by a person who is the paying steward of another coven (the owner's answer, 2026-11-06, to what DESIGN.md §13 left open). A member who holds a seat elsewhere but pays for no coven pays the full seat price.

**Multi-coven discount.** Needs a Stripe coupon on the second coven's seat line, or a lower seat price. The discount follows the person across customers, which Stripe does not do by itself; the service has to compute it, and it applies only while that person is the paying steward of another active coven.

**Stripe objects.** Product, a base Price, a per-seat Price (quantity), Subscription with quantity, Coupon (up to 20 stacked, can be added after checkout), Customer Portal.

**Reception.** For: meets every want; the cheap-observer seat and active-only billing both have precedents [S6] [S1]. Against: Notion's practice is the opposite of R5 [S3], and per-seat pricing draws the complaints in "Per Seat Pricing Sucks" (a vendor's opinion, no data) [S5].

### (f) Trial Only Plus Curator Covens

**Structure.** Not a price. It is the free-things policy every model carries once the free tier is gone: a new coven gets a trial with no card (one month, longer if a keeper sets it), each site curator holds a free coven of 7 seats, a keeper may exempt a coven for a stated time, and the demo coven's observer seat and the public compendium stay free. Nothing else is free.

**Why it has no break-even row of its own.** It adds cost (trial, curator and exempt seats, plus the demo-only accounts) and no revenue, so it is already inside every other model's cost side ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

- **Trial conversion without a card** is 4% to 6% ("good") and 10% to 15% ("great") within six months; with a card it is 25% to 35% [G7]. The owner chose no card, so the model uses 10%. A trial with no card needs 76% to 89% of the paying seats again in trial seats, at a steady state.
- **Requiring a card costs trial starts and, on this evidence, paying seats.** First Page Sage's benchmark (86 SaaS companies, 71% business-to-business and 29% consumer, Q1 2022 to Q3 2025, published 5 September 2025; fetched 2026-11-06) is business-heavy, not hobby apps [G15]. For organic traffic, 8.5% of visitors start a trial with no card and 2.5% with a card required, and 18.2% of no-card trials and 48.8% of card trials become paid. For paid traffic the rates are 7.1% and 2.2% to start, and 17.4% and 51% to pay. The page gives no visitor-to-paid figure; multiplying its two rates (derived here) gives 1.55% against 1.22% for organic traffic, 155 against 122 paying seats per 10,000 visitors, about 21% fewer. Trial starts fall about 70% (850 against 250 per 10,000 visitors). Paid traffic gives 1.24% against 1.12%, about 9% fewer. So the no-card decision is better on this evidence as well as cheaper. A 2012 benchmark is reported secondhand with no figures in the post that cites it, and its original was not fetched, so it is unverified and not used.
- **Cutting a free tier later is costly** (Evernote 2023 [S35] [S36]; Slack 2022, a competitor's claim [S37]; Heroku [S38]). Starting with none avoids that cut.
- **Reception of no free tier.** I found no source that measures harm from having none. Retention after one year was "nearly identical" for hard-paywall and freemium apps [S34].
- **Curator coven precedent.** Community products include 2 to 15 staff seats in a plan [G10] to [G12]; none gives a seat count free by the platform to its own curators. Ghost lets a publisher comp any member for a week, a month, six months, a year or forever [G13]; GitHub re-checks free eligibility every month [G14]. The re-check is the nearest precedent for a timed exemption.

### (g) Group Plan Includes a Solo Coven

**Structure.** Owner request, 2026-11-06: "Group plan includes solo coven, a solo coven price should be found." Every paid practitioner or steward seat in a group coven also gives that member a free solo coven of their own. An observer seat does not (owner, 2026-11-06: "Viewers don't get solo covens."). A person with no paid group seat buys a solo coven alone. (g) is a layer over a group model; I model it over **(c)** (base plus seats), and it could sit over another group model in the same way.

**Solo coven price proposals** (all assumptions, anchored on the solo comparables in section "Solo and Personal Spaces"; Day One is $49.99 a year, about $4.17 a month [S16]):

- **$1.99 a month**, Neumoire's price [S29]. Lowest barrier to entry, but it earns the least and the cheapest comparable is not the one that is known to last.
- **$2.99 a month**, Bear's price [S15]. Matches the best-known solo journal at a price people already accept; this is the one I modelled.
- **$4.99 a month**, Grimoire's price [S28], close to Day One's $4.17 [S16]. Earns the most per solo buyer, and sits at the price where a solo coven costs more than a group seat's share ($2.14).

**Assumptions in the model.** A paying seat is either a group seat (priced as (c): $9.83 per coven, 1.2 memberships per account, 5.5 members per coven, so $2.14 per seat) or a solo coven bought alone. I assume 20% of paying seats buy a solo coven alone (range 10% to 40%; no source). Revenue per paying seat = 80% × $9.83 × 1.2 ÷ 5.5 + 20% × $2.99 = $1.716 + $0.598 = **$2.31**. Stripe's 30¢ fixed fee is charged per subscription: 0.8 × 1.2 ÷ 5.5 group subscriptions plus 0.2 solo subscriptions per paying seat.

**Observers add a solo coven by paying the difference (owner, 2026-11-06: "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99.").** An observer seat costs $1, so an observer adds a solo coven for the solo price less $1: **$1.99** a month at the modelled $2.99. If you pick $1.99 or $4.99 as the solo price, the difference is $0.99 or $3.99. The observer pays it themselves, as their own subscription, not on the coven's invoice, so Stripe needs a person-level price for it (the person is a customer of their own, separate from the coven's steward). Take-up is an assumption: **20% of observers add one** (range 5% to 40%; no source). Per paying seat that is 80% in group covens × 20% observers × 20% take-up = 0.032 add-ons × $1.99 = **$0.064**, which brings revenue per paying seat to $2.31 + $0.064 = **$2.38**. Each add-on is also one more subscription (30¢ fixed fee) and one more free-sized coven of storage.

**Cost of the free solo covens.** Each paid practitioner or steward seat (80% of paying seats, times the 80% that are not observers: 64%) holds one more coven (observers who add a solo coven add theirs: 0.032 per paying seat), of the average size the cost model already uses (about 115 KB of spells and ingredients each, from the running-costs ratios). The free covens add stored data and nothing else: sessions, and so function calls, mail and tracing, are counted per account and do not change. The extra Neon storage is $0.00 / $0.05 / $0.47 / $4.73 a month at 100 / 1,000 / 10,000 / 100,000 paying seats. It is added to every cost line for (g).

**What it shows.** The free solo covens cost almost nothing, so the model's result depends on the assumed 20% who buy a solo coven alone and on the solo price:

| Solo coven price | Revenue per paying seat | Net at 100 | Net at 1,000 | Net at 10,000 | Net at 100,000 | (i) |  (ii) |  (iii) |
| ---------------- | ----------------------: | ---------: | -----------: | ------------: | -------------: | --: | ----: | -----: |
| $1.99            |                 $2.1453 |       $182 |       $1,817 |       $18,133 |       $180,839 | 173 | 1,918 | 14,101 |
| $2.99            |                 $2.3773 |       $203 |       $2,026 |       $20,212 |       $201,628 | 155 | 1,681 | 12,399 |
| $4.99            |                 $2.8413 |       $244 |       $2,444 |       $24,370 |       $243,206 | 128 | 1,349 |  9,990 |

| Paying seats                     | 100   | 1,000 | 10,000 | 100,000 |
| -------------------------------- | ----- | ----- | ------ | ------- |
| Cost of free solo covens a month | $0.00 | $0.05 | $0.47  | $4.73   |

The columns (i), (ii) and (iii) are seats to break even on cash, on cash + all labour hours (support at the loaded $53.80, engineering at the loaded $100.88), and on cash + a full-time job with hired help. They are shown for the low contact-rate row (primary) only; the median row (stress case) needs more seats on (ii) and (iii) (see Break-Even).

### (h) Flat Seats

**Structure.** Owner choice, 2026-11-06: "Yes, add (h) beside (g)." There is no base fee. Four rules:

1. A **practitioner seat** includes a solo coven of the member's own.
2. An **observer seat** costs less, and becomes a practitioner seat by paying the difference.
3. A **solo coven alone** costs the same as a practitioner seat.
4. A member who pays for a coven gets **50% off** their practitioner seats in other covens (R5, the paying-steward rule).

The steward's bill is seats × price. I use the same overhead, the same 20% observer share, the same 20% who buy a solo coven alone and the same paying-steward share as (g). The 20% observer take-up now means "upgrades to a practitioner seat" (and so gets a solo coven). All five wants are kept.

**Two price pairs, both shown.**

| Pair              | Practitioner seat | Observer seat | Observer upgrade (difference) | Solo coven alone |
| ----------------- | ----------------: | ------------: | ----------------------------: | ---------------: |
| Illustrative      |             $3.00 |         $1.00 |                         $2.00 |            $3.00 |
| Calibrated to (g) |             $2.24 |         $1.00 |                         $1.24 |            $2.24 |

**The calibration arithmetic.** Per paying seat, 80% of seats sit in group covens and a coven has 1.2 ÷ 5.5 = 0.2182 of a coven per seat. A coven has 4.40 practitioners (with the 0.9818 paying-steward seat factor) and 1.10 observers, 20% of whom upgrade. Revenue per paying seat is therefore 0.8 × 0.2182 × [4.40 × 0.9818 × p + 1.10 × (0.8 × $1 + 0.2 × p)] + 0.2 × p = 0.9924 p + $0.1536. Setting it equal to (g)'s $2.3773 per paying seat gives p = (2.3773 − 0.1536) ÷ 0.9924 = **$2.2407, rounded to $2.24**, with observers held at $1. At $2.24 revenue per paying seat is $2.3767. If you instead want one group coven to pay what (c) charges ($9.83), p is **$1.97** (derived); that is lower because (h)'s per-coven bill also carries the observer upgrades. At the illustrative $3 / $1, a group coven pays $14.50 and a paying seat brings $3.13; at $2.24 / $1 a group coven pays $11.05.

**Worked example.** A coven of five: three practitioners and two observers, and one of the practitioners also pays for a coven elsewhere. At $3 / $1 the coven's bill is 2 × $3 + 1 × $1.50 + 2 × $1 = **$9.50**. If one observer upgrades, the bill is $11.50, and the upgrade gives that member a solo coven. In the other coven, the same member's practitioner seat is billed at $1.50 and not $3. At $2.24 / $1 the same coven pays $7.60, or $8.84 with the upgrade.

**Costs.** Subscriptions: one per paying group coven and one per solo-alone buyer; an upgrade rides on the steward's invoice, so it adds no subscription. Stripe's 30¢ fixed fee is charged on those. Free solo covens cost Neon storage only, counted as in (g).

**Reception.** Per-seat pricing with a cheaper view-only seat is the common pattern: Figma's Collab seat is $3 beside a $16 full seat [S6]. Notion bills a person once per paid workspace [S3], so a 50% discount for paying stewards has no consumer precedent (see the R5 note above). The solo coven price anchors are Bear $2.99 [S15], Neumoire $1.99 [S29] and Grimoire $4.99 [S28], as in (g).

**Break-even (cash).** $3 / $1: **90** paying seats; $2.24 / $1: **120** (rows in the tables under Break-Even).

### Considered and Rejected

The owner rejected three models on 2026-11-06. Their research stays here so it is not redone.

**(a) Coven pays, seat bundles.** Owner decision, 2026-11-06: "We're not going to do a - coven pays, seat bundles." The steward bought a bundle covering a fixed number of members (1, up to 5, up to 13, unlimited), and a coven crossing a bundle edge moved up a step. Basecamp charges $29 for 5 users, $79 for 10 and $99 for 15, "no per-user fees" [S4]. Household bundles cost $5.99 to $27.95 for 5 to 6 people and take 70% to 78% off the per-head price [S9] [S10] [S11] [S12]. Kanka charges $9.99 for 3 campaign slots [S19], and its price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7). D&D Beyond's $5.99 for 12 people [S18] was the floor. The modelled step prices were my assumptions ($2.99 / $7.99 / $11.99 / $16.99 for 1, up to 5, up to 13 and unlimited), with an assumed spread of 6% / 50% / 42% / 2% of covens and a $9.55 average per coven. It needed 135 paying seats to break even on cash. Against it: a coven at a bundle edge pays a step, Flipper reports no results from its move to bundles [S5], and bundles count members regardless of role, so there is no cheaper observer price.

**(d) Solo rung only.** Owner decision, 2026-11-06: "We're not going to do d - solo run only by itself." It was a one-member coven at a low price, sitting inside (a), (b) or (c) as the smallest step; I modelled $2.50 a month (assumption), which needed 124 paying seats on cash. **The solo-coven price research stays in use**, because (g) and (h) price a solo coven from it: Bear $2.99 a month [S15]; Day One $49.99 a year [S16]; Grimoire $4.99 a month [S28]; Neumoire $1.99 a month [S29]. Notion, Kanka and Obsidian are free for one person [S2] [S19] [S13]. Demand: most practitioners are solitary: 79% in 2010 [S49], the "dominant group" [S50], and "the majority … have abandoned … practicing in groups" [S51]. Every witchcraft app I found except Witchy Coven is built for one person [S31]. Against: the 79% figure is from 2010, and neo-paganism.org attributes it to "a Pagan census" without a link I could check.

**(e) Any member pays.** Owner decision, 2026-11-06: "We're not going to do e - any member pays, remove it." Any member could buy a subscription covering a coven, and one subscription could cover several covens, with tiers by coven count. Kanka sells 1, 3 and 7 campaigns for $4.99, $9.99 and $24.99 [S19]; D&D Beyond's $5.99 Master plan shares with up to 12 people, and the subscriber need not be the DM [S18]; any Discord member may boost a server [S8]. I modelled $5.64 a month per covered coven (derived: 87% of Kanka payers at $4.99 and 13% at $9.99, [S20] and [S19]), which needed 238 paying seats on cash. It altered R1 (any member, not only the steward, may pay) and dropped or altered R2. Kanka's survey found 99% saying merged boosts simplified the system [S20]; I found no data on how often a non-owner pays. The owner's separate "each member pays" payer mode (below) is a different thing and stays.

### (i) One Price List

**Structure.** Owner choice, 2026-11-06, rebuilt the same day over (c) (see the decisions above). (i) is one price list with the per-coven payer switch (see "Payer Modes"), not three plans, and a solo coven alone has its own price. Five rules:

1. **Coven pays:** $7 a month for 3 practitioner seats, $2.50 each extra practitioner, $1.25 each observer. **Each member pays:** practitioner seat $3, observer $1.25.
2. A **practitioner seat** includes a solo coven of the member's own. The **observer seat** is $1.25, and an observer becomes a practitioner, and so gets a solo coven, by paying a set upgrade price on top of the seat: $1.50 a month where the coven pays ($2.75 in all) and $2.00 where members pay ($3.25 in all). The upgrade is a set price, not the difference between the seats: it is $0.25 above the difference in both modes (the difference is $2.50 − $1.25 = $1.25 where the coven pays and $3 − $1.25 = $1.75 where members pay).
3. The **personal plan**, a solo coven bought alone, costs **$3.50** a month, above the $3 practitioner seat. The owner's reason: "There will probably be more support cost per user." That is the owner's expectation, with no source. A two-person coven on each-member-pays gets the same solo coven for the seat price, so the premium relies on people not doing that (assumption, no source).
4. **Discount (R5): $1 off.** Earned by any person who pays for a seat of their own, an upgrade included. It applies only to seats that person pays for themselves, beyond the first one they pay at full price, to a practitioner seat and the personal plan, and a self-paid observer seat in a later coven is **free** (the whole $1.25 off). A member whose seat is on a steward's invoice gets none, and the discount never lands on another payer's invoice. $1 off a $3 seat is about 33%, the size of the drop in Kanka's price per campaign when one payment covers several [S19]; no comparable gives a person a fixed amount off their own second seat.
5. An observer who pays only the upgrade price counts as paying for a seat, and earns the discount (owner decision, above).

**Coven pays against each member pays.** At two practitioners the coven pays $7 against $6 where members pay, so each member pays is cheaper at two; from three practitioners paying for the coven is cheaper ($7 against $9), and the gap widens with each practitioner ($9.50 against $12 at four). That is what makes a steward paying for the coven worth it.

**On the Stripe side** a person holds **one subscription with one line per seat**, not one subscription per seat, so the discount follows the person: every discounted seat is a line on the payer's own subscription, so it is one customer and needs no cross-customer coupon. I did not check Stripe's coupon rules for this; the Wave 21 design confirms them. A $0 observer line adds no subscription, and Stripe's 30¢ fixed fee is charged per payment, so a free later seat costs nothing extra.

**One price set, and why not two.** (i) earlier had a second, calibrated pair of prices solved to match (g)'s revenue per paying seat. With the base fee that no longer means anything: (g) is itself built over (c)'s $6 and $2, so (i) and (g) once shared a price list; (i) now has its own, higher prices, and differs from (g) in the prices, the payer switch, the personal plan and the discount. (i) therefore has one set of prices, the ones the owner chose.

I use the same overhead, the same 20% observer share, the same 20% who buy a solo coven alone (at $3.50) and the same 20% observer take-up as (h). All five wants are kept.

**Reach of the discount (derived, with one assumption).** 16.7% of seats are second or later memberships (1.2 memberships per account; [S45]), the same figure as (c). Only the self-paid ones are discounted, and that depends on the share of covens on each-member-pays. No source exists, so I use **66.66% of covens each-member-pays** (the owner's estimate, 2026-11-06; no source; range 0% to 100%). That discounts 16.7% × 66.66% = 11.1% of seats. At 0% nobody is discounted, and every coven pays as in (c); at 100% 16.7% of seats are discounted and every coven is priced at $3 a practitioner seat. (h)'s paying-steward rule reaches 3.6% of seats. The personal plan is not discounted in the model, since a solo-alone buyer holds one seat.

**The arithmetic.** A coven has 4.40 practitioners and 1.10 observers, 20% of whom upgrade. A coven that pays brings $7 + 1.40 × $2.50 + 1.10 × (0.8 × $1.25 + 0.2 × $2.75) = **$12.21**. An each-member-pays coven brings 4.40 × $3 + 1.10 × (0.8 × $1.25 + 0.2 × $3.25) = $15.02 before the discount and **$14.06** after: one in six seats is a second or later membership, so the discount takes $1 off 1/6 of the coven's 4.40 practitioner seats and 0.22 upgraded observer seats, and the whole $1.25 off 1/6 of its 0.88 plain observer seats (which go free). With 66.66% of covens each-member-pays, a group coven brings **$13.44**. Per paying seat, 80% sit in group covens, a coven has 1.2 ÷ 5.5 = 0.2182 of a coven per seat, and 20% buy the $3.50 personal plan alone: 0.8 × 0.2182 × $13.44 + 0.2 × $3.50 = **$3.05** a paying seat, against (g)'s $2.38 and (c)'s $9.83 per coven.

**Worked example.** A coven of five: three practitioners and two observers. If the coven pays, the bill is $7 + 2 × $1.25 = **$9.50**, and an observer who upgrades adds $1.50 ($11.00 in all). If each member pays and nobody has a seat elsewhere, it is 3 × $3 + 2 × $1.25 = **$11.50**, and an upgrade adds $2.00. Now suppose one of the practitioners, Mira, also pays for her own seat in another each-member-pays coven of five: in that second coven her practitioner seat is her second self-paid seat, so it costs $3 − $1 = $2, and the bill is 2 × $3 + $2 + 2 × $1.25 = **$10.50**. Had she been an observer there, her seat would be **free**. If the second coven were the one that pays, nobody in it gets the discount, since no seat is on a member's own invoice. A person with no coven who buys the personal plan pays $3.50.

**Costs.** Subscriptions: one per person who pays for any seat in an each-member-pays coven (one line per seat), one per coven that pays, and one per solo-alone buyer. It assumes a person's covens are all on the same payer mode. Stripe's 30¢ fixed fee is charged on those: 792 subscriptions per 1,000 paying seats, against 898 if every seat were its own subscription. Counting one subscription per person instead of one per seat moves the fee by about $32 a month per 1,000 paying seats, roughly 1% of net revenue. Free solo covens cost Neon storage only, counted as in (g).

**Reception.** Per-seat pricing with a cheaper view-only seat is the common pattern: Figma's Collab seat is $3 beside a $16 full seat [S6]. A base for a minimum group plus extra seats is (c)'s pattern. Notion bills a person once per paid workspace [S3], so a $1 discount for a person's own second seat has no consumer precedent beyond Kanka's falling price per campaign when one payment covers several [S19]; I found no comparable with a fixed amount off a second seat. The solo coven price anchors are Bear $2.99 [S15], Neumoire $1.99 [S29] and Grimoire $4.99 [S28]; the $3.50 personal plan sits between Bear and Grimoire. I did not look for a comparable that prices a seat alone above a seat in a group.

**Break-even (cash).** **124** paying seats (rows in the tables under Break-Even).

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

Owner decision, 2026-11-06: "Model both modes now." Every coven-pays model that reaches the page, (c), (g), (h) and (i), gains a per-coven switch. A steward sets it for the coven. In (i) the switch is what decides who earns the discount: only a seat the member pays for is discounted, so it is the each-member-pays covens that carry it.

- **Coven pays.** The steward is billed for every seat and holds the R5 discount for seats in other covens.
- **Each member pays.** Every member subscribes to their own seat at the same seat prices. R5 as defined for (c), (g) and (h) does not apply (the discount belongs to a paying steward's invoice); in (i) it does, as $1 off the member's own second and later paid seats.

**Revenue is held equal.** Revenue per coven is the same under both modes in the tables. Take-up differs and no source says which converts better, so I did not guess. One cost does differ and is not in the tables: Stripe's 30¢ fixed fee is charged per subscription, so member-pays pays it for each member and not once per coven. Per paying seat that is 30¢ × (1 − 1.2 ÷ 5.5) = about **$0.23** more a month (derived), against revenue of $1.8 to $3.3 a seat. I recommend you treat member-pays as costing about that much more in fees.

**The member-pays rule (owner, 2026-11-06).** A member who stops paying keeps their seat and their content. The rest of the coven sees them and their content read-only. The lapsed member has no access to the coven at all until they pay again. Nothing is deleted. The owner's words: "The seat stay, the content stays, the other members can see their stuff read-only. They just can't access it at all until they pay." This replaces the rule I had modelled, where the lapsed member kept read-only access.

**The switching rule (owner, 2026-11-06).** A change of mode cancels one set of subscriptions and starts the other at the next renewal. There is no mid-period switch, so no proration and no double charge.

**Invitation wording.** In member-pays mode an invitation must say "to join you must subscribe", and the invited person must be told the seat price before accepting. In coven-pays mode the invitation says nothing about payment.

**What this adds to the Wave 21 test plan.** Entitlement paths, webhook cases and stories roughly double: each runs once for coven pays and once for member pays, plus the switching case (cancel at renewal, start at renewal) and the lapsed member, who is refused access to the coven while the others see their content read-only. Allow for that in the estimate.

### New Requirements Beyond DESIGN.md §13

The no-free-tier decision departs from §13 in four places. **The owner accepted all four on 2026-11-06.**

1. **A per-coven trial length that a keeper can set.** Standard one month; longer for promotions and beta testers.
2. **A curator's free coven of 7 seats**, the curator included, one curator per 1,000 paying seats and at least 2.
3. **Timed exemptions.** A keeper's exemption has an end date. "Permanent" is the exception: it needs confirmation, is listed on the keeper billing page, and can be revoked.
4. **The demo coven's observer seat stays free** (already in §5; recorded here so billing never charges it).

## Solo and Personal Spaces

**Demand.** See "Considered and Rejected", (d): most practitioners practise alone [S49] [S50] [S51].

**What comparables do.** Notion gives a single-member workspace with no block limit [S2]. Figma has free Drafts [S6]. GitHub has a free personal account beside organisations [S7]. Obsidian is a free local vault [S13]. Kanka and Basecamp have no personal type: a solo user is a group of one [S19] [S4]. Slack has no personal space [S1].

**What reintroducing a personal `kind` would change.** CLAUDE.md says there are no personal workspaces: no `kind` column, every coven can take members and be deleted by a steward. Under the current rule, a solo user is a coven of one, which is how Kanka and Basecamp work. Adding a `kind` would let a personal space be free and undeletable, and would let it not take members. It would also add a `kind` check to every membership rule, the invitation service and the demo coven's deletion rule. **This is a change you would have to accept; I have made none.** I recommend no `kind`: a solo coven in (g), (h) or (i), as a coven of one, gives the same price point without a schema change.

## Processors

### Lane F's Summary

**Rank 1: Stripe Billing plus Stripe Tax, the site as merchant, with a checkout page the site hosts (the owner's choice of 2026-11-06; the research had recommended Stripe-hosted Checkout).** **Rank 2: Stripe Managed Payments, where Link, Stripe's service, is the merchant of record.** A merchant of record is the company legally selling to the customer: it collects and pays the sales tax. Stripe-hosted Checkout loads no Stripe.js on the site [S-js] [S-checkout]; the site-hosted page loads it on that one page, which needs a scoped exception (see "A Site-Hosted Checkout Page").

| Route                                             | Cost on a $10 monthly seat, US card |
| ------------------------------------------------- | ----------------------------------- |
| Stripe Billing + Tax Basic by API                 | $1.16 (11.6%)                       |
| Stripe Billing + Tax Basic, no-code               | 71¢ (7.1%)                          |
| Stripe Managed Payments                           | $1.01 (10.1%)                       |
| Paddle, Lemon Squeezy or Polar Starter (5% + 50¢) | $1.00 (10%)                         |
| Creem (3.9% + 40¢)                                | 79¢ (7.9%)                          |

Stripe Tax Basic does not register or file anything [S-tax]; with it the owner registers and files in Washington and wherever else a threshold is crossed.

**Managed Payments limits.** Subscriptions only through Stripe's hosted Checkout, so the fallback would mean giving up the site-hosted page; no invoice items; statements read "Sold through Link"; Stripe may refund within 60 days; products must be digital and fully automated; an eligibility review applies [S-mp] [S-mp-elig].

### Restricted-Business Quotes

The site sells a grimoire and a compendium that includes zodiac and deity vocabularies. Each vendor's list, quoted:

- **Stripe:** "Psychic services and fortune tellers", under jurisdiction-specific bans for Japan, Mexico and Thailand only. Nothing on astrology, the occult or spiritual services [S-rb].
- **Paddle** (item 14): "Digital services associated with pseudo-science, including but not limited to clairvoyance, horoscopes, fortune-telling" [P-aup].
- **Polar** (item 31, prohibited): the same wording; "Spiritual & Astrology services" are under closer review [PO-aup].
- **Creem:** "Metaphysical, fortune-telling, and spiritual outcome services" [C-proh].
- **Dodo** (item 15): "Religious or spiritual product or services…"; "Spiritual & Astrology services" need review ("Entertainment only; no claims or predictions") [D-proh].
- **Lemon Squeezy:** "Services of any kind", and any product its payment partners restrict [LS-proh].

Stripe has the narrowest list. Whether a spell journal falls under any of these lines is a judgement the vendor makes; I could not resolve it.

### A Site-Hosted Checkout Page

The owner chose, on 2026-11-06, to host the checkout on the site: "I want to host my own checkout. And only have the scripts on absolutely necessary pages." Stripe.js loads on the checkout page and on no other. The earlier research recommendation (Stripe-hosted Checkout, which loads no script on the site) is overridden by the owner, for fewer vendor pages and the script confined to the one page that needs it. Fees are unchanged. Consequences:

- **Card data and PCI scope.** Stripe's security guide says its low risk integrations collect card details and send them straight to Stripe without passing through the site's servers, which reduces the site's PCI obligations [S-sec]. The guide does not name the self-assessment questionnaire; that this keeps the site at SAQ A was **not found** in the fetched sources, and the accountant or Stripe's Dashboard compliance page should confirm it. Card fields stay in Stripe's frames (an iframe is a page embedded inside another page), so card numbers never reach the site's servers.
- **Fraud signals.** Stripe.js collects them on the checkout page itself, which is the page where they matter. This partly answers the earlier worry in running-costs.md (payment-side monitoring) that hosted Checkout gives up some risk-model accuracy; how much of the gap it closes was **not found**. Stripe advises loading Stripe.js on every page, and this decision does not do that.
- **Script risk.** Stripe's guide says that including another site's JavaScript makes the site's security depend on that site's, and recommends minimising it [S-sec]. Confining the script to one page is the owner's way of doing that. The guide also lists the Content Security Policy directives for Stripe.js (script, frame and connect sources), to set on that page only [S-sec].
- **Privacy Policy and Code of Ethics.** The Privacy Policy's "runs no tracking script" and the Code of Ethics line need a scoped exception, "one payment script from Stripe runs on the checkout page only". It is edited in the Wave 21 task that adds Stripe as a processor, not here.
- **Better Auth plugin.** `@better-auth/stripe` creates subscriptions through Stripe's Checkout [BA-stripe]. Whether it supports a site-hosted page (Elements or embedded Checkout) or the Stripe SDK route is required is **not found**; the proof of concept must test it.

### Testing the Integration

`stripe-mock` is Stripe's local fake API. It is stateless: it checks requests against the API spec and returns fixed replies, and it sends no webhooks [S-mock]. It cannot test subscription renewals. I recommend a scheduled run against Stripe's real test mode using test clocks, which move a test subscription through time [S-clocks]. Webhooks are not delivered in order, so the handler has to dedupe on the event id [S-wh].

### Better Auth Plugin Note

`@better-auth/stripe` lists peer dependency ranges newer than the versions of `stripe` and `better-auth` the repository pins, so using the plugin means a bump [BA-stripe]. DESIGN.md §13 names the plugin's two structural costs: its tables sit outside `withAudit`, and its routes sit outside `/api/graphql`. The alternative is a thin service over the Stripe SDK with audited tables of its own; the spike is meant to settle it. With the site-hosted checkout page, the spike must also test whether the plugin supports that page or whether the SDK route is required.

**Proof-of-concept item: which form on the checkout page.** Choose between Stripe Elements (the site's own form around Stripe's card fields) and embedded Checkout (Stripe's whole form shown inside the site's page). Both load Stripe.js on that one page. No recommendation: Lane F's sources do not give one.

## Break-Even

**Method.** Sizes are paying seats: 100, 1,000, 10,000 and 100,000. Revenue = paying units × price × (1 − 6.1%), the single-month churn haircut, a crude stand-in for steady-state churn. Paying units are paying seats for (b), (g), (h) and (i) (whose per-seat revenue is built in their sections), and paying covens (seats × 1.2 memberships ÷ 5.5 members) for (c). Fees are Stripe's option 1 (2.9% + 30¢, 0.7% Billing, 0.5% Tax Basic) on that revenue, and Washington retailing B&O of 0.471% less the $55 a month credit. Sales tax is passed through to the customer, so it is neither revenue nor cost. Trial, curator, exempt and demo-only accounts earn nothing and are in the cost side. The cost lines come from running-costs.md: (i) cash, (ii) cash + all labour hours, with fixed (engineering) hours at the BLS Washington developer median of $80.07, loaded to $100.88, and variable (customer-service) hours at the $41.47 living wage without health cover, loaded to $53.80, (iii) cash + the owner's job as salary structure A (a $250,000 gross salary plus the employer's payroll taxes, so the line reads as a standard employee's cost) with Lane D's benefits, $287,423 a year (low) or $323,826 (high), plus hired hours at the loaded $53.80 for every hour above 160 a month. Support agents use AI assistance (on by default, factor 0.87 on support minutes), and each agent beyond the owner has a Claude Team seat at $25 a month; those seats are inside every labour line. Labour hours grow with paying seats (below), and every labour result is shown for the low contact-rate row (the primary case) and the median row (the stress case). **Net revenue a month**, after churn, fees and B&O:

| Model                                           | Price per paying unit |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | --------------------: | ---: | -----: | ------: | -------: |
| (b) Each user pays                              |                 $4.00 | $332 | $3,320 | $33,081 | $330,316 |
| (c) Base plus seats                             |                 $9.83 | $187 | $1,870 | $18,657 | $186,075 |
| (g) Group plan includes a solo coven (over (c)) |                 $2.38 | $203 | $2,026 | $20,212 | $201,628 |
| (h) Flat seats, $3 / $1 (illustrative)          |                 $3.13 | $271 | $2,714 | $27,055 | $270,058 |
| (h) Flat seats, $2.24 / $1 (calibrated to (g))  |                 $2.38 | $203 | $2,035 | $20,297 | $202,471 |
| (i) One price list                              |                 $3.05 | $252 | $2,520 | $25,123 | $250,736 |

#### Option 2, Managed Payments

| Model                                           |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | ---: | -----: | ------: | -------: |
| (b) Each user pays                              | $321 | $3,208 | $31,954 | $319,048 |
| (c) Base plus seats                             | $181 | $1,809 | $18,053 | $180,034 |
| (g) Group plan includes a solo coven (over (c)) | $196 | $1,959 | $19,543 | $194,931 |
| (h) Flat seats, $3 / $1 (illustrative)          | $263 | $2,626 | $26,173 | $261,238 |
| (h) Flat seats, $2.24 / $1 (calibrated to (g))  | $197 | $1,968 | $19,627 | $195,776 |
| (i) One price list                              | $243 | $2,434 | $24,265 | $242,155 |

**Y means net revenue covers the cost line**, for (i) / (ii) / (iii). Low contact-rate row (primary):

| Model                                           |   100 |  1000 | 10000 | 100000 |
| ----------------------------------------------- | ----: | ----: | ----: | -----: |
| (b) Each user pays                              | Y n n | Y Y n | Y Y Y |  Y Y Y |
| (c) Base plus seats                             | n n n | Y n n | Y Y n |  Y Y Y |
| (g) Group plan includes a solo coven (over (c)) | n n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $3 / $1 (illustrative)          | n n n | Y n n | Y Y Y |  Y Y Y |
| (h) Flat seats, $2.24 / $1 (calibrated to (g))  | n n n | Y n n | Y Y n |  Y Y Y |
| (i) One price list                              | n n n | Y n n | Y Y Y |  Y Y Y |

Median row (stress case):

| Model                                           |   100 |  1000 | 10000 | 100000 |
| ----------------------------------------------- | ----: | ----: | ----: | -----: |
| (b) Each user pays                              | n n n | Y n n | Y Y Y |  Y Y Y |
| (c) Base plus seats                             | n n n | Y n n | Y n n |  Y Y Y |
| (g) Group plan includes a solo coven (over (c)) | n n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $3 / $1 (illustrative)          | n n n | Y n n | Y Y n |  Y Y Y |
| (h) Flat seats, $2.24 / $1 (calibrated to (g))  | n n n | Y n n | Y Y n |  Y Y Y |
| (i) One price list                              | n n n | Y n n | Y Y n |  Y Y Y |

**Seats needed to break even.** The smallest number of paying seats whose net revenue covers each cost line. The cost line is interpolated linearly between the four sizes (and continued on the last slope above 100,000), because overhead and usage grow with seats; the answer is therefore exact at the four sizes and approximate between them.

| Model                                           | (i) | (ii) low | (iii) low | (ii) median | (iii) median |
| ----------------------------------------------- | --: | -------: | --------: | ----------: | -----------: |
| (b) Each user pays                              |  94 |      953 |     7,351 |       2,568 |        9,759 |
| (c) Base plus seats                             | 168 |    1,852 |    13,629 |      11,431 |       43,433 |
| (g) Group plan includes a solo coven (over (c)) | 155 |    1,681 |    12,399 |       8,320 |       31,578 |
| (h) Flat seats, $3 / $1 (illustrative)          | 115 |    1,196 |     8,995 |       3,793 |       14,345 |
| (h) Flat seats, $2.24 / $1 (calibrated to (g))  | 154 |    1,673 |    12,339 |       8,199 |       31,117 |
| (i) One price list                              | 124 |    1,302 |     9,690 |       4,480 |       16,958 |
| (i) with a card required (sensitivity)          | 124 |    1,293 |     9,687 |       4,466 |       16,927 |

The card-required row is `node scripts/billing-model.mjs --card`, an optional flag that changes no default. It sets trial conversion to 0.3, the middle of ChartMogul's card band [G7], and scales trial seats per paying seat by 2.5 ÷ 8.5, the card against no-card visitor-to-trial rates [G15]. Trial seats fall from 89% to 9% of paying seats. Break-evens move by 0.7% or less, because trial seats are a small part of cost, and the cash break-even does not move. The flag prices what a card does to trial seats only; it does not lower paying seats, which is the 21% loss above.

**Labour and the One-Person Ceiling.** Hours a month = fixed hours + variable hours × (paying seats ÷ 1,000), where the fixed hours are 24.8 / 44.4 / 70.4 (low / median / high; all engineering work) and the variable hours per 1,000 seats, after the AI factor of 0.87 on support minutes, are 6.08 / 26.6 / 100.3 (support, disputes, privacy requests and abuse reports; all customer-service work). Without AI assistance they would be 6.95 / 30.3 / 113.0. Disputes are 0.25 / 2.0 / 5.0 hours each. Hours are **25.4 / 30.9 / 85.6 / 632.7** at 100 / 1,000 / 10,000 / 100,000 paying seats in the low row, and **47.1 / 71.0 / 310.7 / 2,707.4** in the median row (high row: 80.4 / 170.7 / 1,073.5 / 10,100.9). Contacts are counted on 25% of all accounts, demo-only accounts included. That overstates the contacts of an invite-gated site, and is kept as the conservative choice.

**AI assistance for support agents (on by default).** The factor on minutes per support contact is 0.87 (median) in the primary case, with 0.735 (low) and 1.00 (high, no gain) as sensitivities. It rests on Brynjolfsson, Li and Raymond (QJE 2025): resolutions per hour up 15.2% on average, handle time down 8.5%, a large gain for the least experienced and almost none for the top fifth. The assistant helps an agent answer; it deflects no contact, so the factor changes minutes, not contact counts, and it applies to the support part of the variable hours only. Each support agent beyond the owner has a Claude Team seat at **$25 a month** (the plan has a 2-seat minimum, so the first agent costs $50), one agent per further 160 hours a month, rounded up. The seats are inside every labour line and are 0 / 0 / 0 / 3 in the low row and 0 / 0 / 2 / 16 in the median row at the four sizes. **Privacy condition:** agents use the Team plan, never Pro. The consumer terms (Pro) train a model on inputs unless a person opts out, and customer messages must not train a model; Anthropic's privacy centre states "By default, we will not use your inputs or outputs from our commercial products (e.g. Claude for Work, Anthropic API, Claude Gov, etc.) to train our models", with exceptions for thumbs-up/down feedback and data a user chooses to share, which a Team or Enterprise plan's Owner can disable through the Rate chats setting ([S53], updated 2026-08-18, fetched 2026-11-06). The page names Team only as "Claude for Work"; the help-centre collection tying that name to the Team plan was seen in a search result only and is unverified. **Owner to confirm** that Team is Claude for Work, and to turn off Rate chats for support agents. Using Team is consistent with the Code of Ethics line that the site sells no data. Sensitivity of the main results to the factor:

| Factor          | One-person ceiling (low / median / high row) | (b) cash + labour, low / median | (c) cash + labour, low / median | (g) cash + labour, low / median |
| --------------- | -------------------------------------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| 0.735           | 26,128 / 5,059 / 1,028                       | 915 / 2,285                     | 1,879 / 9,121                   | 1,653 / 6,564                   |
| **0.87 (used)** | **22,241 / 4,341 / 893**                     | **930 / 2,532**                 | **1,943 / 15,123**              | **1,703 / 9,170**               |
| 1.00            | 19,453 / 3,819 / 793                         | 945 / 2,827                     | 2,008 / 41,631                  | 1,753 / 14,906                  |

**What a labour hour costs.** Support hours cost a loaded **$53.80**: the $41.47 wage plus employer payroll taxes and benefits (low $50.92, high $56.68; the arithmetic is in running-costs.md). Engineering hours cost a loaded **$100.88** ($94.56 to $107.20) on the $80.07 developer wage. Variable labour is **$0.33 a paying seat a month in the low row** (6.08 h ÷ 1,000 × $53.80) and **$1.43 in the median row** (26.6 h ÷ 1,000 × $53.80); at the loaded BLS market rate ($32.27) they would be $0.20 and $0.86. Fixed labour is $2,502 a month in the low row and $4,479 in the median row (at Lane D's $122.50 contractor rate, unloaded: $3,038 and $5,439). Labour alone at 10,000 paying seats is $5,772 (low) or $18,857 (median); cash + labour is $6,098 (low) or $19,182 (median), against $4,789 and $13,448 at the market support rate and $6,634 and $20,142 with contractor engineering. Cash + the structure A job (low benefits) + hired hours is $24,277 (low) or $32,435 (median) at 10,000 seats, and $50,634 (low) or $162,581 (median) at 100,000. The earlier version of this document priced every hour at the $122.50 contractor rate and used the median contact rate, which gave $3.87 a paying seat and a finding that no model could break even on labour. That rate was an engineering rate applied to support work, and the finding is withdrawn.

**One-person ceiling.** At **22,241** paying seats in the low row (**4,341** median; **893** high) the work exceeds one person at 160 hours a month. It holds for every model, since hours depend on paying seats, and it does not depend on the hourly rates (it does depend on the AI factor, above). The salary line pays the structure A job plus hired hours above 160 at the loaded $53.80. Fixed engineering hours (at most 70.4) never reach 160 on their own, so the hired hours are the variable, customer-service ones.

**Who does the hours (the salary line).** The owner takes every hour up to 160 a month, engineering and support alike, and the site hires only the hours above 160. The "cash" line is the owner doing the same hours unpaid. At 100, 1,000 and 10,000 paying seats in the low row the owner does every hour and nothing is hired; hiring starts at 10,000 seats in the median row (311 hours) and at 100,000 in both rows. The first hired role is support, at the loaded living wage of $53.80 an hour, because the owner keeps engineering. A hired hour is priced at that rate, plus the Claude Team seats for support agents.

| Paying seats | Row    | Total hours | Owner's hours (min of total and 160) | Hired hours (total less 160, not below 0) | Cost of hired hours a month |
| -----------: | ------ | ----------: | -----------------------------------: | ----------------------------------------: | --------------------------: |
|          100 | low    |        25.4 |                                 25.4 |                                         0 |                          $0 |
|          100 | median |        47.1 |                                 47.1 |                                         0 |                          $0 |
|        1,000 | low    |        30.9 |                                 30.9 |                                         0 |                          $0 |
|        1,000 | median |        71.0 |                                 71.0 |                                         0 |                          $0 |
|       10,000 | low    |        85.6 |                                 85.6 |                                         0 |                          $0 |
|       10,000 | median |       310.7 |                                  160 |                                     150.7 |                      $8,158 |
|      100,000 | low    |       632.7 |                                  160 |                                     472.7 |                     $25,508 |
|      100,000 | median |     2,707.4 |                                  160 |                                   2,547.4 |                    $137,455 |

The cost of hired hours is the hired hours at $53.80 plus the Claude Team seats ($25 each; 2, 3 and 16 seats in the three rows that hire). It is the salary line's total less cash costs and the $23,952 job.

**What you earn before the salary is affordable (model (i), final inputs).** Until the site can pay the structure A job, the owner does every hour up to 160 a month (engineering first) and is paid for them from what is left of net revenue. The hours are valued at the loaded rates the labour line uses: support $53.80 and engineering $100.88 an hour. The draw is the smaller of that value and net revenue less cash costs and less any hired help, and never below zero. The hourly figure is the draw divided by the owner's hours. All figures are a month.

| Paying seats | Row    | Owner's hours | Value of those hours | Left after cash costs (and hired help) | Draw a month | Draw an hour |
| ------------ | ------ | ------------: | -------------------: | -------------------------------------: | -----------: | -----------: |
| 100          | low    |          25.4 |               $2,535 |                                   -$58 |           $0 |        $0.00 |
| 100          | median |          47.1 |               $4,622 |                                   -$58 |           $0 |        $0.00 |
| 1,000        | low    |          30.9 |               $2,829 |                                 $2,169 |       $2,169 |       $70.24 |
| 1,000        | median |          71.0 |               $5,912 |                                 $2,169 |       $2,169 |       $30.54 |
| 10,000       | low    |          85.6 |               $5,772 |                                $24,730 |       $5,772 |       $67.44 |
| 10,000       | median |         160.0 |              $10,699 |                                $16,572 |      $10,699 |       $66.87 |
| 100,000      | low    |         160.0 |               $9,776 |                               $223,983 |       $9,776 |       $61.10 |
| 100,000      | median |         160.0 |              $10,699 |                               $112,035 |      $10,699 |       $66.87 |

At 100 seats the site does not cover its cash costs, so the draw is nothing: the site is $58 short of its cash costs. The salary line becomes affordable at (i)'s cash + job break-even: 9,690 paying seats in the low row and 16,958 in the median row. From 10,000 seats the draw is the full value of the owner's hours. At 100,000 seats hired help is bought first and the owner still does 160 hours.

What the tables say (the restricted discount and the observer price are in (c) and so in (g)): with no free tier and the withdrawn 4% share gone, every model covers cash costs by 94 to 168 paying seats ((h) at $3 / $1: 115; (i): 124). **In the low row every model also covers cash + labour**: (b) at 953 paying seats, (h) at $3 / $1 at 1,196, (i) at 1,302, (h) at $2.24 / $1 at 1,673, (g) at 1,681 and (c) at 1,852. **In the median row** (b) needs 2,568 and (h) at $3 / $1 3,793, both under the one-person ceiling of 4,341 paying seats, but (i) needs 4,480, just beyond it, and (h) at $2.24 / $1 needs 8,199, (g) 8,320 and (c) 11,431, well beyond it. The reason is the margin: net revenue per paying seat at 10,000 seats is $3.31 for (b), $1.87 for (c), $2.02 for (g), $2.71 for (h) at $3 / $1 and $2.03 at $2.24 / $1, $2.51 for (i), and median variable labour of $1.43 a seat leaves (c) only $0.44. This is driven by the support contact rate, the number to check first (the owner kept the modelled rates). Model (g), over (c), needs 155 seats on cash. Model (b) needs the fewest seats because it counts people, not covens, and prices each at $4.00. The two owner decisions of 2026-11-06 (discount for paying stewards only, cheaper observer seats) lowered (c) from $10.58 to $9.29 per coven at 30% observers; the owner's later estimate of 20% observers raised it to $9.83, and its cash break-even is 168 paying seats. These counts leave out the overhead's cost _growth_ beyond what the cost lines already include, and they take paying seats as given: how many people would pay is the thing no source answers for this site.

### Low-Support Scenario

The low row is the primary case. Kanka, Pinboard and Plausible fit only the low row, and it holds only if self-service help ships before billing opens. What the site has to do to earn it:

- **A self-service help centre in front of the contact form.** Lane I found knowledge-base deflection of 25 to 35% of tier-1 contacts (the Stealth Agents aggregator, attributed to Zendesk), a FAQ and video in front of the contact form for Pedometer++ (David Smith, Design Notes 30, 2023-03-06), and the same pattern at Kanka, Pinboard and Plausible.
- **Answers inside the app**, next to the screen they are about, so a question is answered before it becomes a contact.
- **Community help in the demo coven**, where practitioners answer each other's questions.
- **No support promise on trial and observer seats.** Contacts are counted on all active accounts; a promise attached to a seat that pays nothing adds contacts without revenue.
- **Annual billing**, which cuts disputes. Lane I's figures give roughly twelvefold fewer charges in a year, so roughly twelvefold fewer chances for a dispute (derived).

A Wave 21 support-reduction task will be minted by M17.1 to build these (no id yet). Until it ships, the median row is the safer planning figure.

### Prices That Clear Labour

The practitioner (or account) price at which net revenue covers labour at 10,000 paying seats. Observers are held at $1 and the solo prices scale in proportion; in (i) the figure is the each-member-pays practitioner seat, and the coven-pays base and extra seat and the personal plan scale with it in proportion (the $1 discount stays fixed). "Cash + labour" prices labour at the loaded $53.80 and $100.88; "cash + job" is the structure A job plus hired hours. The comparables range is **$1.58 to $5.99** (solo grimoire apps $1.58 to $3.33; Obsidian $4 to $5; Roll20 Plus $5.99). Wider references: Figma's collaborator seat at $3 against $16 for a full seat [S6], and the RevenueCat median of $10 [S34].

| Model                | Today | Cash + labour, low | Cash + labour, median | Cash + job, low | Cash + job, median |
| -------------------- | ----: | -----------------: | --------------------: | --------------: | -----------------: |
| (b) Each user pays   | $4.00 |      $1.00 (below) |        $2.46 (inside) |  $3.03 (inside) |     $3.94 (inside) |
| (c) Base plus seats  | $2.00 |      $0.54 (below) |        $2.07 (inside) |  $2.67 (inside) |     $3.62 (inside) |
| (g) Group plan, solo | $2.00 |      $0.58 (below) |        $1.90 (inside) |  $2.41 (inside) |     $3.23 (inside) |
| (h) Flat seats       | $3.00 |      $0.65 (below) |        $2.12 (inside) |  $2.70 (inside) |     $3.61 (inside) |
| (i) One price list   | $3.00 |      $0.81 (below) |        $2.33 (inside) |  $2.91 (inside) |     $3.85 (inside) |

"Below" means the clearing price is under the lowest comparable ($1.58), so today's price already clears. For (c) and (g) the figure is the practitioner seat price and the base scales with it; for (g) the scale factors are 0.295 (low) and 0.952 (median). These use the AI factor of 0.87; at 0.735 the median-row cash + labour prices for (b), (c), (g), (h) and (i) are $2.22, $1.82, $1.69, $1.89 and $2.08, and at 1.00 they are $2.67, $2.29, $2.09, $2.33 and $2.54. Every price that clears cash + labour or cash + job falls inside the comparables range, so none requires a price the market does not already charge. The 10,000-seat size is the model's assumption, not a forecast.

## Questions for the Owner

There are none open. The owner answered every question on 2026-11-06, and the answers are recorded under "Owner Decisions Recorded for the Design Record" and, for the tax structure, in [running-costs.md](running-costs.md#salary-structures-lane-j). **Nothing is waiting on you.**

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
- S53 https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
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
- S-sec https://docs.stripe.com/security/guide (fetched 2026-11-06)
- S-clocks https://docs.stripe.com/billing/testing/test-clocks
- S-wh https://docs.stripe.com/webhooks
- BA-stripe https://www.npmjs.com/package/@better-auth/stripe
- P-aup https://www.paddle.com/support/aup
- PO-aup https://polar.sh/docs/merchant-of-record/acceptable-use
- C-proh https://docs.creem.io/merchant-of-record/account-reviews/account-reviews.md
- D-proh https://docs.dodopayments.com/miscellaneous/merchant-acceptance.md
- LS-proh https://docs.lemonsqueezy.com/help/getting-started/prohibited-products

Overhead sources [G1] to [G14] and their URLs are in [running-costs.md](running-costs.md#sources). Running-cost sources are numbered in [running-costs.md](running-costs.md#sources).
