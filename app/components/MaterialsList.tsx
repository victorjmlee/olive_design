"use client";

import { useState } from "react";
import type { Material, EstimateRow } from "@/app/types";
import NaverSearchPanel from "./NaverSearchPanel";

interface Props {
  materials: Material[];
  onAddToEstimate: (row: EstimateRow) => void;
  onGoToEstimate: () => void;
}

export default function MaterialsList({
  materials,
  onAddToEstimate,
  onGoToEstimate,
}: Props) {
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);

  const CATEGORY_COLORS: Record<string, string> = {
    바닥재: "bg-amber-100 text-amber-800",
    벽재: "bg-blue-100 text-blue-800",
    천장재: "bg-purple-100 text-purple-800",
    조명: "bg-yellow-100 text-yellow-800",
    가구: "bg-green-100 text-green-800",
    패브릭: "bg-pink-100 text-pink-800",
    데코: "bg-orange-100 text-orange-800",
    기타: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
          추출된 자재 목록
        </h2>
        <p className="text-gray-500">
          각 자재의 &quot;네이버 검색&quot;을 클릭하면 쇼핑 검색 결과를 볼 수 있습니다
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Materials list */}
        <div className="flex-1 space-y-2">
          {materials.map((mat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  CATEGORY_COLORS[mat.category] || CATEGORY_COLORS["기타"]
                }`}
              >
                {mat.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {mat.name}
                </p>
                {mat.estimatedSpec && (
                  <p className="text-xs text-gray-400">{mat.estimatedSpec}</p>
                )}
              </div>
              <button
                onClick={() => setSearchKeyword(mat.searchKeyword)}
                className="px-3 py-1.5 text-sm bg-[var(--naver-green)] text-white rounded-md hover:bg-[var(--naver-green-dark)] transition-colors flex-shrink-0"
              >
                네이버 검색
              </button>
            </div>
          ))}

          <div className="pt-4 text-center">
            <button
              onClick={onGoToEstimate}
              className="px-6 py-2.5 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] transition-colors"
            >
              견적서 보기
            </button>
          </div>
        </div>

        {/* Naver search panel */}
        {searchKeyword && (
          <div className="lg:w-[480px] flex-shrink-0">
            <NaverSearchPanel
              initialQuery={searchKeyword}
              onAddToEstimate={onAddToEstimate}
              onClose={() => setSearchKeyword(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
