"use client";

import type { EstimateRow, Material, StyleProfile, DesignResult, RoomEntry } from "@/app/types";

function formatNum(n: number | string): string {
  return Number(n).toLocaleString();
}

function escapeHtml(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── CDN Loading ──────────────────────────────────────────────────────────────

let _html2pdfLoaded = false;

function ensureHtml2PdfLoaded(): Promise<void> {
  if (_html2pdfLoaded && // eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).html2pdf) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).html2pdf) {
      _html2pdfLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      _html2pdfLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("html2pdf.js 로딩 실패"));
    document.head.appendChild(script);
  });
}

// ─── Shared PDF generation helper ─────────────────────────────────────────────

function generatePdf(el: HTMLElement, filename: string): Promise<void> {
  const opt = {
    margin: 12,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["legacy"] },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)
    .html2pdf()
    .set(opt)
    .from(el)
    .save()
    .then(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    })
    .catch((err: Error) => {
      if (el.parentNode) el.parentNode.removeChild(el);
      throw err;
    });
}

// ─── Estimate PDF (기존) ──────────────────────────────────────────────────────

export async function exportEstimatePdf(
  rows: EstimateRow[],
  customerName: string,
) {
  if (rows.length === 0) {
    alert("견적 품목이 없습니다.");
    return;
  }

  await ensureHtml2PdfLoaded();

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

  try {
    await generatePdf(el, pdfFilename);
  } catch (err: unknown) {
    alert("PDF 생성 실패: " + ((err as Error).message || err));
  }
}

// ─── Construction Reference PDF (시공 참고서) ─────────────────────────────────

export interface ConstructionPdfParams {
  designResult: DesignResult;
  materials: Material[];
  estimateRows: EstimateRow[];
  customerName: string;
  roomDescription: string;
  styleProfile: StyleProfile;
  rooms?: RoomEntry[];
}

function buildMaterialsTableHtml(materials: Material[]): string {
  const baseStyle =
    "font-family:Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif;padding:16px;background:#fff;color:#000;width:100%;box-sizing:border-box;";
  const tableStyle =
    "width:100%;border-collapse:collapse;font-size:12px;color:#000;table-layout:fixed";

  const thead = `<thead><tr style="background:#f5f5f5;border:1px solid #333">
    <th style="padding:8px;text-align:center;width:40px;border:1px solid #333">No</th>
    <th style="padding:8px;text-align:left;width:80px;border:1px solid #333">카테고리</th>
    <th style="padding:8px;text-align:left;border:1px solid #333">자재명</th>
    <th style="padding:8px;text-align:left;width:100px;border:1px solid #333">규격</th>
  </tr></thead>`;

  let rowsHtml = "";
  materials.forEach((m, i) => {
    rowsHtml += `<tr>
      <td style="text-align:center;border:1px solid #ddd;padding:6px">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:6px">${escapeHtml(m.category)}</td>
      <td style="border:1px solid #ddd;padding:6px;word-break:break-word">${escapeHtml(m.name)}</td>
      <td style="border:1px solid #ddd;padding:6px">${escapeHtml(m.estimatedSpec || "-")}</td>
    </tr>`;
  });

  return `<div class="pdf-page html2pdf__page-break" style="${baseStyle}">
    <h3 style="margin:0 0 12px 0;color:#555;font-size:16px">자재 목록</h3>
    <table style="${tableStyle}">${thead}<tbody>${rowsHtml}</tbody></table>
  </div>`;
}

