// The running-cost and break-even model. Run: node scripts/billing-model.mjs
// Nearly every value below is a row of the Inputs table in claude-docs/billing/running-costs.md.
// The sizes count PAYING SEATS (activated accounts in paying covens). Every other account is
// overhead derived from them: trial seats, curator-coven seats, exempt seats and demo-only accounts.
const SIZES = [100, 1000, 10000, 100000];
const I = {
  // ratios (assumption unless noted)
  membersPerCoven: 5.5, // sourced S45 (tabletop mean)
  membershipsPerAccount: 1.2, // assumption, range 1.0-2.0
  activeFraction: 0.25, // assumption, range 0.15-0.30
  sessionsPerActive: 8, // assumption, range 4-16
  invocationsPerSession: 40, // derived from DESIGN.md 4
  cpuMsPerInvocation: 30, // sourced DESIGN.md 4
  edgeRequestsPerSession: 30, // assumption, range 9-100
  mbPerSession: 1.5, // assumption, range 0.5-5
  middlewarePerSession: 9, // derived 40 / 4.5 page loads
  wallOverCpu: 2, // assumption, range 1-5
  memoryGb: 2, // sourced default function memory
  mailsPerAccountMonth: 0.5, // assumption, range 0.25-1
  mailingsPerYear: 2, // assumption
  // bytes (measured / derived)
  fixedBytes: 15515648,
  accountBytes: 3766,
  covenBytes: Math.round((32682 + 203327) / 2),
  ledgerBytesPerRecipient: 225,
  // prices
  vercelBase: 20,
  vercelCredit: 20,
  invPerM: 0.6,
  cpuPerH: 0.128,
  memPerGbH: 0.0106,
  fdtPerGb: 0.15,
  fdtInclGb: 1000,
  reqPerM: 2,
  reqInclM: 1,
  wfPer1k: 0.02,
  obsPerM: 1.2,
  neonLaunchCu: 0.106,
  neonScaleCu: 0.222,
  neonGbMonth: 0.35 + 0.2 + 0.09,
  avgCu: [0.25, 0.25, 0.5, 2],
  awakeH: [360, 540, 720, 720], // assumption
  domainYear: 11.81,
  claudeUltra: 200,
  // ops
  ops: {
    errors: [0, 15, 15, 50],
    uptime: [12, 12, 12, 12], // Solo: Free has no heartbeat monitors
    deliverability: [0, 0, 0, 14], // Postmark paid DMARC digests at 100k
    drain: [0, 0, 5, 50],
    restore: [0.03, 0.03, 0.03, 0.03],
  },
  // tracing (A5): requests come from sessions x invocations; spans per request, sampling, price per 1M spans
  tracing: { spansPerReq: 20, sample: 0.1, perM: 0.5 },
  // labour
  // hours a month = fixed + variable x (paying seats / 1,000)
  fixedHours: { low: 24.8, median: 44.4, high: 70.4 },
  // variable hours per 1,000 paying seats: support, payment disputes, privacy requests, abuse reports
  variableParts: {
    support: { low: 6.7, median: 28.0, high: 97.5 },
    // 0.25 / 2.0 / 5.0 hours a dispute x 4 / 5 / 7.5 disputes per 1,000 charges, per 1,000 paying seats
    disputes: { low: 0.18, median: 1.82, high: 6.82 },
    privacy: { low: 0.06, median: 0.37, high: 8.5 },
    abuse: { low: 0.01, median: 0.08, high: 0.16 },
  },
  oneFteHours: 160,
  // hourly rates, USD (BLS OEWS, Washington). Variable hours (support, disputes, privacy requests, abuse reports)
  // are customer-service work; fixed hours (maintenance, incidents, filing) are engineering work. 122.5 is the
  // contractor figure, kept as the engineering sensitivity.
  rates: {
    // support work is priced at a living wage, the average of three MIT Living Wage Calculator rows: Washington
    // 1 adult + 1 child 48.00, King County 1 adult + 1 child 56.43, King County 1 adult no children 30.60. The BLS
    // Washington customer-service median is the market-rate sensitivity.
    // wage = living-wage average minus the MIT Medical budget line (9,588 / 9,477 / 3,032 a year over 2,080 h), since the
    // benefits load below pays for health cover
    support: {
      livingFull: (48.0 + 56.43 + 30.6) / 3,
      medical: (9588 + 9477 + 3032) / 3 / 2080,
      living: (48.0 + 56.43 + 30.6) / 3 - (9588 + 9477 + 3032) / 3 / 2080,
      market: 24.2,
      marketP75: 29.49,
    },
    dev: { median: 80.07, contractor: 122.5 },
  },
  // business earnings a year that leave the owner the take-home of a $250,000 salary
  // (A: $180,243 after all tax). Employer tax and payroll admin are inside these figures; benefits are not.
  structures: [
    { id: 'A', name: 'A all-salary ($250,000 wage)', year: 266575 },
    { id: 'B', name: 'B S corporation ($184,500 wage, distributions)', year: 257599 },
    { id: 'B*', name: 'B* S corporation ($190,000 wage, distributions)', year: 258302 },
    {
      id: 'C',
      name: 'C sole proprietor or single-member LLC (recommended, pending the accountant)',
      year: 249434,
    },
  ],
  // benefits (health, retirement), the same in every structure: method A (low) and method B (high)
  benefitsYear: { low: 20848, high: 57251 },
  onCallMonth: 2340,
  // payments and tax
  stripePct: 0.029 + 0.007 + 0.005,
  stripeFix: 0.3,
  mpExtra: 0.035,
  bo: 0.00471,
  boCredit: 55,
  churn: 0.061,
  // overhead on top of paying seats (no free tier)
  demoOnlyShare: 0.625, // derived 100% - 37.5% activation, Userpilot [G1]; range 0.574-0.70 [G1][G2]
  demoOnlyRange: [0.574, 0.625, 0.7],
  growthMonthly: [0.0284, 0.0284, 0.0284, 0.0153], // derived (1+40%)^(1/12)-1 under $1M ARR; (1+20%)^(1/12)-1 at 100k [G4]
  trialMonths: 1, // one month standard
  trialConversion: 0.1, // sourced no-card "great", ChartMogul [G7]; "good" is 0.05
  trialConversionRange: [0.05, 0.1, 0.15], // 0.15 is the top of the no-card "great" band [G7]
  curatorSeats: 7, // 7 seats including the curator
  seatsPerCurator: 1000, // one curator per 1,000 paying seats
  curatorMin: 2, // minimum 2
  // 5% at first, falling as the site is established and beta testers become staff rather than friends and family
  exemptShare: [0.05, 0.03, 0.015, 0.005], // assumption (schedule per size)
  price: {
    // (g) solo coven price proposals, assumption anchored on [S29] [S15] [S28]
    gSolo: [1.99, 2.99, 4.99],
    gSoloModelled: 2.99,
    gSoloAloneShare: 0.2, // assumption: share of paying accounts that buy a solo coven alone (range 10-40%)
    b: 4.0,
    c_base: 6,
    c_seat: 2,
    c_incl: 3,
    c_disc: 0.5,
    // observer (viewer) seat, assumption anchored on Figma's $3 Collab beside a $16 full seat [S6]
    c_obs: 1,
    h_ill: 3, // (h) illustrative practitioner price
    h_obs: 1, // (h) observer price, held at (c)'s $1
    i_personal: 3.5, // (i) solo coven bought alone, above the practitioner seat
    i_payerShare: 0.5, // assumption: share of covens on each-member-pays (range 0-100%; no source)
    observerTakeUp: 0.2, // assumption: share of observers who add a solo coven (range 5-40%; no source)
    observerShare: 0.3, // assumption, range 0.15-0.50; not researched
  },
};
const resend = [
  [3000, 0, 'Free'],
  [50000, 20, 'Pro 50K'],
  [100000, 35, 'Pro 100K'],
  [100000, 90, 'Scale 100K'],
  [200000, 160, 'Scale 200K'],
  [500000, 350, 'Scale 500K'],
  [1e6, 650, 'Scale 1M'],
];
const f = (x, d = 0) =>
  '$' + x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x) => (x * 100).toFixed(2) + '%';
