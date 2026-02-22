# Stock Integrated Analysis Service - Architecture & Execution Plan

## 1. Product Goal and Scope
- Build a web/mobile-friendly integrated stock analysis service using `React` + `FastAPI`.
- Prioritize 3 core businesses:
1. Stock-specific financial statement explanation + industry comparison + moat/insight (objective, pros/cons).
2. Macro dashboard and market direction inference from liquidity/rates/inflation/growth/geopolitics.
3. Near real-time (15 min) finance news ingestion, second-order impact reasoning, and related sector/stock ideas.
- Integrate Google Login from the start.
- Use agents actively; evolve quality through skill-based domain knowledge packs.

## 2. Design Principles
- Evidence first: Every conclusion includes source, timestamp, and confidence score.
- Objective by structure: Always present `bull` and `bear` arguments in parallel.
- Separation of concerns: Ingestion, analytics, reasoning, and presentation are independent modules.
- Async by default: Heavy analysis runs in background workers; UI reads cached/latest snapshots.
- Human-auditable AI: Keep intermediate reasoning artifacts (structured, not hidden chain-of-thought text) for debugging and quality checks.

## 3. High-Level Architecture

## 3.1 Frontend (React)
- `App Shell`: Left navigation (1/2/3) with smooth-scroll anchors.
- `Section 1`: Korea/US tabs + stock search + financial insight panel.
- `Section 2`: Macro panel (liquidity/rates/inflation/growth/commodities/geopolitics).
- `Section 3`: Real-time news cards + derived issue keywords.
- `News Detail Page`: summary, original link, deep dive on derived issues and affected assets.
- Mobile-first responsive behavior:
  - Left nav -> bottom tab bar / floating section switcher.
  - Sticky quick filters and condensed cards.

## 3.2 Backend (FastAPI)
- `API Gateway`: auth, request validation, response shaping.
- `Auth Module`: Google OAuth2 login, JWT/session issuance, role/scopes.
- `Analysis Orchestrator`: routes requests to domain agents and merges outputs.
- `Scheduler`: periodic jobs (15 min news, macro refresh, financial updates).
- `Async Worker`: heavy LLM/ETL tasks using queue.

## 3.3 Data Layer
- `PostgreSQL` (primary): users, watchlists, analysis snapshots, news metadata.
- `Timeseries` (Postgres partition or Timescale): macro indicators and market series.
- `Redis`: cache for hot query responses and job states.
- `Object Storage` (S3-compatible): raw filings/news text/artifacts.
- `Vector Index` (pgvector or external): semantic retrieval for filings/news/background docs.

## 3.4 External Integrations
- Market/financial statements:
  - US: SEC filings + market data provider.
  - KR: DART + market data provider.
- Macro indicators: FRED-like providers + rates, commodities, volatility, liquidity-related sources.
- News: finance news APIs + trusted RSS feeds.
- OAuth: Google Identity Platform.

## 4. Agent and Skill Strategy

## 4.1 Agent Topology
- `Financial Analysis Agent`
  - Converts statements to plain-language narrative.
  - Computes key ratios and compares against industry baseline.
  - Produces moat hypothesis, risks, and strengths.
- `Macro Regime Agent`
  - Aggregates macro/liquidity/geopolitical signals.
  - Classifies current regime and near-term scenarios.
- `News Impact Agent`
  - Extracts events/entities from fresh news.
  - Performs second-order impact inference (cause -> transmission channel -> affected assets).
- `Recommendation Guardrail Agent`
  - Validates evidence quality and confidence.
  - Blocks low-evidence speculative outputs.

## 4.2 Skill Packaging (recommended initial skeleton)
Create skill folders now and fill references later:
1. `financial-statement-explainer`
2. `industry-benchmarking`
3. `economic-regime-analysis`
4. `liquidity-monitoring`
5. `news-causal-impact-mapper`
6. `equity-idea-ranking`
7. `report-writer-ko-en`

Per skill structure:
- `SKILL.md`: trigger description + workflow.
- `references/`: your future domain notes, formulas, heuristics.
- `scripts/`: deterministic transforms/scoring utilities.

## 5. Core Business Flows

## 5.1 Feature 1: Stock Financial Insight
1. User selects market tab (KR/US) and searches ticker.
2. API normalizes symbol, checks cached snapshot freshness.
3. If stale/missing, orchestration job runs:
   - Fetch latest filings/financials.
   - Compute standardized metrics.
   - Pull industry peer baseline.
   - Ask Financial Analysis Agent for plain-language summary + moat + pros/cons.
4. Store `analysis_snapshot` with version, timestamp, source list.
5. UI renders:
   - Easy summary.
   - Key charts/tables.
   - Bull/Bear insights.
   - Confidence + data recency.

## 5.2 Feature 2: Macro and Geopolitical Outlook
1. Scheduler updates macro datasets (intraday/daily depending on metric).
2. Macro Regime Agent computes signal states:
   - liquidity, volatility, inflation trend, growth trend, rates, commodities, geopolitical risk.
3. Generate base/optimistic/pessimistic scenario text + probability buckets.
4. UI shows indicator cards, trend arrows, and scenario panel.

