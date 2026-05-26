export interface LayoffEvent {
  company: string;
  date: string;
  laid_off: number | null;
  pct: number | null;
  industry: string;
  source: string;
  country: string;
  stage: string;
}

export interface CompanyMonth {
  month: string;
  count: number;
}

export interface CompanyLayoff {
  date: string;
  laid_off: number | null;
  pct: number | null;
  before: number;
  after: number;
  delta: number;
  delta_pct: number | null;
  source: string;
}

export interface CompanyRollup {
  name: string;
  status_url: string;
  incidents_total: number;
  incidents_first: string | null;
  incidents_last: string | null;
  monthly: CompanyMonth[];
  layoff_events: CompanyLayoff[];
}

export interface CorrelationEvent {
  company: string;
  date: string;
  laid_off: number | null;
  pct: number | null;
  industry: string;
  source: string;
  incidents_before_90d: number;
  incidents_after_90d: number;
  delta: number;
  delta_pct: number | null;
}

export interface Meta {
  generated_at: string;
  layoffs_source_url: string;
  layoffs_source_note: string;
  tracked_company_count: number;
  tracked_event_count: number;
  tracked_incident_count: number;
  data_window: string;
  caveats: string[];
}
