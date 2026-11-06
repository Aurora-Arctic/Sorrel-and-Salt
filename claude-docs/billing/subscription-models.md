# Subscription Models

**Status:** research, no decision made · **Date:** 2026-11-06 · **Task:** M17.1

**The owner withdrew the free tier on 2026-11-06.** The owner's decision: there is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The size steps below count **paying seats**; trial, curator, exempt and demo-only accounts are overhead derived from them ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

This page compares six ways to charge for Sorrel & Salt, prices each against the running costs in [running-costs.md](running-costs.md), and ends with the questions I need you to answer. It does not choose a model. **You need to act:** the last section lists what I need you to decide.

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
- **Viewers and solo covens (2026-11-06).** "Viewers don't get solo covens." In (g) only a paid practitioner or steward seat includes a free solo coven; an observer seat does not. Revenue is unchanged; the free-coven storage cost counts practitioner seats only (70% of paid seats under the 30% observer assumption), and the break-even row for (g) was unchanged at 129 / 3,223 / 12,858 before the next decision.
- **Observers add a solo coven (2026-11-06).** "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99." The observer pays the solo price less $1 on their own subscription (person-level price on the Stripe side); take-up 20% (assumption). (g) then needs 125 / 3,104 / 12,381 paying seats.
- **Observer price (2026-11-06).** "Also viewers should get a cheaper price point." The modelled price is $1 against $2 for a practitioner seat, with 30% of members observers; both numbers are my assumptions (question 19).

## How Each Model Meets R1 to R5

| Model                                | R1 coven pays   | R2 scales with members | R3 free months                           | R4 keeper exemption | R5 pays less in several covens                  |
| ------------------------------------ | --------------- | ---------------------- | ---------------------------------------- | ------------------- | ----------------------------------------------- |
| (a) Coven pays, seat bundles         | kept            | kept in steps          | kept                                     | kept                | **altered**                                     |
| (b) Each user pays                   | **dropped**     | **altered**            | **altered**                              | **altered**         | kept                                            |
| (c) Base plus seats                  | kept            | kept                   | kept                                     | kept                | kept (as a seat discount, paying stewards only) |
| (d) Solo rung                        | kept            | not applicable         | kept                                     | kept                | kept (smallest step of the model that holds it) |
| (e) Any member pays                  | **altered**     | **dropped or altered** | kept                                     | kept                | kept (in its own form)                          |
| (g) Group plan includes a solo coven | kept (over (c)) | kept (over (c))        | kept                                     | kept                | kept (a member's solo coven is free)            |
| (f) Trial only + curator covens      | kept, as policy | not applicable         | **altered** (one month, keeper-settable) | **altered** (timed) | not applicable                                  |

**No comparable discounts a seat across groups.** Notion bills a person once per paid workspace they belong to, "even if the same people are in multiple workspaces" [S3]. GitHub bills each organisation separately [S7]. R5 therefore has no consumer precedent as a seat discount, and none restricts one to people who pay for another group. The nearest thing is Kanka, where one payment covers several campaigns and the price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7) [S19].

**The keeper exemption (R4)** is a flag on the coven in (a), (c), (d) and (e). In (b) it must be a flag on the person, or an exemption that waives every member of a flagged coven. Nothing in the comparables does this; it is an internal rule. In Stripe it is a 100%-off coupon on the subscription, or no subscription at all.

## The Models

### (a) Coven Pays, Seat Bundles

**Structure.** The steward buys a bundle that covers a fixed number of members: 1 (solo), up to 5, up to 13, unlimited. A coven that crosses a bundle edge moves up a step.

**Price points.** Basecamp charges $29 for 5 users, $79 for 10 and $99 for 15, "no per-user fees" [S4]. Household bundles cost $5.99 to $27.95 for 5 to 6 people and take 70% to 78% off the per-head price [S9] [S10] [S11] [S12]. Kanka charges $9.99 for 3 campaign slots [S19]. I price each step separately (all four prices are assumptions, flagged for the owner): **$2.99** for 1 member, anchored on Bear at $2.99 [S15] (Neumoire is $1.99 [S29], Grimoire $4.99 [S28]); **$7.99** for up to 5, between Kanka's $4.99 for one campaign and $9.99 for three [S19] and inside the $5.99 to $27.95 household bundles [S9] to [S12]; **$11.99** for up to 13, above Kanka's $9.99 [S19] and well under Basecamp's $29 for 5 users [S4], with D&D Beyond's $5.99 for 12 people [S18] as the floor; **$16.99** for unlimited, below Kanka's $24.99 for 7 campaigns [S19].

