"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Search, FileText } from "lucide-react";
import type { Application, ApplicationType, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import { REVIEW_STATUS_META, PAYMENT_STATUS_META } from "@/config/status";
import { ReviewBadge, PaymentBadge } from "@/components/common/StatusBadge";
import AdminLayout from "@/components/admin/AdminLayout";

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
  const [reviewMonth, setReviewMonth] = useState(new Date().toISOString().slice(0, 7));

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">신청 목록</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleExport(selected.size > 0 ? apps.filter((a) => selected.has(a.id)) : filtered)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            {selected.size > 0 ? `선택(${selected.size}) 다운로드` : "엑셀 다운로드"}
          </button>
          <button onClick={() => handleExport(apps)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> 전체 다운로드
          </button>
        </div>
      </div>

      {/* 월별 심의요청서 */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">월별 심의요청서</span>
        <input type="month" className="input-field w-auto" value={reviewMonth} onChange={(e) => setReviewMonth(e.target.value)} />
        <button
          onClick={() => window.open(`/admin/review-print?month=${reviewMonth}`, "_blank")}
          className="btn-primary text-sm py-2"
        >
          심의요청서 내보내기 (PDF)
        </button>
        <span className="text-xs text-gray-400">선택한 월의 &apos;심의필요&apos; 상태 건만 포함됩니다.</span>
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
            {(Object.keys(REVIEW_STATUS_META) as ReviewStatus[]).map((k) => (
              <option key={k} value={k}>{REVIEW_STATUS_META[k].label}</option>
            ))}
          </select>
          <select className="input-field" value={payFilter} onChange={(e) => setPayFilter(e.target.value as PaymentStatus | "")}>
            <option value="">지급 상태 전체</option>
            {(Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map((k) => (
              <option key={k} value={k}>{PAYMENT_STATUS_META[k].label}</option>
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
      <div className="overflow-x-auto rounded-[32px]">
        <table className="table-glass text-sm">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[#4f8cff]" />
              </th>
              <th className="whitespace-nowrap">접수번호</th>
              <th className="whitespace-nowrap">신청일</th>
              <th className="whitespace-nowrap">이름</th>
              <th className="whitespace-nowrap">학번</th>
              <th className="whitespace-nowrap">학과</th>
              <th className="whitespace-nowrap">신청 유형</th>
              <th className="text-right whitespace-nowrap">신청 금액</th>
              <th className="text-right whitespace-nowrap">산정 금액</th>
              <th className="text-center whitespace-nowrap">검토 상태</th>
              <th className="text-center whitespace-nowrap">지급 상태</th>
              <th className="whitespace-nowrap">첨부</th>
              <th className="text-center whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : filtered.map((app) => (
              <tr key={app.id} style={selected.has(app.id) ? { background: "rgba(79,140,255,0.08)" } : undefined}>
                <td>
                  <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} className="accent-[#4f8cff]" />
                </td>
                <td className="font-mono text-xs">{app.receiptNumber}</td>
                <td className="whitespace-nowrap">{app.applicationDate}</td>
                <td className="font-medium whitespace-nowrap">{app.name}{app.accountMismatch && <span title="예금주 불일치 (본인명의 확인 필요)" className="ml-1 text-red-500">⚠️</span>}</td>
                <td className="font-mono text-xs">{app.studentId}</td>
                <td className="text-gray-600 max-w-[120px] truncate">{app.department}</td>
                <td className="text-xs">{APPLICATION_TYPE_LABELS[app.applicationType]}</td>
                <td className="text-right font-mono">{app.requestAmount.toLocaleString()}</td>
                <td className="text-right font-mono text-[#4f8cff]">{app.calculatedAmount.toLocaleString()}</td>
                <td className="text-center"><ReviewBadge status={app.reviewStatus} /></td>
                <td className="text-center"><PaymentBadge status={app.paymentStatus} /></td>
                <td className="text-center text-gray-400">{app.files.length > 0 ? `📎 ${app.files.length}` : "-"}</td>
                <td className="text-center">
                  <Link href={`/admin/applications/${app.id}`} className="text-[#4f8cff] hover:underline text-xs font-medium">상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
