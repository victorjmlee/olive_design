import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올리브디자인 — AI 인테리어 디자인",
  description: "AI로 인테리어 디자인을 생성하고, 자재를 추출하고, 네이버 쇼핑에서 최저가를 찾아 견적서를 만드세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
