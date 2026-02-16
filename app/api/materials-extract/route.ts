import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_FAST_MODEL } from "@/app/config/models";

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
    const { imageBase64, description } = body as {
      imageBase64: string;   // data:image/png;base64,...
      description: string;
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: "디자인 이미지가 필요합니다." },
        { status: 400 },
      );
    }

    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "잘못된 이미지 형식입니다." },
        { status: 400 },
      );
    }

    const response = await client.messages.create({
      model: CLAUDE_FAST_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: match[2],
              },
            },
            {
              type: "text",
              text: `당신은 인테리어 시공 전문가입니다. 이 인테리어 디자인 이미지를 분석하여 시공에 필요한 자재 목록을 추출해주세요.

디자인 설명: ${description || "(없음)"}

반드시 아래 JSON 배열 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
[
  {
    "name": "자재 이름 (예: 원목 헤링본 마루)",
    "category": "카테고리 (바닥재/벽재/천장재/조명/가구/패브릭/데코/기타)",
    "searchKeyword": "네이버 쇼핑 검색 키워드 (예: 헤링본 마루 바닥재)",
    "estimatedSpec": "예상 규격 (예: 120x600mm)"
  }
]

다음 카테고리를 모두 확인해주세요:
- 바닥재 (마루, 타일, 카펫 등)
- 벽재 (도배지, 페인트, 타일, 몰딩 등)
- 천장재 (몰딩, 석고보드 등)
- 조명 (펜던트, 스탠드, 매입등 등)
- 가구 (주요 가구만)
- 패브릭 (커튼, 러그, 쿠션 등)
- 데코 (액자, 화분, 소품 등)

실제 네이버 쇼핑에서 검색 가능한 구체적인 키워드를 사용해주세요.
최소 5개, 최대 15개 자재를 추출해주세요.`,
            },
          ],
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let jsonStr = rawText.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const materials = JSON.parse(jsonStr);

    return NextResponse.json({ materials });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
