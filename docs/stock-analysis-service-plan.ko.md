# 주식 종합 분석 서비스 - 아키텍처 및 실행 계획

## 1. 제품 목표 및 범위
- `React` + `FastAPI` 기반의 웹/모바일 친화형 종합 주식 분석 서비스를 구축한다.
- 아래 4개 핵심 비즈니스를 우선 구현한다.
1. 특정 종목의 재무제표를 쉬운 언어로 설명하고, 산업 평균과 비교해 해자/인사이트를 제시한다(장단점 균형, 객관성 유지).
2. 유동성/금리/물가/성장/지정학을 포함한 매크로 대시보드를 구성하고, 시장 방향성을 추론한다.
3. 15분 주기의 금융 뉴스 수집과 2차 파급효과 추론을 통해 관련 산업/종목 아이디어를 제공한다.
4. 6개월 주가 상승률 기반 모멘텀 스코어링으로 현재 뜨는 테마를 발굴하고, 밸류체인 리드-래그 분석을 통해 앞으로 떠오를 산업/종목을 근거와 함께 추천한다.
- 초기부터 Google Login을 탑재한다.
- Agent를 적극 활용하고, Skill 기반 도메인 지식 팩으로 품질을 점진 개선한다.

## 2. 설계 원칙
- 근거 우선: 모든 결론에 출처, 시점(timestamp), 신뢰도(confidence)를 포함한다.
- 구조적 객관성: `bull`과 `bear` 관점을 항상 병렬로 제시한다.
- 관심사 분리: 수집(ingestion), 분석(analytics), 추론(reasoning), 표현(presentation)을 모듈로 분리한다.
- 비동기 기본값: 무거운 분석은 백그라운드 워커에서 처리하고, UI는 캐시/최신 스냅샷을 조회한다.
- 감사 가능한 AI: 디버깅/품질 점검을 위해 중간 산출물을 구조화 형태로 저장한다(숨겨진 추론 텍스트 저장 지양).

## 3. 상위 아키텍처

## 3.1 프론트엔드(React)
- `App Shell`: 좌측 내비게이션(1/2/3/4) + 스무스 스크롤 앵커.
- `Section 1`: 한국/미국 탭 + 종목 검색 + 재무 인사이트 패널.
- `Section 2`: 매크로 패널(유동성/금리/물가/성장/원자재/지정학).
- `Section 3`: 실시간 뉴스 카드 + 파생 이슈 키워드.
- `Section 4`: 모멘텀 테마 카드(현재 뜨는 테마) + 리드-래그 추천 카드(앞으로 뜰 산업/종목).
- `News Detail Page`: 요약, 원문 링크, 파생 이슈 및 영향 자산 심화 분석.
- 모바일 우선 반응형 동작:
  - 좌측 내비게이션 -> 하단 탭 바/플로팅 섹션 스위처.
  - 고정형(Sticky) 빠른 필터와 밀도 높은 카드 레이아웃.

## 3.2 백엔드(FastAPI)
- `API Gateway`: 인증, 요청 검증, 응답 형태 표준화.
- `Auth Module`: Google OAuth2 로그인, JWT/세션 발급, 권한 스코프 관리.
- `Analysis Orchestrator`: 도메인 Agent 라우팅 및 결과 병합.
- `Scheduler`: 주기 작업(15분 뉴스, 매크로 갱신, 재무 데이터 갱신).
- `Async Worker`: 큐 기반 LLM/ETL 고비용 작업 처리.

## 3.3 데이터 계층
- `PostgreSQL`(주 저장소): 사용자, 관심종목, 분석 스냅샷, 뉴스 메타데이터.
- `Timeseries`(Postgres 파티션 또는 Timescale): 매크로 지표와 시계열 시장 데이터.
- `Redis`: 핫쿼리 응답 캐시 및 작업 상태 저장.
- `Object Storage`(S3 호환): 원문 공시/뉴스 텍스트 및 분석 산출물 저장.
- `Vector Index`(pgvector 또는 외부 벡터DB): 공시/뉴스/레퍼런스 문서 의미 검색.

## 3.4 외부 연동
- 시장/재무 데이터:
  - 미국: SEC 공시 + 시세/재무 데이터 제공자.
  - 한국: DART 공시 + 시세/재무 데이터 제공자.
- 일별 OHLCV(모멘텀 스코어링용):
  - 한국: `pykrx` (KRX 공식 데이터 기반, 무료). 종가/거래량 일별 수집.
  - 미국: `yfinance` (Yahoo Finance 기반, 무료, `auto_adjust=True` 적용). 종가/거래량 일별 수집.
  - 수집 주기: 일 1회 장 마감 후. 전종목 배치 처리 시 요청 간 딜레이 적용.
  - 한계: yfinance는 Yahoo API 변경 시 중단 위험 있음. 장기적으로 유료 대안(Polygon.io 등) 검토.
