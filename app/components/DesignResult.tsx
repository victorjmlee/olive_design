"use client";

import { useState, useRef, useEffect } from "react";
import type {
  DesignResult as DesignResultType,
  DesignMessage,
  DesignVariation,
} from "@/app/types";
import VariationGrid from "./VariationGrid";

interface Props {
  result: DesignResultType;
  onRefine: (feedback: string) => void;
  onExtractMaterials: () => void;
  loading: boolean;
  refining: boolean;
  messages: DesignMessage[];
  variations: DesignVariation[];
  selectedVariationId: string | null;
  onSelectVariation: (id: string | null) => void;
  onGenerateVariations: (count: number) => void;
  variationsLoading: boolean;
}

export default function DesignResult({
  result,
  onRefine,
  onExtractMaterials,
  loading,
  refining,
  messages,
  variations,
  selectedVariationId,
  onSelectVariation,
  onGenerateVariations,
  variationsLoading,
}: Props) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || refining) return;
    setInput("");
    onRefine(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Display selected variation or original
  const selectedVariation = selectedVariationId
    ? variations.find((v) => v.id === selectedVariationId)
    : null;

  const displayImage = selectedVariation
    ? selectedVariation.imageBase64
    : result.imageBase64;
  const displayDescription = selectedVariation
    ? selectedVariation.description
    : result.description;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--olive-800)]">
          생성된 디자인
        </h2>
        {selectedVariation && (
          <p className="text-sm text-[var(--olive-600)] mt-1">
            변형: {selectedVariation.label}
          </p>
        )}
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: image + description + variations */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
            <img
              src={displayImage}
              alt="AI 생성 인테리어 디자인"
              className="w-full"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-[var(--olive-800)] mb-2">
              디자인 설명
            </h3>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
              {displayDescription}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onExtractMaterials}
              disabled={loading}
              className="px-6 py-2.5 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </span>
              ) : (
                "자재 추출하기"
              )}
            </button>
          </div>

          {/* Variation Grid */}
          <VariationGrid
            variations={variations}
            selectedId={selectedVariationId}
            onSelect={onSelectVariation}
            onGenerate={onGenerateVariations}
            loading={variationsLoading}
          />
        </div>

        {/* Right: chat */}
        <div className="lg:w-[360px] flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden lg:max-h-[calc(100vh-200px)] lg:sticky lg:top-28">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[var(--olive-700)]">
              디자인 수정 대화
            </h3>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-8">
                수정하고 싶은 부분을 말씀해주세요
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--olive-500)] text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {msg.role === "assistant"
                    ? msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : "")
                    : msg.content}
                </div>
              </div>
            ))}
            {refining && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    디자인 생성 중...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 벽을 파란색으로 바꿔줘..."
                rows={2}
                disabled={refining}
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--olive-400)] disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={refining || !input.trim()}
                className="self-end px-3 py-2 bg-[var(--olive-500)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
