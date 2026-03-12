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

## 5. 자동 반영

작업 스케줄러 대신 현재 사용자 Startup 폴더에 자동 실행 파일을 등록했습니다.

생성 위치:

- `C:\Users\sanha\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\ReportDigestSync.cmd`

이제 Windows 로그인 시 아래 스크립트가 자동 실행됩니다.

```powershell
powershell -ExecutionPolicy Bypass -File "G:\내 드라이브\10. 업무\70. ai\codex\chogwa\sync_report_digest_to_obsidian.ps1"
```
