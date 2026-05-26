import type { DataState } from '../App';

export function SourcesPage({ data }: { data: DataState }) {
  const companies = data.companies;
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 lg:py-14">
      <p className="eyebrow">Receipts</p>
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mt-2 text-[var(--color-ink-strong)]">Sources.</h1>
      <p className="mt-4 text-[var(--color-ink-muted)] text-[15px] leading-relaxed">
        Every URL the pipeline fetches. Snapshot generated at{' '}
        <strong className="text-[var(--color-ink-strong)] font-mono text-[13px]">
          {data.meta ? new Date(data.meta.generated_at).toLocaleString() : 'unknown'}
        </strong>.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)] mb-3">Layoffs dataset</h2>
        <ul className="list-disc list-outside pl-5 space-y-2 text-[14px]">
          <li>
            Roger Lee's <a className="text-[var(--color-accent)] hover:underline" href="https://layoffs.fyi" target="_blank" rel="noopener noreferrer">layoffs.fyi</a> tracker — community-sourced layoffs since 2020.
          </li>
          <li>
            CSV mirror via{' '}
            <a className="text-[var(--color-accent)] hover:underline font-mono text-[12.5px]" href={data.meta?.layoffs_source_url ?? '#'} target="_blank" rel="noopener noreferrer">
              {data.meta?.layoffs_source_url}
            </a>
          </li>
          <li>
            2024 augmentations: TechCrunch, Reuters, CNBC, Bloomberg, The Verge, The Information, Theinformation —
            individual source URLs are linked on each row of the events table.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)] mb-3">Status-page feeds ({companies.length} companies)</h2>
        <div className="dataset-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-hairline)]" style={{ background: 'var(--color-paper-deep)' }}>
              <tr className="text-left">
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-soft)]">Company</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-soft)]">Atom feed URL</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-soft)] text-right">Incidents</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-soft)] text-right">Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline-soft)]">
              {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 font-medium text-[var(--color-ink-strong)]">{c.name}</td>
                  <td className="px-3 py-2 text-[12px]">
                    <a className="text-[var(--color-accent)] hover:underline font-mono break-all" href={c.status_url} target="_blank" rel="noopener noreferrer">
                      {c.status_url.replace('https://', '').replace('http://', '')}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right tabular text-[12px]">{c.incidents_total}</td>
                  <td className="px-3 py-2 text-right tabular text-[10.5px] font-mono text-[var(--color-ink-muted)]">
                    {c.incidents_first ? `${c.incidents_first.slice(0, 7)} → ${(c.incidents_last ?? '').slice(0, 7)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
