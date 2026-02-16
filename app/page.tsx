"use client";

import { useState, useEffect, useCallback } from "react";
import StepIndicator from "@/app/components/StepIndicator";
import StyleUploader from "@/app/components/StyleUploader";
import StyleProfileView from "@/app/components/StyleProfile";
import DesignPrompt from "@/app/components/DesignPrompt";
import DesignResultView from "@/app/components/DesignResult";
import MaterialsList from "@/app/components/MaterialsList";
import EstimateSheet from "@/app/components/EstimateSheet";
import { exportEstimatePdf } from "@/app/components/PdfExport";
import type {
  AppState,
  StyleProfile,
  DesignResult,
  DesignMessage,
  Material,
  EstimateRow,
} from "@/app/types";

// ─── localStorage keys ──────────────────────────────────────────────────────

const STORAGE_KEY = "olive_design_state";

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState(), ...JSON.parse(saved) };
  } catch {}
  return defaultState();
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded — retry without large base64 images
    try {
      const lite = {
        ...state,
        uploadedImages: [],
        designResult: state.designResult
          ? { ...state.designResult, imageBase64: "" }
          : null,
        designMessages: state.designMessages.map((m) => ({
          ...m,
          imageBase64: undefined,
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
    } catch {}
  }
}

function defaultState(): AppState {
  return {
    step: 1,
    uploadedImages: [],
    styleText: "",
    styleProfile: null,
    designPrompt: "",
    designResult: null,
    designMessages: [],
    materials: [],
    estimateRows: [],
    customerName: "",
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  const [state, setState] = useState<AppState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (mounted) saveState(state);
  }, [state, mounted]);

  const maxReached = (() => {
    if (state.estimateRows.length > 0) return 5;
    if (state.materials.length > 0) return 5;
    if (state.designResult) return 4;
    if (state.styleProfile) return 3;
    return 1;
  })();

  const setStep = (step: number) =>
    setState((s) => ({
      ...s,
      step,
      // Clear refinement chat when going back to step 2
      ...(step <= 2 ? { designMessages: [] } : {}),
    }));

  // ─── Step 1: Style Analysis ───────────────────────────────────────────────

  const handleAnalyzeStyle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/style-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: state.uploadedImages,
          text: state.styleText,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const profile: StyleProfile = data.profile;
      setState((s) => ({ ...s, styleProfile: profile, step: 2 }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "스타일 분석 실패");
    } finally {
      setLoading(false);
    }
  }, [state.uploadedImages, state.styleText]);

  // ─── Step 3: Design Generation ────────────────────────────────────────────

  const handleGenerateDesign = useCallback(async () => {
    if (!state.styleProfile) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/design-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: state.designPrompt,
          styleProfile: state.styleProfile,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const result: DesignResult = {
        imageBase64: data.imageBase64,
        description: data.description,
        prompt: data.prompt,
      };
      setState((s) => ({ ...s, designResult: result, designMessages: [], step: 3 }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "디자인 생성 실패");
    } finally {
      setLoading(false);
    }
  }, [state.designPrompt, state.styleProfile]);

  // ─── Step 3b: Design Refinement ──────────────────────────────────────────

  const handleRefineDesign = useCallback(
    async (feedback: string) => {
      if (!state.styleProfile || !state.designResult) return;

      // Append user message immediately
      const userMsg: DesignMessage = { role: "user", content: feedback };
      setState((s) => ({
        ...s,
        designMessages: [...s.designMessages, userMsg],
      }));

      setRefining(true);
      setError("");

      try {
        // Collect all refinement strings from history + new one
        const allRefinements = [
          ...state.designMessages
            .filter((m) => m.role === "user")
            .map((m) => m.content),
          feedback,
        ];

        const res = await fetch("/api/design-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: state.designPrompt,
            styleProfile: state.styleProfile,
            refinements: allRefinements,
            previousDescription: state.designResult.description,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const result: DesignResult = {
          imageBase64: data.imageBase64,
          description: data.description,
          prompt: data.prompt,
        };

        const assistantMsg: DesignMessage = {
          role: "assistant",
          content: data.description,
          imageBase64: data.imageBase64,
        };

        setState((s) => ({
          ...s,
          designResult: result,
          designMessages: [...s.designMessages, assistantMsg],
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "디자인 수정 실패");
      } finally {
        setRefining(false);
      }
    },
    [state.designPrompt, state.styleProfile, state.designResult, state.designMessages],
  );

  // ─── Step 4: Materials Extraction ─────────────────────────────────────────

  const handleExtractMaterials = useCallback(async () => {
    if (!state.designResult) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/materials-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: state.designResult.imageBase64,
          description: state.designResult.description,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const materials: Material[] = data.materials;
      setState((s) => ({ ...s, materials, step: 4 }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "자재 추출 실패");
    } finally {
      setLoading(false);
    }
  }, [state.designResult]);

  // ─── Estimate Handlers ────────────────────────────────────────────────────

  const addToEstimate = (row: EstimateRow) => {
    setState((s) => ({
      ...s,
      estimateRows: [...s.estimateRows, row],
    }));
  };

  const handleExportPdf = () => {
    exportEstimatePdf(state.estimateRows, state.customerName);
  };

  const handleReset = () => {
    if (confirm("모든 데이터를 초기화하시겠습니까?")) {
      setState(defaultState());
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--olive-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-[var(--olive-200)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--olive-700)]">
            올리브디자인
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">
              AI 인테리어 디자인 플랫폼
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2 py-1 rounded transition-colors"
            >
              처음부터 다시하기
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <StepIndicator
            current={state.step}
            onStepClick={setStep}
            maxReached={maxReached}
          />
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-3xl mx-auto mt-4 px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <main className="max-w-7xl mx-auto px-4 mt-8">
        {/* Step 1: Upload + Style Analysis */}
        {state.step === 1 && (
          <div className="space-y-8">
            <StyleUploader
              images={state.uploadedImages}
              text={state.styleText}
              onImagesChange={(images) =>
                setState((s) => ({ ...s, uploadedImages: images }))
              }
              onTextChange={(text) =>
                setState((s) => ({ ...s, styleText: text }))
              }
              onAnalyze={handleAnalyzeStyle}
              loading={loading}
            />
            {state.styleProfile && (
              <div className="max-w-3xl mx-auto">
                <StyleProfileView profile={state.styleProfile} />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Design Prompt */}
        {state.step === 2 && state.styleProfile && (
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
                디자인 요청
              </h2>
              <p className="text-gray-500">
                어떤 공간을 디자인할지 설명해주세요
              </p>
            </div>
            <div className="flex gap-6 flex-col lg:flex-row">
              <div className="flex-1 min-w-0">
                <StyleProfileView profile={state.styleProfile} />
              </div>
              <div className="flex-1 min-w-0">
                <DesignPrompt
                  prompt={state.designPrompt}
                  styleProfile={state.styleProfile}
                  onPromptChange={(prompt) =>
                    setState((s) => ({ ...s, designPrompt: prompt }))
                  }
                  onGenerate={handleGenerateDesign}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Design Result */}
        {state.step === 3 && state.designResult && (
          <DesignResultView
            result={state.designResult}
            onRefine={handleRefineDesign}
            onExtractMaterials={handleExtractMaterials}
            loading={loading}
            refining={refining}
            messages={state.designMessages}
          />
        )}

        {/* Step 4: Materials */}
        {state.step === 4 && state.materials.length > 0 && (
          <MaterialsList
            materials={state.materials}
            onAddToEstimate={addToEstimate}
            onGoToEstimate={() => setStep(5)}
          />
        )}

        {/* Step 5: Estimate Sheet */}
        {state.step === 5 && (
          <EstimateSheet
            rows={state.estimateRows}
            customerName={state.customerName}
            onRowsChange={(rows) =>
              setState((s) => ({ ...s, estimateRows: rows }))
            }
            onCustomerNameChange={(name) =>
              setState((s) => ({ ...s, customerName: name }))
            }
            onExportPdf={handleExportPdf}
          />
        )}
      </main>
    </div>
  );
}
