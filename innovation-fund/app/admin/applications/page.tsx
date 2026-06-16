"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Search, Filter, FileText } from "lucide-react";
import type { Application, ApplicationType, ReviewStatus, PaymentStatus } from "@/types";
import {
  APPLICATION_TYPE_LABELS, REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS,
} from "@/types";
import { AdminLayout } from "../dashboard/page";

const reviewColors: Record<ReviewStatus, string> = {
  received: "bg-blue-100 text-blue-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  supplement: "bg-orange-100 text-orange-700",
  committee: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const payColors: Record<PaymentStatus, string> = {
  waiting: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  hold: "bg-orange-100 text-orange-700",
  refund: "bg-red-100 text-red-700",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 필터 상태
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApplicationType | "">("");
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "">("");
  const [payFilter, setPayFilter] = useState<PaymentStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then((d) => { setApps(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (search && !a.name.includes(search) && !a.studentId.includes(search)) return false;
      if (typeFilter && a.applicationType !== typeFilter) return false;
      if (reviewFilter && a.reviewStatus !== reviewFilter) return false;
      if (payFilter && a.paymentStatus !== payFilter) return false;
      if (dateFrom && a.applicationDate < dateFrom) return false;
      if (dateTo && a.applicationDate > dateTo) return false;
      return true;
    });
  }, [apps, search, typeFilter, reviewFilter, payFilter, dateFrom, dateTo]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const handleExport = async (targetApps: Application[]) => {
    const { exportToExcel } = await import("@/lib/excel-export");
    exportToExcel(targetApps);
  };

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">신청 목록</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport(selected.size > 0 ? apps.filter((a) => selected.has(a.id)) : filtered)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            {selected.size > 0 ? `선택(${selected.size}) 다운로드` : "엑셀 다운로드"}
          </button>
          <button onClick={() => handleExport(apps)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> 전체 다운로드
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="card mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="이름 또는 학번 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ApplicationType | "")}>
            <option value="">신청 유형 전체</option>
            {(Object.keys(APPLICATION_TYPE_LABELS) as ApplicationType[]).map((k) => (
              <option key={k} value={k}>{APPLICATION_TYPE_LABELS[k]}</option>
            ))}
          </select>
          <select className="input-field" value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as ReviewStatus | "")}>
            <option value="">검토 상태 전체</option>
            {(Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]).map((k) => (
              <option key={k} value={k}>{REVIEW_STATUS_LABELS[k]}</option>
            ))}
          </select>
          <select className="input-field" value={payFilter} onChange={(e) => setPayFilter(e.target.value as PaymentStatus | "")}>
            <option value="">지급 상태 전체</option>
            {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((k) => (
              <option key={k} value={k}>{PAYMENT_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-gray-500">신청일:</span>
          <input type="date" className="input-field w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400">~</span>
          <input type="date" className="input-field w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <span className="text-sm text-gray-400 ml-2">{filtered.length}건</span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 text-left w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-primary-600" />
              </th>
              <th className="p-3 text-left whitespace-nowrap">접수번호</th>
              <th className="p-3 text-left whitespace-nowrap">신청일</th>
              <th className="p-3 text-left whitespace-nowrap">이름</th>
              <th className="p-3 text-left whitespace-nowrap">학번</th>
              <th className="p-3 text-left whitespace-nowrap">학과</th>
              <th className="p-3 text-left whitespace-nowrap">신청 유형</th>
              <th className="p-3 text-right whitespace-nowrap">신청 금액</th>
              <th className="p-3 text-right whitespace-nowrap">산정 금액</th>
              <th className="p-3 text-center whitespace-nowrap">검토 상태</th>
              <th className="p-3 text-center whitespace-nowrap">지급 상태</th>
              <th className="p-3 text-left whitespace-nowrap">첨부</th>
              <th className="p-3 text-center whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : filtered.map((app) => (
              <tr key={app.id} className={`hover:bg-gray-50 transition-colors ${selected.has(app.id) ? "bg-primary-50" : ""}`}>
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} className="accent-primary-600" />
                </td>
                <td className="p-3 font-mono text-xs">{app.receiptNumber}</td>
                <td className="p-3 whitespace-nowrap">{app.applicationDate}</td>
                <td className="p-3 font-medium">{app.name}</td>
                <td className="p-3 font-mono text-xs">{app.studentId}</td>
                <td className="p-3 text-gray-600 max-w-[120px] truncate">{app.department}</td>
                <td className="p-3 text-xs">{APPLICATION_TYPE_LABELS[app.applicationType]}</td>
                <td className="p-3 text-right font-mono">{app.requestAmount.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-primary-600">{app.calculatedAmount.toLocaleString()}</td>
                <td className="p-3 text-center">
                  <span className={`badge ${reviewColors[app.reviewStatus]}`}>{REVIEW_STATUS_LABELS[app.reviewStatus]}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={`badge ${payColors[app.paymentStatus]}`}>{PAYMENT_STATUS_LABELS[app.paymentStatus]}</span>
                </td>
                <td className="p-3 text-center text-gray-400">{app.files.length > 0 ? `📎 ${app.files.length}` : "-"}</td>
                <td className="p-3 text-center">
                  <Link href={`/admin/applications/${app.id}`} className="text-primary-600 hover:underline text-xs">상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
