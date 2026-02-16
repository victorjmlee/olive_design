// ─── Model Configuration ─────────────────────────────────────────────────────
// Override via env vars to pin specific versions:
//   MODEL_CLAUDE=claude-sonnet-4-5-20250929
//   MODEL_CLAUDE_FAST=claude-haiku-4-5-20251001
//   MODEL_DALLE=dall-e-3

// Sonnet: 이미지 분석, 스타일 분석 등 품질이 중요한 작업
export const CLAUDE_MODEL = process.env.MODEL_CLAUDE ?? "claude-sonnet-4-5-20250929";
// Haiku: DALL-E 프롬프트 생성, 자재 추출 등 구조화된 작업
export const CLAUDE_FAST_MODEL = process.env.MODEL_CLAUDE_FAST ?? "claude-haiku-4-5-20251001";
export const DALLE_MODEL = process.env.MODEL_DALLE ?? "dall-e-3";