**Assumed spread of coven sizes.** No distribution was researched. I chose shares of paying covens per step so that the mean membership matches the 5.5-member tabletop mean [S45]: 6% solo, 50% in the 2 to 5 step, 42% in the 6 to 13 step, 2% above 13. The mean members in each step (1, 4, 7.5, 16) are my own guesses, and they give 5.53. Revenue per coven = Σ share × step price:

| Step             |  Price | Share of covens | Mean members | Price x share |
| ---------------- | -----: | --------------: | -----------: | ------------: |
| 1 member (solo)  |  $2.99 |           6.00% |            1 |       $0.1794 |
| Up to 5 members  |  $7.99 |          50.00% |            4 |       $3.9950 |
| Up to 13 members | $11.99 |          42.00% |          7.5 |       $5.0358 |
| Unlimited        | $16.99 |           2.00% |           16 |       $0.3398 |
| Total            |        |         100.00% |         5.53 |       $9.5500 |

So (a) earns **$9.55** per paying coven on average, down from the $9.99 flat figure used before. A different spread changes this directly: moving 10 points of covens from the 6 to 13 step to the 2 to 5 step lowers it by $0.40.

**R1 to R5.** R1 kept. R2 kept, in steps. R3 kept: a trial per coven; Slack gives new teams 50% off for 3 months [S1]. R4 kept. **R5 altered:** a bundle has no per-member charge to discount, so "pays less" becomes a discount on the second and later coven bundle of one paying steward, which is the owner's definition of R5. Bundles count members regardless of role, so they have no cheaper observer price.

**Multi-coven discount and keeper exemption.** The discount is a coupon on the second and later bundle of one steward. A keeper exemption is a coupon or no subscription.

**Stripe objects.** Product, one Price per bundle (flat), Subscription, Coupon, Customer, Customer Portal.

**Reception.** For: households accept one payer for 5 to 6 people [S9] to [S12]; Basecamp and Flipper Cloud sell bundles against per-seat pricing [S4] [S5]. Against: a coven at a bundle edge pays a step, and Flipper reports no results from its move [S5].

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

**Deriving the discount's reach (derived).** Stewards are one per coven, so the share of accounts that are paying stewards is covens per account = 1.2 memberships ÷ 5.5 members per coven = **21.8%**. A seat is a second or later membership for (1.2 − 1) ÷ 1.2 = 16.7% of seats. I take the two as independent, so 16.7% × 21.8% = **3.6% of seats** are discounted, and the average seat is charged 1 − 3.6% × 50% = 0.9818 of its price. At 5.5 members that is 3.85 practitioners and 1.65 observers per coven, so $6 + ($2 × 0.85 extra practitioners + $1 × 1.65 observers) × 0.9818 = **$9.29 per coven**.

**R1 to R5.** All five kept. R5 is a seat discount on the second coven's invoice, for a seat held by a person who is the paying steward of another coven (the owner's answer, 2026-11-06, to what DESIGN.md §13 left open). A member who holds a seat elsewhere but pays for no coven pays the full seat price.

**Multi-coven discount.** Needs a Stripe coupon on the second coven's seat line, or a lower seat price. The discount follows the person across customers, which Stripe does not do by itself; the service has to compute it, and it applies only while that person is the paying steward of another active coven.

**Stripe objects.** Product, a base Price, a per-seat Price (quantity), Subscription with quantity, Coupon (up to 20 stacked, can be added after checkout), Customer Portal.

**Reception.** For: meets every want; the cheap-observer seat and active-only billing both have precedents [S6] [S1]. Against: Notion's practice is the opposite of R5 [S3], and per-seat pricing draws the complaints in "Per Seat Pricing Sucks" (a vendor's opinion, no data) [S5].

### (d) Solo Rung

**Structure.** A one-member coven at a low price. It sits inside (a), (b) or (c) as the smallest step.

