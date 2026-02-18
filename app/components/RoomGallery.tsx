"use client";

import type { RoomEntry, DesignMessage, DesignVariation } from "@/app/types";
import DesignResultView from "./DesignResult";

interface Props {
  rooms: RoomEntry[];
  activeRoomId: string | null;
  onActiveRoomChange: (id: string) => void;
  onRefine: (roomId: string, feedback: string) => void;
  onExtractMaterials: (roomId: string) => void;
  loading: boolean;
  refining: boolean;
  onSelectVariation: (roomId: string, variationId: string | null) => void;
  onGenerateVariations: (roomId: string, count: number) => void;
  variationsLoading: boolean;
  selectedVariationId: string | null;
}

export default function RoomGallery({
  rooms,
  activeRoomId,
  onActiveRoomChange,
  onRefine,
  onExtractMaterials,
  loading,
  refining,
  onSelectVariation,
  onGenerateVariations,
  variationsLoading,
  selectedVariationId,
}: Props) {
  const completedRooms = rooms.filter((r) => r.designResult);
  const activeRoom = completedRooms.find((r) => r.id === activeRoomId) || completedRooms[0];

  if (completedRooms.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        생성된 디자인이 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* Room tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {completedRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onActiveRoomChange(room.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeRoom?.id === room.id
                ? "bg-[var(--olive-500)] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[var(--olive-300)]"
            }`}
          >
            {room.name}
            {room.designResult && (
              <img
                src={room.designResult.imageBase64}
                alt={room.name}
                className="w-8 h-8 rounded object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {/* Failed rooms indicator */}
      {rooms.some((r) => !r.designResult) && (
        <div className="mb-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          일부 공간의 디자인 생성에 실패했습니다:{" "}
          {rooms
            .filter((r) => !r.designResult)
            .map((r) => r.name)
            .join(", ")}
        </div>
      )}

      {/* Active room design */}
      {activeRoom?.designResult && (
        <DesignResultView
          result={activeRoom.designResult}
          onRefine={(feedback) => onRefine(activeRoom.id, feedback)}
          onExtractMaterials={() => onExtractMaterials(activeRoom.id)}
          loading={loading}
          refining={refining}
          messages={activeRoom.designMessages}
          variations={activeRoom.variations}
          selectedVariationId={selectedVariationId}
          onSelectVariation={(id) => onSelectVariation(activeRoom.id, id)}
          onGenerateVariations={(count) =>
            onGenerateVariations(activeRoom.id, count)
          }
          variationsLoading={variationsLoading}
        />
      )}
    </div>
  );
}