const row = (cells) => '| ' + cells.join(' | ') + ' |';

function overhead(P, k, d = I.demoOnlyShare, c = I.trialConversion) {
  const trial = P * ((I.growthMonthly[k] + I.churn) / c) * I.trialMonths;
  const curators = Math.max(I.curatorMin, Math.floor(P / I.seatsPerCurator));
  const curatorSeats = curators * I.curatorSeats;
  const exempt = P * I.exemptShare[k];
  const activated = P + trial + curatorSeats + exempt;
  const total = activated / (1 - d);
  return {
    P,
    g: I.growthMonthly[k],
    trial,
    curators,
    curatorSeats,
    exempt,
    activated,
    demoOnly: total - activated,
    total,
  };
}
const ov = SIZES.map((P, k) => overhead(P, k));
const scale = SIZES.map((P, k) => {
  const o = ov[k];
  const N = o.total;
  const covens = (o.activated * I.membershipsPerAccount) / I.membersPerCoven;
  const sessions = N * I.activeFraction * I.sessionsPerActive;
  const inv = sessions * I.invocationsPerSession;
  const cpuH = (inv * I.cpuMsPerInvocation) / 1000 / 3600;
  const memGbH = cpuH * I.wallOverCpu * I.memoryGb;
  const gb = (sessions * I.mbPerSession) / 1000;
  const reqs = sessions * I.edgeRequestsPerSession;
  const mails = N * I.mailsPerAccountMonth + (N * I.mailingsPerYear) / 12;
  const wfEvents = mails * 3 + 3 * 30 * 3;
  const bytes =
    I.fixedBytes +
    N * I.accountBytes +
    covens * I.covenBytes +
    N * I.ledgerBytesPerRecipient * I.mailingsPerYear;
  const storGb = bytes / 2 ** 30;
  const metered =
    (inv / 1e6) * I.invPerM +
    cpuH * I.cpuPerH +
    memGbH * I.memPerGbH +
    Math.max(0, gb - I.fdtInclGb) * I.fdtPerGb +
    Math.max(0, reqs / 1e6 - I.reqInclM) * I.reqPerM +
    (wfEvents / 1000) * I.wfPer1k;
  const vercel = I.vercelBase + Math.max(0, metered - I.vercelCredit);
  const obs = ((reqs + inv + sessions * I.middlewarePerSession) / 1e6) * I.obsPerM;
  const neonL = I.avgCu[k] * I.awakeH[k] * I.neonLaunchCu + storGb * I.neonGbMonth;
  const neonS = I.avgCu[k] * I.awakeH[k] * I.neonScaleCu + storGb * I.neonGbMonth;
  const tier = resend.find((t) => t[0] >= mails);
  const mailCost = tier[1];
  const tracing =
    ((sessions * I.invocationsPerSession * I.tracing.spansPerReq * I.tracing.sample) / 1e6) *
    I.tracing.perM;
  const ops =
    I.ops.errors[k] +
    I.ops.uptime[k] +
    I.ops.drain[k] +
    I.ops.restore[k] +
    I.ops.deliverability[k] +
    tracing;
  const domain = I.domainYear / 12;
  const platform = vercel + obs + neonL + mailCost + domain + ops;
  return {
    N,
    P,
    covens,
    sessions,
    inv,
    cpuH,
    memGbH,
    gb,
    reqs,
    mails,
    wfEvents,
    bytes,
    storGb,
    metered,
    vercel,
    obs,
    neonL,
    neonS,
    tier: tier[2],
    mailCost,
    ops,
    tracing,
    domain,
    platform,
    cash: platform + I.claudeUltra,
    mailDays: Math.ceil(N / 60),
  };
});

