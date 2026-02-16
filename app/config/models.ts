// ─── Model Configuration ─────────────────────────────────────────────────────
// Override via env vars to pin specific versions:
//   MODEL_CLAUDE=claude-sonnet-4-5-20250929
//   MODEL_DALLE=dall-e-3

export const CLAUDE_MODEL = process.env.MODEL_CLAUDE ?? "claude-sonnet-4-5-20250929";
export const DALLE_MODEL = process.env.MODEL_DALLE ?? "dall-e-3";
