# 기능 변경 시 문서 확인 체크리스트

> 기능 코드를 변경하는 PR/커밋 전에 아래를 확인합니다. (매뉴얼이 코드와 어긋나지 않도록 유지)

```markdown
## 기능 변경 시 문서 확인 체크리스트

- [ ] 새로운 기능이 추가되었는가?
- [ ] 기존 기능의 화면이나 사용 방법이 변경되었는가?
- [ ] 버튼명, 메뉴명, 입력 항목이 변경되었는가?
- [ ] 사용자 매뉴얼(user-guide.md) 수정이 필요한가?
- [ ] 관리자 매뉴얼(admin-guide.md) 수정이 필요한가?
- [ ] FAQ(faq.md) 추가 또는 수정이 필요한가?
- [ ] 오류 해결 가이드(troubleshooting.md) 수정이 필요한가?
- [ ] 화면 캡처 이미지(docs/images) 업데이트가 필요한가? (capture-docs-screenshots.js 재실행)
- [ ] function-inventory.md 의 문서화/캡처/테스트 여부를 갱신했는가?
- [ ] test-checklist.md 에 재테스트 결과를 반영했는가?
- [ ] CHANGELOG.md 에 변경 내역을 기록했는가?
```

## 권장: PR 템플릿에 삽입

`.github/pull_request_template.md` 에 위 체크리스트를 포함하면, 기능 변경 PR마다 문서 갱신 여부를 강제로 점검할 수 있습니다.