const CASES = ['low', 'median', 'high'];
// AI assistance for support agents is on by default. The factor scales
// minutes per support contact only (Brynjolfsson, Li and Raymond, QJE 2025: handle time down 8.5%, resolutions per
// hour up 15.2%); it removes no contact, so the other parts are unchanged. --ai=low|median|high picks the factor.
const AI = {
  factors: { low: 0.735, median: 0.87, high: 1.0 },
  choice: (process.argv.find((a) => a.startsWith('--ai=')) || '--ai=median').slice(5),
  seatPrice: 25, // Claude Team standard seat, a month; business terms, so customer messages are not trained on
  minSeats: 2, // Team plan minimum
};
const aiFactor = AI.factors[AI.choice];
const varHours = Object.fromEntries(
  CASES.map((k) => [
    k,
    Object.entries(I.variableParts).reduce(
      (a, [name, p]) => a + p[k] * (name === 'support' ? aiFactor : 1),
      0,
    ),
  ]),
);
// hours a month at P paying seats
const hoursAt = (k, P) => I.fixedHours[k] + (varHours[k] * P) / 1000;
// paying seats at which one person's 160 hours a month run out
const ceilingSeats = Object.fromEntries(
  CASES.map((k) => [k, ((I.oneFteHours - I.fixedHours[k]) / varHours[k]) * 1000]),
);
// the primary row is the low contact rate; the median is the stress case. ROW picks which one the
// labour functions below use.
const ROWS = ['low', 'median'];
let ROW = 'low';
const withRow = (k, fn) => {
  const old = ROW;
  ROW = k;
  try {
    return fn();
  } finally {
    ROW = old;
  }
};
// Employees, not contractors: every wage is loaded with employer payroll taxes and benefits, by the same rules the
// $250,000 salary uses, on a 2,080-hour year. Social Security 6.2% to the 184,500 cap; Medicare 1.45%; FUTA 0.6% on 7,000; WA UI 1.0% (low) or
// 6.0% (high) on 78,200; WA EAF 0.02% / 0.03% on 78,200; PFML employer share 0 (low) or 1.13% x 28.57% (high);
// L&I 5302 (low) or 4904 (high) per worker-hour; benefits method A (health 7,344 a year + retirement 5.40% of
// wages) low, method B (ECEC insurance + retirement + supplemental, 22.90% of wages) high. The base rate is the
// midpoint of the low and high loaded hourly figures.
const HOURS_YEAR = 2080;
function loadRate(w) {
  const wage = w * HOURS_YEAR;
  const ss = 0.062 * Math.min(wage, 184500),
    med = 0.0145 * wage,
    futa = 42;
  const uiBase = Math.min(wage, 78200);
  const li = (a, b, c) => (a + b + c / 2 + 0.0956) * HOURS_YEAR;
  const low = {
    taxes: ss + med + futa + 0.01 * uiBase + 0.0002 * uiBase + li(0.0109, 0.0002, 0.0038),
    benefits: 7344 + 0.054 * wage,
  };
  const high = {
    taxes:
      ss +
      med +
      futa +
      0.06 * uiBase +
      0.0003 * uiBase +
      0.0113 * 0.2857 * Math.min(wage, 184500) +
      li(0.0209, 0.0003, 0.0099),
    benefits: 0.229 * wage,
  };
  const hourly = (c) => (wage + c.taxes + c.benefits) / HOURS_YEAR;
  const lo = hourly(low),
    hi = hourly(high);
  return { wage: w, low: lo, high: hi, mid: (lo + hi) / 2, lowParts: low, highParts: high };
}
const wages = JSON.parse(JSON.stringify(I.rates));
const loading = {
  support: loadRate(wages.support.living),
  supportMarket: loadRate(wages.support.market),
  dev: loadRate(wages.dev.median),
};
I.rates.support.living = loading.support.mid;
I.rates.support.market = loading.supportMarket.mid;
I.rates.dev.median = loading.dev.mid;
// labour cost: fixed hours at the developer rate, variable hours at the customer-service rate
// Claude Team seats for support agents: one agent per further 160 hours above the owner's own, the plan's minimum of 2
const aiAgents = (P) => {
  const extra = Math.max(0, hoursAt(ROW, P) - I.oneFteHours);
  return extra > 0 ? Math.max(AI.minSeats, Math.ceil(extra / I.oneFteHours)) : 0;
};
const aiCost = (P) => aiAgents(P) * AI.seatPrice;
const labourAt = (P, rs, rd) =>
  I.fixedHours[ROW] * rd + ((varHours[ROW] * P) / 1000) * rs + aiCost(P);
const labourLoaded = (P) => labourAt(P, I.rates.support.living, I.rates.dev.median);
// sensitivities: the BLS market rate for support, and the contractor rate for engineering
const labourMarket = (P) => labourAt(P, I.rates.support.market, I.rates.dev.median);
const labourSens = (P) => labourAt(P, I.rates.support.living, I.rates.dev.contractor);
// hired help: hours above one person's 160 are the variable, customer-service hours, bought at that rate
const hiredHours = (P) => Math.max(0, hoursAt(ROW, P) - I.oneFteHours);
const labourSalary = (P) => fte + hiredHours(P) * I.rates.support.living + aiCost(P);
const structYear = (id) => I.structures.find((x) => x.id === id).year;
// the salary line is structure C plus benefits; all-salary (A) is kept as a sensitivity row
const fte = (structYear('C') + I.benefitsYear.low) / 12,
  fteHigh = (structYear('C') + I.benefitsYear.high) / 12;
const fteA = (structYear('A') + I.benefitsYear.low) / 12,
  fteAHigh = (structYear('A') + I.benefitsYear.high) / 12;

// models: paying unit base and revenue per paying unit. A paying seat is one activated account
// in a paying coven, so paying covens = paying seats x memberships per account / members per coven.
// R5: only a member who is the paying steward of another coven gets the discount.
// Stewards are one per coven, so the share of accounts that are stewards = covens per account
// = memberships per account / members per coven. A seat is a second-or-later membership with
// probability (m - 1) / m, and that holder is a steward with the steward share (independence assumed).
const stewardShare = I.membershipsPerAccount / I.membersPerCoven;
const extraSeatShare = (I.membershipsPerAccount - 1) / I.membershipsPerAccount;
const discountedSeatShare = extraSeatShare * stewardShare;
const memberSeatFactor = 1 - discountedSeatShare * I.price.c_disc;
const practitionersPerCoven = I.membersPerCoven * (1 - I.price.observerShare);
const observersPerCoven = I.membersPerCoven * I.price.observerShare;
// price per coven at a scale x on the base and the practitioner seat price; observers stay at c_obs
const covenPriceAt = (x) =>
  I.price.c_base * x +
  (I.price.c_seat * x * Math.max(0, practitionersPerCoven - I.price.c_incl) +
    I.price.c_obs * observersPerCoven) *
    memberSeatFactor;
const cPerCoven = covenPriceAt(1);
// (g) layers a free solo coven on (c): each paid group seat also holds one, a person with no
// paid group seat buys a solo coven alone. Per paying seat: group share pays (c), the rest pays the solo price.
// Observers may add a solo coven by paying the difference to the solo price,
// on their own subscription. addOns = observers who take it up, per paying seat.
const observerAddOns = () =>
  (1 - I.price.gSoloAloneShare) * I.price.observerShare * I.price.observerTakeUp;
const makeG = (solo, cpc = cPerCoven) => ({
  id: 'g',
  name: '(g) Group plan includes a solo coven (over (c))',
  base: 'account',
  price:
    (1 - I.price.gSoloAloneShare) * cpc * (I.membershipsPerAccount / I.membersPerCoven) +
    I.price.gSoloAloneShare * solo +
    observerAddOns() * (solo - I.price.c_obs),
  subsOf: (P) =>
    (1 - I.price.gSoloAloneShare) * P * (I.membershipsPerAccount / I.membersPerCoven) +
    I.price.gSoloAloneShare * P +
    observerAddOns() * P,
  // free solo covens cost Neon storage only: one coven of the average size per paid group seat
  extraCash: (P) =>
    ((((1 - I.price.gSoloAloneShare) * (1 - I.price.observerShare) + observerAddOns()) *
      P *
      I.covenBytes) /
      2 ** 30) *
    I.neonGbMonth,
});
// (h) flat seats: no base fee. A practitioner seat (price p) includes a solo coven; an observer seat
// (price o) becomes a practitioner seat by paying the difference (take-up as in (g)); a solo coven alone
// costs p; a paying steward gets the (c) discount on practitioner seats in other covens.
const hPerCoven = (p, o) =>
  practitionersPerCoven * p * memberSeatFactor +
  observersPerCoven * ((1 - I.price.observerTakeUp) * o + I.price.observerTakeUp * p);
