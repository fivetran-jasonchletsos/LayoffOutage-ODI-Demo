import type { DataState } from '../App';

export function ArchitecturePage({ data }: { data: DataState }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 lg:py-14">
      <p className="eyebrow">Built on Fivetran Open Data Infrastructure</p>
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mt-2 text-[var(--color-ink-strong)]">Architecture.</h1>
      <p className="mt-4 max-w-3xl text-[var(--color-ink-muted)] text-[15px] leading-relaxed">
        This dataset is one of <span className="font-semibold text-[var(--color-ink-strong)]">38 industry demos</span> in
        the Fivetran ODI portfolio. Every demo follows the same medallion shape: source → Fivetran
        ingest → Iceberg lake on S3 → dbt transforms → query engine of choice. The viewer you're looking
        at right now is the gold-layer output.
      </p>

      {/* Diagram */}
      <section className="mt-10">
        <div className="dataset-card p-6 sm:p-8" style={{ background: 'linear-gradient(180deg, var(--color-paper-deep) 0%, var(--color-card) 100%)' }}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr] gap-6 items-stretch">
            <Zone title="Sources" sub="where it lives">
              <Pill label="layoffs.fyi" sub="public CSV mirror" />
              <Pill label="Status pages" sub="Atlassian-compatible atom feeds" />
              <Pill label="News URLs" sub="curated 2024 augmentation" />
              <Pill label="Wayback (next)" sub="historical /history snapshots" muted />
            </Zone>

            <Zone title="Open Data Lakehouse" sub="where it becomes useful" featured>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-mark)] text-center mb-3 font-semibold">
                Apache Iceberg · AWS Glue · S3
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Med label="Bronze" sub="raw layoffs + atom feeds" tone="bronze" />
                <Med label="Silver" sub="normalized event tables" tone="silver" />
                <Med label="Gold" sub="correlations + rollups" tone="gold" />
              </div>
              <div className="mt-3 text-[10.5px] font-mono text-[var(--color-ink-muted)] text-center">
                dbt on Snowflake compute · commits to Iceberg snapshots
              </div>
            </Zone>

            <Zone title="Consumers" sub="who reads it">
              <Pill label="Snowflake" sub="primary query engine" />
              <Pill label="Athena" sub="serverless ad-hoc" />
              <Pill label="DuckDB" sub="laptop analytics" />
              <Pill label="Run-time agents" sub="dbt-wizard reads the gold layer" />
              <Pill label="This Viewer" sub="static gold JSON" />
            </Zone>
          </div>
        </div>
      </section>

      <Section title="V1 vs. production">
        <p>
          The V1 shipped on this URL is a static-export shortcut: the ETL runs locally, writes JSON
          to <code className="font-mono text-[12.5px] bg-[var(--color-paper-deep)] px-1.5 rounded">app/public/data/</code>,
          and the SPA reads it directly. No warehouse round-trip at render time.
        </p>
        <p>
          The production architecture (what a Fivetran customer would actually deploy) is what's
          drawn above: Fivetran custom HTTP connectors land the raw layoffs CSV and the per-company
          atom feeds into Bronze Iceberg tables. dbt builds Silver (normalized event tables) and
          Gold (the correlations the chart reads). Humans and run-time agents read the same gold layer:
          the dbt-wizard run-time pairs four sub-agents (Explorer, Summary, Worker, Verification) to
          query the per-company drill-down.
        </p>
        <p>
          The dataset is small enough that the static-export version is the right choice for this
          demo. The architecture page exists to show what the same data would look like at scale.
        </p>
      </Section>

      <Section title="Why this shape">
        <Bullet>
          <strong>Sources are diverse.</strong> A CSV mirror, dozens of atom feeds, hand-curated news entries.
          The lake absorbs all three without needing a single proprietary connector format.
        </Bullet>
        <Bullet>
          <strong>Open table format.</strong> Iceberg means a future contributor can swap the warehouse
          (Snowflake → Databricks → BigQuery) without reingesting. The query is the only thing that changes.
        </Bullet>
        <Bullet>
          <strong>dbt does the math.</strong> Pre/post incident counts, percentile rollups, per-company aggregations —
          all SQL. Reproducible, version-controlled, peer-reviewable.
        </Bullet>
        <Bullet>
          <strong>Run-time agents could narrate (not enabled in v1).</strong> Each company drill-down could carry an
          agent-generated descriptive caption — incident counts and dates only, no quality judgments. Any agent output about a named
          company would be reviewed pre-publication before turning this on. Today the page shows only the data and the source.
        </Bullet>
      </Section>

      <Section title="The portfolio">
        <p>
          This is the 39th demo in the ODI portfolio. The others span healthcare, finserv, insurance,
          manufacturing, supply chain, retail, gaming, telecom, and more — each following this same
          shape, parameterized for the industry.
        </p>
        <p>
          <a className="text-[var(--color-accent)] hover:underline" href="https://fivetran-jasonchletsos.github.io/Fivetran-Demo-Repository/" target="_blank" rel="noopener noreferrer">
            Browse the full catalog →
          </a>
          {' '}or see all demos' health in{' '}
          <a className="text-[var(--color-accent)] hover:underline" href="https://fivetran-jasonchletsos.github.io/ODI-Mission-Control/" target="_blank" rel="noopener noreferrer">
            Mission Control →
          </a>
        </p>
      </Section>

      {/* Provenance */}
      {data.meta && (
        <div className="mt-12 p-4 rounded-md font-mono text-[11px] text-[var(--color-ink-muted)]" style={{ background: 'var(--color-paper-deep)', border: '1px solid var(--color-hairline)' }}>
          <strong className="text-[var(--color-ink-strong)]">Snapshot:</strong> {new Date(data.meta.generated_at).toLocaleString()}{' · '}
          <strong className="text-[var(--color-ink-strong)]">Companies:</strong> {data.meta.tracked_company_count}{' · '}
          <strong className="text-[var(--color-ink-strong)]">Events:</strong> {data.meta.tracked_event_count}{' · '}
          <strong className="text-[var(--color-ink-strong)]">Incidents:</strong> {data.meta.tracked_incident_count}
        </div>
      )}
    </div>
  );
}

