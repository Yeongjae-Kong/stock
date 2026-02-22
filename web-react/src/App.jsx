import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "./api";
import { localizeKeywordList } from "./utils/newsText";

const NAV_ITEMS = [
  { id: "stock", label: "주식 분석", icon: "analytics", sectionId: "section-stock" },
  { id: "macro", label: "매크로", icon: "language", sectionId: "section-macro" },
  { id: "signal", label: "시그널", icon: "bolt", sectionId: "section-signal" },
];

const MARKET_META = {
  KR: {
    label: "국내 주식",
    shortLabel: "국내",
    ring: "ring-blue-200",
    chip: "bg-blue-50 text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700",
    placeholder: "예: 삼성전자, 005930",
  },
  US: {
    label: "미국 주식",
    shortLabel: "미국",
    ring: "ring-emerald-200",
    chip: "bg-emerald-50 text-emerald-700",
    button: "bg-emerald-600 hover:bg-emerald-700",
    placeholder: "예: NVIDIA, NVDA",
  },
};

const DEFAULT_QUERY_BY_MARKET = {
  KR: "삼성전자",
  US: "nvidia",
};

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parsePercent(value) {
  const n = Number((value || "").toString().replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

function formatQuoteView(quote, market) {
  if (!quote || typeof quote.price !== "number") return null;
  const currency = quote.currency || (market === "KR" ? "KRW" : "USD");
  const isKrw = currency.toUpperCase() === "KRW";
  const price = isKrw
    ? Math.round(quote.price).toLocaleString("ko-KR")
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(quote.price);

  const hasChange = typeof quote.change_percent === "number" || typeof quote.change_value === "number";
  if (!hasChange) {
    return { price, delta: "", up: null };
  }

  const changeValue = typeof quote.change_value === "number" ? quote.change_value : null;
  const changePercent = typeof quote.change_percent === "number" ? quote.change_percent : null;
  const signBase = changePercent ?? changeValue ?? 0;
  const sign = signBase > 0 ? "+" : signBase < 0 ? "-" : "";
  const absChangeValue = changeValue == null ? null : Math.abs(changeValue);
  const absChangePercent = changePercent == null ? null : Math.abs(changePercent);
  const changeValueText =
    absChangeValue == null
      ? ""
      : isKrw
        ? `${sign}${Math.round(absChangeValue).toLocaleString("ko-KR")}`
        : `${sign}$${absChangeValue.toFixed(2)}`;
  const changePercentText =
    absChangePercent == null
      ? ""
      : `${sign}${absChangePercent.toFixed(2)}%`;
  const delta = [changeValueText, changePercentText].filter(Boolean).join(" ");
  return { price, delta, up: signBase > 0 ? true : signBase < 0 ? false : null };
}

function scenarioLabel(key) {
  if (key === "base") return "기본";
  if (key === "bull") return "상승";
  return "하락";
}

function scenarioTone(key) {
  if (key === "bull") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "bear") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function signalThumbnail(item, idx) {
  if (item?.thumbnail_url) return item.thumbnail_url;
  if (item?.image_url) return item.image_url;
  const seedBase = `${item?.id ?? "signal"}-${item?.title ?? idx}`
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const seed = seedBase || `signal-${idx}`;
  return `https://picsum.photos/seed/${seed}/960/540`;
}

function toNumericValue(value) {
  if (value == null) return null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function macroComment(overview, scenarios) {
  if (!overview || !scenarios) return "매크로 지표를 불러오는 중입니다.";
  const indicators = overview.indicators ?? [];
  const byCode = (code) => indicators.find((x) => x.code === code);
  const vix = byCode("VIX");
  const tga = byCode("TGA");
  const ust10y = byCode("UST10Y");
  const cpi = byCode("CPI");
  const pce = byCode("PCE");
  const wti = byCode("WTI");
  const gold = byCode("GOLD");
  const gdp = byCode("GDP");

  const baseProb = Math.round((scenarios.base?.probability ?? 0) * 100);
  const bullProb = Math.round((scenarios.bull?.probability ?? 0) * 100);
  const bearProb = Math.round((scenarios.bear?.probability ?? 0) * 100);
  const dominant = [
    { key: "base", prob: baseProb, label: "기본" },
    { key: "bull", prob: bullProb, label: "상승" },
    { key: "bear", prob: bearProb, label: "하락" },
  ].sort((a, b) => b.prob - a.prob)[0];

  const vixNum = toNumericValue(vix?.value);
  const cpiNum = toNumericValue(cpi?.value);
  const ust10yNum = toNumericValue(ust10y?.value);

  const riskTone =
    vixNum == null ? "변동성 평가는 보수적으로 보세요." :
    vixNum < 16 ? "변동성은 낮은 편이라 위험자산 선호에 우호적입니다." :
    vixNum <= 22 ? "변동성은 중립 구간으로, 종목별 차별화가 크게 나타날 수 있습니다." :
    "변동성이 높은 구간이라 지수 추격보다는 분할 접근이 유리합니다.";

  const inflationTone =
    cpiNum == null ? "물가 판단은 CPI/PCE 추이를 함께 확인해야 합니다." :
    cpiNum <= 2.5 ? "물가 둔화 신호가 비교적 양호해 금리 부담 완화 기대를 만들 수 있습니다." :
    cpiNum <= 3.5 ? "물가는 둔화 중이지만 아직 정책 완화 기대를 크게 키우기엔 애매한 구간입니다." :
    "물가 부담이 남아 있어 금리 경로 불확실성이 재확대될 수 있습니다.";

  const rateTone =
    ust10yNum == null ? "금리 레벨은 장기채(10년물) 흐름을 계속 확인해야 합니다." :
    ust10yNum >= 4.5 ? "장기금리 레벨이 높아 성장주 밸류에이션에는 부담 요인입니다." :
    ust10yNum >= 4.0 ? "장기금리는 아직 높은 편이어서 실적 확인이 동반되는 종목이 유리합니다." :
    "장기금리 부담은 상대적으로 완화되어 멀티플 확장 여지가 있습니다.";

  return `현재 시나리오 확률은 기본 ${baseProb}%, 상승 ${bullProb}%, 하락 ${bearProb}%이며, ${dominant.label} 시나리오(${dominant.prob}%)가 우세합니다. 근거로는 VIX ${vix?.value ?? "-"}(${vix?.note ?? "-"})와 TGA ${tga?.value ?? "-"}(${tga?.note ?? "-"})가 단기 유동성/리스크 선호를 보여주고, 미 10년물 ${ust10y?.value ?? "-"}(${ust10y?.note ?? "-"})가 할인율 부담을 결정합니다. 물가 측면에서는 CPI ${cpi?.value ?? "-"} / PCE ${pce?.value ?? "-"} 흐름이 핵심이며, ${inflationTone} ${riskTone} ${rateTone} 보조 지표로는 유가(WTI ${wti?.value ?? "-"})와 금(GOLD ${gold?.value ?? "-"})의 방향성, 성장 체감은 GDP ${gdp?.value ?? "-"}(${gdp?.note ?? "-"})를 같이 보면 해석이 쉬워집니다.`;
}

export default function App() {
  const [activeSection, setActiveSection] = useState("stock");
  const [market, setMarket] = useState("KR");
  const [query, setQuery] = useState(DEFAULT_QUERY_BY_MARKET.KR);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [macroOverview, setMacroOverview] = useState(null);
  const [macroScenarios, setMacroScenarios] = useState(null);
  const [newsItems, setNewsItems] = useState([]);
  const [error, setError] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);

  const stockRef = useRef(null);
  const macroRef = useRef(null);
  const signalRef = useRef(null);
  const searchRef = useRef(null);
  const errorTimerRef = useRef(null);
  const errorCleanupRef = useRef(null);

  const meta = MARKET_META[market];
  const price = useMemo(
    () => formatQuoteView(analysis?.latest_quote, selectedStock?.market ?? market),
    [analysis, selectedStock, market]
  );
  const debtMetric = analysis?.industry_comparison?.metrics?.find((x) => x.name.toLowerCase().includes("debt"));
  const marginMetric = analysis?.industry_comparison?.metrics?.find((x) => x.name.toLowerCase().includes("margin"));
  const profitScore = Math.max(20, Math.min(95, parsePercent(marginMetric?.company) * 5));
  const debtScore = Math.max(20, Math.min(95, 100 - parsePercent(debtMetric?.company)));

  function clearErrorTimers() {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (errorCleanupRef.current) {
      clearTimeout(errorCleanupRef.current);
      errorCleanupRef.current = null;
    }
  }

  function clearError() {
    clearErrorTimers();
    setError("");
    setErrorVisible(false);
  }

  function hideErrorWithFade() {
    setErrorVisible(false);
    errorCleanupRef.current = setTimeout(() => {
      setError("");
      errorCleanupRef.current = null;
    }, 220);
  }

  function showError(message, autoHideMs = 0) {
    clearErrorTimers();
    setError(message);
    setErrorVisible(true);
    if (autoHideMs > 0) {
      errorTimerRef.current = setTimeout(() => {
        hideErrorWithFade();
        errorTimerRef.current = null;
      }, autoHideMs);
    }
  }

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const top = entries.filter((x) => x.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!top) return;
      if (top.target === stockRef.current) setActiveSection("stock");
      if (top.target === macroRef.current) setActiveSection("macro");
      if (top.target === signalRef.current) setActiveSection("signal");
    }, { threshold: [0.25, 0.45], rootMargin: "-35% 0px -40% 0px" });
    [stockRef.current, macroRef.current, signalRef.current].filter(Boolean).forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom <= 12) {
        setActiveSection("signal");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fn = (e) => searchRef.current && !searchRef.current.contains(e.target) && setShowSuggestions(false);
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [overviewRes, scenarioRes, newsRes] = await Promise.all([
          apiGet("/api/macro/overview"),
          apiGet("/api/macro/scenarios"),
          apiGet("/api/news/feed?limit=6"),
        ]);
        setMacroOverview(overviewRes.data);
        setMacroScenarios(scenarioRes.data);
        setNewsItems(newsRes.data);
        await runSearch(DEFAULT_QUERY_BY_MARKET.KR, "KR", true);
      } catch {
        showError("초기 데이터를 불러오지 못했습니다.");
      }
    })();
  }, []);

  useEffect(() => () => clearErrorTimers(), []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return void setSuggestions([]);
    const t = setTimeout(async () => {
      try {
        const res = await apiGet(`/api/stocks/search?q=${encodeURIComponent(q)}&market=${market}`);
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, market]);

  async function runSearch(input = query, targetMarket = market, autoSelect = true) {
    const q = input.trim();
    if (!q) {
      showError("검색어를 입력해 주세요.");
      return;
    }
    clearError();
    try {
      const res = await apiGet(`/api/stocks/search?q=${encodeURIComponent(q)}&market=${targetMarket}`);
      setSearchResults(res.data);
      if (!res.data.length) {
        showError("검색 결과가 없습니다.", 1800);
      }
      const normalizedQuery = q.replace(/\s+/g, "").toLowerCase();
      const preferred =
        res.data.find((item) => (
          [item.symbol, item.name, item.name_en]
            .filter(Boolean)
            .map((v) => v.replace(/\s+/g, "").toLowerCase())
            .includes(normalizedQuery)
        )) ?? res.data[0];
      if (autoSelect && preferred) await loadAnalysis(preferred.market, preferred.symbol);
    } catch {
      showError("종목 검색에 실패했습니다.");
    } finally {
      setShowSuggestions(false);
    }
  }

  async function loadAnalysis(nextMarket, symbol) {
    try {
      const res = await apiGet(`/api/stocks/${encodeURIComponent(symbol)}/analysis?market=${nextMarket}`);
      setSelectedStock(res.data.stock);
      setAnalysis(res.data.analysis);
      setAnalysisMeta(res.meta);
      setMarket(nextMarket);
      setQuery(res.data.stock.name);
      clearError();
    } catch {
      showError("종목 분석 데이터를 불러오지 못했습니다.");
    }
  }

  async function switchMarket(nextMarket) {
    if (nextMarket === market) return;
    const defaultQuery = DEFAULT_QUERY_BY_MARKET[nextMarket];
    setMarket(nextMarket);
    setQuery(defaultQuery);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchResults([]);
    setSelectedStock(null);
    setAnalysis(null);
    setAnalysisMeta(null);
    clearError();
    await runSearch(defaultQuery, nextMarket, true);
  }

  function jump(id) {
    setActiveSection(id);
    const map = { stock: stockRef.current, macro: macroRef.current, signal: signalRef.current };
    map[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onGoogleLogin() {
    try {
      await apiPost("/api/auth/google/login");
      window.alert("Google OAuth 연동은 아직 준비 중입니다.");
    } catch {
      window.alert("로그인 요청에 실패했습니다.");
    }
  }

  return (
    <div className="relative flex min-h-screen bg-background-light text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-slate-200 bg-white p-6 md:flex">
        <Link
          to="/"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              e.preventDefault();
              jump("stock");
            }
          }}
          className="mb-10 flex items-center gap-3 px-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
            <span className="material-symbols-outlined fill-1">trending_up</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">SSAFY Stock</h1>
            <p className="text-xs text-slate-500">AI 투자 대시보드</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.sectionId}`} onClick={(e) => { e.preventDefault(); jump(item.id); }}
              className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold ${activeSection === item.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50"}`}>
              <span className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 pb-24 md:ml-72 md:pb-12">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-md md:px-6">
          <div className="relative mx-auto flex w-full items-center justify-center">
            <div ref={searchRef} className="relative w-full max-w-3xl">
              <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <span className={`inline-flex w-12 justify-center rounded-full px-2 py-1 text-xs font-bold ${meta.chip}`}>
                  {meta.shortLabel}
                </span>
                <span className="material-symbols-outlined text-slate-400">search</span>
              </div>
              <input
                className={`w-full rounded-full border-none bg-slate-100 py-4 pl-32 pr-28 text-base font-medium text-slate-800 placeholder:text-slate-500 focus:ring-2 ${market === "KR" ? "focus:ring-blue-200" : "focus:ring-emerald-200"}`}
                value={query} placeholder={meta.placeholder} onFocus={() => setShowSuggestions(true)}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); suggestions[0] ? loadAnalysis(suggestions[0].market, suggestions[0].symbol) : runSearch(query, market); } }} />
              <button type="button" onClick={() => runSearch(query, market)} className={`absolute right-2 top-2 rounded-full px-5 py-2.5 text-sm font-bold text-white ${meta.button}`}>검색</button>

              {showSuggestions && (
                <div className="absolute z-50 mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">자동완성 {suggestions.length}개</div>
                  <div className="max-h-72 overflow-y-auto">
                    {suggestions.length ? suggestions.map((s) => (
                      <button key={`${s.market}-${s.symbol}`} type="button" onClick={() => loadAnalysis(s.market, s.symbol)}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
                        <div><p className="text-sm font-semibold">{s.name}</p><p className="text-xs text-slate-500">{s.symbol} / {s.name_en}</p></div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${s.market === "KR" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{s.market}</span>
                      </button>
                    )) : <div className="px-4 py-3 text-sm text-slate-500">예: 삼성전자, 삼성생명, NVIDIA, AAPL</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="absolute right-0 hidden items-center gap-3 lg:flex">
              <button type="button" onClick={onGoogleLogin} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Google 로그인</button>
              <div className="h-10 w-10 rounded-full bg-slate-200" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-8 p-6">
          {error && (
            <div
              className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 transition-all duration-200 ${
                errorVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
            >
              {error}
            </div>
          )}

          <section ref={stockRef} id="section-stock" className="section-anchor">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">주식 분석</h2>
              {selectedStock && <div className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-slate-200">선택 종목: <span className="font-bold text-primary">{selectedStock.name}</span> ({selectedStock.symbol})</div>}
              <div className="flex rounded-full bg-slate-100 p-1">
                {["KR", "US"].map((m) => (
                  <button key={m} type="button" onClick={() => { void switchMarket(m); }}
                    className={`rounded-full px-6 py-2 text-sm ${market === m ? (m === "KR" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white") : "text-slate-500"}`}>
                    {m === "KR" ? "국내 주식" : "미국 주식"}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border border-slate-100 bg-white p-8 shadow-sm ring-2 ${meta.ring}`}>
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => runSearch(query, market)} className={`rounded-full px-4 py-2 text-xs font-bold text-white ${meta.button}`}>{meta.label} 검색</button>
                <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto">
                  {searchResults.map((s) => (
                    <button key={`${s.market}-${s.symbol}`} type="button" onClick={() => loadAnalysis(s.market, s.symbol)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${selectedStock?.symbol === s.symbol ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {s.symbol} / {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${meta.chip}`}>{selectedStock?.market ?? market}</span>
                      <h3 className="text-2xl font-extrabold">{selectedStock?.name ?? "종목을 선택하세요"}</h3>
                      <span className="text-sm text-slate-400">{selectedStock?.symbol ?? "-"}</span>
                    </div>
                    <p className="text-3xl font-black">
                      {price?.price ?? "-"}{" "}
                      <span
                        className={`text-sm ${
                          price?.up == null ? "text-slate-400" : price.up ? "text-red-500" : "text-blue-500"
                        }`}
                      >
                        {price?.delta ?? ""}
                      </span>
                    </p>
                  </div>
                  <button type="button" className="rounded-full bg-primary px-8 py-3 font-bold text-white">관심 종목 추가</button>
                </div>
              </div>

              {analysis ? (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">수익성 수준</p><p className="text-lg font-bold">{profitScore > 70 ? "매우 양호" : "보통"}</p><div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full bg-primary" style={{ width: `${profitScore}%` }} /></div></div>
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">부채 부담</p><p className="text-lg font-bold">{debtScore > 70 ? "낮은 편" : "점검 필요"}</p><div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${debtScore}%` }} /></div></div>
                    </div>
                    <div className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-medium">동종 업종 평균 대비 코멘트</p><p className="mt-1 text-sm text-slate-600">{analysis.industry_comparison.comment}</p></div>
                    <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">{analysis.plain_summary}</p>
                    <p className="text-xs text-slate-400">업데이트: {analysisMeta?.as_of ? formatDate(analysisMeta.as_of) : "-"} / 신뢰도: {analysisMeta?.confidence ? `${Math.round(analysisMeta.confidence * 100)}%` : "-"}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-6">
                    <h4 className="mb-3 text-sm font-bold text-primary">AI 분석</h4>
                    <div className="space-y-2">{analysis.pros.map((x) => <p key={`p-${x}`} className="text-sm font-semibold text-slate-700">+ {x}</p>)}</div>
                    <div className="mt-4 space-y-2">{analysis.cons.map((x) => <p key={`c-${x}`} className="text-sm font-semibold text-slate-600">- {x}</p>)}</div>
                    <div className="mt-4 flex flex-wrap gap-2">{analysis.moat.map((x) => <span key={x} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{x}</span>)}</div>
                  </div>
                </div>
              ) : <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">분석할 종목을 선택해 주세요.</div>}
            </div>
          </section>

          <section ref={macroRef} id="section-macro" className="section-anchor">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/60 p-6 shadow-sm md:p-8">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">매크로</h2>
                  <p className="mt-1 text-sm text-slate-500">핵심 지표와 시나리오 확률을 한눈에 확인하세요.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">
                  최근 업데이트: {macroOverview?.as_of ? formatDate(macroOverview.as_of) : "-"}
                </span>
              </div>

              <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {(macroOverview?.indicators ?? []).slice(0, 5).map((item) => (
                  <article key={item.code} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">{item.value}</p>
                    <p className={`mt-2 text-sm font-semibold ${item.trend === "up" ? "text-rose-600" : item.trend === "down" ? "text-emerald-600" : "text-slate-500"}`}>{item.note}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                <article className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">AI 매크로 코멘트</p>
                  <p className="text-[15px] leading-7 text-slate-700">{macroComment(macroOverview, macroScenarios)}</p>
                </article>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {Object.entries(macroScenarios ?? {}).map(([k, v]) => (
                      <article key={k} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${scenarioTone(k)}`}>{scenarioLabel(k)}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{v.summary}</p>
                        <p className="mt-3 text-lg font-extrabold text-slate-900">{Math.round(v.probability * 100)}%</p>
                      </article>
                    ))}
                  </div>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">지정학 리스크</p>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {(macroOverview?.geopolitical ?? []).map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section ref={signalRef} id="section-signal" className="section-anchor">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold">투자 시그널</h2></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {newsItems.map((item, idx) => (
                <Link key={item.id} to={`/news/${item.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={signalThumbnail(item, idx)}
                      alt={`${item.title} 썸네일`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="mb-2 flex justify-between">
                      <span className="text-xs text-slate-400">{idx === 0 ? "방금 전" : `${idx * 15}분 전`}</span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{idx === 0 ? "속보" : "매크로"}</span>
                    </div>
                    <h4 className="mb-2 text-lg font-bold">{item.title}</h4>
                    <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
                  </div>
                  <div className="border-t border-primary/10 bg-primary/5 px-6 py-4">
                    <p className="mb-2 text-xs font-medium text-slate-700">
                      {localizeKeywordList(item.derived_keywords).join(", ") || "키워드 없음"}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      상세 보기 <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-lg md:hidden">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" onClick={() => jump(item.id)} className={`flex flex-col items-center gap-1 ${activeSection === item.id ? "text-primary" : "text-slate-400"}`}>
            <span className={`material-symbols-outlined ${activeSection === item.id ? "fill-1" : ""}`}>{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}