const hPerSeat = (p, o) =>
  (1 - I.price.gSoloAloneShare) * hPerCoven(p, o) * (I.membershipsPerAccount / I.membersPerCoven) +
  I.price.gSoloAloneShare * p;
const gPerSeat = makeG(I.price.gSoloModelled).price;
// hPerSeat is linear in p, so the practitioner price whose revenue per paying seat equals (g)'s solves exactly
const hRev0 = hPerSeat(0, I.price.h_obs);
const hRev1 = hPerSeat(1, I.price.h_obs);
const hCalibrated = (gPerSeat - hRev0) / (hRev1 - hRev0);
const hCalibratedRounded = Math.round(hCalibrated * 100) / 100;
const hCovenMatch =
  (cPerCoven - hPerCoven(0, I.price.h_obs)) /
  (hPerCoven(1, I.price.h_obs) - hPerCoven(0, I.price.h_obs));
const makeH = (id, p, label) => ({
  id,
  name: `(h) Flat seats, ${label}`,
  base: 'account',
  practitioner: p,
  observer: I.price.h_obs,
  price: hPerSeat(p, I.price.h_obs),
  // seat upgrades ride on the steward's invoice, so one subscription per paying coven plus each solo-alone buyer
  subsOf: (P) =>
    (1 - I.price.gSoloAloneShare) * P * (I.membershipsPerAccount / I.membersPerCoven) +
    I.price.gSoloAloneShare * P,
  extraCash: (P) =>
    ((((1 - I.price.gSoloAloneShare) * (1 - I.price.observerShare) + observerAddOns()) *
      P *
      I.covenBytes) /
      2 ** 30) *
    I.neonGbMonth,
});
// (i) one price list: (h)'s seats, a solo coven alone at i_personal, and the discount (R5) earned by a
// person on seats they pay for themselves. Only second-or-later memberships in each-member-pays covens
// are discounted; a steward-pays seat is on another payer's invoice and is not. An observer who pays
// the upgrade difference counts as paying for a seat. The factor applies to every seat the member pays.
const iDiscountedSeatShare = extraSeatShare * I.price.i_payerShare;
const iSeatFactor = 1 - iDiscountedSeatShare * I.price.c_disc;
const iPerCoven = (p, o) =>
  iSeatFactor *
  (practitionersPerCoven * p +
    observersPerCoven * ((1 - I.price.observerTakeUp) * o + I.price.observerTakeUp * p));
const iPerSeat = (p, o, s = I.price.i_personal) =>
  (1 - I.price.gSoloAloneShare) * iPerCoven(p, o) * (I.membershipsPerAccount / I.membersPerCoven) +
  I.price.gSoloAloneShare * s;
const iRev0 = iPerSeat(0, I.price.h_obs),
  iRev1 = iPerSeat(1, I.price.h_obs);
// the personal plan is held at its fixed price, so the revenue is linear in p
const iCalibrated = (gPerSeat - iRev0) / (iRev1 - iRev0);
const iCalibratedRounded = Math.round(iCalibrated * 100) / 100;
// each-member-pays seats are one subscription per paying member, the rest ride on the steward's invoice
const makeI = (id, p, label, s = I.price.i_personal) => ({
  id,
  name: `(i) One price list, ${label}`,
  base: 'account',
  practitioner: p,
  observer: I.price.h_obs,
  personal: s,
  price: iPerSeat(p, I.price.h_obs, s),
  subsOf: (P) =>
    (1 - I.price.gSoloAloneShare) *
      P *
      (I.price.i_payerShare * I.membershipsPerAccount +
        ((1 - I.price.i_payerShare) * I.membershipsPerAccount) / I.membersPerCoven) +
    I.price.gSoloAloneShare * P,
  extraCash: (P) =>
    ((((1 - I.price.gSoloAloneShare) * (1 - I.price.observerShare) + observerAddOns()) *
      P *
      I.covenBytes) /
      2 ** 30) *
    I.neonGbMonth,
});
const models = {
  b: { id: 'b', name: '(b) Each user pays', base: 'account', price: I.price.b },
  c: {
    id: 'c',
    name: '(c) Base plus seats',
    base: 'coven',
    price: cPerCoven,
  },
  g: makeG(I.price.gSoloModelled),
  h_ill: makeH('h_ill', I.price.h_ill, '$3 / $1 (illustrative)'),
  h_cal: makeH(
    'h_cal',
    hCalibratedRounded,
    '$' + hCalibratedRounded.toFixed(2) + ' / $1 (calibrated to (g))',
  ),
  i_ill: makeI('i_ill', I.price.h_ill, '$3 / $1, personal $3.50 (illustrative)'),
  i_cal: makeI(
    'i_cal',
    iCalibratedRounded,
    '$' + iCalibratedRounded.toFixed(2) + ' / $1, personal $3.50 (calibrated to (g))',
  ),
};
const unitsOf = (m, P) =>
  m.base === 'coven' ? (P * I.membershipsPerAccount) / I.membersPerCoven : P;
function net(units, price, mp = false, subs = units) {
  const u = units * (1 - I.churn);
  const rev = u * price;
  const proc =
    rev * (mp ? 0.029 + 0.007 + I.mpExtra : I.stripePct) + subs * (1 - I.churn) * I.stripeFix;
  const bo = Math.max(0, rev * I.bo - I.boCredit);
  return { rev, proc, bo, net: rev - proc - bo };
}
const netAt = (m, P, mp = false) =>
  net(unitsOf(m, P), m.price, mp, m.subsOf ? m.subsOf(P) : undefined);

// Cost lines, interpolated linearly in seats between the four sizes (and continued on the last slope above them).
const linesByRow = Object.fromEntries(
  ROWS.map((k) => [
    k,
    withRow(k, () => ({
      cash: scale.map((s) => s.cash),
      contractor: scale.map((s) => s.cash + labourLoaded(s.P)),
      fulltime: scale.map((s) => s.cash + labourSalary(s.P)),
    })),
  ]),
);
function costAt(line, P) {
  const y = linesByRow[ROW][line];
  if (P <= SIZES[0]) return y[0];
  for (let k = 1; k < SIZES.length; k++)
    if (P <= SIZES[k])
      return y[k - 1] + ((y[k] - y[k - 1]) * (P - SIZES[k - 1])) / (SIZES[k] - SIZES[k - 1]);
  // beyond the last size the last segment's slope continues, because labour hours keep growing with seats
  return y[3] + ((y[3] - y[2]) * (P - SIZES[3])) / (SIZES[3] - SIZES[2]);
}
const HI = 1e7;
const costFor = (m, line, P) => costAt(line, P) + (m.extraCash ? m.extraCash(P) : 0);
function seatsFor(m, line) {
  if (netAt(m, HI).net < costFor(m, line, HI)) return null;
  let lo = 0,
    hi = HI;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (netAt(m, mid).net < costFor(m, line, mid)) lo = mid;
    else hi = mid;
  }
  return Math.ceil(hi);
}
const seatText = (n) => (n === null ? 'none' : n.toLocaleString('en-US'));

