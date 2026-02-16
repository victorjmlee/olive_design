import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "query를 입력하세요.", items: [] },
      { status: 400 },
    );
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "네이버 API 키가 설정되지 않았습니다.", items: [] },
      { status: 401 },
    );
  }

  const display = Math.min(Number(searchParams.get("display")) || 20, 100);
  const start = Math.max(Number(searchParams.get("start")) || 1, 1);
  const sort = searchParams.get("sort") || "asc";

  const params = new URLSearchParams({
    query,
    display: String(display),
    start: String(start),
    sort,
  });

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": CLIENT_ID,
          "X-Naver-Client-Secret": CLIENT_SECRET,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Naver API HTTP ${res.status}`, items: [], detail: text },
        { status: res.status },
      );
    }

    const body = await res.json();
    const items = (body.items ?? []).map(
      (it: Record<string, unknown>) => {
        const raw = it.lprice;
        if (raw === undefined || raw === null || String(raw).trim() === "") {
          it.lprice = "0";
        } else {
          const digits = String(raw).replace(/[^0-9]/g, "");
          it.lprice = digits || "0";
        }
        return it;
      },
    );

    return NextResponse.json(
      { items, total: body.total ?? 0, start: body.start ?? start },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `요청 실패: ${msg}`, items: [] },
      { status: 500 },
    );
  }
}