**Price points.** Bear $2.99 a month [S15]; Day One $49.99 a year [S16]; Grimoire $4.99 a month [S28]; Neumoire $1.99 a month [S29]. Notion, Kanka and Obsidian are free for one person [S2] [S19] [S13]. I model **$2.50 a month** (assumption).

**R1 to R5.** All kept as the smallest case of the holding model.

**Multi-coven discount and keeper exemption.** A solo coven is one coven; no discount applies. Exemption is as in (a).

**Stripe objects.** One more Price on the same Product.

**Reception.** Most practitioners are solitary: 79% in 2010 [S49], the "dominant group" [S50], and "the majority … have abandoned … practicing in groups" [S51]. Every witchcraft app I found except Witchy Coven is built for one person [S31]. Against: the 79% figure is from 2010, and neo-paganism.org attributes it to "a Pagan census" without a link I could check.

### (e) Any Member Pays

**Structure.** Any member may buy a subscription that covers a coven. One subscription can cover several covens, with tiers by coven count.

**Price points.** Kanka sells 1, 3 and 7 campaigns for $4.99, $9.99 and $24.99 [S19]; D&D Beyond's $5.99 Master plan shares with up to 12 people, and the subscriber need not be the DM [S18]; any Discord member may boost a server [S8]. I model **$5.64 a month per covered coven** (derived: 87% of Kanka payers at $4.99 and 13% at $9.99, [S20] and [S19]).

**R1 to R5.** R1 **altered**: any member, not only the steward, may pay. R2 **dropped or altered**: tiers by coven count, optionally a member cap. R3 and R4 kept. R5 kept in its own form: the more covens a payer covers, the less each costs.

**Multi-coven discount.** Built in, as a tier.

**Stripe objects.** Product, tiered Price, Subscription with quantity (covers), a link table from covers to covens, Customer Portal. The link table must be audited like any other write.

**Reception.** For: the closest hobby comparables use it [S8] [S18] [S19]; Kanka's survey found 99% saying merged boosts simplified the system [S20]. Against: R2 as written does not hold; I found no data on how often a non-owner pays.

### (f) Trial Only Plus Curator Covens

**Structure.** Not a price. It is the free-things policy every model (a) to (e) carries once the free tier is gone: a new coven gets a trial with no card (one month, longer if a keeper sets it), each site curator holds a free coven of 7 seats, a keeper may exempt a coven for a stated time, and the demo coven's observer seat and the public compendium stay free. Nothing else is free.

**Why it has no break-even row of its own.** It adds cost (trial, curator and exempt seats, plus the demo-only accounts) and no revenue, so it is already inside every other model's cost side ([running-costs.md](running-costs.md#overhead-on-top-of-paying-seats)).

