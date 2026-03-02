import { useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const THEMES = [
  {
    id: "ai-chip", name: "AI 반도체", type: "primary",
    return6m: "+42.3%", momentum: 87, color: "#6366f1", tag: "현재 급등", market: "US",
    x: 205, y: 215, r: 64, from: null,
    summary: "AI 모델 경쟁으로 GPU·HBM 수요 폭발",
    detail: "ChatGPT, Gemini 등 LLM 경쟁으로 데이터센터용 GPU 수요 급증. NVIDIA H100/H200 대기 수개월 지속. 하이퍼스케일러 자본지출 사상 최대 기록.",
    companies: [
      { name: "NVIDIA",   symbol: "NVDA", marketCap: "$2.85T", return6m: "+68.2%", per: 45.2, pbr: 28.1, roe: 62.4, margin: 55.1 },
      { name: "TSMC",     symbol: "TSM",  marketCap: "$680B",  return6m: "+35.4%", per: 28.3, pbr:  8.2, roe: 29.1, margin: 42.6 },
      { name: "Broadcom", symbol: "AVGO", marketCap: "$570B",  return6m: "+29.7%", per: 35.8, pbr: 12.4, roe: 34.7, margin: 38.2 },
      { name: "AMD",      symbol: "AMD",  marketCap: "$185B",  return6m: "+41.3%", per: 52.1, pbr:  4.8, roe:  9.2, margin:  8.3 },
    ],
    industryAvg: { per: 40.4, pbr: 13.4, roe: 33.9, margin: 36.1 },
    news: [
      { id: 1, title: "NVIDIA H200 출하 10만장 돌파 — 데이터센터 수요 '사상 최대'", source: "Bloomberg", time: "2시간 전", impact: "pos", body: "NVIDIA 최신 AI 가속기 H200가 출하 시작 6개월 만에 누적 10만장을 돌파했다. 마이크로소프트·구글·아마존 등 하이퍼스케일러의 대규모 발주가 이어지고 있다." },
      { id: 2, title: "美 반도체 수출 규제 추가 강화 — AI칩 대중 수출 타격 불가피", source: "Reuters",    time: "5시간 전", impact: "neg", body: "미국 상무부가 AI 칩 대중 수출 규제를 추가 강화한다고 발표했다. NVIDIA의 중국 특화 제품도 규제 대상에 포함될 가능성이 높다." },
      { id: 3, title: "블랙웰 GPU 수율 개선 완료 — 출하량 전망치 상향 조정",          source: "WSJ",       time: "1일 전",   impact: "pos", body: "TSMC의 NVIDIA 블랙웰 GPU 수율이 당초 우려보다 빠르게 개선됐다. 수율은 현재 60% 이상을 기록 중인 것으로 알려졌다." },
    ],
  },
  {
    id: "defense", name: "방산", type: "primary",
    return6m: "+31.8%", momentum: 74, color: "#f59e0b", tag: "현재 급등", market: "KR",
    x: 165, y: 425, r: 52, from: null,
    summary: "NATO 국방비 증가, 우크라이나 장기화로 수요 급증",
    detail: "NATO 회원국 GDP 2% 국방비 목표 재확인. 우크라이나 전쟁 장기화로 탄약·무기체계 교체 수요 급증. K방산 수출 다변화 가속.",
    companies: [
      { name: "한화에어로스페이스", symbol: "012450", marketCap: "22조",   return6m: "+52.1%", per: 28.4, pbr: 3.2, roe: 11.3, margin: 8.7 },
      { name: "LIG넥스원",         symbol: "079550", marketCap: "4.2조",  return6m: "+44.3%", per: 35.2, pbr: 4.1, roe: 11.7, margin: 7.4 },
      { name: "현대로템",           symbol: "064350", marketCap: "5.1조",  return6m: "+38.5%", per: 21.8, pbr: 2.9, roe: 13.2, margin: 9.1 },
      { name: "한국항공우주",       symbol: "047810", marketCap: "3.8조",  return6m: "+29.2%", per: 31.5, pbr: 3.7, roe: 11.8, margin: 6.9 },
    ],
    industryAvg: { per: 29.2, pbr: 3.5, roe: 12.0, margin: 8.0 },
    news: [
      { id: 1, title: "폴란드 K2 전차 2차 계약 체결 — 1,000대 규모",           source: "연합뉴스", time: "1시간 전", impact: "pos", body: "한국과 폴란드가 K2 전차 1,000대 추가 도입 계약을 체결했다. 역대 최대 규모의 K방산 수출로 기록될 전망이다." },
      { id: 2, title: "NATO 국방비 의무 GDP 3% 상향 검토",                    source: "Reuters",   time: "3시간 전", impact: "pos", body: "NATO가 국방비 지출 의무를 GDP 2%에서 3%로 상향하는 방안을 검토 중이다. 방산 수요의 구조적 증가가 예상된다." },
      { id: 3, title: "방산 수출 규제 강화 우려 — 이란·러 연계국 거래 제한 확대", source: "FT",        time: "2일 전",   impact: "neg", body: "미국이 이란·러시아 연계 국가에 대한 방산 수출 규제를 강화한다. 일부 K방산 기업의 중동 수출에 영향을 줄 수 있다." },
    ],
  },
  {
    id: "battery", name: "2차전지", type: "primary",
    return6m: "+24.1%", momentum: 62, color: "#10b981", tag: "현재 급등", market: "KR",
    x: 192, y: 615, r: 47, from: null,
    summary: "EV 보조금 확대, 전기차 시장 회복 기대 선반영",
    detail: "미국 IRA 보조금 확대, 유럽 EV 전환 의무화 재확인. 중국발 공급 과잉 해소 조짐. 전고체 배터리 기술 상용화 기대.",
    companies: [
      { name: "LG에너지솔루션", symbol: "373220", marketCap: "62조", return6m: "+33.4%", per: 42.1, pbr: 2.8, roe: 6.7, margin: 4.2 },
      { name: "삼성SDI",       symbol: "006400", marketCap: "28조", return6m: "+28.1%", per: 35.8, pbr: 1.9, roe: 5.3, margin: 5.8 },
      { name: "POSCO홀딩스",  symbol: "005490", marketCap: "18조", return6m: "+19.4%", per: 18.4, pbr: 0.5, roe: 2.7, margin: 3.1 },
      { name: "에코프로비엠",  symbol: "247540", marketCap: "8조",  return6m: "+22.3%", per: 45.2, pbr: 4.1, roe: 9.1, margin: 5.4 },
    ],
    industryAvg: { per: 35.4, pbr: 2.3, roe: 6.0, margin: 4.6 },
    news: [
      { id: 1, title: "미국 IRA 배터리 보조금 범위 확대 — 국내 기업 수혜 확대",    source: "Bloomberg", time: "30분 전",  impact: "pos", body: "IRA 하에서 배터리 보조금 지급 범위가 확대됐다. 한국 배터리 기업들의 수혜 폭이 당초 예상보다 커질 전망이다." },
      { id: 2, title: "중국 CATL 유럽 시장 가격 덤핑 재개 — 점유율 위협",          source: "Reuters",   time: "4시간 전", impact: "neg", body: "CATL이 유럽 시장에서 배터리 가격을 대폭 인하하며 한국 업체들의 시장 점유율을 위협하고 있다." },
      { id: 3, title: "삼성SDI 전고체 배터리 2027년 양산 로드맵 공식화",           source: "한국경제",  time: "1일 전",   impact: "pos", body: "삼성SDI가 전고체 배터리 2027년 양산 로드맵을 공식화하며 선행 투자를 대폭 확대한다고 밝혔다." },
    ],
  },
  {
    id: "datacenter", name: "데이터센터", type: "derived",
    return6m: "+18.7%", momentum: 45, color: "#8b5cf6", tag: "파생 수혜", market: "US",
    x: 545, y: 235, r: 40, from: "ai-chip",
    summary: "AI 연산 수요 급증으로 전력·인프라 수요 폭발",
    detail: "AI 워크로드 증가로 데이터센터 전력 수요 급증. 하이퍼스케일러 자본지출 사상 최대. 입지 부족으로 기존 사업자 협상력 상승.",
    companies: [
      { name: "Equinix",       symbol: "EQIX", marketCap: "$78B", return6m: "+27.3%", per: 82.4, pbr:  8.2, roe:  9.9, margin: 14.2 },
      { name: "Digital Realty",symbol: "DLR",  marketCap: "$45B", return6m: "+21.4%", per: 68.1, pbr:  2.8, roe:  4.1, margin: 18.3 },
      { name: "Iron Mountain", symbol: "IRM",  marketCap: "$32B", return6m: "+15.9%", per: 58.3, pbr: 15.1, roe: 25.8, margin: 21.4 },
    ],
    industryAvg: { per: 69.6, pbr: 8.7, roe: 13.3, margin: 18.0 },
    news: [
      { id: 1, title: "마이크로소프트 데이터센터 자본지출 $500억 초과 예상",  source: "Bloomberg", time: "1시간 전", impact: "pos", body: "마이크로소프트가 2025 회계연도 데이터센터 자본지출이 500억 달러를 초과할 것이라고 밝혔다." },
      { id: 2, title: "전력 부족 심화 — 데이터센터 입지 선점 경쟁 격화",     source: "WSJ",       time: "5시간 전", impact: "pos", body: "AI 데이터센터 전력 수요 급증으로 기존 입지 보유 사업자들의 협상력이 크게 높아지고 있다." },
      { id: 3, title: "데이터센터 전력 비용 급등 — 수익성 압박 우려",         source: "FT",        time: "2일 전",   impact: "neg", body: "전력 단가 상승으로 운영 비용이 급증하고 있다. 일부 분석가는 수익성 압박이 현실화될 것을 우려한다." },
    ],
  },
  {
    id: "ai-software", name: "AI 소프트웨어", type: "derived",
    return6m: "+14.2%", momentum: 38, color: "#a78bfa", tag: "파생 수혜", market: "US",
    x: 490, y: 108, r: 36, from: "ai-chip",
    summary: "AI 인프라 완성 후 소프트웨어 도입 가속화",
    detail: "AI 인프라 구축 완료 후 기업용 소프트웨어 도입이 빠르게 확산. B2B SaaS 기업들의 AI 기능 통합으로 고객 Lock-in 강화.",
    companies: [
      { name: "Palantir",    symbol: "PLTR", marketCap: "$38B",  return6m: "+22.1%", per: 75.4, pbr: 15.2, roe: 12.1, margin: 14.8 },
      { name: "Salesforce",  symbol: "CRM",  marketCap: "$280B", return6m: "+13.4%", per: 48.2, pbr:  5.1, roe: 10.5, margin: 18.4 },
      { name: "ServiceNow",  symbol: "NOW",  marketCap: "$195B", return6m: "+11.2%", per: 58.3, pbr: 15.8, roe: 27.1, margin: 23.2 },
    ],
    industryAvg: { per: 60.6, pbr: 12.0, roe: 16.6, margin: 18.8 },
    news: [
      { id: 1, title: "Salesforce AI 에이전트 도입 기업 수 1년 만에 10배",    source: "Bloomberg", time: "1시간 전", impact: "pos", body: "Salesforce의 AI 에이전트 플랫폼 'Agentforce' 도입 기업 수가 출시 1년 만에 10배를 넘어섰다." },
      { id: 2, title: "MS Copilot 요금 인상 — B2B SaaS 가격 경쟁 촉발",      source: "Reuters",   time: "3시간 전", impact: "neg", body: "마이크로소프트가 Copilot 구독 요금을 인상함에 따라 기업 AI 소프트웨어 시장의 가격 경쟁이 심화될 것으로 예상된다." },
      { id: 3, title: "Palantir, 美 국방부 AI 계약 7억 달러 규모 추가 수주", source: "WSJ",       time: "2일 전",   impact: "pos", body: "Palantir가 미국 국방부로부터 AI 기반 방산 분석 솔루션 계약을 추가 수주했다. 계약 규모는 7억 달러 이상으로 추산된다." },
    ],
  },
  {
    id: "defense-parts", name: "방산 부품사", type: "derived",
    return6m: "+12.4%", momentum: 33, color: "#f97316", tag: "파생 수혜", market: "KR",
    x: 472, y: 465, r: 33, from: "defense",
    summary: "대기업 수주 증가 → 부품 협력사 실적 연동",
    detail: "방산 대기업 수주 급증으로 협력사 부품 발주 증가. 납기 단축 압력으로 단가 협상력 개선. 선행 발주 트렌드 확산.",
    companies: [
      { name: "퍼스텍",   symbol: "090180", marketCap: "8,200억", return6m: "+19.2%", per: 18.2, pbr: 2.1, roe: 11.5, margin: 8.4 },
      { name: "빅텍",     symbol: "065450", marketCap: "4,100억", return6m: "+17.1%", per: 22.4, pbr: 2.8, roe: 12.5, margin: 7.8 },
      { name: "오르비텍", symbol: "080160", marketCap: "3,500억", return6m: "+14.8%", per: 16.8, pbr: 1.9, roe: 11.3, margin: 8.9 },
    ],
    industryAvg: { per: 19.1, pbr: 2.3, roe: 11.8, margin: 8.4 },
    news: [
      { id: 1, title: "한화에어로 협력사 부품 발주 3배 급증",          source: "한국경제",  time: "2시간 전", impact: "pos", body: "한화에어로스페이스가 주요 협력사 부품 발주량을 전년 대비 3배 이상 늘렸다. 방산 수출 확대에 따른 생산 확대가 주요 원인이다." },
      { id: 2, title: "소형 방산 부품사 설비 투자 확대 — 공급 한계",   source: "한국경제",  time: "6시간 전", impact: "pos", body: "방산 부품 수요가 공급 능력을 초과하면서 주요 부품사들이 설비 투자 확대에 나서고 있다." },
      { id: 3, title: "K방산 수출 중동·동남아 신시장 개척 가속",       source: "연합뉴스",  time: "1일 전",   impact: "pos", body: "K방산 수출 다변화가 속도를 내면서 부품 협력사들의 수주도 증가하고 있다." },
    ],
  },
  {
    id: "solid-battery", name: "전고체 배터리", type: "derived",
    return6m: "+7.2%", momentum: 21, color: "#34d399", tag: "파생 수혜", market: "KR",
    x: 495, y: 628, r: 25, from: "battery",
    summary: "차세대 배터리 기술 상용화 기대감 선반영",
    detail: "삼성SDI가 2027년 양산 로드맵을 공식화했으며 소재·부품 관련 기업들이 선행 수혜를 받고 있다.",
    companies: [
      { name: "삼성SDI",      symbol: "006400", marketCap: "28조",  return6m: "+28.1%", per: 35.8, pbr: 1.9, roe: 5.3, margin: 5.8 },
      { name: "일진머티리얼즈",symbol: "020120", marketCap: "2.1조", return6m: "+9.4%",  per: 28.4, pbr: 1.4, roe: 4.9, margin: 5.1 },
      { name: "포스코퓨처엠",  symbol: "003670", marketCap: "11조",  return6m: "+7.8%",  per: 42.1, pbr: 2.2, roe: 5.2, margin: 3.8 },
    ],
    industryAvg: { per: 35.4, pbr: 1.8, roe: 5.1, margin: 4.9 },
    news: [
      { id: 1, title: "삼성SDI 전고체 배터리 2027년 양산 공식 로드맵 발표",   source: "한국경제",  time: "1시간 전", impact: "pos", body: "삼성SDI가 전고체 배터리 2027년 양산 로드맵을 공식화했다. 소재 협력사들의 선행 발주도 시작된 것으로 알려졌다." },
      { id: 2, title: "전고체 핵심 소재 수요 급증 — 황화물계 공급 부족",      source: "Bloomberg", time: "4시간 전", impact: "pos", body: "전고체 배터리에 사용되는 황화물계 고체 전해질 수요가 급증하고 있다. 관련 소재 기업들의 수주가 빠르게 늘고 있다." },
      { id: 3, title: "중국 업체 전고체 기술 추격 — 기술 격차 축소 우려",    source: "Reuters",   time: "2일 전",   impact: "neg", body: "CATL·BYD 등 중국 업체들도 전고체 배터리 개발 속도를 높이고 있어 한국 기업의 기술 선도 기간이 예상보다 짧을 수 있다." },
    ],
  },
];

const ANALYST = {
  NVDA:   { buy: 82, hold: 14, sell: 4,  target: "$950" },
  TSM:    { buy: 76, hold: 20, sell: 4,  target: "$210" },
  AVGO:   { buy: 71, hold: 25, sell: 4,  target: "$1,800" },
  AMD:    { buy: 65, hold: 28, sell: 7,  target: "$185" },
  "012450": { buy: 74, hold: 20, sell: 6, target: "180,000원" },
  "079550": { buy: 68, hold: 24, sell: 8, target: "120,000원" },
  "373220": { buy: 61, hold: 30, sell: 9, target: "430,000원" },
  EQIX:   { buy: 70, hold: 24, sell: 6,  target: "$920" },
  _default: { buy: 55, hold: 35, sell: 10, target: "─" },
};

const EVENTS = {
  NVDA: [
    { type: "실적 발표", date: "2025-05-28", note: "Q1 FY26 어닝콜" },
    { type: "배당 지급", date: "2025-06-15", note: "$0.10/주" },
    { type: "컨퍼런스", date: "2025-06-03", note: "GTC AI Summit" },
  ],
  TSM: [
    { type: "실적 발표", date: "2025-04-17", note: "Q1 2025 실적" },
    { type: "투자자의 날", date: "2025-06-20", note: "Tech Symposium" },
  ],
  "012450": [
    { type: "실적 발표", date: "2025-05-14", note: "25년 1분기 실적" },
    { type: "수주 공시", date: "2025-05-20", note: "폴란드 2차 계약 공시" },
  ],
  _default: [
    { type: "실적 발표", date: "2025-05-15", note: "분기 실적 발표" },
    { type: "주주총회", date: "2025-06-10", note: "정기 주주총회" },
  ],
};

const METRIC_COLS = [
  { key: "per",    label: "PER",    unit: "x", tip: "낮을수록 저평가" },
  { key: "pbr",    label: "PBR",    unit: "x", tip: "낮을수록 저평가" },
  { key: "roe",    label: "ROE",    unit: "%", tip: "높을수록 우수" },
  { key: "margin", label: "영업이익률", unit: "%", tip: "높을수록 우수" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRAPH_EDGES = THEMES.filter((t) => t.from).map((t) => ({
  from: t.from, to: t.id, strength: t.momentum / 100,
}));

function getNode(id) { return THEMES.find((t) => t.id === id); }

function isGood(key, val, avg) {
  return key === "per" || key === "pbr" ? val < avg : val > avg;
}

function getMerit(company, avg) {
  const good = METRIC_COLS.filter((c) => isGood(c.key, company[c.key], avg[c.key])).length;
  if (good >= 3) return { label: "매력적", tone: "emerald" };
  if (good >= 2) return { label: "보통",   tone: "amber" };
  return          { label: "고평가", tone: "rose" };
}

const MERIT_CLS = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:   "bg-amber-50   text-amber-700   border-amber-200",
  rose:    "bg-rose-50    text-rose-500    border-rose-200",
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  const steps = ["테마 선택", "기업 분석", "기업 추적"];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 ${!active && !done ? "opacity-35" : ""}`}>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done || active ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-400"}`}>
                {done ? "✓" : n}
              </div>
              <span className={`hidden text-xs font-semibold sm:inline ${active ? "text-slate-900" : "text-slate-400"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-4 shrink-0 ${step > n ? "bg-slate-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Light Graph ──────────────────────────────────────────────────────

function GraphEdge({ edge, hovered, hoveredId }) {
  const src = getNode(edge.from);
  const tgt = getNode(edge.to);
  if (!src || !tgt) return null;

  const dx = tgt.x - src.x, dy = tgt.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist, ny = dy / dist;
  const sx = src.x + nx * src.r, sy = src.y + ny * src.r;
  const tx = tgt.x - nx * tgt.r, ty = tgt.y - ny * tgt.r;
  const cp1x = sx + (tx - sx) * 0.45, cp1y = sy + (ty - sy) * 0.05;
  const cp2x = sx + (tx - sx) * 0.55, cp2y = sy + (ty - sy) * 0.95;

  const active = hoveredId === edge.from || hoveredId === edge.to;

  return (
    <path
      d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`}
      fill="none" stroke={src.color}
      strokeWidth={active ? edge.strength * 3.5 : edge.strength * 1.8}
      strokeOpacity={active ? 0.6 : 0.28}
      style={{ transition: "stroke-width 0.2s, stroke-opacity 0.2s" }}
    />
  );
}