## 5.3 Feature 3: 15-Min Real-Time News Impact
1. Every 15 minutes:
   - Ingest finance news.
   - Deduplicate and rank by relevance/novelty.
2. News Impact Agent pipeline:
   - event extraction
   - transmission-channel mapping
   - affected sectors/stocks candidate generation
   - confidence scoring
3. Persist news cards with short derived keywords.
4. On card click:
   - Open detail page with summary + original URL.
   - Render deep dive: why it matters, first/second-order effects, candidate tickers.

## 6. API Contract (v1 draft)
- `POST /auth/google/login`
- `GET /stocks/search?q=`
- `GET /stocks/{symbol}/analysis?market=KR|US`
- `GET /macro/overview`
- `GET /macro/scenarios`
- `GET /news/feed?limit=&cursor=`
- `GET /news/{news_id}`
- `GET /news/{news_id}/impact`
- `POST /jobs/rebuild-analysis` (admin/internal)

Response envelope recommendation:
- `data`: payload
- `meta`: `as_of`, `sources`, `confidence`, `version`
- `warnings`: missing/low-quality data notes

## 7. Data Model (minimum)
- `users(id, email, name, auth_provider, created_at)`
- `watchlists(id, user_id, symbol, market, created_at)`
- `financial_snapshots(id, symbol, market, period, metrics_json, source_json, created_at)`
- `industry_benchmarks(id, industry_code, market, metrics_json, as_of)`
- `stock_analysis_snapshots(id, symbol, market, summary_json, bull_json, bear_json, moat_json, confidence, as_of)`
- `macro_series(id, metric_code, value, observed_at, source)`
- `macro_regime_snapshots(id, regime_label, factors_json, scenarios_json, as_of)`
- `news_items(id, title, body, source_name, source_url, published_at, dedup_hash)`
- `news_impacts(id, news_id, impacts_json, confidence, as_of)`

## 8. Orchestration Logic (pseudo)
```text
on stock_analysis_request(symbol, market):
  snapshot = get_latest_snapshot(symbol, market)
  if snapshot is fresh:
    return snapshot

  enqueue job build_stock_analysis(symbol, market)
  return latest_available_with_status

job build_stock_analysis(symbol, market):
  financials = fetch_financial_data(symbol, market)
  peers = fetch_industry_peers(symbol, market)
  metrics = compute_metrics(financials, peers)
  llm_output = financial_agent.analyze(metrics, retrieved_context)
  validated = guardrail_agent.validate(llm_output, metrics)
  save_snapshot(validated)
```

## 9. Frontend UX Composition
- Left section nav:
  - `1. 종목 분석`
  - `2. 거시/매크로`
  - `3. 실시간 뉴스`
- Smooth scrolling + active section highlight.
- Section 1 top:
  - KR/US segmented tabs
  - search input with recent history
- Section 3 cards:
  - headline, source, time
  - tiny derived keywords line (very short terms)
- Detail page:
  - summary block
  - original link CTA
  - deep impact graph/timeline
- Mobile:
  - convert left nav to sticky bottom tabs
  - card-first vertical layout
  - minimize dense tables with expandable rows

## 10. Reliability, Quality, and Guardrails
- Caching policy:
  - Stock analysis TTL (e.g., 6-24h depending on market close cycle)
  - Macro panel TTL per indicator frequency
  - News feed near-real-time refresh every 15m
- Quality scoring:
  - minimum source count
  - contradiction checks between numeric facts and generated narrative
- Safety/compliance:
  - show disclaimer: informational use only, not investment advice
  - log recommendation provenance and confidence

## 11. Deployment Blueprint
- Frontend: Vercel or Cloud Run static hosting.
- Backend: FastAPI on Cloud Run/ECS/Kubernetes.
- Worker: separate deployment with queue consumer.
- DB: managed Postgres.
- Monitoring:
  - API latency/error dashboards
  - job success/failure metrics
  - data freshness alarms

## 12. Milestone Plan
1. Phase 0 (1-2 weeks): foundation
- repo bootstrap, auth, base layout, DB schema, CI/CD, observability.
2. Phase 1 (2-3 weeks): Feature 1 MVP
- stock search, financial ingestion, simple industry compare, explainable summary.
3. Phase 2 (2 weeks): Feature 2 MVP
- macro ingestion, regime classification, dashboard scenarios.
4. Phase 3 (2-3 weeks): Feature 3 MVP
- 15-min news pipeline, impact reasoning, news detail deep dive.
5. Phase 4 (ongoing): quality hardening
- scoring calibration, backtesting of impact ideas, UX polish, mobile optimization.

## 13. Immediate Next Build Tasks
1. Fix data-provider contracts first (KR/US filings, macro, news).
2. Implement auth/session and user model.
3. Build async job framework and freshness policy.
4. Ship Section 1 end-to-end before adding advanced recommendation logic.
5. Add Feature 2 and 3 incrementally with clear quality metrics.

---
This plan is intentionally implementation-oriented so you can start coding modules in parallel while later filling skill references with your own curated knowledge.