function buildEstimateTableHtml(rows: EstimateRow[]): string {
  if (rows.length === 0) return "";

  const baseStyle =
    "font-family:Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif;padding:16px;background:#fff;color:#000;width:100%;box-sizing:border-box;";
  const tableStyle =
    "width:100%;border-collapse:collapse;font-size:12px;color:#000;table-layout:fixed";

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

  let rowsHtml = "";
  rows.forEach((r, i) => {
    const p = parseInt(r.price, 10) || 0;
    const q = r.qty || 0;
    rowsHtml += `<tr>
      <td style="text-align:center;border:1px solid #ddd;padding:6px">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:6px;word-break:break-word">${escapeHtml(r.name || "")}</td>
      <td style="text-align:right;border:1px solid #ddd;padding:6px">${formatNum(p)}</td>
      <td style="text-align:center;border:1px solid #ddd;padding:6px">${q}</td>
      <td style="text-align:right;border:1px solid #ddd;padding:6px">${formatNum(p * q)}</td>
    </tr>`;
  });

  const totalRow = `<tr style="font-weight:bold;background:#f0f7f0">
    <td colspan="3" style="text-align:right;border:1px solid #ddd;padding:8px">합계</td>
    <td style="border:1px solid #ddd"></td>
    <td style="text-align:right;border:1px solid #ddd;padding:8px">${formatNum(grandTotal)}원</td>
  </tr>`;

  return `<div class="pdf-page html2pdf__page-break" style="${baseStyle}">
    <h3 style="margin:0 0 12px 0;color:#555;font-size:16px">견적서</h3>
    <table style="${tableStyle}">${thead}<tbody>${rowsHtml}${totalRow}</tbody></table>
  </div>`;
}

function buildRoomPage(room: RoomEntry, index: number): string {
  const baseStyle =
    "font-family:Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif;padding:16px;background:#fff;color:#000;width:100%;box-sizing:border-box;";

  const imgHtml = room.designResult?.imageBase64
    ? `<img src="${room.designResult.imageBase64}" style="width:100%;max-width:500px;border-radius:8px;margin:8px 0" />`
    : "";

  const descHtml = room.designResult?.description
    ? `<p style="color:#444;font-size:12px;line-height:1.6;white-space:pre-line;margin:8px 0">${escapeHtml(room.designResult.description)}</p>`
    : "";

  let materialsHtml = "";
  if (room.materials.length > 0) {
    const tableStyle = "width:100%;border-collapse:collapse;font-size:11px;color:#000;table-layout:fixed";
    const thead = `<thead><tr style="background:#f5f5f5;border:1px solid #333">
      <th style="padding:6px;text-align:center;width:30px;border:1px solid #333">No</th>
      <th style="padding:6px;text-align:left;width:70px;border:1px solid #333">카테고리</th>
      <th style="padding:6px;text-align:left;border:1px solid #333">자재명</th>
      <th style="padding:6px;text-align:left;width:90px;border:1px solid #333">규격</th>
    </tr></thead>`;
    let rows = "";
    room.materials.forEach((m, i) => {
      rows += `<tr>
        <td style="text-align:center;border:1px solid #ddd;padding:4px">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:4px">${escapeHtml(m.category)}</td>
        <td style="border:1px solid #ddd;padding:4px">${escapeHtml(m.name)}</td>
        <td style="border:1px solid #ddd;padding:4px">${escapeHtml(m.estimatedSpec || "-")}</td>
      </tr>`;
    });
    materialsHtml = `<h4 style="margin:12px 0 6px;color:#666;font-size:13px">자재 목록</h4>
      <table style="${tableStyle}">${thead}<tbody>${rows}</tbody></table>`;
  }

  return `<div class="pdf-page html2pdf__page-break" style="${baseStyle}">
    <h3 style="margin:0 0 8px 0;color:#333;font-size:16px">${index + 1}. ${escapeHtml(room.name)}</h3>
    <p style="color:#888;font-size:11px;margin:0 0 8px 0">${escapeHtml(room.prompt)}</p>
    ${imgHtml}${descHtml}${materialsHtml}
  </div>`;
}

