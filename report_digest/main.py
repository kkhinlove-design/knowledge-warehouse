from __future__ import annotations

import io
import json
import os
import re
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin

import pdfplumber
import requests
from bs4 import BeautifulSoup


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = BASE_DIR / 'config.json'
DEFAULT_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'
    ),
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}


@dataclass
class ReportItem:
    source_id: str
    source_name: str
    title: str
    url: str
    organization: str = ''
    snippet: str = ''
    published_at: str = ''
    topic: str = ''
    why_it_matters: str = ''
    action_hint: str = ''
    pdf_url: str = ''
    extraction_mode: str = 'title'


@dataclass
class SourceStatus:
    source_id: str
    source_name: str
    status: str
    note: str
    item_count: int


def load_config() -> dict:
    config_path = Path(os.environ.get('REPORT_DIGEST_CONFIG', str(DEFAULT_CONFIG_PATH)))
    config = json.loads(config_path.read_text(encoding='utf-8-sig'))

    env_obsidian_vault = os.environ.get('REPORT_DIGEST_OBSIDIAN_VAULT')
    if env_obsidian_vault is not None:
        config['obsidian_vault'] = env_obsidian_vault

    env_obsidian_subdir = os.environ.get('REPORT_DIGEST_OBSIDIAN_SUBDIR')
    if env_obsidian_subdir is not None:
        config['obsidian_subdir'] = env_obsidian_subdir

    env_output_dir = os.environ.get('REPORT_DIGEST_OUTPUT_DIR')
    if env_output_dir:
        config['workspace_output_dir'] = env_output_dir

    env_state_dir = os.environ.get('REPORT_DIGEST_STATE_DIR')
    if env_state_dir:
        config['state_dir'] = env_state_dir

    return config


def fetch_response(url: str, *, verify: bool = True, method: str = 'get', data: dict | None = None) -> requests.Response:
    request_fn = requests.post if method.lower() == 'post' else requests.get
    response = request_fn(url, headers=DEFAULT_HEADERS, timeout=30, verify=verify, data=data)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding or 'utf-8'
    return response


def fetch_html(url: str, *, verify: bool = True, method: str = 'get', data: dict | None = None) -> str:
    return fetch_response(url, verify=verify, method=method, data=data).text


def unique_by_title(items: list[ReportItem]) -> list[ReportItem]:
    seen: set[tuple[str, str]] = set()
    deduped: list[ReportItem] = []
    for item in items:
        key = (item.source_id, item.title.strip())
        if not item.title.strip() or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def infer_topic(title: str) -> str:
    checks = [
        ('AI·디지털', ['ai', '디지털', '소프트웨어', '데이터', '온라인', '플랫폼', 'dx', 'ax']),
        ('고용·교육', ['교육', '고용', '인재', '직무', '훈련', '스킬', '대학', '패널']),
        ('산업·통상', ['산업', '반도체', '공급망', '가치사슬', '기업', '콘텐츠', '서비스업']),
        ('인구·사회', ['인구', '출생', '사망', '혼인', '이혼', '삶의 질', '사회']),
        ('문화·지역', ['문화', '유산', '독서', '전북', '지역', '관광']),
        ('법·행정', ['법', '행정', '감사', '정책', '제도', '상법', '공공']),
        ('경제·통계', ['물가', '통계', '경제', '소비', '동향', '분석']),
        ('통일·외교', ['북한', '통일', '아세안', '국제', '외교']),
    ]
    lowered = title.lower()
    for topic, keywords in checks:
        if any(keyword in lowered for keyword in keywords):
            return topic
    return '기타 정책'


