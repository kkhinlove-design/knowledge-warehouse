# GitHub Setup

## 1. 이 폴더를 GitHub 저장소에 올리기

현재 폴더를 GitHub 저장소로 사용해야 GitHub Actions가 매일 실행됩니다.

필수 포함 경로:

- `.github/workflows/report-digest.yml`
- `report_digest/`
- `sync_report_digest_to_obsidian.ps1`

## 2. Actions 활성화

GitHub 저장소에서 `Actions` 탭을 열고 워크플로를 활성화합니다.

워크플로 이름:

- `Report Digest`

## 3. 첫 실행

`Actions > Report Digest > Run workflow`로 한 번 수동 실행합니다.

성공하면 저장소 안의 아래 파일이 갱신됩니다.

- `report_digest/output/latest-policy-brief.md`
- `report_digest/output/latest-policy-cards.html`
- `report_digest/output/latest-report-items.json`
- `report_digest/output/latest-run-summary.json`

## 4. 로컬 PC에서 반영

저장소를 로컬에 clone 또는 pull 한 뒤 아래 명령을 실행합니다.

```powershell
.\sync_report_digest_to_obsidian.ps1
```

## 5. Windows 작업 스케줄러 추천

PC가 켜질 때마다 자동 반영하려면 작업 스케줄러에서 아래 명령을 등록하면 됩니다.

```powershell
powershell -ExecutionPolicy Bypass -File "G:\내 드라이브\10. 업무\70. ai\codex\chogwa\sync_report_digest_to_obsidian.ps1"
```

추가로 1시간마다 돌려도 됩니다.