function Zone({ title, sub, featured, children }: { title: string; sub: string; featured?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 rounded-sm p-4 ${featured ? 'bg-[var(--color-card)] border-2 border-[var(--color-hairline)]' : 'bg-[var(--color-card)] border border-dashed border-[var(--color-hairline)]'}`}>
      <header className="border-b border-[var(--color-hairline-soft)] pb-2">
        <div className="font-serif text-[15px] font-semibold tracking-[0.06em] text-[var(--color-ink-strong)]">{title}</div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)] italic">{sub}</div>
      </header>
      <div className="flex flex-col gap-2 flex-1">{children}</div>
    </div>
  );
}

function Pill({ label, sub, muted }: { label: string; sub: string; muted?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-sm border ${muted ? 'border-dashed border-[var(--color-hairline)] opacity-60' : 'border-[var(--color-hairline-soft)] bg-white'}`}>
      <div className="text-[13px] font-semibold text-[var(--color-ink-strong)]">{label}</div>
      <div className="text-[10.5px] text-[var(--color-ink-muted)]">{sub}</div>
    </div>
  );
}

function Med({ label, sub, tone }: { label: string; sub: string; tone: 'bronze' | 'silver' | 'gold' }) {
  const colors = {
    bronze: { bg: '#fef3c7', text: '#7a3d10', border: '#b45309' },
    silver: { bg: '#f3f4f6', text: '#374151', border: '#6b7280' },
    gold: { bg: '#faf3e1', text: '#7a5e2d', border: '#b8975c' },
  }[tone];
  return (
    <div className="text-center p-3 rounded-sm" style={{ background: colors.bg, borderTop: `3px solid ${colors.border}` }}>
      <div className="font-serif text-[13px] font-semibold tracking-[0.14em]" style={{ color: colors.text }}>{label}</div>
      <div className="text-[10px] mt-1" style={{ color: colors.text, opacity: 0.7 }}>{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)] mb-3">{title}</h2>
      <div className="space-y-3 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mt-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-mark)] mt-2.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
