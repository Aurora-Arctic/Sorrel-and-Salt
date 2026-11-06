// The M17.1 running-cost and break-even model. Run: node scripts/billing-model.mjs
// Every value below is a row of the Inputs table in claude-docs/billing/running-costs.md.
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
  memoryGb: 2, // sourced Lane A default function memory
  mailsPerAccountMonth: 0.5, // assumption, range 0.25-1
  mailingsPerYear: 2, // assumption
  // bytes (measured / derived, Lane E)
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
  // ops (Lane B, derived there)
  ops: {
    errors: [0, 15, 15, 50],
    uptime: [12, 12, 12, 12], // Solo: Free has no heartbeat monitors (Lane H)
    deliverability: [0, 0, 0, 14], // Postmark paid DMARC digests at 100k (Lane H)
    drain: [0, 0, 5, 50],
    restore: [0.03, 0.03, 0.03, 0.03],
  },
  // tracing (Lane H, A5): requests come from sessions x invocations; spans per request, sampling, price per 1M spans
  tracing: { spansPerReq: 20, sample: 0.1, perM: 0.5 },
  // labour
  // Lane I (sources dated 2026-11-06): hours a month = fixed + variable x (paying seats / 1,000)
  fixedHours: { low: 24.8, median: 44.4, high: 70.4 },
  // variable hours per 1,000 paying seats: support, payment disputes, privacy requests, abuse reports
  variableParts: {
    support: { low: 6.7, median: 28.0, high: 97.5 },
    disputes: { low: 0.36, median: 3.18, high: 6.82 },
    privacy: { low: 0.06, median: 0.37, high: 8.5 },
    abuse: { low: 0.01, median: 0.08, high: 0.16 },
  },
  oneFteHours: 160,
  contractor: { low: 95, median: 122.5, high: 150 },
  loaded: { low: 137.97, median: 147.81, high: 157.65 },
  salaryLoadedYear: { low: 286977, high: 327922 }, // Lane D: $250k salary + employer tax + benefits
  // Lane J (sources dated 2026-11-06): business earnings a year that leave the owner the take-home of a $250,000 salary
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
  // Lane D benefits (health, retirement), the same in every structure: method A (low) and method B (high)
  benefitsYear: { low: 20848, high: 57251 },
  onCallMonth: 2340,
  // payments and tax
  stripePct: 0.029 + 0.007 + 0.005,
  stripeFix: 0.3,
  mpExtra: 0.035,
  bo: 0.00471,
  boCredit: 55,
  churn: 0.061,
  // overhead on top of paying seats (owner, 2026-11-06: no free tier; Lane G shares)
  demoOnlyShare: 0.625, // derived 100% - 37.5% activation, Userpilot [G1]; range 0.574-0.70 [G1][G2]
  demoOnlyRange: [0.574, 0.625, 0.7],
  growthMonthly: [0.0284, 0.0284, 0.0284, 0.0153], // derived (1+40%)^(1/12)-1 under $1M ARR; (1+20%)^(1/12)-1 at 100k [G4]
  trialMonths: 1, // owner: one month standard
  trialConversion: 0.1, // sourced no-card "great", ChartMogul [G7]; "good" is 0.05
  trialConversionRange: [0.05, 0.1, 0.15], // 0.15 is the top of the no-card "great" band [G7]
  curatorSeats: 7, // owner: 7 seats including the curator
  seatsPerCurator: 1000, // owner: one curator per 1,000 paying seats
  curatorMin: 2, // owner: minimum 2
  // owner, 2026-11-06: 5% at first, falling as the site is established and beta testers are staff, not friends and family
  exemptShare: [0.05, 0.03, 0.015, 0.005], // assumption (schedule per size); owner to confirm
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
const varHours = Object.fromEntries(
  CASES.map((k) => [k, Object.values(I.variableParts).reduce((a, p) => a + p[k], 0)]),
);
// hours a month at P paying seats
const hoursAt = (k, P) => I.fixedHours[k] + (varHours[k] * P) / 1000;
// paying seats at which one person's 160 hours a month run out
const ceilingSeats = Object.fromEntries(
  CASES.map((k) => [k, ((I.oneFteHours - I.fixedHours[k]) / varHours[k]) * 1000]),
);
// hired help: hours above one person's 160 are bought at the median contractor rate
const hiredHours = (P) => Math.max(0, hoursAt('median', P) - I.oneFteHours);
const labourContractor = (P) => hoursAt('median', P) * I.contractor.median;
const labourLoaded = (P) => hoursAt('median', P) * I.loaded.median;
const labourSalary = (P) => fte + hiredHours(P) * I.contractor.median;
const structYear = (id) => I.structures.find((x) => x.id === id).year;
// the salary line is structure C plus Lane D's benefits; all-salary (A) is kept as a sensitivity row
const fte = (structYear('C') + I.benefitsYear.low) / 12,
  fteHigh = (structYear('C') + I.benefitsYear.high) / 12;
