import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useParams, Link } from 'react-router-dom';
import type { CompanyRollup, CorrelationEvent, LayoffEvent, Meta } from './types';
import { HomePage } from './pages/HomePage';
import { CompanyPage } from './pages/CompanyPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { SourcesPage } from './pages/SourcesPage';

export interface DataState {
  meta: Meta | null;
  companies: CompanyRollup[];
  events: CorrelationEvent[];
  layoffs: LayoffEvent[];
  loading: boolean;
  error: string | null;
}

export default function App() {
  const [data, setData] = useState<DataState>({
    meta: null, companies: [], events: [], layoffs: [],
    loading: true, error: null,
  });

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    Promise.all([
      fetch(`${base}/data/meta.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(`${base}/data/companies.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(`${base}/data/correlations.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(`${base}/data/layoffs.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([meta, companies, correlations, layoffs]) => {
        setData({
          meta,
          companies: companies.companies,
          events: correlations.events,
          layoffs: layoffs.events,
          loading: false,
          error: null,
        });
      })
      .catch((e) => setData((d) => ({ ...d, loading: false, error: String(e) })));
  }, []);

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1">
          {data.loading ? (
            <div className="mx-auto max-w-7xl px-6 py-12 text-[var(--color-ink-muted)]">Loading dataset…</div>
          ) : data.error ? (
            <div className="mx-auto max-w-7xl px-6 py-12 text-[var(--color-fail)]">
              Failed to load dataset: {data.error}
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage data={data} />} />
              <Route path="/company/:name" element={<CompanyPageWrapper data={data} />} />
              <Route path="/methodology" element={<MethodologyPage data={data} />} />
              <Route path="/architecture" element={<ArchitecturePage data={data} />} />
              <Route path="/sources" element={<SourcesPage data={data} />} />
            </Routes>
          )}
        </main>
        <Footer meta={data.meta} />
      </div>
    </HashRouter>
  );
}

function CompanyPageWrapper({ data }: { data: DataState }) {
  const { name } = useParams();
  const company = data.companies.find((c) => c.name === decodeURIComponent(name ?? ''));
  if (!company) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-[var(--color-ink-muted)]">Company not found.</p>
        <Link to="/" className="text-[var(--color-accent)] hover:underline">← Back to overview</Link>
      </div>
    );
  }
  return <CompanyPage company={company} />;
}

function TopNav() {
  return (
    <header className="border-b border-[var(--color-hairline)] bg-[var(--color-paper)] sticky top-0 z-10 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <NavLink to="/" className="flex items-center gap-2.5 hover:opacity-80">
          <span className="inline-flex w-7 h-7 rounded-sm bg-[var(--color-accent)] text-white text-[10px] font-bold items-center justify-center">L→O</span>
          <span className="font-serif text-lg font-semibold">Layoffs vs. Outages</span>
          <span className="text-[10.5px] text-[var(--color-ink-soft)] font-mono uppercase tracking-wider">public dataset</span>
        </NavLink>
        <nav className="flex items-center gap-x-5 text-sm">
          <NavItem to="/" end>Overview</NavItem>
          <NavItem to="/methodology">Methodology</NavItem>
          <NavItem to="/architecture">Architecture</NavItem>
          <NavItem to="/sources">Sources</NavItem>
          <a href="https://github.com/fivetran-jasonchletsos/LayoffOutage-ODI-Demo" target="_blank" rel="noopener noreferrer"
             className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)] font-mono text-[11px] uppercase tracking-wider">
            Repo →
          </a>
        </nav>
      </div>
    </header>
  );
}

function NavItem({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `font-medium transition-colors ${isActive ? 'text-[var(--color-ink-strong)] border-b-2 border-[var(--color-accent)] pb-0.5' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)]'}`
      }
    >
      {children}
    </NavLink>
  );
}

function Footer({ meta }: { meta: Meta | null }) {
  return (
    <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-paper-deep)] mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <p className="font-serif text-[15px] font-semibold text-[var(--color-ink-strong)]">
            Built in response to{' '}
            <a className="text-[var(--color-accent)] hover:underline" href="https://www.linkedin.com/posts/connordickson2_i-want-someone-to-make-a-website-that-tracks-share-7465034665515483136-xsEf/" target="_blank" rel="noopener noreferrer">
              Connor Dickson's LinkedIn prompt
            </a>.
          </p>
          <p className="text-[13px] text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">
            By <strong className="text-[var(--color-ink-strong)]">Jason Chletsos</strong> (JC), Sales Engineering at Fivetran.
            Architecture follows the <Link to="/architecture" className="text-[var(--color-accent)] hover:underline">Open Data Infrastructure</Link> pattern —
            Fivetran ingestion, Iceberg lake, dbt transforms, Cortex narration.
          </p>
        </div>
        <div className="text-[11px] font-mono text-[var(--color-ink-soft)] text-right">
          {meta && (
            <>
              <div>generated {new Date(meta.generated_at).toLocaleString()}</div>
              <div className="mt-0.5">{meta.tracked_company_count} companies · {meta.tracked_event_count} layoff events · {meta.tracked_incident_count} incidents</div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
