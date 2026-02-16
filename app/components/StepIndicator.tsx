"use client";

const STEPS = [
  { label: "스타일 분석", icon: "🎨" },
  { label: "디자인 요청", icon: "✏️" },
  { label: "디자인 생성", icon: "🖼️" },
  { label: "자재 추출", icon: "🔧" },
  { label: "견적서", icon: "📋" },
];

interface Props {
  current: number; // 1-based
  onStepClick: (step: number) => void;
  maxReached: number;
}

export default function StepIndicator({ current, onStepClick, maxReached }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {STEPS.map((s, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        const isReachable = step <= maxReached;

        return (
          <div key={step} className="flex items-center">
            <button
              onClick={() => isReachable && onStepClick(step)}
              disabled={!isReachable}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--olive-500)] text-white shadow-md animate-pulse-olive"
                  : isDone
                    ? "bg-[var(--olive-200)] text-[var(--olive-800)] cursor-pointer hover:bg-[var(--olive-300)]"
                    : isReachable
                      ? "bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{step}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-0.5 mx-1 ${
                  step < current ? "bg-[var(--olive-400)]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