def infer_why_it_matters(title: str, topic: str, snippet: str = '') -> str:
    if snippet:
        first = snippet.split(' / ')[0].strip()
        if len(first) > 20:
            return f'원문 초반에서 확인된 핵심은 `{first}`이며, 실무 판단의 1차 근거로 활용할 수 있습니다.'
    if topic == 'AI·디지털':
        return '디지털 전환, 인력 재설계, 데이터 활용 방향에 직접 연결될 가능성이 큽니다.'
    if topic == '고용·교육':
        return '인재 확보와 역량개발 정책, 교육훈련 투자 우선순위를 다시 보게 합니다.'
    if topic == '산업·통상':
        return '산업 구조 변화와 공급망 대응, 투자 판단에 참고할 신호를 줍니다.'
    if topic == '인구·사회':
        return '중장기 수요 변화와 정책 타깃 재설계에 필요한 기초 지표로 볼 수 있습니다.'
    if topic == '문화·지역':
        return '지역 브랜딩, 문화정책, 생활밀착형 사업 설계에 활용도가 높습니다.'
    if topic == '법·행정':
        return '제도 변경과 집행 기준 변화가 실무 절차에 영향을 줄 수 있습니다.'
    if topic == '경제·통계':
        return '현황 점검과 우선순위 판단을 위한 경기·시장 체온계 역할을 합니다.'
    if topic == '통일·외교':
        return '대외 리스크와 협력 전략을 점검하는 데 필요한 맥락을 제공합니다.'
    return f"'{title}'는 최근 정책 흐름을 빠르게 파악하는 참고 문서로 볼 수 있습니다."


def infer_action_hint(title: str, topic: str, extraction_mode: str = 'title') -> str:
    suffix = ' 원문 기반으로 읽을 가치가 높습니다.' if extraction_mode == 'pdf' else ''
    if topic == 'AI·디지털':
        return '관련 사업, 조직 역량, 데이터 거버넌스 관점에서 적용 가능 포인트를 메모하세요.' + suffix
    if topic == '고용·교육':
        return '교육훈련, 채용, 역량진단과 연결되는 실행 항목을 1차로 분류해두세요.' + suffix
    if topic == '산업·통상':
        return '산업별 영향 부문과 외부 협력 필요성을 체크리스트로 정리해두는 편이 좋습니다.' + suffix
    if topic == '인구·사회':
        return '수요층 변화와 대상자 세분화 관점에서 후속 검토 항목을 붙여두세요.' + suffix
    if topic == '문화·지역':
        return '지역 이슈, 홍보 전략, 사업 아이디어와 연결될 문장만 먼저 발췌해두세요.' + suffix
    if topic == '법·행정':
        return '내부 절차나 기준 변경이 필요한지 검토 포인트를 짧게 남겨두세요.' + suffix
    if topic == '경제·통계':
        return '월간 지표판이나 회의 자료에 반영할 수치·추세 후보를 체크해두세요.' + suffix
    if topic == '통일·외교':
        return '리스크 시나리오와 협력 과제 관점에서 관련 부서를 함께 묶어 보세요.' + suffix
    return '핵심 문장과 후속 확인 질문 2~3개만 남겨도 재활용성이 높습니다.' + suffix


def is_noisy_line(line: str) -> bool:
    if re.search(r'(.)\1{7,}', line):
        return True
    compact = re.sub(r'\s+', '', line)
    if compact:
        most_common = Counter(compact).most_common(1)[0][1]
        if most_common / len(compact) > 0.55:
            return True
    hangul_blocks = re.findall(r'([가-힣])\1{4,}', line)
    if hangul_blocks:
        return True
    if re.search(r'[0-9]{8,}', line):
        return True
    return False


def clean_text_lines(text: str) -> list[str]:
    cleaned: list[str] = []
    for raw in text.splitlines():
        line = re.sub(r'\s+', ' ', raw).strip()
        if not line:
            continue
        if len(line) < 14:
            continue
        if sum(ch.isdigit() for ch in line) > len(line) * 0.45:
            continue
        if any(token in line for token in ['목 차', '일 러 두 기', '담당 부서', '담당자', '보도시점', '배포', '페이지', '국가통계포털', '발간등록번호']):
            continue
        if re.search(r'\d{2,4}-\d{3,4}-\d{4}', line):
            continue
        if is_noisy_line(line):
            continue
        cleaned.append(line)
    deduped: list[str] = []
    seen: set[str] = set()
    for line in cleaned:
        if line in seen:
            continue
        seen.add(line)
        deduped.append(line)
    return deduped


def summarize_pdf_text(text: str, title: str) -> str:
    lines = clean_text_lines(text)
    filtered = [line for line in lines if title not in line]
    picks = filtered[:3]
    return ' / '.join(picks)


