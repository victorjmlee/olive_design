"use client";

import type { EstimateRow } from "@/app/types";
import NaverSearchPanel from "./NaverSearchPanel";
import { useState } from "react";

interface Props {
  rows: EstimateRow[];
  customerName: string;
  onRowsChange: (rows: EstimateRow[]) => void;
  onCustomerNameChange: (name: string) => void;
  onExportPdf: () => void;
}

function formatNum(n: number | string): string {
  return Number(n).toLocaleString();
}

export default function EstimateSheet({
  rows,
  customerName,
  onRowsChange,
  onCustomerNameChange,
  onExportPdf,
}: Props) {
  const [showSearch, setShowSearch] = useState(false);

  const updateRow = (index: number, field: keyof EstimateRow, value: string | number) => {
    const updated = [...rows];
    if (field === "qty") {
      updated[index] = { ...updated[index], qty: Number(value) || 1 };
    } else if (field === "price") {
      updated[index] = { ...updated[index], price: String(value).replace(/[^0-9]/g, "") };
    } else {
      updated[index] = { ...updated[index], name: String(value) };
    }
    onRowsChange(updated);
  };

  const removeRow = (index: number) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onRowsChange([...rows, { name: "", price: "", qty: 1 }]);
  };

  const getRowTotal = (row: EstimateRow) => {
    return (parseInt(row.price, 10) || 0) * (row.qty || 0);
  };

  const grandTotal = rows.reduce((sum, row) => sum + getRowTotal(row), 0);

  const addFromSearch = (row: EstimateRow) => {
    onRowsChange([...rows, row]);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--olive-800)] mb-2">
          견적서
        </h2>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Estimate table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            {/* Customer name */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-600 flex-shrink-0">
                고객명
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="고객명 입력"
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm flex-1 max-w-[200px] outline-none focus:ring-2 focus:ring-[var(--olive-400)] focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={addRow}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                + 행 추가
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="px-3 py-1.5 text-sm bg-[var(--naver-green)] text-white rounded-md hover:bg-[var(--naver-green-dark)] transition-colors"
              >
                네이버 검색
              </button>
              <button
                onClick={onExportPdf}
                disabled={rows.length === 0}
                className="px-3 py-1.5 text-sm bg-[var(--olive-500)] text-white rounded-md hover:bg-[var(--olive-600)] disabled:opacity-50 transition-colors"
              >
                PDF 내보내기
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-2 text-center w-10">
                      No
                    </th>
                    <th className="border border-gray-200 px-2 py-2 text-left min-w-[200px]">
                      품목명
                    </th>
                    <th className="border border-gray-200 px-2 py-2 text-right w-24">
                      단가
                    </th>
                    <th className="border border-gray-200 px-2 py-2 text-center w-16">
                      수량
                    </th>
                    <th className="border border-gray-200 px-2 py-2 text-right w-24">
                      금액
                    </th>
                    <th className="border border-gray-200 px-2 py-2 text-center w-14">
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="border border-gray-200 px-4 py-8 text-center text-gray-400"
                      >
                        행 추가 또는 네이버 검색으로 품목을 추가하세요
                      </td>
                    </tr>
                  )}
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">
                        {i + 1}
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            updateRow(i, "name", e.target.value)
                          }
                          placeholder="품목명"
                          className="w-full px-2 py-1 border border-gray-100 rounded outline-none focus:border-[var(--olive-400)]"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.price}
                          onChange={(e) =>
                            updateRow(i, "price", e.target.value)
                          }
                          placeholder="단가"
                          inputMode="numeric"
                          className="w-full px-2 py-1 border border-gray-100 rounded text-right outline-none focus:border-[var(--olive-400)]"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="number"
                          value={row.qty}
                          min={1}
                          onChange={(e) =>
                            updateRow(i, "qty", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-100 rounded text-center outline-none focus:border-[var(--olive-400)]"
                        />
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-right text-gray-700">
                        {formatNum(getRowTotal(row))}
                      </td>
                      <td className="border border-gray-200 px-1 py-1 text-center">
                        <button
                          onClick={() => removeRow(i)}
                          className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f7f0] font-semibold">
                    <td
                      colSpan={4}
                      className="border border-gray-200 px-2 py-2 text-right border-t-2 border-t-[var(--olive-500)]"
                    >
                      합계
                    </td>
                    <td className="border border-gray-200 px-2 py-2 text-right border-t-2 border-t-[var(--olive-500)]">
                      {formatNum(grandTotal)}원
                    </td>
                    <td className="border border-gray-200 border-t-2 border-t-[var(--olive-500)]" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Optional search panel */}
        {showSearch && (
          <div className="lg:w-[440px] flex-shrink-0">
            <NaverSearchPanel
              onAddToEstimate={addFromSearch}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
