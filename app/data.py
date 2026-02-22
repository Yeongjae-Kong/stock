from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import threading
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:  # Optional daily data provider for broader KR/US search and quotes.
    import FinanceDataReader as fdr
except Exception:  # pragma: no cover - optional dependency
    fdr = None

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "service.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

NEWS_QUERY = os.getenv(
    "NEWS_QUERY",
    "(economy OR inflation OR interest rate OR federal reserve OR election OR geopolitical OR oil OR tariff OR recession)",
)
NEWS_MAX_RECORDS = int(os.getenv("NEWS_MAX_RECORDS", "40"))

DEFAULT_MACRO_GEO = [
    "미국 선거 일정과 정책 발언에 따른 헤드라인 변동성이 높은 구간입니다.",
    "에너지 및 해상 운송 경로는 지정학적 이벤트에 민감한 상태입니다.",
    "정책 시그널 변화가 성장주와 장기 듀레이션 자산 가격을 빠르게 재평가시킬 수 있습니다.",
]

FALLBACK_NEWS = [
    {
        "id": 1,
        "title": "Fed speakers signal rates may stay restrictive for longer",
        "source_name": "Fallback Wire",
        "source_url": "https://example.com/fallback/fed-rates",
        "published_at": "2026-02-21T06:15:00+00:00",
        "summary": "연준 발언 기조가 매파적으로 해석되며 금리 민감 자산의 변동성이 확대될 수 있다는 요약입니다.",
        "derived_keywords": ["fed", "rates", "duration"],
    },
    {
        "id": 2,
        "title": "Oil volatility returns as supply risk premium expands",
        "source_name": "Fallback Wire",
        "source_url": "https://example.com/fallback/oil-volatility",
        "published_at": "2026-02-21T05:58:00+00:00",
        "summary": "유가 상승이 인플레이션 경로와 업종별 마진 전망에 영향을 줄 수 있다는 요약입니다.",
        "derived_keywords": ["oil", "inflation", "energy"],
    },
    {
        "id": 3,
        "title": "Treasury issuance outlook drives liquidity debate",
        "source_name": "Fallback Wire",
        "source_url": "https://example.com/fallback/liquidity-debate",
        "published_at": "2026-02-21T05:42:00+00:00",
        "summary": "국채 발행 및 유동성 전망 변화가 밸류에이션과 위험자산 선호에 영향을 줄 수 있다는 요약입니다.",
        "derived_keywords": ["treasury", "liquidity", "valuation"],
    },
]

STOCKS: dict[str, list[dict[str, Any]]] = {
    "KR": [
        {
            "symbol": "005930",
            "name": "Samsung Electronics",
            "name_en": "Samsung Electronics",
            "industry": "Semiconductors",
            "aliases": ["samsung", "sec", "samsung electronics"],
        },
        {
            "symbol": "005935",
            "name": "Samsung Electronics Pref",
            "name_en": "Samsung Electronics Pref",
            "industry": "Semiconductors",
            "aliases": ["samsung pref", "005935"],
        },
        {
            "symbol": "032830",
            "name": "Samsung Life",
            "name_en": "Samsung Life Insurance",
            "industry": "Insurance",
            "aliases": ["samsung life", "insurance"],
        },
        {
            "symbol": "207940",
            "name": "Samsung Biologics",
            "name_en": "Samsung Biologics",
            "industry": "Biopharma",
            "aliases": ["biologics", "bio"],
        },
        {
            "symbol": "000660",
            "name": "SK hynix",
            "name_en": "SK hynix",
            "industry": "Semiconductors",
            "aliases": ["hynix", "skhynix"],
        },
        {
            "symbol": "035420",
            "name": "NAVER",
            "name_en": "NAVER",
            "industry": "Internet Services",
            "aliases": ["naver", "search"],
        },
        {
            "symbol": "051910",
            "name": "LG Chem",
            "name_en": "LG Chem",
            "industry": "Chemicals",
            "aliases": ["lg chem", "battery materials"],
        },
        {
            "symbol": "035720",
            "name": "Kakao",
            "name_en": "Kakao",
            "industry": "Internet Services",
            "aliases": ["kakao", "platform"],
        },
    ],
    "US": [
        {
            "symbol": "NVDA",
            "name": "NVIDIA",
            "name_en": "NVIDIA",
            "industry": "Semiconductors",
            "aliases": ["nvidia", "cuda", "gpu"],
        },
        {
            "symbol": "AAPL",
            "name": "Apple",
            "name_en": "Apple",
            "industry": "Consumer Electronics",
            "aliases": ["apple", "iphone"],
        },
        {
            "symbol": "MSFT",
            "name": "Microsoft",
            "name_en": "Microsoft",
            "industry": "Software",
            "aliases": ["microsoft", "azure"],
        },
        {
            "symbol": "GOOGL",
            "name": "Alphabet",
            "name_en": "Alphabet",
            "industry": "Internet Services",
            "aliases": ["google", "alphabet"],
        },
        {
            "symbol": "AMZN",
            "name": "Amazon",
            "name_en": "Amazon",
            "industry": "E-commerce",
            "aliases": ["amazon", "aws"],
        },
        {
            "symbol": "META",
            "name": "Meta Platforms",
            "name_en": "Meta Platforms",
            "industry": "Internet Services",
            "aliases": ["meta", "facebook"],
        },
        {
            "symbol": "TSLA",
            "name": "Tesla",
            "name_en": "Tesla",
            "industry": "EV",
            "aliases": ["tesla", "ev"],
        },
        {
            "symbol": "AVGO",
            "name": "Broadcom",
            "name_en": "Broadcom",
            "industry": "Semiconductors",
            "aliases": ["broadcom", "avgo"],
        },
    ],
}

REFRESH_STATE: dict[str, Any] = {
    "initialized_at": None,
    "last_attempt_at": None,
    "last_success_at": None,
    "last_result": {"stocks": 0, "macro": 0, "news": 0, "impacts": 0, "errors": []},
}

WRITE_LOCK = threading.Lock()
LISTING_SYNC_LOCK = threading.Lock()

ENABLE_FDR_PROVIDER = os.getenv("ENABLE_FDR_PROVIDER", "1").strip() != "0"
SYNC_FDR_LISTINGS_ON_STARTUP = os.getenv("SYNC_FDR_LISTINGS_ON_STARTUP", "0").strip() == "1"
_FDR_SYNCED_MARKETS: set[str] = set()

STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "after",
    "before",
    "about",
    "amid",
    "over",
    "under",
    "that",
    "this",
    "will",
    "could",
    "would",
    "today",
    "markets",
    "market",
    "says",
    "said",
    "new",
    "outlook",
}

