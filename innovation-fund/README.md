# 혁신인재지원금 신청 플랫폼

강원대학교 데이터보안·활용 혁신융합대학사업단의 혁신인재지원금 신청·검토·지급관리 플랫폼입니다.

---

## 빠른 시작

### 1단계: Node.js 설치

아직 설치하지 않았다면 https://nodejs.org 에서 **LTS 버전**을 다운로드하여 설치합니다.

설치 확인:
```bash
node --version   # v18 이상
npm --version    # 9 이상
```

### 2단계: 프로젝트 의존성 설치

```bash
cd innovation-fund
npm install
```

### 3단계: 환경변수 설정

`.env.local.example`을 복사하여 `.env.local`을 만듭니다:
```bash
copy .env.local.example .env.local
```

초기 테스트용 설정 (mock 데이터 사용):
```
NEXT_PUBLIC_USE_MOCK=true
ADMIN_PASSWORD=admin1234
```

### 4단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 페이지 구조

| 경로 | 설명 |
|---|---|
| `/` | 메인 안내 페이지 |
| `/apply` | 신청 유형 선택 + 신청서 작성 |
| `/apply/complete` | 신청 완료 페이지 |
| `/admin/login` | 관리자 로그인 (초기 비밀번호: admin1234) |
| `/admin/dashboard` | 관리자 대시보드 |
| `/admin/applications` | 신청 목록 (검색/필터/엑셀 다운로드) |
| `/admin/applications/[id]` | 신청 상세 검토 |

---

## Vercel 배포 방법

### 1. GitHub에 코드 올리기

```bash
git add .
git commit -m "첫 번째 커밋"
git push origin main
```

### 2. Vercel 계정 생성 및 배포

1. https://vercel.com 에서 GitHub 계정으로 로그인
2. **New Project** 클릭
3. GitHub 저장소 선택
4. **Environment Variables** 탭에서 다음 변수 추가:
   - `NEXT_PUBLIC_USE_MOCK` = `true`
   - `ADMIN_PASSWORD` = `원하는비밀번호`
5. **Deploy** 클릭

배포 완료 후 자동으로 URL이 생성됩니다.

---

## Supabase 연동 방법 (실제 운영 시)

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 계정 생성
2. **New Project** 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정

### 2. 테이블 생성

Supabase 대시보드 → SQL Editor → `supabase/schema.sql` 내용 붙여넣고 실행

### 3. API 키 발급

Settings → API → `URL`과 `anon public` 키 복사

### 4. 환경변수 설정

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_USE_MOCK=false
```

---

## 관리자 사용법

### 로그인
- URL: `/admin/login`
- 초기 비밀번호: `admin1234` (`.env.local`의 `ADMIN_PASSWORD`에서 변경)

### 신청 목록
- 이름/학번 검색 가능
- 신청 유형, 검토 상태, 지급 상태로 필터링
- 신청일 기간 필터
- 전체/필터링/선택 건 엑셀 다운로드

### 신청 상세
- 검토 상태 변경: 접수완료 → 검토중 → 승인/반려
- 지급 상태 변경: 지급대기 → 지출결의중 → 지출완료
- 최종 승인 금액 입력
- 관리자 내부 메모 작성

---

## 향후 실제 운영 전 보완 체크리스트

### 보안
- [ ] 관리자 인증을 단순 비밀번호에서 Supabase Auth 또는 NextAuth.js로 교체
- [ ] 파일 업로드를 실제 스토리지(Supabase Storage, S3)로 연동
- [ ] API 라우트에 관리자 권한 체크 미들웨어 추가
- [ ] HTTPS 적용 확인 (Vercel 기본 제공)

### 기능
- [ ] mock 데이터를 Supabase 실제 DB로 전환 (`NEXT_PUBLIC_USE_MOCK=false`)
- [ ] 파일 업로드 실제 구현 (현재 UI만 존재, 파일이 서버에 저장되지 않음)
- [ ] 학생 신청 완료 후 이메일 알림 발송 (Resend, SendGrid 등)
- [ ] 관리자 상태 변경 시 학생에게 이메일 통보
- [ ] 신청 내역 조회 기능 (학생이 학번으로 자기 신청 현황 확인)

### 운영
- [ ] 관리자 비밀번호 변경 (admin1234에서 강력한 비밀번호로)
- [ ] Vercel 환경변수에서 `ADMIN_PASSWORD` 업데이트
- [ ] 실제 구글시트 컬럼과 매핑 확인 (`supabase/column-mapping.md` 참고)
- [ ] 신청 기간 설정 기능 추가 고려
- [ ] 개인정보처리방침 페이지 추가

---

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) / Mock Data (개발용)
- **Excel**: xlsx 라이브러리
- **Icons**: lucide-react
- **Deploy**: Vercel