- **Trial conversion without a card** is 4% to 6% ("good") and 10% to 15% ("great") within six months; with a card it is 25% to 35% [G7]. The owner chose no card, so the model uses 10%. A trial with no card needs 76% to 89% of the paying seats again in trial seats, at a steady state.
- **Cutting a free tier later is costly** (Evernote 2023 [S35] [S36]; Slack 2022, a competitor's claim [S37]; Heroku [S38]). Starting with none avoids that cut.
- **Reception of no free tier.** I found no source that measures harm from having none. Retention after one year was "nearly identical" for hard-paywall and freemium apps [S34].
- **Curator coven precedent.** Community products include 2 to 15 staff seats in a plan [G10] to [G12]; none gives a seat count free by the platform to its own curators. Ghost lets a publisher comp any member for a week, a month, six months, a year or forever [G13]; GitHub re-checks free eligibility every month [G14]. The re-check is the nearest precedent for a timed exemption.

### (g) Group Plan Includes a Solo Coven

**Structure.** Owner request, 2026-11-06: "Group plan includes solo coven, a solo coven price should be found." Every paid practitioner or steward seat in a group coven also gives that member a free solo coven of their own. An observer seat does not (owner, 2026-11-06: "Viewers don't get solo covens."). A person with no paid group seat buys a solo coven alone. (g) is a layer over a group model; I model it over **(c)** (base plus seats), and it could sit over (a) the same way.

**Solo coven price proposals** (all assumptions, anchored on the solo comparables in section "Solo and Personal Spaces"; Day One is $49.99 a year, about $4.17 a month [S16]):

- **$1.99 a month**, Neumoire's price [S29]. Lowest barrier to entry, but it earns the least and the cheapest comparable is not the one that is known to last.
- **$2.99 a month**, Bear's price [S15]. Matches the best-known solo journal at a price people already accept; this is the one I modelled.
- **$4.99 a month**, Grimoire's price [S28], close to Day One's $4.17 [S16]. Earns the most per solo buyer, and sits at the price where a solo coven costs more than a group seat's share ($2.03).

**Assumptions in the model.** A paying seat is either a group seat (priced as (c): $9.29 per coven, 1.2 memberships per account, 5.5 members per coven, so $2.03 per seat) or a solo coven bought alone. I assume 20% of paying accounts buy a solo coven alone (range 10% to 40%; no source). Revenue per paying seat = 80% × $9.29 × 1.2 ÷ 5.5 + 20% × $2.99 = $1.621 + $0.598 = **$2.22**. Stripe's 30¢ fixed fee is charged per subscription: 0.8 × 1.2 ÷ 5.5 group subscriptions plus 0.2 solo subscriptions per paying seat.

**Observers add a solo coven by paying the difference (owner, 2026-11-06: "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99.").** An observer seat costs $1, so an observer adds a solo coven for the solo price less $1: **$1.99** a month at the modelled $2.99. If you pick $1.99 or $4.99 as the solo price, the difference is $0.99 or $3.99. The observer pays it themselves, as their own subscription, not on the coven's invoice, so Stripe needs a person-level price for it (the person is a customer of their own, separate from the coven's steward). Take-up is an assumption: **20% of observers add one** (range 5% to 40%; no source). Per paying seat that is 80% in group covens × 30% observers × 20% take-up = 0.048 add-ons × $1.99 = **$0.095**, which brings revenue per paying seat to $2.22 + $0.095 = **$2.31**. Each add-on is also one more subscription (30¢ fixed fee) and one more free-sized coven of storage.

**Cost of the free solo covens.** Each paid practitioner or steward seat (80% of paying seats, times the 70% that are not observers: 56%) holds one more coven (observers who add a solo coven add theirs: 0.048 per paying seat), of the average size the cost model already uses (about 115 KB of spells and ingredients each, from the running-costs ratios). The free covens add stored data and nothing else: sessions, and so function calls, mail and tracing, are counted per account and do not change. The extra Neon storage is $0.00 / $0.04 / $0.43 / $4.28 a month at 100 / 1,000 / 10,000 / 100,000 paying seats. It is added to every cost line for (g).

**What it shows.** The free solo covens cost almost nothing, so the model's result depends on the assumed 20% who buy a solo coven alone and on the solo price:

| Solo coven price                 | Revenue per paying seat | Net at 100 | Net at 1000 | Net at 10000 | Net at 100000 | (i) |  (ii) |  (iii) |
| -------------------------------- | ----------------------: | ---------: | ----------: | -----------: | ------------: | --: | ----: | -----: |
| $1.99                            |                 $2.0669 |       $174 |      $1,742 |      $17,386 |      $173,361 | 141 | 3,503 | 13,978 |
| $2.99                            |                 $2.3149 |       $197 |      $1,966 |      $19,608 |      $195,584 | 125 | 3,104 | 12,381 |
| $4.99                            |                 $2.8109 |       $241 |      $2,412 |      $24,052 |      $240,030 | 101 | 2,528 | 10,079 |
|                                  |                     100 |       1000 |       10000 |       100000 |
| Cost of free solo covens a month |                   $0.00 |      $0.04 |       $0.43 |        $4.28 |

The columns (i), (ii) and (iii) are seats to break even on cash, cash + contractor maintenance, and cash + a full-time job.

### New Requirements Beyond DESIGN.md §13

The no-free-tier decision departs from §13 in four places. **I need you to accept each before a task is minted.**

1. **A per-coven trial length that a keeper can set.** Standard one month; longer for promotions and beta testers.
2. **A curator's free coven of 7 seats**, the curator included, one curator per 1,000 paying seats and at least 2.
3. **Timed exemptions.** A keeper's exemption has an end date. "Permanent" is the exception: it needs confirmation, is listed on the keeper billing page, and can be revoked.
4. **The demo coven's observer seat stays free** (already in §5; recorded here so billing never charges it).

