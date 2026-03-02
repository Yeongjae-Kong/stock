import { useState } from "react";

const NODES = [
  {
    id: "ai-chip",
    label: "AI 반도체",
    type: "primary",
    momentum: 87,
    return6m: "+42.3%",
    x: 205,
    y: 195,
    r: 64,
    color: "#818cf8",
    topStocks: ["NVDA +68%", "AMD +41%", "TSMC +35%"],
    cause: "AI 모델 경쟁 심화로 GPU·HBM 수요 폭발적 증가. 데이터센터 투자 사이클 본격화.",
    leadLag: "AI 인프라 투자 완료 후 소프트웨어·응용 서비스 채택 가속화 예상. B2B SaaS 수요 연동.",
    market: "US",
  },
  {
    id: "defense",
    label: "방산",
    type: "primary",
    momentum: 74,
    return6m: "+31.8%",
    x: 165,
    y: 405,
    r: 52,
    color: "#fb923c",
    topStocks: ["한화에어 +52%", "LIG넥스원 +44%", "현대로템 +38%"],
    cause: "NATO 국방비 증가 공약, 우크라이나 전쟁 장기화로 무기 교체 수요 급증.",
    leadLag: "대기업 수주 증가 → 부품사·소재 협력업체 실적 연동 시차 발생 (보통 1~2분기).",
    market: "KR",
  },
  {
    id: "battery",
    label: "2차전지",
    type: "primary",
    momentum: 62,
    return6m: "+24.1%",
    x: 192,
    y: 590,
    r: 47,
    color: "#34d399",
    topStocks: ["LG에너지솔루션 +33%", "삼성SDI +28%", "POSCO홀딩스 +19%"],
    cause: "EV 보조금 정책 확대, 전기차 시장 회복 기대 선반영. 중국발 공급 과잉 해소 조짐.",
    leadLag: "배터리 성능 경쟁 → 전고체·충전 인프라 투자 2차 수혜. 소재·부품 선행 발주 예상.",
    market: "KR",
  },
  {
    id: "ai-software",
    label: "AI\n소프트웨어",
    type: "derived",
    momentum: 38,
    return6m: "+14.2%",
    x: 490,
    y: 100,
    r: 36,
    color: "#a5b4fc",
    topStocks: ["Palantir +22%", "C3.ai +18%", "UiPath +14%"],
    cause: "AI 인프라 구축 완료 후 소프트웨어 도입 단계로 이행 예상. 기업 자동화 수요 증가.",
    leadLag: null,
    market: "US",
  },
  {
    id: "datacenter",
    label: "데이터센터",
    type: "derived",
    momentum: 45,
    return6m: "+18.7%",
    x: 540,
    y: 225,
    r: 40,
    color: "#c4b5fd",
    topStocks: ["Equinix +27%", "Digital Realty +21%", "Iron Mtn +16%"],
    cause: "AI 연산 수요 급증으로 데이터센터 전력·공간 부족 심화. 하이퍼스케일러 투자 확대.",
    leadLag: null,
    market: "US",
  },
  {
    id: "ai-application",
    label: "AI\n응용서비스",
    type: "derived",
    momentum: 29,
    return6m: "+9.8%",
    x: 502,
    y: 345,
    r: 30,
    color: "#ddd6fe",
    topStocks: ["Salesforce +13%", "ServiceNow +11%", "Workday +9%"],
    cause: "기업용 AI 도입 본격화, B2B SaaS 전환 가속화. 생산성 개선 ROI 가시화.",
    leadLag: null,
    market: "US",
  },
  {
    id: "defense-parts",
    label: "방산\n부품사",
    type: "derived",
    momentum: 33,
    return6m: "+12.4%",
    x: 478,
    y: 445,
    r: 33,
    color: "#fde68a",
    topStocks: ["퍼스텍 +19%", "빅텍 +17%", "오르비텍 +15%"],
    cause: "방산 대기업 대규모 수주 → 협력업체 부품 발주 급증. 납기 단축 압력으로 단가 개선.",
    leadLag: null,
    market: "KR",
  },
  {
    id: "solid-battery",
    label: "전고체\n배터리",
    type: "derived",
    momentum: 21,
    return6m: "+7.2%",
    x: 500,
    y: 562,
    r: 28,
    color: "#6ee7b7",
    topStocks: ["삼성SDI", "솔리드에너지", "QuantumScape"],
    cause: "차세대 배터리 기술 상용화 기대감 선반영 구간 진입. 2027년 양산 로드맵 가시화.",
    leadLag: null,
    market: "KR",
  },
  {
    id: "ev-infra",
    label: "EV 충전\n인프라",
    type: "derived",
    momentum: 18,
    return6m: "+5.9%",
    x: 474,
    y: 660,
    r: 24,
    color: "#a7f3d0",
    topStocks: ["에코프로 +9%", "SK이노베이션 +7%", "ChargePoint +6%"],
    cause: "EV 보급 확대에 따른 충전 인프라 투자 수혜 예상. 공공 충전기 의무화 정책 연동.",
    leadLag: null,
    market: "KR",
  },
];