- 매크로 지표: FRED 계열 + 금리/원자재/변동성/유동성 소스.
- 뉴스: 금융 뉴스 API + 신뢰 가능한 RSS 피드.
- OAuth: Google Identity Platform.

## 4. Agent 및 Skill 전략

## 4.1 Agent 구성
- `Financial Analysis Agent`
  - 재무제표를 쉬운 서술형 요약으로 변환한다.
  - 핵심 재무비율을 계산하고 산업 기준선과 비교한다.
  - 해자 가설, 강점, 리스크를 도출한다.
- `Macro Regime Agent`
  - 매크로/유동성/지정학 신호를 집계한다.
  - 현재 국면(regime)과 단기 시나리오를 분류한다.
- `News Impact Agent`
  - 최신 뉴스에서 사건/개체를 추출한다.
  - 2차 파급 추론을 수행한다(원인 -> 전달 경로 -> 영향 자산).
- `Idea Generation Agent`
  - 모멘텀 상위 종목을 섹터/산업별로 클러스터링해 현재 테마를 도출한다.
  - 뉴스·매크로 데이터와 교차 분석해 테마의 구조적 원인을 설명한다.
  - 밸류체인 리드-래그 패턴을 적용해 아직 주가에 반영 안 된 후행 수혜 종목을 추천한다.
  - 추천마다 근거(모멘텀 수치, 관련 뉴스, 밸류체인 관계)와 신뢰도를 함께 출력한다.
- `Recommendation Guardrail Agent`
  - 근거 품질과 신뢰도를 검증한다.
  - 근거가 약한 투기성 출력은 차단한다.

## 4.2 Skill 패키징(초기 권장 골격)
초기에 Skill 폴더 구조를 먼저 만들고, 레퍼런스는 추후 채운다.
1. `financial-statement-explainer`
2. `industry-benchmarking`
3. `economic-regime-analysis`
4. `liquidity-monitoring`
5. `news-causal-impact-mapper`
6. `equity-idea-ranking`
   - 모멘텀 스코어 계산 공식 및 파라미터 기준.
   - 밸류체인 리드-래그 패턴 레퍼런스(예: 반도체 장비→소재→완성품, 방산 대기업→부품사).
   - 테마 클러스터링 휴리스틱.
7. `report-writer-ko-en`

Skill별 기본 구성:
- `SKILL.md`: 트리거 설명 + 워크플로우.
- `references/`: 추후 정리할 도메인 노트, 공식, 휴리스틱.
- `scripts/`: 결정적 변환/스코어링 유틸리티.

## 5. 핵심 기능 동작 흐름

## 5.1 기능 1: 종목 재무 인사이트
1. 사용자가 시장 탭(KR/US)을 선택하고 티커를 검색한다.
2. API가 심볼을 정규화하고 캐시 스냅샷의 최신성을 확인한다.
3. 데이터가 오래되었거나 없으면 오케스트레이션 작업을 실행한다.
   - 최신 공시/재무 데이터 수집
   - 표준 지표 계산
   - 산업 피어 기준선 조회
   - Financial Analysis Agent로 쉬운 요약 + 해자 + 장단점 생성
4. `analysis_snapshot`에 버전/시점/출처 목록을 저장한다.
5. UI는 아래를 렌더링한다.
   - 이해하기 쉬운 요약
   - 핵심 차트/테이블
   - Bull/Bear 인사이트
   - 신뢰도 + 데이터 최신성

## 5.2 기능 2: 거시/지정학 전망
1. Scheduler가 지표별 주기에 맞춰 매크로 데이터를 갱신한다(분봉/일봉 등).
2. Macro Regime Agent가 신호 상태를 계산한다.
   - 유동성, 변동성, 인플레이션 추세, 성장 추세, 금리, 원자재, 지정학 리스크
3. 기본/낙관/비관 시나리오 텍스트와 확률 구간을 생성한다.
4. UI는 지표 카드, 추세 화살표, 시나리오 패널을 표시한다.

## 5.3 기능 3: 15분 실시간 뉴스 임팩트
1. 15분마다 아래를 수행한다.
   - 금융 뉴스 수집
   - 중복 제거 + 관련성/신규성 기반 랭킹
2. News Impact Agent 파이프라인:
   - 이벤트 추출
   - 전달 경로 매핑
   - 영향 가능 섹터/종목 후보 생성
   - 신뢰도 점수화
