from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.data import (
    get_analysis,
    get_macro_overview,
    get_macro_scenarios,
    get_news_feed,
    get_news_impact,
    get_news_item,
    get_refresh_state,
    get_stock_info,
    initialize_data_layer,
    refresh_all_sources,
    search_stocks,
)

BASE_DIR = Path(__file__).resolve().parent.parent
REACT_DIST_DIR = BASE_DIR / "web-react" / "dist"
REACT_INDEX_FILE = REACT_DIST_DIR / "index.html"
REACT_ASSETS_DIR = REACT_DIST_DIR / "assets"
REFRESH_INTERVAL_SECONDS = max(60, int(os.getenv("DATA_REFRESH_INTERVAL_SECONDS", "900")))


def using_react_build() -> bool:
    return REACT_INDEX_FILE.exists()


def envelope(
    data: Any,
    *,
    warnings: list[str] | None = None,
    extra_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta = {"as_of": datetime.now(timezone.utc).isoformat(), "version": "v1"}
    if extra_meta:
        meta.update(extra_meta)
    return {"data": data, "meta": meta, "warnings": warnings or []}


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_data_layer()
    await asyncio.to_thread(refresh_all_sources)

    stop_event = asyncio.Event()

    async def refresh_loop() -> None:
        while not stop_event.is_set():
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=REFRESH_INTERVAL_SECONDS)
            except asyncio.TimeoutError:
                await asyncio.to_thread(refresh_all_sources)

    task = asyncio.create_task(refresh_loop())
    app.state.refresh_stop_event = stop_event
    app.state.refresh_task = task
    try:
        yield
    finally:
        stop_event.set()
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Stock Integrated Analysis Service", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if REACT_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(REACT_ASSETS_DIR)), name="react-assets")


@app.get("/")
def index() -> FileResponse:
    if not using_react_build():
        raise HTTPException(status_code=503, detail="React build output not found.")
    return FileResponse(REACT_INDEX_FILE)


@app.get("/news/{news_id}")
def news_detail_page(news_id: int) -> FileResponse:
    _ = news_id
    if not using_react_build():
        raise HTTPException(status_code=503, detail="React build output not found.")
    return FileResponse(REACT_INDEX_FILE)


@app.get("/favicon.ico")
def favicon() -> Response:
    react_icon = REACT_DIST_DIR / "favicon.ico"
    if react_icon.exists():
        return FileResponse(react_icon)
    return Response(status_code=204)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "pipeline": get_refresh_state()}


@app.post("/api/system/refresh")
def force_refresh() -> dict[str, Any]:
    result = refresh_all_sources()
    return envelope(result, extra_meta={"pipeline": get_refresh_state()})


@app.post("/api/auth/google/login")
@app.post("/auth/google/login")
def google_login() -> dict[str, Any]:
    return envelope(
        {"message": "Google login endpoint placeholder", "authenticated": False},
        warnings=["Google OAuth client settings and token verification are not wired yet."],
    )


@app.get("/api/stocks/search")
def stocks_search(
    q: str = Query(..., min_length=1),
    market: str | None = Query(None, pattern="^(KR|US)$"),
) -> dict[str, Any]:
    rows = search_stocks(q, market)
    warning = None if rows else ["No matching stocks found."]
    return envelope(rows, warnings=warning)


@app.get("/api/stocks/{symbol}/analysis")
def stock_analysis(
    symbol: str,
    market: str = Query(..., pattern="^(KR|US)$"),
) -> dict[str, Any]:
    info = get_stock_info(market, symbol)
    analysis = get_analysis(market, symbol)
    if not info or not analysis:
        raise HTTPException(status_code=404, detail="Stock analysis data not found.")
    return envelope(
        {"stock": info, "analysis": analysis},
        extra_meta={
            "sources": analysis["sources"],
            "confidence": analysis["confidence"],
            "as_of": analysis["as_of"],
        },
    )


@app.get("/api/macro/overview")
def macro_overview() -> dict[str, Any]:
    overview = get_macro_overview()
    return envelope(overview, extra_meta={"as_of": overview["as_of"]})


@app.get("/api/macro/scenarios")
def macro_scenarios() -> dict[str, Any]:
    return envelope(get_macro_scenarios())


@app.get("/api/news/feed")
def news_feed(limit: int = Query(10, ge=1, le=30), cursor: int | None = None) -> dict[str, Any]:
    rows = get_news_feed(limit=limit, cursor=cursor)
    warning = None if rows else ["No news available yet."]
    return envelope(rows, warnings=warning)


@app.get("/api/news/{news_id}")
def news_item(news_id: int) -> dict[str, Any]:
    item = get_news_item(news_id)
    if not item:
        raise HTTPException(status_code=404, detail="News item not found.")
    return envelope(item)


@app.get("/api/news/{news_id}/impact")
def news_impact(news_id: int) -> dict[str, Any]:
    impact = get_news_impact(news_id)
    if not impact:
        raise HTTPException(status_code=404, detail="News impact data not found.")
    return envelope(impact, extra_meta={"confidence": impact["confidence"]})
