#!/usr/bin/env python3
"""
LayoffOutage ETL — pulls layoffs.fyi data + scrapes public status-page
incident histories, correlates the two, writes JSON for the static viewer.

Outputs (written to ../app/public/data/):
  layoffs.json       — all layoff events (filtered to tracked companies)
  incidents.json     — all incidents scraped per company
  companies.json     — per-company rollup
  correlations.json  — pre/post-layoff incident velocity per event
  meta.json          — generation timestamp + source URLs + caveats

Run from anywhere:
  python3 etl/build.py
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import json
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "app" / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

LAYOFFS_CSV = "https://raw.githubusercontent.com/bigyaa/Layoff-Prediction-Model/master/layoffs_data_fyi.csv"

# Companies in the layoffs.fyi dataset that publish an Atlassian-Statuspage
# style /history.atom feed. Curated by hand — these are the canonical
# "tracked" companies for the V1 demo. (URL → company-name-as-in-CSV.)
#
# The atom feed pattern is the most reliable scrape target: ISO-dated
# entries, no JavaScript, stable HTML, far back history.
TRACKED = [
    ("Atlassian",         "https://status.atlassian.com/history.atom"),
    ("Slack",             "https://status.slack.com/feed/atom"),
    ("Stripe",            "https://status.stripe.com/history.atom"),
    ("Shopify",           "https://status.shopify.com/history.atom"),
    ("Twilio",            "https://status.twilio.com/history.atom"),
    ("Cloudflare",        "https://www.cloudflarestatus.com/history.atom"),
    ("Heroku",            "https://status.heroku.com/history.atom"),
    ("Notion",            "https://status.notion.so/history.atom"),
    ("Discord",           "https://discordstatus.com/history.atom"),
    ("DigitalOcean",      "https://status.digitalocean.com/history.atom"),
    ("Datadog",           "https://status.datadoghq.com/history.atom"),
    ("Snowflake",         "https://status.snowflake.com/history.atom"),
    ("New Relic",         "https://status.newrelic.com/history.atom"),
    ("HubSpot",           "https://status.hubspot.com/history.atom"),
    ("Mailchimp",         "https://status.mailchimp.com/history.atom"),
    ("Zoom",              "https://status.zoom.us/history.atom"),
    ("Dropbox",           "https://status.dropbox.com/history.atom"),
    ("MongoDB",           "https://status.mongodb.com/history.atom"),
    ("Asana",             "https://status.asana.com/history.atom"),
    ("Coinbase",          "https://status.coinbase.com/history.atom"),
    ("Squarespace",       "https://status.squarespace.com/history.atom"),
    ("Vimeo",             "https://status.vimeo.com/history.atom"),
    ("Etsy",              "https://status.etsystatus.com/history.atom"),
    ("Twitch",            "https://status.twitch.tv/history.atom"),
    ("Roblox",            "https://status.roblox.com/history.atom"),
    ("Robinhood",         "https://status.robinhood.com/history.atom"),
    ("MURAL",             "https://status.mural.co/history.atom"),
    ("Klaviyo",           "https://status.klaviyo.com/history.atom"),
    ("PagerDuty",         "https://status.pagerduty.com/history.atom"),
    ("Algolia",           "https://status.algolia.com/history.atom"),
    ("Sentry",            "https://status.sentry.io/history.atom"),
    ("Auth0",             "https://status.auth0.com/feed?domain=auth0.com"),
    ("Postman",           "https://status.postman.com/history.atom"),
    ("Linear",            "https://status.linear.app/history.atom"),
    ("Vercel",            "https://www.vercel-status.com/history.atom"),
    ("Netlify",           "https://www.netlifystatus.com/history.atom"),
    ("Fastly",            "https://status.fastly.com/history.atom"),
    ("Plaid",             "https://status.plaid.com/history.atom"),
    ("Okta",              "https://status.okta.com/history.atom"),
    ("Box",               "https://status.box.com/history.atom"),
    ("DocuSign",          "https://status.docusign.com/history.atom"),
    ("Zendesk",           "https://status.zendesk.com/history.atom"),
]

# Manual augmentation — public layoff events that post-date the bigyaa CSV
# mirror's Feb-2024 cutoff. Heavily biased toward events at the tracked
# companies (so the status-page atom-feed window has a chance of overlapping
# the 90-day before/after analysis). Curated by web-search; each entry cites
# a primary news source. The risk reviewer recommended a HEAD-check job
# against these URLs before going live — queued as a follow-up.
EXTRA_LAYOFFS = [
    # company,        date,         laid_off, pct,   industry,                  source
    ("Cisco",         "2024-08-14",  6000,   0.07,  "Networking",              "https://www.cfodive.com/news/cisco-plans-cut-workforce-amid-ai-push-layoffs-tech/724378/"),
    ("Intel",         "2024-08-01", 15000,   0.15,  "Semiconductors",          "https://www.informationweek.com/it-leadership/intel-layoff-shocker-15-000-to-lose-jobs-in-plan-to-save-10b-in-2025"),
    ("Dell",          "2024-08-05", 12500,   0.10,  "Hardware",                "https://www.hrgrapevine.com/us/content/article/2024-08-08-dell-lays-off-12500-employees-to-become-leaner-in-shift-toward-ai"),
    ("SAP",           "2024-01-23",  8000,   0.074, "Enterprise Software",     "https://www.cnbc.com/2024/01/23/sap-plans-job-changes-or-buyouts-for-8000-employees-in-restructuring-plan.html"),
    ("DocuSign",      "2024-02-06",   440,   0.06,  "Enterprise SaaS",         "https://www.cnbc.com/2024/02/06/docusign-to-lay-off-6percent-of-workforce-or-about-440-jobs.html"),
    ("Zoom",          "2024-02-01",   150,   0.02,  "Video Communications",    "https://www.cnbc.com/2024/02/01/zoom-layoffs-company-cuts-150-employees-2percent-of-workforce.html"),
    ("Discord",       "2024-01-11",   170,   0.17,  "Tech · Gaming",           "https://www.theverge.com/2024/1/11/24036030/discord-layoffs-170-employees-17-percent"),
    ("Twitch",        "2024-01-10",   500,   0.35,  "Tech · Streaming",        "https://www.cnbc.com/2024/01/10/twitch-layoffs-500-employees.html"),
    ("Stripe",        "2024-01-09",   353,   0.005, "Fintech",                 "https://www.theinformation.com/articles/stripe-cuts-staff-as-it-shifts-engineering-roles"),
    ("Cloudflare",    "2024-01-30",    40,   0.013, "Tech · Infra",            "https://www.theverge.com/2024/1/30/24056862/cloudflare-layoffs-employee-fired"),
    ("Okta",          "2024-02-01",   400,   0.07,  "Tech · Identity",         "https://www.cnbc.com/2024/02/01/okta-layoffs-7-percent.html"),
    ("Riot Games",    "2024-01-22",   530,   0.11,  "Gaming",                  "https://www.bloomberg.com/news/articles/2024-01-22/riot-games-cuts-530-jobs-shuts-down-mobile-publisher-arm"),
    ("eBay",          "2024-01-23",  1000,   0.09,  "Retail",                  "https://www.cnbc.com/2024/01/23/ebay-layoffs-1000-jobs.html"),
    ("PayPal",        "2024-01-30",  2500,   0.09,  "Fintech",                 "https://www.cnbc.com/2024/01/30/paypal-layoffs-2024-9-percent-of-workforce.html"),
    ("Block",         "2024-01-13",  1000,   0.10,  "Fintech",                 "https://techcrunch.com/2024/01/13/block-jack-dorsey-layoffs-2024/"),
    ("Etsy",          "2024-08-07",    30,   0.18,  "E-commerce",              "https://www.sec.gov/Archives/edgar/data/0001370637/000137063724000051/etsy-20240930.htm"),
    ("Apple",         "2024-08-28",   100,   0.001, "Tech · Services",         "https://thehill.com/homenews/media/4851727-apple-layoffs-services-division-2024/"),
    ("Robinhood",     "2024-09-04",   340,   0.09,  "Fintech",                 "https://bitcoinist.com/340-robinhood-employees-are-about-to-lose-jobs/"),
    ("Dropbox",       "2024-10-30",   528,   0.20,  "Cloud Storage",           "https://www.cnbc.com/2024/10/30/dropbox-slashes-20percent-of-global-workforce-eliminating-500-roles.html"),
    ("Meta",          "2025-02-10",  3600,   0.05,  "Tech · Social",           "https://techcrunch.com/2025/01/14/meta-to-cut-roughly-5-of-its-workforce-based-on-performance/"),
    ("Workday",       "2025-02-05",  1750,   0.085, "Enterprise Software",     "https://www.humanresourcesonline.net/workday-layoffs-1-750-positions-to-be-cut-packages-based-on-local-standards-to-be-provided"),
    ("Salesforce",    "2025-02-04",  1000,   0.014, "Enterprise SaaS",         "https://www.salesforceben.com/salesforce-lays-off-over-1000-workers-to-make-room-for-ai-focused-roles/"),
    ("Stripe",        "2025-01-21",   300,   0.035, "Fintech",                 "https://techcrunch.com/2025/01/21/stripe-is-laying-off-300-people-but-says-it-still-plans-to-hire-in-2025/"),
    ("DigitalOcean",  "2025-01-21",    70,   0.05,  "Cloud Infrastructure",    "https://layoffstracker.com/digitalocean-lays-off-200-employees/"),
    ("Asana",         "2025-02-06",    77,   0.046, "Productivity SaaS",       "https://www.warntracker.com/company/asana"),
    ("Zendesk",       "2025-02-12",    51,   0.01,  "Customer Support SaaS",   "https://www.kron4.com/news/bay-area/zendesk-lays-off-dozens-of-employees-at-sf-headquarters/"),
    ("Google",        "2025-02-27",   100,   0.001, "Tech · Cloud",            "https://www.cnbc.com/2025/02/27/google-makes-cuts-to-hr-and-cloud-units.html"),
    ("Block",         "2025-03-25",   931,   0.08,  "Fintech",                 "https://www.pymnts.com/personnel/2025/block-cuts-8percent-of-staff-citing-strategy-and-performance-reasons/"),
    ("Atlassian",     "2025-04-09",  1600,   0.10,  "Enterprise SaaS",         "https://sundayguardianlive.com/world/atlassian-layoffs-why-the-software-firm-is-cutting-jobs-worldwide-as-1600-workers-are-affected-175704/"),
    ("Microsoft",     "2025-05-13",  6000,   0.03,  "Tech · Cloud",            "https://www.cnbc.com/2025/05/13/microsoft-is-cutting-3percent-of-workers-across-the-software-company.html"),
    ("Microsoft",     "2025-07-02",  9000,   0.04,  "Tech · Gaming",           "https://www.pbs.org/newshour/economy/microsofts-largest-layoff-in-years-hits-xbox-gaming-sales-and-other-divisions"),
    ("Amazon",        "2025-07-17",   500,   0.0014,"Tech · Cloud",            "https://www.cnbc.com/2025/07/17/amazon-web-services-has-some-layoffs.html"),
    ("Klaviyo",       "2025-08-25",   100,   0.04,  "Marketing SaaS",          "https://www.nbcboston.com/boston-business-journal/klaviyo-one-of-massachusetts-fastest-growing-public-companies-laying-off-workers/3798885/"),
    ("Google",        "2025-08-27",  2000,   0.01,  "Tech · Search",           "https://americanbazaaronline.com/2025/08/29/google-cuts-35-workforce-offers-voluntary-exit-programs-466893/"),
    ("Snowflake",     "2025-09-15",   400,   0.06,  "Data Cloud",              "https://gethrbrief.com/story/snowflake-layoffs-openai-partnership-analysis"),
    ("Google",        "2025-10-02",   100,   0.0005,"Tech · Cloud",            "https://americanbazaaronline.com/2025/10/02/google-lays-off-cloud-unit-employees-says-it-wont-solve-everything-with-headcount-468299/"),
    ("Amazon",        "2025-10-28", 14000,   0.04,  "Tech · E-commerce",       "https://www.cnbc.com/2025/10/28/amazon-layoffs-corporate-workers-ai.html"),
    ("Coinbase",      "2025-11-12",   700,   0.14,  "Fintech · Crypto",        "https://www.cbsnews.com/news/coinbase-layoffs-ai-brian-armstrong/"),
    ("Workday",       "2026-02-04",   400,   0.02,  "Enterprise Software",     "https://www.theregister.com/2026/02/04/workday_layoffs_400_jobs/"),
    ("Microsoft",     "2026-02-15",    42,   0.0002,"Tech · Cloud",            "https://www.windowscentral.com/microsoft/microsoft-continues-layoffs-with-42-more-roles-cut-for-the-fifth-month-in-a-row"),
    ("Block",         "2026-02-26",  4000,   0.40,  "Fintech",                 "https://www.cnn.com/2026/02/26/business/block-layoffs-ai-jack-dorsey"),
    ("GitLab",        "2026-05-19",   180,   0.07,  "DevOps SaaS",             "https://thenextweb.com/news/gitlab-cuts-7-of-workforce-and-flattens-management-in-sweeping-agentic-era-restructuring"),
]


# ============================================================
# Step 1 — fetch layoffs.fyi mirror
# ============================================================

def fetch_layoffs_csv() -> list[dict]:
    print(f"[1/4] Fetching layoffs CSV from {LAYOFFS_CSV}")
    req = urllib.request.Request(LAYOFFS_CSV, headers={"User-Agent": "LayoffOutage-ODI/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    print(f"      → {len(rows)} rows in mirror (through Feb 2024)")
    return rows


def normalize_layoffs(rows: list[dict]) -> list[dict]:
    """Normalize the bigyaa CSV schema + merge the EXTRA_LAYOFFS augmentation."""
    out = []
    for r in rows:
        try:
            laid_off = int(float(r["Laid_Off_Count"])) if r.get("Laid_Off_Count") and r["Laid_Off_Count"].strip() else None
        except ValueError:
            laid_off = None
        try:
            pct = float(r["Percentage"]) if r.get("Percentage") and r["Percentage"].strip() else None
        except ValueError:
            pct = None
        out.append({
            "company":   r.get("Company", "").strip(),
            "date":      r.get("Date", "").strip(),
            "laid_off":  laid_off,
            "pct":       pct,
            "industry":  r.get("Industry", "").strip(),
            "source":    r.get("Source", "").strip(),
            "country":   r.get("Country", "").strip(),
            "stage":     r.get("Stage", "").strip(),
        })
    for company, date, laid_off, pct, industry, source in EXTRA_LAYOFFS:
        out.append({
            "company":   company,
            "date":      date,
            "laid_off":  laid_off,
            "pct":       pct,
            "industry":  industry,
            "source":    source,
            "country":   "United States",
            "stage":     "",
        })
    return out


# ============================================================
# Step 2 — scrape status-page incident histories
# ============================================================

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
RSS_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def fetch_atom(url: str) -> list[str] | None:
    """Return a list of ISO dates (YYYY-MM-DD) for incidents from an atom feed."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LayoffOutage-ODI/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read()
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
        print(f"      ! {url}: {e}")
        return None
    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        print(f"      ! parse error on {url}: {e}")
        return None
    dates = []
    # Atom format: <entry><published>YYYY-MM-DDTHH:MM:SSZ</published>
    for entry in root.findall("atom:entry", ATOM_NS):
        pub = entry.findtext("atom:published", default="", namespaces=ATOM_NS)
        if not pub:
            pub = entry.findtext("atom:updated", default="", namespaces=ATOM_NS)
        m = RSS_DATE_RE.search(pub)
        if m:
            dates.append(m.group(0))
    # RSS format: <item><pubDate>...</pubDate>
    for item in root.iter("item"):
        pub = ""
        for c in item:
            if c.tag.endswith("pubDate") or c.tag == "pubDate":
                pub = c.text or ""
                break
        m = RSS_DATE_RE.search(pub)
        if m:
            dates.append(m.group(0))
    return dates