def extract_pdf_text_from_url(pdf_url: str, *, verify: bool = True, max_pages: int = 3) -> str:
    response = fetch_response(pdf_url, verify=verify)
    with pdfplumber.open(io.BytesIO(response.content)) as pdf:
        parts = []
        for page in pdf.pages[:max_pages]:
            parts.append(page.extract_text() or '')
    return '\n'.join(parts)


def build_item(
    source_id: str,
    source_name: str,
    title: str,
    url: str,
    organization: str = '',
    snippet: str = '',
    published_at: str = '',
    pdf_url: str = '',
    extraction_mode: str = 'title',
) -> ReportItem:
    topic = infer_topic(title)
    return ReportItem(
        source_id=source_id,
        source_name=source_name,
        title=title.strip(),
        url=url.strip(),
        organization=organization.strip(),
        snippet=snippet.strip(),
        published_at=published_at.strip(),
        topic=topic,
        why_it_matters=infer_why_it_matters(title, topic, snippet.strip()),
        action_hint=infer_action_hint(title, topic, extraction_mode),
        pdf_url=pdf_url.strip(),
        extraction_mode=extraction_mode,
    )


def enrich_korea_item(detail_url: str, title: str) -> tuple[str, str, str]:
    html = fetch_html(detail_url)
    soup = BeautifulSoup(html, 'html.parser')
    pdf_url = ''
    for anchor in soup.find_all('a', href=True):
        href = anchor.get('href', '')
        text = anchor.get_text(' ', strip=True)
        if 'download.do' in href or 'pdf' in text.lower():
            pdf_url = urljoin(detail_url, href)
            break
    if not pdf_url:
        return '', '', 'title'
    try:
        text = extract_pdf_text_from_url(pdf_url)
        snippet = summarize_pdf_text(text, title)
        return snippet, pdf_url, 'pdf'
    except Exception:
        return '', pdf_url, 'detail'


def parse_korea_briefing(site: dict, limit: int) -> list[ReportItem]:
    html = fetch_html(site['url'])
    soup = BeautifulSoup(html, 'html.parser')
    items: list[ReportItem] = []
    for anchor in soup.select("a[href*='expDocView.do']"):
        title = anchor.get_text(' ', strip=True)
        href = urljoin(site['url'], anchor.get('href', ''))
        if not title:
            continue
        snippet, pdf_url, extraction_mode = enrich_korea_item(href, title)
        items.append(build_item(site['id'], site['name'], title, href, snippet=snippet, pdf_url=pdf_url, extraction_mode=extraction_mode))
        if len(items) >= limit:
            break
    return unique_by_title(items)


def enrich_gzone_item(contents_id: str, title: str) -> tuple[str, str, str]:
    pdf_url = f'http://gzone.kr/gzone/gZoneFileDown.do?conId={contents_id}&serviceCd=4'
    try:
        text = extract_pdf_text_from_url(pdf_url)
        snippet = summarize_pdf_text(text, title)
        return snippet, pdf_url, 'pdf'
    except Exception:
        return '', pdf_url, 'detail'


def parse_gzone(site: dict, limit: int) -> list[ReportItem]:
    html = fetch_html(site['url'])
    soup = BeautifulSoup(html, 'html.parser')
    items: list[ReportItem] = []
    for block in soup.select("div.contenList a[onclick*='fn_goDetail']"):
        title_tag = block.select_one('span.more')
        org_tag = block.select_one('.govNm')
        onclick = block.get('onclick', '')
        match = re.search(r"fn_goDetail\('([^']+)'\s*,\s*'([^']+)'\)", onclick)
        title = title_tag.get_text(' ', strip=True) if title_tag else ''
        if not match or not title:
            continue
        contents_id, submenu = match.groups()
        detail_url = (
            'http://gzone.kr/gzone/gZoneSearchDetailList.do'
            f'?contentsId={contents_id}&subMenu={submenu}&mainDivision=Y&pageIndex=1&reSearchGubun=N'
        )
        snippet, pdf_url, extraction_mode = enrich_gzone_item(contents_id, title)
        items.append(build_item(
            site['id'],
            site['name'],
            title,
            detail_url,
            organization=org_tag.get_text(' ', strip=True) if org_tag else '',
            snippet=snippet,
            pdf_url=pdf_url,
            extraction_mode=extraction_mode,
        ))
        if len(items) >= limit:
            break
    return unique_by_title(items)


