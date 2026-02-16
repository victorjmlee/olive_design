"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  images: string[];
  text: string;
  onImagesChange: (images: string[]) => void;
  onTextChange: (text: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIM = 1568;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SIZE) {
      reject(new Error(`파일 크기가 5MB를 초과합니다: ${file.name}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

export default function StyleUploader({
  images,
  text,
  onImagesChange,
  onTextChange,
  onAnalyze,
  loading,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError("");
      const fileArr = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!fileArr.length) {
        setError("이미지 파일만 업로드 가능합니다.");
        return;
      }
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setError(`최대 ${MAX_IMAGES}장까지 업로드 가능합니다.`);
        return;
      }
      const toProcess = fileArr.slice(0, remaining);
      try {
        const results = await Promise.all(toProcess.map(resizeImage));
        onImagesChange([...images, ...results]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "이미지 처리 실패");
      }
    },
    [images, onImagesChange],
  );

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
          레퍼런스 사진 업로드
        </h2>
        <p className="text-gray-500">
          원하는 인테리어 스타일의 사진을 업로드하면 AI가 스타일을 분석합니다
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[var(--olive-500)] bg-[var(--olive-100)]"
            : "border-gray-300 hover:border-[var(--olive-400)] hover:bg-[var(--olive-50)]"
        }`}
      >
        <div className="text-4xl mb-3">📸</div>
        <p className="text-gray-600 font-medium">
          클릭하거나 사진을 드래그하세요
        </p>
        <p className="text-gray-400 text-sm mt-1">
          최대 {MAX_IMAGES}장, 각 5MB 이하 (JPEG/PNG)
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`레퍼런스 ${i + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Text input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          추가 설명 (선택)
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="원하는 스타일이나 분위기를 텍스트로 설명해주세요 (예: 따뜻한 원목 느낌, 밝고 깨끗한 화이트톤...)"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--olive-400)] focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={images.length === 0 || loading}
        className="w-full py-3 px-6 bg-[var(--olive-500)] text-white font-semibold rounded-lg hover:bg-[var(--olive-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            스타일 분석 중...
          </span>
        ) : (
          "AI 스타일 분석 시작"
        )}
      </button>
    </div>
  );
}