const out = [];
const hdr = () => [row(['Quantity', ...SIZES]), row(['---', ...SIZES.map(() => '---:')])];
out.push('## Overhead on Top of Paying Seats');
out.push(...hdr());
const orow = (label, g, d = 0) =>
  out.push(
    row([label, ...ov.map((o) => g(o).toLocaleString('en-US', { maximumFractionDigits: d }))]),
  );
orow('Paying seats', (o) => o.P);
out.push(row(['Monthly growth of paying seats', ...ov.map((o) => pct(o.g))]));
orow('Trial seats (one-month trial, no card)', (o) => o.trial, 1);
orow('Trial seats as a share of paying seats (%)', (o) => (o.trial / o.P) * 100, 1);
orow('Curators (one per 1,000 paying seats, minimum 2)', (o) => o.curators);
orow('Curator-coven seats (7 each)', (o) => o.curatorSeats);
orow('Exempt seats (5% / 3% / 1.5% / 0.5% of paying seats)', (o) => o.exempt);
orow('Activated accounts (all of the above)', (o) => o.activated, 1);
orow('Demo-only accounts', (o) => o.demoOnly, 1);
orow('Total accounts', (o) => o.total, 1);
out.push(
  row([
    'Active accounts (total accounts x 25%, range 15-30%)',
    ...ov.map((o) => Math.round(o.total * I.activeFraction).toLocaleString('en-US')),
  ]),
);
out.push(row(['Total accounts per paying seat', ...ov.map((o) => (o.total / o.P).toFixed(2))]));
out.push('', '### Overhead Sensitivity, Total Accounts');
out.push(...hdr());
for (const d of I.demoOnlyRange)
  out.push(
    row([
      `Demo-only share ${pct(d)}`,
      ...SIZES.map((P, k) =>
        overhead(P, k, d).total.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      ),
    ]),
  );
for (const c of I.trialConversionRange)
  out.push(
    row([
      `No-card trial conversion ${pct(c)}`,
      ...SIZES.map((P, k) =>
        overhead(P, k, I.demoOnlyShare, c).total.toLocaleString('en-US', {
          maximumFractionDigits: 0,
        }),
      ),
    ]),
  );
out.push('', '## Scale');
out.push(...hdr());
const sr = (label, g, d = 0) =>
  out.push(
    row([label, ...scale.map((s) => g(s).toLocaleString('en-US', { maximumFractionDigits: d }))]),
  );
