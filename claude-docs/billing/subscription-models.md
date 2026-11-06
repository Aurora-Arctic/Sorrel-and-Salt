# Subscription Models

**Status:** research, no decision made · **Date:** 2026-11-06 · **Task:** M17.1

This page compares six ways to charge for Sorrel & Salt, prices each against the running costs in [running-costs.md](running-costs.md), and ends with the questions I need you to answer. It does not choose a model. **You need to act:** the last section lists what I need you to decide.

The five wants a subscription has to meet are DESIGN.md §13's. I call them **R1** to **R5** here:

- **R1.** The coven pays, through its steward.
- **R2.** The price scales with the number of members.
- **R3.** A new coven gets free months.
- **R4.** A keeper can make a coven free.
- **R5.** Someone who belongs to several covens pays less.

A price in a model below is mine unless it names a comparable. I anchored each on the comparables, and the doc says so each time. Change them in `.reports/m17.1/compute.mjs` and re-run it. Sources S1 to S52 are Lane C's, listed at the end with the others.

## How Each Model Meets R1 to R5

| Model                        | R1 coven pays | R2 scales with members | R3 free months | R4 keeper exemption | R5 pays less in several covens                  |
| ---------------------------- | ------------- | ---------------------- | -------------- | ------------------- | ----------------------------------------------- |
| (a) Coven pays, seat bundles | kept          | kept in steps          | kept           | kept                | **altered**                                     |
| (b) Each user pays           | **dropped**   | **altered**            | **altered**    | **altered**         | kept                                            |
| (c) Base plus seats          | kept          | kept                   | kept           | kept                | kept (as a seat discount)                       |
| (d) Solo rung                | kept          | not applicable         | kept           | kept                | kept (smallest step of the model that holds it) |
| (e) Any member pays          | **altered**   | **dropped or altered** | kept           | kept                | kept (in its own form)                          |
| (f) Free-tier options        | not a model   |                        |                |                     |                                                 |

**No comparable discounts a seat across groups.** Notion bills a person once per paid workspace they belong to, "even if the same people are in multiple workspaces" [S3]. GitHub bills each organisation separately [S7]. R5 therefore has no consumer precedent as a seat discount. The nearest thing is Kanka, where one payment covers several campaigns and the price per campaign falls ($4.99, $3.33, $3.57 for 1, 3 and 7) [S19].

**The keeper exemption (R4)** is a flag on the coven in (a), (c), (d) and (e). In (b) it must be a flag on the person, or an exemption that waives every member of a flagged coven. Nothing in the comparables does this; it is an internal rule. In Stripe it is a 100%-off coupon on the subscription, or no subscription at all.

## The Six Models

### (a) Coven Pays, Seat Bundles

**Structure.** The steward buys a bundle that covers a fixed number of members: 1 (solo), up to 5, up to 13, unlimited. A coven that crosses a bundle edge moves up a step.

**Price points.** Basecamp charges $29 for 5 users, $79 for 10 and $99 for 15, "no per-user fees" [S4]. Household bundles cost $5.99 to $27.95 for 5 to 6 people and take 70% to 78% off the per-head price [S9] [S10] [S11] [S12]. Kanka charges $9.99 for 3 campaign slots [S19]. I model **$9.99 a month per coven** (assumption, anchored on those).

**R1 to R5.** R1 kept. R2 kept, in steps. R3 kept: a trial per coven; Slack gives new teams 50% off for 3 months [S1]. R4 kept. **R5 altered:** a bundle has no per-member charge to discount, so "pays less" becomes a discount on a steward's second coven bundle, or a credit for a member's own covens.

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

**Price points.** Spotify moves from Duo ($18.99) to Family ($21.99) [S9]. Figma's cheap Collab seat ($3) sits beside full seats ($16) [S6], which maps onto observers. Slack bills only members active in the last 28 days [S1]. I model **$6 base covering 3 members, plus $2 for each extra member** (assumption), with a 50% seat discount for a member's second and later coven. At 5.5 members and 1.2 covens per account that is **$10.58 per coven**.