const EDGES = [
  { from: "ai-chip", to: "ai-software", strength: 0.85 },
  { from: "ai-chip", to: "datacenter", strength: 0.9 },
  { from: "ai-chip", to: "ai-application", strength: 0.65 },
  { from: "defense", to: "defense-parts", strength: 0.8 },
  { from: "battery", to: "solid-battery", strength: 0.7 },
  { from: "battery", to: "ev-infra", strength: 0.6 },
];

function getNode(id) {
  return NODES.find((n) => n.id === id);
}

function EdgePath({ edge, hovered, selectedId }) {
  const src = getNode(edge.from);
  const tgt = getNode(edge.to);
  if (!src || !tgt) return null;

  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;
  const ny = dy / dist;

  const sx = src.x + nx * src.r;
  const sy = src.y + ny * src.r;
  const tx = tgt.x - nx * tgt.r;
  const ty = tgt.y - ny * tgt.r;

  const cp1x = sx + (tx - sx) * 0.45;
  const cp1y = sy + (ty - sy) * 0.05;
  const cp2x = sx + (tx - sx) * 0.55;
  const cp2y = sy + (ty - sy) * 0.95;

  const active =
    hovered === edge.from ||
    hovered === edge.to ||
    selectedId === edge.from ||
    selectedId === edge.to;

  return (
    <path
      d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`}
      fill="none"
      stroke={src.color}
      strokeWidth={active ? edge.strength * 3 : edge.strength * 1.5}
      strokeOpacity={active ? 0.65 : 0.18}
      style={{ transition: "stroke-width 0.2s ease, stroke-opacity 0.2s ease" }}
    />
  );
}

function NodeShape({ node, isHovered, isSelected, onClick, onMouseEnter, onMouseLeave }) {
  const isPrimary = node.type === "primary";
  const lines = node.label.split("\n");
  const fs = isPrimary ? (node.r > 55 ? 13 : 11) : 10;
  const lh = fs + 3;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Pulse ring — primary nodes only */}
      {isPrimary && (
        <circle fill={node.color}>
          <animate
            attributeName="r"
            values={`${node.r};${node.r + 22};${node.r}`}
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.22;0;0.22"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle r={node.r + 7} fill="none" stroke="white" strokeWidth={2.5} opacity={0.85} />
      )}

      {/* Hover ring */}
      {isHovered && !isSelected && (
        <circle r={node.r + 5} fill="none" stroke={node.color} strokeWidth={1.5} opacity={0.55} />
      )}

      {/* Glow halo */}
      <circle r={node.r + 3} fill={node.color} opacity={0.15} />

      {/* Main circle */}
      <circle
        r={node.r}
        fill={node.color}
        opacity={isSelected ? 1 : isHovered ? 0.95 : isPrimary ? 0.88 : 0.72}
        style={{ transition: "opacity 0.15s ease" }}
      />

      {/* Label */}
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={(i - (lines.length - 1) / 2) * lh}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={fs}
          fontWeight={isPrimary ? "700" : "600"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {line}
        </text>
      ))}

      {/* Return badge — primary, inside bottom of circle */}
      {isPrimary && (
        <>
          <rect x={-24} y={node.r - 19} width={48} height={17} rx={8.5} fill="white" opacity={0.92} />
          <text
            x={0}
            y={node.r - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={node.color}
            fontSize={10}
            fontWeight="800"
            style={{ pointerEvents: "none" }}
          >
            {node.return6m}
          </text>
        </>
      )}

      {/* Return label — derived, below circle */}
      {!isPrimary && (
        <text
          x={0}
          y={node.r + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={node.color}
          fontSize={9}
          fontWeight="700"
          opacity={0.85}
          style={{ pointerEvents: "none" }}
        >
          {node.return6m}
        </text>
      )}
    </g>
  );
}

export default function ThemeGraph() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  function handleClick(node) {
    setSelected((prev) => (prev?.id === node.id ? null : node));
  }

  const primaryNodes = NODES.filter((n) => n.type === "primary");
  const derivedNodes = NODES.filter((n) => n.type === "derived");

  return (
    <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 shadow-xl md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">테마 추천</h2>
          <p className="mt-1 text-sm text-slate-400">
            6개월 수익률 기반 · 노드 크기 = 모멘텀 강도 · 클릭하면 상세 정보를 볼 수 있어요
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-indigo-400/30" />
            현재 뜨는 산업
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-400/30" />
            파생 수혜 예상
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-[2px] w-5 rounded-full bg-slate-400 opacity-50" />
            밸류체인 연결
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Graph canvas */}
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl bg-slate-950/60 p-2">
          <svg viewBox="0 0 640 740" style={{ minWidth: "320px", width: "100%" }}>
            {/* Edges */}
            {EDGES.map((e) => (
              <EdgePath
                key={`${e.from}__${e.to}`}
                edge={e}
                hovered={hovered}
                selectedId={selected?.id}
              />
            ))}

            {/* Derived nodes (rendered behind primary) */}
            {derivedNodes.map((node) => (
              <NodeShape
                key={node.id}
                node={node}
                isHovered={hovered === node.id}
                isSelected={selected?.id === node.id}
                onClick={() => handleClick(node)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}

            {/* Primary nodes (front, most prominent) */}
            {primaryNodes.map((node) => (
              <NodeShape
                key={node.id}
                node={node}
                isHovered={hovered === node.id}
                isSelected={selected?.id === node.id}
                onClick={() => handleClick(node)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div
            className="w-full shrink-0 rounded-2xl border p-5 backdrop-blur-sm lg:w-72"
            style={{
              backgroundColor: `${selected.color}10`,
              borderColor: `${selected.color}35`,
            }}
          >
            {/* Panel header */}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <div className="mb-1.5 flex flex-wrap gap-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${selected.color}28`, color: selected.color }}
                  >
                    {selected.market}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selected.type === "primary"
                        ? "bg-white/15 text-white"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {selected.type === "primary" ? "현재 뜨는 테마" : "파생 수혜 예상"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {selected.label.replace("\n", " ")}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="mt-0.5 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            </div>

            {/* Return + momentum bar */}
            <div
              className="mb-4 rounded-xl border p-4"
              style={{
                backgroundColor: `${selected.color}15`,
                borderColor: `${selected.color}25`,
              }}
            >
              <p className="mb-0.5 text-xs text-slate-400">6개월 수익률</p>
              <p className="text-3xl font-black" style={{ color: selected.color }}>
                {selected.return6m}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${selected.momentum}%`,
                    backgroundColor: selected.color,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                모멘텀 스코어{" "}
                <span style={{ color: selected.color }}>{selected.momentum}</span>/100
              </p>
            </div>

            {/* Cause */}
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                상승 원인
              </p>
              <p className="text-sm leading-6 text-slate-300">{selected.cause}</p>
            </div>

            {/* Lead-lag — primary nodes only */}
            {selected.leadLag && (
              <div className="mb-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-indigo-400">
                  다음으로 뜰 가능성
                </p>
                <p className="text-sm leading-6 text-slate-300">{selected.leadLag}</p>
              </div>
            )}

            {/* Top stocks */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                대표 종목
              </p>
              <div className="space-y-1.5">
                {selected.topStocks.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: selected.color }}
                    />
                    <span className="text-sm text-white">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden w-72 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] py-20 text-center lg:flex">
            <div>
              <div className="mb-4 text-5xl opacity-20">◎</div>
              <p className="text-sm text-slate-500">
                노드를 클릭하면
                <br />
                상세 정보를 볼 수 있어요
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
