"use client";

import type { RoomEntry } from "@/app/types";

interface Props {
  rooms: RoomEntry[];
  onRoomsChange: (rooms: RoomEntry[]) => void;
  onGenerate: () => void;
  loading: boolean;
}

const QUICK_ROOMS = [
  { name: "거실", prompt: "" },
  { name: "주방", prompt: "" },
  { name: "침실", prompt: "" },
  { name: "욕실", prompt: "" },
];

function makeId() {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function RoomPromptList({
  rooms,
  onRoomsChange,
  onGenerate,
  loading,
}: Props) {
  const addRoom = (name?: string) => {
    const newRoom: RoomEntry = {
      id: makeId(),
      name: name || `공간 ${rooms.length + 1}`,
      prompt: "",
      designResult: null,
      designMessages: [],
      variations: [],
      materials: [],
    };
    onRoomsChange([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    onRoomsChange(rooms.filter((r) => r.id !== id));
  };

  const updateRoom = (id: string, field: "name" | "prompt", value: string) => {
    onRoomsChange(
      rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const canGenerate =
    rooms.length > 0 && rooms.every((r) => r.prompt.trim().length > 0);

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">빠른 추가:</span>
        {QUICK_ROOMS.map((qr) => {
          const exists = rooms.some((r) => r.name === qr.name);
          return (
            <button
              key={qr.name}
              onClick={() => addRoom(qr.name)}
              disabled={exists}
              className="px-3 py-1 text-sm border border-[var(--olive-300)] text-[var(--olive-700)] rounded-full hover:bg-[var(--olive-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              + {qr.name}
            </button>
          );
        })}
        <button
          onClick={() => addRoom()}
          className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
        >
          + 직접 추가
        </button>
      </div>

      {/* Room entries */}
      {rooms.map((room, idx) => (
        <div
          key={room.id}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-[var(--olive-600)] w-6">
              {idx + 1}
            </span>
            <input
              type="text"
              value={room.name}
              onChange={(e) => updateRoom(room.id, "name", e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-md flex-1 max-w-[200px] outline-none focus:ring-2 focus:ring-[var(--olive-400)]"
            />
            <button
              onClick={() => removeRoom(room.id)}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 border border-red-200 rounded transition-colors ml-auto"
            >
              삭제
            </button>
          </div>
          <textarea
            value={room.prompt}
            onChange={(e) => updateRoom(room.id, "prompt", e.target.value)}
            placeholder={`${room.name}에 대한 디자인 설명을 입력하세요...`}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--olive-400)]"
          />
        </div>
      ))}

      {rooms.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          위 버튼으로 공간을 추가하세요
        </div>
      )}

      {/* Generate button */}
      {rooms.length > 0 && (
        <div className="text-center pt-2">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            className="px-8 py-3 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                생성 중... ({rooms.filter((r) => r.designResult).length}/
                {rooms.length})
              </span>
            ) : (
              `${rooms.length}개 공간 일괄 생성`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
