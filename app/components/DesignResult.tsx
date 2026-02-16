"use client";

import type { DesignResult as DesignResultType } from "@/app/types";

interface Props {
  result: DesignResultType;
  onRegenerate: () => void;
  onExtractMaterials: () => void;
  loading: boolean;
}

export default function DesignResult({
  result,
  onRegenerate,
  onExtractMaterials,
  loading,
}: Props) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
          생성된 디자인
        </h2>
      </div>

      {/* Generated image */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
        <img
          src={result.imageBase64}
          alt="AI 생성 인테리어 디자인"
          className="w-full"
        />
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[var(--olive-800)] mb-3">
          디자인 설명
        </h3>
        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
          {result.description}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="px-6 py-2.5 border border-[var(--olive-400)] text-[var(--olive-600)] rounded-lg hover:bg-[var(--olive-50)] disabled:opacity-50 transition-colors"
        >
          다시 생성
        </button>
        <button
          onClick={onExtractMaterials}
          disabled={loading}
          className="px-6 py-2.5 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              자재 추출 중...
            </span>
          ) : (
            "자재 추출하기"
          )}
        </button>
      </div>
    </div>
  );
}
