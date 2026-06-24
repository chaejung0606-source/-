"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}

// 금액 입력: 입력/표시 시 천단위 쉼표 자동 표시 (값은 숫자로 전달)
export default function MoneyInput({ value, onChange, placeholder = "0", className }: Props) {
  const display = value ? value.toLocaleString("ko-KR") : "";
  return (
    <input
      className={className || "input-field"}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, "");
        onChange(digits ? parseInt(digits, 10) : 0);
      }}
      placeholder={placeholder}
    />
  );
}