THEME_RULES: list[dict[str, Any]] = [
    {
        "name": "rates",
        "keywords": {"fed", "interest", "rate", "yield", "treasury", "hawkish", "dovish"},
        "thesis": "금리 변동성 확대는 성장주 멀티플과 듀레이션 민감 자산의 가격 재평가를 유도할 수 있습니다.",
        "assets": [
            {"ticker": "QQQ", "market": "US", "reason": "성장주 밸류에이션이 금리에 민감함", "confidence": 0.66},
            {"ticker": "TLT", "market": "US", "reason": "장기금리 변동을 반영하는 대표 듀레이션 자산", "confidence": 0.64},
        ],
    },
    {
        "name": "inflation",
        "keywords": {"inflation", "cpi", "pce", "wages", "core"},
        "thesis": "인플레이션 경로 변화는 정책 기대와 업종 주도주 구도를 바꿀 수 있습니다.",
        "assets": [
            {"ticker": "XLE", "market": "US", "reason": "인플레이션 지표와 에너지 업종 민감도", "confidence": 0.61},
            {"ticker": "GLD", "market": "US", "reason": "인플레이션 헤지 수요 반영 가능성", "confidence": 0.58},
        ],
    },
    {
        "name": "energy",
        "keywords": {"oil", "energy", "opec", "gas", "supply"},
        "thesis": "에너지 가격 충격은 인플레이션 리스크를 키우고 기업 마진을 압박할 수 있습니다.",
        "assets": [
            {"ticker": "USO", "market": "US", "reason": "유가 변동을 직접적으로 반영하는 자산", "confidence": 0.68},
            {"ticker": "XLE", "market": "US", "reason": "에너지 업종 주가 민감도", "confidence": 0.63},
        ],
    },
    {
        "name": "geopolitics",
        "keywords": {"election", "war", "tariff", "sanction", "geopolitical", "china", "trade"},
        "thesis": "정책 및 지정학 변화는 지역·업종별 위험 프리미엄을 재조정시킬 수 있습니다.",
        "assets": [
            {"ticker": "VIXY", "market": "US", "reason": "변동성 헤지 수요 확대 가능성", "confidence": 0.55},
            {"ticker": "SOXX", "market": "US", "reason": "반도체 공급망/정책 민감도", "confidence": 0.57},
        ],
    },
]