function GraphNode({ node, hovered, onHover, onClick }) {
  const isPrimary = node.type === "primary";
  const lines = node.name.split(/\s+/);
  const fs = isPrimary ? (node.r > 55 ? 13 : 11) : 10;
  const lh = fs + 3;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: "pointer" }}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      {isPrimary && (
        <circle fill={node.color}>
          <animate attributeName="r"       values={`${node.r};${node.r + 20};${node.r}`} dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.18;0;0.18"                          dur="3s" repeatCount="indefinite" />
        </circle>
      )}

      {hovered === node.id && (
        <circle r={node.r + 6} fill="none" stroke={node.color} strokeWidth={2} opacity={0.5} />
      )}

      <circle r={node.r + 3} fill={node.color} opacity={0.12} />
      <circle r={node.r} fill={node.color} opacity={isPrimary ? 0.92 : 0.78} />

      {lines.map((line, i) => (
        <text key={i} x={0} y={(i - (lines.length - 1) / 2) * lh}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={fs} fontWeight={isPrimary ? "700" : "600"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {line}
        </text>
      ))}

      {isPrimary && (
        <>
          <rect x={-24} y={node.r - 19} width={48} height={17} rx={8.5} fill="white" opacity={0.92} />
          <text x={0} y={node.r - 10} textAnchor="middle" dominantBaseline="middle"
            fill={node.color} fontSize={10} fontWeight="800"
            style={{ pointerEvents: "none" }}
          >
            {node.return6m}
          </text>
        </>
      )}

      {!isPrimary && (
        <text x={0} y={node.r + 14} textAnchor="middle" dominantBaseline="middle"
          fill={node.color} fontSize={9} fontWeight="700" opacity={0.85}
          style={{ pointerEvents: "none" }}
        >
          {node.return6m}
        </text>
      )}
    </g>
  );
}

