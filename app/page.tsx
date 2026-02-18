"use client";

import { useState, useEffect, useCallback } from "react";
import StepIndicator from "@/app/components/StepIndicator";
import StyleUploader from "@/app/components/StyleUploader";
import StyleProfileView from "@/app/components/StyleProfile";
import DesignPrompt from "@/app/components/DesignPrompt";
import DesignResultView from "@/app/components/DesignResult";
import MaterialsList from "@/app/components/MaterialsList";
import EstimateSheet from "@/app/components/EstimateSheet";
import RoomPromptList from "@/app/components/RoomPromptList";
import RoomGallery from "@/app/components/RoomGallery";
import { exportEstimatePdf, exportConstructionPdf } from "@/app/components/PdfExport";
import type {
  AppState,
  StyleProfile,
  DesignResult,
  DesignMessage,
  DesignVariation,
  Material,
  EstimateRow,
  RoomEntry,
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
      const stripVariations = (vars: DesignVariation[]) =>
        vars.map((v) => ({ ...v, imageBase64: "" }));

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
        variations: stripVariations(state.variations),
        rooms: state.rooms.map((r) => ({
          ...r,
          designResult: r.designResult
            ? { ...r.designResult, imageBase64: "" }
            : null,
          designMessages: r.designMessages.map((m) => ({
            ...m,
            imageBase64: undefined,
          })),
          variations: stripVariations(r.variations),
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
    roomMode: "single",
    rooms: [],
    activeRoomId: null,
    designResult: null,
    designMessages: [],
    variations: [],
    selectedVariationId: null,
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
  const [variationsLoading, setVariationsLoading] = useState(false);
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
    if (state.rooms.some((r) => r.materials.length > 0)) return 5;
    if (state.designResult) return 4;
    if (state.rooms.some((r) => r.designResult)) return 4;
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

  // ─── Step 3: Design Generation (single room) ────────────────────────────

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
      setState((s) => ({
        ...s,
        designResult: result,
        designMessages: [],
        variations: [],
        selectedVariationId: null,
        step: 3,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "디자인 생성 실패");
    } finally {
      setLoading(false);
    }
  }, [state.designPrompt, state.styleProfile]);

  // ─── Step 3: Multi-room batch generation ────────────────────────────────

  const handleGenerateMultiRoom = useCallback(async () => {
    if (!state.styleProfile || state.rooms.length === 0) return;
    setLoading(true);
    setError("");

    const BATCH_SIZE = 2;
    const STAGGER_MS = 2000;
    const updatedRooms = [...state.rooms];

    async function generateRoom(room: RoomEntry) {
      const res = await fetch("/api/design-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: room.prompt,
          styleProfile: state.styleProfile,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return {
        roomId: room.id,
        result: {
          imageBase64: data.imageBase64,
          description: data.description,
          prompt: data.prompt,
        } as DesignResult,
      };
    }

    try {
      for (let i = 0; i < updatedRooms.length; i += BATCH_SIZE) {
        const batch = updatedRooms.slice(i, i + BATCH_SIZE);
        // Stagger requests to avoid DALL-E rate limiting
        const results = await Promise.allSettled(
          batch.map((room, idx) =>
            new Promise<{ roomId: string; result: DesignResult }>((resolve, reject) => {
              setTimeout(() => generateRoom(room).then(resolve, reject), idx * STAGGER_MS);
            }),
          ),
        );

        results.forEach((r, idx) => {
          const roomIdx = i + idx;
          if (r.status === "fulfilled") {
            updatedRooms[roomIdx] = {
              ...updatedRooms[roomIdx],
              designResult: r.value.result,
              designMessages: [],
              variations: [],
            };
          }
        });

        // Update state progressively
        setState((s) => ({
          ...s,
          rooms: [...updatedRooms],
        }));
      }

      // Retry failed rooms once sequentially
      for (let i = 0; i < updatedRooms.length; i++) {
        if (!updatedRooms[i].designResult) {
          try {
            const retryResult = await generateRoom(updatedRooms[i]);
            updatedRooms[i] = {
              ...updatedRooms[i],
              designResult: retryResult.result,
              designMessages: [],
              variations: [],
            };
            setState((s) => ({ ...s, rooms: [...updatedRooms] }));
          } catch {
            // Still failed after retry — leave as null
          }
        }
      }

      const firstCompleted = updatedRooms.find((r) => r.designResult);
      setState((s) => ({
        ...s,
        rooms: updatedRooms,
        activeRoomId: firstCompleted?.id || null,
        step: 3,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다중 공간 생성 실패");
    } finally {
      setLoading(false);
    }
  }, [state.rooms, state.styleProfile]);

  // ─── Step 3b: Design Refinement (single) ──────────────────────────────

  const handleRefineDesign = useCallback(
    async (feedback: string) => {
      if (!state.styleProfile || !state.designResult) return;

      const userMsg: DesignMessage = { role: "user", content: feedback };
      setState((s) => ({
        ...s,
        designMessages: [...s.designMessages, userMsg],
      }));

      setRefining(true);
      setError("");

      try {
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
          variations: [],
          selectedVariationId: null,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "디자인 수정 실패");
      } finally {
        setRefining(false);
      }
    },
    [state.designPrompt, state.styleProfile, state.designResult, state.designMessages],
  );

  // ─── Step 3b: Design Refinement (multi-room) ──────────────────────────

  const handleRefineRoomDesign = useCallback(
    async (roomId: string, feedback: string) => {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!state.styleProfile || !room?.designResult) return;

      const userMsg: DesignMessage = { role: "user", content: feedback };
      setState((s) => ({
        ...s,
        rooms: s.rooms.map((r) =>
          r.id === roomId
            ? { ...r, designMessages: [...r.designMessages, userMsg] }
            : r,
        ),
      }));

      setRefining(true);
      setError("");

      try {
        const allRefinements = [
          ...room.designMessages
            .filter((m) => m.role === "user")
            .map((m) => m.content),
          feedback,
        ];

        const res = await fetch("/api/design-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: room.prompt,
            styleProfile: state.styleProfile,
            refinements: allRefinements,
            previousDescription: room.designResult.description,
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
          rooms: s.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  designResult: result,
                  designMessages: [...r.designMessages, assistantMsg],
                  variations: [],
                }
              : r,
          ),
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "디자인 수정 실패");
      } finally {
        setRefining(false);
      }
    },
    [state.rooms, state.styleProfile],
  );

  // ─── Variations (single room) ─────────────────────────────────────────

  const handleGenerateVariations = useCallback(
    async (count: number) => {
      if (!state.designResult || !state.styleProfile) return;
      setVariationsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/design-variations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: state.designResult.description,
            dallePrompt: state.designResult.prompt,
            styleProfile: state.styleProfile,
            count,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setState((s) => ({
          ...s,
          variations: data.variations as DesignVariation[],
          selectedVariationId: null,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "변형 생성 실패");
      } finally {
        setVariationsLoading(false);
      }
    },
    [state.designResult, state.styleProfile],
  );

  const handleSelectVariation = (id: string | null) => {
    setState((s) => ({ ...s, selectedVariationId: id }));
  };

  // ─── Variations (multi-room) ──────────────────────────────────────────

  const handleGenerateRoomVariations = useCallback(
    async (roomId: string, count: number) => {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room?.designResult || !state.styleProfile) return;
      setVariationsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/design-variations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: room.designResult.description,
            dallePrompt: room.designResult.prompt,
            styleProfile: state.styleProfile,
            count,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setState((s) => ({
          ...s,
          rooms: s.rooms.map((r) =>
            r.id === roomId
              ? { ...r, variations: data.variations as DesignVariation[] }
              : r,
          ),
          selectedVariationId: null,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "변형 생성 실패");
      } finally {
        setVariationsLoading(false);
      }
    },
    [state.rooms, state.styleProfile],
  );

  const handleSelectRoomVariation = (roomId: string, id: string | null) => {
    setState((s) => ({ ...s, selectedVariationId: id }));
  };

  // ─── Step 4: Materials Extraction (single) ─────────────────────────────

  const handleExtractMaterials = useCallback(async () => {
    if (!state.designResult) return;
    setLoading(true);
    setError("");

    // Use selected variation image/description if applicable
    const selectedVar = state.selectedVariationId
      ? state.variations.find((v) => v.id === state.selectedVariationId)
      : null;

    const imageToUse = selectedVar ? selectedVar.imageBase64 : state.designResult.imageBase64;
    const descToUse = selectedVar ? selectedVar.description : state.designResult.description;

    try {
      const res = await fetch("/api/materials-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageToUse,
          description: descToUse,
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
  }, [state.designResult, state.selectedVariationId, state.variations]);

  // ─── Step 4: Materials Extraction (multi-room single) ──────────────────

  const handleExtractRoomMaterials = useCallback(
    async (roomId: string) => {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room?.designResult) return;
      setLoading(true);
      setError("");

      // Check for selected variation
      const selectedVar = state.selectedVariationId
        ? room.variations.find((v) => v.id === state.selectedVariationId)
        : null;

      const imageToUse = selectedVar ? selectedVar.imageBase64 : room.designResult.imageBase64;
      const descToUse = selectedVar ? selectedVar.description : room.designResult.description;

      try {
        const res = await fetch("/api/materials-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: imageToUse,
            description: descToUse,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setState((s) => ({
          ...s,
          rooms: s.rooms.map((r) =>
            r.id === roomId ? { ...r, materials: data.materials } : r,
          ),
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "자재 추출 실패");
      } finally {
        setLoading(false);
      }
    },
    [state.rooms, state.selectedVariationId],
  );

  // ─── Step 4: Extract all rooms materials ──────────────────────────────

  const handleExtractAllRoomMaterials = useCallback(async () => {
    const roomsWithDesign = state.rooms.filter((r) => r.designResult);
    if (roomsWithDesign.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        roomsWithDesign.map(async (room) => {
          const res = await fetch("/api/materials-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: room.designResult!.imageBase64,
              description: room.designResult!.description,
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return { roomId: room.id, materials: data.materials as Material[] };
        }),
      );

      const updatedRooms = [...state.rooms];
      const allMaterials: Material[] = [];

      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const idx = updatedRooms.findIndex((rm) => rm.id === r.value.roomId);
          if (idx >= 0) {
            updatedRooms[idx] = {
              ...updatedRooms[idx],
              materials: r.value.materials,
            };
          }
          allMaterials.push(...r.value.materials);
        }
      });

      // Deduplicate by name
      const seen = new Set<string>();
      const dedupedMaterials = allMaterials.filter((m) => {
        if (seen.has(m.name)) return false;
        seen.add(m.name);
        return true;
      });

      setState((s) => ({
        ...s,
        rooms: updatedRooms,
        materials: dedupedMaterials,
        step: 4,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "자재 추출 실패");
    } finally {
      setLoading(false);
    }
  }, [state.rooms]);

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

  const handleExportConstructionPdf = () => {
    if (!state.designResult && state.rooms.length === 0) {
      alert("디자인 결과가 없습니다.");
      return;
    }

    const isMultiRoom = state.roomMode === "multi" && state.rooms.length > 0;

    exportConstructionPdf({
      designResult: isMultiRoom
        ? (state.rooms.find((r) => r.designResult)?.designResult || {
            imageBase64: "",
            description: "",
            prompt: "",
          })
        : (state.designResult || { imageBase64: "", description: "", prompt: "" }),
      materials: state.materials,
      estimateRows: state.estimateRows,
      customerName: state.customerName,
      roomDescription: isMultiRoom
        ? state.rooms.map((r) => r.name).join(", ")
        : state.designPrompt,
      styleProfile: state.styleProfile || {
        colors: [],
        materials: [],
        mood: "",
        style: "",
        keywords: [],
        summary: "",
      },
      rooms: isMultiRoom ? state.rooms : undefined,
    });
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

  const isMultiRoom = state.roomMode === "multi";

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

            {/* Room mode toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  onClick={() =>
                    setState((s) => ({ ...s, roomMode: "single" }))
                  }
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    !isMultiRoom
                      ? "bg-[var(--olive-500)] text-white"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  단일 공간
                </button>
                <button
                  onClick={() =>
                    setState((s) => ({ ...s, roomMode: "multi" }))
                  }
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    isMultiRoom
                      ? "bg-[var(--olive-500)] text-white"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  다중 공간
                </button>
              </div>
            </div>

            {isMultiRoom ? (
              /* Multi-room prompt list */
              <div className="flex gap-6 flex-col lg:flex-row">
                <div className="flex-1 min-w-0">
                  <StyleProfileView profile={state.styleProfile} />
                </div>
                <div className="flex-1 min-w-0">
                  <RoomPromptList
                    rooms={state.rooms}
                    onRoomsChange={(rooms) =>
                      setState((s) => ({ ...s, rooms }))
                    }
                    onGenerate={handleGenerateMultiRoom}
                    loading={loading}
                  />
                </div>
              </div>
            ) : (
              /* Single room prompt */
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
            )}
          </div>
        )}

        {/* Step 3: Design Result */}
        {state.step === 3 && (
          <>
            {isMultiRoom ? (
              /* Multi-room gallery */
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--olive-800)]">
                    공간별 디자인 결과
                  </h2>
                </div>
                <RoomGallery
                  rooms={state.rooms}
                  activeRoomId={state.activeRoomId}
                  onActiveRoomChange={(id) =>
                    setState((s) => ({
                      ...s,
                      activeRoomId: id,
                      selectedVariationId: null,
                    }))
                  }
                  onRefine={handleRefineRoomDesign}
                  onExtractMaterials={handleExtractRoomMaterials}
                  loading={loading}
                  refining={refining}
                  onSelectVariation={handleSelectRoomVariation}
                  onGenerateVariations={handleGenerateRoomVariations}
                  variationsLoading={variationsLoading}
                  selectedVariationId={state.selectedVariationId}
                />
                {/* Extract all materials button */}
                {state.rooms.some((r) => r.designResult) && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleExtractAllRoomMaterials}
                      disabled={loading}
                      className="px-8 py-3 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          전체 자재 추출 중...
                        </span>
                      ) : (
                        "전체 자재 추출하기"
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Single room result */
              state.designResult && (
                <DesignResultView
                  result={state.designResult}
                  onRefine={handleRefineDesign}
                  onExtractMaterials={handleExtractMaterials}
                  loading={loading}
                  refining={refining}
                  messages={state.designMessages}
                  variations={state.variations}
                  selectedVariationId={state.selectedVariationId}
                  onSelectVariation={handleSelectVariation}
                  onGenerateVariations={handleGenerateVariations}
                  variationsLoading={variationsLoading}
                />
              )
            )}
          </>
        )}

        {/* Step 4: Materials */}
        {state.step === 4 && state.materials.length > 0 && (
          <MaterialsList
            materials={state.materials}
            onAddToEstimate={addToEstimate}
            onGoToEstimate={() => setStep(5)}
            rooms={isMultiRoom ? state.rooms : undefined}
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
            onExportConstructionPdf={
              state.designResult || state.rooms.some((r) => r.designResult)
                ? handleExportConstructionPdf
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
