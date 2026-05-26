import { Link } from 'react-router-dom';
import type { CompanyRollup } from '../types';

export function CompanyPage({ company }: { company: CompanyRollup }) {
  // Build a continuous monthly axis from earliest incident to latest, or now
  const allMonths = collectMonths(company);
  const maxIncidentsInMonth = Math.max(...allMonths.map((m) => m.count), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:py-14">
      <div className="mb-6">
        <Link to="/" className="text-[12px] font-mono text-[var(--color-accent)] hover:underline">← Back to overview</Link>
      </div>

      <header className="mb-8 border-b border-[var(--color-hairline)] pb-6">
        <p className="eyebrow">Company drill-down</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mt-2 text-[var(--color-ink-strong)]">
          {company.name}
        </h1>
        <p className="mt-3 text-[var(--color-ink-muted)] text-[14px]">
          Status page · <a href={company.status_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline font-mono text-[12px]">{company.status_url}</a>
        </p>
      </header>

      {/* KPIs */}
      <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Incidents tracked" big={String(company.incidents_total)} />
        <Kpi label="Layoff events" big={String(company.layoff_events.length)} />
        <Kpi label="Earliest incident" big={company.incidents_first ?? '—'} mono />
        <Kpi label="Latest incident" big={company.incidents_last ?? '—'} mono />
      </section>

      {/* Timeline overlay */}
      <section className="mb-10">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">Monthly timeline</h2>
        <p className="text-[13.5px] text-[var(--color-ink-muted)] mt-1 mb-4">
          Bars show incidents per month from the status page. Arrows mark layoff events; arrow size scales with % of workforce cut.
        </p>
        <Timeline months={allMonths} maxCount={maxIncidentsInMonth} layoffs={company.layoff_events} />
      </section>

      {/* Layoff events list */}
      {company.layoff_events.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">Layoff events</h2>
          <p className="text-[13.5px] text-[var(--color-ink-muted)] mt-1 mb-4">
            Incident counts in the 90 days before and 90 days after each event. Empty windows happen when the status-page feed doesn't extend back that far.
          </p>
          <div className="dataset-card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--color-hairline)]" style={{ background: 'var(--color-paper-deep)' }}>
                <tr className="text-left">
                  <Th>Date</Th>
                  <Th align="right">Laid off</Th>
                  <Th align="right">% workforce</Th>
                  <Th align="right">Incidents 90d before</Th>
                  <Th align="right">Incidents 90d after</Th>
                  <Th align="right">Δ</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline-soft)]">
                {company.layoff_events.map((l, i) => (
                  <tr key={i} className="hover:bg-[var(--color-paper-deep)]">
                    <td className="px-3 py-2 font-mono text-[12px]">{l.date}</td>
                    <td className="px-3 py-2 text-right tabular">{l.laid_off?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular text-[var(--color-ink-muted)]">{l.pct != null ? `${(l.pct * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-2 text-right tabular">{l.before}</td>
                    <td className="px-3 py-2 text-right tabular">{l.after}</td>
                    <td className={`px-3 py-2 text-right tabular font-semibold ${l.delta > 0 ? 'text-[var(--color-fail)]' : l.delta < 0 ? 'text-[var(--color-pass)]' : 'text-[var(--color-ink-muted)]'}`}>
                      {l.delta > 0 ? '+' : ''}{l.delta}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {l.source && l.source.startsWith('http') ? (
                        <a href={l.source} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline truncate inline-block max-w-[220px]">
                          {hostnameOf(l.source)}
                        </a>
                      ) : (
                        <span className="text-[var(--color-ink-dim)] italic">{l.source || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function collectMonths(company: CompanyRollup) {
  if (company.monthly.length === 0) return [];
  // Fill gaps so the timeline reads continuously even when months had zero incidents.
  const all = company.monthly.map((m) => m.month).sort();
  const start = all[0];
  const end = all[all.length - 1];
  const counts = new Map(company.monthly.map((m) => [m.month, m.count]));
  const out: { month: string; count: number }[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push({ month: key, count: counts.get(key) ?? 0 });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function Timeline({ months, maxCount, layoffs }: { months: { month: string; count: number }[]; maxCount: number; layoffs: CompanyRollup['layoff_events'] }) {
  if (months.length === 0) {
    return <div className="dataset-card p-8 text-center text-[var(--color-ink-muted)] text-sm">No incident data.</div>;
  }
  const monthToIdx = new Map(months.map((m, i) => [m.month, i]));
  const W = 1000;
  const H = 240;
  const PAD = { l: 30, r: 20, t: 50, b: 50 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const barW = innerW / months.length;
  return (
    <div className="dataset-card p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 720 }}>
        {/* Bars (incidents per month) */}
        {months.map((m, i) => {
          const h = (m.count / maxCount) * innerH;
          const x = PAD.l + i * barW;
          const y = H - PAD.b - h;
          return (
            <g key={m.month}>
              <rect x={x + 1} y={y} width={Math.max(barW - 2, 1)} height={h} fill="var(--color-ink-muted)" opacity="0.5">
                <title>{m.month}: {m.count} incidents</title>
              </rect>
            </g>
          );
        })}
        {/* X axis ticks — every 3 months */}
        {months.filter((_, i) => i % 3 === 0).map((m, idx) => {
          const i = monthToIdx.get(m.month) ?? 0;
          return (
            <text key={idx} x={PAD.l + i * barW} y={H - PAD.b + 14} fontSize="9" fontFamily="JetBrains Mono, monospace" fill="var(--color-ink-muted)">
              {m.month}
            </text>
          );
        })}
        {/* Layoff arrows */}
        {layoffs.map((l, i) => {
          const monthKey = l.date.slice(0, 7);
          const idx = monthToIdx.get(monthKey);
          if (idx == null) return null;
          const x = PAD.l + idx * barW + barW / 2;
          const arrowSize = l.pct != null ? Math.max(6, Math.min(16, Math.sqrt((l.pct ?? 0) * 100) * 4)) : 8;
          return (
            <g key={i}>
              <line x1={x} y1={20} x2={x} y2={H - PAD.b} stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
              <polygon points={`${x},${20 + arrowSize} ${x - arrowSize / 1.5},${20} ${x + arrowSize / 1.5},${20}`} fill="var(--color-accent)" />
              <text x={x} y={14} fontSize="9" textAnchor="middle" fontWeight="600" fill="var(--color-accent)" fontFamily="JetBrains Mono, monospace">
                {l.date.slice(0, 7)}
              </text>
              <title>{`Layoff ${l.date}: ${l.laid_off ?? '?'} laid off${l.pct != null ? ` (${(l.pct * 100).toFixed(1)}%)` : ''}`}</title>
            </g>
          );
        })}
        {/* Y axis label */}
        <text x={PAD.l - 8} y={PAD.t + 4} textAnchor="end" fontSize="9" fill="var(--color-ink-muted)" fontFamily="JetBrains Mono, monospace">{maxCount}</text>
        <text x={PAD.l - 8} y={H - PAD.b} textAnchor="end" fontSize="9" fill="var(--color-ink-muted)" fontFamily="JetBrains Mono, monospace">0</text>
      </svg>
      <div className="mt-2 flex items-center gap-5 text-[11px] font-mono text-[var(--color-ink-muted)] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 bg-[var(--color-ink-muted)] opacity-50"></span> incidents per month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid var(--color-accent)' }}></span>
          layoff event (size ∝ % of workforce)
        </span>
      </div>
    </div>
  );
}

function Kpi({ label, big, mono = false }: { label: string; big: string; mono?: boolean }) {
  return (
    <div className="dataset-card p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] font-semibold">{label}</div>
      <div className={`font-serif text-2xl font-semibold mt-1 text-[var(--color-ink-strong)] tabular ${mono ? 'font-mono text-base' : ''}`}>{big}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function hostnameOf(url: string) {
  if (!url || !url.startsWith('http')) return url || '—';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
