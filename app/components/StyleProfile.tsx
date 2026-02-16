"use client";

import type { StyleProfile as StyleProfileType } from "@/app/types";

interface Props {
  profile: StyleProfileType;
}

export default function StyleProfile({ profile }: Props) {
  return (
    <div className="bg-white rounded-xl border border-[var(--olive-200)] p-6 space-y-5">
      <h3 className="text-lg font-bold text-[var(--olive-800)] flex items-center gap-2">
        <span>🎨</span> 스타일 프로필
      </h3>

      {/* Style & Mood */}
      <div className="flex gap-3 flex-wrap">
        <span className="px-3 py-1.5 bg-[var(--olive-100)] text-[var(--olive-700)] rounded-full text-sm font-medium">
          {profile.style}
        </span>
        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
          {profile.mood}
        </span>
      </div>

      {/* Colors */}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">주요 색상</p>
        <div className="flex gap-2">
          {profile.colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
              <span className="text-xs text-gray-400">{color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">주요 자재</p>
        <div className="flex gap-2 flex-wrap">
          {profile.materials.map((mat, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-sm border border-amber-200"
            >
              {mat}
            </span>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">스타일 키워드</p>
        <div className="flex gap-2 flex-wrap">
          {profile.keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-[var(--olive-50)] text-[var(--olive-600)] rounded-md text-sm"
            >
              #{kw}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
      </div>
    </div>
  );
}
