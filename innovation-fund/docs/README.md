# 플랫폼 매뉴얼 시스템

강원대학교 데이터보안·활용 혁신융합대학사업단 **혁신인재지원금 + 공간대여 플랫폼**의 운영 문서입니다.
매뉴얼을 코드와 함께 버전 관리하여, 기능이 바뀌면 문서도 함께 갱신되도록 구성했습니다.

> ⚠️ **이 플랫폼은 "자산(물품) 대여" 시스템이 아니라 학생 지원금 신청 + 공간(강의실) 대여 플랫폼입니다.**
> 일반적인 대여 시스템 용어(자산 등록/반납/연체 등)는 이 플랫폼의 실제 기능(지원금 신청·검토·지급, 공간대여 신청·승인·이용결과)으로 매핑되어 있습니다. 자세한 매핑은 [`function-inventory.md`](./function-inventory.md) 참고.

## 문서 구성

| 파일 | 내용 |
|---|---|
| [`function-inventory.md`](./function-inventory.md) | 전체 기능 목록(전수조사) — 권한·경로·화면·버튼·입력·데이터·문서화/캡처/테스트 여부 |
| [`user-guide.md`](./user-guide.md) | 사용자(학생) 매뉴얼 — 기능별 10항목 형식, 단계별 |
| [`admin-guide.md`](./admin-guide.md) | 관리자 매뉴얼 — 기능별 10항목 형식, 실무 운영 |
| [`faq.md`](./faq.md) | 자주 묻는 질문 (분류별 50+개) |
| [`troubleshooting.md`](./troubleshooting.md) | 오류 해결 가이드 |
| [`test-checklist.md`](./test-checklist.md) | 기능 테스트 결과표 (검증 완료 / 미검증) |
| [`CHANGELOG.md`](./CHANGELOG.md) | 플랫폼·매뉴얼 변경 이력 |
| [`DOC_CHECKLIST.md`](./DOC_CHECKLIST.md) | 기능 변경 시 문서 확인 체크리스트(PR/커밋 전) |
| `images/` | 화면 캡처 이미지 (자동 생성) |

## 화면 캡처 생성 (자동화)

화면 이미지는 [`../scripts/capture-docs-screenshots.js`](../scripts/capture-docs-screenshots.js) 로 **운영/스테이징 환경에서 자동 생성**합니다.

```bash
npm i -D playwright                     # 최초 1회
# 앱이 떠 있는 상태에서 (npm run dev 또는 배포 URL)
BASE_URL=http://localhost:3000 \
TEST_USER_ID=<학번> TEST_USER_PW=<비번> \
TEST_ADMIN_ID=<아이디> TEST_ADMIN_PW=<비번> \
node scripts/capture-docs-screenshots.js
```

- 공개 화면(로그인·회원가입·홈·공간대여·이용안내)은 계정 없이 캡처됩니다.
- 로그인 사용자 화면은 **테스트 학생 계정**이 필요합니다.
- **관리자 화면은 캡처하지 않습니다.** 관리자 화면에는 실제 학생 개인정보(PII)가 표시되므로, 화면 캡처는 개인정보가 없는 **신청자(사용자) 매뉴얼에만** 넣습니다(관리자 매뉴얼은 텍스트).
- 결과는 `docs/images/*.png` 에 저장되고, UI가 바뀌면 다시 실행해 갱신합니다.
- 실패한 캡처는 콘솔에 목록으로 출력됩니다.
- 테스트 학생 계정도 **본인 데이터만** 노출되지만, 민감하면 더미(테스트) 데이터로 캡처하세요.

### 캡처 현황(중요)

이 저장소가 클론된 **개발 샌드박스에는 Supabase 백엔드 자격증명·테스트 계정·한글 폰트가 없어**, 문서 작성 시점에 실제 화면 캡처를 생성하지 못했습니다. 캡처 이미지는 위 스크립트를 **백엔드가 연결된 환경 + 테스트 계정 + 한글 폰트(예: Noto Sans KR)** 에서 실행해 생성해야 합니다.
각 매뉴얼에는 캡처가 들어갈 위치와 파일명을 `![설명](images/파일명.png)` 형태로 미리 배치해 두었습니다. 스크립트를 실행하면 해당 위치에 실제 이미지가 채워집니다.

## 기능 변경 시 절차

1. 코드 변경(기능 추가/수정) 시 [`DOC_CHECKLIST.md`](./DOC_CHECKLIST.md) 체크리스트 확인
2. 영향받는 매뉴얼(user/admin)·FAQ·오류 가이드 수정
3. UI가 바뀌었으면 캡처 스크립트 재실행
4. [`CHANGELOG.md`](./CHANGELOG.md) 에 변경 내역 기록
5. `function-inventory.md` 의 문서화/캡처/테스트 여부 갱신

## PDF 변환

Markdown → PDF 는 아래 중 편한 방법을 사용하세요.

```bash
# 예: pandoc + wkhtmltopdf (한글 폰트 필요)
pandoc docs/user-guide.md -o user-guide.pdf --pdf-engine=wkhtmltopdf -V mainfont="Noto Sans KR"
```

또는 VS Code "Markdown PDF" 확장, 혹은 브라우저 미리보기 → 인쇄 → PDF 저장.