## Solo and Personal Spaces

**Demand.** See (d): most practitioners practise alone [S49] [S50] [S51].

**What comparables do.** Notion gives a single-member workspace with no block limit [S2]. Figma has free Drafts [S6]. GitHub has a free personal account beside organisations [S7]. Obsidian is a free local vault [S13]. Kanka and Basecamp have no personal type: a solo user is a group of one [S19] [S4]. Slack has no personal space [S1].

**What reintroducing a personal `kind` would change.** CLAUDE.md says there are no personal workspaces: no `kind` column, every coven can take members and be deleted by a steward. Under the current rule, a solo user is a coven of one, which is how Kanka and Basecamp work. Adding a `kind` would let a personal space be free and undeletable, and would let it not take members. It would also add a `kind` check to every membership rule, the invitation service and the demo coven's deletion rule. **This is a change you would have to accept; I have made none.** I recommend no `kind`: model (d) as a one-member coven gives the same price point without a schema change.

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

`@better-auth/stripe` lists peer versions of `stripe` ^18 to ^23 and `better-auth` ^1.7.18. The repository pins `better-auth` at ^1.7.12, so using the plugin means a bump [BA-stripe]. DESIGN.md §13 names the plugin's two structural costs: its tables sit outside `withAudit`, and its routes sit outside `/api/graphql`. The alternative is a thin service over the Stripe SDK with audited tables of its own; the spike is meant to settle it.

## Break-Even

**Method.** Sizes are paying seats: 100, 1,000, 10,000 and 100,000. Revenue = paying units × price × (1 − 6.1%), the single-month churn haircut, a crude stand-in for steady-state churn. Paying units are paying seats for (b), (d) and (g) (whose per-seat revenue is built in its section), and paying covens (seats × 1.2 memberships ÷ 5.5 members) for (a), (c) and (e); (a) uses its $9.55 average across the four steps. Fees are Stripe's option 1 (2.9% + 30¢, 0.7% Billing, 0.5% Tax Basic) on that revenue, and Washington retailing B&O of 0.471% less the $55 a month credit. Sales tax is passed through to the customer, so it is neither revenue nor cost. Trial, curator, exempt and demo-only accounts earn nothing and are in the cost side. The cost lines come from running-costs.md: (i) cash, (ii) cash + median maintenance at the contractor rate, (iii) cash + a full-time job at a $250,000 salary loaded to $286,977 a year (low). **Net revenue a month**, after churn, fees and B&O:

| Model                                           | Price per paying unit |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | --------------------: | ---: | -----: | ------: | -------: |
| (a) Coven pays, seat bundles                    |                 $9.55 | $181 | $1,815 | $18,111 | $180,619 |
| (b) Each user pays                              |                 $4.00 | $332 | $3,320 | $33,081 | $330,316 |
| (c) Base plus seats                             |                 $9.29 | $176 | $1,764 | $17,601 | $175,518 |
| (d) Solo rung only                              |                 $2.50 | $197 | $1,970 | $19,640 | $195,905 |
| (e) Any member pays                             |                 $5.64 | $105 | $1,047 | $10,466 | $104,175 |
| (g) Group plan includes a solo coven (over (c)) |                 $2.31 | $197 | $1,966 | $19,608 | $195,584 |

#### Option 2, Managed Payments

| Model                                           |  100 |   1000 |   10000 |   100000 |
| ----------------------------------------------- | ---: | -----: | ------: | -------: |
| (a) Coven pays, seat bundles                    | $176 | $1,756 | $17,524 | $174,749 |
| (b) Each user pays                              | $321 | $3,208 | $31,954 | $319,048 |
| (c) Base plus seats                             | $171 | $1,707 | $17,030 | $169,809 |
| (d) Solo rung only                              | $190 | $1,899 | $18,936 | $188,862 |
| (e) Any member pays                             | $101 | $1,012 | $10,120 | $100,709 |
| (g) Group plan includes a solo coven (over (c)) | $190 | $1,900 | $18,956 | $189,063 |

**Y means net revenue covers the cost line**, for (i) / (ii) / (iii):