function LightGraph({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const primary = THEMES.filter((t) => t.type === "primary");
  const derived  = THEMES.filter((t) => t.type === "derived");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Step 1 · 테마 선택</p>
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">어떤 테마가 뜨고 있나요?</h1>
        <p className="mt-3 text-slate-400">노드 크기 = 모멘텀 강도 · 연결선 = 밸류체인 관계 · 클릭하면 기업 분석으로 이동</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
        <svg viewBox="0 0 640 750" style={{ width: "100%", display: "block" }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1" fill="#e2e8f0" />
            </pattern>
          </defs>
          <rect width="640" height="750" fill="url(#dots)" />

          {GRAPH_EDGES.map((e) => (
            <GraphEdge key={`${e.from}__${e.to}`} edge={e} hoveredId={hovered} />
          ))}

          {derived.map((n) => (
            <GraphNode key={n.id} node={n} hovered={hovered} onHover={setHovered} onClick={onSelect} />
          ))}
          {primary.map((n) => (
            <GraphNode key={n.id} node={n} hovered={hovered} onHover={setHovered} onClick={onSelect} />
          ))}
        </svg>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20" /> 현재 급등 산업
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-300" /> 파생 수혜 예상
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-5 rounded-full bg-slate-300" /> 밸류체인 연결
        </span>
      </div>
    </div>
  );
}

// ─── Step 2: Company Analysis (List + Detail unified) ─────────────────────────

function MetricCell({ metricKey, value, avg }) {
  const good = isGood(metricKey, value, avg);
  return (
    <td className="whitespace-nowrap px-3 py-3.5 text-right text-sm font-semibold">
      <span className={`inline-flex items-center gap-0.5 ${good ? "text-emerald-600" : "text-rose-500"}`}>
        {value.toFixed(1)}<span className="text-[9px]">{good ? "▲" : "▼"}</span>
      </span>
    </td>
  );
}

function MetricBar({ col, companyValue, avgValue, shortName }) {
  const good = isGood(col.key, companyValue, avgValue);
  const maxVal = Math.max(companyValue, avgValue) * 1.35 || 1;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-1">
        <span className="text-xs font-semibold text-slate-600">{col.label}</span>
        <span className={`text-xs font-bold ${good ? "text-emerald-600" : "text-rose-500"}`}>
          {companyValue.toFixed(1)}{col.unit} {good ? "▲" : "▼"}
        </span>
      </div>
      <div className="space-y-1">
        {[{ label: shortName, value: companyValue, cls: good ? "bg-emerald-500" : "bg-rose-400" },
          { label: "산업 평균",    value: avgValue,     cls: "bg-blue-300" }].map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-[10px] text-slate-500 truncate">{row.label}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: 8 }}>
              <div className={`h-full rounded-full ${row.cls}`}
                style={{ width: `${Math.min((row.value / maxVal) * 100, 100)}%`, transition: "width .6s ease" }} />
            </div>
            <span className="w-10 shrink-0 text-[10px] text-slate-500">{row.value.toFixed(1)}{col.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyDetailPanel({ theme, company, onTrack }) {
  const merit = getMerit(company, theme.industryAvg);
  const goodCols = METRIC_COLS.filter((c) => isGood(c.key, company[c.key], theme.industryAvg[c.key]));
  const badCols  = METRIC_COLS.filter((c) => !isGood(c.key, company[c.key], theme.industryAvg[c.key]));
  const shortName = company.name.length > 6 ? company.symbol : company.name;

  return (
    <div className="flex h-full flex-col">
      {/* Company header */}
      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="mb-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {company.symbol} · {theme.market}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${MERIT_CLS[merit.tone]}`}>
                {merit.label}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900">{company.name}</h3>
            <p className="text-xs text-slate-400">시가총액 {company.marketCap}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">6개월</p>
            <p className="text-xl font-black text-emerald-600">{company.return6m}</p>
          </div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="mb-4 flex-1">
        {METRIC_COLS.map((col) => (
          <MetricBar key={col.key} col={col}
            companyValue={company[col.key]} avgValue={theme.industryAvg[col.key]}
            shortName={shortName}
          />
        ))}
      </div>

      {/* Investment thesis */}
      <div className="mb-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5">
        {goodCols.length > 0 && (
          <p><span className="font-bold text-emerald-500">+ </span>
            <span className="font-semibold">{goodCols.map((c) => c.label).join("·")}</span>
            {" "}산업 평균 상회 — 수익성 매력
          </p>
        )}
        {badCols.length > 0 && (
          <p><span className="font-bold text-rose-400">− </span>
            <span className="font-semibold">{badCols.map((c) => c.label).join("·")}</span>
            {" "}산업 평균 하회 — 리스크 요인
          </p>
        )}
      </div>

      {/* Track button */}
      <button
        type="button" onClick={onTrack}
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
        style={{ backgroundColor: theme.color }}
      >
        이 기업 추적하기 →
      </button>
    </div>
  );
}

function CompanyAnalysis({ theme, onTrack, onBack }) {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  function handleRowClick(company) {
    setSelectedCompany(company);
    setMobileShowDetail(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <button type="button" onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-900"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        테마 선택으로
      </button>

      {/* Theme header */}
      <div className="mb-6 rounded-2xl border p-5"
        style={{ backgroundColor: `${theme.color}08`, borderColor: `${theme.color}25` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: `${theme.color}18`, color: theme.color }}>
              {theme.market} · {theme.tag}
            </span>
            <h2 className="text-xl font-black text-slate-900">{theme.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{theme.detail}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">6개월 수익률</p>
            <p className="text-3xl font-black" style={{ color: theme.color }}>{theme.return6m}</p>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        Step 2 · 기업 분석
      </p>

      <div className="flex gap-5">
        {/* Company list */}
        <div className={`${mobileShowDetail ? "hidden lg:block" : "block"} min-w-0 flex-1`}>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-3 text-left   text-[11px] font-bold uppercase tracking-wide text-slate-400">기업</th>
                  <th className="px-3 py-3 text-right  text-[11px] font-bold uppercase tracking-wide text-slate-400">시가총액</th>
                  <th className="px-3 py-3 text-right  text-[11px] font-bold uppercase tracking-wide text-slate-400">6개월</th>
                  {METRIC_COLS.map((col) => (
                    <th key={col.key} title={col.tip}
                      className="cursor-help px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">평가</th>
                </tr>
                {/* Industry average */}
                <tr className="border-b-2 border-slate-200 bg-slate-100">
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-500">산업 평균</td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-400">─</td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-400">─</td>
                  {METRIC_COLS.map((col) => (
                    <td key={col.key} className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">
                      {theme.industryAvg[col.key].toFixed(1)}{col.unit}
                    </td>
                  ))}
                  <td />
                </tr>
              </thead>
              <tbody>
                {theme.companies.map((company) => {
                  const merit = getMerit(company, theme.industryAvg);
                  const isSelected = selectedCompany?.symbol === company.symbol;
                  return (
                    <tr key={company.symbol}
                      className={`group cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? "bg-slate-50 ring-1 ring-inset" : "hover:bg-slate-50"}`}
                      style={isSelected ? { ringColor: theme.color } : {}}
                      onClick={() => handleRowClick(company)}
                    >
                      <td className="px-3 py-3.5">
                        <p className="text-sm font-bold text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-400">{company.symbol}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right text-sm text-slate-600">{company.marketCap}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right text-sm font-bold text-emerald-600">{company.return6m}</td>
                      {METRIC_COLS.map((col) => (
                        <MetricCell key={col.key} metricKey={col.key}
                          value={company[col.key]} avg={theme.industryAvg[col.key]} />
                      ))}
                      <td className="px-3 py-3.5 text-center">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${MERIT_CLS[merit.tone]}`}>
                          {merit.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-xs text-slate-400">
            <span className="font-bold text-emerald-500">▲</span> 산업 평균 대비 우수 &nbsp;
            <span className="font-bold text-rose-400">▼</span> 산업 평균 하회 &nbsp;·&nbsp;
            PER·PBR 낮을수록, ROE·영업이익률 높을수록 우수
          </p>
        </div>

        {/* Detail panel */}
        {selectedCompany ? (
          <div className={`${mobileShowDetail ? "block" : "hidden lg:block"} w-full shrink-0 lg:w-72 xl:w-80`}>
            {mobileShowDetail && (
              <button type="button" onClick={() => setMobileShowDetail(false)}
                className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-900 lg:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                리스트로
              </button>
            )}
            <CompanyDetailPanel theme={theme} company={selectedCompany} onTrack={() => onTrack(selectedCompany)} />
          </div>
        ) : (
          <div className="hidden w-72 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center lg:flex">
            <div>
              <div className="mb-3 text-3xl opacity-20">←</div>
              <p className="text-sm text-slate-400">기업을 클릭하면<br />상세 분석을 볼 수 있어요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Company Tracking ─────────────────────────────────────────────────

function CompanyTracking({ theme, company, onBack }) {
  const analyst = ANALYST[company.symbol] || ANALYST._default;
  const events  = EVENTS[company.symbol]  || EVENTS._default;
  const news    = theme.news;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <button type="button" onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-900"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        기업 분석으로
      </button>

      {/* Company header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
              {company.symbol} · {theme.market}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: `${theme.color}18`, color: theme.color }}>
              {theme.name}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{company.name}</h2>
          <p className="mt-0.5 text-sm text-slate-400">시가총액 {company.marketCap}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">6개월 수익률</p>
            <p className="text-3xl font-black text-emerald-600">{company.return6m}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${theme.color}15` }}>
            <span className="text-xl" style={{ color: theme.color }}>★</span>
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Step 3 · 기업 추적</p>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* News feed */}
        <div className="flex-1">
          <p className="mb-3 text-sm font-bold text-slate-700">관련 뉴스</p>
          <div className="space-y-3">
            {news.map((item) => (
              <div key={item.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.impact === "pos" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {item.impact === "pos" ? "호재" : "악재"}
                    </span>
                    <span className="text-xs text-slate-400">{item.source}</span>
                  </div>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
                <p className="mb-1.5 text-sm font-bold text-slate-900 leading-5">{item.title}</p>
                <p className="text-xs leading-5 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="w-full shrink-0 space-y-5 lg:w-64">
          {/* Events */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">주요 일정</p>
            <div className="space-y-2.5">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                    style={{ backgroundColor: `${theme.color}18`, color: theme.color }}>
                    {ev.type === "실적 발표" ? "Q" : ev.type === "배당 지급" ? "D" : ev.type === "컨퍼런스" ? "C" : "E"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{ev.type}</p>
                    <p className="text-[10px] text-slate-400">{ev.date} · {ev.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyst sentiment */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">애널리스트 의견</p>
            <div className="mb-3 space-y-2">
              {[
                { label: "매수", pct: analyst.buy,  color: "#10b981" },
                { label: "보유", pct: analyst.hold, color: "#f59e0b" },
                { label: "매도", pct: analyst.sell, color: "#ef4444" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-8 text-right text-[10px] font-semibold text-slate-500">{row.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: 8 }}>
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color, transition: "width .6s ease" }} />
                  </div>
                  <span className="w-8 text-[10px] font-bold" style={{ color: row.color }}>{row.pct}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-[10px] text-slate-400">평균 목표주가</p>
              <p className="text-base font-black text-slate-900">{analyst.target}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  function handleThemeSelect(theme) {
    setSelectedTheme(theme);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleTrack(company) {
    setSelectedCompany(company);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (step === 3) { setStep(2); setSelectedCompany(null); }
    else if (step === 2) { setStep(1); setSelectedTheme(null); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10L5 7l3 2 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-bold">SSAFY Stock</span>
          </div>
          <StepIndicator step={step} />
        </div>
      </header>

      <main>
        {step === 1 && <LightGraph onSelect={handleThemeSelect} />}
        {step === 2 && selectedTheme && (
          <CompanyAnalysis theme={selectedTheme} onTrack={handleTrack} onBack={goBack} />
        )}
        {step === 3 && selectedTheme && selectedCompany && (
          <CompanyTracking theme={selectedTheme} company={selectedCompany} onBack={goBack} />
        )}
      </main>
    </div>
  );
}