def parse_prism(site: dict, limit: int) -> list[ReportItem]:
    html = fetch_html(site['url'], verify=False)
    soup = BeautifulSoup(html, 'html.parser')
    items: list[ReportItem] = []
    for anchor in soup.select("a[href*='/homepage/asmt/']"):
        title = anchor.get_text(' ', strip=True)
        href = urljoin(site['url'], anchor.get('href', ''))
        if len(title) > 8:
            items.append(build_item(site['id'], site['name'], title, href))
        if len(items) >= limit:
            break
    if items:
        return unique_by_title(items)
    embedded_titles = re.findall(r'"asmtNm":"([^"]+)"', html)
    for title in embedded_titles[:limit]:
        items.append(build_item(site['id'], site['name'], title, site['url']))
    return unique_by_title(items)


def parse_krivet(site: dict, limit: int) -> list[ReportItem]:
    html = fetch_html(site['url'])
    soup = BeautifulSoup(html, 'html.parser')
    items: list[ReportItem] = []
    for anchor in soup.select("a[onclick*='homeRschRptpDataList.selectDetail']"):
        onclick = anchor.get('onclick', '')
        match = re.search(r"selectDetail\('([^']+)'\)", onclick)
        title = anchor.get_text(' ', strip=True)
        if not match or not title:
            continue
        pst_no = match.group(1)
        detail_url = f"{site['url']}&pstNo={pst_no}"
        items.append(build_item(site['id'], site['name'], title, detail_url, organization='한국직업능력연구원'))
        if len(items) >= limit:
            break
    return unique_by_title(items)


def parse_jthink(site: dict, limit: int) -> list[ReportItem]:
    html = fetch_html(site['url'])
    soup = BeautifulSoup(html, 'html.parser')
    items: list[ReportItem] = []
    for anchor in soup.find_all('a', href=True):
        title = anchor.get_text(' ', strip=True)
        if not title.startswith('['):
            continue
        items.append(build_item(site['id'], site['name'], title, site['url'], organization='전북연구원'))
        if len(items) >= limit:
            break
    return unique_by_title(items)


PARSERS: dict[str, Callable[[dict, int], list[ReportItem]]] = {
    'korea_briefing': parse_korea_briefing,
    'gzone': parse_gzone,
    'prism': parse_prism,
    'krivet': parse_krivet,
    'jthink': parse_jthink,
}


def load_seen_keys(state_path: Path) -> set[str]:
    if not state_path.exists():
        return set()
    payload = json.loads(state_path.read_text(encoding='utf-8'))
    return set(payload.get('seen_keys', []))


def save_seen_keys(state_path: Path, keys: set[str]) -> None:
    payload = {'seen_keys': sorted(keys), 'updated_at': datetime.now().isoformat(timespec='seconds')}
    state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')


def item_key(item: ReportItem) -> str:
    return f'{item.source_id}::{item.title}'


def build_executive_summary(items: list[ReportItem]) -> list[str]:
    topics = Counter(item.topic for item in items)
    sources = Counter(item.source_name for item in items)
    pdf_backed = sum(1 for item in items if item.extraction_mode == 'pdf')
    lines: list[str] = []
    if topics:
        topic, count = topics.most_common(1)[0]
        lines.append(f'이번 업데이트에서 가장 많이 보인 주제는 `{topic}`이며, 총 {count}건이 감지되었습니다.')
    if len(topics) > 1:
        second, count = topics.most_common(2)[1]
        lines.append(f'보조 흐름은 `{second}`로, 관련 문서 {count}건이 뒤따랐습니다.')
    if sources:
        source, count = sources.most_common(1)[0]
        lines.append(f'가장 활발한 공급원은 `{source}`로, 이번 회차에 {count}건이 반영되었습니다.')
    if pdf_backed:
        lines.append(f'이 중 {pdf_backed}건은 PDF 원문 초반부까지 읽어 스니펫을 붙였습니다.')
    if not lines:
        lines.append('이번 회차에는 요약 가능한 신규 항목이 충분히 감지되지 않았습니다.')
    return lines