def _db_path() -> Path:
    env_path = os.getenv("STOCK_DB_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()
    return DEFAULT_DB_PATH


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _http_json(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "User-Agent": "stock-analysis-service/0.1",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=20) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _numeric_text(value: float | None, *, prefix: str = "", suffix: str = "", decimals: int = 2) -> str:
    if value is None:
        return "-"
    return f"{prefix}{value:.{decimals}f}{suffix}"


def _compact_money(value: float | None) -> str:
    if value is None:
        return "-"
    if abs(value) >= 1_000_000_000:
        return f"${value / 1_000_000_000:.0f}B"
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    return f"${value:,.0f}"


def _infer_trend(current: float | None, previous: float | None) -> str:
    if current is None or previous is None:
        return "flat"
    if current > previous * 1.001:
        return "up"
    if current < previous * 0.999:
        return "down"
    return "flat"


def initialize_data_layer() -> None:
    with WRITE_LOCK:
        with _connect() as conn:
            schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
            conn.executescript(schema_sql)
            _seed_stock_universe(conn)
            if SYNC_FDR_LISTINGS_ON_STARTUP:
                for market in ("KR", "US"):
                    try:
                        _sync_fdr_listing_market(conn, market)
                        _FDR_SYNCED_MARKETS.add(market)
                    except Exception:
                        continue
            _seed_fallback_macro(conn)
            _seed_fallback_news(conn)
            conn.commit()
    if REFRESH_STATE["initialized_at"] is None:
        REFRESH_STATE["initialized_at"] = _utc_now_iso()


def _seed_stock_universe(conn: sqlite3.Connection) -> None:
    for market, rows in STOCKS.items():
        for row in rows:
            aliases = [str(x).strip().lower() for x in row.get("aliases", []) if str(x).strip()]
            aliases.extend([row["symbol"].lower(), row["name"].lower(), row["name_en"].lower()])
            aliases_text = " ".join(sorted(set(aliases)))
            conn.execute(
                """
                INSERT OR REPLACE INTO stock_universe (
                    market, symbol, name, name_en, industry, aliases_text
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (market, row["symbol"].upper(), row["name"], row["name_en"], row["industry"], aliases_text),
            )


def _has_fdr() -> bool:
    return bool(ENABLE_FDR_PROVIDER and fdr is not None)


def _text_from_listing(record: dict[str, Any], *candidates: str) -> str:
    for key in candidates:
        if key in record and record[key] is not None:
            value = str(record[key]).strip()
            if value and value.lower() != "nan":
                return value
    return ""


def _normalize_listing_symbol(market: str, raw_symbol: str) -> str:
    symbol = raw_symbol.strip().upper()
    if market == "KR":
        digits = re.sub(r"\D", "", symbol)
        return digits.zfill(6) if digits else ""
    return symbol


def _iter_fdr_listing_records(listing_code: str) -> list[dict[str, Any]]:
    if not _has_fdr():
        return []
    try:
        frame = fdr.StockListing(listing_code)
    except Exception:
        return []
    if frame is None or getattr(frame, "empty", True):
        return []
    try:
        return frame.to_dict("records")
    except Exception:
        return []


def _normalize_fdr_listing_row(market: str, record: dict[str, Any]) -> dict[str, Any] | None:
    raw_symbol = _text_from_listing(record, "Symbol", "Code", "Ticker")
    symbol = _normalize_listing_symbol(market, raw_symbol)
    if not symbol:
        return None

    name = _text_from_listing(record, "Name", "Company", "종목명", "한글명")
    if not name:
        return None

    industry = _text_from_listing(record, "Industry", "Sector", "업종", "업종명") or "Unknown"
    market_label = _text_from_listing(record, "Market", "Exchange", "시장구분")

    aliases = {
        symbol.lower(),
        name.lower(),
        _text_from_listing(record, "Symbol").lower(),
        _text_from_listing(record, "Code").lower(),
        _text_from_listing(record, "Name").lower(),
        _text_from_listing(record, "Sector").lower(),
        _text_from_listing(record, "Industry").lower(),
    }
    aliases.discard("")
    if market_label:
        aliases.add(market_label.lower())

    return {
        "market": market,
        "symbol": symbol,
        "name": name,
        "name_en": name,
        "industry": industry,
        "aliases_text": " ".join(sorted(aliases)),
    }


def _upsert_search_universe_rows(conn: sqlite3.Connection, rows: list[dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        before = conn.total_changes
        conn.execute(
            """
            INSERT INTO stock_universe (market, symbol, name, name_en, industry, aliases_text)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(market, symbol) DO UPDATE SET
                name = COALESCE(NULLIF(excluded.name, ''), stock_universe.name),
                name_en = COALESCE(NULLIF(excluded.name_en, ''), stock_universe.name_en),
                industry = CASE
                    WHEN stock_universe.industry IN ('', 'Unknown') THEN excluded.industry
                    ELSE stock_universe.industry
                END,
                aliases_text = TRIM(stock_universe.aliases_text || ' ' || excluded.aliases_text)
            """,
            (
                row["market"],
                row["symbol"],
                row["name"],
                row["name_en"],
                row["industry"],
                row["aliases_text"],
            ),
        )
        if conn.total_changes > before:
            inserted += 1
    return inserted


def _sync_fdr_listing_market(conn: sqlite3.Connection, market: str) -> int:
    if not _has_fdr() or market not in {"KR", "US"}:
        return 0

    listing_codes = ["KRX"] if market == "KR" else ["NASDAQ", "NYSE", "AMEX"]
    normalized_rows: list[dict[str, Any]] = []
    for code in listing_codes:
        for record in _iter_fdr_listing_records(code):
            row = _normalize_fdr_listing_row(market, record)
            if row:
                normalized_rows.append(row)
    if not normalized_rows:
        return 0
    return _upsert_search_universe_rows(conn, normalized_rows)


def _ensure_fdr_search_universe(markets: list[str]) -> None:
    if not _has_fdr():
        return
    targets = [m for m in markets if m in {"KR", "US"}]
    if not targets:
        return
    pending = [m for m in targets if m not in _FDR_SYNCED_MARKETS]
    if not pending:
        return
    with LISTING_SYNC_LOCK:
        pending = [m for m in targets if m not in _FDR_SYNCED_MARKETS]
        if not pending:
            return
        with WRITE_LOCK:
            with _connect() as conn:
                for market in pending:
                    try:
                        _sync_fdr_listing_market(conn, market)
                        _FDR_SYNCED_MARKETS.add(market)
                    except Exception:
                        continue
                conn.commit()


def _seed_fallback_macro(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) AS c FROM macro_snapshots").fetchone()["c"]
    if count > 0:
        return
    now = _utc_now_iso()
    rows = [
        ("VIX", "VIX", "17.9", 17.9, "flat", "Fallback baseline"),
        ("TGA", "TGA", "$735B", 735_000_000_000.0, "flat", "Fallback baseline"),
        ("UST10Y", "US 10Y Yield", "4.11%", 4.11, "flat", "Fallback baseline"),
        ("CPI", "CPI YoY", "2.9%", 2.9, "flat", "Fallback baseline"),
        ("PCE", "Core PCE YoY", "2.8%", 2.8, "flat", "Fallback baseline"),
        ("GOLD", "Gold", "$2,180", 2180.0, "flat", "Fallback baseline"),
        ("WTI", "WTI Crude", "$78.4", 78.4, "flat", "Fallback baseline"),
        ("GDP", "US GDP QoQ", "2.1%", 2.1, "flat", "Fallback baseline"),
    ]
    for code, label, value_text, numeric_value, trend, note in rows:
        conn.execute(
            """
            INSERT INTO macro_snapshots
            (code, label, value_text, numeric_value, trend, note, fetched_at, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (code, label, value_text, numeric_value, trend, note, now, "fallback"),
        )


def _seed_fallback_news(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) AS c FROM news_items").fetchone()["c"]
    if count > 0:
        return
    for item in FALLBACK_NEWS:
        external_id = hashlib.sha1(item["source_url"].encode("utf-8")).hexdigest()
        conn.execute(
            """
            INSERT INTO news_items
            (external_id, title, source_name, source_url, published_at, summary, derived_keywords_json, ingested_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                external_id,
                item["title"],
                item["source_name"],
                item["source_url"],
                item["published_at"],
                item["summary"],
                json.dumps(item["derived_keywords"]),
                _utc_now_iso(),
            ),
        )
        news_id = conn.execute("SELECT id FROM news_items WHERE external_id = ?", (external_id,)).fetchone()["id"]
        impact = _build_news_impact(item["title"], item["summary"], item["derived_keywords"])
        conn.execute(
            """
            INSERT INTO news_impacts
            (news_id, thesis, why_it_matters, transmission_chain_json, related_assets_json, risks_json, confidence, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                news_id,
                impact["thesis"],
                impact["why_it_matters"],
                json.dumps(impact["transmission_chain"]),
                json.dumps(impact["related_assets"]),
                json.dumps(impact["risks"]),
                impact["confidence"],
                _utc_now_iso(),
            ),
        )


def _to_yahoo_symbol(market: str, symbol: str) -> str:
    if market == "KR":
        return f"{symbol}.KS"
    return symbol.upper()


def _to_stooq_symbol(market: str, symbol: str) -> str:
    if market == "KR":
        return f"{symbol}.ks"
    return f"{symbol.lower()}.us"


def _fetch_yahoo_quotes(symbols: list[str]) -> dict[str, dict[str, Any]]:
    if not symbols:
        return {}
    params = urlencode({"symbols": ",".join(symbols)})
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?{params}"
    payload = _http_json(url)
    rows = payload.get("quoteResponse", {}).get("result", [])
    return {str(row.get("symbol", "")).upper(): row for row in rows if row.get("symbol")}


def _fetch_stooq_quote(stooq_symbol: str) -> dict[str, Any] | None:
    url = f"https://stooq.com/q/l/?s={stooq_symbol}&i=d"
    request = Request(url, headers={"User-Agent": "stock-analysis-service/0.1"})
    with urlopen(request, timeout=20) as response:
        text = response.read().decode("utf-8")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None
    values = [x.strip() for x in lines[0].split(",")]
    if len(values) < 7:
        return None
    if values[1] == "N/D" or values[6] == "N/D":
        return None
    close = _safe_float(values[6])
    if close is None:
        return None
    fetched_at = _utc_now_iso()
    if values[1].isdigit() and len(values[1]) == 8 and values[2].isdigit() and len(values[2]) == 6:
        dt = datetime.strptime(f"{values[1]}{values[2]}", "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
        fetched_at = dt.isoformat()
    return {
        "price": close,
        "change_value": None,
        "change_percent": None,
        "currency": "KRW" if stooq_symbol.endswith(".ks") else "USD",
        "fetched_at": fetched_at,
    }


def _fetch_fred_series(series_id: str, api_key: str, limit: int = 30) -> list[tuple[str, float]]:
    params = urlencode(
        {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "sort_order": "desc",
            "limit": str(limit),
        }
    )
    url = f"https://api.stlouisfed.org/fred/series/observations?{params}"
    payload = _http_json(url)
    output: list[tuple[str, float]] = []
    for item in payload.get("observations", []):
        value = _safe_float(item.get("value"))
        if value is None:
            continue
        output.append((str(item.get("date", "")), value))
    output.reverse()
    return output


def _yoy(series: list[tuple[str, float]]) -> float | None:
    if len(series) < 13:
        return None
    latest = series[-1][1]
    prev = series[-13][1]
    if prev == 0:
        return None
    return (latest / prev - 1.0) * 100.0


def _qoq(series: list[tuple[str, float]]) -> float | None:
    if len(series) < 2:
        return None
    latest = series[-1][1]
    prev = series[-2][1]
    if prev == 0:
        return None
    return (latest / prev - 1.0) * 100.0


def refresh_stock_snapshots() -> int:
    watchlist: list[tuple[str, str]] = []
    for market, items in STOCKS.items():
        for item in items:
            watchlist.append((market, str(item["symbol"]).upper()))
    mapped = [(market, symbol, _to_yahoo_symbol(market, symbol)) for market, symbol in watchlist]
    quotes: dict[str, dict[str, Any]] = {}
    try:
        quotes = _fetch_yahoo_quotes([x[2] for x in mapped])
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        quotes = {}

    inserted = 0
    now = _utc_now_iso()
    with WRITE_LOCK:
        with _connect() as conn:
            for market, symbol, yahoo_symbol in mapped:
                quote = quotes.get(yahoo_symbol.upper())
                source = "yahoo"
                if quote:
                    price = _safe_float(quote.get("regularMarketPrice"))
                    change_value = _safe_float(quote.get("regularMarketChange"))
                    change_percent = _safe_float(quote.get("regularMarketChangePercent"))
                    timestamp = quote.get("regularMarketTime")
                    fetched_at = now
                    currency = str(quote.get("currency", "")) or None
                    if isinstance(timestamp, (int, float)) and timestamp > 0:
                        fetched_at = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
                else:
                    stooq_symbol = _to_stooq_symbol(market, symbol)
                    try:
                        stooq = _fetch_stooq_quote(stooq_symbol)
                    except (URLError, HTTPError, TimeoutError, ValueError):
                        stooq = None
                    if not stooq:
                        continue
                    price = _safe_float(stooq.get("price"))
                    change_value = _safe_float(stooq.get("change_value"))
                    change_percent = _safe_float(stooq.get("change_percent"))
                    fetched_at = str(stooq.get("fetched_at") or now)
                    currency = str(stooq.get("currency") or "")
                    source = "stooq"

                if price is None:
                    continue
                conn.execute(
                    """
                    INSERT INTO stock_snapshots (
                        market, symbol, price, change_value, change_percent, currency, fetched_at, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        market,
                        symbol,
                        price,
                        change_value,
                        change_percent,
                        currency or None,
                        fetched_at,
                        source,
                    ),
                )
                inserted += 1
            conn.commit()
    return inserted


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _fetch_fdr_daily_snapshot(market: str, symbol: str) -> dict[str, Any] | None:
    if not _has_fdr():
        return None
    try:
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=20)
        frame = fdr.DataReader(symbol.upper(), start=start_date.isoformat(), end=end_date.isoformat())
    except Exception:
        return None
    if frame is None or getattr(frame, "empty", True):
        return None

    try:
        tail = frame.tail(2)
        last_idx = tail.index[-1]
        last_row = tail.iloc[-1]
    except Exception:
        return None

    close_price = _safe_float(last_row.get("Close"))
    if close_price is None:
        return None

    previous_close: float | None = None
    if len(tail.index) >= 2:
        previous_close = _safe_float(tail.iloc[-2].get("Close"))

    change_value = None if previous_close is None else close_price - previous_close
    change_percent = None
    if previous_close not in (None, 0):
        change_percent = (close_price - previous_close) / previous_close * 100.0
    else:
        raw_change = _safe_float(last_row.get("Change"))
        if raw_change is not None:
            change_percent = raw_change * 100.0 if abs(raw_change) <= 2 else raw_change

    try:
        ts = last_idx.to_pydatetime()
    except Exception:
        try:
            ts = datetime.combine(last_idx, datetime.min.time())
        except Exception:
            ts = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    return {
        "market": market,
        "symbol": symbol.upper(),
        "price": close_price,
        "change_value": change_value,
        "change_percent": change_percent,
        "currency": "KRW" if market == "KR" else "USD",
        "fetched_at": ts.isoformat(),
        "source": "fdr-daily",
    }


def _fetch_single_market_snapshot(market: str, symbol: str) -> dict[str, Any] | None:
    daily = _fetch_fdr_daily_snapshot(market, symbol)
    if daily:
        return daily

    yahoo_symbol = _to_yahoo_symbol(market, symbol)
    try:
        quotes = _fetch_yahoo_quotes([yahoo_symbol])
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        quotes = {}
    quote = quotes.get(yahoo_symbol.upper())
    if quote:
        price = _safe_float(quote.get("regularMarketPrice"))
        if price is not None:
            timestamp = quote.get("regularMarketTime")
            fetched_at = _utc_now_iso()
            if isinstance(timestamp, (int, float)) and timestamp > 0:
                fetched_at = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
            return {
                "market": market,
                "symbol": symbol.upper(),
                "price": price,
                "change_value": _safe_float(quote.get("regularMarketChange")),
                "change_percent": _safe_float(quote.get("regularMarketChangePercent")),
                "currency": str(quote.get("currency", "")) or ("KRW" if market == "KR" else "USD"),
                "fetched_at": fetched_at,
                "source": "yahoo",
            }

    try:
        stooq = _fetch_stooq_quote(_to_stooq_symbol(market, symbol))
    except (URLError, HTTPError, TimeoutError, ValueError):
        stooq = None
    if not stooq:
        return None
    price = _safe_float(stooq.get("price"))
    if price is None:
        return None
    return {
        "market": market,
        "symbol": symbol.upper(),
        "price": price,
        "change_value": _safe_float(stooq.get("change_value")),
        "change_percent": _safe_float(stooq.get("change_percent")),
        "currency": str(stooq.get("currency") or ("KRW" if market == "KR" else "USD")),
        "fetched_at": str(stooq.get("fetched_at") or _utc_now_iso()),
        "source": "stooq",
    }


def _insert_stock_snapshot(conn: sqlite3.Connection, snapshot: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO stock_snapshots (
            market, symbol, price, change_value, change_percent, currency, fetched_at, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            snapshot["market"],
            snapshot["symbol"],
            _safe_float(snapshot.get("price")),
            _safe_float(snapshot.get("change_value")),
            _safe_float(snapshot.get("change_percent")),
            str(snapshot.get("currency") or "") or None,
            str(snapshot.get("fetched_at") or _utc_now_iso()),
            str(snapshot.get("source") or "unknown"),
        ),
    )


def _ensure_daily_snapshot(market: str, symbol: str) -> dict[str, Any] | None:
    latest = _latest_stock_snapshot(market, symbol)
    latest_dt = _parse_iso_datetime(latest["fetched_at"]) if latest else None
    if latest_dt and (datetime.now(timezone.utc) - latest_dt).total_seconds() < 6 * 3600:
        return latest

    snapshot = _fetch_single_market_snapshot(market, symbol)
    if not snapshot:
        return latest

    if latest:
        same_price = (
            _safe_float(latest.get("price")) == _safe_float(snapshot.get("price"))
            and _safe_float(latest.get("change_percent")) == _safe_float(snapshot.get("change_percent"))
        )
        if str(latest.get("fetched_at", ""))[:10] == str(snapshot.get("fetched_at", ""))[:10] and same_price:
            return latest

    with WRITE_LOCK:
        with _connect() as conn:
            _insert_stock_snapshot(conn, snapshot)
            conn.commit()
    return _latest_stock_snapshot(market, symbol)


def _latest_macro_map(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT m.*
        FROM macro_snapshots m
        JOIN (
            SELECT code, MAX(fetched_at) AS latest_at
            FROM macro_snapshots
            GROUP BY code
        ) x
        ON m.code = x.code AND m.fetched_at = x.latest_at
        """
    ).fetchall()
    return {row["code"]: dict(row) for row in rows}


def refresh_macro_snapshots() -> int:
    fred_api_key = os.getenv("FRED_API_KEY", "").strip()
    now = _utc_now_iso()

    with _connect() as conn:
        latest = _latest_macro_map(conn)

    base: dict[str, dict[str, Any]] = {
        "VIX": {"label": "VIX", "value_text": latest.get("VIX", {}).get("value_text", "17.9"), "numeric": latest.get("VIX", {}).get("numeric_value"), "note": "주식시장 변동성 체감 지표", "source": "fallback"},
        "TGA": {"label": "TGA", "value_text": latest.get("TGA", {}).get("value_text", "$735B"), "numeric": latest.get("TGA", {}).get("numeric_value"), "note": "미 재무부 현금잔고(유동성 영향)", "source": "fallback"},
        "UST10Y": {"label": "미국 10년물 금리", "value_text": latest.get("UST10Y", {}).get("value_text", "4.11%"), "numeric": latest.get("UST10Y", {}).get("numeric_value"), "note": "장기 할인율/밸류에이션 핵심 변수", "source": "fallback"},
        "CPI": {"label": "CPI YoY", "value_text": latest.get("CPI", {}).get("value_text", "2.9%"), "numeric": latest.get("CPI", {}).get("numeric_value"), "note": "소비자물가 상승률 흐름", "source": "fallback"},
        "PCE": {"label": "Core PCE YoY", "value_text": latest.get("PCE", {}).get("value_text", "2.8%"), "numeric": latest.get("PCE", {}).get("numeric_value"), "note": "연준 선호 물가 지표", "source": "fallback"},
        "GOLD": {"label": "금", "value_text": latest.get("GOLD", {}).get("value_text", "$2,180"), "numeric": latest.get("GOLD", {}).get("numeric_value"), "note": "불확실성 구간의 헤지 수요", "source": "fallback"},
        "WTI": {"label": "WTI 유가", "value_text": latest.get("WTI", {}).get("value_text", "$78.4"), "numeric": latest.get("WTI", {}).get("numeric_value"), "note": "에너지발 인플레이션 압력", "source": "fallback"},
        "GDP": {"label": "미국 GDP QoQ", "value_text": latest.get("GDP", {}).get("value_text", "2.1%"), "numeric": latest.get("GDP", {}).get("numeric_value"), "note": "실물 성장 모멘텀", "source": "fallback"},
    }

    try:
        macro_quotes = _fetch_yahoo_quotes(["^VIX", "^TNX", "GC=F", "CL=F"])
        if "^VIX" in macro_quotes:
            v = _safe_float(macro_quotes["^VIX"].get("regularMarketPrice"))
            base["VIX"].update({"numeric": v, "value_text": _numeric_text(v, decimals=2), "source": "yahoo"})
        if "^TNX" in macro_quotes:
            v = _safe_float(macro_quotes["^TNX"].get("regularMarketPrice"))
            base["UST10Y"].update({"numeric": v, "value_text": _numeric_text(v, suffix="%", decimals=2), "source": "yahoo"})
        if "GC=F" in macro_quotes:
            v = _safe_float(macro_quotes["GC=F"].get("regularMarketPrice"))
            base["GOLD"].update({"numeric": v, "value_text": _compact_money(v), "source": "yahoo"})
        if "CL=F" in macro_quotes:
            v = _safe_float(macro_quotes["CL=F"].get("regularMarketPrice"))
            base["WTI"].update({"numeric": v, "value_text": _compact_money(v), "source": "yahoo"})
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        pass

    if fred_api_key:
        try:
            cpi_series = _fetch_fred_series("CPIAUCSL", fred_api_key, 24)
            cpi_yoy = _yoy(cpi_series)
            if cpi_yoy is not None:
                base["CPI"].update({"numeric": cpi_yoy, "value_text": _numeric_text(cpi_yoy, suffix="%", decimals=1), "source": "fred"})
        except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
            pass
        try:
            pce_series = _fetch_fred_series("PCEPILFE", fred_api_key, 24)
            pce_yoy = _yoy(pce_series)
            if pce_yoy is not None:
                base["PCE"].update({"numeric": pce_yoy, "value_text": _numeric_text(pce_yoy, suffix="%", decimals=1), "source": "fred"})
        except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
            pass
        try:
            gdp_series = _fetch_fred_series("GDP", fred_api_key, 12)
            gdp_qoq = _qoq(gdp_series)
            if gdp_qoq is not None:
                base["GDP"].update({"numeric": gdp_qoq, "value_text": _numeric_text(gdp_qoq, suffix="%", decimals=1), "source": "fred"})
        except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
            pass
        try:
            tga_series = _fetch_fred_series("WTREGEN", fred_api_key, 8)
            if tga_series:
                tga_latest = tga_series[-1][1]
                base["TGA"].update({"numeric": tga_latest, "value_text": _compact_money(tga_latest), "source": "fred"})
        except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
            pass

    inserted = 0
    with WRITE_LOCK:
        with _connect() as conn:
            previous = _latest_macro_map(conn)
            for code, row in base.items():
                previous_value = _safe_float(previous.get(code, {}).get("numeric_value"))
                trend = _infer_trend(_safe_float(row["numeric"]), previous_value)
                conn.execute(
                    """
                    INSERT INTO macro_snapshots
                    (code, label, value_text, numeric_value, trend, note, fetched_at, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        code,
                        row["label"],
                        row["value_text"],
                        _safe_float(row["numeric"]),
                        trend,
                        row["note"],
                        now,
                        row["source"],
                    ),
                )
                inserted += 1
            conn.commit()
    return inserted


def _gdelt_datetime_to_iso(raw: str | None) -> str:
    if not raw:
        return _utc_now_iso()
    raw = raw.strip()
    if len(raw) == 14 and raw.isdigit():
        dt = datetime.strptime(raw, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return _utc_now_iso()


def _extract_keywords(*texts: str) -> list[str]:
    merged = " ".join(t for t in texts if t)
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", merged.lower())
    filtered = [tok for tok in tokens if tok not in STOP_WORDS]
    ranked: dict[str, int] = {}
    for token in filtered:
        ranked[token] = ranked.get(token, 0) + 1
    return [x[0] for x in sorted(ranked.items(), key=lambda item: (-item[1], item[0]))[:6]]


def _build_korean_news_summary(title: str, keywords: list[str]) -> str:
    tokens = [k.upper() if k.isupper() else k for k in keywords[:3]]
    token_text = ", ".join(tokens) if tokens else "거시/정책 이슈"
    return f"핵심 키워드({token_text}) 중심의 기사로, 관련 자산의 단기 변동성과 업종별 수급 변화 가능성을 점검할 필요가 있습니다."


def _build_news_impact(title: str, summary: str, keywords: list[str]) -> dict[str, Any]:
    text_tokens = set(_extract_keywords(title, summary) + [x.lower() for x in keywords])
    matched = [rule for rule in THEME_RULES if text_tokens.intersection(rule["keywords"])]

    if not matched:
        return {
            "thesis": "거시 헤드라인 흐름만으로도 자산군 전반의 위험선호가 빠르게 흔들릴 수 있습니다.",
            "why_it_matters": "단일 재료가 약하더라도 포지셔닝이 한쪽으로 쏠려 있으면 가격 변동이 증폭될 수 있습니다.",
            "transmission_chain": [
                "헤드라인 변화가 시장 기대를 수정",
                "금리·변동성 자산이 먼저 반응",
                "업종·팩터 로테이션 가속",
                "단기 종목 간 격차 확대",
            ],
            "related_assets": [
                {"ticker": "SPY", "market": "US", "reason": "미국 주식시장 전반의 위험선호 바로미터", "confidence": 0.52},
                {"ticker": "VIXY", "market": "US", "reason": "변동성 헤지 수단", "confidence": 0.49},
            ],
            "risks": [
                "헤드라인 과잉 구간에서는 신호 잡음이 커질 수 있음",
                "단기적으로는 펀더멘털보다 포지션 청산 영향이 클 수 있음",
                "자산 간 상관관계가 급변할 수 있음",
            ],
            "confidence": 0.48,
        }

    confidence = min(0.86, 0.5 + 0.08 * len(matched))
    primary = matched[0]
    return {
        "thesis": primary["thesis"],
        "why_it_matters": "해당 헤드라인은 금리·원자재·정책 기대 등 실제 밸류에이션 변수로 바로 연결될 가능성이 큽니다.",
        "transmission_chain": [
            "헤드라인 충격이 거시 시나리오 확률을 변경",
            "금리/원자재/환율이 먼저 조정",
            "새 가정에 따라 업종 선호 재정렬",
            "지수·개별주 포지셔닝이 후행 반영",
        ],
        "related_assets": primary["assets"],
        "risks": [
            "후속 경제지표 확인 전까지는 방향성이 흔들릴 수 있음",
            "정책 당국 커뮤니케이션에 따라 빠른 되돌림 가능",
            "실제 영향이 제한적이면 이벤트 프리미엄이 빠르게 소멸",
        ],
        "confidence": round(confidence, 2),
    }


def _fetch_gdelt_articles(maxrecords: int) -> list[dict[str, Any]]:
    params = urlencode(
        {
            "query": NEWS_QUERY,
            "mode": "ArtList",
            "maxrecords": str(maxrecords),
            "format": "json",
            "sort": "DateDesc",
            "timespan": "15min",
        }
    )
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?{params}"
    payload = _http_json(url)
    return [x for x in payload.get("articles", []) if x.get("url") and x.get("title")]


def _fetch_google_news_articles(maxrecords: int) -> list[dict[str, Any]]:
    params = urlencode(
        {
            "q": "economy OR inflation OR federal reserve OR election OR geopolitics",
            "hl": "en-US",
            "gl": "US",
            "ceid": "US:en",
        }
    )
    url = f"https://news.google.com/rss/search?{params}"
    request = Request(url, headers={"User-Agent": "stock-analysis-service/0.1"})
    with urlopen(request, timeout=20) as response:
        xml_payload = response.read().decode("utf-8")
    root = ET.fromstring(xml_payload)
    items = root.findall("./channel/item")
    output: list[dict[str, Any]] = []
    for item in items[:maxrecords]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        source = (item.findtext("source") or "").strip() or "Google News"
        if not title or not link:
            continue
        published_at = _utc_now_iso()
        if pub_date:
            try:
                published_at = parsedate_to_datetime(pub_date).astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
        output.append(
            {
                "title": title,
                "url": link,
                "domain": source,
                "seendate": published_at.replace("-", "").replace(":", "").replace("T", "")[:14],
            }
        )
    return output


def refresh_news_and_impacts(maxrecords: int | None = None) -> tuple[int, int]:
    limit = maxrecords if maxrecords is not None else NEWS_MAX_RECORDS
    try:
        articles = _fetch_gdelt_articles(limit)
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        articles = []
    if not articles:
        try:
            articles = _fetch_google_news_articles(limit)
        except (URLError, HTTPError, TimeoutError, ValueError, ET.ParseError):
            articles = []
    if not articles:
        return (0, 0)

    news_count = 0
    impact_count = 0
    now = _utc_now_iso()
    with WRITE_LOCK:
        with _connect() as conn:
            for article in articles:
                url = str(article["url"]).strip()
                title = str(article.get("title", "")).strip()
                summary = _build_korean_news_summary(title, keywords := _extract_keywords(title, str(article.get("title", "")).strip()))
                source_name = str(article.get("domain", "")).strip() or "GDELT"
                published_at = _gdelt_datetime_to_iso(str(article.get("seendate", "")).strip())
                external_id = hashlib.sha1(url.encode("utf-8")).hexdigest()

                conn.execute(
                    """
                    INSERT INTO news_items
                    (external_id, title, source_name, source_url, published_at, summary, derived_keywords_json, ingested_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(external_id) DO UPDATE SET
                        title = excluded.title,
                        source_name = excluded.source_name,
                        source_url = excluded.source_url,
                        published_at = excluded.published_at,
                        summary = excluded.summary,
                        derived_keywords_json = excluded.derived_keywords_json,
                        ingested_at = excluded.ingested_at
                    """,
                    (
                        external_id,
                        title,
                        source_name,
                        url,
                        published_at,
                        summary,
                        json.dumps(keywords),
                        now,
                    ),
                )
                news_id = conn.execute("SELECT id FROM news_items WHERE external_id = ?", (external_id,)).fetchone()["id"]
                impact = _build_news_impact(title, summary, keywords)
                conn.execute(
                    """
                    INSERT INTO news_impacts
                    (news_id, thesis, why_it_matters, transmission_chain_json, related_assets_json, risks_json, confidence, generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(news_id) DO UPDATE SET
                        thesis = excluded.thesis,
                        why_it_matters = excluded.why_it_matters,
                        transmission_chain_json = excluded.transmission_chain_json,
                        related_assets_json = excluded.related_assets_json,
                        risks_json = excluded.risks_json,
                        confidence = excluded.confidence,
                        generated_at = excluded.generated_at
                    """,
                    (
                        news_id,
                        impact["thesis"],
                        impact["why_it_matters"],
                        json.dumps(impact["transmission_chain"]),
                        json.dumps(impact["related_assets"]),
                        json.dumps(impact["risks"]),
                        impact["confidence"],
                        now,
                    ),
                )
                news_count += 1
                impact_count += 1

            conn.execute(
                """
                DELETE FROM news_items
                WHERE id NOT IN (
                    SELECT id FROM news_items
                    ORDER BY published_at DESC, id DESC
                    LIMIT 2000
                )
                """
            )
            conn.commit()
    return (news_count, impact_count)


def refresh_all_sources() -> dict[str, Any]:
    REFRESH_STATE["last_attempt_at"] = _utc_now_iso()
    result: dict[str, Any] = {"stocks": 0, "macro": 0, "news": 0, "impacts": 0, "errors": []}

    try:
        result["stocks"] = refresh_stock_snapshots()
    except Exception as exc:  # pragma: no cover
        result["errors"].append(f"stocks: {exc}")

    try:
        result["macro"] = refresh_macro_snapshots()
    except Exception as exc:  # pragma: no cover
        result["errors"].append(f"macro: {exc}")

    try:
        news_count, impact_count = refresh_news_and_impacts()
        result["news"] = news_count
        result["impacts"] = impact_count
    except Exception as exc:  # pragma: no cover
        result["errors"].append(f"news: {exc}")

    if not result["errors"]:
        REFRESH_STATE["last_success_at"] = _utc_now_iso()
    REFRESH_STATE["last_result"] = result
    return result


def get_refresh_state() -> dict[str, Any]:
    return json.loads(json.dumps(REFRESH_STATE))


def search_stocks(query: str, market: str | None = None) -> list[dict[str, Any]]:
    keyword = query.strip().lower()
    if not keyword:
        return []
    like = f"%{keyword}%"

    def _query_db() -> list[dict[str, Any]]:
        with _connect() as conn:
            if market in {"KR", "US"}:
                rows = conn.execute(
                    """
                    SELECT market, symbol, name, name_en, industry
                    FROM stock_universe
                    WHERE market = ? AND (
                        lower(symbol) LIKE ? OR lower(name) LIKE ? OR lower(name_en) LIKE ? OR aliases_text LIKE ?
                    )
                    ORDER BY CASE
                        WHEN lower(symbol) = ? THEN 0
                        WHEN lower(symbol) LIKE ? THEN 1
                        WHEN lower(name) LIKE ? THEN 2
                        ELSE 3
                    END, symbol
                    LIMIT 12
                    """,
                    (market, like, like, like, like, keyword, f"{keyword}%", f"{keyword}%"),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT market, symbol, name, name_en, industry
                    FROM stock_universe
                    WHERE lower(symbol) LIKE ? OR lower(name) LIKE ? OR lower(name_en) LIKE ? OR aliases_text LIKE ?
                    ORDER BY CASE
                        WHEN lower(symbol) = ? THEN 0
                        WHEN lower(symbol) LIKE ? THEN 1
                        WHEN lower(name) LIKE ? THEN 2
                        ELSE 3
                    END, market, symbol
                    LIMIT 12
                    """,
                    (like, like, like, like, keyword, f"{keyword}%", f"{keyword}%"),
                ).fetchall()
        return [dict(row) for row in rows]

    rows = _query_db()
    if rows:
        return rows

    targets = [market] if market in {"KR", "US"} else ["KR", "US"]
    _ensure_fdr_search_universe(targets)
    return _query_db()


def get_stock_info(market: str, symbol: str) -> dict[str, Any] | None:
    symbol = symbol.upper()

    def _query() -> sqlite3.Row | None:
        with _connect() as conn:
            return conn.execute(
                """
                SELECT market, symbol, name, name_en, industry
                FROM stock_universe
                WHERE market = ? AND symbol = ?
                """,
                (market, symbol),
            ).fetchone()

    row = _query()
    if row:
        return dict(row)

    _ensure_fdr_search_universe([market])
    row = _query()
    return dict(row) if row else None


def _latest_stock_snapshot(market: str, symbol: str) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT market, symbol, price, change_value, change_percent, currency, fetched_at, source
            FROM stock_snapshots
            WHERE market = ? AND symbol = ?
            ORDER BY fetched_at DESC
            LIMIT 1
            """,
            (market, symbol.upper()),
        ).fetchone()
    return dict(row) if row else None


def _generic_analysis(stock: dict[str, Any], snapshot: dict[str, Any] | None) -> dict[str, Any]:
    seed = sum(ord(ch) for ch in stock["symbol"])
    op_margin = 9 + (seed % 11)
    roe = 8 + (seed % 9)
    debt = 26 + (seed % 27)
    industry_margin = max(6, op_margin - 2)
    industry_roe = max(5, roe - 1)
    industry_debt = min(70, debt + 8)
    change_pct = _safe_float(snapshot["change_percent"]) if snapshot else None
    momentum_text = "중립"
    if change_pct is not None and change_pct > 1.0:
        momentum_text = "강세"
    elif change_pct is not None and change_pct < -1.0:
        momentum_text = "약세"

    summary = (
        f"{stock['name']}는 {stock['industry']} 업종 내에서 수익성과 재무 안정성의 균형이 비교적 양호한 종목으로 볼 수 있습니다. "
        f"단기 주가 모멘텀은 {momentum_text} 구간으로 판단되며, 거시 변동성 구간에서의 실적 방어력이 핵심 점검 포인트입니다."
    )
    return {
        "plain_summary": summary,
        "latest_quote": (
            {
                "price": _safe_float(snapshot.get("price")),
                "change_value": _safe_float(snapshot.get("change_value")),
                "change_percent": _safe_float(snapshot.get("change_percent")),
                "currency": snapshot.get("currency"),
                "fetched_at": snapshot.get("fetched_at"),
                "source": snapshot.get("source"),
            }
            if snapshot
            else None
        ),
        "industry_comparison": {
            "industry": stock["industry"],
            "comment": "동종 업계 평균 대비 수익성/재무지표는 중상위권으로 추정되지만, 거시 변수 민감도는 여전히 유의미합니다.",
            "metrics": [
                {"name": "Operating Margin", "company": f"{op_margin:.1f}%", "industry_avg": f"{industry_margin:.1f}%"},
                {"name": "ROE", "company": f"{roe:.1f}%", "industry_avg": f"{industry_roe:.1f}%"},
                {"name": "Debt Ratio", "company": f"{debt:.0f}%", "industry_avg": f"{industry_debt:.0f}%"},
            ],
        },
        "moat": ["규모의 경제와 유통/고객 기반", "핵심 제품군의 고객 락인", "운영 효율 및 실행력"],
        "pros": ["현금창출력의 안정성", "업종 내 상대적 경쟁력", "사이클 회복 시 실적 레버리지 가능성"],
        "cons": ["거시 변수 민감도 상존", "다운사이클 구간 실행 리스크", "금리 변화에 따른 밸류에이션 변동"],
        "sources": ["Yahoo Finance quote feed", "Internal heuristic model"],
        "confidence": 0.67 if snapshot else 0.58,
        "as_of": snapshot["fetched_at"] if snapshot else _utc_now_iso(),
    }


def get_analysis(market: str, symbol: str) -> dict[str, Any] | None:
    info = get_stock_info(market, symbol)
    if not info:
        return None
    snapshot = _ensure_daily_snapshot(market, symbol)
    return _generic_analysis(info, snapshot)


def get_macro_overview() -> dict[str, Any]:
    preferred_order = ["VIX", "TGA", "UST10Y", "CPI", "PCE", "GOLD", "WTI", "GDP"]
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT m.*
            FROM macro_snapshots m
            JOIN (
                SELECT code, MAX(fetched_at) AS latest_at
                FROM macro_snapshots
                GROUP BY code
            ) x
            ON m.code = x.code AND m.fetched_at = x.latest_at
            """
        ).fetchall()
    row_map = {row["code"]: dict(row) for row in rows}
    indicators = []
    for code in preferred_order:
        row = row_map.get(code)
        if not row:
            continue
        indicators.append(
            {
                "code": code,
                "label": row["label"],
                "value": row["value_text"],
                "trend": row["trend"],
                "note": row["note"],
            }
        )
    as_of = max((row["fetched_at"] for row in row_map.values()), default=_utc_now_iso())
    return {"as_of": as_of, "indicators": indicators, "geopolitical": DEFAULT_MACRO_GEO}


def get_macro_scenarios() -> dict[str, Any]:
    with _connect() as conn:
        vix_row = conn.execute(
            "SELECT numeric_value FROM macro_snapshots WHERE code = 'VIX' ORDER BY fetched_at DESC LIMIT 1"
        ).fetchone()
        cpi_row = conn.execute(
            "SELECT numeric_value FROM macro_snapshots WHERE code = 'CPI' ORDER BY fetched_at DESC LIMIT 1"
        ).fetchone()
    vix = _safe_float(vix_row["numeric_value"]) if vix_row else None
    cpi = _safe_float(cpi_row["numeric_value"]) if cpi_row else None

    bull = 0.2
    bear = 0.25
    if vix is not None:
        if vix < 16:
            bull += 0.08
            bear -= 0.06
        elif vix > 22:
            bull -= 0.06
            bear += 0.10
    if cpi is not None:
        if cpi < 2.5:
            bull += 0.05
            bear -= 0.04
        elif cpi > 3.5:
            bull -= 0.05
            bear += 0.06

    bull = min(0.55, max(0.1, bull))
    bear = min(0.55, max(0.1, bear))
    base = max(0.1, 1.0 - bull - bear)
    total = bull + bear + base
    bull /= total
    bear /= total
    base /= total

    return {
        "base": {
            "probability": round(base, 2),
            "summary": "물가 둔화가 완만하게 이어지고 성장률은 급락 없이 점진 둔화하는 기본 시나리오입니다.",
        },
        "bull": {
            "probability": round(bull, 2),
            "summary": "변동성 완화와 물가 안정이 위험자산 멀티플 확장을 지지하는 낙관 시나리오입니다.",
        },
        "bear": {
            "probability": round(bear, 2),
            "summary": "정책/지정학 충격으로 유동성이 위축되고 밸류에이션이 압박받는 비관 시나리오입니다.",
        },
    }


def get_news_feed(limit: int = 10, cursor: int | None = None) -> list[dict[str, Any]]:
    limit = max(1, min(30, int(limit)))
    with _connect() as conn:
        if cursor is None:
            rows = conn.execute(
                """
                SELECT id, title, source_name, source_url, published_at, summary, derived_keywords_json
                FROM news_items
                ORDER BY published_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, title, source_name, source_url, published_at, summary, derived_keywords_json
                FROM news_items
                WHERE id < ?
                ORDER BY published_at DESC, id DESC
                LIMIT ?
                """,
                (cursor, limit),
            ).fetchall()
    output: list[dict[str, Any]] = []
    for row in rows:
        output.append(
            {
                "id": row["id"],
                "title": row["title"],
                "source_name": row["source_name"],
                "source_url": row["source_url"],
                "published_at": row["published_at"],
                "summary": row["summary"],
                "derived_keywords": json.loads(row["derived_keywords_json"] or "[]"),
            }
        )
    return output


def get_news_item(news_id: int) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, title, source_name, source_url, published_at, summary, derived_keywords_json
            FROM news_items
            WHERE id = ?
            """,
            (news_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "title": row["title"],
        "source_name": row["source_name"],
        "source_url": row["source_url"],
        "published_at": row["published_at"],
        "summary": row["summary"],
        "derived_keywords": json.loads(row["derived_keywords_json"] or "[]"),
    }


def get_news_impact(news_id: int) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT thesis, why_it_matters, transmission_chain_json, related_assets_json, risks_json, confidence
            FROM news_impacts
            WHERE news_id = ?
            """,
            (news_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "thesis": row["thesis"],
        "why_it_matters": row["why_it_matters"],
        "transmission_chain": json.loads(row["transmission_chain_json"] or "[]"),
        "related_assets": json.loads(row["related_assets_json"] or "[]"),
        "risks": json.loads(row["risks_json"] or "[]"),
        "confidence": _safe_float(row["confidence"]) or 0.0,
    }
