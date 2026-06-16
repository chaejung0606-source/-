"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import ApplyForm from "@/components/apply/ApplyForm";

const typeDescriptions: Record<ApplicationType, string> = {
  program: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등에 참여하는 학생",
  staff: "사업단 프로그램 운영 보조 업무를 수행하는 진행요원",
  grade: "마이크로디그리, 부전공, 복수전공 이수 우수 학생 (평점 3.0 이상)",
  contest: "사업단 분야와 관련된 경진대회에서 입상한 학생",
  certificate: "미래융합가상학과 학생 중 자격증을 취득한 학생",
};

const typeIcons: Record<ApplicationType, string> = {
  program: "📋",
  staff: "👥",
  grade: "🎓",
  contest: "🏆",
  certificate: "📜",
};

const types: ApplicationType[] = ["program", "staff", "grade", "contest", "certificate"];

export default function ApplyPage() {
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-primary-200 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-6 h-6" />
          <span className="font-bold">혁신인재지원금 신청</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!selectedType ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">신청 유형 선택</h1>
              <p className="text-gray-600">해당하는 지원금 유형을 선택해주세요.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="card text-left hover:border-primary-400 hover:shadow-md transition-all cursor-pointer border-2 border-transparent"
                >
                  <div className="text-2xl mb-2">{typeIcons[type]}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{APPLICATION_TYPE_LABELS[type]}</h3>
                  <p className="text-sm text-gray-500">{typeDescriptions[type]}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <ApplyForm
            applicationType={selectedType}
            onBack={() => setSelectedType(null)}
          />
        )}
      </div>
    </div>
  );
}