**R1 to R5.** All five kept. R5 is a seat discount: a member who already holds a paid seat elsewhere is charged less in the second coven. DESIGN.md §13 leaves this definition open: it discounts the second coven's invoice, not the member.

**Multi-coven discount.** Needs a Stripe coupon on the second coven's seat line, or a lower seat price. The discount follows the person across customers, which Stripe does not do by itself; the service has to compute it.

**Stripe objects.** Product, a base Price, a per-seat Price (quantity), Subscription with quantity, Coupon (up to 20 stacked, can be added after checkout), Customer Portal.

**Reception.** For: meets every want; the cheap-observer seat and active-only billing both have precedents [S6] [S1]. Against: Notion's practice is the opposite of R5 [S3], and per-seat pricing draws the complaints in "Per Seat Pricing Sucks" (a vendor's opinion, no data) [S5].

### (d) Solo Rung

**Structure.** A one-member coven at a low price, or free. It sits inside (a), (b) or (c) as the smallest step.

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

### (f) Free-Tier Options

Three shapes: the solo rung (d), a size cap (Basecamp's free plan allows 3 users and 1 project [S4]), or a trial only (R3).

- **Conversion.** Freemium converts a median 3% to 5% in six months, top quartile 8% to 12% [S33]. Consumer apps convert about 2% by day 35 [S34].
- **Cutting a free tier later is costly.** Evernote cut its free plan to 50 notes in 2023 [S35] [S36]; Slack's 2022 change prompted a competitor to claim a 40-fold rise in imports [S37] (a competitor's figure); Heroku removed free plans [S38]. One grimoire app went the other way and removed its paywall [S29].
- **Reception.** Against free: none found that proves harm. Retention after one year was "nearly identical" for hard-paywall and freemium apps [S34].

## Solo and Personal Spaces

**Demand.** See (d): most practitioners practise alone [S49] [S50] [S51].

**What comparables do.** Notion gives a single-member workspace with no block limit [S2]. Figma has free Drafts [S6]. GitHub has a free personal account beside organisations [S7]. Obsidian is a free local vault [S13]. Kanka and Basecamp have no personal type: a solo user is a group of one [S19] [S4]. Slack has no personal space [S1].

**What reintroducing a personal `kind` would change.** CLAUDE.md says there are no personal workspaces: no `kind` column, every coven can take members and be deleted by a steward. Under the current rule, a solo user is a coven of one, which is how Kanka and Basecamp work. Adding a `kind` would let a personal space be free and undeletable, and would let it not take members. It would also add a `kind` check to every membership rule, the invitation service and the demo coven's deletion rule. **This is a change you would have to accept; I have made none.** I recommend no `kind`: model (d) as a one-member coven gives the same price point without a schema change.

## Free-Tier Recommendation

**Recommendation of this research: a free solo rung (a one-member coven) plus free months for any new coven (R3), with no size cap.** The cost of a free account is small. The platform and operations cost per account is $0.31 at 100 accounts and falls to $0.0035 at 100,000; the cost of one more account at the top end is **$0.0026 a month**.

| Quantity                                         |     100 |    1000 |   10000 |  100000 |
| ------------------------------------------------ | ------: | ------: | ------: | ------: |
| Platform and operations cost per account a month | $0.3058 | $0.0505 | $0.0113 | $0.0035 |
| Marginal cost per account, 10,000 to 100,000     | $0.0026 |         |         |         |

Free accounts one paying unit carries at the marginal cost: (a) Coven pays, seat bundles: 3504; (b) Each user pays: 1335; (c) Base plus seats: 3719; (d) Solo rung only: 792; (e) Any member pays: 1929

