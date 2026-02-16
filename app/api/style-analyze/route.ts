import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/app/config/models";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { images, text } = body as {
      images: string[];   // base64 data URIs (data:image/jpeg;base64,...)
      text?: string;
    };

    if (!images?.length) {
      return NextResponse.json(
        { error: "이미지를 1장 이상 업로드해주세요." },
        { status: 400 },
      );
    }

    const imageContent: Anthropic.Messages.ContentBlockParam[] = images.map(
      (dataUri) => {
        const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) throw new Error("잘못된 이미지 형식입니다.");
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: match[2],
          },
        };
      },
    );

    const userText = text?.trim()
      ? `\n\n사용자 추가 설명: ${text}`
      : "";

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `당신은 전문 인테리어 디자이너입니다. 첨부된 인테리어 레퍼런스 사진을 분석하여 스타일 프로필을 JSON으로 작성해주세요.${userText}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
{
  "colors": ["#hex1", "#hex2", ...],
  "materials": ["자재1", "자재2", ...],
  "mood": "무드 설명 (한국어, 1문장)",
  "style": "스타일명 (예: 내추럴 모던, 미니멀, 북유럽 등)",
  "keywords": ["키워드1", "키워드2", ...],
  "summary": "전체적인 스타일 요약 (한국어, 2-3문장)"
}

colors: 사진에서 주요 색상 3-6개를 hex 코드로
materials: 사용된 주요 자재 (예: 원목, 대리석, 타일, 린넨 등)
mood: 전체적인 분위기
style: 인테리어 스타일 분류
keywords: 특징 키워드 5-8개
summary: 요약 설명`,
            },
          ],
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = rawText.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const profile = JSON.parse(jsonStr);

    return NextResponse.json({ profile });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
