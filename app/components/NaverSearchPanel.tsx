"use client";

import { useState, useCallback, useEffect } from "react";
import type { NaverItem, EstimateRow } from "@/app/types";

interface Props {
  initialQuery?: string;
  onAddToEstimate: (row: EstimateRow) => void;
  onClose?: () => void;
}

const DISPLAY = 10;
const SORT_OPTIONS = [
  { value: "sim", label: "추천순" },
  { value: "date", label: "날짜순" },
  { value: "asc", label: "저가순" },
  { value: "dsc", label: "고가순" },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function formatNum(n: number | string): string {
  return Number(n).toLocaleString();
}

export default function NaverSearchPanel({
  initialQuery = "",
  onAddToEstimate,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState("sim");
  const [items, setItems] = useState<NaverItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  const doSearch = useCallback(
    async (q: string, s: string, p: number) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      const start = (p - 1) * DISPLAY + 1;
      try {
        const res = await fetch(
          `/api/naver-search?query=${encodeURIComponent(q)}&display=${DISPLAY}&start=${start}&sort=${s}&_=${Date.now()}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setItems([]);
          return;
        }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setPage(p);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "요청 실패");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery, sort, 1);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => doSearch(query, sort, 1);
  const handleSortChange = (s: string) => {
    setSort(s);
    if (query.trim()) doSearch(query, s, 1);
  };

  const totalPages = Math.ceil(total / DISPLAY) || 1;

  const addItem = (item: NaverItem, index: number) => {
    const qty = quantities[index] || 1;
    const price = String(item.lprice).replace(/\D/g, "") || "0";
    onAddToEstimate({
      name: stripHtml(item.title),
      price,
      qty,
    });
    setAddedIndices((prev) => new Set(prev).add(index));
    setTimeout(() => {
      setAddedIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 1000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[var(--olive-800)]">네이버 쇼핑 검색</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="검색어 입력"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[var(--naver-green)] focus:border-transparent outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-[var(--naver-green)] text-white text-sm rounded-md hover:bg-[var(--naver-green-dark)] disabled:opacity-50 transition-colors"
        >
          검색
        </button>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-1 mb-3">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSortChange(opt.value)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              sort === opt.value
                ? "bg-[var(--naver-green)] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm mb-3">
          {error}
        </div>
      )}

      {loading && <div className="text-gray-500 text-sm py-4 text-center">검색 중...</div>}

      {/* Results */}
      {!loading && items.length > 0 && (
        <>
          <div className="text-xs text-gray-400 mb-2">
            총 {formatNum(total)}건
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {items.map((item, i) => {
              const title = stripHtml(item.title);
              const price = String(item.lprice).replace(/\D/g, "") || "0";
              const isExpanded = expandedIndex === i;
              return (
                <div
                  key={i}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  <div
                    onClick={() =>
                      setExpandedIndex(isExpanded ? null : i)
                    }
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{title}</p>
                      <p className="text-sm text-red-500 font-semibold">
                        {formatNum(price)}원
                        {item.mallName && (
                          <span className="text-gray-400 font-normal">
                            {" "}
                            · {item.mallName}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-[var(--naver-green)] text-xs flex-shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs hover:underline"
                      >
                        원본 상품 보기 ↗
                      </a>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">수량</span>
                        <input
                          type="number"
                          min={1}
                          value={quantities[i] || 1}
                          onChange={(e) =>
                            setQuantities({
                              ...quantities,
                              [i]: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => addItem(item, i)}
                          disabled={addedIndices.has(i)}
                          className={`px-3 py-1 text-white text-xs rounded transition-colors ${
                            addedIndices.has(i)
                              ? "bg-emerald-500 cursor-default"
                              : "bg-[var(--naver-green)] hover:bg-[var(--naver-green-dark)]"
                          }`}
                        >
                          {addedIndices.has(i) ? "추가 완료!" : "견적에 추가"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => doSearch(query, sort, page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => doSearch(query, sort, page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {!loading && items.length === 0 && !error && query && (
        <div className="text-gray-400 text-sm py-4 text-center">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