def build_markdown(run_at: str, items: list[ReportItem], new_items: list[ReportItem], statuses: list[SourceStatus]) -> str:
    lines = [
        '---',
        'title: 정책·연구 보고서 실무형 브리프',
        f'generated_at: {run_at}',
        'style: practical',
        'source_count: 5',
        f'item_count: {len(items)}',
        f'new_item_count: {len(new_items)}',
        '---',
        '',
        f'# 정책·연구 보고서 브리프 ({run_at[:10]})',
        '',
        '## 한눈에 보기',
    ]
    for sentence in build_executive_summary(new_items or items):
        lines.append(f'- {sentence}')

    lines.extend(['', '## 수집 상태'])
    for status in statuses:
        lines.append(f'- `{status.source_name}`: {status.status} ({status.item_count}건) - {status.note}')

    focus_items = new_items or items
    lines.extend(['', '## 오늘의 핵심 업데이트'])
    for item in focus_items[:12]:
        org_text = f' / {item.organization}' if item.organization else ''
        lines.append(f'### {item.title}')
        lines.append(f'- 출처: `{item.source_name}`{org_text}')
        lines.append(f'- 주제: `{item.topic}`')
        lines.append(f'- 요약 방식: `{item.extraction_mode}`')
        if item.snippet:
            lines.append(f'- 핵심 내용: {item.snippet}')
        lines.append(f'- 왜 중요한가: {item.why_it_matters}')
        lines.append(f'- 실무 메모: {item.action_hint}')
        lines.append(f'- 링크: {item.url}')
        if item.pdf_url:
            lines.append(f'- PDF: {item.pdf_url}')
        lines.append('')

    lines.extend(['## 후속 관찰 포인트'])
    top_topics = [topic for topic, _ in Counter(item.topic for item in focus_items).most_common(3)]
    if top_topics:
        for topic in top_topics:
            lines.append(f'- `{topic}` 관련 후속 문서가 이어지는지 다음 회차에서도 추적합니다.')
    else:
        lines.append('- 다음 회차에서 신규 발행 문서 여부를 다시 확인합니다.')
    return '\n'.join(lines).strip() + '\n'