| Model                                           |   100 |  1000 | 10000 | 100000 |
| ----------------------------------------------- | ----: | ----: | ----: | -----: |
| (a) Coven pays, seat bundles                    | n n n | Y n n | Y Y n |  Y Y Y |
| (b) Each user pays                              | Y n n | Y n n | Y Y Y |  Y Y Y |
| (c) Base plus seats                             | n n n | Y n n | Y Y n |  Y Y Y |
| (d) Solo rung only                              | n n n | Y n n | Y Y n |  Y Y Y |
| (e) Any member pays                             | n n n | Y n n | Y Y n |  Y Y Y |
| (g) Group plan includes a solo coven (over (c)) | n n n | Y n n | Y Y n |  Y Y Y |

**Seats needed to break even.** The smallest number of paying seats whose net revenue covers each cost line. The cost line is interpolated linearly between the four sizes (and held flat outside them), because overhead and usage grow with seats; the answer is therefore exact at the four sizes and approximate between them.

| Model                                           | (i) |  (ii) |  (iii) |
| ----------------------------------------------- | --: | ----: | -----: |
| (a) Coven pays, seat bundles                    | 135 | 3,362 | 13,413 |
| (b) Each user pays                              |  74 | 1,836 |  7,320 |
| (c) Base plus seats                             | 139 | 3,460 | 13,805 |
| (d) Solo rung only                              | 124 | 3,098 | 12,361 |
| (e) Any member pays                             | 238 | 5,841 | 23,350 |
| (g) Group plan includes a solo coven (over (c)) | 125 | 3,104 | 12,381 |

What the tables say (the restricted discount and the observer price are in (c) and so in (g)): with no free tier and the withdrawn 4% share gone, every model covers cash costs by 74 to 238 paying seats. Covering contractor-rate maintenance needs about 1,800 to 5,800 paying seats, and a full-time job needs about 7,300 to 23,400. Model (g), over (c), needs 125 seats on cash and 3,104 for contractor maintenance, because of the assumed 20% who buy a solo coven alone. Model (b) needs the fewest seats because it counts people, not covens, and prices each at $4.00. Model (e) needs the most because it earns $5.64 per covered coven. The two owner decisions of 2026-11-06 (discount for paying stewards only, cheaper observer seats) lowered (c) from $10.58 to $9.29 per coven, which raised its cash break-even from 121 to 139 paying seats. These counts leave out the overhead's cost _growth_ beyond what the cost lines already include, and they take paying seats as given: how many people would pay is the thing no source answers for this site.

## Questions for the Owner

**I need you to answer each of these.** The recommendation of the research is beside each where a lane made one.

**Lane F's five:**

1. **Merchant or merchant of record?** The site as merchant (Stripe Billing + Tax, ranked first) means you register for and file sales tax. Managed Payments passes that to Link for a higher fee, and statements read "Sold through Link". Research recommendation: the site as merchant, with Managed Payments the fallback. Merchant-of-record treatment for Washington B&O is unresolved; an accountant must confirm.
2. **Link branding.** Are you willing to have "Sold through Link" on customers' statements? Only relevant to Managed Payments. No recommendation.
3. **Business form.** Sole proprietor or company? Vendors' requirements vary and several were not found. No recommendation.
4. **Content under review.** Are you willing to submit to a vendor review of the grimoire and compendium, given the restricted-business lines above? Research recommendation: Stripe, whose list is the narrowest.
5. **International customers.** Are they in scope? International cards add 1.5%, currency conversion 1%, and sales tax in other countries. No recommendation.

**The rest:**

