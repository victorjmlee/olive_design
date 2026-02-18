"use client";

import type { StyleProfile, ViewType } from "@/app/types";

const VIEW_TYPE_OPTIONS: { value: ViewType; label: string; desc: string }[] = [
  { value: "rendering", label: "실내 렌더링", desc: "실제 공간처럼 보이는 사실적 이미지" },
  { value: "isometric", label: "3D 조감도", desc: "위에서 비스듬히 내려다보는 입체 뷰" },
  { value: "floorplan", label: "평면도", desc: "위에서 본 2D 배치도" },
];

interface Props {
  prompt: string;
  styleProfile: StyleProfile;
  viewType: ViewType;
  onPromptChange: (prompt: string) => void;
  onViewTypeChange: (vt: ViewType) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function DesignPrompt({
  prompt,
  styleProfile: _styleProfile,
  viewType,
  onPromptChange,
  onViewTypeChange,
  onGenerate,
  loading,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-[var(--olive-200)] p-6 space-y-5">
      <h3 className="text-lg font-bold text-[var(--olive-800)]">
        공간 설명
      </h3>

      {/* View type selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">시각화 타입</label>
        <div className="grid grid-cols-3 gap-2">
          {VIEW_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onViewTypeChange(opt.value)}
              className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                viewType === opt.value
                  ? "border-[var(--olive-500)] bg-[var(--olive-50)] text-[var(--olive-800)] font-semibold"
                  : "border-gray-200 text-gray-600 hover:border-[var(--olive-300)] hover:bg-[var(--olive-50)]"
              }`}
            >
              <div>{opt.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="예: 20평대 아파트 거실, 남향 큰 창문이 있고 TV와 소파를 배치할 공간이 필요합니다. 바닥은 원목 마루, 벽은 밝은 화이트톤으로..."
        rows={5}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--olive-400)] focus:border-transparent outline-none resize-none"
      />

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