export async function exportConstructionPdf(params: ConstructionPdfParams) {
  await ensureHtml2PdfLoaded();

  const {
    designResult,
    materials,
    estimateRows,
    customerName,
    roomDescription,
    styleProfile,
    rooms,
  } = params;

  const baseStyle =
    "font-family:Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif;padding:16px;background:#fff;color:#000;width:100%;box-sizing:border-box;";

  const customerEsc = customerName ? escapeHtml(customerName.trim()) : "";
  const dateStr = new Date().toLocaleDateString("ko-KR");

  const isMultiRoom = rooms && rooms.length > 1;

  // ── Page 1: Cover ──
  const styleSummary = `
    <div style="margin:12px 0;padding:12px;background:#f9f8f5;border-radius:8px;border:1px solid #e8e4dc">
      <p style="margin:0 0 6px 0;font-size:13px"><strong>스타일:</strong> ${escapeHtml(styleProfile.style)}</p>
      <p style="margin:0 0 6px 0;font-size:13px"><strong>무드:</strong> ${escapeHtml(styleProfile.mood)}</p>
      <p style="margin:0 0 6px 0;font-size:13px"><strong>컬러:</strong> ${styleProfile.colors.map(c => `<span style="display:inline-block;width:16px;height:16px;background:${c};border-radius:3px;vertical-align:middle;margin-right:4px;border:1px solid #ddd"></span>${escapeHtml(c)}`).join(" ")}</p>
      <p style="margin:0;font-size:13px"><strong>소재:</strong> ${escapeHtml(styleProfile.materials.join(", "))}</p>
    </div>`;

  let coverImageHtml = "";
  let coverDescHtml = "";

  if (isMultiRoom) {
    coverDescHtml = `<p style="color:#555;font-size:13px;margin:8px 0">${escapeHtml(rooms!.map(r => r.name).join(" / "))} — 총 ${rooms!.length}개 공간</p>`;
  } else {
    coverImageHtml = designResult.imageBase64
      ? `<img src="${designResult.imageBase64}" style="width:100%;max-width:500px;border-radius:8px;margin:8px 0" />`
      : "";
    coverDescHtml = `<p style="color:#555;font-size:13px;margin:8px 0">${escapeHtml(roomDescription)}</p>
      <p style="color:#444;font-size:12px;line-height:1.6;white-space:pre-line;margin:8px 0">${escapeHtml(designResult.description)}</p>`;
  }

  const coverPage = `<div class="pdf-page html2pdf__page-break" style="${baseStyle}">
    <h2 style="margin:0 0 4px 0;color:#6b7035;font-size:22px">올리브디자인 시공 참고서</h2>
    <div style="height:2px;background:#6b7035;margin:0 0 12px 0"></div>
    ${customerEsc ? `<p style="color:#333;margin:0 0 4px 0;font-size:14px">고객명: ${customerEsc}</p>` : ""}
    <p style="color:#888;margin:0 0 12px 0;font-size:13px">${dateStr}</p>
    ${styleSummary}${coverImageHtml}${coverDescHtml}
  </div>`;

  // ── Build pages ──
  const pages: string[] = [coverPage];

  if (isMultiRoom) {
    // Multi-room: page per room
    rooms!.forEach((room, idx) => {
      pages.push(buildRoomPage(room, idx));
    });
    // Merged materials from all rooms
    const allMaterials = rooms!.flatMap(r => r.materials);
    if (allMaterials.length > 0) {
      pages.push(buildMaterialsTableHtml(allMaterials));
    }
  } else {
    // Single room: materials page
    if (materials.length > 0) {
      pages.push(buildMaterialsTableHtml(materials));
    }
  }

  // Estimate page (always, if rows exist)
  if (estimateRows.length > 0) {
    pages.push(buildEstimateTableHtml(estimateRows));
  }

  const el = document.createElement("div");
  el.innerHTML = pages.join("");
  el.id = "pdf-construction-container";
  el.style.cssText = "width:680px;min-height:400px;background:#fff;color:#000;padding:0;";
  document.body.appendChild(el);

  const pdfDate = new Date().toISOString().slice(0, 10);
  const safeName = customerName
    ? customerName.replace(/[/\\:*?"<>|]/g, "_").slice(0, 50)
    : "";
  const pdfFilename = safeName
    ? `시공참고서_${safeName}_${pdfDate}.pdf`
    : `시공참고서_${pdfDate}.pdf`;

  try {
    await generatePdf(el, pdfFilename);
  } catch (err: unknown) {
    alert("PDF 생성 실패: " + ((err as Error).message || err));
  }
}
