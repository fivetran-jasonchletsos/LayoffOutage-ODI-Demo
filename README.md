# LayoffOutage-ODI-Demo

A reproducible cross-reference between corporate layoff events and public status-page incident histories. For each layoff at a tracked tech company, the pipeline counts incidents in the 90-day windows before and after, then renders the result as a scatter chart, sortable table, and per-company timeline overlays.

## Background

This was built in response to a LinkedIn prompt from Connor Dickson (Analytics Engineer):

> "I want someone to make a website that tracks corporations that layoff thousands of people and soon after encounter an increase in outages or bugs with their product."

Jason Chletsos (Fivetran Sales Engineering) replied "I'll try to build it." This is the build.

## Data sources

- **layoffs.fyi** — Roger Lee's community-sourced dataset of corporate layoff events. <https://layoffs.fyi>
- **Public status-page incident histories** — Atlassian Statuspage-compatible `/history.atom` feeds from ~40 well-known tech companies. Tracked feeds include Atlassian, Slack, Stripe, Shopify, Twilio, Cloudflare, Heroku, Notion, Discord, DigitalOcean, Datadog, Snowflake, and ~30 others. Each feed is published by the company itself; the `meta.json` output records the exact URL used for every company.

## Repo layout

```
LayoffOutage-ODI-Demo/
├── etl/
│   └── build.py        # one-shot Python ETL: fetches sources, writes JSON
├── app/                # Vite + React + TypeScript viewer
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── CompanyPage.tsx
│   │   │   ├── MethodologyPage.tsx
│   │   │   ├── ArchitecturePage.tsx
│   │   │   └── SourcesPage.tsx
│   │   └── types.ts
│   └── public/data/    # generated JSON files (committed)
├── docs/               # reserved for future
└── README.md
```

## ETL outputs

`etl/build.py` writes five JSON files into `app/public/data/`:

- `layoffs.json` — every layoff event at a tracked company
- `incidents.json` — per-company list of incident dates
- `companies.json` — per-company rollup with monthly incident counts and layoff events
- `correlations.json` — per-event before/after counts and delta
- `meta.json` — provenance, source URLs, caveats

The JSON files are committed so the static viewer works without re-running the ETL.

## How to run

```bash
git clone https://github.com/fivetran-jasonchletsos/LayoffOutage-ODI-Demo
cd LayoffOutage-ODI-Demo

# Refresh the dataset
python3 etl/build.py

# Run the viewer
cd app && npm install && npm run dev
```

## Architecture

This is one of 38 demos in the Fivetran ODI (Open Data Infrastructure) portfolio. Each demo in the portfolio follows the same medallion shape:

Sources, then Fivetran connectors, then Bronze (Iceberg on S3), then dbt, then Silver/Gold, then Snowflake / Athena / DuckDB.

The version shipped here is a static-export shortcut: the ETL writes JSON locally and the frontend reads it. The architecture page on the live site shows what the production version would look like with Fivetran connectors landing into Iceberg and dbt models producing the gold tables consumed by the viewer.

Sister repos in the portfolio:

- Hub catalog: `Fivetran-Demo-Repository`
- Concepts and intro: `00-Intro-ODI-Demo`
- Observability: `ODI-Mission-Control`

## Methodology and caveats

Read these before drawing conclusions from the charts.

- **Correlation, not causation.** Incident counts before vs after a layoff are descriptive. A change in either direction does not imply the layoff caused (or prevented) outages.
- **Status-page severity is not normalized.** A "minor" Stripe incident counts equally with a "major" Discord incident. Incident counts are a coarse proxy for reliability.
- **Atom feeds cap at ~25 most-recent incidents.** For high-incident companies that is roughly six months of history. Many layoff events from 2022 and 2023 sit outside the data window and therefore have incomplete or empty "before" buckets.
- **layoffs.fyi is community-sourced** with selection bias toward layoffs that get press coverage. Smaller or unreported events are missing.
- **Tracked-company coverage is limited** to companies that publish an Atlassian Statuspage-compatible Atom feed. Companies on other status-page platforms, or with no public status page, are not included.

The methodology page on the live site has the full discussion.

## License

MIT for the code in this repo. layoffs.fyi data remains under its own (community-sourced, attribution-appreciated) terms — see <https://layoffs.fyi>. Status-page incident dates are public and derived from each company's own published feed; attribution to the source company is recorded in `meta.json`.

## Credit

- **Data:** Roger Lee (layoffs.fyi), and the open status-page feeds published by Atlassian, Slack, Stripe, Shopify, Twilio, Cloudflare, Heroku, Notion, Discord, DigitalOcean, Datadog, Snowflake, and the 30-plus other companies whose public history feeds make this dataset possible.
- **Prompt:** Connor Dickson on LinkedIn (the original "I want someone to make..." post).
- **Build:** Jason Chletsos, Sales Engineering at Fivetran. Built with Claude Code.
