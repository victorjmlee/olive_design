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
    const { prompt, styleProfile, refinements, previousDescription } = body as {
      prompt: string;
      styleProfile: StyleProfile;
      refinements?: string[];
      previousDescription?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "디자인 설명을 입력해주세요." },
        { status: 400 },
      );
    }

    // Build English DALL-E prompt from Korean input + style profile
    const hasRefinements = refinements && refinements.length > 0 && previousDescription;

    const promptContent = hasRefinements
      ? `You are an expert at writing DALL-E 3 prompts for interior design images.

You are MODIFYING an existing design based on the user's change requests. The user's requested changes are the TOP PRIORITY — you MUST reflect them clearly in the prompt.

=== EXISTING DESIGN (base to modify) ===
${previousDescription}

=== USER'S CHANGE REQUESTS (MUST be applied) ===
${refinements!.map((r, i) => `${i + 1}. ${r}`).join("\n")}

=== ORIGINAL CONTEXT ===
Room description: ${prompt}
Style: ${styleProfile.style} / ${styleProfile.mood}
Colors: ${styleProfile.colors.join(", ")}
Materials: ${styleProfile.materials.join(", ")}

CRITICAL: The DALL-E prompt you write MUST explicitly describe the changes the user requested. For example, if the user asked for green walls, the prompt MUST mention green walls. Keep everything else from the existing design the same.

Write ONLY the DALL-E prompt (no explanation). Start with "Photorealistic interior design rendering of..."
Keep it under 300 words. Include specific materials, colors, lighting, and camera angle.`
      : `You are an expert at writing DALL-E 3 prompts for interior design images.

Convert this Korean room description and style profile into a detailed English prompt for DALL-E 3.
The prompt should produce a photorealistic interior design rendering.

Room description: ${prompt}

Style profile:
- Style: ${styleProfile.style}
- Mood: ${styleProfile.mood}
- Colors: ${styleProfile.colors.join(", ")}
- Materials: ${styleProfile.materials.join(", ")}
- Keywords: ${styleProfile.keywords.join(", ")}

Write ONLY the DALL-E prompt (no explanation). Start with "Photorealistic interior design rendering of..."
Keep it under 300 words. Include specific materials, colors, lighting, and camera angle.`;

    const dallePromptResponse = await anthropic.messages.create({
      model: CLAUDE_FAST_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: promptContent }],
    });

    const dallePrompt =
      dallePromptResponse.content[0].type === "text"
        ? dallePromptResponse.content[0].text
        : "";

    // Generate image with DALL-E 3
    const imageResponse = await openai.images.generate({
      model: DALLE_MODEL,
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    });

    const imageBase64 = imageResponse.data?.[0]?.b64_json ?? "";

    // Generate Korean description with Claude
    const descriptionResponse = await anthropic.messages.create({
      model: CLAUDE_FAST_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `당신은 인테리어 디자인 전문가입니다. 이 AI 생성 인테리어 디자인 이미지를 분석하고 한국어로 상세히 설명해주세요.

원래 요청: ${prompt}
스타일: ${styleProfile.style} / ${styleProfile.mood}

다음 내용을 포함해주세요:
1. 전체적인 공간 구성과 분위기
2. 사용된 주요 색상과 소재
3. 가구 배치와 동선
4. 조명과 자연광 활용
5. 특징적인 디자인 포인트

3-4문단으로 자연스럽게 설명해주세요.`,
            },
          ],
        },
      ],
    });

    const description =
      descriptionResponse.content[0].type === "text"
        ? descriptionResponse.content[0].text
        : "";

    return NextResponse.json({
      imageBase64: `data:image/png;base64,${imageBase64}`,
      description,
      prompt: dallePrompt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
