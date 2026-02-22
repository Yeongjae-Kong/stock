# Stock Analysis Service

`docs/stock-analysis-service-plan.ko.md`를 기반으로 한 MVP입니다.

- 백엔드: `FastAPI` (`app/`)
- 프론트엔드(React): `Vite + React + Tailwind` (`web-react/`)

## 1) 백엔드 실행
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

백엔드 기본 주소: `http://127.0.0.1:8000`

## 2) React 프론트 실행
새 터미널에서:
```bash
cd web-react
npm install
npm run dev
```

프론트 기본 주소: `http://127.0.0.1:5173`

Vite dev server에서 `/api` 요청은 자동으로 `http://127.0.0.1:8000`으로 프록시됩니다.

## 데이터 파이프라인(실제 수집)
- 15분 주기 백그라운드 수집기: 앱 시작 시 1회 즉시 실행 + 주기 실행
- 저장소: SQLite (`data/service.db`)
- 스키마: `app/schema.sql`
  - `stock_universe`: 종목 마스터(KR/US)
  - `stock_snapshots`: 실시간/지연 시세 스냅샷
  - `macro_snapshots`: VIX/금리/원자재/거시 지표 이력
  - `news_items`: 경제/정치 뉴스 원문 메타
  - `news_impacts`: 뉴스 기반 파생 이슈(테마, 전이 경로, 관련 자산)

## 환경변수
- `DATA_REFRESH_INTERVAL_SECONDS` (기본 `900`)
- `STOCK_DB_PATH` (기본 `./data/service.db`)
- `NEWS_QUERY` (기본: 경제/정치 키워드 OR 쿼리)
- `NEWS_MAX_RECORDS` (기본 `40`)
- `FRED_API_KEY` (선택, CPI/PCE/GDP/TGA 보강용)

## API 교체 순서(적용 완료)
1. `GET /api/stocks/search`: 목데이터 -> DB(`stock_universe`) 조회
2. `GET /api/stocks/{symbol}/analysis`: 목분석 -> 최신 스냅샷+휴리스틱 분석
3. `GET /api/news/feed`, `GET /api/news/{id}`: 목뉴스 -> DB(`news_items`) 조회
4. `GET /api/news/{id}/impact`: 목파생 -> DB(`news_impacts`) 조회
5. `GET /api/macro/overview`, `GET /api/macro/scenarios`: 목거시 -> DB(`macro_snapshots`) 기반 계산
6. `POST /api/system/refresh`: 수동 수집 트리거 추가
7. `GET /api/health`: 파이프라인 상태(`last_success_at`, 최근 결과) 포함

## 포함 기능
- 좌측(모바일 하단) 탭 네비게이션 + 섹션 스크롤 이동
- KR/US 탭 기반 종목 검색 + 재무 요약/장단점/해자 분석 카드
- 매크로 지표 카드 + AI 시나리오 요약 패널
- 실시간 뉴스 카드 + `/news/:id` 상세 페이지(원문 요약/파생 이슈 심화)
- Google 로그인 버튼(현재는 백엔드 플레이스홀더 엔드포인트 호출)

## 참고
- 프로덕션 배포 시 `web-react` 빌드 산출물을 FastAPI 정적 파일로 서빙하도록 연결하면 단일 배포로 운영할 수 있습니다.