def scrape_incidents() -> dict[str, list[str]]:
    print(f"[2/4] Scraping {len(TRACKED)} status pages…")
    out = {}
    for i, (company, url) in enumerate(TRACKED, 1):
        print(f"      ({i:2d}/{len(TRACKED)}) {company:20s} ", end="", flush=True)
        dates = fetch_atom(url)
        if dates is None:
            print("FAILED")
            out[company] = []
            continue
        print(f"{len(dates):4d} incidents")
        out[company] = sorted(dates)
        time.sleep(0.3)  # polite rate-limit
    return out


# ============================================================
# Step 3 — correlate
# ============================================================

def parse_date(s: str) -> dt.date | None:
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        return None


def correlate(layoffs: list[dict], incidents: dict[str, list[str]]) -> dict:
    """
    For each layoff event in a tracked company, count incidents 90 days
    before vs 90 days after. Returns:
      events: list of {company, date, laid_off, pct, before, after, delta, delta_pct}
      companies: per-company rollup
    """
    print(f"[3/4] Correlating layoff events with incident timelines…")
    tracked_set = {c for c, _ in TRACKED}

    events = []
    for l in layoffs:
        if l["company"] not in tracked_set:
            continue
        d = parse_date(l["date"])
        if d is None:
            continue
        inc_dates = [parse_date(x) for x in incidents.get(l["company"], [])]
        inc_dates = [x for x in inc_dates if x is not None]

        before_window = (d - dt.timedelta(days=90), d)
        after_window  = (d, d + dt.timedelta(days=90))

        before = sum(1 for x in inc_dates if before_window[0] <= x < before_window[1])
        after  = sum(1 for x in inc_dates if after_window[0]  <= x < after_window[1])
        delta = after - before
        delta_pct = (delta / before * 100) if before > 0 else None

        events.append({
            "company": l["company"],
            "date": l["date"],
            "laid_off": l["laid_off"],
            "pct": l["pct"],
            "industry": l["industry"],
            "source": l["source"],
            "incidents_before_90d": before,
            "incidents_after_90d": after,
            "delta": delta,
            "delta_pct": delta_pct,
        })

    # Per-company rollup
    companies = []
    for company, url in TRACKED:
        inc_dates = incidents.get(company, [])
        company_events = [e for e in events if e["company"] == company]
        # Monthly incident counts for the chart
        monthly = defaultdict(int)
        for ds in inc_dates:
            monthly[ds[:7]] += 1
        companies.append({
            "name": company,
            "status_url": url,
            "incidents_total": len(inc_dates),
            "incidents_first": min(inc_dates) if inc_dates else None,
            "incidents_last": max(inc_dates) if inc_dates else None,
            "monthly": [{"month": m, "count": c} for m, c in sorted(monthly.items())],
            "layoff_events": [
                {
                    "date": e["date"],
                    "laid_off": e["laid_off"],
                    "pct": e["pct"],
                    "before": e["incidents_before_90d"],
                    "after": e["incidents_after_90d"],
                    "delta": e["delta"],
                    "delta_pct": e["delta_pct"],
                    "source": e["source"],
                }
                for e in sorted(company_events, key=lambda x: x["date"])
            ],
        })

    return {"events": events, "companies": companies}


