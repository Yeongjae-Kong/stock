const KEYWORD_KO_MAP = {
  fed: "미 연준",
  fomc: "FOMC",
  rates: "금리",
  rate: "금리",
  yield: "금리(수익률)",
  yields: "금리(수익률)",
  duration: "듀레이션",
  treasury: "미 국채",
  liquidity: "유동성",
  valuation: "밸류에이션",
  inflation: "인플레이션",
  disinflation: "디스인플레이션",
  cpi: "소비자물가(CPI)",
  pce: "개인소비지출물가(PCE)",
  oil: "유가",
  wti: "WTI 유가",
  brent: "브렌트유",
  energy: "에너지",
  gold: "금",
  dollar: "달러",
  usd: "미 달러",
  dxy: "달러 인덱스",
  growth: "경기성장",
  recession: "경기침체",
  softlanding: "연착륙",
  soft_landing: "연착륙",
  hardlanding: "경기 급랭",
  hard_landing: "경기 급랭",
  gdp: "GDP",
  jobs: "고용",
  employment: "고용",
  unemployment: "실업",
  geopolitics: "지정학",
  geopolitical: "지정학",
  war: "전쟁",
  conflict: "분쟁",
  tariff: "관세",
  sanction: "제재",
  china: "중국",
  trade: "무역",
  export: "수출",
  import: "수입",
  semiconductor: "반도체",
  semiconductors: "반도체",
  ai: "AI",
  chip: "반도체",
  chips: "반도체",
  earnings: "실적",
  guidance: "가이던스",
  margin: "마진",
  demand: "수요",
  supply: "공급",
  risk: "리스크",
  volatility: "변동성",
};

function normalizeKeywordKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

export function localizeKeyword(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const key = normalizeKeywordKey(raw);
  return KEYWORD_KO_MAP[key] ?? KEYWORD_KO_MAP[key.replace(/_/g, "")] ?? raw;
}

export function localizeKeywordList(list) {
  return (list ?? []).map(localizeKeyword).filter(Boolean);
}

export function marketLabelKo(market) {
  if (market === "KR") return "국내";
  if (market === "US") return "미국";
  return market ?? "-";
}

