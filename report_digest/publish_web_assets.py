from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / 'report_digest' / 'output'
WEB_DIR = ROOT / 'web' / 'public' / 'generated'
FILES = [
    'latest-policy-brief.md',
    'latest-policy-cards.html',
    'latest-report-items.json',
    'latest-run-summary.json',
]
WEB_DIR.mkdir(parents=True, exist_ok=True)
for name in FILES:
    source = OUTPUT_DIR / name
    target = WEB_DIR / name
    if source.exists():
        shutil.copy2(source, target)
        print(f'copied: {target.name}')
    else:
        print(f'missing: {source}')