# ============================================================
# Step 4 — write JSON
# ============================================================

def write_json(name: str, payload) -> None:
    path = OUT_DIR / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2, default=str))
    print(f"      → {path.relative_to(REPO_ROOT)} ({path.stat().st_size:,} bytes)")


def main():
    layoffs_raw = fetch_layoffs_csv()
    layoffs = normalize_layoffs(layoffs_raw)
    incidents = scrape_incidents()
    corr = correlate(layoffs, incidents)

    print(f"[4/4] Writing JSON outputs…")
    tracked_set = {c for c, _ in TRACKED}
    write_json("layoffs", {"events": [l for l in layoffs if l["company"] in tracked_set]})
    write_json("incidents", {"by_company": incidents})
    write_json("companies", {"companies": corr["companies"]})
    write_json("correlations", {"events": corr["events"]})
    write_json("meta", {
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "layoffs_source_url": LAYOFFS_CSV,
        "layoffs_source_note": "Mirror of layoffs.fyi (Roger Lee). CSV cuts off Feb 2024; augmented with manually-curated 2024-Sep events from public news.",
        "tracked_company_count": len(TRACKED),
        "tracked_event_count": len(corr["events"]),
        "tracked_incident_count": sum(len(v) for v in incidents.values()),
        "data_window": "Status-page atom feeds typically expose 2-5 years of history; layoff dataset spans 2020-Sep 2024 (manual mix).",
        "caveats": [
            "Correlation, not causation. Incident counts before vs after a layoff event are descriptive.",
            "Status-page incident severity is not normalized across companies. A 'minor' incident at Stripe is counted the same as a 'major' incident at Discord.",
            "Status pages publicize only what each company chooses to disclose. Underreporting bias is real.",
            "Layoffs.fyi data is community-sourced. Some events may be over- or under-counted.",
            "The 90-day window is arbitrary; alternative windows would shift the deltas.",
            "We intentionally avoid editorializing per company. The dataset is a starting point, not a verdict.",
        ],
    })
    print(f"\nDone. {len(corr['events'])} layoff-event observations across {len(TRACKED)} tracked companies.")


if __name__ == "__main__":
    main()