Vercel Hobby limits: 100: 0.01M invocations vs 1M, 0.1 h vs 4 h; 1000: 0.08M invocations vs 1M, 0.7 h vs 4 h; 10000: 0.80M invocations vs 1M, 6.7 h vs 4 h; 100000: 8.00M invocations vs 1M, 66.7 h vs 4 h
Model prices: (a) Coven pays, seat bundles $9.99; (b) Each user pays $4.00; (c) Base plus seats $10.58; (d) Solo rung only $2.50; (e) Any member pays $5.64

This counts hosting and operations only. It leaves out Claude Ultra, support time and abuse handling, which are the real cost of free accounts. The figures use the 4% paying share; at 10% the same revenue needs fewer free accounts to carry.

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

**Method.** Revenue = paying units × price × (1 − 6.1%), the single-month churn haircut, a crude stand-in for steady-state churn. Fees are Stripe's option 1 (2.9% + 30¢, 0.7% Billing, 0.5% Tax Basic) on that revenue, and Washington retailing B&O of 0.471% less the $55 a month credit. Sales tax is passed through to the customer, so it is neither revenue nor cost. Paying units are 4% of covens in (a), (c) and (e), and 4% of accounts in (b) and (d); the 10% case is the top quartile of [S33]. All counts come from running-costs.md. **Net revenue a month**, after churn, fees and B&O:

#### 4% Paying (Base)

| Model                        | Price per paying unit | 100 | 1000 |  10000 |  100000 |
| ---------------------------- | --------------------: | --: | ---: | -----: | ------: |
| (a) Coven pays, seat bundles |                 $9.99 |  $8 |  $76 |   $761 |  $7,605 |
| (b) Each user pays           |                 $4.00 | $13 | $133 | $1,328 | $13,265 |
| (c) Base plus seats          |                $10.58 |  $8 |  $81 |   $807 |  $8,072 |
| (d) Solo rung only           |                 $2.50 |  $8 |  $79 |   $788 |  $7,878 |
| (e) Any member pays          |                 $5.64 |  $4 |  $42 |   $419 |  $4,187 |

#### 10% Paying (High)

| Model                        | Price per paying unit | 100 | 1000 |  10000 |  100000 |
| ---------------------------- | --------------------: | --: | ---: | -----: | ------: |
| (a) Coven pays, seat bundles |                 $9.99 | $19 | $190 | $1,901 | $18,972 |
| (b) Each user pays           |                 $4.00 | $33 | $332 | $3,320 | $33,081 |
| (c) Base plus seats          |                $10.58 | $20 | $202 | $2,018 | $20,132 |
| (d) Solo rung only           |                 $2.50 | $20 | $197 | $1,970 | $19,640 |
| (e) Any member pays          |                 $5.64 | $10 | $105 | $1,047 | $10,466 |

#### Option 2, Managed Payments, 4% Paying

| Model                        | 100 | 1000 |  10000 |  100000 |
| ---------------------------- | --: | ---: | -----: | ------: |
| (a) Coven pays, seat bundles |  $7 |  $74 |   $736 |  $7,360 |
| (b) Each user pays           | $13 | $128 | $1,283 | $12,815 |
| (c) Base plus seats          |  $8 |  $78 |   $781 |  $7,811 |
| (d) Solo rung only           |  $8 |  $76 |   $760 |  $7,597 |
| (e) Any member pays          |  $4 |  $40 |   $405 |  $4,048 |

**Against three cost rows** from running-costs.md: (i) cash costs, (ii) cash + median maintenance at the contractor rate, (iii) cash + a full-time job at a $250,000 salary loaded to $286,977 a year. Y means net revenue at 4% paying covers the cost; n means it does not.

| Model                        |   100 |  1000 | 10000 | 100000 |
| ---------------------------- | ----: | ----: | ----: | -----: |
| (a) Coven pays, seat bundles | n n n | n n n | Y n n |  Y Y n |
| (b) Each user pays           | n n n | n n n | Y n n |  Y Y n |
| (c) Base plus seats          | n n n | n n n | Y n n |  Y Y n |
| (d) Solo rung only           | n n n | n n n | Y n n |  Y Y n |
| (e) Any member pays          | n n n | n n n | Y n n |  Y n n |