const fteA = (structYear('A') + I.benefitsYear.low) / 12,
  fteAHigh = (structYear('A') + I.benefitsYear.high) / 12;

// models: paying unit base and revenue per paying unit. A paying seat is one activated account
// in a paying coven, so paying covens = paying seats x memberships per account / members per coven.
// R5 (owner, 2026-11-06): only a member who is the paying steward of another coven gets the discount.
// Stewards are one per coven, so the share of accounts that are stewards = covens per account
// = memberships per account / members per coven. A seat is a second-or-later membership with
// probability (m - 1) / m, and that holder is a steward with the steward share (independence assumed).
const stewardShare = I.membershipsPerAccount / I.membersPerCoven;
const extraSeatShare = (I.membershipsPerAccount - 1) / I.membershipsPerAccount;
const discountedSeatShare = extraSeatShare * stewardShare;
const memberSeatFactor = 1 - discountedSeatShare * I.price.c_disc;
const practitionersPerCoven = I.membersPerCoven * (1 - I.price.observerShare);
const observersPerCoven = I.membersPerCoven * I.price.observerShare;
const cPerCoven =
  I.price.c_base +
  (I.price.c_seat * Math.max(0, practitionersPerCoven - I.price.c_incl) +
    I.price.c_obs * observersPerCoven) *
    memberSeatFactor;
// (g) layers a free solo coven on (c): each paid group seat also holds one, a person with no
// paid group seat buys a solo coven alone. Per paying seat: group share pays (c), the rest pays the solo price.
// Observers (owner, 2026-11-06) may add a solo coven by paying the difference to the solo price,
// on their own subscription. addOns = observers who take it up, per paying seat.
const observerAddOns = () =>
  (1 - I.price.gSoloAloneShare) * I.price.observerShare * I.price.observerTakeUp;
