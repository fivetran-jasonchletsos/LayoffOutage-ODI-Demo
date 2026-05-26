import { Link } from 'react-router-dom';
import type { DataState } from '../App';

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtPct(p: number | null): string {
  if (p === null) return '—';
  return `${(p * 100).toFixed(1)}%`;
}

function fmtCount(n: number | null): string {
  if (n == null) return '?';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function HomePage({ data }: { data: DataState }) {
  const meta = data.meta;
  const eventsWithBoth = data.events.filter(
    (e) => e.incidents_before_90d > 0 && e.incidents_after_90d > 0
  );
  const totalLaidOff = data.layoffs.reduce((s, l) => s + (l.laid_off ?? 0), 0);
  const oldestEvent = data.layoffs.length
    ? [...data.layoffs].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 4)
    : '—';
  const newestEvent = data.layoffs.length
    ? [...data.layoffs].sort((a, b) => b.date.localeCompare(a.date))[0].date.slice(0, 4)
    : '—';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      {/* Hero */}
      <header className="mb-10 border-b border-[var(--color-hairline)] pb-8">
        <p className="eyebrow">Public dataset · v1</p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mt-2 text-[var(--color-ink-strong)] leading-[1.05]">
          Layoffs vs. Outages.
        </h1>
        <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
          A reproducible cross-reference between publicly-reported corporate layoff events and the
          companies' own public status-page incident histories. {meta?.tracked_company_count} companies,
          tracked layoff events from {oldestEvent} to {newestEvent}.
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          The question is Connor Dickson's:{' '}
          <em>do layoffs hurt software quality?</em> This is one lens on it — public layoff events vs. public status-page incidents.
          The methodology page sets out what the dataset can and can't tell you before you draw conclusions.
        </p>
      </header>

      {/* KPIs */}
      <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Companies tracked" big={String(meta?.tracked_company_count ?? data.companies.length)} sub="public status-page atom feeds" />
        <Kpi label="Layoff events" big={fmt(data.layoffs.length)} sub={`${fmt(totalLaidOff)} people impacted`} />
        <Kpi label="Status-page incidents" big={fmt(meta?.tracked_incident_count ?? 0)} sub="counted across all companies" />
        <Kpi label="Events with full overlap" big={String(eventsWithBoth.length)} sub="have ≥1 incident both 90d before AND after" />
      </section>

      {/* Caveat banner */}
      <section className="mb-10 p-5 rounded-md" style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.25)' }}>
        <p className="text-[12.5px] leading-relaxed text-[var(--color-ink)]">
          <strong className="text-[var(--color-warn)]">Correlation, not causation.</strong>{' '}
          Status-page incident severity isn't normalized across companies, and the layoff dataset (community-sourced via{' '}
          <a href="https://layoffs.fyi" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">layoffs.fyi</a>) has selection biases.
          {' '}<Link to="/methodology" className="text-[var(--color-accent)] hover:underline">Full methodology →</Link>
        </p>
      </section>

      {/* Correlation scatter */}
      <section className="mb-12">
        <SectionHeader title="Correlation scatter" sub="Each dot is a layoff event with ≥1 incident in either 90-day window. X: % of workforce cut. Y: incidents-after minus incidents-before. Δ is descriptive — not a causal claim. Color is for direction of change only." />
        <Scatter events={data.events} />
      </section>

      {/* Top events table */}
      <section className="mb-12">
        <SectionHeader title="Tracked layoff events" sub={`All ${data.events.length} events at tracked companies, sorted by date (most recent first). The Δ column is descriptive — not a ranking of software quality. See the methodology page for what the windows can and can't tell you.`} />
        <div className="dataset-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[var(--color-hairline)]" style={{ background: 'var(--color-paper-deep)' }}>
              <tr className="text-left">
                <Th>Company</Th>
                <Th>Date</Th>
                <Th align="right">Laid off</Th>
                <Th align="right">% workforce</Th>
                <Th align="right">Incidents · 90d before</Th>
                <Th align="right">Incidents · 90d after</Th>
                <Th align="right">Δ</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline-soft)]">
              {[...data.events]
                .sort((a, b) => b.date.localeCompare(a.date) || (b.laid_off ?? 0) - (a.laid_off ?? 0))
                .map((e, i) => (
                  <tr key={`${e.company}-${e.date}-${i}`} className="hover:bg-[var(--color-paper-deep)]">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/company/${encodeURIComponent(e.company)}`} className="text-[var(--color-ink-strong)] hover:text-[var(--color-accent)]">
                        {e.company}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px]">{e.date}</td>
                    <td className="px-3 py-2 text-right tabular">{fmtCount(e.laid_off)}</td>
                    <td className="px-3 py-2 text-right tabular text-[var(--color-ink-muted)]">{fmtPct(e.pct)}</td>
                    <td className="px-3 py-2 text-right tabular">{e.incidents_before_90d}</td>
                    <td className="px-3 py-2 text-right tabular">{e.incidents_after_90d}</td>
                    <td className={`px-3 py-2 text-right tabular font-semibold ${e.delta > 0 ? 'text-[var(--color-fail)]' : e.delta < 0 ? 'text-[var(--color-pass)]' : 'text-[var(--color-ink-muted)]'}`}>
                      {e.delta > 0 ? '+' : ''}{e.delta}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <SourceLink href={e.source} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-company grid */}
      <section className="mb-12">
        <SectionHeader title="Tracked companies" sub="Click any company for the full timeline overlay: monthly incident bars + layoff event arrows." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...data.companies]
            .sort((a, b) => b.incidents_total - a.incidents_total)
            .map((c) => (
              <Link key={c.name} to={`/company/${encodeURIComponent(c.name)}`} className="dataset-card p-4 hover:border-[var(--color-accent)] transition-colors block">
                <div className="font-semibold text-[var(--color-ink-strong)]">{c.name}</div>
                <div className="text-[10.5px] text-[var(--color-ink-soft)] font-mono mt-1 truncate">
                  {c.status_url.replace('https://', '').replace('/history.atom', '').replace('/feed/atom', '').replace('/feed?domain=auth0.com', '')}
                </div>
                <div className="mt-2 flex items-baseline justify-between text-[11.5px]">
                  <span className="font-mono tabular text-[var(--color-ink)]"><strong>{c.incidents_total}</strong> incidents</span>
                  <span className="font-mono tabular text-[var(--color-ink-muted)]">{c.layoff_events.length} layoff{c.layoff_events.length === 1 ? '' : 's'}</span>
                </div>
                {c.incidents_first && (
                  <div className="mt-1 text-[10px] font-mono text-[var(--color-ink-dim)]">
                    {c.incidents_first} → {c.incidents_last}
                  </div>
                )}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">{title}</h2>
      <p className="text-[13.5px] text-[var(--color-ink-muted)] mt-1">{sub}</p>
    </div>
  );
}

function Kpi({ label, big, sub }: { label: string; big: string; sub: string }) {
  return (
    <div className="dataset-card p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] font-semibold">{label}</div>
      <div className="font-serif text-3xl font-semibold mt-1 text-[var(--color-ink-strong)] tabular">{big}</div>
      <div className="text-[11.5px] text-[var(--color-ink-muted)] mt-1.5">{sub}</div>
    </div>
  );
}

function SourceLink({ href }: { href: string }) {
  if (!href || !href.startsWith('http')) {
    return <span className="text-[var(--color-ink-dim)] italic truncate inline-block max-w-[180px]">{href || '—'}</span>;
  }
  let label = href;
  try { label = new URL(href).hostname.replace('www.', ''); } catch { /* keep href as label */ }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline truncate inline-block max-w-[180px]">
      {label}
    </a>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Scatter({ events }: { events: import('../types').CorrelationEvent[] }) {
  // Show every event with at least one nonzero side, to maximize visible dots
  const dots = events.filter((e) => e.incidents_before_90d > 0 || e.incidents_after_90d > 0);
  if (dots.length === 0) {
    return (
      <div className="dataset-card p-8 text-center text-[var(--color-ink-muted)] text-sm">
        No events with incident coverage in their windows yet. Atom feeds cap at the most-recent ~25 incidents per company.
      </div>
    );
  }
  const W = 800;
  const H = 360;
  const PAD = { l: 60, r: 30, t: 20, b: 50 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const maxPct = Math.max(...dots.map((d) => d.pct ?? 0), 0.2);
  const maxDelta = Math.max(...dots.map((d) => Math.abs(d.delta)), 5);

  const xScale = (pct: number) => PAD.l + (pct / maxPct) * innerW;
  const yScale = (delta: number) => PAD.t + innerH / 2 - (delta / maxDelta) * (innerH / 2);
  const rScale = (laid: number | null) => {
    if (!laid) return 4;
    return Math.max(4, Math.min(18, Math.sqrt(laid) / 8));
  };
  const colorFor = (delta: number) => (delta > 0 ? '#dc2626' : delta < 0 ? '#15803d' : '#9ca3af');

  return (
    <div className="dataset-card p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 400 }}>
        {/* Axes */}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--color-hairline)" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-hairline)" />
        {/* Zero line for Y */}
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH / 2} y2={PAD.t + innerH / 2} stroke="var(--color-hairline)" strokeDasharray="3 3" />
        {/* Y axis ticks */}
        {[-1, -0.5, 0, 0.5, 1].map((frac) => {
          const v = Math.round(frac * maxDelta);
          return (
            <g key={frac}>
              <text x={PAD.l - 8} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="var(--color-ink-muted)" fontFamily="JetBrains Mono, monospace">
                {v > 0 ? '+' : ''}{v}
              </text>
            </g>
          );
        })}
        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const v = frac * maxPct;
          return (
            <g key={frac}>
              <text x={xScale(v)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--color-ink-muted)" fontFamily="JetBrains Mono, monospace">
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
        {/* Axis labels */}
        <text x={PAD.l + innerW / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
          % of workforce cut
        </text>
        <text x={20} y={PAD.t + innerH / 2} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)" transform={`rotate(-90, 20, ${PAD.t + innerH / 2})`}>
          incidents Δ (after − before)
        </text>
        {/* Dots */}
        {dots.map((d, i) => (
          <g key={i}>
            <circle
              cx={xScale(d.pct ?? 0)}
              cy={yScale(d.delta)}
              r={rScale(d.laid_off)}
              fill={colorFor(d.delta)}
              opacity="0.75"
              stroke="white"
              strokeWidth="1.5"
            >
              <title>{`${d.company} · ${d.date}\nLaid off: ${d.laid_off ?? '?'} (${((d.pct ?? 0) * 100).toFixed(1)}%)\nIncidents before: ${d.incidents_before_90d}\nIncidents after: ${d.incidents_after_90d}\nΔ: ${d.delta > 0 ? '+' : ''}${d.delta}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex items-center gap-5 text-[11px] font-mono text-[var(--color-ink-muted)] flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-fail)] inline-block" /> more incidents after</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-pass)] inline-block" /> fewer incidents after</span>
        <span>dot size ∝ √(employees laid off)</span>
        <span className="ml-auto">{dots.length} events shown</span>
      </div>
    </div>
  );
}
