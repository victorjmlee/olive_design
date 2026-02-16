"use client";

import { useState, useRef, useEffect } from "react";
import type {
  DesignResult as DesignResultType,
  DesignMessage,
} from "@/app/types";

interface Props {
  result: DesignResultType;
  onRefine: (feedback: string) => void;
  onExtractMaterials: () => void;
  loading: boolean;
  messages: DesignMessage[];
}

export default function DesignResult({
  result,
  onRefine,
  onExtractMaterials,
  loading,
  messages,
}: Props) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onRefine(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

      {/* Chat history */}
      {messages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-[var(--olive-600)] mb-2">
            디자인 수정 대화
          </h3>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-[var(--olive-500)] text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Refinement input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-[var(--olive-700)] mb-2">
          디자인 수정 요청
        </label>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 소파를 좀 더 크게 해줘, 벽을 파란색으로 바꿔줘..."
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--olive-400)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="self-end px-4 py-2 bg-[var(--olive-500)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                생성 중...
              </span>
            ) : (
              "수정 요청"
            )}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
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
    </div>
  );
}