3. 짧은 파생 키워드를 포함한 뉴스 카드 데이터를 저장한다.
4. 카드 클릭 시:
   - 요약 + 원문 URL이 포함된 상세 페이지를 연다.
   - 왜 중요한지, 1차/2차 효과, 후보 티커를 심화 렌더링한다.

## 5.4 기능 4: 모멘텀 기반 테마 발굴 및 선행 추천
1. Scheduler가 일 1회 장 마감 후 전종목 일별 OHLCV를 수집한다.
   - 한국: `pykrx`, 미국: `yfinance`
2. 모멘텀 스코어를 계산해 `momentum_snapshots`에 저장한다.
   - 6개월 수익률 (절대 상승률)
   - 수익률 일관성 (월별 수익률 표준편차, 우상향 구간 비율)
   - 거래량 확인 (최근 1개월 평균 vs 6개월 평균 비율)
   - 변동성 조정 (일별 수익률 연환산 표준편차로 나누어 위험 대비 수익 정규화)
3. 모멘텀 상위 종목을 섹터/산업 기준으로 클러스터링해 `sector_themes`에 저장한다.
4. `Idea Generation Agent` 파이프라인:
   - 현재 테마 식별: "어떤 섹터가 모멘텀 상위에 집중되어 있는가?"
   - 구조적 원인 설명: 관련 뉴스·매크로 데이터와 교차 분석
   - 리드-래그 매핑: 밸류체인 상 선행 섹터 → 후행 수혜 섹터/종목 도출
     - 예: AI 반도체 강세 → AI 소프트웨어 → AI 도입 수혜 산업
     - 예: 방산 대기업 강세 → 방산 부품사/소재
     - 예: 원자재 가격 상승 → 관련 채굴/정제 기업
   - 후행 종목 중 아직 모멘텀 스코어가 낮은(저평가 가능성) 종목을 필터링
   - 추천 카드 생성: 근거(모멘텀 수치, 뉴스, 밸류체인 관계) + 신뢰도 포함
5. `Recommendation Guardrail Agent`가 근거 품질을 검증한다.
6. UI는 아래를 렌더링한다.
   - 현재 뜨는 테마 카드 (테마명, 대표 종목, 상승률, 구조적 원인 요약)
   - 앞으로 뜰 추천 카드 (추천 종목/산업, 밸류체인 근거, 신뢰도)

## 6. API 계약(v1 초안)
- `POST /auth/google/login`
- `GET /stocks/search?q=`
- `GET /stocks/{symbol}/analysis?market=KR|US`
- `GET /macro/overview`
- `GET /macro/scenarios`
- `GET /news/feed?limit=&cursor=`
- `GET /news/{news_id}`
- `GET /news/{news_id}/impact`
- `GET /momentum/themes?market=KR|US` (현재 뜨는 테마 목록)
- `GET /momentum/recommendations?market=KR|US` (리드-래그 기반 추천 목록)
- `POST /jobs/rebuild-analysis` (admin/internal)
- `POST /jobs/rebuild-momentum` (admin/internal)

응답 엔벌로프 권장 구조:
- `data`: 실제 응답 데이터
- `meta`: `as_of`, `sources`, `confidence`, `version`
- `warnings`: 누락/저품질 데이터 경고

## 7. 데이터 모델(최소안)
- `users(id, email, name, auth_provider, created_at)`
- `watchlists(id, user_id, symbol, market, created_at)`
- `financial_snapshots(id, symbol, market, period, metrics_json, source_json, created_at)`
- `industry_benchmarks(id, industry_code, market, metrics_json, as_of)`
- `stock_analysis_snapshots(id, symbol, market, summary_json, bull_json, bear_json, moat_json, confidence, as_of)`
- `macro_series(id, metric_code, value, observed_at, source)`
- `macro_regime_snapshots(id, regime_label, factors_json, scenarios_json, as_of)`
- `news_items(id, title, body, source_name, source_url, published_at, dedup_hash)`
- `news_impacts(id, news_id, impacts_json, confidence, as_of)`
- `price_history(id, symbol, market, date, open, high, low, close, volume, adj_close)` — 일별 OHLCV 누적, 모멘텀 계산 원천
- `momentum_snapshots(id, symbol, market, return_6m, consistency_score, volume_ratio, volatility, momentum_score, as_of)` — 종목별 모멘텀 스코어
- `sector_themes(id, market, theme_name, sector_code, top_symbols_json, avg_momentum_score, cause_summary, as_of)` — 클러스터링된 테마
- `momentum_recommendations(id, market, rec_type, symbol, industry, rationale_json, lead_theme_id, confidence, as_of)` — 리드-래그 추천 결과

## 8. 오케스트레이션 로직(의사코드)
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

