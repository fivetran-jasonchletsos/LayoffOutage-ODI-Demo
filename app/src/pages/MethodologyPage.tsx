import type { DataState } from '../App';

export function MethodologyPage({ data }: { data: DataState }) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-14">
      <p className="eyebrow">How the dataset is built</p>
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mt-2 text-[var(--color-ink-strong)]">Methodology.</h1>
      <p className="mt-4 text-[var(--color-ink-muted)] text-[15px] leading-relaxed">
        Every number on this site is reproducible from the public sources below.{' '}
        Anyone can clone the repo, run <code className="font-mono text-[12.5px] bg-[var(--color-paper-deep)] px-1.5 rounded">python etl/build.py</code>,
        and regenerate every JSON file the frontend reads.
      </p>

      <Section title="What we measure">
        <p>
          For each layoff event at a company with a public status page, we count the number of
          incidents reported on that status page in the <strong>90 days before</strong> and{' '}
          <strong>90 days after</strong> the event. The difference (Δ) is what the scatter chart
          and table on the overview page show.
        </p>
        <p>
          We do <strong>not</strong> infer causation. Incident counts pre- and post-layoff are
          descriptive only. Many other factors move incident velocity: product launches, traffic
          spikes, infrastructure changes, third-party outages, holidays.
        </p>
      </Section>

      <Section title="Data sources">
        <SubTitle>Layoffs</SubTitle>
        <p>
          The <a className="text-[var(--color-accent)] hover:underline" href="https://layoffs.fyi" target="_blank" rel="noopener noreferrer">layoffs.fyi</a> dataset
          maintained by Roger Lee. Used via a community CSV mirror at{' '}
          <a className="text-[var(--color-accent)] hover:underline font-mono text-[12px]" href={data.meta?.layoffs_source_url ?? '#'} target="_blank" rel="noopener noreferrer">
            github.com/bigyaa/Layoff-Prediction-Model
          </a>. Each entry is one event: company, date, employees laid off, % of workforce, source URL.
        </p>
        <p>
          The mirror's last update is February 2024. We augment with a curated list of major
          2024–Sep events (Microsoft, Tesla, Cisco, Intel, Dell, Snap, Discord, Twitch, and others)
          drawn from public news. Each augmentation has its own source URL on the overview table.
        </p>

        <SubTitle>Incidents</SubTitle>
        <p>
          Every tracked company publishes incidents on a public status page powered by{' '}
          <a className="text-[var(--color-accent)] hover:underline" href="https://www.atlassian.com/software/statuspage" target="_blank" rel="noopener noreferrer">Atlassian Statuspage</a>
          {' '}or compatible software. Each page exposes a stable atom feed at <code className="font-mono text-[12.5px] bg-[var(--color-paper-deep)] px-1.5 rounded">/history.atom</code>.
          We fetch the feed, parse the <code className="font-mono text-[12.5px] bg-[var(--color-paper-deep)] px-1.5 rounded">&lt;published&gt;</code> dates, and count.
        </p>
      </Section>

      <Section title="What we left out — and why">
        <Bullet>
          <strong>Severity normalization.</strong> A "minor" incident at Stripe and a "major" incident at Discord
          count the same in our raw count. We deliberately didn't try to normalize because every
          company's severity rubric is different — and normalizing would inject our judgment into
          the data.
        </Bullet>
        <Bullet>
          <strong>Atom-feed history window.</strong> Atlassian Statuspage atom feeds typically return the most
          recent ~25 incidents. For high-incident companies that's ~6 months; for low-incident
          companies it can span years. The "events with full overlap" KPI on the overview page is
          the honest count of events where both 90-day windows have data.
        </Bullet>
        <Bullet>
          <strong>Companies without public status pages.</strong> Many large employers don't publish status pages,
          publish only on Twitter, or use a non-Atlassian platform without a stable feed. We track
          {' '}{data.meta?.tracked_company_count ?? '~40'} companies because that's where the data is reliably
          machine-readable today. Future iterations can expand this with status-page scraping or
          Wayback Machine historical fetches.
        </Bullet>
        <Bullet>
          <strong>Downdetector.</strong> Connor's original post referenced{' '}
          <a className="text-[var(--color-accent)] hover:underline" href="https://downdetector.com" target="_blank" rel="noopener noreferrer">downdetector.com</a>.
          They don't publish a usable open API. Their data would be a fascinating overlay — user-reported
          frustration vs. status-page-acknowledged incidents — but isn't included here.
        </Bullet>
        <Bullet>
          <strong>Bugs vs. outages.</strong> Connor specifically called out <em>bugs</em> in his
          original post. Status pages report outages, not bugs. A more complete answer to Connor's
          question would layer in GitHub Issues velocity, App Store review sentiment, or support-ticket
          counts. We picked status pages because they're public, dated, and uniform enough to compare across companies.
        </Bullet>
      </Section>

      <Section title="Caveats">
        <ul className="list-disc list-outside pl-5 space-y-2 text-[14px]">
          {(data.meta?.caveats ?? []).map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </Section>

      <Section title="Reproducibility">
        <p>
          The entire pipeline is one Python script:{' '}
          <a className="text-[var(--color-accent)] hover:underline font-mono text-[12px]" href="https://github.com/fivetran-jasonchletsos/LayoffOutage-ODI-Demo/blob/main/etl/build.py" target="_blank" rel="noopener noreferrer">
            etl/build.py
          </a>. Clone the repo, install Python 3.10+, and run it. It outputs the same five JSON files
          the frontend reads, with a fresh <code className="font-mono text-[12.5px] bg-[var(--color-paper-deep)] px-1.5 rounded">generated_at</code> timestamp.
        </p>
        <p>
          The next iteration will move this to a daily GitHub Action so the data refreshes itself.
        </p>
      </Section>
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

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] font-semibold mt-4 mb-2">{children}</h3>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mt-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-mark)] mt-2.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
