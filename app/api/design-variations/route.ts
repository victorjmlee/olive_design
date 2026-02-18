import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { CLAUDE_FAST_MODEL, DALLE_MODEL } from "@/app/config/models";
import type { StyleProfile } from "@/app/types";

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const anthropic = getAnthropicClient();
  const openai = getOpenAIClient();

  if (!anthropic) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 401 },
    );
  }
  if (!openai) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { description, dallePrompt, styleProfile, count } = body as {
      description: string;
      dallePrompt: string;
      styleProfile: StyleProfile;
      count: number;
    };

    const variationCount = Math.min(Math.max(count || 2, 2), 3);

    // Step 1: Claude Haiku generates variation DALL-E prompts
    const variationPromptResponse = await anthropic.messages.create({
      model: CLAUDE_FAST_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an interior design expert. Based on the design below, create ${variationCount} distinct style variations.
Each variation should change COLOR SCHEME and/or KEY MATERIALS while maintaining the same room layout and function.

=== CURRENT DESIGN ===
Description: ${description}
DALL-E prompt used: ${dallePrompt}
Style: ${styleProfile.style} / ${styleProfile.mood}
Colors: ${styleProfile.colors.join(", ")}
Materials: ${styleProfile.materials.join(", ")}

=== INSTRUCTIONS ===
For each variation, provide:
1. A short Korean label (e.g. "모던 블랙 & 골드", "내추럴 우드톤")
2. A complete DALL-E prompt starting with "Photorealistic interior design rendering of..."

Respond ONLY with a JSON array (no markdown, no explanation):
[
  { "label": "변형 라벨", "dallePrompt": "Photorealistic interior design rendering of..." },
  ...
]

Make each variation clearly distinct from each other and from the original.`,
        },
      ],
    });

    const rawPrompts =
      variationPromptResponse.content[0].type === "text"
        ? variationPromptResponse.content[0].text
        : "[]";
    const jsonMatch = rawPrompts.match(/\[[\s\S]*\]/);
    const prompts: { label: string; dallePrompt: string }[] = JSON.parse(
      jsonMatch ? jsonMatch[0] : "[]",
    );

    if (prompts.length === 0) {
      return NextResponse.json(
        { error: "변형 프롬프트 생성 실패" },
        { status: 500 },
      );
    }

    // Step 2: Generate images in parallel with DALL-E 3
    const imageResults = await Promise.all(
      prompts.map(async (p) => {
        const imageResponse = await openai.images.generate({
          model: DALLE_MODEL,
          prompt: p.dallePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json",
        });
        return imageResponse.data?.[0]?.b64_json ?? "";
      }),
    );

    // Step 3: Generate Korean descriptions in parallel
    const descriptions = await Promise.all(
      imageResults.map(async (imgBase64, i) => {
        if (!imgBase64) return "";
        const descResponse = await anthropic.messages.create({
          model: CLAUDE_FAST_MODEL,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: imgBase64,
                  },
                },
                {
                  type: "text",
                  text: `이 인테리어 디자인 이미지를 2~3문장으로 간결하게 한국어로 설명해주세요. 스타일 변형명: "${prompts[i].label}". 색상, 소재, 분위기를 중심으로 설명하세요.`,
                },
              ],
            },
          ],
        });
        return descResponse.content[0].type === "text"
          ? descResponse.content[0].text
          : "";
      }),
    );

    // Build response
    const variations = prompts.map((p, i) => ({
      id: `var-${Date.now()}-${i}`,
      label: p.label,
      imageBase64: imageResults[i]
        ? `data:image/png;base64,${imageResults[i]}`
        : "",
      description: descriptions[i] || "",
      dallePrompt: p.dallePrompt,
    }));

    return NextResponse.json({ variations });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