# 모멘텀 파이프라인 (일 1회 장 마감 후)
job build_momentum(market):
  symbols = get_stock_universe(market)
  for symbol in symbols (with rate-limit delay):
    ohlcv = fetch_daily_ohlcv(symbol, market, period="6mo")  # pykrx or yfinance
    save_price_history(ohlcv)

  for symbol in symbols:
    history = get_price_history(symbol, market, months=6)
    score = compute_momentum_score(
      return_6m       = calc_return(history),
      consistency     = calc_consistency(history),   # 우상향 구간 비율
      volume_ratio    = calc_volume_ratio(history),  # 최근 1개월 / 6개월 평균
      volatility      = calc_volatility(history),    # 연환산 표준편차
    )
    save_momentum_snapshot(symbol, market, score)

  themes = cluster_by_sector(top_momentum_symbols(market, top_n=50))
  for theme in themes:
    cause = news_macro_crossref(theme)  # 뉴스·매크로 교차 분석
    save_sector_theme(theme, cause)

  recommendations = idea_generation_agent.run(themes, value_chain_map)
  for rec in recommendations:
    validated = guardrail_agent.validate(rec)
    save_momentum_recommendation(validated)
```

## 9. 프론트엔드 UX 구성
- 좌측 섹션 내비게이션:
  - `1. 종목 분석`
  - `2. 거시/매크로`
  - `3. 실시간 뉴스`
  - `4. 테마 추천`
- 스무스 스크롤 + 현재 섹션 하이라이트.
- Section 1 상단:
  - KR/US 세그먼트 탭
  - 최근 검색 히스토리가 있는 검색 입력창
- Section 3 카드:
  - 헤드라인, 출처, 시각
  - 매우 짧은 파생 키워드 라인
- 상세 페이지:
  - 요약 블록
  - 원문 링크 CTA
  - 임팩트 그래프/타임라인
- 모바일:
  - 좌측 내비게이션을 하단 Sticky 탭으로 전환
  - 카드 우선 세로 레이아웃
  - 고밀도 테이블은 확장형 행으로 단순화

## 10. 신뢰성, 품질, 가드레일
- 캐시 정책:
  - 종목 분석 TTL(예: 장 마감 주기에 따라 6~24시간)
  - 매크로 패널 TTL(지표 주기별)
  - 뉴스 피드 15분 단위 준실시간 갱신
- 품질 점수화:
  - 최소 출처 수
  - 수치 사실과 생성 서술 간 모순 검증
- 안전/컴플라이언스:
  - 고지 문구: 정보 제공 목적이며 투자 자문이 아님
  - 추천 결과의 근거 계보(provenance)와 신뢰도 로그 저장

## 11. 배포 청사진
- 프론트엔드: Vercel 또는 Cloud Run 정적 호스팅.
- 백엔드: FastAPI on Cloud Run/ECS/Kubernetes.
- 워커: 큐 컨슈머 기반 별도 배포.
- DB: 관리형 Postgres.
- 모니터링:
  - API 지연/오류 대시보드
  - 작업 성공/실패 메트릭
  - 데이터 최신성 알람

## 12. 마일스톤 계획
1. Phase 0 (1~2주): 기반 구축
- 레포 초기화, 인증, 기본 레이아웃, DB 스키마, CI/CD, 관측성.
2. Phase 1 (2~3주): 기능 1 MVP
- 종목 검색, 재무 수집, 기본 산업 비교, 설명 가능한 요약.
3. Phase 2 (2주): 기능 2 MVP
- 매크로 수집, 국면 분류, 시나리오 대시보드.
4. Phase 3 (2~3주): 기능 3 MVP
- 15분 뉴스 파이프라인, 임팩트 추론, 뉴스 상세 심화 화면.
5. Phase 4 (2~3주): 기능 4 MVP
- 일별 OHLCV 수집 파이프라인(pykrx/yfinance), 모멘텀 스코어 계산.
- 섹터 테마 클러스터링, Idea Generation Agent, 추천 카드 UI.
6. Phase 5 (지속): 품질 고도화
- 스코어 보정, 아이디어 백테스트, UX 다듬기, 모바일 최적화.

## 13. 즉시 착수 작업
1. 데이터 제공자 계약/연동 명세를 먼저 고정한다(KR/US 공시, 매크로, 뉴스).
2. 인증/세션과 사용자 모델을 구현한다.
3. 비동기 작업 프레임워크와 최신성 정책을 구현한다.
4. 고급 추천 로직을 넣기 전에 Section 1을 엔드투엔드로 먼저 출시한다.
5. 기능 2, 3은 품질 지표를 붙여 단계적으로 확장한다.

---
본 계획서는 구현 중심으로 작성되었으며, 이후 사용자가 정리할 Skill references를 결합해도 병렬 개발이 가능하도록 구성했다.