def build_html(run_at: str, items: list[ReportItem], new_items: list[ReportItem]) -> str:
    focus_items = new_items or items
    top_items = focus_items[:9]
    summary_points = build_executive_summary(focus_items)

    page2_cards = '\n'.join(
        f'''
        <article class="mini-card">
          <p class="eyebrow">{item.source_name} · {item.topic} · {item.extraction_mode}</p>
          <h3>{item.title}</h3>
          <p>{item.snippet or item.why_it_matters}</p>
          <a href="{item.url}" target="_blank" rel="noreferrer">원문 보기</a>
        </article>
        '''
        for item in top_items[:6]
    )
    page3_cards = '\n'.join(
        f'''
        <article class="action-card">
          <p class="eyebrow">{item.topic}</p>
          <h3>{item.title}</h3>
          <p>{item.action_hint}</p>
        </article>
        '''
        for item in top_items[:6]
    )
    bullets = '\n'.join(f'<li>{point}</li>' for point in summary_points)

    return f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>정책·연구 보고서 카드 브리프</title>
  <style>
    :root {{
      --paper: #fffaf2;
      --ink: #1f2a2a;
      --muted: #5e6b6b;
      --accent: #ba4a00;
      --accent-soft: #f4c9a8;
      --line: rgba(31, 42, 42, 0.12);
      --shadow: 0 20px 60px rgba(64, 46, 24, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", "Apple SD Gothic Neo", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top left, rgba(186, 74, 0, 0.14), transparent 30%), linear-gradient(180deg, #f8f1e7 0%, #efe5d7 100%);
    }}
    .wrap {{ width: min(1180px, calc(100vw - 32px)); margin: 24px auto 72px; display: grid; gap: 24px; }}
    .page {{ min-height: 88vh; border: 1px solid var(--line); background: var(--paper); border-radius: 28px; box-shadow: var(--shadow); padding: 32px; position: relative; overflow: hidden; }}
    .page::after {{ content: ''; position: absolute; inset: auto -40px -40px auto; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, rgba(186,74,0,0.14), transparent 70%); }}
    .eyebrow {{ text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; color: var(--accent); margin: 0 0 10px; font-weight: 700; }}
    h1, h2, h3, p {{ margin: 0; }}
    h1 {{ font-size: clamp(34px, 5vw, 62px); line-height: 0.95; max-width: 10ch; margin-bottom: 18px; }}
    h2 {{ font-size: clamp(28px, 4vw, 42px); margin-bottom: 14px; }}
    .lede {{ max-width: 58ch; font-size: 18px; line-height: 1.7; color: var(--muted); }}
    ul {{ margin: 20px 0 0; padding-left: 20px; line-height: 1.8; font-size: 18px; }}
    .meta {{ margin-top: 20px; color: var(--muted); font-size: 14px; }}
    .grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }}
    .mini-card, .action-card {{ border: 1px solid var(--line); border-radius: 22px; padding: 18px; background: rgba(255,255,255,0.66); backdrop-filter: blur(8px); }}
    .mini-card h3, .action-card h3 {{ font-size: 22px; line-height: 1.35; margin-bottom: 12px; }}
    .mini-card p, .action-card p {{ color: var(--muted); line-height: 1.65; margin-bottom: 12px; }}
    a {{ color: var(--accent); text-decoration: none; font-weight: 700; }}
    .tag-row {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }}
    .tag {{ padding: 10px 14px; border-radius: 999px; background: var(--accent-soft); font-size: 14px; font-weight: 700; }}
    @media (max-width: 900px) {{ .grid {{ grid-template-columns: 1fr; }} .page {{ min-height: auto; padding: 24px; }} }}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="page">
      <p class="eyebrow">Page 1 · Executive Brief</p>
      <h1>정책·연구 보고서 실무형 카드 브리프</h1>
      <p class="lede">다섯 개 사이트의 최신 문서를 추적해, 실무자가 빠르게 볼 수 있는 카드 형식으로 압축했습니다. 가능한 경우 PDF 원문 초반부까지 읽어 제목 기반 요약보다 한 단계 깊게 정리했습니다.</p>
      <ul>{bullets}</ul>
      <div class="tag-row">
        <span class="tag">총 {len(items)}건 수집</span>
        <span class="tag">신규 {len(new_items)}건</span>
        <span class="tag">생성 시각 {run_at}</span>
      </div>
      <p class="meta">PRISM와 일부 기관 파일은 차단 정책이나 보안문자 때문에 후속 보강이 필요할 수 있습니다.</p>
    </section>
    <section class="page">
      <p class="eyebrow">Page 2 · What Changed</p>
      <h2>이번 회차에서 먼저 볼 만한 문서</h2>
      <p class="lede">원문 접근 가능 여부와 실무 적용성을 함께 고려해 우선 확인 대상을 묶었습니다.</p>
      <div class="grid">{page2_cards}</div>
    </section>
    <section class="page">
      <p class="eyebrow">Page 3 · Action Notes</p>
      <h2>읽은 뒤 바로 붙일 실무 메모</h2>
      <p class="lede">문서 전체를 다 읽기 전에 바로 써먹을 수 있도록 후속 조치 관점으로 다시 정리했습니다.</p>
      <div class="grid">{page3_cards}</div>
    </section>
  </main>