6. **Which model?** I need you to choose one of (a), (b), (c) or (g); (d) and (e) are also costed above. The research made no recommendation. Seats to break even on cash / cash + contractor maintenance / cash + a full-time job: (a) with step prices needs 135 / 3,362 / 13,413; (b) needs 74 / 1,836 / 7,320 (fewest, but drops R1); (c) needs 139 / 3,460 / 13,805 (meets all five wants); (g) over (c) needs 125 / 3,104 / 12,381 (assumes 20% buy a solo coven alone).
7. **Keeper exemptions.** The model uses 5% / 3% / 1.5% / 0.5% of paying seats at 100 / 1,000 / 10,000 / 100,000 (your words, 2026-11-06: "5% of paying seats initially, falling as the site becomes established and its beta testers are staff rather than friends and family"). I need you to confirm or give the numbers. No benchmark exists.
8. **The pause rule.** When a site is paused (M15.52) or a coven is paused (M15.55), should the subscription be paused (Stripe `pause_collection`), keep running, or be extended by the paused time? No recommendation.
9. **The multi-coven discount definition (R5).** Answered by you on 2026-11-06: the discount is on the second coven's invoice, for a seat held by a paying steward of another coven. Nothing for you to do. It is recorded under "Owner decisions recorded for the design record" above.
10. **Bot Protection.** Does the Code of Ethics allow Vercel's JavaScript-challenge mode? Log mode runs no script. No recommendation.
11. **The document-mailing cap.** Is it acceptable that mailing a document to everyone takes 852 days at 10,000 paying seats (51,093 accounts)? Not a billing question. No recommendation.
12. **The new requirements.** Do you accept the four departures from §13 under "New Requirements Beyond DESIGN.md §13"? Research recommendation: accept all four.
13. **Trial length.** One month standard, no card. Is one month right, and is no card right given the trial seats it creates (76% to 89% of paying seats)? You decided both on 2026-11-06; this records the cost.
14. **Hosted Checkout only.** Do you agree the site loads no Stripe.js on its own pages and sends buyers to Stripe's hosted Checkout? Research recommendation: yes. It keeps to the no-browser-script rule and gives up part of Stripe's fraud-model accuracy (Stripe says advanced risk factors improve it by 36%).
15. **security.txt.** Do you agree to widen CLAUDE.md rule 1's `/.well-known/*.json` exception to also cover `security.txt`? Research recommendation: yes. It is sessionless and carries no application data. A static file under `public/.well-known/` may avoid a route handler; that was not checked.
16. **Vercel pause on budget.** Is Vercel's "Pause Production Deployments" setting on? Research recommendation: off. A 503 page for every paying account is a worse outcome than a bill, and the budget still emails you at 50%, 75% and 100%.
17. **Solo coven price (model (g)).** I need you to choose one: $1.99 (Neumoire [S29]; lowest barrier, earns the least; (g) then needs 141 / 3,503 / 13,978 paying seats), $2.99 (Bear [S15]; the one modelled; 125 / 3,104 / 12,381), or $4.99 (Grimoire [S28]; earns the most per solo buyer, nearer Day One's about $4.17 [S16]; 101 / 2,528 / 10,079). No recommendation: the result also rests on the assumed 20% who buy a solo coven alone, which no source informs.
18. **Model (a) step prices.** Do you accept $2.99 / $7.99 / $11.99 / $16.99 for the four steps and the assumed spread of 6% / 50% / 42% / 2% of covens? Both are my assumptions anchored on the comparables in section (a), not researched figures. Give other numbers and I re-run the model.
19. **Observer price and share.** I need you to confirm or change two assumptions. Price: $1 for an observer seat against $2 for a practitioner seat beyond the 3 in the base (anchor: Figma's Collab seat at $3 beside a $16 full seat [S6]; at Figma's ratio it would be about $0.40). Share: 30% of a coven's members are observers (range 15% to 50%; I did not research it). Take-up: 20% of observers add a solo coven for the solo price less $1, on their own subscription (range 5% to 40%; no source). At 15% / 50% observers or 5% / 40% take-up the break-evens move; run `scripts/billing-model.mjs` with `observerShare` or `observerTakeUp` changed to see them. No recommendation beyond the labels.

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
- S33 https://chartmogul.com/reports/saas-conversion-report/
- S34 https://www.revenuecat.com/state-of-subscription-apps/
- S35 https://9to5mac.com/2023/11/28/evernote-free-users-new-limits/
- S36 https://www.theregister.com/2023/11/30/evernote_free_tier_changes/
- S37 https://blog.zulip.com/2022/08/26/why-slacks-free-plan-change-is-causing-an-exodus/
- S38 https://techcrunch.com/2022/08/25/heroku-announces-plans-to-eliminate-free-plans-blaming-fraud-and-abuse
- S39 https://www.lightreading.com/cable-technology/33-of-netflix-subscriptions-are-shared-outside-the-household-study
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