const makeG = (solo) => ({
  id: 'g',
  name: '(g) Group plan includes a solo coven (over (c))',
  base: 'account',
  price:
    (1 - I.price.gSoloAloneShare) * cPerCoven * (I.membershipsPerAccount / I.membersPerCoven) +
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
    `$${hCalibratedRounded.toFixed(2)} / $1 (calibrated to (g))`,
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
const lines = {
  cash: scale.map((s) => s.cash),
  contractor: scale.map((s) => s.cash + labourContractor(s.P)),
  fulltime: scale.map((s) => s.cash + labourSalary(s.P)),
};
function costAt(line, P) {
  const y = lines[line];
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
out.push('', '## Labour Hours a Month (Lane I): fixed + variable x paying seats / 1,000');
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
  `Variable labour per paying seat at the median: ${varHours.median.toFixed(1)} h per 1,000 seats x $${I.contractor.median} = $${((varHours.median * I.contractor.median) / 1000).toFixed(2)} a month. A model earning less than this per seat after fees has no break-even on a labour line.`,
  `Median contractor rate $${I.contractor.median} an hour; loaded-salary rate $${I.loaded.median}. Salary line: loaded salary ${f(fte)} a month (low) plus hours above ${I.oneFteHours} a month bought as hired help at the median contractor rate. Loaded salary high: ${f(fteHigh)}; promised on-call alternative ${f(I.onCallMonth)} a month.`,
);
out.push('', '## One-Person Ceiling');
out.push(
  '',
  `Paying seats where hours cross ${I.oneFteHours} a month: low ${Math.round(ceilingSeats.low).toLocaleString('en-US')}, median ${Math.round(ceilingSeats.median).toLocaleString('en-US')}, high ${Math.round(ceilingSeats.high).toLocaleString('en-US')}.`,
);
out.push('', '## Totals, USD a Month (median labour case)');
out.push(row(['Row', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const tr = (label, g) => out.push(row([label, ...scale.map((s) => f(g(s)))]));
tr('Cash costs', (s) => s.cash);
out.push(
  row(['Labour hours a month (median)', ...scale.map((s) => hoursAt('median', s.P).toFixed(1))]),
);
tr('Cash + labour at contractor rate', (s) => s.cash + labourContractor(s.P));
tr('Cash + labour at loaded-salary rate', (s) => s.cash + labourLoaded(s.P));
tr(
  'Cash + structure C job (recommended, pending accountant; low benefits) + hired hours',
  (s) => s.cash + labourSalary(s.P),
);
tr(
  'Cash + structure C job (recommended, pending accountant; high benefits) + hired hours',
  (s) => s.cash + fteHigh + hiredHours(s.P) * I.contractor.median,
);
tr(
  'Sensitivity: cash + all-salary job (A; low benefits) + hired hours',
  (s) => s.cash + fteA + hiredHours(s.P) * I.contractor.median,
);
tr(
  'Cash + median labour + promised on-call (contractor)',
  (s) => s.cash + labourContractor(s.P) + I.onCallMonth,
);
out.push('', '## Salary Structures (Lane J, with Lane D benefits)');
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
  '## Clears (i) cash / (ii) cash + contractor labour / (iii) cash + structure C job (low benefits)',
);
out.push(row(['Model', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const yn = (v) => (v ? 'Y' : 'n');
for (const m of Object.values(models))
  out.push(
    row([
      m.name,
      ...scale.map((s) => {
        const n = netAt(m, s.P).net;
        const x = m.extraCash ? m.extraCash(s.P) : 0;
        return [s.cash + x, s.cash + x + labourContractor(s.P), s.cash + x + labourSalary(s.P)]
          .map((c) => yn(n >= c))
          .join(' ');
      }),
    ]),
  );
out.push(
  '',
  '## Seats Needed to Break Even, (i) cash / (ii) cash + contractor labour / (iii) cash + full-time job',
);
out.push(row(['Model', '(i)', '(ii)', '(iii)']), row(['---', '---:', '---:', '---:']));
for (const m of Object.values(models))
  out.push(
    row([m.name, ...['cash', 'contractor', 'fulltime'].map((l) => seatText(seatsFor(m, l)))]),
  );
out.push(
  '',
  `At ${Math.round(ceilingSeats.median).toLocaleString('en-US')} paying seats (median; ${Math.round(ceilingSeats.low).toLocaleString('en-US')} low, ${Math.round(ceilingSeats.high).toLocaleString('en-US')} high) the work exceeds one person (${I.oneFteHours} hours a month). This holds for every model, since the hours depend on paying seats.`,
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
      },
      gProposals: I.price.gSolo.map((sp) => {
        const gm = makeG(sp);
        return {
          solo: sp,
          perSeat: gm.price,
          net: SIZES.map((P) => netAt(gm, P).net),
          seats: ['cash', 'contractor', 'fulltime'].map((l) => seatsFor(gm, l)),
        };
      }),
      gExtra: SIZES.map((P) => models.g.extraCash(P)),
      cPerCoven,
      stewardShare,
      discountedSeatShare,
      memberSeatFactor,
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
      })),
    }),
  );
} else console.log(out.join('\n'));
