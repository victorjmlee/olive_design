"use client";

import type { StyleProfile } from "@/app/types";

interface Props {
  prompt: string;
  styleProfile: StyleProfile;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function DesignPrompt({
  prompt,
  styleProfile,
  onPromptChange,
  onGenerate,
  loading,
}: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
          디자인 요청
        </h2>
        <p className="text-gray-500">
          어떤 공간을 디자인할지 설명해주세요. AI가 스타일 프로필을 반영하여
          디자인을 생성합니다.
        </p>
      </div>

      {/* Style context */}
      <div className="bg-[var(--olive-50)] rounded-lg p-4 border border-[var(--olive-200)]">
        <p className="text-sm text-[var(--olive-600)] mb-2 font-medium">
          적용될 스타일
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--olive-800)]">
            {styleProfile.style}
          </span>
          <span className="text-gray-300">|</span>
          <div className="flex gap-1.5">
            {styleProfile.colors.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">
            {styleProfile.materials.slice(0, 3).join(", ")}
          </span>
        </div>
      </div>

      {/* Prompt input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          공간 설명
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="예: 20평대 아파트 거실, 남향 큰 창문이 있고 TV와 소파를 배치할 공간이 필요합니다. 바닥은 원목 마루, 벽은 밝은 화이트톤으로..."
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--olive-400)] focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Quick suggestions */}
      <div className="flex gap-2 flex-wrap">
        {[
          "20평 거실",
          "침실 + 드레스룸",
          "미니멀 주방",
          "아이 방",
          "홈 오피스",
        ].map((s) => (
          <button
            key={s}
            onClick={() =>
              onPromptChange(prompt ? `${prompt} ${s}` : s)
            }
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-full hover:bg-[var(--olive-50)] hover:border-[var(--olive-300)] transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!prompt.trim() || loading}
        className="w-full py-3 px-6 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            디자인 생성 중...
          </span>
        ) : (
          "AI 디자인 생성"
        )}
      </button>
    </div>
  );
}