**Share of the base that must pay** to cover (i) / (ii) / (iii):

| Model (base)                          |                    100 |                   1000 |                   10000 |                 100000 |
| ------------------------------------- | ---------------------: | ---------------------: | ----------------------: | ---------------------: |
| (a) Coven pays, seat bundles (covens) |  >100% / >100% / >100% | 13.18% / >100% / >100% |  1.65% / 32.19% / >100% | 0.29% / 3.34% / 12.90% |
| (b) Each user pays (accounts)         | 69.45% / >100% / >100% |  7.55% / >100% / >100% | 0.94% / 18.43% / 73.19% |  0.17% / 1.91% / 7.39% |
| (c) Base plus seats (covens)          |  >100% / >100% / >100% | 12.42% / >100% / >100% |  1.55% / 30.33% / >100% | 0.27% / 3.15% / 12.16% |
| (d) Solo rung only (accounts)         |  >100% / >100% / >100% | 12.72% / >100% / >100% |  1.59% / 31.07% / >100% | 0.28% / 3.23% / 12.46% |
| (e) Any member pays (covens)          |  >100% / >100% / >100% | 23.94% / >100% / >100% |  2.99% / 58.47% / >100% | 0.53% / 6.07% / 23.45% |

What the table says: at 10,000 accounts every model covers cash costs and none covers maintenance. At 100,000 accounts every model covers cash and contractor-rate maintenance except (e); none covers a full-time job at 4% paying. Model (b) needs the smallest share of its base to pay (18.4% to cover contractor-rate maintenance at 10,000 accounts, against 30% to 58% for the others), because it counts people, not covens. At 100 and 1,000 accounts no model covers the labour: this is not a revenue business at that size.

## Questions for the Owner

**I need you to answer each of these.** The recommendation of the research is beside each where a lane made one.

**Lane F's five:**

1. **Merchant or merchant of record?** The site as merchant (Stripe Billing + Tax, ranked first) means you register for and file sales tax. Managed Payments passes that to Link for a higher fee, and statements read "Sold through Link". Research recommendation: the site as merchant, with Managed Payments the fallback. Merchant-of-record treatment for Washington B&O is unresolved; an accountant must confirm.
2. **Link branding.** Are you willing to have "Sold through Link" on customers' statements? Only relevant to Managed Payments. No recommendation.
3. **Business form.** Sole proprietor or company? Vendors' requirements vary and several were not found. No recommendation.
4. **Content under review.** Are you willing to submit to a vendor review of the grimoire and compendium, given the restricted-business lines above? Research recommendation: Stripe, whose list is the narrowest.
5. **International customers.** Are they in scope? International cards add 1.5%, currency conversion 1%, and sales tax in other countries. No recommendation.

**The rest:**

6. **Which model?** (a) to (e). The research made no recommendation. (c) meets all five wants; (b) needs the smallest paying share but drops R1.
7. **The free tier.** Research recommendation: a free solo rung plus free months for a new coven, no size cap, no `kind` column.
8. **The pause rule.** When a site is paused (M15.52) or a coven is paused (M15.55), should the subscription be paused (Stripe `pause_collection`), keep running, or be extended by the paused time? No recommendation.
9. **The multi-coven discount definition (R5).** Does it discount the second coven's invoice, or the member? DESIGN.md §13 leaves it open. No recommendation.
10. **Bot Protection.** Does the Code of Ethics allow Vercel's JavaScript-challenge mode? Log mode runs no script. No recommendation.
11. **The document-mailing cap.** Is it acceptable that mailing a document to everyone takes 167 days at 10,000 accounts? Not a billing question. No recommendation.

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

Running-cost sources are numbered in [running-costs.md](running-costs.md#sources).