</body>
</html>
'''


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def write_outputs(config: dict, markdown: str, html: str, items: list[ReportItem], statuses: list[SourceStatus]) -> dict[str, Path | None]:
    output_dir = BASE_DIR / config['workspace_output_dir']
    state_dir = BASE_DIR / config['state_dir']
    ensure_dirs(output_dir, state_dir)

    date_slug = datetime.now().strftime('%Y-%m-%d')
    markdown_path = output_dir / f'{date_slug}-policy-brief.md'
    html_path = output_dir / f'{date_slug}-policy-cards.html'
    json_path = output_dir / f'{date_slug}-report-items.json'
    latest_markdown_path = output_dir / 'latest-policy-brief.md'
    latest_html_path = output_dir / 'latest-policy-cards.html'
    latest_json_path = output_dir / 'latest-report-items.json'
    summary_path = output_dir / 'latest-run-summary.json'

    publish_web_dir = str(config.get('publish_web_dir', '')).strip()
    web_output_dir = (BASE_DIR / publish_web_dir).resolve() if publish_web_dir else None

    json_payload = json.dumps([asdict(item) for item in items], ensure_ascii=False, indent=2)
    markdown_path.write_text(markdown, encoding='utf-8')
    html_path.write_text(html, encoding='utf-8')
    json_path.write_text(json_payload, encoding='utf-8')
    latest_markdown_path.write_text(markdown, encoding='utf-8')
    latest_html_path.write_text(html, encoding='utf-8')
    latest_json_path.write_text(json_payload, encoding='utf-8')
    summary_payload = json.dumps(
        {
            'generated_at': datetime.now().isoformat(timespec='seconds'),
            'item_count': len(items),
            'pdf_backed_count': sum(1 for item in items if item.extraction_mode == 'pdf'),
            'sources': [asdict(status) for status in statuses],
        },
        ensure_ascii=False,
        indent=2,
    )
    summary_path.write_text(summary_payload, encoding='utf-8')

    if web_output_dir:
        ensure_dirs(web_output_dir)
        (web_output_dir / 'latest-policy-brief.md').write_text(markdown, encoding='utf-8')
        (web_output_dir / 'latest-policy-cards.html').write_text(html, encoding='utf-8')
        (web_output_dir / 'latest-report-items.json').write_text(json_payload, encoding='utf-8')
        (web_output_dir / 'latest-run-summary.json').write_text(summary_payload, encoding='utf-8')

    obsidian_markdown_path: Path | None = None
    obsidian_vault = str(config.get('obsidian_vault', '')).strip()
    obsidian_subdir = str(config.get('obsidian_subdir', '')).strip()
    if obsidian_vault:
        vault_dir = Path(obsidian_vault)
        if obsidian_subdir:
            vault_dir = vault_dir / obsidian_subdir
        ensure_dirs(vault_dir)
        obsidian_markdown_path = vault_dir / markdown_path.name
        obsidian_markdown_path.write_text(markdown, encoding='utf-8')

    return {
        'markdown': markdown_path,
        'html': html_path,
        'json': json_path,
        'latest_markdown': latest_markdown_path,
        'latest_html': latest_html_path,
        'latest_json': latest_json_path,
        'summary': summary_path,
        'obsidian_markdown': obsidian_markdown_path,
    }


def main() -> None:
    config = load_config()
    run_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    state_dir = BASE_DIR / config['state_dir']
    ensure_dirs(state_dir)
    state_path = state_dir / 'seen_items.json'
    seen_keys = load_seen_keys(state_path)

    items: list[ReportItem] = []
    statuses: list[SourceStatus] = []
    max_items = int(config.get('max_items_per_site', 5))

    for site in config['sites']:
        parser = PARSERS.get(site['id'])
        if not parser:
            statuses.append(SourceStatus(site['id'], site['name'], 'SKIPPED', '등록된 파서가 없습니다.', 0))
            continue
        try:
            site_items = parser(site, max_items)
            items.extend(site_items)
            note = '정상 수집'
            if site['id'] == 'prism' and not site_items:
                note = '접속은 성공했지만 차단 정책 또는 동적 로딩 때문에 목록 추출 규칙 보강이 필요합니다.'
            statuses.append(SourceStatus(site['id'], site['name'], 'OK', note, len(site_items)))
        except Exception as exc:
            statuses.append(SourceStatus(site['id'], site['name'], 'WARN', str(exc), 0))

    items = unique_by_title(items)
    current_keys = {item_key(item) for item in items}
    new_items = [item for item in items if item_key(item) not in seen_keys]

    markdown = build_markdown(run_at, items, new_items, statuses)
    html = build_html(run_at, items, new_items)
    output_paths = write_outputs(config, markdown, html, items, statuses)
    save_seen_keys(state_path, seen_keys | current_keys)

    print(f"Markdown: {output_paths['markdown']}")
    print(f"HTML: {output_paths['html']}")
    print(f"JSON: {output_paths['json']}")
    if output_paths['obsidian_markdown']:
        print(f"Obsidian: {output_paths['obsidian_markdown']}")
    else:
        print('Obsidian: skipped')


if __name__ == '__main__':
    main()



