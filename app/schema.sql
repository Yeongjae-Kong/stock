CREATE TABLE IF NOT EXISTS stock_universe (
    market TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    industry TEXT NOT NULL,
    aliases_text TEXT NOT NULL,
    PRIMARY KEY (market, symbol)
);

CREATE TABLE IF NOT EXISTS stock_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market TEXT NOT NULL,
    symbol TEXT NOT NULL,
    price REAL,
    change_value REAL,
    change_percent REAL,
    currency TEXT,
    fetched_at TEXT NOT NULL,
    source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_lookup
    ON stock_snapshots (market, symbol, fetched_at DESC);

CREATE TABLE IF NOT EXISTS macro_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    value_text TEXT NOT NULL,
    numeric_value REAL,
    trend TEXT NOT NULL,
    note TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_macro_snapshots_code
    ON macro_snapshots (code, fetched_at DESC);

CREATE TABLE IF NOT EXISTS news_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    published_at TEXT NOT NULL,
    summary TEXT NOT NULL,
    derived_keywords_json TEXT NOT NULL,
    ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_items_published
    ON news_items (published_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS news_impacts (
    news_id INTEGER PRIMARY KEY,
    thesis TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    transmission_chain_json TEXT NOT NULL,
    related_assets_json TEXT NOT NULL,
    risks_json TEXT NOT NULL,
    confidence REAL NOT NULL,
    generated_at TEXT NOT NULL,
    FOREIGN KEY (news_id) REFERENCES news_items(id) ON DELETE CASCADE
);
