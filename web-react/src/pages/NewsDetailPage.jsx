import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet } from "../api";
import { localizeKeywordList, marketLabelKo } from "../utils/newsText";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsDetailPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const [newsItem, setNewsItem] = useState(null);
  const [impact, setImpact] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!newsId) return;
    void loadDetail(newsId);
  }, [newsId]);

  async function loadDetail(targetId) {
    try {
      setError("");
      const [newsRes, impactRes] = await Promise.all([
        apiGet(`/api/news/${targetId}`),
        apiGet(`/api/news/${targetId}/impact`),
      ]);
      setNewsItem(newsRes.data);
      setImpact(impactRes.data);
    } catch (e) {
      setError("뉴스 상세 데이터를 불러오지 못했습니다.");
      console.error(e);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            뒤로가기
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-white"
          >
            메인으로
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{newsItem?.title ?? "뉴스 상세"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {newsItem ? `${newsItem.source_name} · ${formatDate(newsItem.published_at)}` : ""}
        </p>
      </header>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-bold">원문 요약</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {localizeKeywordList(newsItem?.derived_keywords).length ? (
            localizeKeywordList(newsItem?.derived_keywords).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {keyword}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">핵심 키워드 없음</span>
          )}
        </div>
        <p className="mb-4 leading-7 text-slate-700">{newsItem?.summary ?? "불러오는 중..."}</p>
        {newsItem?.source_url ? (
          <a
            href={newsItem.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            원문 링크 열기
          </a>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold">파생될 수 있는 이슈 심화 분석</h2>
        <p className="mb-4 text-sm text-slate-600">{impact?.thesis ?? "불러오는 중..."}</p>

        <article className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="mb-1 font-semibold">왜 중요한가</h3>
          <p className="text-sm text-slate-700">{impact?.why_it_matters}</p>
        </article>

        <article className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="mb-2 font-semibold">전달 경로</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {(impact?.transmission_chain ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="mb-2 font-semibold">관련 자산/종목 후보</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(impact?.related_assets ?? []).map((asset) => (
              <div key={`${asset.market}-${asset.ticker}`} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold">{marketLabelKo(asset.market)} · {asset.ticker}</p>
                <p className="mt-1 text-sm text-slate-600">{asset.reason}</p>
                <p className="mt-1 text-xs font-semibold text-primary">
                  신뢰도 {Math.round((asset.confidence ?? 0) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="mb-2 font-semibold">리스크/반론</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {(impact?.risks ?? []).map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