sr('Accounts (paying and overhead)', (s) => s.N);
sr('Covens', (s) => s.covens);
sr('Sessions a month', (s) => s.sessions);
sr('Function invocations a month', (s) => s.inv);
sr('Active CPU hours', (s) => s.cpuH, 1);
sr('Provisioned memory GB-h', (s) => s.memGbH, 1);
sr('Data transfer GB', (s) => s.gb);
sr('Edge requests a month', (s) => s.reqs);
sr('Mails a month', (s) => s.mails);
sr('Workflow events a month', (s) => s.wfEvents);
sr('Database size (MB)', (s) => s.bytes / 1e6, 1);
sr('Days to mail one document to everyone (at 60 a day)', (s) => s.mailDays);
out.push('', '## Platform Cost, USD a Month');
out.push(...hdr().slice(0, 0), row(['Line', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const cr = (label, g) => out.push(row([label, ...scale.map((s) => f(g(s), 2))]));
cr('Vercel metered usage (before credit)', (s) => s.metered);
cr('Vercel Pro (plan + overage after the $20 credit)', (s) => s.vercel);
cr('Vercel Observability Plus', (s) => s.obs);
cr('Neon Launch (compute + storage, history, snapshots)', (s) => s.neonL);
cr('Neon Scale, same usage (alternative)', (s) => s.neonS);
out.push(row(['Resend tier', ...scale.map((s) => s.tier)]));
cr('Resend', (s) => s.mailCost);
cr('Domain (.com, Porkbun)', (s) => s.domain);
cr('Operations stack (Lanes B and H)', (s) => s.ops);
cr('of which server-side tracing (10% sampled)', (s) => s.tracing);
cr('Platform and operations total', (s) => s.platform);
cr('Claude Ultra', () => I.claudeUltra);
cr('Cash costs', (s) => s.cash);
out.push('', '## Labour Hours a Month: fixed + variable x paying seats / 1,000');
out.push(
  '',
  row([
    'Case',
    'Fixed hours',
    'Variable hours per 1,000 seats',
    ...SIZES.map((P) => `Hours at ${P}`),
    'One-person ceiling (seats)',
  ]),
  row(['---', '---:', '---:', ...SIZES.map(() => '---:'), '---:']),
);
for (const k of CASES)
  out.push(
    row([
      k,
      I.fixedHours[k].toFixed(1),
      varHours[k].toFixed(1),
      ...SIZES.map((P) => hoursAt(k, P).toFixed(1)),
      Math.round(ceilingSeats[k]).toLocaleString('en-US'),
    ]),
  );
out.push(
  '',
  `Wages: support $${wages.support.living.toFixed(2)} an hour (living wage, derived: average of 48.00, 56.43 and 30.60 = ${wages.support.livingFull.toFixed(2)}, minus the average MIT medical line ${wages.support.medical.toFixed(2)}; BLS market median $${wages.support.market}); developer $${wages.dev.median} (BLS median; Lane D contractor $${wages.dev.contractor}, not loaded, a contractor bills all-in).`,
  `Loaded hourly cost (wage + employer payroll taxes + benefits, 2,080 h a year): support $${loading.support.low.toFixed(2)} low to $${loading.support.high.toFixed(2)} high, base (midpoint) $${I.rates.support.living.toFixed(2)}. Low: wage ${f(loading.support.wage * HOURS_YEAR)} + taxes ${f(loading.support.lowParts.taxes)} + benefits ${f(loading.support.lowParts.benefits)} a year. High: taxes ${f(loading.support.highParts.taxes)} + benefits ${f(loading.support.highParts.benefits)}. Market-rate support: $${loading.supportMarket.low.toFixed(2)} to $${loading.supportMarket.high.toFixed(2)}, base $${I.rates.support.market.toFixed(2)}. Developer: $${loading.dev.low.toFixed(2)} to $${loading.dev.high.toFixed(2)}, base $${I.rates.dev.median.toFixed(2)}.`,
  ...ROWS.map(
    (k) =>
      `Variable labour per paying seat, ${k} row: ${varHours[k].toFixed(2)} h per 1,000 seats x loaded $${I.rates.support.living.toFixed(2)} = $${((varHours[k] * I.rates.support.living) / 1000).toFixed(3)} a month (market rate: $${((varHours[k] * I.rates.support.market) / 1000).toFixed(3)}). Fixed labour ${f(I.fixedHours[k] * I.rates.dev.median)} a month (contractor rate ${f(I.fixedHours[k] * I.rates.dev.contractor)}).`,
  ),
  `AI assistance for support agents (on by default): the factor on minutes per support contact is ${aiFactor} (${AI.choice}; low 0.735, median 0.87, high 1.00), applied to the support part of the variable hours only. Each agent beyond the owner has a Claude Team seat at $${AI.seatPrice} a month (minimum ${AI.minSeats} seats), one agent per further ${I.oneFteHours} hours a month, rounded up; agents use the Team plan, never Pro, so customer messages are not trained on.`,
  `Salary line: structure C job ${f(fte)} a month (low benefits) plus hours above ${I.oneFteHours} a month bought as hired help at the living-wage support rate. Job high benefits: ${f(fteHigh)}; promised on-call alternative ${f(I.onCallMonth)} a month.`,
);
out.push('', '## One-Person Ceiling');
out.push(
  '',
  `Paying seats where hours cross ${I.oneFteHours} a month: low (primary) ${Math.round(ceilingSeats.low).toLocaleString('en-US')}, median (stress) ${Math.round(ceilingSeats.median).toLocaleString('en-US')}, high ${Math.round(ceilingSeats.high).toLocaleString('en-US')}.`,
);
for (const k of ROWS) {
  ROW = k;
  out.push(
    '',
    `## Totals, USD a Month (${k} contact-rate row${k === 'low' ? ', primary' : ', stress case'})`,
  );
  out.push(row(['Row', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
  const tr = (label, g) => out.push(row([label, ...scale.map((s) => f(g(s)))]));
  tr('Cash costs', (s) => s.cash);
  out.push(row(['Labour hours a month', ...scale.map((s) => hoursAt(k, s.P).toFixed(1))]));
  out.push(
    row([
      'Claude Team seats for support agents (in every labour row below)',
      ...scale.map((s) => aiAgents(s.P)),
    ]),
  );
  tr('Labour alone at base rates', (s) => labourLoaded(s.P));
  tr('Cash + labour at base rates', (s) => s.cash + labourLoaded(s.P));
  tr('Cash + labour at the BLS market support rate', (s) => s.cash + labourMarket(s.P));
  tr('Cash + labour with contractor engineering rate', (s) => s.cash + labourSens(s.P));
  tr(
    'Cash + structure C job (recommended, pending accountant; low benefits) + hired hours',
    (s) => s.cash + labourSalary(s.P),
  );
  tr(
    'Cash + structure C job (high benefits) + hired hours',
    (s) => s.cash + fteHigh + hiredHours(s.P) * I.rates.support.living + aiCost(s.P),
  );
  tr(
    'Sensitivity: cash + all-salary job (A; low benefits) + hired hours',
    (s) => s.cash + fteA + hiredHours(s.P) * I.rates.support.living + aiCost(s.P),
  );
  tr(
    'Cash + labour at base rates + promised on-call',
    (s) => s.cash + labourLoaded(s.P) + I.onCallMonth,
  );
}
ROW = 'low';
out.push('', '## Salary Structures (with employer benefits)');
out.push(
  '',
  row([
    'Structure',
    'Business earnings a year',
    'a month',
    'Saving against A',
    'Loaded a year, low benefits',
    'Loaded a year, high benefits',
  ]),
  row(['---', '---:', '---:', '---:', '---:', '---:']),
  ...I.structures.map((x) =>
    row([
      x.name,
      f(x.year, 0),
      f(x.year / 12, 0),
      f(structYear('A') - x.year, 0),
      f(x.year + I.benefitsYear.low, 0),
      f(x.year + I.benefitsYear.high, 0),
    ]),
  ),
);
out.push('', '## Models (c) and (g) Seat Pricing');
out.push(
  '',
  row(['Quantity', 'Value']),
  row(['---', '---:']),
  row([
    'Paying-steward share of accounts (memberships per account / members per coven)',
    pct(stewardShare),
  ]),
  row(['Share of seats that are a second or later membership', pct(extraSeatShare)]),
  row(['Share of seats discounted (product of the two)', pct(discountedSeatShare)]),
  row(['Seat price factor after the 50% discount', memberSeatFactor.toFixed(4)]),
  row(['Practitioner seats per coven (70%)', practitionersPerCoven.toFixed(2)]),
  row(['Observer seats per coven (30%)', observersPerCoven.toFixed(2)]),
  row([
    'Extra practitioner seats above the 3 in the base',
    Math.max(0, practitionersPerCoven - I.price.c_incl).toFixed(2),
  ]),
  row([
    'Price per coven ($6 + ($2 x extra practitioners + $1 x observers) x factor)',
    f(cPerCoven, 4),
  ]),
);
out.push('', '## Model (h) Flat Seats');
out.push(
  '',
  row(['Quantity', 'Value']),
  row(['---', '---:']),
  row(['Practitioner seats per coven', practitionersPerCoven.toFixed(2)]),
  row(['Observer seats per coven', observersPerCoven.toFixed(2)]),
  row(['Observers who upgrade to a practitioner seat (take-up)', pct(I.price.observerTakeUp)]),
  row(['Seat price factor after the paying-steward discount', memberSeatFactor.toFixed(4)]),
  row(['(g) revenue per paying seat to match', f(gPerSeat, 4)]),
  row(['Calibrated practitioner price, observer held at $1', f(hCalibrated, 4)]),
  row(['Rounded to the cent', f(hCalibratedRounded, 2)]),
  row(['Practitioner price that matches (c) per group coven alone', f(hCovenMatch, 4)]),
  row(['Group coven revenue at $3 / $1', f(hPerCoven(I.price.h_ill, I.price.h_obs), 4)]),
  row([
    'Group coven revenue at calibrated / $1',
    f(hPerCoven(hCalibratedRounded, I.price.h_obs), 4),
  ]),
  row(['Revenue per paying seat at $3 / $1', f(models.h_ill.price, 4)]),
  row(['Revenue per paying seat at calibrated / $1', f(models.h_cal.price, 4)]),
);
out.push('', '## Model (i) One Price List');
out.push(
  '',
  row(['Quantity', 'Value']),
  row(['---', '---:']),
  row(['Personal plan (solo coven bought alone)', f(I.price.i_personal, 2)]),
  row(['Share of covens on each-member-pays', pct(I.price.i_payerShare)]),
  row(['Second-or-later memberships', pct(extraSeatShare)]),
  row(['Seats that earn the discount', pct(iDiscountedSeatShare)]),
  row(['Seat price factor after the self-paid discount', iSeatFactor.toFixed(4)]),
  row(['Seat price factor if no covens are each-member-pays', (1).toFixed(4)]),
  row([
    'Seat price factor if every coven is each-member-pays',
    (1 - extraSeatShare * I.price.c_disc).toFixed(4),
  ]),
  row(['(g) revenue per paying seat to match', f(gPerSeat, 4)]),
  row(['Calibrated practitioner price, observer $1, personal $3.50', f(iCalibrated, 4)]),
  row(['Rounded to the cent', f(iCalibratedRounded, 2)]),
  row(['Group coven revenue at $3 / $1', f(iPerCoven(I.price.h_ill, I.price.h_obs), 4)]),
  row([
    'Group coven revenue at calibrated / $1',
    f(iPerCoven(iCalibratedRounded, I.price.h_obs), 4),
  ]),
  row(['Revenue per paying seat at $3 / $1', f(models.i_ill.price, 4)]),
  row(['Revenue per paying seat at calibrated / $1', f(models.i_cal.price, 4)]),
);
out.push('', '## Model (g) Solo Coven Price Proposals');
out.push(
  '',
  row([
    'Solo coven price',
    'Revenue per paying seat',
    ...SIZES.map((P) => 'Net at ' + P),
    '(i)',
    '(ii)',
    '(iii)',
  ]),
  row(['---', ...Array(SIZES.length + 4).fill('---:')]),
);
for (const sp of I.price.gSolo) {
  const gm = makeG(sp);
  out.push(
    row([
      f(sp, 2),
      f(gm.price, 4),
      ...SIZES.map((P) => f(netAt(gm, P).net)),
      ...['cash', 'contractor', 'fulltime'].map((l) => seatText(seatsFor(gm, l))),
    ]),
  );
}
out.push(
  '',
  row(['', ...SIZES]),
  row(['---', ...SIZES.map(() => '---:')]),
  row(['Cost of free solo covens a month', ...SIZES.map((P) => f(models.g.extraCash(P), 2))]),
);
out.push('', '## Net Revenue a Month by Model (after churn, Stripe fees on option 1, WA B&O)');
out.push(
  '',
  row(['Model', 'Price per paying unit', ...SIZES]),
  row(['---', '---:', ...SIZES.map(() => '---:')]),
);
for (const m of Object.values(models))
  out.push(row([m.name, f(m.price, 2), ...SIZES.map((P) => f(netAt(m, P).net))]));
out.push('', '### Option 2 (Managed Payments)');
out.push(row(['Model', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
for (const m of Object.values(models))
  out.push(row([m.name, ...SIZES.map((P) => f(netAt(m, P, true).net))]));
out.push(
  '',
  '## Clears (i) cash / (ii) cash + labour at base rates / (iii) cash + structure C job (low benefits)',
);
const yn = (v) => (v ? 'Y' : 'n');
for (const k of ROWS) {
  ROW = k;
  out.push('', `### ${k} row`);
  out.push(row(['Model', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
  for (const m of Object.values(models))
    out.push(
      row([
        m.name,
        ...scale.map((s) => {
          const n = netAt(m, s.P).net;
          const x = m.extraCash ? m.extraCash(s.P) : 0;
          return [s.cash + x, s.cash + x + labourLoaded(s.P), s.cash + x + labourSalary(s.P)]
            .map((c) => yn(n >= c))
            .join(' ');
        }),
      ]),
    );
}
ROW = 'low';
out.push(
  '',
  '## Seats Needed to Break Even, (i) cash / (ii) cash + labour at loaded rates / (iii) cash + full-time job',
);
out.push(
  row(['Model', '(i)', '(ii) low', '(iii) low', '(ii) median', '(iii) median']),
  row(['---', '---:', '---:', '---:', '---:', '---:']),
);
for (const m of Object.values(models))
  out.push(
    row([
      m.name,
      seatText(seatsFor(m, 'cash')),
      ...ROWS.flatMap((k) =>
        withRow(k, () => ['contractor', 'fulltime'].map((l) => seatText(seatsFor(m, l)))),
      ),
    ]),
  );
out.push(
  '',
  `At ${Math.round(ceilingSeats.median).toLocaleString('en-US')} paying seats (median; ${Math.round(ceilingSeats.low).toLocaleString('en-US')} low, ${Math.round(ceilingSeats.high).toLocaleString('en-US')} high) the work exceeds one person (${I.oneFteHours} hours a month). This holds for every model, since the hours depend on paying seats.`,
);
// Price that clears labour at 10,000 paying seats: net revenue = cash + labour (line 'contractor', the loaded-rate labour line) or cash + job
// ('fulltime'). Practitioner seat price scaled with x; observers stay at c_obs; solo prices scale in proportion.
const CLEAR_P = 10000;
const COMPARABLES = [1.58, 5.99]; // solo grimoire apps $1.58 to $3.33, Obsidian $4 to $5, Roll20 Plus $5.99
const clearBuilders = {
  b: {
    name: '(b) Each user pays',
    build: (x) => ({ ...models.b, price: I.price.b * x }),
    shown: (x) => I.price.b * x,
  },
  c: {
    name: '(c) Base plus seats',
    build: (x) => ({ ...models.c, price: covenPriceAt(x) }),
    shown: (x) => I.price.c_seat * x,
  },
  g: {
    name: '(g) Group plan includes a solo coven',
    build: (x) => makeG(I.price.gSoloModelled * x, covenPriceAt(x)),
    shown: (x) => I.price.c_seat * x,
  },
  h: {
    name: '(h) Flat seats',
    build: (x) => makeH('h', x, 'solved'),
    shown: (x) => x,
  },
  i: {
    name: '(i) One price list',
    build: (x) => makeI('i', x, 'solved', x + (I.price.i_personal - I.price.h_ill)),
    shown: (x) => x,
  },
};
function clearingX(id, line, row) {
  const b = clearBuilders[id];
  const short = (x) =>
    withRow(row, () => {
      const m = b.build(x);
      return netAt(m, CLEAR_P).net < costFor(m, line, CLEAR_P);
    });
  let lo = 0,
    hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (short(mid)) lo = mid;
    else hi = mid;
  }
  return hi;
}
const clearing = Object.fromEntries(
  Object.keys(clearBuilders).map((id) => {
    const b = clearBuilders[id];
    // h's x is the practitioner price itself; the others scale a base price
    const at = (line, row) => {
      const x = clearingX(id, line, row);
      return { x, price: b.shown(x) };
    };
    const low = at('contractor', 'low'),
      median = at('contractor', 'median'),
      lowJob = at('fulltime', 'low'),
      medianJob = at('fulltime', 'median');
    const inside = (v) => (v < COMPARABLES[0] ? 'below' : v > COMPARABLES[1] ? 'above' : 'inside');
    return [
      id,
      {
        name: b.name,
        low: low.price,
        median: median.price,
        lowJob: lowJob.price,
        medianJob: medianJob.price,
        scale: { low: low.x, median: median.x, lowJob: lowJob.x, medianJob: medianJob.x },
        comparablesRange: COMPARABLES,
        inside: {
          low: inside(low.price),
          median: inside(median.price),
          lowJob: inside(lowJob.price),
          medianJob: inside(medianJob.price),
        },
      },
    ];
  }),
);
out.push(
  '',
  `## Price That Clears Labour at ${CLEAR_P.toLocaleString('en-US')} Paying Seats (practitioner or account price a month; observers held at $${I.price.c_obs}, solo prices scaled in proportion)`,
  '',
  row([
    'Model',
    'Today',
    'Cash + labour, low',
    'Cash + labour, median',
    'Cash + job, low',
    'Cash + job, median',
    'Comparables',
  ]),
  row(['---', '---:', '---:', '---:', '---:', '---:', '---']),
);
const today = {
  b: I.price.b,
  c: I.price.c_seat,
  g: I.price.c_seat,
  h: I.price.h_ill,
  i: I.price.h_ill,
};
for (const [id, c] of Object.entries(clearing))
  out.push(
    row([
      c.name,
      f(today[id], 2),
      `${f(c.low, 2)} ${c.inside.low}`,
      `${f(c.median, 2)} ${c.inside.median}`,
      `${f(c.lowJob, 2)} ${c.inside.lowJob}`,
      `${f(c.medianJob, 2)} ${c.inside.medianJob}`,
      `${f(COMPARABLES[0], 2)} to ${f(COMPARABLES[1], 2)}`,
    ]),
  );
out.push(
  '',
  `For (c) and (g) the figure is the practitioner seat price; the base scales with it (today $${I.price.c_base} base and $${I.price.c_seat} a seat), and for (g) the solo price too (today $${I.price.gSoloModelled}). For (g) the scale factors are low ${clearing.g.scale.low.toFixed(3)} and median ${clearing.g.scale.median.toFixed(3)}.`,
);
out.push(
  '',
  `For (h) and (i) the figure is the practitioner seat price. For (i) the personal plan moves with it, held ${f(I.price.i_personal - I.price.h_ill, 2)} above it, and the observer seat stays at ${f(I.price.h_obs, 2)}.`,
);
out.push(
  '',
  `Vercel Hobby limits: ${scale.map((s) => `${s.P} paying seats: ${(s.inv / 1e6).toFixed(2)}M invocations vs 1M, ${s.cpuH.toFixed(1)} h vs 4 h`).join('; ')}`,
);
out.push(
  `Model prices: ${Object.values(models)
    .map((m) => `${m.name} ${f(m.price, 2)}`)
    .join('; ')}`,
);
if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify({
      SIZES,
      ov,
      scale,
      labour: {
        hoursPerSize: CASES.map((k) => ({ case: k, hours: SIZES.map((P) => hoursAt(k, P)) })),
        fixedHours: I.fixedHours,
        variablePer1000: varHours,
        ceilingSeats,
        aiSupport: {
          factor: aiFactor,
          choice: AI.choice,
          factors: AI.factors,
          seatPrice: AI.seatPrice,
          minSeats: AI.minSeats,
          agentsPerSize: Object.fromEntries(
            ROWS.map((k) => [k, withRow(k, () => SIZES.map((P) => aiAgents(P)))]),
          ),
        },
        hoursMedian: SIZES.map((P) => hoursAt('median', P)),
        hoursLow: SIZES.map((P) => hoursAt('low', P)),
        perSeatLabour: Object.fromEntries(
          ROWS.map((k) => [
            k,
            {
              variableHoursPer1000: varHours[k],
              variablePerSeat: (varHours[k] * I.rates.support.living) / 1000,
              variablePerSeatMarket: (varHours[k] * I.rates.support.market) / 1000,
              fixedMonth: I.fixedHours[k] * I.rates.dev.median,
              fixedMonthContractor: I.fixedHours[k] * I.rates.dev.contractor,
            },
          ]),
        ),
        perSize: Object.fromEntries(
          ROWS.map((k) => [
            k,
            withRow(k, () =>
              SIZES.map((P) => ({
                P,
                hours: hoursAt(k, P),
                labourTotal: scale.find((s) => s.P === P).cash + labourLoaded(P),
                labour: labourLoaded(P),
                labourSens: labourSens(P),
                loadedSalaryTotal: scale.find((s) => s.P === P).cash + labourSalary(P),
              })),
            ),
          ]),
        ),
        rates: I.rates,
        wages,
        loading,
      },
      clearing,
      gProposals: I.price.gSolo.map((sp) => {
        const gm = makeG(sp);
        return {
          solo: sp,
          perSeat: gm.price,
          net: SIZES.map((P) => netAt(gm, P).net),
          seats: ['cash', 'contractor', 'fulltime'].map((l) => seatsFor(gm, l)),
          seatsMedian: withRow('median', () =>
            ['cash', 'contractor', 'fulltime'].map((l) => seatsFor(gm, l)),
          ),
        };
      }),
      gExtra: SIZES.map((P) => models.g.extraCash(P)),
      cPerCoven,
      stewardShare,
      discountedSeatShare,
      memberSeatFactor,
      iSeatFactor,
      iDiscountedSeatShare,
      iCalibrated,
      practitionersPerCoven,
      observersPerCoven,
      fte,
      fteHigh,
      fteA,
      fteAHigh,
      structures: I.structures.map((x) => ({
        ...x,
        month: x.year / 12,
        saving: structYear('A') - x.year,
        loadedLow: x.year + I.benefitsYear.low,
        loadedHigh: x.year + I.benefitsYear.high,
      })),
      models: Object.values(models).map((m) => ({
        ...m,
        subsOf: undefined,
        extraCash: undefined,
        net: SIZES.map((P) => netAt(m, P).net),
        seats: ['cash', 'contractor', 'fulltime'].map((l) => seatsFor(m, l)),
        seatsMedian: withRow('median', () =>
          ['cash', 'contractor', 'fulltime'].map((l) => seatsFor(m, l)),
        ),
        clearingPrice: clearing[m.id.split('_')[0]],
      })),
    }),
  );
} else console.log(out.join('\n'));
