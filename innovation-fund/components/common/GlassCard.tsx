import { clsx } from "clsx";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** 공통 글래스 카드 — .card 디자인 토큰을 래핑 */
export default function GlassCard({ children, className, ...rest }: Props) {
  return (
    <div className={clsx("card", className)} {...rest}>
      {children}
    </div>
  );
}
