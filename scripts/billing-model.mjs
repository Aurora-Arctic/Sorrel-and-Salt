// The M17.1 running-cost and break-even model. Run: node scripts/billing-model.mjs
// Every value below is a row of the Inputs table in claude-docs/billing/running-costs.md.
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
    uptime: [0, 0, 12, 12],
    drain: [0, 0, 5, 50],
    restore: [0.03, 0.03, 0.03, 0.03],
  },
  // labour
  maintHours: { low: 27.9, median: 29.9, high: 39.8 },
  incidentHours: { low: 2.4, median: 19.5, high: 36.6 },
  overlapH: 2,
  contractor: { low: 95, median: 122.5, high: 150 },
  loaded: { low: 137.97, median: 147.81, high: 157.65 },
  salaryLoadedYear: { low: 286977, high: 327922 },
  onCallMonth: 2340,
  // payments and tax
  stripePct: 0.029 + 0.007 + 0.005,
  stripeFix: 0.3,
  mpExtra: 0.035,
  bo: 0.00471,
  boCredit: 55,
  conv: 0.04,
  convHigh: 0.1,
  churn: 0.061,
  price: {
    a: 9.99,
    b: 4.0,
    c_base: 6,
    c_seat: 2,
    c_incl: 3,
    c_disc: 0.5,
    d: 2.5,
    e: 0.87 * 4.99 + 0.13 * 9.99,
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

const scale = SIZES.map((N, k) => {
  const covens = (N * I.membershipsPerAccount) / I.membersPerCoven;
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
  const ops = I.ops.errors[k] + I.ops.uptime[k] + I.ops.drain[k] + I.ops.restore[k];
  const domain = I.domainYear / 12;
  const platform = vercel + obs + neonL + mailCost + domain + ops;
  return {
    N,
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
    domain,
    platform,
    cash: platform + I.claudeUltra,
    mailDays: Math.ceil(N / 60),
  };
});

const hrs = (k) => I.maintHours[k] + I.incidentHours[k] - I.overlapH;
const maint = {};
for (const k of ['low', 'median', 'high'])
  maint[k] = { h: hrs(k), contractor: hrs(k) * I.contractor[k], loaded: hrs(k) * I.loaded[k] };
const fte = I.salaryLoadedYear.low / 12,
  fteHigh = I.salaryLoadedYear.high / 12;

// models: paying unit base and revenue per paying unit
const memberSeatFactor =
  1 - ((I.membershipsPerAccount - 1) / I.membershipsPerAccount) * I.price.c_disc;
const models = {
  a: { name: '(a) Coven pays, seat bundles', base: 'coven', price: I.price.a },
  b: { name: '(b) Each user pays', base: 'account', price: I.price.b },
  c: {
    name: '(c) Base plus seats',
    base: 'coven',
    price:
      I.price.c_base +
      I.price.c_seat * Math.max(0, I.membersPerCoven - I.price.c_incl) * memberSeatFactor,
  },
  d: { name: '(d) Solo rung only', base: 'account', price: I.price.d },
  e: { name: '(e) Any member pays', base: 'coven', price: I.price.e },
};
function net(units, price, mp = false) {
  const u = units * (1 - I.churn);
  const rev = u * price;
  const proc = rev * (mp ? 0.029 + 0.007 + I.mpExtra : I.stripePct) + u * I.stripeFix;
  const bo = Math.max(0, rev * I.bo - I.boCredit);
  return { rev, proc, bo, net: rev - proc - bo };
}
function unitsFor(target, price, mp = false) {
  let lo = 0,
    hi = 1e9;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    net(mid / (1 - I.churn), price, mp).net < target ? (lo = mid) : (hi = mid);
  }
  return hi / (1 - I.churn);
}
const out = [];
out.push('## Scale');
out.push(row(['Quantity', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const sr = (label, g, d = 0) =>
  out.push(
    row([label, ...scale.map((s) => g(s).toLocaleString('en-US', { maximumFractionDigits: d }))]),
  );
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
out.push(row(['Line', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const cr = (label, g) => out.push(row([label, ...scale.map((s) => f(g(s), 2))]));
cr('Vercel metered usage (before credit)', (s) => s.metered);
cr('Vercel Pro (plan + overage after the $20 credit)', (s) => s.vercel);
cr('Vercel Observability Plus', (s) => s.obs);
cr('Neon Launch (compute + storage, history, snapshots)', (s) => s.neonL);
cr('Neon Scale, same usage (alternative)', (s) => s.neonS);
out.push(row(['Resend tier', ...scale.map((s) => s.tier)]));
cr('Resend', (s) => s.mailCost);
cr('Domain (.com, Porkbun)', (s) => s.domain);
cr('Operations stack (Lane B)', (s) => s.ops);
cr('Platform and operations total', (s) => s.platform);
cr('Claude Ultra', () => I.claudeUltra);
cr('Cash costs', (s) => s.cash);
out.push('', '## Maintenance and Incident Hours a Month');
out.push(
  row(['Case', 'Hours', 'At contractor rate', 'At loaded-salary rate']),
  row(['---', '---:', '---:', '---:']),
);
for (const k of ['low', 'median', 'high'])
  out.push(
    row([
      k,
      maint[k].h.toFixed(1),
      `${f(maint[k].contractor)} (${hrs(k).toFixed(1)} h x $${I.contractor[k]})`,
      `${f(maint[k].loaded)} (${hrs(k).toFixed(1)} h x $${I.loaded[k]})`,
    ]),
  );
out.push(
  '',
  `Full-time job: ${f(fte)} a month (loaded low) to ${f(fteHigh)} (loaded high); promised on-call alternative ${f(I.onCallMonth)} a month.`,
);
out.push('', '## Totals, USD a Month (median maintenance case)');
out.push(row(['Row', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const tr = (label, g) => out.push(row([label, ...scale.map((s) => f(g(s)))]));
tr('Cash costs', (s) => s.cash);
tr('Cash + maintenance at contractor rate', (s) => s.cash + maint.median.contractor);
tr('Cash + maintenance at loaded-salary rate', (s) => s.cash + maint.median.loaded);
tr('Cash + full-time job (loaded $250k, low)', (s) => s.cash + fte);
tr('Cash + full-time job (loaded $250k, high)', (s) => s.cash + fteHigh);
tr(
  'Cash + median maintenance + promised on-call (contractor)',
  (s) => s.cash + maint.median.contractor + I.onCallMonth,
);
out.push('', '## Net Revenue a Month by Model (after churn, Stripe fees on option 1, WA B&O)');
for (const [lab, conv] of [
  ['4% paying (base)', I.conv],
  ['10% paying (high)', I.convHigh],
]) {
  out.push(
    '',
    `### ${lab}`,
    row(['Model', 'Price per paying unit', ...SIZES]),
    row(['---', '---:', ...SIZES.map(() => '---:')]),
  );
  for (const m of Object.values(models)) {
    out.push(
      row([
        m.name,
        f(m.price, 2),
        ...scale.map((s) => {
          const base = m.base === 'coven' ? s.covens : s.N;
          return f(net(base * conv, m.price).net);
        }),
      ]),
    );
  }
}
out.push('', '### Option 2 (Managed Payments), 4% paying');
out.push(row(['Model', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
for (const m of Object.values(models))
  out.push(
    row([
      m.name,
      ...scale.map((s) =>
        f(net((m.base === 'coven' ? s.covens : s.N) * I.conv, m.price, true).net),
      ),
    ]),
  );
out.push(
  '',
  '## Clears (i) cash / (ii) cash + contractor maintenance / (iii) cash + full-time job (loaded low), 4% paying',
);
out.push(row(['Model', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
const yn = (v) => (v ? 'Y' : 'n');
for (const m of Object.values(models))
  out.push(
    row([
      m.name,
      ...scale.map((s) => {
        const n = net((m.base === 'coven' ? s.covens : s.N) * I.conv, m.price).net;
        return [s.cash, s.cash + maint.median.contractor, s.cash + fte]
          .map((c) => yn(n >= c))
          .join(' ');
      }),
    ]),
  );
out.push('', '## Share of the Base That Must Pay to Clear (i) / (ii) / (iii)');
out.push(row(['Model (base)', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
for (const m of Object.values(models))
  out.push(
    row([
      `${m.name} (${m.base}s)`,
      ...scale.map((s) => {
        const base = m.base === 'coven' ? s.covens : s.N;
        return [s.cash, s.cash + maint.median.contractor, s.cash + fte]
          .map((c) => {
            const u = unitsFor(c, m.price) / base;
            return u > 1 ? '>100%' : pct(u);
          })
          .join(' / ');
      }),
    ]),
  );
out.push('', '## Free-Tier Cost per Account');
out.push(row(['Quantity', ...SIZES]), row(['---', ...SIZES.map(() => '---:')]));
out.push(
  row([
    'Platform and operations cost per account a month',
    ...scale.map((s) => f(s.platform / s.N, 4)),
  ]),
);
const marg = (scale[3].platform - scale[2].platform) / (scale[3].N - scale[2].N);
out.push(row(['Marginal cost per account, 10,000 to 100,000', f(marg, 4), '', '', '']));
const net1 = (m) => net(1 / (1 - I.churn), m.price).net;
out.push(
  '',
  `Free accounts one paying unit carries at the marginal cost: ` +
    Object.values(models)
      .map((m) => `${m.name}: ${Math.floor(net1(m) / marg)}`)
      .join('; '),
);
out.push(
  '',
  `Vercel Hobby limits: ${scale.map((s) => `${s.N}: ${(s.inv / 1e6).toFixed(2)}M invocations vs 1M, ${s.cpuH.toFixed(1)} h vs 4 h`).join('; ')}`,
);
out.push(
  `Model prices: ${Object.values(models)
    .map((m) => `${m.name} ${f(m.price, 2)}`)
    .join('; ')}`,
);
console.log(out.join('\n'));
