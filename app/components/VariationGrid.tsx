"use client";

import { useState } from "react";
import type { DesignVariation } from "@/app/types";

interface Props {
  variations: DesignVariation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onGenerate: (count: number) => void;
  loading: boolean;
}

export default function VariationGrid({
  variations,
  selectedId,
  onSelect,
  onGenerate,
  loading,
}: Props) {
  const [count, setCount] = useState(2);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-[var(--olive-800)]">
          스타일 변형 비교
        </h3>
        {variations.length === 0 && !loading && (
          <div className="flex items-center gap-2">
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[var(--olive-400)]"
            >
              <option value={2}>2개</option>
              <option value={3}>3개</option>
            </select>
            <button
              onClick={() => onGenerate(count)}
              className="px-4 py-1.5 text-sm bg-[var(--olive-500)] text-white rounded-md hover:bg-[var(--olive-600)] transition-colors"
            >
              변형 생성
            </button>
          </div>
        )}
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="px-3 py-1 text-sm text-[var(--olive-600)] border border-[var(--olive-300)] rounded-md hover:bg-[var(--olive-50)] transition-colors ml-auto"
          >
            원본으로 돌아가기
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variation cards */}
      {!loading && variations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {variations.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v.id === selectedId ? null : v.id)}
              className={`text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                v.id === selectedId
                  ? "border-[var(--olive-500)] shadow-lg ring-2 ring-[var(--olive-300)]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {v.imageBase64 && (
                <img
                  src={v.imageBase64}
                  alt={v.label}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-3">
                <p className="font-semibold text-sm text-[var(--olive-800)] mb-1">
                  {v.label}
                </p>
                <p className="text-xs text-gray-500 line-clamp-3">
                  {v.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
