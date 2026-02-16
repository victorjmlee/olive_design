"use client";

import type { EstimateRow } from "@/app/types";

function formatNum(n: number | string): string {
  return Number(n).toLocaleString();
}

function escapeHtml(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportEstimatePdf(
  rows: EstimateRow[],
  customerName: string,
) {
  if (rows.length === 0) {
    alert("견적 품목이 없습니다.");
    return;
  }

  const ROWS_PER_PAGE = 14;

  const grandTotal = rows.reduce((sum, r) => {
    return sum + (parseInt(r.price, 10) || 0) * (r.qty || 0);
  }, 0);

  const thead = `<thead><tr style="background:#f5f5f5;border:1px solid #333">
    <th style="padding:8px;text-align:center;width:40px;border:1px solid #333">No</th>
    <th style="padding:8px;text-align:left;border:1px solid #333">품목명</th>
    <th style="padding:8px;text-align:right;width:80px;border:1px solid #333">단가</th>
    <th style="padding:8px;text-align:center;width:50px;border:1px solid #333">수량</th>
    <th style="padding:8px;text-align:right;width:90px;border:1px solid #333">금액</th>
  </tr></thead>`;

  const totalHtml = `<tr style="font-weight:bold;background:#f0f7f0">
    <td colspan="3" style="text-align:right;border:1px solid #ddd;padding:8px">합계</td>
    <td style="border:1px solid #ddd"></td>
    <td style="text-align:right;border:1px solid #ddd;padding:8px">${formatNum(grandTotal)}원</td>
  </tr>`;

  const baseStyle =
    "font-family:Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif;padding:16px;background:#fff;color:#000;width:100%;box-sizing:border-box;";
  const tableStyle =
    "width:100%;border-collapse:collapse;font-size:12px;color:#000;table-layout:fixed";

  const customerEsc = customerName ? escapeHtml(customerName.trim()) : "";
  const customerLine = customerEsc
    ? `<p style="color:#333;margin:0 0 8px 0;font-size:14px">고객명: ${customerEsc}</p>`
    : "";

  const headerBlock = `<h2 style="margin:0 0 8px 0;color:#000">올리브디자인 견적서</h2>${customerLine}<p style="color:#333;margin:0 0 12px 0;font-size:14px">${new Date().toLocaleDateString("ko-KR")}</p>`;

  const pageChunks: string[] = [];
  for (let start = 0; start < rows.length; start += ROWS_PER_PAGE) {
    const end = Math.min(start + ROWS_PER_PAGE, rows.length);
    let rowsHtml = "";
    for (let i = start; i < end; i++) {
      const r = rows[i];
      const p = parseInt(r.price, 10) || 0;
      const q = r.qty || 0;
      const total = p * q;
      const name = escapeHtml(r.name || "");
      rowsHtml += `<tr>
        <td style="text-align:center;border:1px solid #ddd;padding:6px">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:6px;word-break:break-word">${name}</td>
        <td style="text-align:right;border:1px solid #ddd;padding:6px">${formatNum(p)}</td>
        <td style="text-align:center;border:1px solid #ddd;padding:6px">${q}</td>
        <td style="text-align:right;border:1px solid #ddd;padding:6px">${formatNum(total)}</td>
      </tr>`;
    }
    const isLast = end >= rows.length;
    const tableBody = `<tbody>${rowsHtml}${isLast ? totalHtml : ""}</tbody>`;
    const showHeader = start === 0;
    const pageBreakClass = isLast ? "pdf-page" : "pdf-page html2pdf__page-break";
    pageChunks.push(
      `<div class="${pageBreakClass}" style="${baseStyle}">${showHeader ? headerBlock : ""}<table style="${tableStyle}">${thead}${tableBody}</table></div>`,
    );
  }

  if (pageChunks.length === 0) {
    pageChunks.push(
      `<div class="pdf-page" style="${baseStyle}">${headerBlock}<table style="${tableStyle}">${thead}<tbody>${totalHtml}</tbody></table></div>`,
    );
  }

  const el = document.createElement("div");
  el.innerHTML = pageChunks.join("");
  el.id = "pdf-export-container";
  el.style.cssText = "width:680px;min-height:400px;background:#fff;color:#000;padding:0;";
  document.body.appendChild(el);

  const pdfDate = new Date().toISOString().slice(0, 10);
  const safeName = customerName
    ? customerName.replace(/[/\\:*?"<>|]/g, "_").slice(0, 50)
    : "";
  const pdfFilename = safeName
    ? `견적서_${safeName}_${pdfDate}.pdf`
    : `견적서_${pdfDate}.pdf`;

  // Load html2pdf.js from CDN
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  script.crossOrigin = "anonymous";
  script.onload = () => {
    const opt = {
      margin: 12,
      filename: pdfFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 1.5, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["legacy"] },
    };

    function cleanup() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)
      .html2pdf()
      .set(opt)
      .from(el)
      .save()
      .then(cleanup)
      .catch((err: Error) => {
        cleanup();
        alert("PDF 생성 실패: " + (err.message || err));
      });
  };
  document.head.appendChild(script);
}
