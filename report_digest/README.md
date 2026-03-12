# Report Digest

정책·연구 보고서 자동 수집기입니다. 지금 구조는 다음 두 흐름을 함께 지원합니다.

- 클라우드: GitHub Actions가 매일 실행되어 `report_digest/output`과 `report_digest/state`를 갱신
- 로컬: PC가 켜졌을 때 `sync_report_digest_to_obsidian.ps1`가 최신 결과를 Obsidian 볼트에 반영

## 파일 구성

- `main.py`: 수집·요약 생성 메인 스크립트
- `config.json`: 로컬 실행용 설정
- `config.github.json`: GitHub Actions 실행용 설정
- `requirements.txt`: 클라우드 설치 패키지 목록
- `../.github/workflows/report-digest.yml`: 매일 08:00 KST 실행 워크플로
- `../sync_report_digest_to_obsidian.ps1`: 로컬 동기화 스크립트

## 로컬 수동 실행

```powershell
python .\main.py
```

## 클라우드 실행 방식

GitHub Actions는 `config.github.json`을 사용합니다.

```text
매일 08:00 KST = 매일 23:00 UTC(전날)
```

워크플로가 실행되면 아래 경로가 GitHub 저장소에 커밋됩니다.

- `report_digest/output/latest-policy-brief.md`
- `report_digest/output/latest-policy-cards.html`
- `report_digest/output/latest-report-items.json`
- `report_digest/output/latest-run-summary.json`
- `report_digest/state/seen_items.json`

## 로컬 동기화

```powershell
.\sync_report_digest_to_obsidian.ps1
```

기본 동작:

- 현재 저장소에서 `git pull --ff-only`
- `report_digest/output/latest-policy-brief.md`를 Obsidian 볼트로 복사
- HTML/JSON/요약 메타는 `Policy Briefs\Weekly Digest\_generated\report-digest`로 복사

## 참고

- `PRISM`은 현재 차단 정책 또는 동적 로딩 때문에 목록 추출 규칙 보강이 필요합니다.
- `KRIVET`은 파일 다운로드 단계에서 보안문자 이슈가 남아 있습니다.
- 정책브리핑과 G-Zone은 PDF 기반 요약이 적용되어 있습니다.
