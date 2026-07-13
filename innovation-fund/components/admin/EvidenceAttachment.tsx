"use client";
import { useEffect, useRef, useState } from "react";
import type { UploadedFile } from "@/types";
import { DOCUMENT_TYPE_LABELS } from "@/types";

// 첨부 파일이 이미지인지 판별 (base64 data URL 또는 확장자 기준)
export function isImageFile(f: { name: string; url?: string }): boolean {
  return !!f.url?.startsWith("data:image") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name);
}

// 인쇄본 첨부 렌더링 — 이미지는 그대로, PDF는 각 쪽을 이미지로 변환(rasterize)해
// 인쇄/‘PDF로 저장’ 시 병합본에 함께 인쇄되도록 한다. (img/iframe만으로는 PDF가 병합되지 않음)
export function EvidenceAttachment({
  file, receiptNumber, name, studentId, department, onReady,
}: {
  file: UploadedFile;
  receiptNumber: string;
  name: string;
  studentId: string;
  department: string;
  onReady?: (fileId: string) => void;
}) {
  const isImg = isImageFile(file);
  const [pages, setPages] = useState<string[] | null>(null); // PDF 각 쪽의 이미지 dataURL
  const [failed, setFailed] = useState(false);
  const readyRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const signalReady = () => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current?.(file.id);
  };

  // 첨부가 없는(빈 URL) 경우 즉시 준비 완료 처리
  useEffect(() => {
    if (!file.url) signalReady();
  }, [file.url]);

  // PDF → 이미지 변환
  useEffect(() => {
    if (!file.url || isImg) return; // 이미지·빈 URL은 여기서 처리하지 않음
    let alive = true;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // 워커는 번들된 파일 URL로 지정 (webpack이 자동 방출)
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument({ url: file.url! }).promise;
        const imgs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 }); // 인쇄 화질 확보
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas 2d context 없음");
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL("image/jpeg", 0.92));
        }
        if (!alive) return;
        setPages(imgs);
        signalReady();
      } catch {
        if (!alive) return;
        setFailed(true); // 변환 실패 시 뷰어+링크로 대체
        signalReady();
      }
    })();
    return () => { alive = false; };
  }, [file.url, isImg]);

  const head = (extra?: string) => (
    <div className="ev-head">
      {DOCUMENT_TYPE_LABELS[file.type]} — {file.name}{extra ? ` ${extra}` : ""}
      <div className="ev-head-sub">접수번호 {receiptNumber} · {name}({studentId}) · {department}</div>
    </div>
  );

  // 첨부 URL 없음
  if (!file.url) {
    return (
      <div className="ev-page">
        {head()}
        <div className="ev-img">첨부 미리보기 (업로드 파일 연동 시 자동 삽입)</div>
      </div>
    );
  }

  // 이미지 첨부
  if (isImg) {
    return (
      <div className="ev-page">
        {head()}
        <div className="ev-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.name} onLoad={signalReady} onError={signalReady} />
        </div>
      </div>
    );
  }

  // PDF → 이미지 변환 완료: 각 쪽을 개별 페이지로
  if (pages) {
    return (
      <>
        {pages.map((src, i) => (
          <div className="ev-page" key={i}>
            {head(pages.length > 1 ? `(${i + 1}/${pages.length}쪽)` : "")}
            <div className="ev-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${file.name} ${i + 1}쪽`} />
            </div>
          </div>
        ))}
      </>
    );
  }

  // PDF 변환 실패 → 뷰어 + 원본 링크 (인쇄본 병합은 되지 않을 수 있음)
  if (failed) {
    return (
      <div className="ev-page">
        {head()}
        <div className="ev-img">
          <iframe src={file.url} title={file.name} className="ev-frame" />
        </div>
        <p className="ev-note">
          ※ 이 PDF는 자동 이미지 변환에 실패했습니다.{" "}
          <a href={file.url} target="_blank" rel="noreferrer">첨부 원본 열기</a> 후 개별 인쇄하세요.
        </p>
      </div>
    );
  }

  // PDF 로딩/변환 중
  return (
    <div className="ev-page">
      {head()}
      <div className="ev-img">첨부(PDF) 변환 중… 잠시만 기다려 주세요.</div>
    </div>
  );
}
